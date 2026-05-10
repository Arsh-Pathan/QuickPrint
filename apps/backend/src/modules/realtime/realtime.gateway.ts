import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  WS_NAMESPACE,
  type AgentAssignedJobPayload,
  type PrintJobStatus,
  type PrinterStatus,
} from '@quickprint/shared';

interface AgentSocketAuth {
  token?: string;
  shopId?: string;
  role?: 'AGENT' | 'STUDENT' | 'ADMIN';
}

@WebSocketGateway({
  namespace: WS_NAMESPACE,
  cors: { origin: '*', credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly agentSecret = process.env.AGENT_TOKEN_SECRET ?? '';
  private readonly isProd = process.env.NODE_ENV === 'production';

  /**
   * Lookup of agent sockets keyed by shopId. The job-assignment emitter
   * uses this to push directly to the right shop.
   */
  private agentSockets = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    const auth = (client.handshake.auth ?? {}) as AgentSocketAuth;
    if (auth.role === 'AGENT') {
      if (!auth.shopId || !auth.token) {
        this.logger.warn(`agent connect rejected: missing shopId/token sock=${client.id}`);
        client.disconnect(true);
        return;
      }
      if (!this.verifyAgentToken(auth.shopId, auth.token)) {
        this.logger.warn(
          `agent connect rejected: invalid token shop=${auth.shopId} sock=${client.id}`,
        );
        client.disconnect(true);
        return;
      }
      const set = this.agentSockets.get(auth.shopId) ?? new Set<string>();
      set.add(client.id);
      this.agentSockets.set(auth.shopId, set);
      this.logger.log(`agent connected shop=${auth.shopId} sock=${client.id}`);
    } else {
      this.logger.log(`socket connected ${client.id}`);
    }
  }

  /**
   * Verifies an agent's HMAC token. Token format: hex(HMAC-SHA256(shopId, AGENT_TOKEN_SECRET)).
   * In production, AGENT_TOKEN_SECRET must be configured or all agent connections are rejected.
   * In development, missing secret falls back to permissive mode (with a warning) so local dev
   * doesn't require key provisioning.
   */
  private verifyAgentToken(shopId: string, token: string): boolean {
    if (!this.agentSecret) {
      if (this.isProd) {
        this.logger.error('AGENT_TOKEN_SECRET not configured in production — rejecting agent');
        return false;
      }
      this.logger.warn('AGENT_TOKEN_SECRET not configured — accepting agent in dev mode only');
      return true;
    }
    const expected = createHmac('sha256', this.agentSecret).update(shopId).digest('hex');
    try {
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(token, 'hex');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  handleDisconnect(client: Socket) {
    for (const [shopId, set] of this.agentSockets) {
      if (set.delete(client.id) && set.size === 0) {
        this.agentSockets.delete(shopId);
      }
    }
    this.logger.log(`socket disconnected ${client.id}`);
  }

  @SubscribeMessage('subscribe:job')
  subscribeJob(@MessageBody() jobId: string, @ConnectedSocket() client: Socket) {
    client.join(`job:${jobId}`);
    return { ok: true };
  }

  @SubscribeMessage('subscribe:shop')
  subscribeShop(@MessageBody() shopId: string, @ConnectedSocket() client: Socket) {
    client.join(`shop:${shopId}`);
    return { ok: true };
  }

  // ── Server emits ──────────────────────────────────────────────────────────
  emitJobStatus(jobId: string, status: PrintJobStatus, eta?: number) {
    this.server.to(`job:${jobId}`).emit('job:status', { jobId, status, eta });
  }

  emitPrinterStatus(shopId: string, payload: { printerId: string; status: PrinterStatus }) {
    this.server.to(`shop:${shopId}`).emit('printer:status', payload);
  }

  emitQueuePaused(shopId: string, reason: string) {
    this.server.to(`shop:${shopId}`).emit('queue:paused', { shopId, reason });
  }

  /**
   * Push a job to a specific shop's connected agent. Returns true if at
   * least one agent received the event, false if none are connected
   * (job stays in QUEUED, will be picked up on next reconnect via
   * agent-initiated polling — TODO).
   */
  assignJobToAgent(shopId: string, payload: AgentAssignedJobPayload): boolean {
    const sockets = this.agentSockets.get(shopId);
    if (!sockets || sockets.size === 0) {
      this.logger.warn(`assignJobToAgent: no agent online for shop ${shopId}`);
      return false;
    }
    for (const sid of sockets) {
      this.server.to(sid).emit('agent:job-assigned', payload);
    }
    return true;
  }
}
