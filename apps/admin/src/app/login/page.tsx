'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Lock, ShieldCheck, ArrowRight, Loader2, Zap, LayoutDashboard } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  
  const router = useRouter();
  const login = useAuth((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    
    const success = await login(password);
    if (success) {
      router.replace('/');
    } else {
      setLoading(false);
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-m3-surface p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 -mr-48 -mt-48 w-[600px] h-[600px] bg-m3-primary/5 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-0 left-0 -ml-48 -mb-48 w-[400px] h-[400px] bg-m3-primary/10 blur-[100px] rounded-full" />
      
      <div className="w-full max-w-[440px] relative z-10 animate-in fade-in zoom-in-95 duration-700 ease-emphasized">
        {/* Branding Area */}
        <div className="flex flex-col items-center mb-10 space-y-4">
          <div className="scale-125 mb-2">
            <Logo size="lg" />
          </div>
          <div className="h-px w-12 bg-m3-outline-variant/50" />
          <h2 className="m3-headline-s text-m3-ink tracking-tight font-black uppercase tracking-[0.1em]">Admin Console</h2>
        </div>

        {/* Login Card */}
        <div className="m3-card bg-white/70 backdrop-blur-xl p-10 shadow-elev-5 border border-m3-outline-variant/30 rounded-[3rem]">
          <div className="flex items-center gap-4 mb-10 px-2">
            <div className="h-12 w-12 rounded-2xl bg-m3-primary text-m3-on-primary flex items-center justify-center shadow-elev-2">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-[22px] font-black text-m3-ink tracking-tight">Security Access</h1>
              <p className="text-[12px] font-bold text-m3-primary uppercase tracking-[0.15em] opacity-60">Verified Personnel Only</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <div className="m3-field relative">
                <input
                  type="password"
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className={`m3-input !h-16 !px-6 !text-lg !rounded-2xl transition-all duration-300 ${error ? 'border-m3-red focus:border-m3-red focus:ring-m3-red/20' : ''}`}
                  autoFocus
                />
                <label className="!left-6 !text-sm !font-bold">Access Credential</label>
                
                {error && (
                  <p className="absolute -bottom-6 left-2 text-[10px] font-black text-m3-red uppercase tracking-widest animate-in fade-in slide-in-from-top-1">
                    Authentication mismatch. Access denied.
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="m3-btn-filled w-full h-16 text-lg font-black shadow-elev-3 hover:shadow-elev-5 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 disabled:opacity-50 group"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="uppercase tracking-[0.1em]">Handshaking…</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <span className="uppercase tracking-[0.15em]">Enter Console</span>
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-12 flex flex-col items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-m3-surface-container-low border border-m3-outline-variant/30 text-m3-ink-faint">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">End-to-End Secure</span>
            </div>
            <p className="text-[11px] text-m3-ink-faint text-center leading-relaxed font-medium">
              QuickPrint Platform Administrative Access.<br />
              Authorized personnel only. Logs are recorded.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-10 flex items-center justify-center gap-8 text-m3-ink-faint">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">v2.4 LTS</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-m3-outline" />
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">System Operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}
