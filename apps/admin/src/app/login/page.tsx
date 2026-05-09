'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface LoginResponse {
  token: string;
  user: { id: string; role: string };
}

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<LoginResponse>('/auth/admin/login', { password });
      setSession({ token: res.token, userId: res.user.id });
      router.replace('/');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Incorrect password');
      } else {
        setError('Could not sign in. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f8f9fa] px-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-[#dadce0] bg-white p-10 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-brand-50">
            <Lock className="h-5 w-5 text-brand-600" />
          </div>
          <h1 className="text-[22px] font-normal text-[#202124]">QuickPrint Admin</h1>
          <p className="mt-1.5 text-[13px] text-[#5f6368]">Sign in to manage your print shop</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-[#5f6368]">
              Password
            </span>
            <input
              type="password"
              autoFocus
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#dadce0] px-3.5 py-2.5 text-[14px] text-[#202124] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !password}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-[#9aa0a6]">
          Authorized personnel only
        </p>
      </div>
    </div>
  );
}
