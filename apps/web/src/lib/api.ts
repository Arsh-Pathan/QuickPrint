import type { CreatePrintJobDto, PrintSettings } from '@quickprint/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  let token: string | null = null;
  try { token = window.localStorage.getItem('qp_token'); } catch { /* private browsing */ }
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Drop every place the token is cached on the client. Both `qp_token` (read by
// `authHeaders`) and `qp_auth` (zustand-persisted store) must clear, otherwise
// the next page reload re-hydrates the same dead token.
function clearStoredAuth() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem('qp_token'); } catch { /* private browsing */ }
  try { window.localStorage.removeItem('qp_auth'); } catch { /* private browsing */ }
}

// Best-effort silent recovery: trade the stale token for a fresh anonymous one
// so the caller can retry. Used when the backend reports the user the JWT
// references no longer exists (anonymous-user pruning, DB reseed, etc.).
async function reissueAnonymousToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  clearStoredAuth();
  try {
    const res = await fetch(`${BASE}/api/auth/anonymous`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    if (!data?.token) return null;
    try { window.localStorage.setItem('qp_token', data.token); } catch { /* private browsing */ }
    return data.token;
  } catch {
    return null;
  }
}

const REQUEST_TIMEOUT = 30_000;

async function http<T>(path: string, init?: RequestInit, _retry = false): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(`${BASE}/api${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...init?.headers,
      },
    });
    if (res.status === 401 && !_retry && path !== '/auth/anonymous') {
      const fresh = await reissueAnonymousToken();
      if (fresh) return http<T>(path, init, true);
    }
    if (!res.ok) throw new Error(`api_${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  anonymousLogin: (input: { name?: string; phone?: string } | string = {}) => {
    const body = typeof input === 'string' ? { name: input } : input;
    return http<{ token: string; user: { id: string; phone: string | null; name: string | null; role: string } }>(
      '/auth/anonymous',
      { method: 'POST', body: JSON.stringify(body) },
    );
  },
  me: () => http<{ id: string; phone: string | null; name: string | null; role: string }>('/users/me'),
  queuePosition: (jobId: string) =>
    http<{ position: number; total: number; etaSeconds: number } | null>(`/print-jobs/${jobId}/queue-position`),
  signUpload: (body: { fileName: string; mimeType: string; fileSize: number }) =>
    http<{ uploadUrl: string; fileKey: string }>('/files/sign-upload', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  upload: async (uploadUrl: string, file: File, signal?: AbortSignal) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 300_000);
    try {
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        signal: signal ?? controller.signal,
      });
      if (!res.ok) throw new Error(`upload_failed_${res.status}`);
    } finally {
      clearTimeout(timer);
    }
  },
  createJob: (dto: CreatePrintJobDto) =>
    http<{ id: string; priceTotalPaise: number; pages: number }>('/print-jobs', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  updateJobSettings: (id: string, settings: PrintSettings) =>
    http<{ id: string; priceTotalPaise: number; pages: number }>('/print-jobs/' + id + '/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),
  getJob: (id: string) =>
    http<{
      id: string;
      status: string;
      fileName: string;
      fileKey: string;
      mimeType: string;
      pages: number;
      color: boolean;
      duplex: boolean;
      copies: number;
      paperSize: string;
      priceTotalPaise: number;
      previewUrl?: string;
    }>(`/print-jobs/${id}`),
  createOrder: (jobId: string) =>
    http<{ orderId: string; amountPaise: number; keyId: string }>('/payments/orders', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    }),
  createBatchOrder: (jobIds: string[]) =>
    http<{ orderId: string; amountPaise: number; keyId: string; jobIds: string[] }>('/payments/batch-order', {
      method: 'POST',
      body: JSON.stringify({ jobIds }),
    }),
  confirmPayment: (body: {
    orderId: string;
    paymentId: string;
    signature: string;
  }) =>
    http<{ ok: boolean }>('/payments/confirm', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  reprintJob: (sourceId: string, settings?: PrintSettings) =>
    http<{ id: string; priceTotalPaise: number; pages: number }>(`/print-jobs/${sourceId}/reprint`, {
      method: 'POST',
      body: JSON.stringify(settings ? { settings } : {}),
    }),
  publicSettings: () =>
    http<{
      shopName: string;
      acceptingJobs: boolean;
      defaultPaperSize: string;
      bwPaise: number;
      colorPaise: number;
      duplexDiscountPct: number;
    }>('/settings/public'),
  publicQueue: () =>
    http<{ jobsInQueue: number; etaMinutes: number; acceptingJobs: boolean }>('/queue/public'),
};
