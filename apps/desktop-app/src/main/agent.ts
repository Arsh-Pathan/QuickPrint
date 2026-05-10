import log from 'electron-log';
import { config } from './config';
import { LocalQueue } from './local-queue';
import { PrinterDiscovery } from './printer-discovery';
import { HealthMonitor } from './health-monitor';
import { QueueProcessor } from './queue-processor';
import { BackendSocket } from './backend-socket';

let processor: QueueProcessor | null = null;
let monitor: HealthMonitor | null = null;
let socket: BackendSocket | null = null;

/**
 * Starts the agent. Wiring:
 *   PrinterDiscovery → seeds the printer registry
 *   HealthMonitor    → polls each printer, emits status deltas
 *   BackendSocket    → bidirectional channel to backend (jobs in, events out)
 *   LocalQueue       → SQLite-backed durable job queue (survives crashes)
 *   QueueProcessor   → drains LocalQueue, calls printers, retries on failure
 */
export async function startAgent() {
  log.info('agent: starting', { shopId: config.shopId, backend: config.backendUrl });

  const queue = new LocalQueue(config.localQueueDir);
  const discovery = new PrinterDiscovery();
  const printers = await discovery.list();
  log.info(`agent: discovered ${printers.length} printer(s)`, printers.map((p) => p.name));

  socket = new BackendSocket({
    url: config.backendUrl,
    token: config.agentToken,
    shopId: config.shopId,
    printers: printers.map(p => ({
      id: p.id,
      name: p.name,
      isDefault: p.isDefault,
    })),
  });
  await socket.connect();

  monitor = new HealthMonitor({
    printers,
    intervalMs: config.heartbeatIntervalMs,
    onChange: (snapshot) => socket?.emitPrinterEvent(snapshot),
  });
  monitor.start();

  processor = new QueueProcessor({
    queue,
    printers,
    socket,
    onError: (err) => log.error('processor error', err),
  });

  // Backend pushes jobs via socket; processor pulls from local queue.
  socket.onJobAssigned(async (job) => {
    await queue.enqueue(job);
    processor?.kick();
  });

  await processor.start();
  log.info('agent: ready');
}

export async function stopAgent() {
  log.info('agent: stopping');
  monitor?.stop();
  await processor?.stop();
  await socket?.disconnect();
}
