import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const SECONDS_PER_PAGE = 4;

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(private readonly prisma: PrismaService) {}

  async enqueue(jobId: string, shopId: string, priority = 0) {
    const last = await this.prisma.queueEntry.findFirst({
      where: { shopId },
      orderBy: { position: 'desc' },
    });
    const position = (last?.position ?? 0) + 1;
    return this.prisma.queueEntry.upsert({
      where: { jobId },
      create: { jobId, shopId, position, priority },
      update: { position, priority },
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
    return entries.map((e) => {
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
    return next;
  }

  async cancel(jobId: string) {
    await this.prisma.queueEntry.delete({ where: { jobId } }).catch(() => null);
    await this.prisma.printJob.update({
      where: { id: jobId },
      data: { status: 'CANCELLED' },
    });
  }
}
