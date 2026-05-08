import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RazorpayService } from './razorpay.service';
import { PrintJobsModule } from '../print-jobs/print-jobs.module';

@Module({
  imports: [forwardRef(() => PrintJobsModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService, RazorpayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
