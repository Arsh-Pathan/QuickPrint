'use client';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth';
import { SHOP_ID } from './config';

const NAMESPACE = '/realtime';

let singleton: Socket | null = null;

function getSocket(token: string | null): Socket {
  if (singleton && singleton.connected) return singleton;
  if (singleton) {
    singleton.disconnect();
    singleton = null;
  }
  singleton = io(NAMESPACE, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token, role: 'ADMIN', shopId: SHOP_ID },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return singleton;
}

/**
 * Subscribes to the shop room and invalidates queue/printer queries on
 * relevant server events. Wire this once at the layout level.
 */
export function useShopSocket() {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();

  useEffect(() => {
    if (!token) return;
    const sock = getSocket(token);

    const onConnect = () => {
      sock.emit('subscribe:shop', SHOP_ID);
    };
    const onJobChange = () => {
      qc.invalidateQueries({ queryKey: ['queue'] });
      qc.invalidateQueries({ queryKey: ['admin-jobs'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    };
    const onPrinterStatus = () => {
      qc.invalidateQueries({ queryKey: ['printers'] });
    };
    const onQueueFlag = () => {
      qc.invalidateQueries({ queryKey: ['queue'] });
    };

    sock.on('connect', onConnect);
    sock.on('job:status', onJobChange);
    sock.on('job:progress', onJobChange);
    sock.on('printer:status', onPrinterStatus);
    sock.on('queue:paused', onQueueFlag);
    sock.on('queue:resumed', onQueueFlag);

    if (sock.connected) onConnect();

    return () => {
      sock.off('connect', onConnect);
      sock.off('job:status', onJobChange);
      sock.off('job:progress', onJobChange);
      sock.off('printer:status', onPrinterStatus);
      sock.off('queue:paused', onQueueFlag);
      sock.off('queue:resumed', onQueueFlag);
    };
  }, [token, qc]);
}

/** Connection-status indicator for the sidebar/header. */
export function useSocketStatus(): 'connected' | 'connecting' | 'disconnected' {
  const token = useAuth((s) => s.token);
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>(
    'disconnected',
  );

  useEffect(() => {
    if (!token) {
      setStatus('disconnected');
      return;
    }
    const sock = getSocket(token);
    setStatus(sock.connected ? 'connected' : 'connecting');
    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
    };
  }, [token]);

  return status;
}
