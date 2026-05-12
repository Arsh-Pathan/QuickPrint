import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { FilesService } from '../files/files.service';
import { QueueService } from '../queue/queue.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type { CreatePrintJobDto } from '@quickprint/shared';

@Injectable()
export class PrintJobsService {
  private readonly logger = new Logger(PrintJobsService.name);
  private readonly defaultShopId = process.env.SHOP_ID ?? 'shop_local_dev';

  // Normalize DB status to lowercase for frontend
  private normalize(job: any) {
    return { ...job, status: job.status?.toLowerCase() ?? job.status };
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly files: FilesService,
    private readonly queue: QueueService,
    private readonly realtime: RealtimeGateway,
  ) {}

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
        priceBreakdown: JSON.stringify(breakdown),
        printerId: dto.printerId,
      },
    });
    return this.normalize(job);
  }

  async findOwned(userId: string, jobId: string) {
    const job = await this.prisma.printJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('job_not_found');
    if (job.ownerId !== userId) throw new ForbiddenException('not_owner');
    return this.normalize(job);
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
        priceBreakdown: JSON.stringify(breakdown),
      },
    });

    return this.normalize(updated);
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

    const printer = await this.pickPrinter(shopId, job);
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
      const printer = await this.pickPrinter(shopId, entry.job);
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
   * Strictly routes jobs based on the session's color requirement.
   * Color jobs MUST go to a printer with 'supportsColor: true'.
   * Color jobs MUST go to a printer with 'supportsColor: true'.
   */
  private async pickPrinter(shopId: string, job: { color: boolean; duplex: boolean; printerId?: string | null }): Promise<{ id: string; [k: string]: unknown } | null> {
    // If a specific printer was requested, check if it exists and is online
    if (job.printerId) {
      const target = await this.prisma.printer.findUnique({
        where: { id: job.printerId }
      });
      if (target && target.status === 'ONLINE') {
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
        status: 'ONLINE',
        ...(job.color ? { supportsColor: true } : {}),
        ...(job.duplex ? { supportsDuplex: true } : {}),
      },
      // Prefer the most recently seen active printer
      orderBy: { lastSeenAt: 'desc' },
    });
    
    // If no exact match found for duplex + color, try without duplex constraint
    if (candidates.length === 0 && job.duplex) {
      return this.pickPrinter(shopId, { ...job, duplex: false });
    }

    return candidates[0] ?? null;
  }
}
