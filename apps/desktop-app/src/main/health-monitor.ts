import log from 'electron-log';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { DiscoveredPrinter } from './printer-discovery';
import type { PrinterStatus } from '@quickprint/shared';

const exec = promisify(execFile);

export interface PrinterHealthSnapshot {
  printerId: string;
  status: PrinterStatus;
  paperLevel?: number;
  tonerLevel?: number;
  message?: string;
}

interface MonitorOpts {
  printers: DiscoveredPrinter[];
  intervalMs: number;
  onChange: (snapshot: PrinterHealthSnapshot) => void;
}

/**
 * Polls each printer every intervalMs and emits onChange whenever the
 * status differs from the last reported value. Uses Windows
 * `Get-PrinterStatus` PowerShell cmdlet to read state codes.
 *
 * State codes (subset) → PrinterStatus:
 *   Normal/Idle       → online
 *   Printing/Paused   → busy
 *   PaperOut          → paper_out
 *   PaperJam          → jam
 *   TonerLow          → toner_low
 *   Offline/NotFound  → offline
 *   *                 → error
 */
export class HealthMonitor {
  private timer: NodeJS.Timeout | null = null;
  private last = new Map<string, PrinterStatus>();

  constructor(private opts: MonitorOpts) {}

  start() {
    this.tick();
    this.timer = setInterval(() => this.tick(), this.opts.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick() {
    for (const printer of this.opts.printers) {
      try {
        const snapshot = await this.read(printer);
        if (this.last.get(printer.id) !== snapshot.status) {
          this.last.set(printer.id, snapshot.status);
          this.opts.onChange(snapshot);
        }
      } catch (err) {
        log.warn(`health-monitor: ${printer.name} failed`, err);
      }
    }
  }

  private async read(printer: DiscoveredPrinter): Promise<PrinterHealthSnapshot> {
    // Dummy/mock printers aren't real Windows devices — always report online
    if (printer.id.startsWith('dummy-') || printer.id.startsWith('mock-')) {
      return { printerId: printer.id, status: 'online' };
    }
    if (process.platform !== 'win32') {
      return { printerId: printer.id, status: 'online' };
    }
    const { stdout } = await exec('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Get-Printer -Name "${printer.name.replace(/"/g, '')}" | Select-Object -ExpandProperty PrinterStatus`,
    ]);
    return { printerId: printer.id, status: mapStatus(stdout.trim()) };
  }
}

function mapStatus(raw: string): PrinterStatus {
  const v = raw.toLowerCase();
  if (v.includes('paperout') || v.includes('paper_out')) return 'paper_out';
  if (v.includes('paperjam') || v.includes('jam')) return 'jam';
  if (v.includes('tonerlow') || v.includes('toner_low')) return 'toner_low';
  if (v.includes('offline') || v.includes('notavailable')) return 'offline';
  if (v.includes('printing')) return 'busy';
  if (v.includes('normal') || v === '0' || v === 'idle') return 'online';
  if (v === '') return 'online';
  return 'error';
}
