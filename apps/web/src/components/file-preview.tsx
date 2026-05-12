'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface FilePreviewProps {
  file?: File;
  url?: string;
  mimeType?: string;
  color: boolean;
  paperSize: string;
  duplex: boolean;
}

export function FilePreview({ file, url, mimeType, color, paperSize, duplex }: FilePreviewProps) {
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
      <PaperFrame color={color} duplex={duplex} paperSize={paperSize}>
        <img
          src={previewUrl}
          alt="Preview"
          className={`h-full w-full object-contain transition-[filter] duration-200 ${color ? '' : 'grayscale'}`}
        />
      </PaperFrame>
    );
  }

  if (isPdf) {
    return (
      <PaperFrame color={color} duplex={duplex} paperSize={paperSize}>
        <div className="relative h-full w-full overflow-hidden">
          <iframe
            src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            className={`h-full w-full border-none transition-[filter] duration-500 ${color ? '' : 'grayscale'}`}
            title="PDF Preview"
            style={{ overflow: 'hidden' }}
          />
          {/* Subtle paper texture overlay */}
          <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-[0.03]" />
        </div>
      </PaperFrame>
    );
  }

  return (
    <PaperFrame color={color} duplex={duplex} paperSize={paperSize}>
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-m3-surface-container-low px-6 text-center text-m3-ink-muted">
        <FileText className="h-12 w-12 opacity-20" />
        <span className="text-sm font-medium">{file?.name || 'Document'}</span>
      </div>
    </PaperFrame>
  );
}

function PaperFrame({
  children,
  color,
  duplex,
  paperSize,
}: {
  children: React.ReactNode;
  color: boolean;
  duplex: boolean;
  paperSize: string;
}) {
  return (
    <div className="flex w-full flex-col gap-5 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <PreviewChip label={paperSize} />
        <PreviewChip label={color ? 'Full Color' : 'Black & White'} active={color} />
        <PreviewChip label={duplex ? 'Double Sided' : 'Single Sided'} />
      </div>
      
      <div className="relative group">
        {/* Paper stack effect */}
        <div className="absolute -right-1 -bottom-1 h-full w-full rounded-sm bg-m3-surface-container-high border border-m3-outline-variant -z-10" />
        <div className="absolute -right-2 -bottom-2 h-full w-full rounded-sm bg-m3-surface-container -z-20 opacity-50" />
        
        <div
          className="relative w-full overflow-hidden rounded-sm bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-m3-outline-variant transition-all duration-300 group-hover:shadow-[0_12px_40px_rgb(0,0,0,0.16)]"
          style={{ aspectRatio: '1 / 1.414' }}
        >
          {children}
          {/* Realistic edge highlight */}
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
