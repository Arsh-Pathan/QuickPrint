'use client';

import { Loader2 } from 'lucide-react';

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-m3-surface">
      <div className="relative mb-8">
        {/* Pulsing branding circles */}
        <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-m3-primary/10 blur-3xl" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-m3-surface shadow-elev-3 border border-m3-outline-variant overflow-hidden">
          <div className="shimmer-bar opacity-20" />
          <Loader2 className="h-10 w-10 animate-spin text-m3-primary" />
        </div>
      </div>
      
      <div className="space-y-4 text-center">
        <div className="h-6 w-48 bg-m3-surface-container-high rounded-full overflow-hidden relative mx-auto">
          <div className="shimmer-bar" />
        </div>
        <div className="h-4 w-32 bg-m3-surface-container rounded-full overflow-hidden relative mx-auto">
          <div className="shimmer-bar opacity-60" />
        </div>
      </div>
      
      <div className="absolute bottom-12 flex flex-col items-center gap-2">
        <p className="m3-section-eyebrow text-[10px]">QuickPrint System</p>
        <div className="flex gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-m3-primary animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="h-1.5 w-1.5 rounded-full bg-m3-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="h-1.5 w-1.5 rounded-full bg-m3-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}
