'use client';

import { useEffect, useState, useMemo } from 'react';
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
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, usePrefs } from '@/lib/store';
import { useToast } from '@/lib/toast';
import { FilePreview } from '@/components/file-preview';
import { calculatePrice } from '@quickprint/shared';
import { loadRazorpay } from '@/lib/razorpay';

const PRICING_CONFIG = {
  bwPaise: 200,
  colorPaise: 1000,
  duplexDiscountPct: 10,
};

type Phase = 'idle' | 'signing' | 'uploading' | 'analyzing' | 'ordering' | 'paying';

export default function UploadPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const prefs = usePrefs();
  const toast = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'choose' | 'settings'>('choose');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [copies, setCopies] = useState(prefs.copies);
  const [color, setColor] = useState(prefs.color);
  const [duplex, setDuplex] = useState(prefs.duplex);

  useEffect(() => {
    if (!token) router.push('/login?next=/upload');
  }, [token, router]);

  // Keep prefs synced as user adjusts; persists across visits.
  useEffect(() => {
    prefs.set({ copies, color, duplex });
  }, [copies, color, duplex]); // eslint-disable-line react-hooks/exhaustive-deps

  const priceBreakdown = useMemo(
    () =>
      calculatePrice(1, color ? 1 : 0, { color, duplex, copies, paperSize: 'A4' }, PRICING_CONFIG),
    [color, duplex, copies],
  );

  const submitting = phase !== 'idle';

  const onPrintAndPay = async () => {
    if (!file) return;
    setError(null);
    setPhase('signing');

    try {
      toast.push('Preparing upload…', 'info');
      const sign = await api.signUpload({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });

      setPhase('uploading');
      await api.upload(sign.uploadUrl, file);

      setPhase('analyzing');
      toast.push('Analyzing your document…', 'info');
      const job = await api.createJob({
        fileKey: sign.fileKey,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        settings: { color, duplex, copies, paperSize: 'A4' },
      });

      setPhase('ordering');
      const isLoaded = await loadRazorpay();
      if (!isLoaded) throw new Error('Razorpay SDK failed to load');
      const order = await api.createOrder(job.id);

      setPhase('paying');
      const options = {
        key: order.keyId,
        amount: order.amountPaise,
        currency: 'INR',
        name: 'QuickPrint',
        description: `Printing ${file.name}`,
        order_id: order.orderId,
        // Top-level `method` is the official UPI-only switch documented by
        // Razorpay. Combined with the display block below it forces UPI
        // (collect / intent / QR depending on platform) without showing
        // cards, wallets, netbanking, EMI or paylater.
        method: {
          upi: true,
          card: false,
          netbanking: false,
          wallet: false,
          emi: false,
          paylater: false,
        },
        handler: async (response: any) => {
          try {
            await api.confirmPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            router.push(`/jobs/${job.id}`);
          } catch (err) {
            toast.push('Payment confirmation failed — opening status anyway', 'error');
            router.push(`/jobs/${job.id}`);
          }
        },
        modal: {
          ondismiss: () => {
            setPhase('idle');
            toast.push('Payment cancelled', 'info');
          },
        },
        prefill: {
          contact: user?.phone ?? undefined,
          name: user?.name ?? undefined,
          // In Razorpay test mode UPI is only simulated via this VPA on
          // desktop — without it Checkout has nothing to render and shows
          // "No appropriate payment method found." Real keys ignore this.
          vpa: order.keyId.startsWith('rzp_test_') ? 'success@razorpay' : undefined,
        },
        theme: { color: '#1a73e8' },
        // Razorpay's canonical UPI-only sample. `show_default_blocks: false`
        // hides every method that isn't in the listed block.
        config: {
          display: {
            blocks: {
              banks: {
                name: 'Pay via UPI',
                instruments: [{ method: 'upi' }],
              },
            },
            sequence: ['block.banks'],
            preferences: { show_default_blocks: false },
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      const msg = err.message || 'Processing failed';
      setError(msg);
      toast.push(msg.includes('upload_failed') ? 'Upload failed — check your connection' : msg, 'error');
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
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setStep('settings');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#f8f9fa] px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex w-full max-w-4xl flex-col items-center">
        <header className="mb-10 flex flex-col items-center gap-3">
          <Link href="/" className="transition-transform hover:scale-105">
            <Image src="/logo.svg" alt="QuickPrint" width={160} height={70} className="h-12 w-auto object-contain" />
          </Link>
          <h1 className="text-[22px] font-normal text-[#202124]">
            {step === 'choose' ? 'Upload your document' : 'Print settings'}
          </h1>
          {step === 'choose' && (
            <p className="text-sm text-[#5f6368]">Supported: PDF, PNG, JPG, WEBP</p>
          )}
        </header>

        {step === 'choose' ? (
          <div className="w-full max-w-md" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
            <label
              className={`google-card group flex w-full cursor-pointer flex-col items-center justify-center border-2 border-dashed p-16 transition-all duration-300 ${
                dragActive ? 'border-brand-500 bg-brand-50 shadow-md' : 'border-[#dadce0] hover:border-[#bdc1c6]'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFile(f);
                    setStep('settings');
                  }
                }}
              />
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300 ${
                  dragActive
                    ? 'bg-brand-100 text-brand-600 scale-110'
                    : 'bg-brand-50 text-brand-500 group-hover:bg-brand-100 group-hover:scale-105'
                }`}
              >
                <CloudUpload className="h-8 w-8" />
              </div>
              <p className="mt-5 text-[15px] font-medium text-[#202124]">
                {dragActive ? 'Drop your file here' : 'Click to upload'}
              </p>
              <p className="mt-1.5 text-[13px] text-[#70757a]">or drag and drop your file here</p>
            </label>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="google-card flex items-center gap-4 !p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f1f3f4] text-xs font-bold text-[#5f6368]">
                  B&amp;W
                </div>
                <div>
                  <p className="text-sm font-medium text-[#202124]">₹2.00</p>
                  <p className="text-[11px] text-[#70757a]">per page</p>
                </div>
              </div>
              <div className="google-card flex items-center gap-4 !p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600">
                  Color
                </div>
                <div>
                  <p className="text-sm font-medium text-[#202124]">₹10.00</p>
                  <p className="text-[11px] text-[#70757a]">per page</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-6 lg:flex-row" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
            <div className="flex-1 space-y-4">
              <button
                onClick={() => setStep('choose')}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5f6368] hover:text-[#202124] transition-colors rounded-full hover:bg-[#f1f3f4] px-3 py-1.5 -ml-3 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Change file
              </button>

              <div className="flex items-center gap-2 rounded-full bg-[#f1f3f4] px-4 py-2 w-fit">
                <FileText className="h-4 w-4 text-[#5f6368]" />
                <span className="text-sm font-medium text-[#3c4043] truncate max-w-[200px]">{file?.name}</span>
              </div>

              <FilePreview file={file!} />
            </div>

            <div className="w-full lg:w-[400px]">
              <div className="google-card flex flex-col gap-6">
                <div className="flex items-center gap-3 border-b border-[#dadce0] pb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50">
                    <Settings2 className="h-4 w-4 text-brand-500" />
                  </div>
                  <h2 className="text-[16px] font-medium text-[#202124]">Print Settings</h2>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[#3c4043]">Copies</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCopies(Math.max(1, copies - 1))}
                        disabled={submitting}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dadce0] hover:bg-[#f8f9fa] transition-colors text-[#5f6368] hover:text-[#202124] disabled:opacity-50"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-semibold text-sm tabular-nums">{copies}</span>
                      <button
                        onClick={() => setCopies(copies + 1)}
                        disabled={submitting}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dadce0] hover:bg-[#f8f9fa] transition-colors text-[#5f6368] hover:text-[#202124] disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[#3c4043]">Color</label>
                    <div className="flex gap-1 p-1 bg-[#f1f3f4] rounded-full">
                      <button
                        onClick={() => setColor(false)}
                        disabled={submitting}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 disabled:opacity-50 ${
                          !color ? 'bg-white shadow-sm text-[#202124]' : 'text-[#5f6368] hover:text-[#202124]'
                        }`}
                      >
                        B&amp;W
                      </button>
                      <button
                        onClick={() => setColor(true)}
                        disabled={submitting}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 disabled:opacity-50 ${
                          color ? 'bg-white shadow-sm text-brand-600' : 'text-[#5f6368] hover:text-[#202124]'
                        }`}
                      >
                        Color
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[#3c4043]">Double-sided</label>
                    <button
                      onClick={() => setDuplex(!duplex)}
                      disabled={submitting}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-300 ease-in-out focus:outline-none disabled:opacity-50 ${
                        duplex ? 'bg-brand-500' : 'bg-[#bdc1c6]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-all duration-300 ease-in-out ${
                          duplex ? 'translate-x-[22px]' : 'translate-x-[2px]'
                        } mt-[2px]`}
                      />
                    </button>
                  </div>
                </div>

                <div className="mt-2 pt-5 border-t border-[#dadce0]">
                  <div className="flex items-end justify-between mb-6">
                    <span className="text-sm text-[#5f6368]">Estimated Total</span>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-[#202124] tabular-nums">
                        ₹{(priceBreakdown.totalPaise / 100).toFixed(2)}
                      </p>
                      <p className="text-[11px] text-[#70757a] mt-0.5">Confirmed after page analysis</p>
                    </div>
                  </div>

                  <button
                    onClick={onPrintAndPay}
                    disabled={submitting}
                    className="google-button-primary w-full !py-3 text-[15px] shadow-sm hover:shadow-md"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {phaseLabel(phase)}
                      </span>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" /> Pay &amp; Print
                      </>
                    )}
                  </button>

                  {/* Progress hint */}
                  {submitting && (
                    <div className="mt-4 flex gap-1.5">
                      {(['signing', 'uploading', 'analyzing', 'ordering', 'paying'] as Phase[]).map((p) => {
                        const order: Phase[] = ['signing', 'uploading', 'analyzing', 'ordering', 'paying'];
                        const done = order.indexOf(phase) > order.indexOf(p);
                        const active = phase === p;
                        return (
                          <span
                            key={p}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              done ? 'bg-brand-500' : active ? 'bg-brand-300 animate-pulse' : 'bg-[#dadce0]'
                            }`}
                          />
                        );
                      })}
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-[#d93025]">
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-20 flex flex-col items-center gap-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#bdc1c6]">
            Automation by AI &amp; ML Club
          </p>
        </footer>
      </div>
    </main>
  );
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case 'signing':
      return 'Preparing upload';
    case 'uploading':
      return 'Uploading file';
    case 'analyzing':
      return 'Analyzing pages';
    case 'ordering':
      return 'Opening payment';
    case 'paying':
      return 'Waiting for payment';
    default:
      return 'Working';
  }
}
