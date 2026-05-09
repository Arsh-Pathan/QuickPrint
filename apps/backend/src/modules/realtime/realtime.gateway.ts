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

  /**
   * Lookup of agent sockets keyed by shopId. The job-assignment emitter
   * uses this to push directly to the right shop.
   */
  private agentSockets = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    const auth = (client.handshake.auth ?? {}) as AgentSocketAuth;
    if (auth.role === 'AGENT' && auth.shopId) {
      // TODO: validate auth.token against AGENT_TOKEN_SECRET
      const set = this.agentSockets.get(auth.shopId) ?? new Set<string>();
      set.add(client.id);
      this.agentSockets.set(auth.shopId, set);
      this.logger.log(`agent connected shop=${auth.shopId} sock=${client.id}`);
    } else {
      this.logger.log(`socket connected ${client.id}`);
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
