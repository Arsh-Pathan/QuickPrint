import { Printer, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function PrintersPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Printers</h1>
        <p className="text-sm text-slate-500">Status & health, reported by the local agent</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PrinterCard name="Loading…" status="offline" paper={null} toner={null} />
      </div>
    </div>
  );
}

function PrinterCard({
  name,
  status,
  paper,
  toner,
}: {
  name: string;
  status: 'online' | 'offline' | 'paper_out' | 'jam' | 'error';
  paper: number | null;
  toner: number | null;
}) {
  const ok = status === 'online';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">{name}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">{status}</p>
          </div>
        </div>
        {ok ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        )}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Paper" value={paper === null ? '—' : `${paper}%`} />
        <Metric label="Toner" value={toner === null ? '—' : `${toner}%`} />
      </dl>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
