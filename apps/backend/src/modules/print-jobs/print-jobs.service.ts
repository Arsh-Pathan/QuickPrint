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
        paperSize: dto.settings.paperSize,
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
   * Called by PaymentsService after a successful Razorpay capture. Idempotent.
   */
  async markPaidAndEnqueue(jobId: string) {
    const job = await this.prisma.printJob.update({
      where: { id: jobId },
      data: { status: 'PAID', paidAt: new Date() },
    });
    await this.queue.enqueue(job.id, job.shopId ?? 'default', job.priority);
    this.realtime.emitJobStatus(job.id, 'queued');
    this.logger.log(`Job ${job.id} paid → queued`);
    return job;
  }
}
