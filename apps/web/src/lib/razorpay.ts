let _loadPromise: Promise<boolean> | null = null;

export function preloadRazorpay(): void {
  if (_loadPromise) return;
  if (typeof window === 'undefined') return;
  if (window.Razorpay) { _loadPromise = Promise.resolve(true); return; }
  _loadPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      _loadPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

export function loadRazorpay(): Promise<boolean> {
  if (!_loadPromise) preloadRazorpay();
  return _loadPromise!;
}

interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
  vpa?: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  prefill: RazorpayPrefill;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  config?: any;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}
