'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, ArrowLeft, Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuth((s) => s.setAuth);
  const next = searchParams.get('next') ?? '/';

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.requestOtp(phone);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await api.verifyOtp(phone, code);
      setAuth(user, token);
      router.push(next);
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-[440px] flex-col items-center">
      {/* Google-style sign-in card */}
      <div className="w-full rounded-2xl border border-[#dadce0] bg-white px-10 py-12 shadow-sm"
        style={{ animation: 'scaleIn 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Image
            src="/logo.svg"
            alt="QuickPrint"
            width={75}
            height={75}
            className="h-auto w-[75px]"
          />
          <div>
            <h1 className="text-[24px] font-normal text-[#202124]">Sign in</h1>
            <p className="mt-1 text-[15px] text-[#202124]">to continue to QuickPrint</p>
          </div>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-6">
            <div className="relative">
              <input
                type="tel"
                placeholder=" "
                className="peer google-input !rounded-lg !py-4 !px-4 !text-[16px]"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
                id="phone-input"
              />
              <label
                htmlFor="phone-input"
                className="absolute left-3 top-4 px-1 text-[#5f6368] transition-all duration-200 bg-white pointer-events-none peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-brand-500 peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-xs"
              >
                Phone number
              </label>
            </div>

            <p className="text-[13px] text-[#5f6368] leading-relaxed">
              We&apos;ll send you a one-time verification code via SMS.
            </p>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-[#d93025]">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <Link
                href="/"
                className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
              >
                Back to home
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="google-button-primary"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Next'
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex items-center gap-2 rounded-full bg-[#f1f3f4] px-3 py-1.5 w-fit">
              <Phone className="h-3.5 w-3.5 text-[#5f6368]" />
              <span className="text-sm text-[#3c4043]">{phone}</span>
            </div>

            <p className="text-[14px] text-[#5f6368]">
              Enter the 6-digit code we sent to your phone
            </p>

            <div className="relative">
              <input
                type="text"
                placeholder=" "
                className="peer google-input !rounded-lg !py-4 !px-4 !text-[16px] text-center tracking-[0.3em] font-medium"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={loading}
                autoFocus
                maxLength={6}
                id="otp-input"
              />
              <label
                htmlFor="otp-input"
                className="absolute left-3 top-4 px-1 text-[#5f6368] transition-all duration-200 bg-white pointer-events-none peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-brand-500 peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-xs"
              >
                Verification code
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-[#d93025]">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => { setStep('phone'); setError(null); }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Change number
              </button>
              <button
                type="submit"
                disabled={loading}
                className="google-button-primary"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Verify'
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Bottom links */}
      <div className="mt-8 flex flex-col items-center gap-4">
        <div className="flex gap-6 text-[13px] text-[#70757a]">
          <Link href="/terms" className="hover:underline underline-offset-4">Terms</Link>
          <Link href="/privacy" className="hover:underline underline-offset-4">Privacy</Link>
        </div>
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#bdc1c6]">
          Automation by AI & ML Club
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <Suspense fallback={
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </main>
  );
}
