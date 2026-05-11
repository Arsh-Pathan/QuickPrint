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

  // Live socket state — drives everything below.
  const live = useJobSocket(id, { status: 'created' }, (next, prev) => {
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
    });
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
    <main className="flex min-h-screen flex-col items-center bg-[#f8f9fa] px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex w-full max-w-md flex-col items-center">
        <header className="mb-8 flex flex-col items-center gap-3">
          <Link href="/" className="transition-transform hover:scale-105">
            <Image src="/logo.svg" alt="QuickPrint" width={160} height={70} className="h-12 w-auto object-contain" />
          </Link>
          <h1 className="text-[20px] font-normal text-[#202124]">Print Status</h1>
          <ConnectionPill connected={live.connected} />
        </header>

        {/* Pipeline (created → completed) */}
        <Timeline status={live.status} />

        {/* Status card */}
        <div className="google-card mt-6 w-full !p-0 overflow-hidden" style={{ animation: 'scaleIn 0.3s ease-out' }}>
          <div className={`h-1.5 w-full ${ui.barColor}`} />

          <div className="p-8 sm:p-10">
            <div className="flex flex-col items-center text-center">
              <div className={`mb-5 flex h-20 w-20 items-center justify-center rounded-full ${ui.bgColor}`}>
                {ui.icon}
              </div>
              <h2 className="text-[22px] font-medium text-[#202124]">{ui.title}</h2>
              <p className="mt-1.5 text-[14px] text-[#5f6368]">{ui.subtitle}</p>
            </div>

            {/* Queue position chip */}
            {live.status === 'queued' && live.position && live.total && (
              <div className="mt-6 flex items-center justify-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700">
                  <span className="tabular-nums">#{live.position}</span>
                  <span className="text-brand-400">of</span>
                  <span className="tabular-nums">{live.total}</span>
                  <span className="text-brand-400">in queue</span>
                </div>
              </div>
            )}

            {/* Now-printing progress */}
            {live.status === 'printing' && live.pagesTotal ? (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2 text-xs text-[#5f6368]">
                  <span>Page {live.pagesPrinted ?? 0} of {live.pagesTotal}</span>
                  <span className="tabular-nums">
                    {Math.round(((live.pagesPrinted ?? 0) / live.pagesTotal) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f1f3f4]">
                  <div
                    className="h-full bg-brand-500 transition-all duration-500"
                    style={{ width: `${((live.pagesPrinted ?? 0) / live.pagesTotal) * 100}%` }}
                  />
                </div>
              </div>
            ) : null}

            {/* Details */}
            <div className="mt-8 space-y-3 border-t border-[#dadce0] pt-6">
              <DetailRow icon={<FileText className="h-4 w-4" />} label="Document">
                <span className="font-medium text-[#202124] truncate max-w-[180px]">
                  {jobName || '…'}
                </span>
              </DetailRow>
              <DetailRow icon={<Hash className="h-4 w-4" />} label="Reference">
                <span className="font-mono text-xs font-medium text-[#70757a] bg-[#f1f3f4] px-2.5 py-1 rounded-full">
                  {id.slice(0, 8).toUpperCase()}
                </span>
              </DetailRow>
              {live.eta !== undefined && (live.status === 'queued' || live.status === 'paid') && (
                <DetailRow icon={<Clock className="h-4 w-4" />} label="Estimated wait">
                  <span className="font-bold text-brand-600 px-3 py-1 bg-brand-50 rounded-full text-xs tabular-nums">
                    ≈ {Math.max(1, Math.ceil(live.eta / 60))} min
                  </span>
                </DetailRow>
              )}
            </div>

            {/* Completion banner */}
            {live.status === 'completed' && (
              <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-center border border-emerald-100">
                <p className="text-sm font-medium text-emerald-800">
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
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#dadce0] bg-white px-4 py-2.5 text-sm font-medium text-[#3c4043] hover:bg-[#f8f9fa] transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                Send status to my WhatsApp
              </a>
            )}

            {/* Notifications hint */}
            {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' && (
              <button
                onClick={() => ensureNotificationPermission()}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f8f9fa] px-4 py-2 text-xs font-medium text-[#5f6368] hover:bg-[#f1f3f4] transition-colors"
              >
                <BellRing className="h-3.5 w-3.5" />
                Enable phone notifications
              </button>
            )}
          </div>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors rounded-full hover:bg-brand-50 px-4 py-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <footer className="mt-16 flex flex-col items-center gap-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#bdc1c6]">
            Automation by AI &amp; ML Club
          </p>
        </footer>
      </div>
    </main>
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
      <span className="flex items-center gap-2 text-[#5f6368]">
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        connected ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f1f3f4] text-[#5f6368]'
      }`}
    >
      {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {connected ? 'Live' : 'Reconnecting…'}
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
      <div className="w-full rounded-full bg-red-50 px-4 py-2 text-center text-xs font-medium text-[#d93025]">
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
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                active ? 'bg-brand-500 text-white' : 'bg-[#f1f3f4] text-[#9aa0a6]'
              }`}
              title={labels[s]}
            >
              {i + 1}
            </div>
            {i < PIPELINE.length - 1 && (
              <div className={`h-0.5 flex-1 transition-colors ${i < idx ? 'bg-brand-500' : 'bg-[#dadce0]'}`} />
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
    icon: <Clock className="h-10 w-10 text-[#9aa0a6]" />,
    bgColor: 'bg-[#f1f3f4]',
    barColor: 'bg-[#dadce0]',
  },
  paid: {
    title: 'Payment Confirmed',
    subtitle: 'Adding to the print queue…',
    icon: <Loader2 className="h-10 w-10 animate-spin text-brand-500" />,
    bgColor: 'bg-brand-50',
    barColor: 'bg-brand-400',
  },
  queued: {
    title: 'In Queue',
    subtitle: 'Waiting for a free printer',
    icon: <Clock className="h-10 w-10 text-brand-500" />,
    bgColor: 'bg-brand-50',
    barColor: 'bg-brand-500',
  },
  printing: {
    title: 'Printing Now',
    subtitle: 'Your document is on the printer',
    icon: <Printer className="h-10 w-10 text-brand-600" />,
    bgColor: 'bg-brand-50',
    barColor: 'bg-brand-600',
  },
  completed: {
    title: 'Ready for Pickup',
    subtitle: 'Your prints are waiting at the counter',
    icon: <CheckCircle2 className="h-10 w-10 text-emerald-500" />,
    bgColor: 'bg-emerald-50',
    barColor: 'bg-emerald-500',
  },
  failed: {
    title: 'Print Failed',
    subtitle: 'Refund has been initiated automatically',
    icon: <XCircle className="h-10 w-10 text-[#d93025]" />,
    bgColor: 'bg-red-50',
    barColor: 'bg-[#d93025]',
  },
  cancelled: {
    title: 'Job Cancelled',
    subtitle: 'This print job was cancelled',
    icon: <XCircle className="h-10 w-10 text-[#bdc1c6]" />,
    bgColor: 'bg-[#f1f3f4]',
    barColor: 'bg-[#bdc1c6]',
  },
};
