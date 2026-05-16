'use client';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { WS_NAMESPACE, type PrintJobStatus } from '@quickprint/shared';

const WS = process.env.NEXT_PUBLIC_WS_URL ?? '';
let shared: Socket | null = null;

function getSocket() {
  if (shared?.connected) return shared;
  if (shared) shared.close();
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('qp_token') : null;
  shared = io(`${WS}${WS_NAMESPACE}`, {
    transports: ['polling', 'websocket'],
    path: '/socket.io',
    auth: token ? { token } : undefined,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
    timeout: 10000,
  });
  return shared;
}

export interface JobLiveState {
  status: PrintJobStatus;
  eta?: number;
  position?: number;
  total?: number;
  pagesPrinted?: number;
  pagesTotal?: number;
  connected: boolean;
}

/**
 * Subscribes to a single print job's realtime feed. Returns the latest known
 * state and optionally invokes `onChange` whenever the status flips so the
 * caller can fire side effects (toasts, sounds, browser notifications).
 */
export function useJobSocket(
  jobId: string,
  initial: { status: PrintJobStatus } = { status: 'created' },
  onChange?: (next: JobLiveState, prev: JobLiveState) => void,
) {
  const [state, setState] = useState<JobLiveState>({
    status: initial.status,
    connected: false,
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const initialAppliedRef = useRef(false);

  useEffect(() => {
    if (initialAppliedRef.current) return;
    if (initial.status === 'created') return;
    const next = { ...stateRef.current, status: initial.status };
    stateRef.current = next;
    setState(next);
    initialAppliedRef.current = true;
  }, [initial.status]);

  useEffect(() => {
    const socket = getSocket();
    let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const apply = (patch: Partial<JobLiveState>) => {
      const prev = stateRef.current;
      const next = { ...prev, ...patch };
      stateRef.current = next;
      setState(next);
      if (changeRef.current && prev.status !== next.status) {
        changeRef.current(next, prev);
      }
    };

    const subscribe = () => socket.emit('subscribe:job', jobId);

    const onStatus = (evt: { jobId: string; status: PrintJobStatus; eta?: number }) => {
      if (evt.jobId !== jobId) return;
      apply({ status: evt.status, eta: evt.eta ?? stateRef.current.eta });
    };
    const onPosition = (evt: {
      jobId: string;
      position: number;
      etaSeconds: number;
      total: number;
    }) => {
      if (evt.jobId !== jobId) return;
      apply({ position: evt.position, total: evt.total, eta: evt.etaSeconds });
    };
    const onProgress = (evt: { jobId: string; pagesPrinted: number; pagesTotal: number }) => {
      if (evt.jobId !== jobId) return;
      apply({ pagesPrinted: evt.pagesPrinted, pagesTotal: evt.pagesTotal });
    };
    const onConnect = () => {
      if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null; }
      apply({ connected: true });
      subscribe();
    };
    const onDisconnect = () => {
      if (disconnectTimer) clearTimeout(disconnectTimer);
      disconnectTimer = setTimeout(() => apply({ connected: false }), 5000);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('job:status', onStatus);
    socket.on('queue:position', onPosition);
    socket.on('job:progress', onProgress);
    subscribe();
    if (socket.connected) apply({ connected: true });

    return () => {
      if (disconnectTimer) clearTimeout(disconnectTimer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('job:status', onStatus);
      socket.off('queue:position', onPosition);
      socket.off('job:progress', onProgress);
      socket.emit('unsubscribe:job', jobId);
    };
  }, [jobId]);

  return state;
}
