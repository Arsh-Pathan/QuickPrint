import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { StorageService } from './storage.service';

export interface PageAnalysis {
  pages: number;
  colorPages: number;
}

@Injectable()
export class PageAnalyzerService {
  private readonly logger = new Logger(PageAnalyzerService.name);

  constructor(private readonly storage: StorageService) {}

  async analyze(fileKey: string, mimeType: string): Promise<PageAnalysis> {
    if (mimeType === 'application/pdf') {
      try {
        const buf = await this.storage.readLocal(fileKey);
        if (buf.length < 5 || buf.subarray(0, 5).toString() !== '%PDF-') {
          this.logger.warn(`page-analyzer: ${fileKey} missing PDF magic bytes, defaulting to 1 page`);
          return { pages: 1, colorPages: 0 };
        }
        const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
        return { pages: pdfDoc.getPageCount(), colorPages: 0 };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`page-analyzer: pdf-lib parse failed for ${fileKey}: ${msg}`);
        return { pages: 1, colorPages: 0 };
      }
    }
    if (
      mimeType === 'image/png' ||
      mimeType === 'image/jpeg' ||
      mimeType === 'image/webp'
    ) {
      return { pages: 1, colorPages: 1 };
    }
    // DOCX/others: Default to 1 for now.
    return { pages: 1, colorPages: 0 };
  }
}
