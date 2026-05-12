'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastCtx {
  push: (message: string, variant?: ToastVariant) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Date.now() + Math.random();
    setItems((cur) => [...cur, { id, message, variant }]);
    setTimeout(() => {
      setItems((cur) => cur.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed top-4 left-1/2 z-[9999] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {items.map((t) => (
          <Toast key={t.id} item={t} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function Toast({ item }: { item: ToastItem }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const styles = {
    success: { bar: 'bg-m3-green', icon: <CheckCircle2 className="h-5 w-5 text-m3-green" /> },
    error: { bar: 'bg-m3-red', icon: <AlertCircle className="h-5 w-5 text-m3-red" /> },
    info: { bar: 'bg-m3-primary', icon: <Info className="h-5 w-5 text-m3-primary" /> },
  }[item.variant];

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 overflow-hidden rounded-2xl border border-m3-outline-variant bg-m3-surface pl-0 pr-5 py-4 shadow-elev-4 transition-all duration-500 ease-out ${
        visible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'
      }`}
    >
      <span className={`h-full w-1.5 self-stretch ${styles.bar}`} />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-m3-surface-container-high shadow-sm">
        {styles.icon}
      </div>
      <p className="text-[14px] font-bold text-m3-ink leading-tight">{item.message}</p>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
