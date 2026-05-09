import type { PrintSettings } from './print-job';

export interface PricingConfig {
  bwPaise: number;
  colorPaise: number;
  duplexDiscountPct: number;
}

export interface PriceBreakdown {
  pages: number;
  colorPages: number;
  bwPages: number;
  copies: number;
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
}

/**
 * Calculate price for a print job. 
 * Session-based model: the entire job is either Color or B&W.
 */
export function calculatePrice(
  pages: number,
  _colorPages: number,
  settings: PrintSettings,
  config: PricingConfig,
): PriceBreakdown {
  const isColor = settings.color === true;
  const effectiveColorPages = isColor ? pages : 0;
  const effectiveBwPages = isColor ? 0 : pages;

  const perCopy =
    effectiveBwPages * config.bwPaise + effectiveColorPages * config.colorPaise;

  const subtotalPaise = perCopy * settings.copies;
  const discountPaise = settings.duplex
    ? Math.round((subtotalPaise * config.duplexDiscountPct) / 100)
    : 0;

  return {
    pages,
    colorPages: effectiveColorPages,
    bwPages: effectiveBwPages,
    copies: settings.copies,
    subtotalPaise,
    discountPaise,
    totalPaise: subtotalPaise - discountPaise,
  };
}
