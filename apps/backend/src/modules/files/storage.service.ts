import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';

export interface SignedUploadUrl {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

/**
 * Storage abstraction. Driver chosen by STORAGE_DRIVER env:
 *   - local    → dev: writes to LOCAL_STORAGE_DIR, signs with HMAC token
 *   - s3       → AWS S3 with presigned PUT (TODO)
 *   - supabase → Supabase Storage signed upload URL (TODO)
 *
 * All drivers expose the same SignedUploadUrl shape so the client never
 * has to branch on driver.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: string;
  private readonly localDir: string;
  private readonly hmacKey: string;
  private readonly publicBase: string;

  constructor(private readonly config: ConfigService) {
    this.driver = config.get<string>('STORAGE_DRIVER') ?? 'local';
    this.localDir = config.get<string>('LOCAL_STORAGE_DIR') ?? path.resolve('./storage');
    this.hmacKey =
      config.get<string>('STORAGE_HMAC_KEY') ??
      config.get<string>('JWT_SECRET') ??
      'dev-storage-key';
    this.publicBase = config.get<string>('PUBLIC_BASE_URL') ?? 'http://localhost:4000';
    if (this.driver === 'local' && !existsSync(this.localDir)) {
      mkdirSync(this.localDir, { recursive: true });
    }
  }

  async createSignedUploadUrl(opts: {
    mimeType: string;
    fileName: string;
  }): Promise<SignedUploadUrl> {
    const safeName = opts.fileName.replace(/[^\w.\-]/g, '_');
    const fileKey = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
    const expiresAt = Date.now() + 10 * 60_000;
    const token = this.sign(fileKey, 'put', expiresAt);

    if (this.driver !== 'local') {
      this.logger.warn(`storage driver=${this.driver}: not yet implemented, falling back to local`);
    }

    return {
      uploadUrl: `${this.publicBase}/api/files/local-upload?key=${encodeURIComponent(fileKey)}&exp=${expiresAt}&sig=${token}`,
      fileKey,
      expiresIn: 600,
    };
  }

  async createSignedDownloadUrl(fileKey: string): Promise<string> {
    const expiresAt = Date.now() + 30 * 60_000;
    const token = this.sign(fileKey, 'get', expiresAt);
    return `${this.publicBase}/api/files/local-download?key=${encodeURIComponent(fileKey)}&exp=${expiresAt}&sig=${token}`;
  }

  // ── local-disk driver internals ─────────────────────────────────────────────
  verifyToken(fileKey: string, op: 'put' | 'get', expiresAt: number, token: string): boolean {
    if (Date.now() > expiresAt) return false;
    const expected = this.sign(fileKey, op, expiresAt);
    if (expected.length !== token.length) return false;
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(token, 'hex'));
  }

  resolveLocalPath(fileKey: string): string {
    const abs = path.resolve(this.localDir, fileKey);
    if (!abs.startsWith(path.resolve(this.localDir))) {
      throw new Error('path_traversal_blocked');
    }
    return abs;
  }

  async writeLocal(fileKey: string, data: Buffer): Promise<void> {
    const abs = this.resolveLocalPath(fileKey);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, data);
  }

  async readLocal(fileKey: string): Promise<Buffer> {
    return fs.readFile(this.resolveLocalPath(fileKey));
  }

  async statLocal(fileKey: string) {
    return fs.stat(this.resolveLocalPath(fileKey)).catch(() => null);
  }

  private sign(fileKey: string, op: 'put' | 'get', expiresAt: number): string {
    return createHmac('sha256', this.hmacKey)
      .update(`${op}|${fileKey}|${expiresAt}`)
      .digest('hex');
  }
}
