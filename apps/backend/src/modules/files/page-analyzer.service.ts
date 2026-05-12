import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import {
  PDFArray,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFStream,
  type PDFPageLeaf,
  decodePDFRawStream,
} from 'pdf-lib/cjs/core';
import { StorageService } from './storage.service';

export interface PageAnalysis {
  pages: number;
  colorPages: number;
  fileHash: string;
}

/**
 * Service to analyze documents for page count, best-effort color-page
 * metadata, and integrity hashes. Pricing still follows the user's selected
 * print mode; colorPages is retained for analytics and downstream use.
 *
 * Page-count strategy (two-tier fallback):
 *  1. pdf-lib (primary) — also detects color pages
 *  2. pdf-parse         — fallback for PDFs pdf-lib cannot parse
 *  If both fail, defaults are returned (pages: 1, colorPages: 0) and a
 *  warning is logged. The print-job pipeline MUST NEVER be blocked by
 *  a page-analysis failure.
 */
@Injectable()
export class PageAnalyzerService {
  private readonly logger = new Logger(PageAnalyzerService.name);

  constructor(private readonly storage: StorageService) {}

  async analyze(fileKey: string, mimeType: string): Promise<PageAnalysis> {
    const buf = await this.storage.readLocal(fileKey);
    const fileHash = createHash('sha256').update(buf).digest('hex');

    if (mimeType === 'application/pdf') {
      if (buf.length < 5 || buf.subarray(0, 5).toString() !== '%PDF-') {
        this.logger.warn(
          `page-analyzer: ${fileKey} missing PDF magic bytes, defaulting to 1 page`,
        );
        return { pages: 1, colorPages: 0, fileHash };
      }

      try {
        return await this.analyzeWithPdfLib(buf, fileHash);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `[PageAnalyzerService] pdf-lib parse failed for ${fileKey}, falling back to pdf-parse: ${msg}`,
        );
        return this.analyzeWithPdfParse(buf, fileKey, fileHash);
      }
    }

    if (
      mimeType === 'image/png' ||
      mimeType === 'image/jpeg' ||
      mimeType === 'image/webp'
    ) {
      return { pages: 1, colorPages: 0, fileHash };
    }

    return { pages: 1, colorPages: 0, fileHash };
  }

  private async analyzeWithPdfLib(
    buf: Buffer,
    fileHash: string,
  ): Promise<PageAnalysis> {
    const pdfDoc = await PDFDocument.load(buf, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    const pages = pdfDoc.getPageCount();
    const colorPages = pdfDoc.getPages().reduce(
      (count, page) => count + (pageHasChromaticContent(page.node) ? 1 : 0),
      0,
    );
    return { pages, colorPages, fileHash };
  }

  private async analyzeWithPdfParse(
    buf: Buffer,
    fileKey: string,
    fileHash: string,
  ): Promise<PageAnalysis> {
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buf });
      const info = await parser.getInfo();
      await parser.destroy();
      this.logger.log(
        `[PageAnalyzerService] pdf-parse succeeded for ${fileKey}: ${info.total} pages`,
      );
      return { pages: info.total, colorPages: 0, fileHash };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[PageAnalyzerService] pdf-parse also failed for ${fileKey}, returning null: ${msg}`,
      );
      return { pages: 1, colorPages: 0, fileHash };
    }
  }
}

const PDF_NUMBER = '[-+]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)';
const RGB_OPERATOR = new RegExp(
  `(${PDF_NUMBER})\\s+(${PDF_NUMBER})\\s+(${PDF_NUMBER})\\s+(?:rg|RG)\\b`,
  'g',
);
const CMYK_OPERATOR = new RegExp(
  `(${PDF_NUMBER})\\s+(${PDF_NUMBER})\\s+(${PDF_NUMBER})\\s+(${PDF_NUMBER})\\s+(?:k|K)\\b`,
  'g',
);
const INLINE_IMAGE_COLOR_SPACE = /\/CS\s*\/(?:RGB|CMYK|Lab|ICCBased|DeviceN|Separation)\b/;
const NON_GRAY_COLOR_SPACES = new Set([
  'DeviceRGB',
  'DeviceCMYK',
  'CalRGB',
  'Lab',
  'ICCBased',
  'Pattern',
  'Separation',
  'DeviceN',
]);

function pageHasChromaticContent(page: PDFPageLeaf): boolean {
  const entries = page.normalizedEntries();
  return streamArrayHasChromaticOperators(entries.Contents) || xObjectsContainColor(entries.XObject);
}

function streamArrayHasChromaticOperators(contents?: PDFArray): boolean {
  if (!contents) return false;

  for (let index = 0; index < contents.size(); index += 1) {
    const stream = contents.lookup(index, PDFStream);
    if (contentStreamHasColor(stream)) {
      return true;
    }
  }

  return false;
}

function contentStreamHasColor(stream: PDFStream): boolean {
  const text = getDecodedStreamText(stream);

  if (INLINE_IMAGE_COLOR_SPACE.test(text)) {
    return true;
  }

  RGB_OPERATOR.lastIndex = 0;
  let rgbMatch: RegExpExecArray | null = null;
  while ((rgbMatch = RGB_OPERATOR.exec(text)) !== null) {
    const red = Number(rgbMatch[1]);
    const green = Number(rgbMatch[2]);
    const blue = Number(rgbMatch[3]);
    if (!approximatelyEqual(red, green) || !approximatelyEqual(green, blue)) {
      return true;
    }
  }

  CMYK_OPERATOR.lastIndex = 0;
  let cmykMatch: RegExpExecArray | null = null;
  while ((cmykMatch = CMYK_OPERATOR.exec(text)) !== null) {
    const cyan = Number(cmykMatch[1]);
    const magenta = Number(cmykMatch[2]);
    const yellow = Number(cmykMatch[3]);
    if (
      !approximatelyEqual(cyan, 0) ||
      !approximatelyEqual(magenta, 0) ||
      !approximatelyEqual(yellow, 0)
    ) {
      return true;
    }
  }

  return false;
}

function xObjectsContainColor(xObjects?: PDFDict): boolean {
  if (!xObjects) return false;

  for (const [key] of xObjects.entries()) {
    const xObject = xObjects.lookup(key, PDFDict, PDFStream);
    if (!(xObject instanceof PDFStream)) continue;

    const subtype = xObject.dict.lookupMaybe(PDFName.of('Subtype'), PDFName)?.asString();

    if (
      subtype === '/Image' &&
      colorSpaceHasChromaticData(xObject.dict.lookup(PDFName.of('ColorSpace')))
    ) {
      return true;
    }

    if (subtype === '/Form') {
      if (contentStreamHasColor(xObject)) {
        return true;
      }

      const resources = xObject.dict.lookupMaybe(PDFName.of('Resources'), PDFDict);
      const nestedXObjects = resources?.lookupMaybe(PDFName.of('XObject'), PDFDict);
      if (xObjectsContainColor(nestedXObjects)) {
        return true;
      }
    }
  }

  return false;
}

function colorSpaceHasChromaticData(space: unknown): boolean {
  if (space instanceof PDFName) {
    return NON_GRAY_COLOR_SPACES.has(space.asString().slice(1));
  }

  if (space instanceof PDFArray) {
    const kind = space.lookupMaybe(0, PDFName)?.asString().slice(1);
    if (!kind || kind === 'DeviceGray' || kind === 'CalGray') return false;
    if (kind === 'Indexed') return colorSpaceHasChromaticData(space.lookup(1));
    if (kind === 'ICCBased') {
      const profile = space.lookupMaybe(1, PDFStream);
      const components = profile?.dict.lookupMaybe(PDFName.of('N'), PDFNumber)?.asNumber();
      return (components ?? 0) > 1;
    }
    return NON_GRAY_COLOR_SPACES.has(kind);
  }

  return false;
}

function getDecodedStreamText(stream: PDFStream): string {
  if (stream instanceof PDFRawStream) {
    return Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
  }

  return stream.getContentsString();
}

function approximatelyEqual(left: number, right: number) {
  return Math.abs(left - right) < 1e-6;
}
