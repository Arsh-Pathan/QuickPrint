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
export declare function calculatePrice(pages: number, _colorPages: number, settings: PrintSettings, config: PricingConfig): PriceBreakdown;
