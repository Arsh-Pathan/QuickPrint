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
  private readonly isProd: boolean;

  constructor(cfg: ConfigService) {
    this.keyId = cfg.get<string>('RAZORPAY_KEY_ID') ?? '';
    this.keySecret = cfg.get<string>('RAZORPAY_KEY_SECRET') ?? '';
    this.webhookSecret = cfg.get<string>('RAZORPAY_WEBHOOK_SECRET') ?? '';
    this.isProd = (cfg.get<string>('NODE_ENV') ?? process.env.NODE_ENV) === 'production';

    if (this.isProd) {
      if (!this.keyId || !this.keySecret) {
        throw new Error(
          'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in production',
        );
      }
      if (!this.webhookSecret) {
        throw new Error('RAZORPAY_WEBHOOK_SECRET must be set in production');
      }
    }

    if (this.keyId && this.keySecret) {
      this.rzp = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    }
  }

  async createOrder(amountPaise: number, receipt: string): Promise<CreatedOrder> {
    if (!this.rzp) {
      if (this.isProd) {
        throw new Error('razorpay_not_configured');
      }
      this.logger.warn('Razorpay keys missing; returning mock order (DEV ONLY)');
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
    if (!this.keySecret) {
      if (this.isProd) return false;
      this.logger.warn('verifyClientSignature: keySecret missing (DEV ONLY pass-through)');
      return true;
    }
    const expected = createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return safeEqualHex(expected, signature);
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) {
      if (this.isProd) return false;
      this.logger.warn('verifyWebhookSignature: webhookSecret missing (DEV ONLY pass-through)');
      return true;
    }
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    return safeEqualHex(expected, signature);
  }
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
