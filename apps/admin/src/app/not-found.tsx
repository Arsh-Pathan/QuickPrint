import Link from 'next/link';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-m3-primary/10 blur-[60px] rounded-full" />
        <h1 className="relative m3-display-l text-m3-primary/20 select-none">404</h1>
      </div>
      
      <div className="m3-card p-10 max-w-md bg-white/80 backdrop-blur-md relative z-10">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-m3-surface-container text-m3-ink-muted mx-auto">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="m3-headline-m text-m3-ink">Endpoint Missing</h2>
        <p className="mt-2 text-sm text-m3-ink-muted leading-relaxed">
          The administrative route you are attempting to access does not exist or has been relocated.
        </p>
        
        <div className="mt-10">
          <Link
            href="/"
            className="m3-btn-filled h-14 w-full text-base font-bold flex items-center justify-center gap-2"
          >
            <Home className="h-5 w-5" />
            Back to Dashboard
          </Link>
        </div>
      </div>
      
      <p className="mt-10 text-[10px] font-bold text-m3-ink-faint uppercase tracking-[0.2em]">
        QuickPrint Admin Console · Security Audit Logged
      </p>
    </div>
  );
}
