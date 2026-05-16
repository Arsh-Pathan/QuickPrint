import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface SignedUploadUrl {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

/**
 * Storage abstraction. Driver chosen by STORAGE_DRIVER env:
 *   - local    → dev: writes to LOCAL_STORAGE_DIR, signs with HMAC token
 *   - s3       → AWS S3 with presigned PUT
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: 'local' | 's3';
  private readonly localDir: string;
  private readonly hmacKey: string;
  private readonly publicBase: string;

  private readonly s3Client?: S3Client;
  private readonly s3Bucket?: string;

  constructor(private readonly config: ConfigService) {
    this.driver = (config.get<string>('STORAGE_DRIVER') as 'local' | 's3') ?? 'local';
    this.localDir = config.get<string>('LOCAL_STORAGE_DIR') ?? path.resolve('./storage');
    this.hmacKey =
      config.get<string>('STORAGE_HMAC_KEY') ??
      config.get<string>('JWT_SECRET') ??
      'dev-storage-key';
    this.publicBase = config.get<string>('PUBLIC_BASE_URL') ?? 'http://localhost:4000';

    if (this.driver === 's3') {
      this.s3Bucket = config.getOrThrow<string>('S3_BUCKET');
      this.s3Client = new S3Client({
        region: config.get<string>('S3_REGION') ?? 'ap-south-1',
        credentials: {
          accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
          secretAccessKey: config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
        },
        endpoint: config.get<string>('S3_ENDPOINT'),
        forcePathStyle: !!config.get<string>('S3_FORCE_PATH_STYLE'),
      });
    } else if (this.driver === 'local' && !existsSync(this.localDir)) {
      mkdirSync(this.localDir, { recursive: true });
    }
  }

  async createSignedUploadUrl(opts: {
    mimeType: string;
    fileName: string;
  }): Promise<SignedUploadUrl> {
    const safeName = opts.fileName.replace(/[^\w.\-]/g, '_');
    const fileKey = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
    const expiresIn = 600;

    if (this.driver === 's3' && this.s3Client && this.s3Bucket) {
      const command = new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: fileKey,
        ContentType: opts.mimeType,
      });
      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return { uploadUrl, fileKey, expiresIn };
    }

    const expiresAt = Date.now() + expiresIn * 1000;
    const token = this.sign(fileKey, 'put', expiresAt);
    return {
      uploadUrl: `/api/files/local-upload?key=${encodeURIComponent(fileKey)}&exp=${expiresAt}&sig=${token}`,
      fileKey,
      expiresIn,
    };
  }

  async createSignedDownloadUrl(fileKey: string): Promise<string> {
    const expiresIn = 1800;

    if (this.driver === 's3' && this.s3Client && this.s3Bucket) {
      const command = new GetObjectCommand({
        Bucket: this.s3Bucket,
        Key: fileKey,
      });
      return getSignedUrl(this.s3Client, command, { expiresIn });
    }

    const expiresAt = Date.now() + expiresIn * 1000;
    const token = this.sign(fileKey, 'get', expiresAt);
    return `/api/files/local-download?key=${encodeURIComponent(fileKey)}&exp=${expiresAt}&sig=${token}`;
  }

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
    if (this.driver === 's3' && this.s3Client && this.s3Bucket) {
      const command = new GetObjectCommand({ Bucket: this.s3Bucket, Key: fileKey });
      const res = await this.s3Client.send(command);
      const bytes = await res.Body?.transformToByteArray();
      if (!bytes) throw new Error('s3_read_failed');
      return Buffer.from(bytes);
    }
    return fs.readFile(this.resolveLocalPath(fileKey));
  }

  async statLocal(fileKey: string) {
    if (this.driver === 's3') return { size: 0 };
    return fs.stat(this.resolveLocalPath(fileKey)).catch(() => null);
  }
  
  async delete(fileKey: string): Promise<void> {
    if (this.driver === 's3' && this.s3Client && this.s3Bucket) {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.s3Bucket,
        Key: fileKey,
      }));
      return;
    }
    const abs = this.resolveLocalPath(fileKey);
    await fs.unlink(abs).catch((e) => {
      this.logger.warn(`Failed to delete local file ${fileKey}: ${e.message}`);
    });
  }

  private sign(fileKey: string, op: 'put' | 'get', expiresAt: number): string {
    return createHmac('sha256', this.hmacKey)
      .update(`${op}|${fileKey}|${expiresAt}`)
      .digest('hex');
  }
}
