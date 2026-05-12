import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

export interface ShopSecrets {
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  jwtSecret?: string;
  agentTokenSecret?: string;
  adminPassword?: string;
}

export type SecretKey = keyof ShopSecrets;

export interface ShopSettings {
  shopName: string;
  bwPaise: number;
  colorPaise: number;
  duplexDiscountPct: number;
  defaultPaperSize: 'A4' | 'A3' | 'LETTER' | 'LEGAL';
  acceptingJobs: boolean;
  publicUrl?: string;
  cloudflareToken?: string;
  secrets?: ShopSecrets;
}

const SETTINGS_KEY = 'shop';
const CACHE_TTL_MS = 300_000;

const LEGACY_WEBHOOK_PLACEHOLDER = 'standalone_placeholder_webhook';

const ENV_KEY_BY_SECRET: Record<SecretKey, string> = {
  razorpayKeyId: 'RAZORPAY_KEY_ID',
  razorpayKeySecret: 'RAZORPAY_KEY_SECRET',
  razorpayWebhookSecret: 'RAZORPAY_WEBHOOK_SECRET',
  jwtSecret: 'JWT_SECRET',
  agentTokenSecret: 'AGENT_TOKEN_SECRET',
  adminPassword: 'ADMIN_PASSWORD',
};

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private cache: { data: ShopSettings; at: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditLogService,
  ) {}

  private envDefaults(): ShopSettings {
    const envSecrets: ShopSecrets = {};
    for (const [secretKey, envKey] of Object.entries(ENV_KEY_BY_SECRET) as [SecretKey, string][]) {
      const v = this.config.get<string>(envKey);
      if (v && v !== LEGACY_WEBHOOK_PLACEHOLDER) envSecrets[secretKey] = v;
    }
    return {
      shopName: this.config.get<string>('SHOP_NAME') ?? "Maddy's Print Shop",
      bwPaise: Number(this.config.get('PRICE_BW_PAISE') ?? 200),
      colorPaise: Number(this.config.get('PRICE_COLOR_PAISE') ?? 1000),
      duplexDiscountPct: Number(this.config.get('PRICE_DUPLEX_DISCOUNT_PCT') ?? 10),
      defaultPaperSize: 'A4',
      acceptingJobs: true,
      secrets: envSecrets,
    };
  }

  async get(): Promise<ShopSettings> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) return this.cache.data;
    const row = await this.prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    const defaults = this.envDefaults();

    let stored: Partial<ShopSettings> = {};
    if (row?.value) {
      try {
        stored = typeof row.value === 'string'
          ? JSON.parse(row.value)
          : (row.value as Partial<ShopSettings>);
      } catch (e: any) {
        this.logger.error(`Failed to parse settings JSON: ${e.message}`);
      }
    }

    const mergedSecrets: ShopSecrets = { ...(defaults.secrets ?? {}), ...(stored.secrets ?? {}) };
    const data: ShopSettings = { ...defaults, ...stored, secrets: mergedSecrets };
    this.cache = { data, at: Date.now() };
    return data;
  }

  /** Resolves a single secret with DB > env precedence. Returns empty string if neither set. */
  async getSecret(key: SecretKey): Promise<string> {
    const s = await this.get();
    return s.secrets?.[key] ?? '';
  }

  async update(patch: Partial<ShopSettings>): Promise<ShopSettings> {
    this.invalidate();
    const current = await this.get();

    // Secrets merge separately so a partial secrets update doesn't blow away other keys.
    const nextSecrets: ShopSecrets = { ...(current.secrets ?? {}) };
    if (patch.secrets) {
      for (const [k, v] of Object.entries(patch.secrets) as [SecretKey, string | undefined][]) {
        // Empty string = "leave unchanged" so the admin form can resubmit without wiping.
        if (typeof v === 'string' && v.length > 0) nextSecrets[k] = v;
      }
    }

    const { secrets: _ignored, ...patchRest } = patch;
    const next: ShopSettings = { ...current, ...patchRest, secrets: nextSecrets };

    // Auto-fix double https:// typos
    if (next.publicUrl) {
      next.publicUrl = next.publicUrl.replace(/^https?:\/\/https?:\/\//, 'https://');
    }

    if (next.bwPaise < 0 || next.colorPaise < 0) throw new Error('invalid_price');
    if (next.duplexDiscountPct < 0 || next.duplexDiscountPct > 100) throw new Error('invalid_discount');

    await this.prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: JSON.stringify(next) },
      create: { key: SETTINGS_KEY, value: JSON.stringify(next) },
    });
    this.audit.record({
      action: 'settings.update',
      entityType: 'Setting',
      entityId: SETTINGS_KEY,
      before: redactForAudit(current),
      after: redactForAudit(next),
    });
    this.invalidate();
    return next;
  }

  /** Returns settings with secret values replaced by masked tails (or empty). For admin display. */
  async getMasked(): Promise<ShopSettings> {
    const s = await this.get();
    const masked: ShopSecrets = {};
    for (const [k, v] of Object.entries(s.secrets ?? {}) as [SecretKey, string | undefined][]) {
      masked[k] = maskSecret(v);
    }
    return { ...s, secrets: masked };
  }

  invalidate() {
    this.cache = null;
  }
}

function maskSecret(v: string | undefined): string {
  if (!v) return '';
  if (v.length <= 4) return '••••';
  return '••••••••' + v.slice(-4);
}

function redactForAudit(s: ShopSettings): ShopSettings {
  const redacted: ShopSecrets = {};
  for (const k of Object.keys(s.secrets ?? {}) as SecretKey[]) {
    if (s.secrets?.[k]) redacted[k] = '***';
  }
  return { ...s, secrets: redacted };
}
