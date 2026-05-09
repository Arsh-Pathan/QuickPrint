import { Injectable } from '@nestjs/common';
import { calculatePrice, type PrintSettings } from '@quickprint/shared';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class PricingService {
  constructor(private readonly settings: SettingsService) {}

  async quote(pages: number, colorPages: number, settings: PrintSettings) {
    const s = await this.settings.get();
    return calculatePrice(pages, colorPages, settings, {
      bwPaise: s.bwPaise,
      colorPaise: s.colorPaise,
      duplexDiscountPct: s.duplexDiscountPct,
    });
  }
}
