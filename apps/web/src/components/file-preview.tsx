'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface FilePreviewProps {
  file?: File;
  url?: string;
  mimeType?: string;
  color: boolean;
  paperSize: string;
  duplex: boolean;
  copies?: number;
  pages?: number;
}

const PAPER_DIMS: Record<string, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  A5: { w: 148, h: 210 },
  Letter: { w: 216, h: 279 },
  Legal: { w: 216, h: 356 },
};
const MARGIN_MM = 12;

export function FilePreview({ file, url, mimeType, color, paperSize, duplex, copies = 1, pages }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const actualMime = mimeType || file?.type || '';
  const isImage = actualMime.startsWith('image/');
  const isPdf = actualMime === 'application/pdf';

  useEffect(() => {
    if (url) {
      setPreviewUrl(url);
      return;
    }
    if (file) {
      const u = URL.createObjectURL(file);
      setPreviewUrl(u);
      return () => URL.revokeObjectURL(u);
    }
  }, [file, url]);

  if (!previewUrl) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-m3-surface-container">
        <Loader2 className="h-8 w-8 animate-spin text-m3-outline" />
      </div>
    );
  }

  if (isImage) {
    return (
      <PaperFrame color={color} duplex={duplex} paperSize={paperSize} copies={copies} pages={pages}>
        <ImagePrintLayout src={previewUrl} color={color} paperSize={paperSize} />
      </PaperFrame>
    );
  }

  if (isPdf) {
    return (
      <PaperFrame color={color} duplex={duplex} paperSize={paperSize} copies={copies} pages={pages}>
        <div className="relative h-full w-full overflow-hidden">
          <iframe
            src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            className={`h-full w-full border-none transition-[filter] duration-500 ${color ? '' : 'grayscale'}`}
            title="PDF Preview"
            style={{ overflow: 'hidden' }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-[0.03]" />
        </div>
      </PaperFrame>
    );
  }

  return (
    <PaperFrame color={color} duplex={duplex} paperSize={paperSize} copies={copies} pages={pages}>
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-m3-surface-container-low px-6 text-center text-m3-ink-muted">
        <FileText className="h-12 w-12 opacity-20" />
        <span className="text-sm font-medium">{file?.name || 'Document'}</span>
      </div>
    </PaperFrame>
  );
}

/**
 * Renders the image as it will print: laid into the printable area of the paper,
 * centered with proportional margins, color stripped via canvas (matches B&W output).
 */
function ImagePrintLayout({ src, color, paperSize }: { src: string; color: boolean; paperSize: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [lowDpi, setLowDpi] = useState(false);

  const paper = PAPER_DIMS[paperSize] ?? PAPER_DIMS.A4!;
  const printableW = paper.w - MARGIN_MM * 2;
  const printableH = paper.h - MARGIN_MM * 2;

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Use 4× CSS pixel density for crisp preview.
      const previewWidth = 600;
      const previewHeight = Math.round((previewWidth * paper.h) / paper.w);
      canvas.width = previewWidth;
      canvas.height = previewHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // White paper background.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, previewWidth, previewHeight);

      // Pixels per mm in the preview canvas.
      const pxPerMm = previewWidth / paper.w;
      const marginPx = MARGIN_MM * pxPerMm;
      const areaW = printableW * pxPerMm;
      const areaH = printableH * pxPerMm;

      // Fit image into printable area (contain).
      const scale = Math.min(areaW / img.naturalWidth, areaH / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const x = marginPx + (areaW - drawW) / 2;
      const y = marginPx + (areaH - drawH) / 2;

      ctx.drawImage(img, x, y, drawW, drawH);

      // Apply B&W via luminance (matches what most printers do, unlike a CSS grayscale filter).
      if (!color) {
        const data = ctx.getImageData(x, y, drawW, drawH);
        const pixels = data.data;
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i] ?? 0;
          const g = pixels[i + 1] ?? 0;
          const b = pixels[i + 2] ?? 0;
          const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          pixels[i] = lum;
          pixels[i + 1] = lum;
          pixels[i + 2] = lum;
        }
        ctx.putImageData(data, x, y);
      }

      // DPI warning — printers render at ~300 DPI; below 150 DPI on the printed size looks blurry.
      const printedInchesW = (drawW / pxPerMm) / 25.4;
      const dpi = printedInchesW > 0 ? img.naturalWidth / printedInchesW : 0;
      setLowDpi(dpi > 0 && dpi < 150);
    };
    img.src = src;
  }, [src, color, paperSize]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="block h-full w-full" />
      {/* Margin guide overlay */}
      <div
        className="pointer-events-none absolute border border-dashed border-m3-primary/20"
        style={{
          top: `${(MARGIN_MM / paper.h) * 100}%`,
          left: `${(MARGIN_MM / paper.w) * 100}%`,
          right: `${(MARGIN_MM / paper.w) * 100}%`,
          bottom: `${(MARGIN_MM / paper.h) * 100}%`,
        }}
      />
      {naturalSize && lowDpi && (
        <div className="absolute left-2 right-2 bottom-2 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-900 ring-1 ring-amber-200">
          Low resolution — may look blurry at {paperSize} size
        </div>
      )}
    </div>
  );
}

function PaperFrame({
  children,
  color,
  duplex,
  paperSize,
  copies,
  pages,
}: {
  children: React.ReactNode;
  color: boolean;
  duplex: boolean;
  paperSize: string;
  copies: number;
  pages?: number;
}) {
  const paper = PAPER_DIMS[paperSize] ?? PAPER_DIMS.A4!;
  const aspectRatio = `${paper.w} / ${paper.h}`;
  const sheetsForJob = pages ? Math.ceil(pages / (duplex ? 2 : 1)) * copies : null;

  return (
    <div className="flex w-full flex-col gap-5 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <PreviewChip label={paperSize} />
        <PreviewChip label={color ? 'Full Color' : 'Black & White'} active={color} />
        <PreviewChip label={duplex ? 'Double Sided' : 'Single Sided'} />
        {copies > 1 && <PreviewChip label={`${copies} copies`} />}
        {pages ? <PreviewChip label={`${pages} ${pages === 1 ? 'page' : 'pages'}`} /> : null}
        {sheetsForJob ? <PreviewChip label={`${sheetsForJob} ${sheetsForJob === 1 ? 'sheet' : 'sheets'}`} active /> : null}
      </div>

      <div className="relative group">
        <div className="absolute -right-1 -bottom-1 h-full w-full rounded-sm bg-m3-surface-container-high border border-m3-outline-variant -z-10" />
        <div className="absolute -right-2 -bottom-2 h-full w-full rounded-sm bg-m3-surface-container -z-20 opacity-50" />

        <div
          className="relative w-full overflow-hidden rounded-sm bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-m3-outline-variant transition-all duration-300 group-hover:shadow-[0_12px_40px_rgb(0,0,0,0.16)]"
          style={{ aspectRatio }}
        >
          {children}
          <div className="pointer-events-none absolute inset-0 rounded-sm ring-1 ring-inset ring-black/5" />
          <div className="pointer-events-none absolute left-0 top-0 h-full w-[1px] bg-white/40" />
        </div>
      </div>
    </div>
  );
}

function PreviewChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <span className={`m3-pill border border-m3-outline-variant px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${
      active ? 'bg-m3-primary-container text-m3-primary border-m3-primary/20' : 'text-m3-ink-faint'
    }`}>
      {label}
    </span>
  );
}
