"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePrice = calculatePrice;
/**
 * Calculate price for a print job.
 * Session-based model: the entire job is either Color or B&W.
 */
function calculatePrice(pages, _colorPages, settings, config) {
    const isColor = settings.color === true;
    const effectiveColorPages = isColor ? pages : 0;
    const effectiveBwPages = isColor ? 0 : pages;
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