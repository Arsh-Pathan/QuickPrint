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
 * Calculate price for a print job. Pure function — same inputs, same output.
 * Cost lives client and server side; both use this so quotes match.
 */
export function calculatePrice(
  pages: number,
  colorPages: number,
  settings: PrintSettings,
  config: PricingConfig,
): PriceBreakdown {
  const bwPages = Math.max(0, pages - colorPages);
  const effectiveColorPages = settings.color ? colorPages : 0;
  const effectiveBwPages = settings.color ? bwPages : pages;

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
