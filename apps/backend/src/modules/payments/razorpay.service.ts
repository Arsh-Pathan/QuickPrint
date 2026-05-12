import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';
import { SettingsService } from '../settings/settings.service';

export interface CreatedOrder {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
}

const LEGACY_WEBHOOK_PLACEHOLDER = 'standalone_placeholder_webhook';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly isProd: boolean;
  private sdkCache: { keyId: string; keySecret: string; rzp: Razorpay } | null = null;

  constructor(
    private readonly cfg: ConfigService,
    private readonly settings: SettingsService,
  ) {
    this.isProd = (cfg.get<string>('NODE_ENV') ?? process.env.NODE_ENV) === 'production';
  }

  private async resolveKeys(): Promise<{ keyId: string; keySecret: string; webhookSecret: string }> {
    return {
      keyId: await this.settings.getSecret('razorpayKeyId'),
      keySecret: await this.settings.getSecret('razorpayKeySecret'),
      webhookSecret: await this.settings.getSecret('razorpayWebhookSecret'),
    };
  }

  private getSdk(keyId: string, keySecret: string): Razorpay | null {
    if (!keyId || !keySecret) return null;
    if (this.sdkCache && this.sdkCache.keyId === keyId && this.sdkCache.keySecret === keySecret) {
      return this.sdkCache.rzp;
    }
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    this.sdkCache = { keyId, keySecret, rzp };
    return rzp;
  }

  async createOrder(amountPaise: number, receipt: string): Promise<CreatedOrder> {
    const { keyId, keySecret } = await this.resolveKeys();
    const rzp = this.getSdk(keyId, keySecret);

    if (!rzp) {
      if (this.isProd) throw new Error('razorpay_not_configured');
      this.logger.warn('Razorpay keys missing; returning mock order (DEV ONLY)');
      return {
        orderId: `mock_${receipt}_${Date.now()}`,
        amountPaise,
        currency: 'INR',
        keyId: keyId || 'rzp_test_mock',
      };
    }

    try {
      const order = await rzp.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: { jobId: receipt },
      });

      return {
        orderId: order.id,
        amountPaise: Number(order.amount),
        currency: order.currency,
        keyId,
      };
    } catch (err) {
      this.logger.error('Razorpay order creation failed', err);
      throw err;
    }
  }

  async verifyClientSignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
    const { keySecret } = await this.resolveKeys();
    if (!keySecret) {
      if (this.isProd) return false;
      this.logger.warn('verifyClientSignature: keySecret missing (DEV ONLY pass-through)');
      return true;
    }
    const expected = createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return safeEqualHex(expected, signature);
  }

  async verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
    const { webhookSecret } = await this.resolveKeys();
    if (!webhookSecret || webhookSecret === LEGACY_WEBHOOK_PLACEHOLDER) {
      if (this.isProd) {
        this.logger.warn(
          'verifyWebhookSignature: razorpayWebhookSecret not configured — rejecting webhook. Set it in Admin → Settings → Secrets.',
        );
        return false;
      }
      this.logger.warn('verifyWebhookSignature: webhookSecret missing (DEV ONLY pass-through)');
      return true;
    }
    const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    return safeEqualHex(expected, signature);
  }
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
