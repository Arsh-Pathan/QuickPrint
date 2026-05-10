'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, RotateCcw, Inbox, Loader2 } from 'lucide-react';
import { api, type QueueItem } from '@/lib/api';
import { useSocketStatus } from '@/lib/socket';
import { rupees, formatEta } from '@/lib/format';
import { SHOP_ID } from '@/lib/config';

export default function QueuePage() {
  const status = useSocketStatus();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['queue', SHOP_ID],
    queryFn: () => api.get<QueueItem[]>(`/queue?shopId=${SHOP_ID}`),
    refetchInterval: 10_000,
  });

  const cancel = useMutation({
    mutationFn: (jobId: string) => api.delete<void>(`/queue/${jobId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queue'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const items = data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-8 py-2">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-[24px] font-normal text-[#202124]">Live Queue</h1>
          <p className="mt-1 text-[13px] text-[#5f6368]">
            {items.length === 0
              ? 'No jobs waiting right now.'
              : `${items.length} job${items.length === 1 ? '' : 's'} in queue`}
          </p>
        </div>
        <ConnectionBadge status={status} />
      </header>

      <div className="google-card overflow-hidden !p-0">
        {isLoading ? (
          <SkeletonRow />
        ) : isError ? (
          <ErrorRow onRetry={() => refetch()} />
        ) : items.length === 0 ? (
          <EmptyRow />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[#dadce0] bg-[#f8f9fa]">
              <tr className="text-left text-[#5f6368] text-[11px] tracking-wide font-semibold uppercase">
                <th className="px-6 py-3.5">#</th>
                <th className="px-6 py-3.5">File</th>
                <th className="px-6 py-3.5">Pages</th>
                <th className="px-6 py-3.5">Settings</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Price</th>
                <th className="px-6 py-3.5">ETA</th>
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dadce0]">
              {items.map((item, i) => (
                <QueueRow
                  key={item.jobId}
                  index={i + 1}
                  item={item}
                  cancelling={cancel.isPending && cancel.variables === item.jobId}
                  onCancel={() => cancel.mutate(item.jobId)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center gap-4 text-[12px] text-[#70757a]">
        <span className="flex items-center gap-1.5">
          <RotateCcw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing…' : 'Live via WebSocket + 10s poll'}
        </span>
      </div>
    </div>
  );
}

function QueueRow({
  index,
  item,
  cancelling,
  onCancel,
}: {
  index: number;
  item: QueueItem;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const settings: string[] = [];
  settings.push(item.job.color ? 'Color' : 'B&W');
  if (item.job.duplex) settings.push('Duplex');
  if (item.job.copies > 1) settings.push(`×${item.job.copies}`);
  settings.push(item.job.paperSize);

  return (
    <tr className="hover:bg-[#f8f9fa]">
      <td className="px-6 py-4 text-[13px] text-[#5f6368] font-medium tabular-nums">
        {index}
      </td>
      <td className="px-6 py-4">
        <p className="text-[13px] font-medium text-[#202124] truncate max-w-[320px]">
          {item.job.fileName}
        </p>
        <p className="text-[11px] text-[#9aa0a6] mt-0.5 font-mono">
          {item.jobId.slice(0, 8)}
        </p>
      </td>
      <td className="px-6 py-4 text-[13px] text-[#3c4043] tabular-nums">{item.job.pages}</td>
      <td className="px-6 py-4 text-[13px] text-[#5f6368]">{settings.join(' · ')}</td>
      <td className="px-6 py-4">
        <StatusPill status={item.job.status} />
      </td>
      <td className="px-6 py-4 text-[13px] text-[#202124] font-medium tabular-nums">
        {rupees(item.job.priceTotalPaise)}
      </td>
      <td className="px-6 py-4 text-[13px] text-[#5f6368] tabular-nums">
        {formatEta(item.etaSeconds)}
      </td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={onCancel}
          disabled={cancelling}
          title="Cancel job"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#9aa0a6] transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
        >
          {cancelling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
        </button>
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    QUEUED: 'bg-amber-50 text-amber-700',
    PRINTING: 'bg-blue-50 text-blue-700',
    COMPLETED: 'bg-emerald-50 text-emerald-700',
    FAILED: 'bg-rose-50 text-rose-700',
    CANCELLED: 'bg-[#f1f3f4] text-[#5f6368]',
  };
  const cls = styles[status] ?? 'bg-[#f1f3f4] text-[#5f6368]';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {status.toLowerCase()}
    </span>
  );
}

function ConnectionBadge({
  status,
}: {
  status: 'connected' | 'connecting' | 'disconnected';
}) {
  const map = {
    connected: { label: 'Live', color: 'bg-emerald-500' },
    connecting: { label: 'Connecting…', color: 'bg-amber-500 animate-pulse' },
    disconnected: { label: 'Offline', color: 'bg-rose-500' },
  };
  const { label, color } = map[status];
  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-[#5f6368]">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="grid place-items-center py-20 text-[#9aa0a6]">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

function EmptyRow() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#f1f3f4]">
        <Inbox className="h-5 w-5 text-[#bdc1c6]" />
      </div>
      <p className="text-[14px] font-medium text-[#202124]">Queue is empty</p>
      <p className="mt-1 text-[12px] text-[#5f6368]">
        Paid jobs will appear here as they are queued.
      </p>
    </div>
  );
}

function ErrorRow({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-[14px] font-medium text-[#b91c1c]">Could not load queue</p>
      <button
        onClick={onRetry}
        className="mt-3 rounded-lg border border-[#dadce0] bg-white px-3 py-1.5 text-[12px] text-[#3c4043] hover:bg-[#f1f3f4]"
      >
        Try again
      </button>
    </div>
  );
}
