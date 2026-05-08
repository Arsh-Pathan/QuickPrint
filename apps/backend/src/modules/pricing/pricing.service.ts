import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { calculatePrice, type PrintSettings, type PricingConfig } from '@quickprint/shared';

@Injectable()
export class PricingService {
  private readonly config: PricingConfig;

  constructor(cfg: ConfigService) {
    this.config = {
      bwPaise: Number(cfg.get('PRICE_BW_PAISE') ?? 200),
      colorPaise: Number(cfg.get('PRICE_COLOR_PAISE') ?? 1000),
      duplexDiscountPct: Number(cfg.get('PRICE_DUPLEX_DISCOUNT_PCT') ?? 10),
    };
  }

  quote(pages: number, colorPages: number, settings: PrintSettings) {
    return calculatePrice(pages, colorPages, settings, this.config);
  }
}
