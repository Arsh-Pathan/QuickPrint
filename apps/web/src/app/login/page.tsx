'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, token, user } = useAuth();
  const next = searchParams.get('next') ?? '/upload';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Skip the form unless the URL forces re-auth.
  useEffect(() => {
    if (token && user) router.replace(next);
  }, [token, user, next, router]);

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cleanedPhone = phone.replace(/\s+/g, '');
      const { user, token } = await api.anonymousLogin({
        name: name.trim() || undefined,
        phone: cleanedPhone || undefined,
      });
      setAuth(user, token);
      router.push(next);
    } catch (err: any) {
      const msg = err.message?.includes('invalid_phone')
        ? 'Please enter a valid phone number (digits only, optionally with +).'
        : err.message || 'Failed to continue';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-[440px] flex-col items-center">
      <div
        className="w-full rounded-2xl border border-[#dadce0] bg-white px-10 py-12 shadow-sm"
        style={{ animation: 'scaleIn 0.3s ease-out' }}
      >
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Image src="/logo.svg" alt="QuickPrint" width={240} height={105} className="h-16 w-auto object-contain" />
          <div>
            <h1 className="text-[24px] font-normal text-[#202124]">Welcome</h1>
            <p className="mt-1 text-[15px] text-[#202124]">Print at the campus shop in seconds</p>
          </div>
        </div>

        <form onSubmit={handleContinue} className="space-y-5">
          <div className="relative">
            <input
              type="text"
              placeholder=" "
              className="peer google-input !rounded-lg !py-4 !px-4 !text-[16px]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              maxLength={80}
              id="name-input"
              autoFocus
            />
            <label
              htmlFor="name-input"
              className="absolute left-3 top-4 px-1 text-[#5f6368] transition-all duration-200 bg-white pointer-events-none peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-brand-500 peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-xs"
            >
              Your name (optional)
            </label>
          </div>

          <div className="relative">
            <input
              type="tel"
              inputMode="tel"
              placeholder=" "
              className="peer google-input !rounded-lg !py-4 !px-4 !text-[16px]"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              maxLength={16}
              id="phone-input"
            />
            <label
              htmlFor="phone-input"
              className="absolute left-3 top-4 px-1 text-[#5f6368] transition-all duration-200 bg-white pointer-events-none peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-brand-500 peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-xs"
            >
              Phone for WhatsApp updates (optional)
            </label>
          </div>

          <p className="text-[13px] text-[#5f6368] leading-relaxed">
            No signup. Name is used at the counter; phone is only for a one-tap WhatsApp link when your prints are ready.
          </p>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-[#d93025]">
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

          <div className="flex items-center justify-between pt-4">
            <Link href="/" className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors">
              Back to home
            </Link>
            <button type="submit" disabled={loading} className="google-button-primary">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        <div className="mt-2 flex gap-6 text-[13px] text-[#70757a]">
          <Link href="/terms" className="hover:underline underline-offset-4">
            Terms
          </Link>
          <Link href="/privacy" className="hover:underline underline-offset-4">
            Privacy
          </Link>
        </div>
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#bdc1c6]">
          Automation by AI &amp; ML Club
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
