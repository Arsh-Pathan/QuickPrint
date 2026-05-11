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
    success: { bar: 'bg-emerald-500', icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" /> },
    error: { bar: 'bg-[#d93025]', icon: <AlertCircle className="h-5 w-5 text-[#d93025]" /> },
    info: { bar: 'bg-brand-500', icon: <Info className="h-5 w-5 text-brand-500" /> },
  }[item.variant];

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 overflow-hidden rounded-xl border border-[#dadce0] bg-white pl-0 pr-4 py-3 shadow-lg transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
      }`}
    >
      <span className={`h-full w-1 self-stretch ${styles.bar}`} />
      {styles.icon}
      <p className="text-sm font-medium text-[#202124] leading-snug">{item.message}</p>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
