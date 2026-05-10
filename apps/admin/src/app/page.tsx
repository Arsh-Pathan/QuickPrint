'use client';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  FileText,
  Printer,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { api, type AdminStats, type PrintJob, type PrinterRow } from '@/lib/api';
import { rupees, relativeTime } from '@/lib/format';
import { SHOP_ID } from '@/lib/config';

export default function OverviewPage() {
  const stats = useQuery({
    queryKey: ['admin-stats', SHOP_ID],
    queryFn: () => api.get<AdminStats>(`/print-jobs/admin/stats?shopId=${SHOP_ID}`),
    refetchInterval: 15_000,
  });

  const recent = useQuery({
    queryKey: ['admin-jobs', SHOP_ID],
    queryFn: () =>
      api.get<PrintJob[]>(`/print-jobs/admin/list?shopId=${SHOP_ID}&limit=10`),
    refetchInterval: 15_000,
  });

  const printers = useQuery({
    queryKey: ['printers', SHOP_ID],
    queryFn: () => api.get<PrinterRow[]>(`/printers?shopId=${SHOP_ID}`),
    refetchInterval: 15_000,
  });

  const printersOnline = (printers.data ?? []).filter((p) => p.status === 'ONLINE').length;
  const printersTotal = (printers.data ?? []).length;
  const s = stats.data;

  return (
    <div className="mx-auto max-w-7xl space-y-8 py-2">
      <header>
        <h1 className="text-[24px] font-normal text-[#202124]">Overview</h1>
        <p className="mt-1 text-[13px] text-[#5f6368]">
          Welcome back to QuickPrint Admin Console
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Earnings Today"
          value={s ? rupees(s.earningsTodayPaise) : '—'}
          hint="Captured payments since midnight"
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="Jobs Completed"
          value={s ? String(s.jobsCompletedToday) : '—'}
          hint={
            s && s.jobsFailedToday > 0
              ? `${s.jobsFailedToday} failed today`
              : 'Successfully printed today'
          }
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Queue Length"
          value={s ? String(s.jobsInQueue) : '—'}
          hint="Jobs waiting or printing"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Printers Online"
          value={
            printers.isLoading
              ? '—'
              : printersTotal === 0
              ? '0'
              : `${printersOnline}/${printersTotal}`
          }
          hint={printersTotal === 0 ? 'No printers registered yet' : 'Healthy printers'}
          icon={<Printer className="h-4 w-4" />}
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-medium text-[#202124]">Recent activity</h2>
          {recent.isFetching && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9aa0a6]" />
          )}
        </div>

        <div className="google-card !p-0 overflow-hidden">
          {recent.isLoading ? (
            <div className="grid place-items-center py-12 text-[#9aa0a6]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (recent.data?.length ?? 0) === 0 ? (
            <EmptyActivity />
          ) : (
            <ul className="divide-y divide-[#dadce0]">
              {recent.data!.map((j) => (
                <ActivityRow key={j.id} job={j} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function ActivityRow({ job }: { job: PrintJob }) {
  const icon =
    job.status === 'COMPLETED' ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    ) : job.status === 'FAILED' || job.status === 'CANCELLED' ? (
      <XCircle className="h-4 w-4 text-rose-500" />
    ) : (
      <Activity className="h-4 w-4 text-blue-500" />
    );

  const when = job.printedAt ?? job.paidAt ?? job.createdAt;

  return (
    <li className="flex items-center justify-between px-5 py-3 hover:bg-[#f8f9fa]">
      <div className="flex items-center gap-3 min-w-0">
        {icon}
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#202124] truncate">{job.fileName}</p>
          <p className="text-[11px] text-[#5f6368]">
            {job.pages} page{job.pages === 1 ? '' : 's'} · {job.color ? 'Color' : 'B&W'} ·{' '}
            {job.copies > 1 ? `×${job.copies} · ` : ''}
            {rupees(job.priceTotalPaise)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-right">
        <span
          className={`text-[11px] font-semibold uppercase tracking-wide ${
            job.status === 'COMPLETED'
              ? 'text-emerald-600'
              : job.status === 'FAILED'
              ? 'text-rose-600'
              : job.status === 'CANCELLED'
              ? 'text-[#9aa0a6]'
              : 'text-blue-600'
          }`}
        >
          {job.status.toLowerCase()}
        </span>
        <span className="text-[11px] text-[#9aa0a6] tabular-nums w-20">
          {relativeTime(when)}
        </span>
      </div>
    </li>
  );
}

function EmptyActivity() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-[#f1f3f4]">
        <Activity className="h-5 w-5 text-[#bdc1c6]" />
      </div>
      <p className="text-[13px] font-medium text-[#202124]">No recent activity</p>
      <p className="mt-1 text-[12px] text-[#5f6368]">
        Print jobs will appear here as they go through the system.
      </p>
    </div>
  );
}
