import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FilesService } from '../files/files.service';

@Injectable()
export class CleanupService implements OnModuleInit {
  private readonly logger = new Logger(CleanupService.name);
  private readonly CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Check once a day
  private readonly FILE_RETENTION_DAYS = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
  ) {}

  onModuleInit() {
    // Run cleanup once on start, then every interval
    this.runCleanup().catch((e) => this.logger.error(`Initial cleanup failed: ${e.message}`));
    setInterval(() => {
      this.runCleanup().catch((e) => this.logger.error(`Periodic cleanup failed: ${e.message}`));
    }, this.CLEANUP_INTERVAL_MS);
  }

  async runCleanup() {
    const cutoff = new Date(Date.now() - this.FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    this.logger.log(`Starting binary cleanup for jobs older than ${cutoff.toISOString()}`);

    // We only clean up binaries for jobs that are no longer active in the print queue.
    // This includes COMPLETED, CANCELLED, FAILED, and CREATED (never paid) jobs.
    // We leave PAID/QUEUED/PRINTING jobs alone even if they are old (though they shouldn't be).
    const jobs = await this.prisma.printJob.findMany({
      where: {
        createdAt: { lt: cutoff },
        fileKey: { not: null },
        status: { in: ['COMPLETED', 'CANCELLED', 'FAILED', 'CREATED'] },
      },
      select: { id: true, fileKey: true },
    });

    if (jobs.length === 0) {
      this.logger.log('No old binaries found for cleanup');
      return;
    }

    let successCount = 0;
    for (const job of jobs) {
      try {
        if (job.fileKey) {
          await this.files.delete(job.fileKey);
          await this.prisma.printJob.update({
            where: { id: job.id },
            data: { fileKey: null }, // Mark file as purged in metadata
          });
          successCount++;
        }
      } catch (e: any) {
        this.logger.warn(`Failed to cleanup binary for job ${job.id}: ${e.message}`);
      }
    }

    this.logger.log(`Cleanup finished: ${successCount}/${jobs.length} binaries purged from storage`);
  }
}
