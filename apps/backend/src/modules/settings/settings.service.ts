import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface ShopSettings {
  shopName: string;
  bwPaise: number;
  colorPaise: number;
  duplexDiscountPct: number;
  defaultPaperSize: 'A4' | 'A3' | 'LETTER' | 'LEGAL';
  acceptingJobs: boolean;
  publicUrl?: string;       // e.g. https://print.maddy.com
  cloudflareToken?: string; // Tunnel token for persistent access
}

const SETTINGS_KEY = 'shop';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private cache: ShopSettings | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private envDefaults(): ShopSettings {
    return {
      shopName: this.config.get<string>('SHOP_NAME') ?? "Maddy's Print Shop",
      bwPaise: Number(this.config.get('PRICE_BW_PAISE') ?? 200),
      colorPaise: Number(this.config.get('PRICE_COLOR_PAISE') ?? 1000),
      duplexDiscountPct: Number(this.config.get('PRICE_DUPLEX_DISCOUNT_PCT') ?? 10),
      defaultPaperSize: 'A4',
      acceptingJobs: true,
    };
  }

  async get(): Promise<ShopSettings> {
    if (this.cache) return this.cache;
    const row = await this.prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    const defaults = this.envDefaults();
    
    let stored: Partial<ShopSettings> = {};
    if (row?.value) {
      try {
        // Handle both Postgres (returns Object) and SQLite (returns String)
        stored = typeof row.value === 'string' 
          ? JSON.parse(row.value) 
          : row.value;
      } catch (e: any) {
        this.logger.error(`Failed to parse settings JSON: ${e.message}`);
      }
    }

    this.cache = { ...defaults, ...stored };
    return this.cache;
  }

  async update(patch: Partial<ShopSettings>): Promise<ShopSettings> {
    const current = await this.get();
    const next: ShopSettings = { ...current, ...patch };
    
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
    this.cache = next;
    return next;
  }

  invalidate() {
    this.cache = null;
  }
}
