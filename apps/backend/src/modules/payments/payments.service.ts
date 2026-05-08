import { BadRequestException, Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { PrintJobsService } from '../print-jobs/print-jobs.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rzp: RazorpayService,
    @Inject(forwardRef(() => PrintJobsService)) private readonly jobs: PrintJobsService,
  ) {}

  async createOrder(userId: string, jobId: string) {
    const job = await this.prisma.printJob.findUnique({ where: { id: jobId } });
    if (!job || job.ownerId !== userId) throw new BadRequestException('invalid_job');
    if (job.status !== 'CREATED') throw new BadRequestException('job_not_payable');

    const order = await this.rzp.createOrder(job.priceTotalPaise, job.id);

    await this.prisma.payment.upsert({
      where: { jobId: job.id },
      create: {
        jobId: job.id,
        userId,
        razorpayOrderId: order.orderId,
        amountPaise: order.amountPaise,
        currency: order.currency,
      },
      update: { razorpayOrderId: order.orderId, amountPaise: order.amountPaise },
    });

    return order;
  }

  /**
   * Called by the client after Razorpay checkout success. Verifies signature,
   * marks payment captured, and transitions the job into the queue.
   * Idempotent on (orderId, paymentId).
   */
  async confirmClientSuccess(orderId: string, paymentId: string, signature: string) {
    if (!this.rzp.verifyClientSignature(orderId, paymentId, signature)) {
      throw new BadRequestException('invalid_signature');
    }
    const payment = await this.prisma.payment.findUnique({ where: { razorpayOrderId: orderId } });
    if (!payment) throw new BadRequestException('payment_not_found');

    if (payment.status === 'CAPTURED') return { ok: true, idempotent: true };

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        status: 'CAPTURED',
        capturedAt: new Date(),
      },
    });

    await this.jobs.markPaidAndEnqueue(payment.jobId);
    return { ok: true };
  }

  /**
   * Razorpay webhook handler. Source of truth for async events.
   * The raw body must have already been signature-verified by the controller.
   */
  async handleWebhook(event: { event: string; payload: Record<string, unknown> }) {
    this.logger.log(`razorpay webhook: ${event.event}`);
    // TODO: handle payment.captured / payment.failed / refund events
    //       use razorpay_payment_id as idempotency key.
    return { received: true };
  }
}
