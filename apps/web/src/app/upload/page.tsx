'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Upload,
  Loader2,
  ChevronLeft,
  CreditCard,
  Settings2,
  FileText,
  CloudUpload,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, usePrefs } from '@/lib/store';
import { useToast } from '@/lib/toast';
import { FilePreview } from '@/components/file-preview';
import { calculatePrice, PaperSize, type PrintSettings } from '@quickprint/shared';
import { loadRazorpay, preloadRazorpay } from '@/lib/razorpay';

const PRICING_CONFIG = {
  bwPaise: 200,
  colorPaise: 1000,
  duplexDiscountPct: 10,
};

// Retries confirmPayment on network errors and 5xx. Skips retry on 4xx (e.g. invalid_signature),
// which are permanent. Webhook is the server-side safety net if all retries fail.
async function confirmPaymentWithRetry(
  body: { orderId: string; paymentId: string; signature: string },
  toast: { push: (msg: string, kind?: any) => void },
): Promise<void> {
  const delays = [500, 1500, 4500];
  let lastErr: any = null;
  for (let attempt = 0; attempt < delays.length + 1; attempt += 1) {
    try {
      await api.confirmPayment(body);
      return;
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message ?? '');
      // api_4xx errors are permanent (bad signature, etc.) — don't retry.
      if (/^api_4\d{2}/.test(msg)) throw err;
      if (attempt < delays.length) {
        toast.push('Confirming payment…', 'info');
        await new Promise((r) => setTimeout(r, delays[attempt]));
        continue;
      }
    }
  }
  // All retries failed. Webhook will reconcile within ~30s if C-1 is configured.
  const finalErr = new Error(
    'Payment captured by Razorpay but confirmation failed. Refresh in 30s — your job will appear once the webhook lands.',
  );
  (finalErr as any).cause = lastErr;
  throw finalErr;
}

type FileStatus = 'pending' | 'uploading' | 'analyzing' | 'ready' | 'error';
interface CartFile {
  id: string;
  file: File;
  status: FileStatus;
  error?: string;
  jobId?: string;
  pricePaise?: number;
  pages?: number;
  appliedSettingsKey?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const prefs = usePrefs();
  const toast = useToast();

  const [cart, setCart] = useState<CartFile[]>([]);
  const [step, setStep] = useState<'choose' | 'settings'>('choose');
  const [phase, setPhase] = useState<'idle' | 'processing' | 'syncing' | 'paying'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  const [copies, setCopies] = useState(prefs.copies);
  const [color, setColor] = useState(prefs.color);
  const [duplex, setDuplex] = useState(prefs.duplex);
  const [paperSize, setPaperSize] = useState(prefs.paperSize);

  const currentSettings = useMemo<PrintSettings>(
    () => ({ color, duplex, copies, paperSize }),
    [color, duplex, copies, paperSize],
  );
  const settingsKey = useMemo(() => JSON.stringify(currentSettings), [currentSettings]);

  useEffect(() => {
    if (!token) router.push('/login?next=/upload');
  }, [token, router]);

  useEffect(() => {
    prefs.set({ copies, color, duplex, paperSize });
  }, [copies, color, duplex, paperSize]);

  useEffect(() => { preloadRazorpay(); }, []);

  useEffect(() => {
    if (activePreviewId && cart.some((item) => item.id === activePreviewId)) return;
    setActivePreviewId(cart[0]?.id ?? null);
  }, [activePreviewId, cart]);

  const allReady = cart.length > 0 && cart.every((f) => f.status === 'ready');
  const hasPending = cart.some((f) => f.status === 'pending' || f.status === 'uploading' || f.status === 'analyzing');
  const hasError = cart.some((f) => f.status === 'error');
  const settingsDirty = cart.some(
    (f) => f.status === 'ready' && !!f.jobId && f.appliedSettingsKey !== settingsKey,
  );
  const activePreview = cart.find((item) => item.id === activePreviewId) ?? null;

  const totalPaise = useMemo(
    () =>
      cart.reduce((sum, item) => {
        if (item.pages && item.appliedSettingsKey !== settingsKey) {
          return sum + calculatePrice(item.pages, color ? item.pages : 0, currentSettings, PRICING_CONFIG).totalPaise;
        }
        return sum + (item.pricePaise ?? 0);
      }, 0),
    [cart, color, currentSettings, settingsKey],
  );

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending' as FileStatus,
    }));
    setCart((prev) => [
      ...prev,
      ...newFiles,
    ]);
    if (newFiles[0]) setActivePreviewId((prev) => prev ?? newFiles[0]!.id);
    if (newFiles.length > 0) setStep('settings');
  }, []);

  const removeFile = useCallback((id: string) => {
    setCart((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateFile = useCallback((id: string, patch: Partial<CartFile>) => {
    setCart((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const syncReadyJobs = async () => {
    const stale = cart.filter(
      (f) => f.status === 'ready' && f.jobId && f.appliedSettingsKey !== settingsKey,
    );
    if (stale.length === 0) return true;

    setError(null);
    setPhase('syncing');
    try {
      for (const item of stale) {
        const next = await api.updateJobSettings(item.jobId!, currentSettings);
        updateFile(item.id, {
          pricePaise: next.priceTotalPaise,
          pages: next.pages,
          appliedSettingsKey: settingsKey,
          error: undefined,
        });
      }
      return true;
    } catch (err: any) {
      const msg = err.message || 'Could not update print settings';
      setError(msg);
      toast.push(msg, 'error');
      return false;
    } finally {
      setPhase('idle');
    }
  };

  const processAll = async () => {
    setError(null);
    const signal = new AbortController();
    abortRef.current = signal;
    setPhase('processing');

    const pending = cart.filter((f) => f.status === 'pending' || f.status === 'error');

    const MAX_MB = 50;
    const oversized = pending.find((f) => f.file.size > MAX_MB * 1024 * 1024);
    if (oversized) {
      setError(`${oversized.file.name} exceeds ${MAX_MB}MB limit`);
      setPhase('idle');
      abortRef.current = null;
      return;
    }
    const unsupported = pending.find(
      (f) => !['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(f.file.type),
    );
    if (unsupported) {
      setError(`${unsupported.file.name} is not a supported file type`);
      setPhase('idle');
      abortRef.current = null;
      return;
    }

    try {
      for (const cf of pending) {
        if (signal.signal.aborted) break;

        try {
          updateFile(cf.id, { status: 'uploading', error: undefined });

          const sign = await api.signUpload({
            fileName: cf.file.name,
            mimeType: cf.file.type,
            fileSize: cf.file.size,
          });

          await api.upload(sign.uploadUrl, cf.file, signal.signal);

          if (signal.signal.aborted) break;
          updateFile(cf.id, { status: 'analyzing' });

          const job = await api.createJob({
            fileKey: sign.fileKey,
            fileName: cf.file.name,
            fileSize: cf.file.size,
            mimeType: cf.file.type,
            settings: currentSettings,
          });

          updateFile(cf.id, {
            status: 'ready',
            jobId: job.id,
            pricePaise: job.priceTotalPaise,
            pages: job.pages,
            appliedSettingsKey: settingsKey,
          });
        } catch (err: any) {
          if (err.name === 'AbortError') break;
          updateFile(cf.id, {
            status: 'error',
            error: err.message || 'Processing failed',
          });
        }
      }
    } finally {
      setPhase('idle');
      abortRef.current = null;
    }
  };

  const payAll = async () => {
    const ready = cart.filter((f) => f.status === 'ready' && f.jobId);
    if (ready.length === 0) return;

    try {
      const synced = await syncReadyJobs();
      if (!synced) return;

      setPhase('paying');
      const [isLoaded] = await Promise.all([loadRazorpay()]);
      if (!isLoaded) throw new Error('Razorpay SDK failed to load');

      const jobIds = ready.map((r) => r.jobId!);
      const batchOrder = await api.createBatchOrder(jobIds);

      await new Promise<void>((resolve, reject) => {
        const options = {
          key: batchOrder.keyId,
          amount: batchOrder.amountPaise,
          currency: 'INR',
          name: 'QuickPrint',
          description: `Printing ${ready.length} file${ready.length !== 1 ? 's' : ''}`,
          order_id: batchOrder.orderId,
          handler: async (response: any) => {
            try {
              await confirmPaymentWithRetry({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }, toast);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
          prefill: {
            contact: user?.phone ?? undefined,
            name: user?.name ?? undefined,
            vpa: batchOrder.keyId.startsWith('rzp_test_') ? 'success@razorpay' : undefined,
          },
          theme: { color: '#1a73e8' },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      });

      const firstId = jobIds[0];
      if (firstId) router.push(`/jobs/${firstId}`);
    } catch (err: any) {
      if (err.message === 'Payment cancelled') {
        toast.push('Payment cancelled', 'info');
      } else {
        const msg = err.message || 'Payment failed';
        setError(msg);
        toast.push(msg, 'error');
      }
    } finally {
      setPhase('idle');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-m3-surface pt-12 pb-24 px-4 sm:px-6">
      <div className="flex w-full max-w-4xl flex-col items-center">
        <header className="mb-12 flex flex-col items-center text-center">
          <h1 className="m3-display-s text-m3-ink mb-2">Upload documents</h1>
          <p className="text-sm text-m3-ink-muted">Supported: PDF, PNG, JPG, WEBP</p>
        </header>

        {cart.length === 0 && step === 'choose' ? (
          <div className="w-full max-w-md" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
            <label
              className={`m3-card group flex w-full cursor-pointer flex-col items-center justify-center border-2 border-dashed p-16 transition-all duration-300 ${
                dragActive ? 'border-m3-primary bg-m3-primary-container/30 shadow-elev-2' : 'border-m3-outline-variant hover:border-m3-outline'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                }}
              />
              <div className={`flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-300 animate-[float_4s_ease-in-out_infinite] ${
                dragActive
                  ? 'bg-m3-primary text-white scale-110 shadow-elev-3'
                  : 'bg-m3-primary-container text-m3-on-primary-container group-hover:bg-m3-primary group-hover:text-white group-hover:scale-105'
              }`}>
                <CloudUpload size={32} />
              </div>
              <p className="mt-6 m3-headline-s text-m3-ink">
                {dragActive ? 'Drop your files here' : 'Click to upload'}
              </p>
              <p className="mt-2 text-sm text-m3-ink-muted">or drag and drop — add multiple files</p>
            </label>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="m3-card flex items-center gap-4 !p-4 border-m3-outline-variant">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-m3-surface-container text-[11px] font-bold text-m3-ink-muted">B&amp;W</div>
                <div>
                  <p className="text-sm font-bold text-m3-ink">₹2.00</p>
                  <p className="text-[11px] text-m3-ink-faint">per page</p>
                </div>
              </div>
              <div className="m3-card flex items-center gap-4 !p-4 border-m3-outline-variant">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-m3-primary-container text-[11px] font-bold text-m3-primary">Color</div>
                <div>
                  <p className="text-sm font-bold text-m3-ink">₹10.00</p>
                  <p className="text-[11px] text-m3-ink-faint">per page</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-6 lg:flex-row" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
            {/* Left: file cart */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setCart([]); setStep('choose'); }}
                  disabled={phase === 'paying'}
                  className="m3-btn-text -ml-3 text-m3-ink-muted hover:text-m3-ink disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" /> New files
                </button>

                <label className="m3-btn-text text-m3-primary cursor-pointer disabled:opacity-50">
                  <Plus size={16} /> Add more
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); }}
                  />
                </label>
              </div>

              <div className="space-y-3">
                {cart.map((cf) => (
                  <CartItem
                    key={cf.id}
                    item={cf}
                    selected={cf.id === activePreviewId}
                    onSelect={() => setActivePreviewId(cf.id)}
                    onRemove={phase === 'idle' ? () => removeFile(cf.id) : undefined}
                    copies={copies}
                    color={color}
                    duplex={duplex}
                    paperSize={paperSize}
                    settingsKey={settingsKey}
                  />
                ))}
              </div>

              {activePreview && (
                <div className="m3-card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-m3-outline-variant px-5 py-4 bg-m3-surface-container-low">
                    <div>
                      <h3 className="m3-headline-s text-[15px] text-m3-ink">Live preview</h3>
                      <p className="text-xs text-m3-ink-muted">{activePreview.file.name}</p>
                    </div>
                    <span className="m3-chip m3-chip-active">
                      {paperSize}
                    </span>
                  </div>
                  <div className="px-5 pb-5">
                    <FilePreview
                      file={activePreview.file}
                      color={color}
                      duplex={duplex}
                      paperSize={paperSize}
                    />
                    <p className="text-[11px] text-m3-ink-faint">
                      Preview reflects the uploaded document. Color, paper size, and duplex are the print settings applied to checkout.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: settings + actions */}
            <div className="w-full lg:w-[400px]">
              <div className="m3-card flex flex-col gap-6 !p-6">
                <div className="flex items-center gap-3 border-b border-m3-outline-variant pb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-m3-primary-container/30">
                    <Settings2 size={18} className="text-m3-primary" />
                  </div>
                  <h2 className="m3-headline-s text-m3-ink">Settings</h2>
                  {cart.length > 0 && (
                    <span className="ml-auto text-[11px] font-bold uppercase tracking-widest text-m3-ink-faint tabular-nums">{cart.length} file{cart.length !== 1 ? 's' : ''}</span>
                  )}
                </div>

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-m3-ink">Copies</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCopies(Math.max(1, copies - 1))} disabled={phase !== 'idle'} className="flex h-8 w-8 items-center justify-center rounded-full border border-m3-outline-variant hover:bg-m3-surface-container-high transition-colors text-m3-ink-muted hover:text-m3-ink disabled:opacity-50">−</button>
                      <span className="w-8 text-center font-bold text-sm tabular-nums">{copies}</span>
                      <button onClick={() => setCopies(copies + 1)} disabled={phase !== 'idle'} className="flex h-8 w-8 items-center justify-center rounded-full border border-m3-outline-variant hover:bg-m3-surface-container-high transition-colors text-m3-ink-muted hover:text-m3-ink disabled:opacity-50">+</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-m3-ink">Color</label>
                    <div className="flex gap-1 p-1 bg-m3-surface-container-high rounded-full">
                      <button onClick={() => setColor(false)} disabled={phase !== 'idle'} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200 disabled:opacity-50 ${!color ? 'bg-white shadow-elev-1 text-m3-ink' : 'text-m3-ink-muted hover:text-m3-ink'}`}>B&amp;W</button>
                      <button onClick={() => setColor(true)} disabled={phase !== 'idle'} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200 disabled:opacity-50 ${color ? 'bg-white shadow-elev-1 text-m3-primary' : 'text-m3-ink-muted hover:text-m3-ink'}`}>Color</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-m3-ink">Double-sided</label>
                    <button onClick={() => setDuplex(!duplex)} disabled={phase !== 'idle'} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-300 ease-in-out focus:outline-none disabled:opacity-50 ${duplex ? 'bg-m3-primary' : 'bg-m3-outline'}`}>
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-elev-1 ring-0 transition-all duration-300 ease-in-out ${duplex ? 'translate-x-[22px]' : 'translate-x-[2px]'} mt-[2px]`} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-m3-ink">Paper size</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[PaperSize.A4, PaperSize.A3, PaperSize.Letter, PaperSize.Legal].map((size) => (
                        <button
                          key={size}
                          onClick={() => setPaperSize(size)}
                          disabled={phase !== 'idle'}
                          className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                            paperSize === size
                              ? 'border-m3-primary bg-m3-primary-container/40 text-m3-primary'
                              : 'border-m3-outline-variant bg-transparent text-m3-ink-muted hover:border-m3-outline hover:text-m3-ink'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-5 border-t border-[#dadce0] space-y-3">
                  {phase === 'idle' && !allReady && !hasError && (
                    <button
                      onClick={processAll}
                      disabled={cart.length === 0}
                      className="m3-btn-filled w-full h-14 text-base shadow-elev-2 hover:shadow-elev-3"
                    >
                      Upload &amp; Analyze
                    </button>
                  )}

                  {phase === 'processing' && (
                    <div className="flex flex-col gap-2 rounded-xl bg-m3-primary-container/30 p-4 text-sm text-m3-primary">
                      <div className="flex items-center gap-2 font-medium">
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        Analyzing documents…
                      </div>
                      <button
                        onClick={() => { abortRef.current?.abort(); toast.push('Cancelled', 'info'); }}
                        className="self-start text-xs font-bold uppercase tracking-wider text-m3-primary hover:brightness-90"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {phase === 'syncing' && (
                    <div className="flex items-center gap-2 rounded-xl bg-m3-primary-container/30 p-4 text-sm text-m3-primary font-medium">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      Updating prices…
                    </div>
                  )}

                  {hasError && phase === 'idle' && (
                    <button
                      onClick={processAll}
                      className="m3-btn-outlined w-full h-14"
                    >
                      Retry failed files
                    </button>
                  )}

                  {allReady && (
                    <>
                      {settingsDirty && phase === 'idle' && (
                        <button
                          onClick={syncReadyJobs}
                          className="m3-btn-outlined w-full h-14"
                        >
                          Update quote for new settings
                        </button>
                      )}

                      <div className="flex items-end justify-between py-2">
                        <span className="text-sm font-medium text-m3-ink-muted">Total</span>
                        <div className="text-right">
                          <p className="m3-headline-l text-m3-ink tabular-nums leading-none">₹{(totalPaise / 100).toFixed(2)}</p>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-m3-ink-faint mt-1.5">{cart.length} file{cart.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>

                      <button
                        onClick={payAll}
                        disabled={phase !== 'idle' || !allReady || settingsDirty}
                        className="m3-btn-filled w-full h-16 text-lg shadow-elev-3 hover:shadow-elev-4"
                      >
                        {phase === 'paying' ? (
                          <span className="inline-flex items-center gap-2"><Loader2 className="h-6 w-6 animate-spin" /> Opening payment…</span>
                        ) : (
                          <><CreditCard size={20} /> Pay &amp; Print All</>
                        )}
                      </button>

                      <p className="text-center text-[11px] text-[#70757a]">
                        One payment for all files
                      </p>
                    </>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-3 rounded-xl bg-m3-red-container p-4 text-sm text-m3-red font-medium">
                    <AlertCircle size={18} className="shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <footer className="mt-20">
          <p className="m3-section-eyebrow">Automation by AI &amp; ML Club</p>
        </footer>
      </div>
    </main>
  );
}

function CartItem({ item, selected, onSelect, onRemove, copies, color, duplex, paperSize, settingsKey }: {
  item: CartFile;
  selected: boolean;
  onSelect: () => void;
  onRemove?: () => void;
  copies: number;
  color: boolean;
  duplex: boolean;
  paperSize: PrintSettings['paperSize'];
  settingsKey: string;
}) {
  const price = useMemo(
    () => {
      if (item.pages && item.appliedSettingsKey !== settingsKey) {
        return calculatePrice(item.pages, color ? item.pages : 0, currentSettingsFromRow(color, duplex, copies, paperSize), PRICING_CONFIG).totalPaise;
      }
      if (item.pricePaise) return item.pricePaise;
      return calculatePrice(1, color ? 1 : 0, currentSettingsFromRow(color, duplex, copies, paperSize), PRICING_CONFIG).totalPaise;
    },
    [item.appliedSettingsKey, item.pages, item.pricePaise, settingsKey, color, duplex, copies, paperSize],
  );

  const statusIcon = () => {
    switch (item.status) {
      case 'pending':
        return <div className="h-5 w-5 rounded-full border-2 border-[#dadce0]" />;
      case 'uploading':
      case 'analyzing':
        return <Loader2 className="h-5 w-5 animate-spin text-m3-primary" />;
      case 'ready':
        return <CheckCircle2 className="h-5 w-5 text-m3-green" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-m3-red" />;
    }
  };

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`m3-card !p-4 flex w-full items-center gap-3 text-left transition-all duration-200 border-m3-outline-variant ${
        item.status === 'error' ? 'border-m3-red bg-m3-red-container/10' : ''
      } ${selected ? 'ring-2 ring-m3-primary/30 border-m3-primary' : ''}`}
    >
      <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg bg-m3-surface-container text-[11px] font-bold text-m3-ink-muted shadow-sm">
        <FileText size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-m3-ink truncate">{item.file.name}</p>
        <p className="text-[11px] text-m3-ink-muted">
          {(item.file.size / 1024 / 1024).toFixed(1)} MB
          {item.pages ? ` · ${item.pages} pages` : ''}
          {item.status === 'ready' && item.appliedSettingsKey !== settingsKey ? ' · update quote' : ''}
          {item.status === 'error' && item.error ? ` · ${item.error}` : ''}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-m3-ink tabular-nums">
          ₹{(price / 100).toFixed(2)}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {statusIcon()}
        {onRemove && item.status !== 'uploading' && item.status !== 'analyzing' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-m3-ink-faint hover:bg-m3-red-container hover:text-m3-red transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function currentSettingsFromRow(
  color: boolean,
  duplex: boolean,
  copies: number,
  paperSize: PrintSettings['paperSize'],
): PrintSettings {
  return { color, duplex, copies, paperSize };
}
