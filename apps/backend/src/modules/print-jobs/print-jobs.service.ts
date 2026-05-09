import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Printer } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { FilesService } from '../files/files.service';
import { QueueService } from '../queue/queue.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type { CreatePrintJobDto } from '@quickprint/shared';

@Injectable()
export class PrintJobsService {
  private readonly logger = new Logger(PrintJobsService.name);

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
    const analysis = await this.files.analyze(dto.fileKey, dto.mimeType);
    const breakdown = this.pricing.quote(analysis.pages, analysis.colorPages, dto.settings);

    return this.prisma.printJob.create({
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
        priceBreakdown: breakdown as unknown as object,
      },
    });
  }

  /**
   * Retrieves a single job, verifying ownership for security.
   */
  async findOwned(userId: string, jobId: string) {
    const job = await this.prisma.printJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('job_not_found');
    if (job.ownerId !== userId) throw new ForbiddenException('not_owner');
    return job;
  }

  /**
   * Lists the most recent jobs for a specific user.
   */
  async listForUser(userId: string) {
    return this.prisma.printJob.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Admin-scoped recent jobs list. Returns jobs at a shop (or all if
   * shopId is omitted), most recent first. Used by the admin dashboard.
   */
  async listForAdmin(opts: { shopId?: string; limit?: number; sinceHours?: number }) {
    const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
    const since = opts.sinceHours
      ? new Date(Date.now() - opts.sinceHours * 60 * 60 * 1000)
      : undefined;
    const shopFilter = opts.shopId
      ? { OR: [{ shopId: opts.shopId }, { shopId: null }] }
      : {};
    return this.prisma.printJob.findMany({
      where: {
        ...shopFilter,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
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
    const job = await this.prisma.printJob.update({
      where: { id: jobId },
      data: { status: 'QUEUED', paidAt: new Date() },
    });
    const shopId = job.shopId ?? 'shop_local_dev';
    await this.queue.enqueue(job.id, shopId, job.priority);
    this.realtime.emitJobStatus(job.id, 'queued');

    const printer = await this.pickPrinter(shopId, job);
    const downloadUrl = await this.files.download(job.fileKey);
    const assigned = this.realtime.assignJobToAgent(shopId, {
      id: job.id,
      fileUrl: downloadUrl,
      fileName: job.fileName,
      fileHash: job.fileHash ?? undefined,
      printerId: printer?.id ?? 'default',
      copies: job.copies,
      duplex: job.duplex,
      color: job.color,
      paperSize: job.paperSize,
      pageRange: job.pageRange ?? undefined,
    });

    this.logger.log(
      `Job ${job.id} paid → queued (shop=${shopId} agent_online=${assigned})`,
    );
    return job;
  }

  /**
   * Strategic printer selection. 
   * Strictly routes jobs based on the session's color requirement.
   * Color jobs MUST go to a printer with 'supportsColor: true'.
   */
  private async pickPrinter(shopId: string, job: { color: boolean; duplex: boolean }): Promise<Printer | null> {
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
