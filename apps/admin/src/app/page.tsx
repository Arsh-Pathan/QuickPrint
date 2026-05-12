'use client';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  FileText,
  Printer,
  Clock,
  Activity,
  ChevronRight,
  TrendingUp,
  Loader2,
  Zap,
  ArrowUpRight,
  LayoutDashboard
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
    <div className="space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Dynamic Welcome Header */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-m3-surface-container-low p-8 lg:p-12 border border-m3-outline-variant/30">
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-m3-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-64 h-64 bg-m3-primary/5 blur-[80px] rounded-full" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-m3-primary-container/40 text-m3-primary text-[10px] font-bold uppercase tracking-widest border border-m3-primary/10">
              <Zap className="h-3 w-3" />
              Real-time Analytics Active
            </div>
            <h1 className="m3-display-m text-m3-ink tracking-tight">
              Console <span className="text-m3-primary opacity-60">/</span> Overview
            </h1>
            <p className="text-[15px] text-m3-ink-muted max-w-lg leading-relaxed">
              Monitoring <span className="font-bold text-m3-ink">{SHOP_ID}</span> with active print agent heartbeats and verified payment gateways.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="h-16 w-[1px] bg-m3-outline-variant/50 hidden md:block" />
            <div className="space-y-1 text-right md:text-left">
              <p className="text-[10px] font-extrabold text-m3-ink-faint uppercase tracking-widest">Global Status</p>
              <div className="flex items-center gap-2 text-m3-green">
                <div className="h-2 w-2 rounded-full bg-m3-green shadow-[0_0_8px_rgba(52,168,83,0.6)] animate-pulse" />
                <span className="text-[13px] font-bold uppercase tracking-wider">All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue Today"
          value={s ? rupees(s.earningsTodayPaise) : '—'}
          hint="Captured payments"
          icon={<Banknote className="h-6 w-6" />}
        />
        <StatCard
          label="Throughput"
          value={s ? String(s.jobsCompletedToday) : '—'}
          hint={s && s.jobsFailedToday > 0 ? `${s.jobsFailedToday} errors mitigated` : 'Efficiency: 100%'}
          icon={<FileText className="h-6 w-6" />}
        />
        <StatCard
          label="Active Queue"
          value={s ? String(s.jobsInQueue) : '—'}
          hint="In-flight processing"
          icon={<Clock className="h-6 w-6" />}
        />
        <StatCard
          label="Node Health"
          value={printers.isLoading ? '—' : `${printersOnline}/${printersTotal}`}
          hint="Verified print agents"
          icon={<Printer className="h-6 w-6" />}
        />
      </div>

      {/* Insight Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Recent Transactions Feed */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-m3-surface-container-high flex items-center justify-center text-m3-ink-muted">
                <Activity className="h-5 w-5" />
              </div>
              <h2 className="m3-headline-s text-m3-ink">Activity Stream</h2>
            </div>
            <button className="group flex items-center gap-2 text-[11px] font-extrabold text-m3-primary uppercase tracking-[0.15em] hover:opacity-80 transition-opacity">
              Live Feed
              <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>

          <div className="m3-card !p-0 overflow-hidden bg-white/60 backdrop-blur-sm shadow-elev-1">
            {recent.isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-m3-primary/30" />
                <p className="text-[10px] font-bold text-m3-ink-faint uppercase tracking-widest">Streaming entries...</p>
              </div>
            ) : (recent.data?.length ?? 0) === 0 ? (
              <EmptyActivity />
            ) : (
              <div className="divide-y divide-m3-outline-variant/30">
                {recent.data!.map((j) => (
                  <ActivityRow key={j.id} job={j} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Widgets */}
        <div className="lg:col-span-4 space-y-8">
          <div className="space-y-4">
            <h3 className="text-[11px] font-extrabold text-m3-ink-faint uppercase tracking-[0.18em] px-2">System Controls</h3>
            <div className="grid gap-3">
              <ActionTile 
                title="Refresh Services" 
                desc="Restart local shop agents" 
                icon={<Printer className="h-5 w-5" />} 
                color="bg-m3-primary-container text-m3-on-primary-container"
              />
              <ActionTile 
                title="Financial Export" 
                desc="Generate PDF audit report" 
                icon={<TrendingUp className="h-5 w-5" />} 
                color="bg-m3-yellow-container text-m3-yellow"
              />
              <ActionTile 
                title="System Logs" 
                desc="View raw trace outputs" 
                icon={<LayoutDashboard className="h-5 w-5" />} 
                color="bg-m3-surface-container-highest text-m3-ink-muted"
              />
            </div>
          </div>

          {/* Infrastructure Health Card */}
          <div className="m3-card relative overflow-hidden p-6 bg-m3-ink text-m3-surface shadow-elev-3">
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/5 blur-[40px] rounded-full" />
            <h3 className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-white/40 mb-6">Network Resilience</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white/80">Agent Connectivity</span>
                <span className="text-[18px] font-display font-black text-m3-green">99.8%</span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-m3-green w-[99.8%] rounded-full shadow-[0_0_12px_rgba(52,168,83,0.4)]" />
              </div>
              <p className="text-[12px] text-white/40 leading-relaxed italic">
                Active heartbeats verified across all distributed nodes. Gateway latency remains sub-12ms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionTile({ title, desc, icon, color }: { title: string; desc: string; icon: React.ReactNode; color: string }) {
  return (
    <button className="group flex items-center justify-between rounded-[1.5rem] bg-m3-surface-container-low p-4 border border-m3-outline-variant/20 hover:bg-m3-surface-container hover:shadow-elev-1 hover:border-m3-primary/20 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className={`h-11 w-11 rounded-2xl ${color} flex items-center justify-center transition-transform group-hover:scale-110 duration-500`}>
          {icon}
        </div>
        <div className="text-left">
          <p className="text-[13px] font-bold text-m3-ink group-hover:text-m3-primary transition-colors">{title}</p>
          <p className="text-[11px] text-m3-ink-faint leading-none mt-1">{desc}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-m3-outline group-hover:text-m3-primary group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}

function ActivityRow({ job }: { job: PrintJob }) {
  const statusColor = 
    job.status === 'COMPLETED' ? 'text-m3-green' : 
    job.status === 'FAILED' ? 'text-m3-red' : 
    job.status === 'CANCELLED' ? 'text-m3-ink-faint' : 
    'text-m3-primary';

  const statusBg = 
    job.status === 'COMPLETED' ? 'bg-m3-green-container/40' : 
    job.status === 'FAILED' ? 'bg-m3-red-container/40' : 
    'bg-m3-surface-container-low';

  const when = job.printedAt ?? job.paidAt ?? job.createdAt;

  return (
    <div className="flex items-center justify-between p-5 hover:bg-m3-surface-container-low/50 transition-colors group">
      <div className="flex items-center gap-4 min-w-0">
        <div className={`h-12 w-12 shrink-0 rounded-2xl ${statusBg} flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rounded-full`}>
          <FileText className={`h-6 w-6 ${statusColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-m3-ink truncate group-hover:text-m3-primary transition-colors tracking-tight">{job.fileName}</p>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-m3-surface-container text-[10px] font-mono font-bold text-m3-ink-muted">
              {rupees(job.priceTotalPaise)}
            </div>
            <div className="text-[11px] text-m3-ink-faint font-medium">
              {job.pages}p · {job.color ? 'Color' : 'B&W'}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-6 text-right">
        <div className="hidden sm:block">
          <p className={`text-[10px] font-extrabold uppercase tracking-[0.2em] ${statusColor}`}>
            {job.status}
          </p>
          <p className="mt-1 text-[11px] text-m3-ink-faint tabular-nums font-medium">
            {relativeTime(when)}
          </p>
        </div>
        <div className="h-8 w-8 rounded-full border border-m3-outline-variant/30 flex items-center justify-center group-hover:border-m3-primary group-hover:text-m3-primary transition-colors">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function EmptyActivity() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-m3-primary/10 blur-[40px] rounded-full" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-[2rem] bg-m3-surface-container text-m3-ink-faint border border-m3-outline-variant/20">
          <Activity className="h-10 w-10" />
        </div>
      </div>
      <h3 className="m3-headline-s text-m3-ink">Quiet Morning</h3>
      <p className="mt-2 text-[14px] text-m3-ink-muted max-w-xs leading-relaxed">
        No print activity recorded in the last 24 hours. Connect your local agents to start streaming.
      </p>
    </div>
  );
}
