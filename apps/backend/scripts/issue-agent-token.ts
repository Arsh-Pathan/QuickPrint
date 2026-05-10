/**
 * Issues an agent token for a given shop. Run on the backend host where
 * AGENT_TOKEN_SECRET is configured.
 *
 * Usage:
 *   npx ts-node scripts/issue-agent-token.ts <shopId>
 *
 * The printed token goes into the print-agent's AGENT_TOKEN env var.
 * Treat it like a password: rotate by changing AGENT_TOKEN_SECRET.
 */
import { createHmac } from 'node:crypto';

const shopId = process.argv[2];
if (!shopId) {
  console.error('usage: issue-agent-token <shopId>');
  process.exit(1);
}

const secret = process.env.AGENT_TOKEN_SECRET;
if (!secret) {
  console.error('AGENT_TOKEN_SECRET is not set');
  process.exit(1);
}

const token = createHmac('sha256', secret).update(shopId).digest('hex');
process.stdout.write(`${token}\n`);
