'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

interface FilePreviewProps {
  file: File;
}

export function FilePreview({ file }: FilePreviewProps) {
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
      <PaperFrame>
        <img
          src={previewUrl}
          alt="Preview"
          className="h-full w-full object-contain"
        />
      </PaperFrame>
    );
  }

  if (isPdf) {
    return (
      <PaperFrame>
        <iframe
          src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          className="h-full w-full border-none"
          title="PDF Preview"
        />
      </PaperFrame>
    );
  }

  return (
    <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-xl border border-[#dadce0] bg-[#f8f9fa] text-[#5f6368]">
      <FileText className="h-12 w-12" />
      <span className="text-sm font-medium">{file.name}</span>
    </div>
  );
}

function PaperFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full justify-center py-4">
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
