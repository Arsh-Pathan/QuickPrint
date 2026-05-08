import { Printer, AlertTriangle, CheckCircle2, Wifi, WifiOff } from 'lucide-react';

export default function PrintersPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 py-2">
      <header>
        <h1 className="text-[24px] font-normal text-[#202124]">Printers</h1>
        <p className="mt-1 text-[13px] text-[#5f6368]">Status & health, reported by the local agent</p>
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
    <div className="google-card" style={{ animation: 'fadeInUp 0.4s ease-out' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`grid h-11 w-11 place-items-center rounded-xl ${ok ? 'bg-emerald-50' : 'bg-[#f1f3f4]'}`}>
            <Printer className={`h-5 w-5 ${ok ? 'text-emerald-600' : 'text-[#5f6368]'}`} />
          </div>
          <div>
            <p className="text-[14px] font-medium text-[#202124]">{name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {ok ? (
                <Wifi className="h-3 w-3 text-emerald-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-[#bdc1c6]" />
              )}
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${ok ? 'text-emerald-600' : 'text-[#9aa0a6]'}`}>
                {status}
              </p>
            </div>
          </div>
        </div>
        {ok ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        )}
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Paper" value={paper === null ? '—' : `${paper}%`} />
        <Metric label="Toner" value={toner === null ? '—' : `${toner}%`} />
      </dl>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#dadce0] px-3.5 py-2.5 transition-colors hover:bg-[#f8f9fa]">
      <dt className="text-[11px] font-medium text-[#70757a] uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-[15px] font-bold text-[#202124] tabular-nums">{value}</dd>
    </div>
  );
}
