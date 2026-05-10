import { io, type Socket } from 'socket.io-client';
import log from 'electron-log';
import { WS_NAMESPACE, type AgentAssignedJobPayload } from '@quickprint/shared';
import type { AgentJob } from './local-queue';
import type { PrinterHealthSnapshot } from './health-monitor';

interface SocketOpts {
  url: string;
  token: string;
  shopId: string;
  printers: { id: string; name: string; isDefault: boolean }[];
}

type AssignedJob = AgentAssignedJobPayload &
  Omit<AgentJob, keyof AgentAssignedJobPayload | 'attempts' | 'enqueuedAt'>;

/**
 * Authenticated Socket.IO connection to the backend. Handles:
 *   - reconnection with exponential backoff (built into socket.io-client)
 *   - server → agent: 'agent:job-assigned'
 *   - agent → server: heartbeat, printer events, job results
 */
export class BackendSocket {
  private socket: Socket | null = null;
  private heartbeat: NodeJS.Timeout | null = null;
  private jobHandlers: Array<(j: AssignedJob) => void> = [];

  constructor(private opts: SocketOpts) {}

  async connect() {
    this.socket = io(`${this.opts.url}${WS_NAMESPACE}`, {
      transports: ['websocket'],
      auth: { token: this.opts.token, shopId: this.opts.shopId, role: 'AGENT' },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
    });

    this.socket.on('connect', () => {
      log.info('backend-socket: connected');
      this.socket?.emit('subscribe:shop', this.opts.shopId);
      // Sync printers immediately on connect, don't wait 15s
      this.socket?.emit('agent:heartbeat', {
        agentId: this.opts.shopId,
        shopId: this.opts.shopId,
        printers: this.opts.printers,
      });
    });
    this.socket.on('disconnect', (reason) => {
      log.warn(`backend-socket: disconnected (${reason})`);
    });
    this.socket.on('agent:job-assigned', (job: AssignedJob) => {
      log.info(`backend-socket: job assigned ${job.id}`);
      for (const handler of this.jobHandlers) handler(job);
    });

    this.heartbeat = setInterval(() => {
      this.socket?.emit('agent:heartbeat', {
        agentId: this.opts.shopId,
        shopId: this.opts.shopId,
        printers: this.opts.printers,
      });
    }, 15_000);
  }

  onJobAssigned(handler: (job: AssignedJob) => void) {
    this.jobHandlers.push(handler);
  }

  emitJobResult(p: { jobId: string; status: 'completed' | 'failed'; error?: string }) {
    this.socket?.emit('agent:job-result', p);
  }

  emitPrinterEvent(p: PrinterHealthSnapshot) {
    this.socket?.emit('agent:printer-event', {
      printerId: p.printerId,
      status: p.status,
      detail: p.message,
    });
  }

  async disconnect() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.socket?.disconnect();
    this.socket = null;
  }
}
