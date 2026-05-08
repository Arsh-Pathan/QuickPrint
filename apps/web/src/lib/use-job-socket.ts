'use client';
import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { WS_NAMESPACE, type PrintJobStatus } from '@quickprint/shared';

const WS = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';
let shared: Socket | null = null;

function getSocket() {
  if (shared) return shared;
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('qp_token') : null;
  shared = io(`${WS}${WS_NAMESPACE}`, {
    transports: ['websocket'],
    auth: token ? { token } : undefined,
  });
  return shared;
}

export function useJobSocket(
  jobId: string,
  onStatus: (e: { status: PrintJobStatus; eta?: number }) => void,
) {
  useEffect(() => {
    const socket = getSocket();
    socket.emit('subscribe:job', jobId);
    const handler = (evt: { jobId: string; status: PrintJobStatus; eta?: number }) => {
      if (evt.jobId === jobId) onStatus(evt);
    };
    socket.on('job:status', handler);
    return () => {
      socket.off('job:status', handler);
    };
  }, [jobId, onStatus]);
}
