import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RazorpayService } from './razorpay.service';
import { PrintJobsModule } from '../print-jobs/print-jobs.module';
import { QueueModule } from '../queue/queue.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [forwardRef(() => PrintJobsModule), QueueModule, SettingsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, RazorpayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
