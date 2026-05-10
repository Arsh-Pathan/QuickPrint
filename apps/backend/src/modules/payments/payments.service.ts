import { BadRequestException, Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { PrintJobsService } from '../print-jobs/print-jobs.service';
import { QueueService } from '../queue/queue.service';

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment?: { entity?: RazorpayPaymentEntity };
    refund?: { entity?: RazorpayRefundEntity };
  };
}

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  status?: string;
  amount?: number;
  error_code?: string;
  error_description?: string;
}

interface RazorpayRefundEntity {
  id: string;
  payment_id: string;
  amount?: number;
  status?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rzp: RazorpayService,
    @Inject(forwardRef(() => PrintJobsService)) private readonly jobs: PrintJobsService,
    private readonly queue: QueueService,
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
   * Idempotent: re-delivery of the same event is safe (keyed on payment id + status).
   */
  async handleWebhook(event: RazorpayWebhookEvent) {
    this.logger.log(`razorpay webhook: ${event.event}`);
    switch (event.event) {
      case 'payment.captured':
        return this.onPaymentCaptured(event.payload.payment?.entity);
      case 'payment.failed':
        return this.onPaymentFailed(event.payload.payment?.entity);
      case 'refund.created':
      case 'refund.processed':
        return this.onRefund(event.payload.refund?.entity);
      default:
        this.logger.log(`razorpay webhook ignored (unhandled): ${event.event}`);
        return { received: true, handled: false };
    }
  }

  /**
   * payment.captured webhook. Used as the authoritative confirmation when
   * the client-side confirm endpoint never fires (closed tab, network drop).
   * Idempotent against confirmClientSuccess.
   */
  private async onPaymentCaptured(p?: RazorpayPaymentEntity) {
    if (!p?.order_id || !p?.id) {
      this.logger.warn('payment.captured missing order_id/payment_id');
      return { received: true, handled: false };
    }
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId: p.order_id },
    });
    if (!payment) {
      this.logger.warn(`payment.captured: no Payment for order ${p.order_id}`);
      return { received: true, handled: false };
    }
    if (payment.status === 'CAPTURED') {
      return { received: true, handled: true, idempotent: true };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        razorpayPaymentId: p.id,
        status: 'CAPTURED',
        capturedAt: new Date(),
        rawWebhookPayload: p as unknown as object,
      },
    });

    // Enqueue the job if confirmClientSuccess never ran.
    const job = await this.prisma.printJob.findUnique({ where: { id: payment.jobId } });
    if (job && job.status === 'CREATED') {
      await this.jobs.markPaidAndEnqueue(payment.jobId);
    }
    return { received: true, handled: true };
  }

  /**
   * payment.failed webhook. Marks the payment failed, leaves the job in
   * CREATED so the user can retry. Persists the error reason for diagnostics.
   */
  private async onPaymentFailed(p?: RazorpayPaymentEntity) {
    if (!p?.order_id) {
      this.logger.warn('payment.failed missing order_id');
      return { received: true, handled: false };
    }
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId: p.order_id },
    });
    if (!payment) return { received: true, handled: false };
    if (payment.status === 'CAPTURED') {
      // Already captured — ignore stale failure event.
      return { received: true, handled: true, idempotent: true };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        razorpayPaymentId: p.id ?? payment.razorpayPaymentId,
        status: 'FAILED',
        rawWebhookPayload: p as unknown as object,
      },
    });
    this.logger.warn(
      `payment.failed jobId=${payment.jobId} reason=${p.error_code ?? 'unknown'}`,
    );
    return { received: true, handled: true };
  }

  /**
   * refund.created / refund.processed webhook. Marks the payment refunded
   * and cancels the job + queue entry if it has not been printed yet.
   * Once a job is COMPLETED, refund only updates payment state — the print
   * has already happened and the operator handles physical reconciliation.
   */
  private async onRefund(r?: RazorpayRefundEntity) {
    if (!r?.payment_id) {
      this.logger.warn('refund event missing payment_id');
      return { received: true, handled: false };
    }
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayPaymentId: r.payment_id },
    });
    if (!payment) return { received: true, handled: false };
    if (payment.status === 'REFUNDED') {
      return { received: true, handled: true, idempotent: true };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED', rawWebhookPayload: r as unknown as object },
    });

    const job = await this.prisma.printJob.findUnique({ where: { id: payment.jobId } });
    if (job && (job.status === 'QUEUED' || job.status === 'PAID' || job.status === 'CREATED')) {
      await this.queue.cancel(job.id);
      await this.prisma.printJob.update({
        where: { id: job.id },
        data: { status: 'CANCELLED', failureReason: 'refunded' },
      });
    }
    this.logger.log(`refund processed jobId=${payment.jobId}`);
    return { received: true, handled: true };
  }
}
