'use client';
import { Pause, Play, X, RotateCcw } from 'lucide-react';

export default function QueuePage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live queue</h1>
          <p className="text-sm text-slate-500">Drag to reorder, click to inspect</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
            <Pause className="h-4 w-4" />
            Pause
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
            <Play className="h-4 w-4" />
            Resume
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">Pages</th>
              <th className="px-4 py-3 font-medium">Settings</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">ETA</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                Queue will populate once the realtime feed is connected.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <RotateCcw className="h-3 w-3" /> Auto-refreshing via WebSocket
        <X className="ml-2 h-3 w-3" /> shown for cancellable jobs
      </p>
    </div>
  );
}
