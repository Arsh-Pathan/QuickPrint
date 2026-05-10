import { useAuth } from './auth';

class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuth.getState().token;
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    if (res.status === 401) {
      useAuth.getState().logout();
    }
    const msg =
      (body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : null) ?? `request_failed_${res.status}`;
    throw new ApiError(res.status, body, msg);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export { ApiError };

// ── Domain types ────────────────────────────────────────────────────────────
export type PrintJobStatus =
  | 'CREATED'
  | 'PAID'
  | 'QUEUED'
  | 'PRINTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type PrinterStatusEnum =
  | 'ONLINE'
  | 'OFFLINE'
  | 'BUSY'
  | 'PAPER_OUT'
  | 'TONER_LOW'
  | 'JAM'
  | 'ERROR';

export interface PrintJob {
  id: string;
  ownerId: string;
  shopId: string | null;
  fileName: string;
  pages: number;
  copies: number;
  color: boolean;
  duplex: boolean;
  paperSize: string;
  status: PrintJobStatus;
  priceTotalPaise: number;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
  printedAt: string | null;
}

export interface QueueItem {
  jobId: string;
  shopId: string;
  position: number;
  priority: number;
  etaSeconds: number;
  job: PrintJob;
}

export interface PrinterRow {
  id: string;
  shopId: string;
  name: string;
  driver: string | null;
  status: PrinterStatusEnum;
  supportsColor: boolean;
  supportsDuplex: boolean;
  lastSeenAt: string | null;
}

export interface AdminStats {
  jobsCompletedToday: number;
  jobsFailedToday: number;
  jobsInQueue: number;
  earningsTodayPaise: number;
}
