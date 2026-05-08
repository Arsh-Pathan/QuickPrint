import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

export interface SignedUploadUrl {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

/**
 * Storage abstraction. Driver chosen by STORAGE_DRIVER env:
 *   - local    → dev only, signs an HTTP PUT against this backend
 *   - s3       → AWS S3 with presigned PUT
 *   - supabase → Supabase Storage with signed upload URL
 *
 * All drivers expose the same SignedUploadUrl shape so the client never
 * has to branch on driver.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: string;

  constructor(private readonly config: ConfigService) {
    this.driver = config.get<string>('STORAGE_DRIVER') ?? 'local';
  }

  async createSignedUploadUrl(opts: {
    mimeType: string;
    fileName: string;
  }): Promise<SignedUploadUrl> {
    const fileKey = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${opts.fileName}`;
    // TODO: implement S3 / Supabase signing. For now return a local placeholder.
    this.logger.warn(`storage driver=${this.driver}: returning mock signed URL`);
    return {
      uploadUrl: `/api/files/local-upload?key=${encodeURIComponent(fileKey)}`,
      fileKey,
      expiresIn: 600,
    };
  }

  async createSignedDownloadUrl(fileKey: string): Promise<string> {
    // TODO: real signing per driver
    return `/api/files/local-download?key=${encodeURIComponent(fileKey)}`;
  }
}
