import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface CreatedOrder {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
}

/**
 * Thin wrapper around the Razorpay SDK. Defers the SDK import so dev mode
 * works without keys; in production it should be replaced with the real
 * `Razorpay` client.
 */
@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(cfg: ConfigService) {
    this.keyId = cfg.get<string>('RAZORPAY_KEY_ID') ?? '';
    this.keySecret = cfg.get<string>('RAZORPAY_KEY_SECRET') ?? '';
    this.webhookSecret = cfg.get<string>('RAZORPAY_WEBHOOK_SECRET') ?? '';
  }

  async createOrder(amountPaise: number, receipt: string): Promise<CreatedOrder> {
    if (!this.keyId || !this.keySecret) {
      this.logger.warn('Razorpay keys missing; returning mock order');
      return {
        orderId: `mock_${receipt}`,
        amountPaise,
        currency: 'INR',
        keyId: this.keyId || 'rzp_test_mock',
      };
    }
    // TODO: const Razorpay = (await import('razorpay')).default;
    //       const rzp = new Razorpay({ key_id, key_secret });
    //       return rzp.orders.create({ ... })
    return { orderId: `mock_${receipt}`, amountPaise, currency: 'INR', keyId: this.keyId };
  }

  /**
   * Razorpay client-side payment success signature:
   *   HMAC_SHA256(orderId + '|' + paymentId, keySecret) === signature
   */
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
