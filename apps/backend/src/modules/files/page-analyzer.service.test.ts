import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { PDFDocument, grayscale, rgb } from 'pdf-lib';
import { PageAnalyzerService } from './page-analyzer.service';

describe('PageAnalyzerService', () => {
  it('counts chromatic PDF pages while preserving page totals and file hash', async () => {
    const pdf = await PDFDocument.create();
    const grayPage = pdf.addPage([200, 200]);
    grayPage.drawRectangle({
      x: 24,
      y: 24,
      width: 80,
      height: 80,
      color: grayscale(0.2),
    });

    const colorPage = pdf.addPage([200, 200]);
    colorPage.drawRectangle({
      x: 24,
      y: 24,
      width: 80,
      height: 80,
      color: rgb(1, 0, 0),
    });

    const bytes = Buffer.from(await pdf.save());
    const storage = {
      readLocal: vi.fn().mockResolvedValue(bytes),
    };

    const service = new PageAnalyzerService(storage as never);
    const result = await service.analyze('mixed.pdf', 'application/pdf');

    expect(result).toEqual({
      pages: 2,
      colorPages: 1,
      fileHash: createHash('sha256').update(bytes).digest('hex'),
    });
  });

  it('falls back safely for malformed PDFs while still returning the file hash', async () => {
    const bytes = Buffer.from('not-a-pdf');
    const storage = {
      readLocal: vi.fn().mockResolvedValue(bytes),
    };

    const service = new PageAnalyzerService(storage as never);
    const result = await service.analyze('broken.pdf', 'application/pdf');

    expect(result).toEqual({
      pages: 1,
      colorPages: 0,
      fileHash: createHash('sha256').update(bytes).digest('hex'),
    });
  });
});
