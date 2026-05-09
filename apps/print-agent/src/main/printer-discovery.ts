import log from 'electron-log';
import { config } from './config';

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
      const printers: DiscoveredPrinter[] = raw.map((p, i) => ({
        id: p.deviceId ?? `printer_${i}`,
        name: p.name,
        isDefault: false,
        supportsColor: true,
        supportsDuplex: true,
      }));

      if (config.dummyPrinter) {
        printers.unshift({
          id: 'dummy-printer',
          name: 'Simulated Cloud Printer',
          isDefault: true,
          supportsColor: true,
          supportsDuplex: true,
        });
      }

      return printers;
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
