'use client';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, RotateCcw, Inbox, Loader2, Signal, SignalLow, SignalZero, ArrowUpRight, Search, ListOrdered, Clock, FileText, CheckCircle2, RefreshCcw } from 'lucide-react';
import { api, type QueueItem } from '@/lib/api';
import { useSocketStatus } from '@/lib/socket';
import { rupees, formatEta } from '@/lib/format';
import { SHOP_ID } from '@/lib/config';

const STATUS_FILTERS = ['ALL', 'QUEUED', 'PRINTING', 'FAILED'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export default function QueuePage() {
  const status = useSocketStatus();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['queue', SHOP_ID],
    queryFn: () => api.get<QueueItem[]>(`/queue?shopId=${SHOP_ID}`),
    refetchInterval: 10_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['queue'] });
    qc.invalidateQueries({ queryKey: ['admin-stats'] });
    qc.invalidateQueries({ queryKey: ['admin-jobs'] });
  };

  const markPrinted = useMutation({
    mutationFn: (jobId: string) => api.post<void>(`/print-jobs/admin/${jobId}/mark-printed`, {}),
    onSuccess: invalidate,
  });

  const requeue = useMutation({
    mutationFn: (jobId: string) => api.post<void>(`/print-jobs/admin/${jobId}/requeue`, {}),
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: ({ jobId, reason }: { jobId: string; reason?: string }) =>
      api.post<void>(`/print-jobs/admin/${jobId}/cancel`, { reason }),
    onSuccess: invalidate,
  });

  const allItems = data ?? [];
  const items = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allItems.filter((it) => {
      if (statusFilter !== 'ALL' && it.job.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        it.jobId.toLowerCase().includes(needle) ||
        it.job.fileName.toLowerCase().includes(needle)
      );
    });
  }, [allItems, search, statusFilter]);
  const filtered = items.length !== allItems.length;

  return (
    <div className="space-y-10 py-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-m3-surface-container text-m3-primary text-[10px] font-bold uppercase tracking-widest border border-m3-outline-variant/30">
            <ListOrdered size={12} className="text-m3-primary" />
            Live Processor
          </div>
          <h1 className="m3-display-s text-m3-ink tracking-tight">Active Queue</h1>
          <p className="text-[15px] text-m3-ink-muted">
            {allItems.length === 0
              ? 'Standby mode — no active print jobs.'
              : filtered
              ? `${items.length} of ${allItems.length} jobs match filters.`
              : `${allItems.length} prioritized tasks currently in flight.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group hidden sm:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-ink-faint group-focus-within:text-m3-primary transition-colors" />
            <input
              type="text"
              placeholder="Search by ID or File..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 w-64 pl-11 pr-9 bg-m3-surface-container-low border border-m3-outline-variant/30 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-m3-primary/20 focus:border-m3-primary transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-full text-m3-ink-faint hover:bg-m3-surface-container hover:text-m3-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <ConnectionBadge status={status} />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-2">
        {STATUS_FILTERS.map((s) => {
          const active = statusFilter === s;
          const count =
            s === 'ALL'
              ? allItems.length
              : allItems.filter((it) => it.job.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`h-9 px-4 rounded-full text-[11px] font-black uppercase tracking-[0.18em] border transition-all ${
                active
                  ? 'bg-m3-primary text-m3-on-primary border-m3-primary shadow-elev-1'
                  : 'bg-m3-surface-container-low text-m3-ink-muted border-m3-outline-variant/30 hover:bg-m3-surface-container'
              }`}
            >
              {s.toLowerCase()} <span className="opacity-60 ml-1 tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="m3-card overflow-hidden !p-0 bg-white/40 backdrop-blur-md shadow-elev-2 border-m3-outline-variant/40">
        {isLoading ? (
          <SkeletonRow />
        ) : isError ? (
          <ErrorRow onRetry={() => refetch()} />
        ) : items.length === 0 ? (
          filtered ? (
            <NoMatchesRow onReset={() => { setSearch(''); setStatusFilter('ALL'); }} />
          ) : (
            <EmptyRow />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-m3-surface-container-high/50 backdrop-blur-xl border-b border-m3-outline-variant/50 sticky top-0 z-10">
                <tr className="text-left text-m3-ink-faint text-[10px] tracking-[0.2em] font-black uppercase">
                  <th className="px-8 py-5">Rank</th>
                  <th className="px-8 py-5">Artifact</th>
                  <th className="px-8 py-5">Pages</th>
                  <th className="px-8 py-5">Node Context</th>
                  <th className="px-8 py-5">State</th>
                  <th className="px-8 py-5 text-right">Commitment</th>
                  <th className="px-8 py-5 text-right">Resolution</th>
                  <th className="px-8 py-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-m3-outline-variant/30">
                {items.map((item, i) => (
                  <QueueRow
                    key={item.jobId}
                    index={i + 1}
                    item={item}
                    busy={
                      (cancel.isPending && cancel.variables?.jobId === item.jobId) ||
                      (markPrinted.isPending && markPrinted.variables === item.jobId) ||
                      (requeue.isPending && requeue.variables === item.jobId)
                    }
                    onMarkPrinted={() => markPrinted.mutate(item.jobId)}
                    onRequeue={() => requeue.mutate(item.jobId)}
                    onCancel={() => {
                      const reason = window.prompt(
                        `Cancel "${item.job.fileName}"?\nThe student will need to be refunded manually if paid.\n\nReason (optional):`,
                        '',
                      );
                      if (reason === null) return; // user pressed Cancel in the prompt
                      cancel.mutate({ jobId: item.jobId, reason: reason || undefined });
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] font-extrabold text-m3-ink-faint uppercase tracking-widest px-2">
        <div className="flex items-center gap-2 bg-m3-surface-container-low px-4 py-2.5 rounded-full border border-m3-outline-variant/20">
          <RotateCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-m3-primary' : ''}`} />
          {isFetching ? 'Aggregating Buffer…' : 'Live Sync Protocol v2.4'}
        </div>
        <div className="flex items-center gap-2 bg-m3-surface-container-low px-4 py-2.5 rounded-full border border-m3-outline-variant/20">
          <Clock size={14} className="text-m3-primary/60" />
          Latency: 42ms
        </div>
      </div>
    </div>
  );
}

function QueueRow({
  index,
  item,
  busy,
  onMarkPrinted,
  onRequeue,
  onCancel,
}: {
  index: number;
  item: QueueItem;
  busy: boolean;
  onMarkPrinted: () => void;
  onRequeue: () => void;
  onCancel: () => void;
}) {
  const status = item.job.status;
  const canMarkPrinted = status === 'PRINTING' || status === 'QUEUED';
  const canRequeue = status === 'FAILED' || status === 'CANCELLED' || status === 'PRINTING';
  const canCancel = status !== 'COMPLETED' && status !== 'CANCELLED';
  const settings: string[] = [];
  settings.push(item.job.color ? 'Color' : 'B&W');
  if (item.job.duplex) settings.push('Duplex');
  if (item.job.copies > 1) settings.push(`×${item.job.copies}`);
  settings.push(item.job.paperSize);

  return (
    <tr className="hover:bg-m3-primary/[0.02] transition-colors group">
      <td className="px-8 py-6 text-[13px] text-m3-ink-faint font-black tabular-nums">
        {String(index).padStart(2, '0')}
      </td>
      <td className="px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-m3-surface-container flex items-center justify-center text-m3-ink-muted group-hover:bg-m3-primary group-hover:text-m3-on-primary transition-all duration-500 group-hover:rotate-6">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-m3-ink truncate max-w-[240px] group-hover:text-m3-primary transition-colors tracking-tight">
              {item.job.fileName}
            </p>
            <p className="text-[10px] text-m3-ink-faint mt-1 font-mono uppercase tracking-widest font-bold">
              TXID: {item.jobId.slice(0, 12).toUpperCase()}
            </p>
          </div>
        </div>
      </td>
      <td className="px-8 py-6 text-[14px] text-m3-ink tabular-nums font-black">{item.job.pages}</td>
      <td className="px-8 py-6">
        <div className="flex flex-wrap gap-1.5">
          {settings.map((s, idx) => (
            <span key={idx} className="inline-flex items-center h-6 px-2.5 rounded-lg bg-m3-surface-container-low text-[9px] font-black text-m3-ink-muted uppercase tracking-[0.12em] border border-m3-outline-variant/30">
              {s}
            </span>
          ))}
        </div>
      </td>
      <td className="px-8 py-6">
        <StatusPill status={item.job.status} />
      </td>
      <td className="px-8 py-6 text-[14px] text-m3-ink font-bold tabular-nums text-right">
        {rupees(item.job.priceTotalPaise)}
      </td>
      <td className="px-8 py-6 text-[14px] text-m3-primary tabular-nums font-black text-right">
        {formatEta(item.etaSeconds)}
      </td>
      <td className="px-8 py-6 text-right">
        <div className="inline-flex items-center gap-1.5">
          {busy && <Loader2 className="h-4 w-4 animate-spin text-m3-primary mr-1" />}
          <button
            onClick={onMarkPrinted}
            disabled={busy || !canMarkPrinted}
            title="Mark as printed (Maddy handed it off manually)"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-m3-ink-faint transition-all hover:bg-m3-green-container hover:text-m3-green hover:shadow-sm disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-m3-ink-faint active:scale-90"
          >
            <CheckCircle2 className="h-5 w-5" />
          </button>
          <button
            onClick={onRequeue}
            disabled={busy || !canRequeue}
            title="Requeue this job"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-m3-ink-faint transition-all hover:bg-m3-primary-container hover:text-m3-primary hover:shadow-sm disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-m3-ink-faint active:scale-90"
          >
            <RefreshCcw className="h-5 w-5" />
          </button>
          <button
            onClick={onCancel}
            disabled={busy || !canCancel}
            title="Cancel & mark for refund"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-m3-ink-faint transition-all hover:bg-m3-red-container hover:text-m3-red hover:shadow-sm disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-m3-ink-faint active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function NoMatchesRow({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-6">
      <div className="mb-6 h-20 w-20 rounded-3xl bg-m3-surface-container flex items-center justify-center mx-auto border border-m3-outline-variant/20">
        <Search className="h-9 w-9 text-m3-ink-faint" />
      </div>
      <h3 className="m3-headline-s text-m3-ink font-black tracking-tight">No matches</h3>
      <p className="mt-2 text-sm text-m3-ink-muted max-w-xs leading-relaxed font-medium">
        Nothing in the queue matches your current search and filters.
      </p>
      <button onClick={onReset} className="mt-6 m3-btn-text h-11 px-6 font-bold">
        Clear filters
      </button>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    QUEUED: 'bg-m3-yellow-container/40 text-m3-yellow border-m3-yellow/20 shadow-[0_0_8px_rgba(251,188,5,0.1)]',
    PRINTING: 'bg-m3-primary/10 text-m3-primary border-m3-primary/20 shadow-[0_0_8px_rgba(26,115,232,0.15)] animate-pulse',
    COMPLETED: 'bg-m3-green-container/40 text-m3-green border-m3-green/20',
    FAILED: 'bg-m3-red-container/40 text-m3-red border-m3-red/20',
    CANCELLED: 'bg-m3-surface-container text-m3-ink-faint border-m3-outline-variant/30',
  };
  const cls = styles[status] ?? 'bg-m3-surface-container text-m3-ink-faint border-m3-outline-variant/30';
  return (
    <span
      className={`inline-flex items-center rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] border ${cls}`}
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
    connected: { label: 'Real-time Link', color: 'text-m3-green', icon: Signal, bg: 'bg-m3-green-container/20' },
    connecting: { label: 'Handshaking…', color: 'text-m3-yellow animate-pulse', icon: SignalLow, bg: 'bg-m3-yellow-container/20' },
    disconnected: { label: 'Node Offline', color: 'text-m3-red', icon: SignalZero, bg: 'bg-m3-red-container/20' },
  };
  const { label, color, icon: Icon, bg } = map[status];
  return (
    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl ${bg} border border-m3-outline-variant/30 ${color} shadow-sm transition-all duration-500`}>
      <Icon className="h-5 w-5" />
      <span className="text-[12px] font-black uppercase tracking-[0.18em]">{label}</span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
      <div className="relative">
        <div className="absolute inset-0 bg-m3-primary/20 blur-[60px] rounded-full animate-pulse" />
        <Loader2 className="h-12 w-12 animate-spin text-m3-primary relative z-10" />
      </div>
      <p className="text-[11px] font-black text-m3-ink-faint uppercase tracking-[0.3em] animate-pulse">Aggregating Streams…</p>
    </div>
  );
}

function EmptyRow() {
  return (
    <div className="flex flex-col items-center justify-center py-40 text-center px-6">
      <div className="mb-8 relative group">
        <div className="absolute inset-0 bg-m3-primary/10 blur-[40px] rounded-full group-hover:bg-m3-primary/20 transition-colors" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-m3-surface-container-low text-m3-ink-faint border border-m3-outline-variant/20 shadow-elev-1">
          <Inbox className="h-12 w-12" />
        </div>
      </div>
      <h3 className="m3-headline-s text-m3-ink font-black tracking-tight">Queue in Standby</h3>
      <p className="mt-2 text-sm text-m3-ink-muted max-w-xs leading-relaxed font-medium">
        All nodes are clear. Incoming print requests will appear here with dynamic priority ranking.
      </p>
    </div>
  );
}

function ErrorRow({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-6">
      <div className="mb-6 text-m3-red">
        <div className="h-20 w-20 rounded-3xl bg-m3-red-container/30 flex items-center justify-center mx-auto mb-4 border border-m3-red/10">
          <SignalZero className="h-10 w-10 opacity-60" />
        </div>
        <h3 className="m3-headline-s font-black tracking-tight">Network Divergence</h3>
      </div>
      <p className="text-sm text-m3-ink-muted max-w-xs mb-8 font-medium">
        Protocol mismatch or server connection lost. Attempts to re-sync were unsuccessful.
      </p>
      <button onClick={onRetry} className="m3-btn-filled h-14 px-10 font-black shadow-elev-2 hover:shadow-elev-4">
        Re-Establish Protocol
      </button>
    </div>
  );
}
