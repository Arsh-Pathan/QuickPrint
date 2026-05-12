'use client';
import { useQuery } from '@tanstack/react-query';
import {
  Printer,
  AlertTriangle,
  CheckCircle2,
  WifiOff,
  Loader2,
  Power,
  ChevronRight,
  Info,
  Server,
  Activity
} from 'lucide-react';
import { api, type PrinterRow } from '@/lib/api';
import { relativeTime } from '@/lib/format';
import { SHOP_ID } from '@/lib/config';

export default function PrintersPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['printers', SHOP_ID],
    queryFn: () => api.get<PrinterRow[]>(`/printers?shopId=${SHOP_ID}`),
    refetchInterval: 15_000,
  });

  const printers = data ?? [];

  return (
    <div className="space-y-12 py-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-m3-surface-container text-m3-primary text-[10px] font-bold uppercase tracking-widest border border-m3-outline-variant/30">
            <Server size={12} className="text-m3-primary" />
            Infrastructure Nodes
          </div>
          <h1 className="m3-display-s text-m3-ink tracking-tight">Fleet Management</h1>
          <p className="text-[15px] text-m3-ink-muted">
            Managing <span className="font-bold text-m3-primary">{printers.length}</span> active nodes across the distributed shop network.
          </p>
        </div>
        {isFetching && (
          <div className="flex items-center gap-3 rounded-2xl bg-white/40 backdrop-blur-md px-5 py-3 text-[11px] font-black text-m3-ink-muted uppercase tracking-[0.2em] shadow-sm border border-m3-outline-variant/30">
            <Loader2 className="h-4 w-4 animate-spin text-m3-primary" />
            <span>Polling Nodes…</span>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="grid place-items-center py-40">
          <div className="relative">
            <div className="absolute inset-0 bg-m3-primary/20 blur-[60px] rounded-full animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-m3-primary relative z-10" />
          </div>
          <p className="mt-6 text-[11px] font-black text-m3-ink-faint uppercase tracking-[0.3em] animate-pulse">Scanning Hardware Bus…</p>
        </div>
      ) : isError ? (
        <div className="m3-card p-20 text-center bg-m3-red-container/5 border-m3-red/10">
          <div className="h-20 w-20 rounded-3xl bg-m3-red-container/30 flex items-center justify-center mx-auto mb-6 border border-m3-red/10">
            <AlertTriangle className="h-10 w-10 text-m3-red opacity-60" />
          </div>
          <h3 className="m3-headline-s text-m3-ink font-black tracking-tight">Discovery Fault</h3>
          <p className="text-[15px] text-m3-ink-muted max-w-xs mx-auto mb-10 font-medium">
            Communication timeout while attempting to handshake with local print agents.
          </p>
          <button onClick={() => refetch()} className="m3-btn-filled h-14 px-12 font-black shadow-elev-2 hover:shadow-elev-4">
            Retry Discovery
          </button>
        </div>
      ) : printers.length === 0 ? (
        <div className="m3-card text-center py-32 px-6 bg-m3-surface-container-low border-dashed border-2 border-m3-outline-variant/50">
          <div className="mb-8 mx-auto flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-m3-surface-container text-m3-ink-faint border border-m3-outline-variant/20 shadow-elev-1">
            <Power className="h-12 w-12" />
          </div>
          <h3 className="m3-headline-s text-m3-ink font-black tracking-tight">Zero Nodes Detected</h3>
          <p className="mt-2 text-sm text-m3-ink-muted max-w-md mx-auto leading-relaxed font-medium">
            No hardware reported by the local agent. Connect your printers via USB or Network to begin registration.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
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
  const offline = printer.status === 'OFFLINE' || printer.status === 'ERROR' || printer.status === 'JAM';

  const accentColor = ok ? 'text-m3-green' : 
                 busy ? 'text-m3-primary' : 
                 paper || ink ? 'text-m3-yellow' : 
                 'text-m3-red';

  const accentBg = ok ? 'bg-m3-green-container/40' : 
                 busy ? 'bg-m3-primary-container/40' : 
                 paper || ink ? 'bg-m3-yellow-container/40' : 
                 'bg-m3-red-container/40';

  const getStatusText = () => {
    switch (printer.status) {
      case 'ONLINE': return 'IDLE (READY)';
      case 'BUSY': return 'PROCESSING';
      case 'PAPER_OUT': return 'NO PAPER';
      case 'TONER_LOW': return 'LOW TONER';
      case 'JAM': return 'HARDWARE JAM';
      default: return printer.status;
    }
  };

  return (
    <div className={`m3-card relative overflow-hidden group transition-all duration-500 hover:shadow-elev-4 hover:-translate-y-1 ${offline ? 'opacity-60 grayscale-[0.6]' : ''}`}>
      {/* Dynamic Glow */}
      {ok && <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-m3-green/5 blur-[40px] rounded-full group-hover:bg-m3-green/10 transition-colors" />}
      {busy && <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-m3-primary/10 blur-[40px] rounded-full animate-pulse" />}
      
      <div className="flex items-start justify-between p-8">
        <div className="flex items-center gap-5">
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.75rem] transition-all duration-500 ${accentBg} ${accentColor} ${busy ? 'animate-pulse' : 'shadow-sm'} group-hover:rotate-6 group-hover:scale-110`}>
            <Printer className="h-8 w-8" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[16px] font-black text-m3-ink truncate group-hover:text-m3-primary transition-colors tracking-tight">
              {printer.name}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${busy ? 'animate-ping bg-m3-primary' : ok ? 'animate-pulse bg-m3-green' : 'bg-m3-ink-faint'}`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${busy ? 'bg-m3-primary' : ok ? 'bg-m3-green' : 'bg-m3-ink-faint'}`}></span>
              </div>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${accentColor}`}>
                {getStatusText()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Metric label="Capability" value={`${printer.supportsColor ? 'Color' : 'B&W'} · ${printer.supportsDuplex ? 'Duplex' : 'Simp'}`} icon={<Activity size={10} />} />
          <Metric label="Telemetry" value={relativeTime(printer.lastSeenAt)} icon={<Activity size={10} />} />
        </div>
        
        <div className="flex items-center gap-3 rounded-2xl bg-m3-surface-container-low p-4 border border-m3-outline-variant/30 group/driver">
          <Info className="h-4 w-4 text-m3-ink-faint shrink-0 group-hover/driver:text-m3-primary transition-colors" />
          <div className="min-w-0">
            <p className="text-[9px] font-black text-m3-ink-faint uppercase tracking-[0.15em] mb-0.5">Firmware / Driver</p>
            <p className="text-[12px] font-mono font-bold text-m3-ink truncate">
              {printer.driver ?? 'V.STD_GENERIC_PRINTER'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-m3-outline-variant/30 bg-m3-surface-container-lowest p-4 transition-all hover:bg-m3-surface-container-low hover:border-m3-primary/20">
      <dt className="flex items-center gap-1.5 text-[9px] font-black text-m3-ink-faint uppercase tracking-[0.18em] mb-2">
        {icon}
        {label}
      </dt>
      <dd className="text-[13px] font-black text-m3-ink truncate tracking-tight">{value}</dd>
    </div>
  );
}
