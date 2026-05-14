'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Printer,
  AlertTriangle,
  Loader2,
  Power,
  Info,
  Server,
  Activity,
  Settings2,
  X,
  Check,
} from 'lucide-react';
import { api, type PrinterCategory, type PrinterRow } from '@/lib/api';
import { relativeTime } from '@/lib/format';
import { SHOP_ID } from '@/lib/config';

export default function PrintersPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['printers', SHOP_ID],
    queryFn: () => api.get<PrinterRow[]>(`/printers?shopId=${SHOP_ID}`),
    refetchInterval: 15_000,
  });

  const [editing, setEditing] = useState<PrinterRow | null>(null);

  const printers = data ?? [];
  const needsSetupCount = printers.filter((p) => !p.enabled).length;

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
            <span className="font-bold text-m3-primary">{printers.filter((p) => p.enabled).length}</span> enabled
            {needsSetupCount > 0 && (
              <> · <span className="font-bold text-m3-yellow">{needsSetupCount}</span> awaiting setup</>
            )}{' '}
            · {printers.length} discovered
          </p>
        </div>
        {isFetching && (
          <div className="flex items-center gap-3 rounded-2xl bg-white/40 backdrop-blur-md px-5 py-3 text-[11px] font-black text-m3-ink-muted uppercase tracking-[0.2em] shadow-sm border border-m3-outline-variant/30">
            <Loader2 className="h-4 w-4 animate-spin text-m3-primary" />
            <span>Polling Nodes…</span>
          </div>
        )}
      </header>

      {needsSetupCount > 0 && (
        <div className="m3-card !p-5 border-m3-yellow/30 bg-m3-yellow-container/20 flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-m3-yellow shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-m3-ink text-sm">{needsSetupCount} printer{needsSetupCount === 1 ? '' : 's'} need setup</p>
            <p className="text-xs text-m3-ink-muted mt-1">
              Newly-discovered printers stay disabled until you confirm their capabilities and assign a role. Click <strong>Setup</strong> on each card.
            </p>
          </div>
        </div>
      )}

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
            <PrinterCard key={p.id} printer={p} onEdit={() => setEditing(p)} />
          ))}
        </div>
      )}

      {editing && (
        <PrinterSetupModal
          printer={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function PrinterCard({ printer, onEdit }: { printer: PrinterRow; onEdit: () => void }) {
  const ok = printer.status === 'ONLINE';
  const busy = printer.status === 'BUSY';
  const paper = printer.status === 'PAPER_OUT';
  const ink = printer.status === 'TONER_LOW';
  const offline = printer.status === 'OFFLINE' || printer.status === 'ERROR' || printer.status === 'JAM';
  const disabled = !printer.enabled;

  const accentColor = disabled ? 'text-m3-ink-faint' :
                 ok ? 'text-m3-green' :
                 busy ? 'text-m3-primary' :
                 paper || ink ? 'text-m3-yellow' :
                 'text-m3-red';

  const accentBg = disabled ? 'bg-m3-surface-container' :
                 ok ? 'bg-m3-green-container/40' :
                 busy ? 'bg-m3-primary-container/40' :
                 paper || ink ? 'bg-m3-yellow-container/40' :
                 'bg-m3-red-container/40';

  const getStatusText = () => {
    if (disabled) return 'NEEDS SETUP';
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
    <div className={`m3-card relative overflow-hidden group transition-all duration-500 hover:shadow-elev-4 hover:-translate-y-1 ${offline && !disabled ? 'opacity-60 grayscale-[0.6]' : ''} ${disabled ? 'border-m3-yellow/30 bg-m3-yellow-container/5' : ''}`}>
      {ok && !disabled && <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-m3-green/5 blur-[40px] rounded-full group-hover:bg-m3-green/10 transition-colors" />}
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
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${busy ? 'animate-ping bg-m3-primary' : ok && !disabled ? 'animate-pulse bg-m3-green' : 'bg-m3-ink-faint'}`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${busy ? 'bg-m3-primary' : ok && !disabled ? 'bg-m3-green' : 'bg-m3-ink-faint'}`}></span>
              </div>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${accentColor}`}>
                {getStatusText()}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-m3-ink-muted hover:bg-m3-surface-container-high hover:text-m3-primary transition-colors"
          title="Configure printer"
        >
          <Settings2 size={16} />
        </button>
      </div>

      <div className="px-8 pb-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Metric label="Capability" value={`${printer.supportsColor ? 'Color' : 'B&W'} · ${printer.supportsDuplex ? 'Duplex' : 'Simp'}`} icon={<Activity size={10} />} />
          <Metric label="Role" value={categoryLabel(printer.category)} icon={<Activity size={10} />} />
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-m3-surface-container-low p-4 border border-m3-outline-variant/30">
          <Info className="h-4 w-4 text-m3-ink-faint shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black text-m3-ink-faint uppercase tracking-[0.15em] mb-0.5">Last Seen</p>
            <p className="text-[12px] font-mono font-bold text-m3-ink truncate">
              {relativeTime(printer.lastSeenAt)}
            </p>
          </div>
        </div>

        {disabled && (
          <button
            onClick={onEdit}
            className="m3-btn-filled w-full h-12 bg-m3-yellow text-m3-ink hover:opacity-90"
          >
            <Settings2 size={16} /> Setup printer
          </button>
        )}
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

function categoryLabel(c: PrinterCategory): string {
  switch (c) {
    case 'COLOR': return 'Color';
    case 'LONG': return 'Long jobs';
    case 'SHORT': return 'Short jobs';
    case 'GENERAL': return 'General';
  }
}

function PrinterSetupModal({ printer, onClose }: { printer: PrinterRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(printer.name);
  const [supportsColor, setSupportsColor] = useState(printer.supportsColor);
  const [supportsDuplex, setSupportsDuplex] = useState(printer.supportsDuplex);
  const [category, setCategory] = useState<PrinterCategory>(printer.category);
  const [enabled, setEnabled] = useState(printer.enabled);
  const [longPagesThreshold, setLongPagesThreshold] = useState(printer.longPagesThreshold);
  const [err, setErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      api.patch<PrinterRow>(`/printers/${printer.id}`, {
        name,
        supportsColor,
        supportsDuplex,
        category,
        enabled,
        longPagesThreshold,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['printers', SHOP_ID] });
      onClose();
    },
    onError: (e: any) => setErr(e?.message || 'Save failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="m3-card w-full max-w-lg !p-0 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-m3-outline-variant px-6 py-4 bg-m3-surface-container-low">
          <div>
            <h2 className="m3-headline-s text-m3-ink">Configure printer</h2>
            <p className="text-xs text-m3-ink-muted mt-0.5 font-mono">{printer.id}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-m3-ink-faint hover:bg-m3-surface-container-high hover:text-m3-ink">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <Field label="Display name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-m3-outline-variant px-4 py-2.5 text-sm bg-m3-surface focus:border-m3-primary focus:outline-none"
            />
          </Field>

          <Field label="Capabilities">
            <div className="space-y-3">
              <Toggle label="Supports color" value={supportsColor} onChange={setSupportsColor} />
              <Toggle label="Supports duplex (double-sided)" value={supportsDuplex} onChange={setSupportsDuplex} />
            </div>
          </Field>

          <Field label="Role" hint="Which kinds of jobs prefer this printer.">
            <div className="grid grid-cols-2 gap-2">
              {(['GENERAL', 'COLOR', 'LONG', 'SHORT'] as PrinterCategory[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${
                    category === c
                      ? 'border-m3-primary bg-m3-primary-container/40 text-m3-primary'
                      : 'border-m3-outline-variant text-m3-ink-muted hover:border-m3-outline hover:text-m3-ink'
                  }`}
                >
                  {categoryLabel(c)}
                </button>
              ))}
            </div>
          </Field>

          {category === 'LONG' && (
            <Field label="Long-job threshold (pages)" hint="Jobs with at least this many pages prefer this printer.">
              <input
                type="number"
                min={1}
                max={10000}
                value={longPagesThreshold}
                onChange={(e) => setLongPagesThreshold(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-xl border border-m3-outline-variant px-4 py-2.5 text-sm bg-m3-surface focus:border-m3-primary focus:outline-none tabular-nums"
              />
            </Field>
          )}

          <Field label="Enabled" hint="Disabled printers are excluded from routing even if they're online.">
            <Toggle label={enabled ? 'Accepting jobs' : 'Not accepting jobs'} value={enabled} onChange={setEnabled} />
          </Field>

          {err && (
            <div className="rounded-xl bg-m3-red-container/20 p-3 text-sm text-m3-red font-medium border border-m3-red/20">
              {err}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-m3-outline-variant px-6 py-4 bg-m3-surface-container-low">
          <button onClick={onClose} className="m3-btn-text px-4 h-11">Cancel</button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="m3-btn-filled h-11 px-6"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check size={16} />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black text-m3-ink uppercase tracking-widest">{label}</label>
      {hint && <p className="text-xs text-m3-ink-muted">{hint}</p>}
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      type="button"
      className="flex w-full items-center justify-between rounded-xl border border-m3-outline-variant px-4 py-2.5 text-sm hover:border-m3-outline transition-colors"
    >
      <span className="font-medium text-m3-ink">{label}</span>
      <span className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${value ? 'bg-m3-primary' : 'bg-m3-outline'}`}>
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${value ? 'translate-x-[22px]' : 'translate-x-[2px]'} mt-[2px]`} />
      </span>
    </button>
  );
}
