import { Module } from '@nestjs/common';
import { PrintJobsController } from './print-jobs.controller';
import { PrintJobsService } from './print-jobs.service';
import { FilesModule } from '../files/files.module';
import { PricingModule } from '../pricing/pricing.module';
import { QueueModule } from '../queue/queue.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [FilesModule, PricingModule, QueueModule, RealtimeModule],
  controllers: [PrintJobsController],
  providers: [PrintJobsService],
  exports: [PrintJobsService],
})
export class PrintJobsModule {}
