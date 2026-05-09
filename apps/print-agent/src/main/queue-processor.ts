import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import axios from 'axios';
import log from 'electron-log';
import type { AgentJob, LocalQueue } from './local-queue';
import type { DiscoveredPrinter } from './printer-discovery';
import type { BackendSocket } from './backend-socket';
import { config } from './config';

const MAX_ATTEMPTS = 5;

interface ProcessorOpts {
  queue: LocalQueue;
  printers: DiscoveredPrinter[];
  socket: BackendSocket;
  onError?: (err: unknown) => void;
}

/**
 * Drains the local SQLite queue. One job at a time per printer to keep
 * spooler errors from cascading. Pauses the entire run loop on hard
 * printer errors (paper-out, jam) and resumes when monitor reports recovery.
 */
export class QueueProcessor {
  private running = false;
  private paused = false;
  private wakeup: (() => void) | null = null;

  constructor(private opts: ProcessorOpts) {}

  async start() {
    this.opts.queue.releaseAllClaims(); // recover from crash mid-job
    this.running = true;
    void this.loop();
  }

  async stop() {
    this.running = false;
    this.kick();
  }

  /** Pokes the loop awake (e.g. when a new job arrives). */
  kick() {
    this.wakeup?.();
  }

  pause(reason: string) {
    log.warn(`processor: paused (${reason})`);
    this.paused = true;
  }

  resume() {
    if (!this.paused) return;
    log.info('processor: resumed');
    this.paused = false;
    this.kick();
  }

  private async loop() {
    while (this.running) {
      if (this.paused) {
        await this.sleep(5_000);
        continue;
      }
      const job = this.opts.queue.claimNext();
      if (!job) {
        await this.waitForKick(15_000);
        continue;
      }
      await this.runJob(job);
    }
  }

  private async runJob(job: AgentJob) {
    log.info(`processor: running job ${job.id}`);
    try {
      const filePath = await this.download(job);
      await this.print(filePath, job);
      this.opts.queue.complete(job.id);
      this.opts.socket.emitJobResult({ jobId: job.id, status: 'completed' });
      fs.unlink(filePath, () => undefined);
      log.info(`processor: job ${job.id} done`);
    } catch (err) {
      const next = job.attempts + 1;
      if (next >= MAX_ATTEMPTS) {
        this.opts.queue.complete(job.id);
        this.opts.socket.emitJobResult({
          jobId: job.id,
          status: 'failed',
          error: String(err),
        });
        log.error(`processor: job ${job.id} failed permanently`, err);
      } else {
        this.opts.queue.retry(job.id);
        log.warn(`processor: job ${job.id} retry ${next}/${MAX_ATTEMPTS}`, err);
      }
      this.opts.onError?.(err);
    }
  }

  private async download(job: AgentJob): Promise<string> {
    const tmp = path.join(os.tmpdir(), `qp_${randomUUID()}_${job.fileName}`);
    const url = job.fileUrl.startsWith('/') ? `${config.backendUrl}${job.fileUrl}` : job.fileUrl;
    const res = await axios.get(url, { responseType: 'stream' });
    await new Promise<void>((resolve, reject) => {
      const out = fs.createWriteStream(tmp);
      res.data.pipe(out);
      out.on('finish', resolve);
      out.on('error', reject);
    });
    return tmp;
  }

  private async print(filePath: string, job: AgentJob) {
    const printer = this.opts.printers.find((p) => p.id === job.printerId)
      ?? this.opts.printers.find((p) => p.isDefault)
      ?? this.opts.printers[0];
    if (!printer) throw new Error('no_printer_available');

    if (config.dummyPrinter) {
      log.info(`processor: [DUMMY MODE] simulating print for ${job.id} on ${printer.name}`);
      await this.sleep(5_000); // Simulate 5s of printing
      return;
    }

    const mod = await import('pdf-to-printer');
    await mod.print(filePath, {
      printer: printer.name,
      copies: job.copies,
      monochrome: !job.color,
      ...(job.duplex ? { side: 'duplex' } : {}),
      ...(job.pageRange ? { pages: job.pageRange } : {}),
    });
  }

  private waitForKick(timeoutMs: number) {
    return new Promise<void>((resolve) => {
      const t = setTimeout(resolve, timeoutMs);
      this.wakeup = () => {
        clearTimeout(t);
        this.wakeup = null;
        resolve();
      };
    });
  }

  private sleep(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
  }
}
