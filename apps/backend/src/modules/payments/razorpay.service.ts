import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';

export interface CreatedOrder {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly rzp: Razorpay | null = null;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(cfg: ConfigService) {
    this.keyId = cfg.get<string>('RAZORPAY_KEY_ID') ?? '';
    this.keySecret = cfg.get<string>('RAZORPAY_KEY_SECRET') ?? '';
    this.webhookSecret = cfg.get<string>('RAZORPAY_WEBHOOK_SECRET') ?? '';

    if (this.keyId && this.keySecret) {
      this.rzp = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    }
  }

  async createOrder(amountPaise: number, receipt: string): Promise<CreatedOrder> {
    if (!this.rzp) {
      this.logger.warn('Razorpay keys missing; returning mock order');
      return {
        orderId: `mock_${receipt}_${Date.now()}`,
        amountPaise,
        currency: 'INR',
        keyId: this.keyId || 'rzp_test_mock',
      };
    }

    try {
      const order = await this.rzp.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: { jobId: receipt },
      });

      return {
        orderId: order.id,
        amountPaise: Number(order.amount),
        currency: order.currency,
        keyId: this.keyId,
      };
    } catch (err) {
      this.logger.error('Razorpay order creation failed', err);
      throw err;
    }
  }

  verifyClientSignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!this.keySecret) return true; // dev mode
    const expected = createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return safeEqualHex(expected, signature);
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) return true; // dev mode
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    return safeEqualHex(expected, signature);
  }
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
