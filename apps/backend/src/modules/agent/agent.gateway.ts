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
import { QueueService } from '../queue/queue.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrintJobsService } from '../print-jobs/print-jobs.service';

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
    private readonly queue: QueueService,
    private readonly audit: AuditLogService,
    private readonly jobs: PrintJobsService,
  ) {}

  private assertAgent(client: Socket): string | null {
    const auth = client.handshake.auth as { shopId?: string; role?: string } | undefined;
    const shopId = auth?.shopId;
    if (!shopId || auth?.role !== 'AGENT') {
      this.logger.warn(`agent command rejected — invalid auth`);
      return null;
    }
    return shopId;
  }

  @SubscribeMessage('agent:job-claimed')
  async onJobClaimed(
    @MessageBody() p: { jobId: string; agentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const shopId = this.assertAgent(client);
    if (!shopId) return { ok: false, error: 'unauthorized' };

    const job = await this.prisma.printJob.findUnique({ where: { id: p.jobId } });
    if (!job) return { ok: false };
    if ((job.shopId ?? process.env.SHOP_ID ?? 'shop_local_dev') !== shopId) {
      this.logger.warn(`agent:job-claimed shop mismatch job=${p.jobId}`);
      return { ok: false, error: 'shop_mismatch' };
    }
    if (job.status !== 'PRINTING') {
      await this.prisma.printJob.update({
        where: { id: p.jobId },
        data: { status: 'PRINTING' },
      });
    }
    this.realtime.emitJobStatus(p.jobId, 'printing');
    this.audit.record({ action: 'job.claimed', entityType: 'PrintJob', entityId: p.jobId, after: { agentId: p.agentId } });
    await this.queue.broadcastPositions(shopId).catch((e: any) =>
      this.logger.warn(`broadcastPositions failed: ${e.message}`),
    );
    return { ok: true };
  }

  @SubscribeMessage('agent:job-result')
  async onJobResult(
    @MessageBody() p: JobResultPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const shopId = this.assertAgent(client);
    if (!shopId) return { ok: false, error: 'unauthorized' };

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
    this.audit.record({
      action: `job.${p.status}`,
      entityType: 'PrintJob',
      entityId: p.jobId,
      after: { status: p.status, error: p.error },
    });
    await this.queue.broadcastPositions(shopId).catch((e: any) =>
      this.logger.warn(`broadcastPositions failed: ${e.message}`),
    );
    return { ok: true };
  }

  @SubscribeMessage('agent:printer-event')
  async onPrinterEvent(
    @MessageBody() p: PrinterEventPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const shopId = this.assertAgent(client);
    if (!shopId) return { ok: false, error: 'unauthorized' };

    const printer = await this.prisma.printer.findUnique({ where: { id: p.printerId } });
    if (!printer) {
      this.logger.warn(`agent:printer-event for unknown printer ${p.printerId}`);
      return { ok: false };
    }
    if (printer.shopId !== shopId) {
      return { ok: false, error: 'shop_mismatch' };
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

  @SubscribeMessage('agent:heartbeat')
  async onHeartbeat(
    @MessageBody() p: { agentId: string; shopId: string; printers?: any[] },
    @ConnectedSocket() client: Socket,
  ) {
    const shopId = this.assertAgent(client);
    if (!shopId) return { ok: false, error: 'unauthorized' };
    if (p.shopId !== shopId) return { ok: false, error: 'shop_mismatch' };

    this.logger.debug(`heartbeat shop=${p.shopId}`);
    if (p.shopId && p.printers) {
      await this.printers.syncFromHeartbeat(p.shopId, p.printers).catch((e) => {
        this.logger.error(`Failed to sync printers from heartbeat: ${e.message}`);
      });
    }
    if (!client.data.queueBacklogSynced) {
      client.data.queueBacklogSynced = true;
      await this.jobs.assignQueuedBacklog(shopId).catch((e: any) => {
        client.data.queueBacklogSynced = false;
        this.logger.error(`Failed to sync queued backlog for ${shopId}: ${e.message}`);
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
