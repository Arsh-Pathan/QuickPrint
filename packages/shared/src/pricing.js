"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePrice = calculatePrice;
/**
 * Calculate price for a print job. Pure function — same inputs, same output.
 * Cost lives client and server side; both use this so quotes match.
 */
function calculatePrice(pages, colorPages, settings, config) {
    const bwPages = Math.max(0, pages - colorPages);
    const effectiveColorPages = settings.color ? colorPages : 0;
    const effectiveBwPages = settings.color ? bwPages : pages;
    const perCopy = effectiveBwPages * config.bwPaise + effectiveColorPages * config.colorPaise;
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
//# sourceMappingURL=pricing.js.map