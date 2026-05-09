'use client';
import { useQuery } from '@tanstack/react-query';
import {
  Printer,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Loader2,
  Power,
} from 'lucide-react';
import { api, type PrinterRow } from '@/lib/api';
import { relativeTime } from '@/lib/format';

const SHOP_ID = 'shop_local_dev';

export default function PrintersPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['printers', SHOP_ID],
    queryFn: () => api.get<PrinterRow[]>(`/printers?shopId=${SHOP_ID}`),
    refetchInterval: 15_000,
  });

  const printers = data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-8 py-2">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-[24px] font-normal text-[#202124]">Printers</h1>
          <p className="mt-1 text-[13px] text-[#5f6368]">
            Status & health, reported by the local agent
          </p>
        </div>
        {isFetching && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#9aa0a6]">
            <Loader2 className="h-3 w-3 animate-spin" /> Refreshing
          </span>
        )}
      </header>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-[#9aa0a6]" />
        </div>
      ) : isError ? (
        <div className="google-card text-center py-12">
          <p className="text-[14px] font-medium text-[#b91c1c]">Could not load printers</p>
          <button
            onClick={() => refetch()}
            className="mt-3 rounded-lg border border-[#dadce0] bg-white px-3 py-1.5 text-[12px] text-[#3c4043] hover:bg-[#f1f3f4]"
          >
            Try again
          </button>
        </div>
      ) : printers.length === 0 ? (
        <div className="google-card text-center py-16">
          <div className="mb-4 mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f1f3f4]">
            <Power className="h-5 w-5 text-[#bdc1c6]" />
          </div>
          <p className="text-[14px] font-medium text-[#202124]">No printers registered</p>
          <p className="mt-1 text-[12px] text-[#5f6368] max-w-md mx-auto">
            The print agent will register printers here once it discovers them on the shop
            network.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {printers.map((p) => (
            <PrinterCard key={p.id} printer={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PrinterCard({ printer }: { printer: PrinterRow }) {
  const ok = printer.status === 'ONLINE';
  const busy = printer.status === 'BUSY';
  const paper = printer.status === 'PAPER_OUT';
  const ink = printer.status === 'TONER_LOW';
  const err = printer.status === 'OFFLINE' || printer.status === 'JAM' || printer.status === 'ERROR';

  const accent = ok ? 'bg-emerald-50' : busy ? 'bg-blue-50' : paper || ink ? 'bg-amber-50' : 'bg-rose-50';
  const icon = ok ? 'text-emerald-600' : busy ? 'text-blue-600' : paper || ink ? 'text-amber-600' : 'text-rose-600';

  const StatusIcon = () => {
    if (busy) return <Loader2 className={`h-5 w-5 ${icon} animate-spin`} />;
    if (paper || ink) return <AlertTriangle className={`h-5 w-5 ${icon} animate-bounce`} />;
    if (ok) return <CheckCircle2 className={`h-5 w-5 ${icon}`} />;
    return <AlertTriangle className={`h-5 w-5 ${icon}`} />;
  };

  const getStatusText = () => {
    switch (printer.status) {
      case 'ONLINE': return 'IDLE (READY)';
      case 'BUSY': return 'PRINTING...';
      case 'PAPER_OUT': return 'NEEDS PAPER REFILL';
      case 'TONER_LOW': return 'NEEDS INK REFILL';
      case 'JAM': return 'PAPER JAM';
      default: return printer.status.replace('_', ' ');
    }
  };

  return (
    <div className={`google-card transition-all duration-300 ${err ? 'opacity-75 grayscale-[0.5]' : ''}`} style={{ animation: 'fadeInUp 0.4s ease-out' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`grid h-11 w-11 place-items-center rounded-xl transition-all duration-500 ${accent} ${busy ? 'animate-pulse' : ''}`}>
            <Printer className={`h-5 w-5 transition-colors ${icon}`} />
          </div>
          <div>
            <p className="text-[14px] font-medium text-[#202124]">{printer.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {ok || busy ? (
                <div className="relative flex h-3 w-3 items-center justify-center">
                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${busy ? 'animate-ping bg-blue-400' : ok ? 'animate-pulse bg-emerald-400' : ''}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${busy ? 'bg-blue-500' : ok ? 'bg-emerald-500' : ''}`}></span>
                </div>
              ) : (
                <WifiOff className="h-3 w-3 text-[#bdc1c6]" />
              )}
              <p className={`text-[11px] font-bold uppercase tracking-wider ${icon}`}>
                {getStatusText()}
              </p>
            </div>
          </div>
        </div>
        <StatusIcon />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Color" value={printer.supportsColor ? 'Yes' : 'No'} />
        <Metric label="Duplex" value={printer.supportsDuplex ? 'Yes' : 'No'} />
        <Metric label="Driver" value={printer.driver ?? '—'} />
        <Metric label="Last seen" value={relativeTime(printer.lastSeenAt)} />
      </dl>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#dadce0] px-3.5 py-2.5 transition-colors hover:bg-[#f8f9fa]">
      <dt className="text-[11px] font-medium text-[#70757a] uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-1 text-[13px] font-semibold text-[#202124] truncate">{value}</dd>
    </div>
  );
}
