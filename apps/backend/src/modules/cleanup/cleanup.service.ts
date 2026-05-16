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

    // 1. Find unique fileKeys from jobs that are old and inactive
    const candidates = await this.prisma.printJob.findMany({
      where: {
        createdAt: { lt: cutoff },
        fileKey: { notIn: ['purged'] },
        status: { in: ['COMPLETED', 'CANCELLED', 'FAILED', 'CREATED'] },
      },
      select: { fileKey: true },
    });

    if (candidates.length === 0) {
      this.logger.log('No old binaries found for cleanup');
      return;
    }

    const candidateKeys = Array.from(new Set(candidates.map((c) => c.fileKey!)));

    // 2. Filter out keys that are still referenced by ANY "active" or "recent" job.
    // A job is active/recent if:
    // - It is in a processing status (PAID, QUEUED, PRINTING)
    // - OR it was created AFTER the cutoff (even if still in CREATED status)
    const activeJobs = await this.prisma.printJob.findMany({
      where: {
        fileKey: { in: candidateKeys },
        OR: [
          { status: { in: ['PAID', 'QUEUED', 'PRINTING'] } },
          { createdAt: { gte: cutoff } },
        ],
      },
      select: { fileKey: true },
    });

    const activeKeys = new Set(activeJobs.map((j) => j.fileKey!));
    const keysToDelete = candidateKeys.filter((k) => !activeKeys.has(k));

    if (keysToDelete.length === 0) {
      this.logger.log(
        'All candidate binaries are still referenced by active or recent jobs; skipping deletion.',
      );
      return;
    }

    let successCount = 0;
    for (const key of keysToDelete) {
      try {
        await this.files.delete(key);
        // Mark as purged in all jobs that were using this key
        await this.prisma.printJob.updateMany({
          where: { fileKey: key },
          data: { fileKey: 'purged' },
        });
        successCount++;
      } catch (e: any) {
        this.logger.warn(`Failed to cleanup binary ${key}: ${e.message}`);
      }
    }

    this.logger.log(
      `Cleanup finished: ${successCount}/${keysToDelete.length} unique binaries purged from storage`,
    );
  }
}
