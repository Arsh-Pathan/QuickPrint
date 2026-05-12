import { BadRequestException, Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RazorpayService } from './razorpay.service';
import { PrintJobsService } from '../print-jobs/print-jobs.service';
import { QueueService } from '../queue/queue.service';
import { AuditLogService } from '../audit-log/audit-log.service';

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
    private readonly audit: AuditLogService,
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

  async createBatchOrder(userId: string, jobIds: string[]) {
    if (!jobIds.length) throw new BadRequestException('no_jobs');

    const jobs = await this.prisma.printJob.findMany({
      where: { id: { in: jobIds }, ownerId: userId, status: 'CREATED' },
    });

    if (jobs.length !== jobIds.length) {
      throw new BadRequestException('some_jobs_invalid_or_not_payable');
    }

    const totalPaise = jobs.reduce((sum: number, j) => sum + j.priceTotalPaise, 0);
    const receipt = `batch_${jobIds[0]!.slice(0, 8)}_${Date.now()}`;
    const order = await this.rzp.createOrder(totalPaise, receipt);

    for (const job of jobs) {
      await this.prisma.payment.upsert({
        where: { jobId: job.id },
        create: {
          jobId: job.id,
          userId,
          razorpayOrderId: order.orderId,
          amountPaise: job.priceTotalPaise,
          currency: order.currency,
        },
        update: { razorpayOrderId: order.orderId, amountPaise: job.priceTotalPaise },
      });
    }

    return { ...order, jobIds };
  }

  async confirmClientSuccess(orderId: string, paymentId: string, signature: string) {
    if (!(await this.rzp.verifyClientSignature(orderId, paymentId, signature))) {
      throw new BadRequestException('invalid_signature');
    }

    const payments = await this.prisma.payment.findMany({
      where: { razorpayOrderId: orderId },
    });
    if (!payments.length) throw new BadRequestException('payment_not_found');

    const captured: string[] = [];

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const payment of payments) {
        if (payment.status === 'CAPTURED') continue;
        const updated = await tx.payment.updateMany({
          where: { id: payment.id, status: { not: 'CAPTURED' } },
          data: {
            razorpayPaymentId: paymentId,
            razorpaySignature: signature,
            status: 'CAPTURED',
            capturedAt: new Date(),
          },
        });
        if (updated.count > 0) captured.push(payment.jobId);
      }
    });

    for (const jobId of captured) {
      await this.jobs.markPaidAndEnqueue(jobId);
      this.audit.record({
        action: 'payment.captured',
        entityType: 'Payment',
        entityId: jobId,
        after: { orderId, paymentId },
      });
    }

    return { ok: true };
  }

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

  private async onPaymentCaptured(p?: RazorpayPaymentEntity) {
    if (!p?.order_id || !p?.id) {
      this.logger.warn('payment.captured missing order_id/payment_id');
      return { received: true, handled: false };
    }

    const captured: string[] = [];

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const payments = await tx.payment.findMany({
        where: { razorpayOrderId: p!.order_id },
      });
      if (!payments.length) {
        this.logger.warn(`payment.captured: no Payment for order ${p!.order_id}`);
        return;
      }
      for (const payment of payments) {
        if (payment.status === 'CAPTURED') continue;
        const updated = await tx.payment.updateMany({
          where: { id: payment.id, status: { not: 'CAPTURED' } },
          data: {
            razorpayPaymentId: p!.id,
            status: 'CAPTURED',
            capturedAt: new Date(),
            rawWebhookPayload: JSON.stringify(p) as any,
          },
        });
        if (updated.count > 0) captured.push(payment.jobId);
      }
    });

    for (const jobId of captured) {
      await this.jobs.markPaidAndEnqueue(jobId);
      this.audit.record({
        action: 'payment.captured',
        entityType: 'Payment',
        entityId: jobId,
        after: { orderId: p!.order_id, paymentId: p!.id },
      });
    }
    return { received: true, handled: true };
  }

  private async onPaymentFailed(p?: RazorpayPaymentEntity) {
    if (!p?.order_id) {
      this.logger.warn('payment.failed missing order_id');
      return { received: true, handled: false };
    }
    const payments = await this.prisma.payment.findMany({
      where: { razorpayOrderId: p.order_id },
    });
    if (!payments.length) return { received: true, handled: false };

    for (const payment of payments) {
      if (payment.status === 'CAPTURED') continue;
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId: p.id ?? payment.razorpayPaymentId,
          status: 'FAILED',
          rawWebhookPayload: JSON.stringify(p) as any,
        },
      });
      this.audit.record({
        action: 'payment.failed',
        entityType: 'Payment',
        entityId: payment.jobId,
        after: { orderId: p.order_id, error: p.error_code ?? 'unknown' },
      });
    }
    this.logger.warn(
      `payment.failed orderId=${p.order_id} reason=${p.error_code ?? 'unknown'}`,
    );
    return { received: true, handled: true };
  }

  private async onRefund(r?: RazorpayRefundEntity) {
    if (!r?.payment_id) {
      this.logger.warn('refund event missing payment_id');
      return { received: true, handled: false };
    }
    const payments = await this.prisma.payment.findMany({
      where: { razorpayPaymentId: r.payment_id },
    });
    if (!payments.length) return { received: true, handled: false };

    for (const payment of payments) {
      if (payment.status === 'REFUNDED') continue;
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED', rawWebhookPayload: JSON.stringify(r) as any },
      });
      const job = await this.prisma.printJob.findUnique({ where: { id: payment.jobId } });
      if (job && (job.status === 'QUEUED' || job.status === 'PAID' || job.status === 'CREATED')) {
        await this.queue.cancel(job.id);
        await this.prisma.printJob.update({
          where: { id: job.id },
          data: { status: 'CANCELLED', failureReason: 'refunded' },
        });
      }
      this.audit.record({
        action: 'payment.refunded',
        entityType: 'Payment',
        entityId: payment.jobId,
        after: { paymentId: r.payment_id },
      });
    }
    this.logger.log(`refund processed payment_id=${r.payment_id}`);
    return { received: true, handled: true };
  }
}
