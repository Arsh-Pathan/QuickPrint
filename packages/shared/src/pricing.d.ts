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
export declare function calculatePrice(pages: number, colorPages: number, settings: PrintSettings, config: PricingConfig): PriceBreakdown;
