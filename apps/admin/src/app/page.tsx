import { StatCard } from '@/components/stat-card';
import { Banknote, FileText, Printer, Clock } from 'lucide-react';

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-slate-500">Today's snapshot</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Earnings today" value="—" hint="Live from payments" icon={<Banknote />} />
        <StatCard label="Jobs printed" value="—" hint="Completed" icon={<FileText />} />
        <StatCard label="Queue length" value="—" hint="Waiting" icon={<Clock />} />
        <StatCard label="Printers online" value="—" hint="Healthy" icon={<Printer />} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Recent activity</h2>
        <p className="mt-2 text-sm text-slate-500">
          System events will stream here once the realtime gateway is wired to the dashboard.
        </p>
      </section>
    </div>
  );
}
