import type { CreatePrintJobDto } from '@quickprint/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('qp_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`api_${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  anonymousLogin: (name?: string) =>
    http<{ token: string; user: { id: string; phone: string | null; name: string | null; role: string } }>(
      '/auth/anonymous',
      { method: 'POST', body: JSON.stringify({ name: name ?? '' }) },
    ),
  signUpload: (body: { fileName: string; mimeType: string; fileSize: number }) =>
    http<{ uploadUrl: string; fileKey: string }>('/files/sign-upload', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  upload: async (uploadUrl: string, file: File) => {
    const res = await fetch(uploadUrl, { method: 'PUT', body: file });
    if (!res.ok) throw new Error(`upload_failed_${res.status}`);
  },
  createJob: (dto: CreatePrintJobDto) =>
    http<{ id: string; priceTotalPaise: number; pages: number }>('/print-jobs', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  getJob: (id: string) => http<{ id: string; status: string }>(`/print-jobs/${id}`),
  createOrder: (jobId: string) =>
    http<{ orderId: string; amountPaise: number; keyId: string }>('/payments/orders', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
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
};
