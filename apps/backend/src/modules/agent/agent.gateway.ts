import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { WS_NAMESPACE, type PrinterStatus } from '@quickprint/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PrintersService } from '../printers/printers.service';

interface JobResultPayload {
  jobId: string;
  status: 'completed' | 'failed';
  error?: string;
  pagesPrinted?: number;
}

interface PrinterEventPayload {
  printerId: string;
  status: PrinterStatus;
  detail?: string;
}

/**
 * Gateway for events coming FROM the print agent. Lives on the same
 * Socket.IO namespace as the public realtime gateway, but groups agent-
 * specific handlers so the client/agent emit surfaces stay distinct.
 */
@WebSocketGateway({ namespace: WS_NAMESPACE, cors: { origin: '*', credentials: true } })
export class AgentGateway {
  private readonly logger = new Logger(AgentGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly printers: PrintersService,
  ) {}

  /**
   * Agent reports the outcome of a print attempt. Updates the job row,
   * removes it from the queue, and forwards a job:status event to the
   * student client subscribed to job:<id>.
   */
  @SubscribeMessage('agent:job-result')
  async onJobResult(
    @MessageBody() p: JobResultPayload,
    @ConnectedSocket() _client: Socket,
  ) {
    this.logger.log(`agent:job-result ${p.jobId} → ${p.status}`);
    const job = await this.prisma.printJob.update({
      where: { id: p.jobId },
      data: {
        status: p.status === 'completed' ? 'COMPLETED' : 'FAILED',
        printedAt: p.status === 'completed' ? new Date() : null,
        failureReason: p.status === 'failed' ? p.error?.slice(0, 500) : null,
      },
    });
    await this.prisma.queueEntry.delete({ where: { jobId: p.jobId } }).catch(() => null);
    this.realtime.emitJobStatus(job.id, p.status === 'completed' ? 'completed' : 'failed');
    return { ok: true };
  }

  /**
   * Agent reports a printer status delta. Persists a health snapshot,
   * updates Printer.lastSeenAt + status, and broadcasts to admin clients
   * watching shop:<id>.
   */
  @SubscribeMessage('agent:printer-event')
  async onPrinterEvent(@MessageBody() p: PrinterEventPayload) {
    const printer = await this.prisma.printer.findUnique({ where: { id: p.printerId } });
    if (!printer) {
      this.logger.warn(`agent:printer-event for unknown printer ${p.printerId}`);
      return { ok: false };
    }
    await this.printers.recordHealth(p.printerId, {
      status: mapStatusToPrisma(p.status),
      message: p.detail,
    });
    this.realtime.emitPrinterStatus(printer.shopId, {
      printerId: p.printerId,
      status: p.status,
    });
    return { ok: true };
  }

  /** Liveness signal so admin can show "agent online" in the dashboard. */
  @SubscribeMessage('agent:heartbeat')
  async onHeartbeat(@MessageBody() p: { agentId: string; shopId: string; printers?: any[] }) {
    this.logger.debug(`heartbeat shop=${p.shopId}`);
    if (p.shopId && p.printers) {
      await this.printers.syncFromHeartbeat(p.shopId, p.printers).catch((e) => {
        this.logger.error(`Failed to sync printers from heartbeat: ${e.message}`);
      });
    }
    return { ok: true };
  }
}

const STATUS_MAP = {
  online: 'ONLINE',
  offline: 'OFFLINE',
  busy: 'BUSY',
  paper_out: 'PAPER_OUT',
  toner_low: 'TONER_LOW',
  jam: 'JAM',
  error: 'ERROR',
} as const;

function mapStatusToPrisma(status: PrinterStatus) {
  return STATUS_MAP[status];
}
