'use client';
import { Pause, Play, X, RotateCcw } from 'lucide-react';

export default function QueuePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 py-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-normal text-[#202124]">Live Queue</h1>
          <p className="mt-1 text-[13px] text-[#5f6368]">Drag to reorder, click to inspect</p>
        </div>
        <div className="flex gap-2">
          <button className="google-button-secondary !text-[13px]">
            <Pause className="h-4 w-4" />
            Pause
          </button>
          <button className="google-button-secondary !text-[13px]">
            <Play className="h-4 w-4" />
            Resume
          </button>
        </div>
      </header>

      <div className="google-card overflow-hidden !p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-[#dadce0] bg-[#f8f9fa]">
            <tr className="text-left text-[#5f6368] text-[11px] tracking-wide font-semibold uppercase">
              <th className="px-6 py-3.5">#</th>
              <th className="px-6 py-3.5">File</th>
              <th className="px-6 py-3.5">Pages</th>
              <th className="px-6 py-3.5">Settings</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">ETA</th>
              <th className="px-6 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dadce0]">
            <tr>
              <td colSpan={7} className="px-6 py-20 text-center text-[#70757a] text-[14px]">
                Queue will populate once the realtime feed is connected.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 text-[12px] text-[#70757a]">
        <span className="flex items-center gap-1.5">
          <RotateCcw className="h-3 w-3" /> Auto-refreshing via WebSocket
        </span>
        <span className="flex items-center gap-1.5">
          <X className="h-3 w-3" /> Shown for cancellable jobs
        </span>
      </div>
    </div>
  );
}
