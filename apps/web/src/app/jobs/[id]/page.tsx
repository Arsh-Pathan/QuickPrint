'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, Clock, Loader2, Printer, XCircle, ArrowLeft, FileText, Hash } from 'lucide-react';
import { api } from '@/lib/api';
import { useJobSocket } from '@/lib/use-job-socket';
import { useAuth } from '@/lib/store';
import type { PrintJobStatus } from '@quickprint/shared';

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const [status, setStatus] = useState<PrintJobStatus>('created');
  const [eta, setEta] = useState<number | undefined>();
  const [jobName, setJobName] = useState<string>('');

  useEffect(() => {
    if (!token) {
      router.push(`/login?next=/jobs/${id}`);
      return;
    }
    api.getJob(id).then((j: any) => {
      setStatus(j.status as PrintJobStatus);
      setJobName(j.fileName);
    });
  }, [id, token, router]);

  useJobSocket(id, (evt) => {
    setStatus(evt.status);
    setEta(evt.eta);
  });

  const ui = STATUS_UI[status] || STATUS_UI.created;

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#f8f9fa] px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex w-full max-w-md flex-col items-center">
        {/* Header */}
        <header className="mb-10 flex flex-col items-center gap-3">
          <Link href="/" className="transition-transform hover:scale-105">
            <Image 
              src="/logo.svg" 
              alt="QuickPrint" 
              width={160} 
              height={70} 
              className="h-12 w-auto object-contain"
            />
          </Link>
          <h1 className="text-[20px] font-normal text-[#202124]">Print Status</h1>
        </header>

        {/* Status card */}
        <div className="google-card w-full !p-0 overflow-hidden" style={{ animation: 'scaleIn 0.3s ease-out' }}>
          {/* Status color bar */}
          <div className={`h-1.5 w-full ${ui.barColor}`} />

          {/* Status content */}
          <div className="p-8 sm:p-10">
            <div className="flex flex-col items-center text-center">
              <div className={`mb-5 flex h-20 w-20 items-center justify-center rounded-full ${ui.bgColor}`}>
                {ui.icon}
              </div>
              <h2 className="text-[22px] font-medium text-[#202124]">{ui.title}</h2>
              <p className="mt-1.5 text-[14px] text-[#5f6368]">{ui.subtitle}</p>
            </div>

            {/* Details */}
            <div className="mt-8 space-y-3 border-t border-[#dadce0] pt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-[#5f6368]">
                  <FileText className="h-4 w-4" />
                  Document
                </span>
                <span className="font-medium text-[#202124] truncate max-w-[180px]">{jobName || '...'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-[#5f6368]">
                  <Hash className="h-4 w-4" />
                  Reference
                </span>
                <span className="font-mono text-xs font-medium text-[#70757a] bg-[#f1f3f4] px-2.5 py-1 rounded-full">
                  {id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              {eta !== undefined && status === 'queued' && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[#5f6368]">
                    <Clock className="h-4 w-4" />
                    Wait time
                  </span>
                  <span className="font-bold text-brand-600 px-3 py-1 bg-brand-50 rounded-full text-xs">
                    ≈ {Math.ceil(eta / 60)} min
                  </span>
                </div>
              )}
            </div>

            {/* Success message */}
            {status === 'completed' && (
              <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-center border border-emerald-100">
                <p className="text-sm font-medium text-emerald-800">
                  ✨ Collect your prints at the counter
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Back link */}
        <Link 
          href="/"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors rounded-full hover:bg-brand-50 px-4 py-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <footer className="mt-20 flex flex-col items-center gap-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#bdc1c6]">
            Automation by AI & ML Club
          </p>
        </footer>
      </div>
    </main>
  );
}

const STATUS_UI: Record<PrintJobStatus, {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bgColor: string;
  barColor: string;
}> = {
  created: {
    title: 'Awaiting Payment',
    subtitle: 'Complete payment to start printing',
    icon: <Clock className="h-10 w-10 text-[#9aa0a6]" />,
    bgColor: 'bg-[#f1f3f4]',
    barColor: 'bg-[#dadce0]',
  },
  paid: {
    title: 'Payment Confirmed',
    subtitle: 'Adding to the print queue...',
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
    subtitle: 'Your document is being printed',
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
