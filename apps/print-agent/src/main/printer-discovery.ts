import log from 'electron-log';

export interface DiscoveredPrinter {
  id: string;
  name: string;
  isDefault: boolean;
  supportsColor: boolean;
  supportsDuplex: boolean;
  driver?: string;
}

/**
 * Enumerates printers using `pdf-to-printer.getPrinters()` on Windows
 * (which shells out to `wmic printer` / PowerShell). We deliberately
 * lazy-import so the module isn't required during typecheck on non-Win.
 */
export class PrinterDiscovery {
  async list(): Promise<DiscoveredPrinter[]> {
    try {
      const mod = await import('pdf-to-printer');
      const raw = await mod.getPrinters();
      return raw.map((p, i) => ({
        id: p.deviceId ?? `printer_${i}`,
        name: p.name,
        isDefault: false, // pdf-to-printer doesn't expose this directly; fill via separate call
        supportsColor: /color/i.test(p.name) || true, // heuristic; refine via WMI
        supportsDuplex: true,
        driver: undefined,
      }));
    } catch (err) {
      log.warn('printer-discovery: falling back to mock list', err);
      return [
        {
          id: 'mock-printer',
          name: 'Mock Printer (dev)',
          isDefault: true,
          supportsColor: true,
          supportsDuplex: true,
        },
      ];
    }
  }
}
