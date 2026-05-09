import { describe, it, expect } from 'vitest';
import { calculatePrice, type PricingConfig } from './pricing';
import type { PrintSettings } from './print-job';

const TEST_CONFIG: PricingConfig = {
  bwPaise: 200,      // 2 INR
  colorPaise: 1000,   // 10 INR
  duplexDiscountPct: 10,
};

describe('Pricing Engine (Session-Based)', () => {
  it('should calculate B&W session correctly (2 INR/page)', () => {
    const settings: PrintSettings = {
      color: false,
      duplex: false,
      copies: 1,
      paperSize: 'A4',
    };
    
    const result = calculatePrice(10, 0, settings, TEST_CONFIG);
    
    expect(result.totalPaise).toBe(2000); // 10 pages * 200 paise
    expect(result.bwPages).toBe(10);
    expect(result.colorPages).toBe(0);
  });

  it('should calculate Color session correctly (10 INR/page)', () => {
    const settings: PrintSettings = {
      color: true,
      duplex: false,
      copies: 1,
      paperSize: 'A4',
    };
    
    const result = calculatePrice(10, 0, settings, TEST_CONFIG);
    
    expect(result.totalPaise).toBe(10000); // 10 pages * 1000 paise
    expect(result.colorPages).toBe(10);
    expect(result.bwPages).toBe(0);
  });

  it('should apply duplex discount correctly', () => {
    const settings: PrintSettings = {
      color: false,
      duplex: true,
      copies: 1,
      paperSize: 'A4',
    };
    
    const result = calculatePrice(10, 0, settings, TEST_CONFIG);
    
    // 10 pages * 200 = 2000. 10% discount = 200. Total = 1800.
    expect(result.totalPaise).toBe(1800);
    expect(result.discountPaise).toBe(200);
  });

  it('should handle multiple copies', () => {
    const settings: PrintSettings = {
      color: false,
      duplex: false,
      copies: 3,
      paperSize: 'A4',
    };
    
    const result = calculatePrice(5, 0, settings, TEST_CONFIG);
    
    // 5 pages * 200 = 1000 per copy. 3 copies = 3000.
    expect(result.totalPaise).toBe(3000);
  });
});
