import { Injectable } from '@nestjs/common';
import { StorageService } from './storage.service';
import { PageAnalyzerService } from './page-analyzer.service';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

@Injectable()
export class FilesService {
  constructor(
    private readonly storage: StorageService,
    private readonly analyzer: PageAnalyzerService,
  ) {}

  isAllowed(mimeType: string) {
    return ALLOWED_MIME.has(mimeType);
  }

  requestUpload(fileName: string, mimeType: string) {
    if (!this.isAllowed(mimeType)) {
      throw new Error(`unsupported_mime_type:${mimeType}`);
    }
    return this.storage.createSignedUploadUrl({ fileName, mimeType });
  }

  analyze(fileKey: string, mimeType: string) {
    return this.analyzer.analyze(fileKey, mimeType);
  }

  download(fileKey: string) {
    return this.storage.createSignedDownloadUrl(fileKey);
  }
}
