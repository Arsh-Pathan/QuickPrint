import { Injectable } from '@nestjs/common';

export interface PageAnalysis {
  pages: number;
  colorPages: number;
}

/**
 * Detects page count and which pages contain color ink. Real implementation
 * will use pdf.js / pdf-lib for PDFs and ghostscript ink-coverage for color
 * detection. DOCX is converted to PDF via libreoffice headless first.
 */
@Injectable()
export class PageAnalyzerService {
  async analyze(_fileKey: string, _mimeType: string): Promise<PageAnalysis> {
    // TODO: download from storage, run pdf-lib + ghostscript color sniff
    return { pages: 1, colorPages: 0 };
  }
}
