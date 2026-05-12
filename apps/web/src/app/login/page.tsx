'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Printer, CheckCircle2, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { Logo } from '@/components/Logo';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, token, user } = useAuth();
  const next = searchParams.get('next') ?? '/upload';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token && user) {
      router.replace(next);
    }
  }, [token, user, router, next]);

  if (token && user) return null;

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
      setError(err.message || 'Failed to continue');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full flex-col md:flex-row">
      {/* Left Panel: Branding & Illustration */}
      <div className="hidden md:flex flex-1 flex-col justify-center bg-m3-primary-container/30 p-16 overflow-hidden relative">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-m3-primary/10 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-m3-green/10 blur-3xl" />
        
        <div className="relative z-10 max-w-md">
          <Logo size="lg" className="mb-12" />
          <h2 className="m3-display-m mb-6 text-m3-ink tracking-tight">
            The student-first way to print.
          </h2>
          <div className="space-y-6">
            {[
              'Instant processing — no account creation.',
              'Real-time WhatsApp updates on status.',
              'Secure UPI payments at your fingertips.',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3 text-m3-on-surface-variant font-medium">
                <CheckCircle2 size={20} className="text-m3-primary" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Abstract printer/paper mark */}
        <div className="absolute bottom-20 right-20 opacity-20 rotate-12 select-none animate-[float_8s_ease-in-out_infinite]">
           <Printer size={300} strokeWidth={0.5} className="text-m3-primary" />
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-m3-surface">
        <div className="w-full max-w-[400px] animate-scale-in">
          <div className="mb-10">
            <Link href="/" className="m3-btn-text -ml-4 mb-8">
              <ArrowLeft size={18} />
              Back
            </Link>
            <h1 className="m3-display-s text-m3-ink mb-2">Welcome</h1>
            <p className="text-m3-ink-muted">Enter your details to start printing</p>
          </div>

          <form onSubmit={handleContinue} className="space-y-6">
            <div className="m3-field">
              <input
                type="text"
                placeholder=" "
                className="m3-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                maxLength={80}
                id="name-input"
                autoFocus
              />
              <label htmlFor="name-input">Your name (optional)</label>
            </div>

            <div className="m3-field">
              <input
                type="tel"
                inputMode="tel"
                placeholder=" "
                className="m3-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                maxLength={16}
                id="phone-input"
              />
              <label htmlFor="phone-input">Phone for WhatsApp (optional)</label>
            </div>

            <div className="m3-card-flat p-4 flex gap-3 items-start">
               <div className="h-2 w-2 rounded-full bg-m3-primary mt-2 shrink-0" />
               <p className="text-xs text-m3-ink-muted leading-relaxed">
                 We use your phone number only to send a one-time WhatsApp message when your prints are ready at the counter.
               </p>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-m3-red-container p-4 text-sm text-m3-red animate-shake">
                <div className="h-2 w-2 rounded-full bg-m3-red shrink-0" />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              className="m3-btn-filled w-full h-14 text-base shadow-elev-2 hover:shadow-elev-3 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue'}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-m3-outline-variant flex flex-wrap justify-center gap-x-8 gap-y-4 text-[13px] text-m3-ink-faint">
            <Link href="/terms" className="hover:text-m3-primary transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-m3-primary transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-m3-surface">
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-m3-primary" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
