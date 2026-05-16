import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { FilesService } from '../files/files.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { SettingsService } from '../settings/settings.service';

const SECONDS_PER_PAGE = 4;
const DEFAULT_SHOP_ID = process.env.SHOP_ID ?? 'shop_local_dev';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly files: FilesService,
    private readonly audit: AuditLogService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Anonymous queue snapshot for the home page. No PII — just counts and
   * a coarse ETA so the student can decide whether to upload now or come back.
   */
  async publicSnapshot(shopId = DEFAULT_SHOP_ID) {
    const entries = await this.list(shopId);
    const s = await this.settings.get().catch(() => null);
    const last = entries[entries.length - 1];
    const etaSeconds = last?.etaSeconds ?? 0;
    return {
      jobsInQueue: entries.length,
      etaMinutes: Math.max(0, Math.ceil(etaSeconds / 60)),
      acceptingJobs: s?.acceptingJobs ?? true,
    };
  }

  async enqueue(jobId: string, shopId: string, priority = 0) {
    const entry = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const last = await tx.queueEntry.findFirst({
        where: { shopId },
        orderBy: { position: 'desc' },
      });
      const position = (last?.position ?? 0) + 1;
      
      return tx.queueEntry.upsert({
        where: { jobId },
        create: { jobId, shopId, position, priority },
        update: { position, priority },
      });
    });
    await this.broadcastPositions(shopId).catch((e) =>
      this.logger.warn(`broadcastPositions failed shop=${shopId}: ${e.message}`),
    );
    return entry;
  }

  /**
   * Push every waiting student their current queue position + ETA.
   * Cheap (one query, O(n) emits) and lets the UI stay accurate as jobs ahead
   * complete or get cancelled. Called after enqueue, claim, and job-result.
   */
  async broadcastPositions(shopId: string) {
    const entries = await this.list(shopId);
    const total = entries.length;
    entries.forEach((e: any, idx: number) => {
      const position = idx + 1; // 1-based display position
      this.realtime.emitQueuePosition(e.jobId, position, e.etaSeconds, total);
    });
  }

  /**
   * Snapshot of the queue used by the admin dashboard. Includes ETA estimates
   * derived from page counts of jobs ahead.
   */
  async list(shopId: string) {
    const entries = await this.prisma.queueEntry.findMany({
      where: { shopId, job: { status: { in: ['QUEUED', 'PRINTING'] } } },
      include: { job: true },
      orderBy: [{ priority: 'desc' }, { position: 'asc' }],
    });

    let cumPages = 0;
    return entries.map((e: any) => {
      const eta = cumPages * SECONDS_PER_PAGE;
      cumPages += e.job.pages * e.job.copies;
      return { ...e, etaSeconds: eta };
    });
  }

  async claimNext(shopId: string) {
    const next = await this.prisma.queueEntry.findFirst({
      where: { shopId, job: { status: 'QUEUED' } },
      include: { job: true },
      orderBy: [{ priority: 'desc' }, { position: 'asc' }],
    });
    if (!next) return null;
    await this.prisma.printJob.update({
      where: { id: next.jobId },
      data: { status: 'PRINTING' },
    });
    let downloadUrl: string | undefined;
    try {
      downloadUrl = await this.files.download(next.job.fileKey);
    } catch (e) {
      this.logger.warn(`claimNext downloadUrl failed for job ${next.jobId}: ${(e as Error).message}`);
    }
    return { ...next, downloadUrl };
  }

  async cancel(jobId: string) {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.queueEntry.delete({ where: { jobId } }).catch(() => null);
      await tx.printJob.update({
        where: { id: jobId },
        data: { status: 'CANCELLED' },
      });
    });
    this.audit.record({ action: 'job.cancelled', entityType: 'PrintJob', entityId: jobId });
  }

  /**
   * Position lookup for a single job. Returns null if the job is not in queue
   * (e.g. already PRINTING/COMPLETED or never enqueued). Used by the student
   * UI to render an initial "#3 of 7" chip before the first realtime push.
   */
  async positionFor(jobId: string) {
    const entry = await this.prisma.queueEntry.findUnique({
      where: { jobId },
      include: { job: true },
    });
    if (!entry) return null;
    const all = await this.list(entry.shopId);
    const idx = all.findIndex((e: any) => e.jobId === jobId);
    if (idx === -1) return null;
    return {
      position: idx + 1,
      total: all.length,
      etaSeconds: all[idx].etaSeconds,
    };
  }
}
