import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PricingService } from '../pricing/pricing.service';
import { FilesService } from '../files/files.service';
import { QueueService } from '../queue/queue.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { CreatePrintJobDto } from '@quickprint/shared';

@Injectable()
export class PrintJobsService {
  private readonly logger = new Logger(PrintJobsService.name);
  private readonly defaultShopId = process.env.SHOP_ID ?? 'shop_local_dev';

  // Normalize DB status to lowercase for frontend
  private normalize(job: Prisma.PrintJobGetPayload<{}>) {
    return { ...job, status: job.status?.toLowerCase() ?? job.status };
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly files: FilesService,
    private readonly queue: QueueService,
    private readonly realtime: RealtimeGateway,
    private readonly audit: AuditLogService,
  ) {}

  // ─── Admin job interventions ────────────────────────────────────────────────

  /** Force a job into COMPLETED state. Used when Maddy hands the print over
   *  manually (e.g. the agent crashed mid-job but the print actually finished). */
  async adminMarkPrinted(jobId: string) {
    const job = await this.prisma.printJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('job_not_found');
    if (job.status === 'COMPLETED') return this.normalize(job);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.queueEntry.delete({ where: { jobId } }).catch(() => null);
      await tx.printJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED', printedAt: new Date() },
      });
    });

    const shopId = job.shopId ?? this.defaultShopId;
    this.realtime.emitJobStatus(jobId, 'completed');
    await this.queue.broadcastPositions(shopId).catch(() => null);
    await this.audit.record({ action: 'job.admin_marked_printed', entityType: 'PrintJob', entityId: jobId });

    const updated = await this.prisma.printJob.findUnique({ where: { id: jobId } });
    return updated ? this.normalize(updated) : null;
  }

  /** Cancel a job, remove it from the queue, and mark it for refund.
   *  Razorpay refund itself is handled out-of-band today; the local state
   *  flips to CANCELLED with a failureReason so the refund dashboard can show it. */
  async adminCancel(jobId: string, reason?: string) {
    const job = await this.prisma.printJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('job_not_found');
    if (job.status === 'CANCELLED' || job.status === 'COMPLETED') {
      throw new BadRequestException('job_already_finalized');
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.queueEntry.delete({ where: { jobId } }).catch(() => null);
      await tx.printJob.update({
        where: { id: jobId },
        data: { status: 'CANCELLED', failureReason: reason ?? 'admin_cancelled' },
      });
    });

    const shopId = job.shopId ?? this.defaultShopId;
    this.realtime.emitJobStatus(jobId, 'cancelled');
    await this.queue.broadcastPositions(shopId).catch(() => null);
    await this.audit.record({
      action: 'job.admin_cancelled',
      entityType: 'PrintJob',
      entityId: jobId,
      after: { reason: reason ?? null },
    });

    const updated = await this.prisma.printJob.findUnique({ where: { id: jobId } });
    return updated ? this.normalize(updated) : null;
  }

  /** Put a FAILED/QUEUED job back in line for a retry. Useful when the
   *  agent erred transiently (printer offline, paper jam recovered). */
  async adminRequeue(jobId: string) {
    const job = await this.prisma.printJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('job_not_found');
    if (!['FAILED', 'QUEUED', 'CANCELLED', 'PRINTING'].includes(job.status)) {
      throw new BadRequestException('job_not_requeueable');
    }
    if (!job.paidAt) throw new BadRequestException('job_not_paid');

    const shopId = job.shopId ?? this.defaultShopId;

    await this.prisma.printJob.update({
      where: { id: jobId },
      data: { status: 'QUEUED', failureReason: null },
    });
    await this.queue.enqueue(jobId, shopId, job.priority);

    this.realtime.emitJobStatus(jobId, 'queued');

    // Try to assign immediately if a capable printer is online.
    const printer = await this.pickPrinter(shopId, { ...job, pages: job.pages });
    if (printer) {
      const downloadUrl = await this.files.download(job.fileKey);
      this.realtime.assignJobToAgent(shopId, {
        id: job.id,
        fileUrl: downloadUrl,
        fileName: job.fileName,
        fileHash: job.fileHash ?? undefined,
        printerId: printer.id,
        copies: job.copies,
        duplex: job.duplex,
        color: job.color,
        paperSize: job.paperSize,
        pageRange: job.pageRange ?? undefined,
      });
    }

    await this.audit.record({ action: 'job.admin_requeued', entityType: 'PrintJob', entityId: jobId });
    const updated = await this.prisma.printJob.findUnique({ where: { id: jobId } });
    return updated ? this.normalize(updated) : null;
  }

  /**
   * Creates a new print job.
   * 1. Analyzes the file for page count and integrity hash.
   * 2. Calculates a price quote based on analysis and settings.
   * 3. Persists the job in the database with 'CREATED' status.
   */
  async create(userId: string, dto: CreatePrintJobDto) {
    if (!dto.fileKey || !dto.mimeType) {
      throw new BadRequestException('invalid_file_payload');
    }

    const analysis = await this.files.analyze(dto.fileKey, dto.mimeType);
    const breakdown = await this.pricing.quote(analysis.pages, analysis.colorPages, dto.settings);

    const job = await this.prisma.printJob.create({
      data: {
        ownerId: userId,
        fileKey: dto.fileKey,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        fileHash: analysis.fileHash,
        pages: analysis.pages,
        colorPages: analysis.colorPages,
        color: dto.settings.color,
        duplex: dto.settings.duplex,
        copies: dto.settings.copies,
        paperSize: dto.settings.paperSize?.toUpperCase() as any,
        pageRange: dto.settings.pageRange,
        priceTotalPaise: breakdown.totalPaise,
        priceBreakdown: JSON.stringify(breakdown) as any,
        printerId: dto.printerId || undefined,
      },
    });
    return this.normalize(job);
  }

  async findOwned(userId: string, jobId: string) {
    const job = await this.prisma.printJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('job_not_found');
    if (job.ownerId !== userId) throw new ForbiddenException('not_owner');
    
    const previewUrl = await this.files.download(job.fileKey);
    return {
      ...this.normalize(job),
      previewUrl,
    };
  }

  async updateOwnedSettings(userId: string, jobId: string, settings: CreatePrintJobDto['settings']) {
    const job = await this.prisma.printJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('job_not_found');
    if (job.ownerId !== userId) throw new ForbiddenException('not_owner');
    if (job.status !== 'CREATED') throw new BadRequestException('job_settings_locked');

    const breakdown = await this.pricing.quote(job.pages, job.colorPages, settings);
    const updated = await this.prisma.printJob.update({
      where: { id: jobId },
      data: {
        color: settings.color,
        duplex: settings.duplex,
        copies: settings.copies,
        paperSize: settings.paperSize?.toUpperCase() as any,
        pageRange: settings.pageRange,
        priceTotalPaise: breakdown.totalPaise,
        priceBreakdown: JSON.stringify(breakdown) as any,
      },
    });

    return this.normalize(updated);
  }

  /**
   * Clone a completed/failed/cancelled job into a fresh CREATED job.
   * Reuses the existing fileKey + analysis (no re-upload, no re-analysis).
   * Optional `settings` override; otherwise we keep the source job's settings.
   */
  async reprint(userId: string, sourceId: string, settings?: CreatePrintJobDto['settings']) {
    const source = await this.prisma.printJob.findUnique({ where: { id: sourceId } });
    if (!source) throw new NotFoundException('job_not_found');
    if (source.ownerId !== userId) throw new ForbiddenException('not_owner');
    if (!['COMPLETED', 'FAILED', 'CANCELLED'].includes(source.status)) {
      throw new BadRequestException('source_not_reprintable');
    }

    const effective = settings ?? {
      color: source.color,
      duplex: source.duplex,
      copies: source.copies,
      paperSize: source.paperSize as any,
      pageRange: source.pageRange ?? undefined,
    };

    const breakdown = await this.pricing.quote(source.pages, source.colorPages, effective);

    const job = await this.prisma.printJob.create({
      data: {
        ownerId: userId,
        fileKey: source.fileKey,
        fileName: source.fileName,
        fileSize: source.fileSize,
        mimeType: source.mimeType,
        fileHash: source.fileHash,
        pages: source.pages,
        colorPages: source.colorPages,
        color: effective.color,
        duplex: effective.duplex,
        copies: effective.copies,
        paperSize: effective.paperSize?.toUpperCase() as any,
        pageRange: effective.pageRange,
        priceTotalPaise: breakdown.totalPaise,
        priceBreakdown: JSON.stringify(breakdown) as any,
        shopId: source.shopId,
      },
    });

    this.logger.log(`Reprint: job ${job.id} cloned from ${sourceId} (user=${userId})`);
    return this.normalize(job);
  }

  async listForUser(userId: string) {
    const jobs = await this.prisma.printJob.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return jobs.map((j) => this.normalize(j));
  }

  async listForAdmin(opts: { shopId?: string; limit?: number; sinceHours?: number }) {
    const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
    const since = opts.sinceHours
      ? new Date(Date.now() - opts.sinceHours * 60 * 60 * 1000)
      : undefined;
    const shopFilter = opts.shopId
      ? { OR: [{ shopId: opts.shopId }, { shopId: null }] }
      : {};
    const jobs = await this.prisma.printJob.findMany({
      where: {
        ...shopFilter,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return jobs.map((j) => this.normalize(j));
  }

  /** 
   * Aggregates stats for the admin Overview page (today only by default). 
   * Calculates earnings, completed, failed, and queued job counts.
   */
  async statsForAdmin(shopId?: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const shopFilter = shopId ? { OR: [{ shopId }, { shopId: null }] } : {};
    const where = {
      ...shopFilter,
      createdAt: { gte: startOfDay },
    };

    const [completed, failed, queued, agg] = await Promise.all([
      this.prisma.printJob.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.printJob.count({ where: { ...where, status: 'FAILED' } }),
      this.prisma.printJob.count({
        where: { ...where, status: { in: ['QUEUED', 'PRINTING'] } },
      }),
      this.prisma.printJob.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { priceTotalPaise: true },
      }),
    ]);

    return {
      jobsCompletedToday: completed,
      jobsFailedToday: failed,
      jobsInQueue: queued,
      earningsTodayPaise: agg._sum.priceTotalPaise ?? 0,
    };
  }

  /**
   * Transitions a job to the PAID and QUEUED state.
   * 1. Updates status in DB.
   * 2. Adds job to the shop's logical queue.
   * 3. Broadcasts status update via WebSockets.
   * 4. Picks an available printer and assigns the job to the shop agent.
   */
  async markPaidAndEnqueue(jobId: string) {
    const pre = await this.prisma.printJob.findUnique({
      where: { id: jobId },
      select: { paidAt: true },
    });
    const job = await this.prisma.printJob.update({
      where: { id: jobId, status: { in: ['CREATED', 'PAID'] } },
      data: { status: 'QUEUED', paidAt: pre?.paidAt ?? new Date() },
    }).catch(() => null);
    if (!job) {
      this.logger.warn(`markPaidAndEnqueue: job ${jobId} already processed or missing`);
      return null;
    }
    const shopId = job.shopId ?? this.defaultShopId;
    await this.queue.enqueue(job.id, shopId, job.priority);
    this.realtime.emitJobStatus(job.id, 'queued');

    const printer = await this.pickPrinter(shopId, { ...job, pages: job.pages });
    const downloadUrl = await this.files.download(job.fileKey);

    let assigned = false;
    if (printer) {
      assigned = this.realtime.assignJobToAgent(shopId, {
        id: job.id,
        fileUrl: downloadUrl,
        fileName: job.fileName,
        fileHash: job.fileHash ?? undefined,
        printerId: printer.id,
        copies: job.copies,
        duplex: job.duplex,
        color: job.color,
        paperSize: job.paperSize,
        pageRange: job.pageRange ?? undefined,
      });
    } else {
      this.logger.warn(`Job ${job.id}: no online printer available, job queued without assignment`);
    }

    this.logger.log(
      `Job ${job.id} paid → queued (shop=${shopId} agent_online=${assigned})`,
    );
    return this.normalize(job);
  }

  async assignQueuedBacklog(shopId: string) {
    const entries = await this.prisma.queueEntry.findMany({
      where: { shopId, job: { status: 'QUEUED' } },
      include: { job: true },
      orderBy: [{ priority: 'desc' }, { position: 'asc' }],
    });

    let assigned = 0;
    for (const entry of entries) {
      const printer = await this.pickPrinter(shopId, { ...entry.job, pages: entry.job.pages });
      if (!printer) continue;

      const downloadUrl = await this.files.download(entry.job.fileKey);
      const pushed = this.realtime.assignJobToAgent(shopId, {
        id: entry.job.id,
        fileUrl: downloadUrl,
        fileName: entry.job.fileName,
        fileHash: entry.job.fileHash ?? undefined,
        printerId: printer.id,
        copies: entry.job.copies,
        duplex: entry.job.duplex,
        color: entry.job.color,
        paperSize: entry.job.paperSize,
        pageRange: entry.job.pageRange ?? undefined,
      });
      if (pushed) assigned += 1;
    }

    this.logger.log(`assignQueuedBacklog shop=${shopId} queued=${entries.length} assigned=${assigned}`);
    return assigned;
  }

  /**
   * Strategic printer selection.
   *
   * Hard filters (must hold):
   *   - enabled = true (admin-confirmed setup)
   *   - status = ONLINE
   *   - supportsColor if the job is color
   *   - supportsDuplex if the job wants duplex (relaxed as a last resort)
   *
   * Preference order among capable printers:
   *   1. The category that best matches the job
   *      - color job  → prefer COLOR
   *      - pages >= longPagesThreshold → prefer LONG
   *      - pages <  longPagesThreshold → prefer SHORT
   *      - GENERAL acts as a wildcard fallback
   *   2. Most recently seen (lastSeenAt desc)
   */
  private async pickPrinter(
    shopId: string,
    job: { color: boolean; duplex: boolean; pages?: number; printerId?: string | null },
  ): Promise<{ id: string; [k: string]: unknown } | null> {
    // Explicit printer request: only honor it if the printer is enabled + capable.
    if (job.printerId) {
      const target = await this.prisma.printer.findUnique({ where: { id: job.printerId } });
      if (target && target.enabled && target.status === 'ONLINE') {
        const canColor = !job.color || target.supportsColor;
        const canDuplex = !job.duplex || target.supportsDuplex;
        if (canColor && canDuplex) {
          return target;
        }
      }
    }

    const candidates = await this.prisma.printer.findMany({
      where: {
        shopId,
        enabled: true,
        status: 'ONLINE',
        ...(job.color ? { supportsColor: true } : {}),
        ...(job.duplex ? { supportsDuplex: true } : {}),
      },
      orderBy: { lastSeenAt: 'desc' },
    });

    if (candidates.length === 0) {
      // Last resort: if a duplex job has no duplex-capable printer, fall back to simplex.
      if (job.duplex) {
        return this.pickPrinter(shopId, { ...job, duplex: false });
      }
      return null;
    }

    // Score each candidate against the job's preferred category.
    const preferredCategory = this.preferredCategory(job);
    const scored = candidates
      .map((c) => ({ printer: c, score: this.categoryScore(c.category, preferredCategory) }))
      .sort((a, b) => b.score - a.score);

    return scored[0]?.printer ?? null;
  }

  private preferredCategory(job: { color: boolean; pages?: number }): 'COLOR' | 'LONG' | 'SHORT' | 'GENERAL' {
    if (job.color) return 'COLOR';
    // We don't know per-printer thresholds yet; routing uses a default 20-page cutoff.
    // The per-printer threshold still gates whether a LONG printer accepts the job.
    const pages = job.pages ?? 0;
    if (pages >= 20) return 'LONG';
    if (pages > 0) return 'SHORT';
    return 'GENERAL';
  }

  private categoryScore(
    candidate: string,
    preferred: 'COLOR' | 'LONG' | 'SHORT' | 'GENERAL',
  ): number {
    if (candidate === preferred) return 3;
    if (candidate === 'GENERAL') return 2; // GENERAL is a universal fallback.
    return 1;
  }
}
