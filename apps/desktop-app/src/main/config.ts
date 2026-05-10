import path from 'node:path';
import { app } from 'electron';
import log from 'electron-log';

export interface AgentConfig {
  backendUrl: string;
  shopId: string;
  agentToken: string;
  heartbeatIntervalMs: number;
  localQueueDir: string;
  dummyPrinter: boolean;
  isProd: boolean;
}

const isProd = process.env.NODE_ENV === 'production';

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    if (isProd) {
      throw new Error(`${name} is required in production builds`);
    }
    log.warn(`${name} is not set — using dev fallback`);
  }
  return v ?? '';
}

import crypto from 'node:crypto';

const shopId = isProd
  ? required('AGENT_SHOP_ID')
  : process.env.AGENT_SHOP_ID ?? 'shop_local_dev';

const agentToken = isProd
  ? required('AGENT_TOKEN')
  : process.env.AGENT_TOKEN ?? crypto.createHmac('sha256', 'quickprint-local-agent-secret-stable-2026').update(shopId).digest('hex');


// Dummy printer is opt-in. Production builds refuse to enable it even if the
// flag is set, so a leaked env var can never silently simulate prints.
const dummyFlag = process.env.AGENT_DUMMY_PRINTER === 'true';
if (dummyFlag && isProd) {
  log.error('AGENT_DUMMY_PRINTER=true ignored in production build — real printing enforced');
}
const dummyPrinter = dummyFlag && !isProd;
if (dummyPrinter) {
  log.warn('=========================================================');
  log.warn('AGENT_DUMMY_PRINTER is ENABLED — no real printing will occur');
  log.warn('=========================================================');
}

export const config: AgentConfig = {
  backendUrl: process.env.AGENT_BACKEND_URL ?? 'http://localhost:4000',
  shopId,
  agentToken,
  heartbeatIntervalMs: Number(process.env.AGENT_HEARTBEAT_INTERVAL_MS ?? 15_000),
  localQueueDir: process.env.AGENT_LOCAL_QUEUE_DIR ?? path.resolve('./local-queue'),
  dummyPrinter,
  isProd,
};
