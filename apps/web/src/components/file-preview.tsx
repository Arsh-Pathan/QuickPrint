'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface FilePreviewProps {
  file: File;
  color: boolean;
  paperSize: string;
  duplex: boolean;
}

export function FilePreview({ file, color, paperSize, duplex }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!previewUrl) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-[#f1f3f4]">
        <Loader2 className="h-8 w-8 animate-spin text-[#bdc1c6]" />
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
        <iframe
          src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          className="h-full w-full border-none"
          title="PDF Preview"
        />
      </PaperFrame>
    );
  }

  return (
    <PaperFrame color={color} duplex={duplex} paperSize={paperSize}>
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#f8f9fa] px-6 text-center text-[#5f6368]">
        <FileText className="h-12 w-12" />
        <span className="text-sm font-medium">{file.name}</span>
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
    <div className="flex w-full flex-col gap-3 py-4">
      <div className="flex flex-wrap items-center gap-2 px-2">
        <PreviewChip label={paperSize} />
        <PreviewChip label={color ? 'Color' : 'B&W'} />
        <PreviewChip label={duplex ? 'Double-sided' : 'Single-sided'} />
      </div>
      <div
        className="relative w-full max-w-[380px] overflow-hidden rounded-sm bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12),0_8px_32px_rgba(0,0,0,0.08)]"
        style={{ aspectRatio: '1 / 1.414' }}
      >
        {children}
        <div className="pointer-events-none absolute inset-0 rounded-sm ring-1 ring-inset ring-black/5" />
      </div>
    </div>
  );
}

function PreviewChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[#f1f3f4] px-3 py-1 text-[11px] font-medium text-[#5f6368]">
      {label}
    </span>
  );
}
