import { Logger, UnauthorizedException } from '@nestjs/common';
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
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
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
  private readonly isProd = process.env.NODE_ENV === 'production';

  private async resolveAgentSecret(): Promise<string> {
    return (await this.settings.getSecret('agentTokenSecret')) || process.env.AGENT_TOKEN_SECRET || '';
  }
  private async resolveJwtSecret(): Promise<string> {
    return (await this.settings.getSecret('jwtSecret')) || process.env.JWT_SECRET || 'dev-jwt-secret';
  }

  /**
   * Lookup of agent sockets keyed by shopId. The job-assignment emitter
   * uses this to push directly to the right shop.
   */
  private agentSockets = new Map<string, Set<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  private async extractUserId(client: Socket): Promise<string | null> {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(
        Buffer.from(parts[1]!, 'base64url').toString(),
      ) as { sub?: string; userId?: string };

      const jwtSecret = await this.resolveJwtSecret();
      if (this.isProd && jwtSecret) {
        const expected = createHmac('sha256', jwtSecret)
          .update(`${parts[0]}.${parts[1]}`)
          .digest('base64url');
        const a = Buffer.from(expected);
        const b = Buffer.from(parts[2]!.replace(/-/g, '+').replace(/_/g, '/'));
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          this.logger.warn('JWT signature verification failed');
          return null;
        }
      }

      return payload.sub ?? payload.userId ?? null;
    } catch {
      return null;
    }
  }

  async handleConnection(client: Socket) {
    const auth = (client.handshake.auth ?? {}) as AgentSocketAuth;
    if (auth.role === 'AGENT') {
      if (!auth.shopId || !auth.token) {
        this.logger.warn(`agent connect rejected: missing shopId/token sock=${client.id}`);
        client.disconnect(true);
        return;
      }
      if (!(await this.verifyAgentToken(auth.shopId, auth.token))) {
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
   * Resolves agent secret from DB-backed settings, falling back to env. In production, missing
   * secret rejects all agents; dev fallback is permissive.
   */
  private async verifyAgentToken(shopId: string, token: string): Promise<boolean> {
    const agentSecret = await this.resolveAgentSecret();
    if (!agentSecret) {
      if (this.isProd) {
        this.logger.error('agentTokenSecret not configured in production — rejecting agent');
        return false;
      }
      this.logger.warn('agentTokenSecret not configured — accepting agent in dev mode only');
      return true;
    }
    const expected = createHmac('sha256', agentSecret).update(shopId).digest('hex');
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
  async subscribeJob(@MessageBody() jobId: string, @ConnectedSocket() client: Socket) {
    if (!jobId) return { ok: false, error: 'missing_job_id' };

    const userId = await this.extractUserId(client);
    if (!userId) {
      client.disconnect(true);
      return { ok: false, error: 'unauthorized' };
    }

    const job = await this.prisma.printJob.findUnique({ where: { id: jobId } });
    if (!job || job.ownerId !== userId) {
      this.logger.warn(`subscribe:job rejected — not owner job=${jobId} user=${userId}`);
      return { ok: false, error: 'forbidden' };
    }

    client.join(`job:${jobId}`);
    return { ok: true };
  }

  @SubscribeMessage('subscribe:shop')
  async subscribeShop(@MessageBody() shopId: string, @ConnectedSocket() client: Socket) {
    const userId = await this.extractUserId(client);
    if (!userId) {
      client.disconnect(true);
      return { ok: false, error: 'unauthorized' };
    }
    client.join(`shop:${shopId}`);
    return { ok: true };
  }

  // ── Server emits (all guarded to survive early-bootstrap calls) ──────────
  private emitIfReady(room: string, event: string, payload: unknown) {
    if (!this.server) {
      this.logger.warn(`emit ${event} skipped — gateway not ready`);
      return;
    }
    this.server.to(room).emit(event, payload);
  }

  emitJobStatus(jobId: string, status: PrintJobStatus, eta?: number) {
    this.emitIfReady(`job:${jobId}`, 'job:status', { jobId, status, eta });
  }

  emitQueuePosition(jobId: string, position: number, etaSeconds: number, total: number) {
    this.emitIfReady(`job:${jobId}`, 'queue:position', { jobId, position, etaSeconds, total });
  }

  emitJobProgress(jobId: string, pagesPrinted: number, pagesTotal: number) {
    this.emitIfReady(`job:${jobId}`, 'job:progress', { jobId, pagesPrinted, pagesTotal });
  }

  emitPrinterStatus(shopId: string, payload: { printerId: string; status: PrinterStatus }) {
    this.emitIfReady(`shop:${shopId}`, 'printer:status', payload);
  }

  emitQueuePaused(shopId: string, reason: string) {
    this.emitIfReady(`shop:${shopId}`, 'queue:paused', { shopId, reason });
  }

  /**
   * Push a job to a specific shop's connected agent. Returns true if at
   * least one agent received the event, false if none are connected
   * (job stays in QUEUED, will be picked up on next reconnect via
   * agent-initiated polling — TODO).
   */
  assignJobToAgent(shopId: string, payload: AgentAssignedJobPayload): boolean {
    if (!this.server) {
      this.logger.warn('assignJobToAgent skipped — gateway not ready');
      return false;
    }
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
