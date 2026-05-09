import path from 'node:path';
import { app } from 'electron';

export interface AgentConfig {
  backendUrl: string;
  shopId: string;
  agentToken: string;
  heartbeatIntervalMs: number;
  localQueueDir: string;
  dummyPrinter: boolean;
}

export const config: AgentConfig = {
  backendUrl: process.env.AGENT_BACKEND_URL ?? 'http://localhost:4000',
  shopId: process.env.AGENT_SHOP_ID ?? 'shop_local_dev',
  agentToken: process.env.AGENT_TOKEN ?? 'dev-token',
  heartbeatIntervalMs: Number(process.env.AGENT_HEARTBEAT_INTERVAL_MS ?? 15_000),
  localQueueDir: process.env.AGENT_LOCAL_QUEUE_DIR ?? path.resolve('./local-queue'),
  dummyPrinter: process.env.AGENT_DUMMY_PRINTER === 'true',
};
