'use client';
import { use, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, Printer, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useJobSocket } from '@/lib/use-job-socket';
import type { PrintJobStatus } from '@quickprint/shared';

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [status, setStatus] = useState<PrintJobStatus>('created');
  const [eta, setEta] = useState<number | undefined>();

  useEffect(() => {
    api.getJob(id).then((j) => setStatus(j.status as PrintJobStatus));
  }, [id]);

  useJobSocket(id, (evt) => {
    setStatus(evt.status);
    setEta(evt.eta);
  });

  const onPay = async () => {
    const order = await api.createOrder(id);
    // TODO: open Razorpay checkout with `order` here
    console.log('open Razorpay with', order);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <h1 className="text-2xl font-bold">Your print job</h1>
      <p className="mt-1 font-mono text-xs text-slate-500">{id}</p>

      <StatusCard status={status} eta={eta} />

      {status === 'created' && (
        <button
          onClick={onPay}
          className="mt-8 rounded-xl bg-brand py-4 font-semibold text-white shadow-lg shadow-brand/30"
        >
          Pay now
        </button>
      )}
    </main>
  );
}

function StatusCard({ status, eta }: { status: PrintJobStatus; eta?: number }) {
  const ui = STATUS_UI[status];
  return (
    <div className={`mt-8 rounded-2xl border p-5 ${ui.bg}`}>
      <div className="flex items-center gap-3">
        {ui.icon}
        <div>
          <p className="font-semibold">{ui.title}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{ui.subtitle}</p>
        </div>
      </div>
      {eta !== undefined && status === 'queued' && (
        <p className="mt-3 text-sm text-slate-500">≈ {Math.ceil(eta / 60)} min</p>
      )}
    </div>
  );
}

const STATUS_UI: Record<PrintJobStatus, {
  title: string;
  subtitle: string;
  bg: string;
  icon: React.ReactNode;
}> = {
  created: {
    title: 'Awaiting payment',
    subtitle: 'Tap pay to continue',
    bg: 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900',
    icon: <Clock className="h-6 w-6 text-slate-500" />,
  },
  paid: {
    title: 'Payment received',
    subtitle: 'Joining the queue…',
    bg: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950',
    icon: <Loader2 className="h-6 w-6 animate-spin text-amber-600" />,
  },
  queued: {
    title: 'In queue',
    subtitle: 'Hang tight, your turn is coming',
    bg: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950',
    icon: <Clock className="h-6 w-6 text-amber-600" />,
  },
  printing: {
    title: 'Printing now',
    subtitle: 'Almost done',
    bg: 'border-brand-50 bg-brand-50 dark:border-indigo-900 dark:bg-indigo-950',
    icon: <Printer className="h-6 w-6 text-brand" />,
  },
  completed: {
    title: 'Ready for pickup',
    subtitle: 'Show this screen at the counter',
    bg: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950',
    icon: <CheckCircle2 className="h-6 w-6 text-emerald-600" />,
  },
  failed: {
    title: 'Print failed',
    subtitle: 'Refund initiated. Contact the counter.',
    bg: 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950',
    icon: <XCircle className="h-6 w-6 text-rose-600" />,
  },
  cancelled: {
    title: 'Cancelled',
    subtitle: '',
    bg: 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900',
    icon: <XCircle className="h-6 w-6 text-slate-500" />,
  },
};
