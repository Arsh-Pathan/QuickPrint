'use client';

import { useEffect, useState } from 'react';
import { FileText, Image as ImageIcon, Loader2 } from 'lucide-react';

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
      <div className="overflow-hidden rounded-xl border border-[#dadce0] bg-white shadow-sm">
        <img
          src={previewUrl}
          alt="Preview"
          className="aspect-auto max-h-[300px] w-full object-contain"
        />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="overflow-hidden rounded-xl border border-[#dadce0] bg-white shadow-sm">
        <iframe
          src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          className="aspect-[3/4] w-full border-none"
          title="PDF Preview"
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-xl border border-[#dadce0] bg-[#f8f9fa] text-[#5f6368]">
      <FileText className="h-12 w-12" />
      <span className="text-sm font-medium">{file.name}</span>
    </div>
  );
}
