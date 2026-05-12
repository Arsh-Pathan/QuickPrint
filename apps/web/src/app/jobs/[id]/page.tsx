'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  Loader2,
  Printer,
  XCircle,
  ArrowLeft,
  FileText,
  Hash,
  BellRing,
  MessageCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useJobSocket } from '@/lib/use-job-socket';
import { useAuth, usePrefs } from '@/lib/store';
import { useToast } from '@/lib/toast';
import {
  ensureNotificationPermission,
  sendBrowserNotification,
  playChime,
} from '@/lib/notify';
import type { PrintJobStatus } from '@quickprint/shared';

const PIPELINE: PrintJobStatus[] = ['created', 'paid', 'queued', 'printing', 'completed'];

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { token, user } = useAuth();
  const prefs = usePrefs();
  const toast = useToast();
  const [jobName, setJobName] = useState<string>('');
  const [initialStatus, setInitialStatus] = useState<PrintJobStatus>('created');
  const [loading, setLoading] = useState(true);

  // Live socket state — drives everything below.
  const live = useJobSocket(id, { status: initialStatus }, (next, prev) => {
    if (prev.status === next.status) return;
    const friendly = STATUS_TEXT[next.status];
    toast.push(friendly.toast, friendly.variant);
    sendBrowserNotification('QuickPrint', friendly.toast, `job-${id}`);
    if (next.status === 'completed') playChime('success');
    if (next.status === 'failed') playChime('alert');
  });

  // Boot: pull job details + initial queue position before the first socket push.
  useEffect(() => {
    if (!token) {
      router.push(`/login?next=/jobs/${id}`);
      return;
    }
    let cancelled = false;
    api.getJob(id).then((j: any) => {
      if (cancelled) return;
      setJobName(j.fileName);
      if (j.status) setInitialStatus(j.status as PrintJobStatus);
      setLoading(false);
    }).catch(() => setLoading(false));
    api.queuePosition(id).then((q) => {
      if (cancelled || !q) return;
      // Surface as toast on first visit if the student is in line.
      toast.push(`You're #${q.position} of ${q.total} in the queue`, 'info');
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id, token, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ask for browser-notification permission once per device.
  useEffect(() => {
    if (prefs.notificationsAsked) return;
    ensureNotificationPermission().then((res) => {
      prefs.set({ notificationsAsked: true });
      if (res === 'granted') {
        toast.push('Notifications enabled — we’ll ping you when ready', 'success');
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ui = STATUS_UI[live.status] || STATUS_UI.created;

  const waMessage = useMemo(
    () => encodeURIComponent(`QuickPrint job ${id.slice(0, 8).toUpperCase()} status: ${live.status}`),
    [id, live.status],
  );

  return (
    <main className="flex min-h-screen flex-col items-center bg-m3-surface pt-12 pb-24 px-4 sm:px-6">
      <div className="flex w-full max-w-md flex-col items-center">
        <header className="mb-10 flex flex-col items-center text-center">
          <h1 className="m3-display-s text-m3-ink mb-3">Print Status</h1>
          <ConnectionPill connected={live.connected} />
        </header>

        {loading ? (
          <JobSkeleton />
        ) : (
          <>
            {/* Pipeline (created → completed) */}
            <Timeline status={live.status} />

        {/* Status card */}
        <div className="m3-card mt-8 w-full !p-0 overflow-hidden shadow-elev-2 animate-scale-in">
          <div className={`h-1.5 w-full ${ui.barColor}`} />

          <div className="p-8 sm:p-10">
            <div className="flex flex-col items-center text-center">
              <div className={`mb-5 flex h-20 w-20 items-center justify-center rounded-full ${ui.bgColor} animate-[float_3s_ease-in-out_infinite]`}>
                {ui.icon}
              </div>
              <h2 className="m3-headline-m text-m3-ink">{ui.title}</h2>
              <p className="mt-2 text-[15px] text-m3-ink-muted">{ui.subtitle}</p>
            </div>

            {/* Queue position chip */}
              <div className="mt-8 flex items-center justify-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-m3-primary-container/30 px-5 py-2.5 text-sm font-bold text-m3-primary border border-m3-primary/10">
                  <span className="tabular-nums">#{live.position}</span>
                  <span className="text-m3-primary/40 text-[10px] uppercase tracking-widest px-1">of</span>
                  <span className="tabular-nums">{live.total}</span>
                  <span className="text-m3-primary/40 text-[10px] uppercase tracking-widest px-1">in queue</span>
                </div>
              </div>

            {/* Now-printing progress */}
            {live.status === 'printing' && live.pagesTotal ? (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-2 text-[11px] font-bold uppercase tracking-widest text-m3-ink-faint">
                  <span>Page {live.pagesPrinted ?? 0} of {live.pagesTotal}</span>
                  <span className="tabular-nums">
                    {Math.round(((live.pagesPrinted ?? 0) / live.pagesTotal) * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-m3-surface-container-high">
                  <div
                    className="h-full bg-m3-primary transition-all duration-700 ease-out shadow-[0_0_8px_rgba(var(--m3-primary-rgb),0.4)]"
                    style={{ width: `${((live.pagesPrinted ?? 0) / live.pagesTotal) * 100}%` }}
                  />
                </div>
              </div>
            ) : null}

            {/* Details */}
            <div className="mt-10 space-y-4 border-t border-m3-outline-variant pt-8">
              <DetailRow icon={<FileText size={16} />} label="Document">
                <span className="font-bold text-m3-ink truncate max-w-[180px]">
                  {jobName || '…'}
                </span>
              </DetailRow>
              <DetailRow icon={<Hash size={16} />} label="Reference">
                <span className="font-display text-[11px] font-black tracking-widest text-m3-ink-muted bg-m3-surface-container px-3 py-1.5 rounded-lg border border-m3-outline-variant">
                  {id.slice(0, 8).toUpperCase()}
                </span>
              </DetailRow>
              {live.eta !== undefined && (live.status === 'queued' || live.status === 'paid') && (
                <DetailRow icon={<Clock size={16} />} label="Wait Time">
                  <span className="font-bold text-m3-primary px-3 py-1.5 bg-m3-primary-container/40 rounded-lg text-xs tabular-nums border border-m3-primary/10">
                    ≈ {Math.max(1, Math.ceil(live.eta / 60))} min
                  </span>
                </DetailRow>
              )}
            </div>

            {/* Completion banner */}
            {live.status === 'completed' && (
              <div className="mt-8 rounded-2xl bg-m3-green-container/20 p-5 text-center border border-m3-green/20 animate-pulse">
                <p className="text-sm font-bold text-m3-green-container" style={{ color: '#00210b' }}>
                  ✨ Collect your prints at the counter
                </p>
              </div>
            )}

            {/* WhatsApp share / save link */}
            {user?.phone && (live.status === 'queued' || live.status === 'completed') && (
              <a
                href={`https://wa.me/${user.phone.replace(/^\+/, '')}?text=${waMessage}`}
                target="_blank"
                rel="noreferrer"
                className="mt-8 m3-btn-outlined w-full h-14"
              >
                <MessageCircle size={18} className="text-m3-green" />
                WhatsApp status updates
              </a>
            )}

            {/* Notifications hint */}
            {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' && (
              <button
                onClick={() => ensureNotificationPermission()}
                className="mt-4 m3-btn-text w-full h-12 text-m3-ink-muted"
              >
                <BellRing size={16} />
                Enable phone notifications
              </button>
            )}
          </div>
        </div>

        <Link
          href="/"
          className="mt-10 m3-btn-text text-m3-primary"
        >
          <ArrowLeft size={18} /> Back to home
        </Link>

        <footer className="mt-20">
          <p className="m3-section-eyebrow">Automation by AI &amp; ML Club</p>
        </footer>
          </>
        )}
      </div>
    </main>
  );
}

function JobSkeleton() {
  return (
    <div className="w-full space-y-8 animate-pulse">
      {/* Timeline skeleton */}
      <div className="flex w-full items-center gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-m3-surface-container-high shrink-0" />
            {i < 5 && <div className="h-1 flex-1 bg-m3-surface-container" />}
          </div>
        ))}
      </div>

      {/* Card skeleton */}
      <div className="m3-card !p-0 overflow-hidden border-m3-outline-variant">
        <div className="h-1.5 w-full bg-m3-surface-container-high" />
        <div className="p-10 flex flex-col items-center">
          <div className="h-20 w-20 rounded-full bg-m3-surface-container-high mb-6" />
          <div className="h-8 w-48 bg-m3-surface-container-high rounded-lg mb-3" />
          <div className="h-4 w-64 bg-m3-surface-container rounded-lg" />
          
          <div className="mt-10 w-full space-y-4 pt-8 border-t border-m3-outline-variant">
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-m3-surface-container rounded" />
              <div className="h-4 w-32 bg-m3-surface-container-high rounded" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-m3-surface-container rounded" />
              <div className="h-4 w-24 bg-m3-surface-container-high rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-3 text-m3-ink-muted">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}

function ConnectionPill({ connected }: { connected: boolean }) {
  return (
    <span
      className={`m3-pill border border-m3-outline-variant px-3 py-1.5 transition-all duration-500 ${
        connected ? 'bg-m3-green-container/20 text-m3-green' : 'bg-m3-surface-container text-m3-ink-muted'
      }`}
    >
      <span className={`relative flex h-2 w-2 mr-1.5 ${connected ? '' : 'opacity-40'}`}>
        <span className={`absolute inline-flex h-full w-full rounded-full ${connected ? 'bg-m3-green animate-ping' : ''} opacity-75`}></span>
        <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? 'bg-m3-green' : 'bg-m3-outline'}`}></span>
      </span>
      {connected ? 'Connected' : 'Offline'}
    </span>
  );
}

function Timeline({ status }: { status: PrintJobStatus }) {
  const finished = status === 'failed' || status === 'cancelled';
  const idx = PIPELINE.indexOf(status === 'failed' ? 'completed' : status);
  const labels: Record<PrintJobStatus, string> = {
    created: 'Created',
    paid: 'Paid',
    queued: 'Queued',
    printing: 'Printing',
    completed: 'Ready',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };

  if (finished) {
    return (
      <div className="w-full rounded-2xl bg-m3-red-container/20 px-4 py-3 text-center text-xs font-bold uppercase tracking-widest text-m3-red border border-m3-red/20">
        {labels[status]}
      </div>
    );
  }

  return (
    <div className="flex w-full items-center">
      {PIPELINE.map((s, i) => {
        const active = i <= idx;
        return (
          <div key={s} className="flex flex-1 items-center">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black transition-all duration-300 ${
                active ? 'bg-m3-primary text-white shadow-elev-1' : 'bg-m3-surface-container-high text-m3-ink-faint'
              }`}
              title={labels[s]}
            >
              {i + 1}
            </div>
            {i < PIPELINE.length - 1 && (
              <div className={`h-1 flex-1 transition-all duration-500 ${i < idx ? 'bg-m3-primary' : 'bg-m3-outline-variant'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const STATUS_TEXT: Record<PrintJobStatus, { toast: string; variant: 'info' | 'success' | 'error' }> = {
  created: { toast: 'Job created', variant: 'info' },
  paid: { toast: 'Payment confirmed — adding to the queue', variant: 'success' },
  queued: { toast: 'You\'re in the queue!', variant: 'info' },
  printing: { toast: 'Now printing your document', variant: 'info' },
  completed: { toast: 'Ready for pickup at the counter ✨', variant: 'success' },
  failed: { toast: 'Print failed — refund initiated', variant: 'error' },
  cancelled: { toast: 'Job cancelled', variant: 'error' },
};

const STATUS_UI: Record<
  PrintJobStatus,
  { title: string; subtitle: string; icon: React.ReactNode; bgColor: string; barColor: string }
> = {
  created: {
    title: 'Awaiting Payment',
    subtitle: 'Complete payment to start printing',
    icon: <Clock size={40} className="text-m3-ink-faint" />,
    bgColor: 'bg-m3-surface-container',
    barColor: 'bg-m3-outline-variant',
  },
  paid: {
    title: 'Payment Confirmed',
    subtitle: 'Adding to the print queue…',
    icon: <Loader2 size={40} className="animate-spin text-m3-primary" />,
    bgColor: 'bg-m3-primary-container/20',
    barColor: 'bg-m3-primary/40',
  },
  queued: {
    title: 'In Queue',
    subtitle: 'Waiting for a free printer',
    icon: <Clock size={40} className="text-m3-primary" />,
    bgColor: 'bg-m3-primary-container/20',
    barColor: 'bg-m3-primary',
  },
  printing: {
    title: 'Printing Now',
    subtitle: 'Your document is on the printer',
    icon: <Printer size={40} className="text-m3-primary" />,
    bgColor: 'bg-m3-primary-container/20',
    barColor: 'bg-m3-primary',
  },
  completed: {
    title: 'Ready for Pickup',
    subtitle: 'Your prints are waiting at the counter',
    icon: <CheckCircle2 size={40} className="text-m3-green" />,
    bgColor: 'bg-m3-green-container/20',
    barColor: 'bg-m3-green',
  },
  failed: {
    title: 'Print Failed',
    subtitle: 'Refund has been initiated automatically',
    icon: <XCircle size={40} className="text-m3-red" />,
    bgColor: 'bg-m3-red-container/20',
    barColor: 'bg-m3-red',
  },
  cancelled: {
    title: 'Job Cancelled',
    subtitle: 'This print job was cancelled',
    icon: <XCircle size={40} className="text-m3-ink-faint" />,
    bgColor: 'bg-m3-surface-container',
    barColor: 'bg-m3-outline-variant',
  },
};
