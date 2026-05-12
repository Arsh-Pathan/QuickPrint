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
      <div className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3 items-end">
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
    success: { 
      icon: <CheckCircle2 size={18} />, 
      color: 'text-m3-green', 
      bg: 'bg-m3-green-container/20',
      border: 'border-m3-green/20'
    },
    error: { 
      icon: <AlertCircle size={18} />, 
      color: 'text-m3-red', 
      bg: 'bg-m3-red-container/20',
      border: 'border-m3-red/20'
    },
    info: { 
      icon: <Info size={18} />, 
      color: 'text-m3-primary', 
      bg: 'bg-m3-primary-container/20',
      border: 'border-m3-primary/20'
    },
  }[item.variant];

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 overflow-hidden rounded-2xl border bg-m3-surface/80 backdrop-blur-xl px-4 py-3 shadow-elev-5 transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275) ${
        visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-90'
      } ${styles.border} min-w-[280px] max-w-sm`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.bg} ${styles.color}`}>
        {styles.icon}
      </div>
      <div className="flex-1">
        <p className="text-[14px] font-bold text-m3-ink leading-tight">{item.message}</p>
        <div className="mt-1 h-1 w-full bg-m3-outline-variant/30 rounded-full overflow-hidden">
          <div className={`h-full ${styles.bg} brightness-75 animate-[shimmer_2s_infinite]`} style={{ width: '30%' }} />
        </div>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
