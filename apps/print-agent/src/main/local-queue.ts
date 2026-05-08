import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import log from 'electron-log';

export interface AgentJob {
  id: string;
  fileUrl: string;
  fileName: string;
  printerId: string;
  copies: number;
  duplex: boolean;
  color: boolean;
  paperSize: string;
  pageRange?: string;
  attempts: number;
  enqueuedAt: number;
}

/**
 * Durable, file-backed job queue. Used so a PC reboot, crash, or network
 * blip never loses a paid print job. SQLite chosen for atomic writes +
 * single-file portability + zero ops.
 */
export class LocalQueue {
  private db: Database.Database;

  constructor(dir: string) {
    fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(path.join(dir, 'queue.sqlite'));
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id          TEXT PRIMARY KEY,
        payload     TEXT NOT NULL,
        attempts    INTEGER NOT NULL DEFAULT 0,
        next_run_at INTEGER NOT NULL,
        claimed_at  INTEGER,
        enqueued_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_next_run ON jobs(next_run_at);
    `);
    log.info(`local-queue: ready at ${dir}`);
  }

  enqueue(job: Omit<AgentJob, 'attempts' | 'enqueuedAt'>) {
    const now = Date.now();
    const payload = JSON.stringify({ ...job, attempts: 0, enqueuedAt: now });
    this.db
      .prepare(
        'INSERT OR REPLACE INTO jobs (id, payload, attempts, next_run_at, enqueued_at) VALUES (?, ?, 0, ?, ?)',
      )
      .run(job.id, payload, now, now);
  }

  /** Atomically grab the next runnable job. */
  claimNext(): AgentJob | null {
    const now = Date.now();
    return this.db.transaction((): AgentJob | null => {
      const row = this.db
        .prepare(
          'SELECT id, payload, attempts FROM jobs WHERE claimed_at IS NULL AND next_run_at <= ? ORDER BY enqueued_at ASC LIMIT 1',
        )
        .get(now) as { id: string; payload: string; attempts: number } | undefined;
      if (!row) return null;
      this.db.prepare('UPDATE jobs SET claimed_at = ? WHERE id = ?').run(now, row.id);
      const job = JSON.parse(row.payload) as AgentJob;
      job.attempts = row.attempts;
      return job;
    })();
  }

  complete(jobId: string) {
    this.db.prepare('DELETE FROM jobs WHERE id = ?').run(jobId);
  }

  /** Schedule a retry with exponential backoff. */
  retry(jobId: string) {
    const row = this.db
      .prepare('SELECT attempts FROM jobs WHERE id = ?')
      .get(jobId) as { attempts: number } | undefined;
    if (!row) return;
    const attempts = row.attempts + 1;
    const backoffMs = Math.min(60_000 * 2 ** attempts, 30 * 60_000); // cap 30 min
    this.db
      .prepare(
        'UPDATE jobs SET attempts = ?, claimed_at = NULL, next_run_at = ? WHERE id = ?',
      )
      .run(attempts, Date.now() + backoffMs, jobId);
  }

  releaseAllClaims() {
    this.db.prepare('UPDATE jobs SET claimed_at = NULL WHERE claimed_at IS NOT NULL').run();
  }

  size(): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM jobs').get() as { n: number }).n;
  }
}
