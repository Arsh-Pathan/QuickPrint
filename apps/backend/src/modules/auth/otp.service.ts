import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Mock OTP service. Stores codes in-memory; use a real provider (MSG91/Twilio)
 * + Redis-backed store in production. Replace `send`/`verify` only — the
 * rest of auth doesn't change.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private store = new Map<string, { code: string; expiresAt: number }>();

  constructor(private readonly config: ConfigService) {}

  async send(phone: string): Promise<void> {
    const code = this.config.get('NODE_ENV') === 'production'
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : '123456';
    this.store.set(phone, { code, expiresAt: Date.now() + 5 * 60_000 });
    this.logger.log(`OTP for ${phone} is ${code} (mock provider)`);
    // TODO: dispatch via MSG91 / Twilio when OTP_PROVIDER != 'mock'
  }

  async verify(phone: string, code: string): Promise<boolean> {
    const entry = this.store.get(phone);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(phone);
      return false;
    }
    if (entry.code !== code) return false;
    this.store.delete(phone);
    return true;
  }
}
