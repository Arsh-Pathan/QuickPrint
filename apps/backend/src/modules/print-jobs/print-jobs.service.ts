import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
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

  async findOwned(userId: string, jobId: string) {
    const job = await this.prisma.printJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('job_not_found');
    if (job.ownerId !== userId) throw new ForbiddenException('not_owner');
    return job;
  }

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

  /** Aggregate stats for the admin Overview page (today only by default). */
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
   * Called by PaymentsService after a successful Razorpay capture.
   * Idempotent on (jobId): repeated calls produce the same end state.
   *
   * Flow:
   *   1. PrintJob.status = PAID
   *   2. enqueue → QueueEntry row + status = QUEUED
   *   3. emit job:status to subscribed student client
   *   4. push agent:job-assigned to the shop's online agent (if any)
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
   * Pick the best printer for a job. Strategy: first online printer at the
   * shop that supports the requested capabilities. Returns null if none
   * found — agent falls back to its default.
   */
  private async pickPrinter(shopId: string, job: { color: boolean; duplex: boolean }) {
    const candidates = await this.prisma.printer.findMany({
      where: {
        shopId,
        status: 'ONLINE',
        ...(job.color ? { supportsColor: true } : {}),
        ...(job.duplex ? { supportsDuplex: true } : {}),
      },
      orderBy: { lastSeenAt: 'desc' },
    });
    return candidates[0] ?? null;
  }
}
