# Critical Fixes Applied & Production Scenarios

Date: 2026-05-10
Companion to: `docs/MOCK_DEAD_CODE_AUDIT.md`

This document records the critical production-readiness fixes applied to QuickPrint and lists the failure scenarios they prevent. Where a scenario is still partially open, a follow-up is noted.

---

## 1. Fixes Applied

### Fix #2 — Agent WebSocket auth validated

**File:** `apps/backend/src/modules/realtime/realtime.gateway.ts`

The realtime gateway now verifies the agent's `auth.token` against `AGENT_TOKEN_SECRET` using HMAC-SHA256 over the shop ID. Connections without a valid token are disconnected. In production, missing `AGENT_TOKEN_SECRET` rejects all agents (fail-closed). In dev, missing secret falls back to permissive mode with a warning so local development still works.

**Token issuance:** new script `apps/backend/scripts/issue-agent-token.ts`, exposed as `npm.cmd --workspace apps/backend run issue-agent-token <shopId>`. The printed token goes into the agent's `AGENT_TOKEN` env var. Token rotation = change `AGENT_TOKEN_SECRET` and reissue.

### Fix #3 — Razorpay silent mock removed in production

**File:** `apps/backend/src/modules/payments/razorpay.service.ts`

The constructor now throws on production startup if `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, or `RAZORPAY_WEBHOOK_SECRET` are missing. `createOrder` throws instead of returning a mock order. `verifyClientSignature` and `verifyWebhookSignature` return `false` (reject) when the secret is missing in production, instead of the previous `return true` dev pass-through. Dev pass-through is preserved with a warning log.

### Fix #4 — Dummy-printer default inverted and locked in production

**File:** `apps/print-agent/src/main/config.ts`

`AGENT_DUMMY_PRINTER` is now opt-in (`=== 'true'`). Production builds (`NODE_ENV === 'production'`) ignore the flag entirely and force real printing — even if the env is misconfigured, prod cannot silently simulate. A loud multi-line warning is logged when dummy mode is active. Required envs `AGENT_SHOP_ID` and `AGENT_TOKEN` now fail-fast on production startup if missing.

### Fix #5 — Razorpay webhook handlers implemented

**File:** `apps/backend/src/modules/payments/payments.service.ts`

Implemented handlers for:

- `payment.captured` — authoritative confirm. Updates `Payment.status = CAPTURED` and enqueues the job if the client-side confirm never fired (closed tab, network drop). Idempotent against `confirmClientSuccess`.
- `payment.failed` — marks `Payment.status = FAILED`, logs error code, leaves the job in `CREATED` so the user can retry payment.
- `refund.created` / `refund.processed` — marks `Payment.status = REFUNDED`. If the job is still `CREATED|PAID|QUEUED`, removes its queue entry and sets `PrintJob.status = CANCELLED` with `failureReason = 'refunded'`.

All handlers are idempotent on (`razorpayOrderId`, current status) — re-delivery of the same event is a no-op.

`PaymentsModule` now imports `QueueModule` so the refund flow can call `queue.cancel`.

### Fix #1 — Single-shop config from env (not hardcoded)

**Files:**
- `apps/admin/src/lib/config.ts` (new) — `SHOP_ID` exported from `NEXT_PUBLIC_SHOP_ID`.
- `apps/admin/src/app/page.tsx`, `printers/page.tsx`, `queue/page.tsx`, `lib/socket.ts` — all consume from `@/lib/config` instead of hardcoded literals.
- `apps/backend/src/modules/print-jobs/print-jobs.service.ts` — `defaultShopId` reads from `process.env.SHOP_ID`.
- `apps/backend/src/main.ts` — `assertProdEnv()` runs before bootstrap. In production, missing or placeholder values for `SHOP_ID`, `JWT_SECRET`, `AGENT_TOKEN_SECRET`, `ADMIN_PASSWORD`, `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET`, `DATABASE_URL` cause the backend to refuse to start.
- `apps/backend/.env` — added `SHOP_ID` and `NEXT_PUBLIC_SHOP_ID`, documented `AGENT_DUMMY_PRINTER`, added pointer to the token-issuance script.

This matches the single-shop deployment model: one backend, one admin, one agent, one shop, all sharing one `SHOP_ID` value set once.

---

## 2. Production Scenarios — What Could Still Break, and How We're Defending

### S1. Attacker connects a fake agent and steals jobs

- **Mechanism:** WebSocket client claims `role='AGENT'` and a real shop ID.
- **Blast radius:** Job assignment goes to the attacker's machine; files are downloaded; legitimate prints never happen; students paid for nothing.
- **Status:** Mitigated by Fix #2 (HMAC token).
- **Residual risk:** If `AGENT_TOKEN` leaks (e.g. screenshot of env file), attacker can impersonate. **Prevent:** keep `AGENT_TOKEN` only on the shop PC, rotate the secret if you suspect leak, never paste it in chat/screenshots.

### S2. Backend deployed without Razorpay keys → silent free prints

- **Mechanism:** Old code returned mock orders if keys were missing; jobs got queued without any real charge.
- **Status:** Fixed by Fix #3 — boot now throws.
- **Prevent ongoing:** the `assertProdEnv()` check at startup is the single source of truth. Deploy pipelines should run a smoke check: backend container exits non-zero immediately if envs are wrong.

### S3. Webhook signature spoofing

- **Mechanism:** Attacker POSTs forged webhook events to `/api/payments/webhook` to mark unpaid jobs as captured.
- **Status:** Mitigated. Razorpay HMAC is verified at controller level; `verifyWebhookSignature` now rejects in production when secret is unset (instead of `return true`).
- **Prevent:** rotate `RAZORPAY_WEBHOOK_SECRET` if compromised; enable Cloudflare WAF rule to allow `/api/payments/webhook` only from Razorpay IPs (defense-in-depth).

### S4. Closed-tab payment ⇒ paid but never printed

- **Mechanism:** Student pays on Razorpay, closes the browser before the redirect fires `confirmClientSuccess`. Job stays `CREATED`, money is captured.
- **Status:** Fixed by Fix #5 — `payment.captured` webhook is now authoritative and enqueues the job even without client confirm.
- **Prevent:** Razorpay dashboard webhook URL must be set to `https://<your-tunnel>/api/payments/webhook`; verify webhook delivery in Razorpay test mode before go-live.

### S5. Refunded job still prints

- **Mechanism:** Operator refunds a job that's already in the queue.
- **Status:** Fixed. Refund handler cancels the queue entry and flips the job to `CANCELLED`.
- **Residual:** if the job has already moved to `PRINTING` or `COMPLETED` when refund arrives, the print can't be unprinted. Operator handles physical reconciliation. Refund still updates `Payment.status` for accounting.

### S6. Duplicate prints from webhook + client confirm racing

- **Mechanism:** Both `confirmClientSuccess` and `payment.captured` webhook fire for the same payment.
- **Status:** Both paths early-return when `Payment.status === 'CAPTURED'`. `markPaidAndEnqueue` is only invoked when the job is still `CREATED`.
- **Residual:** under heavy concurrency two `confirmClientSuccess` calls could race. **Prevent:** consider adding a unique constraint on (`razorpayOrderId`, `status='CAPTURED'`) or wrapping the transition in a Prisma `$transaction` with an existence check. Low priority; the current idempotency check is defensive enough for shop-scale traffic.

### S7. Agent silently runs in dummy mode in production

- **Mechanism:** `AGENT_DUMMY_PRINTER=true` left in the env from a dev test. Jobs get marked complete, money was captured, but nothing was actually printed.
- **Status:** Fixed by Fix #4 — production builds reject the flag and log an error.
- **Prevent:** the package script `package:win` should be invoked with `NODE_ENV=production`. Add a build-time CI assertion if needed.

### S8. Admin dashboard hits the wrong shop

- **Mechanism:** Multi-shop deployment with stale hardcoded `'shop_local_dev'`.
- **Status:** Fixed by Fix #1. Single-shop deployment model is now explicit (per your design): one config value drives admin, backend, and agent.
- **Prevent:** the three `SHOP_ID` values (`SHOP_ID`, `NEXT_PUBLIC_SHOP_ID`, `AGENT_SHOP_ID`) must match. Document in deploy runbook; consider a startup sanity check that compares them.

### S9. Agent disconnects mid-shift, paid jobs sit in QUEUED forever

- **Mechanism:** Agent loses network. New paid jobs are enqueued and `assignJobToAgent` returns false, but no recovery path fetches the backlog when the agent reconnects.
- **Status:** **Open** (audit item #7).
- **Prevent:** add a `GET /api/agent/pending-jobs` endpoint the agent calls on (re)connect, returning all `QUEUED` jobs for its shop. Track in `WHATS_LEFT.md`.

### S10. Same file re-uploaded → re-paid → printed twice

- **Mechanism:** Student pays, prints, then refreshes and clicks pay again on the same job.
- **Status:** Mitigated. `confirmClientSuccess` checks `job.status !== 'CREATED'` before allowing payment (`createOrder` rejects with `job_not_payable`). Idempotent webhook re-delivery is also blocked.
- **Residual:** nothing prevents the same _file_ being uploaded as a new job. That's by design — students should be able to print the same file twice if they pay twice.

### S11. PDF integrity tampered between upload and print

- **Mechanism:** S3/local file replaced after upload but before agent download.
- **Status:** Mitigated. Backend computes SHA-256 at analysis time; agent recomputes during streamed download and rejects on mismatch (`integrity_check_failed`). Job retries up to 5 times then fails permanently.
- **Prevent ongoing:** keep S3 bucket private and signed-URL only; the existing `apps/backend/src/modules/files/storage.service.ts` already does this for both drivers.

### S12. Crash mid-print loses the job

- **Mechanism:** Agent dies after claiming a job but before completing the print.
- **Status:** Mitigated by `queue.releaseAllClaims()` in `QueueProcessor.start()` — the job is reclaimable on restart. SQLite is durable; jobs survive a power cut.
- **Residual:** if the print physically started and the agent crashed, the job will be retried and may reprint. Acceptable for a print shop (Maddy can throw away the duplicate); not acceptable for receipts/legal docs (not in scope).

---

## 3. Deployment Checklist (single-shop)

Before the first production deploy:

- [ ] Set `NODE_ENV=production` in backend, admin build, and agent.
- [ ] Generate `JWT_SECRET` and `AGENT_TOKEN_SECRET` (`openssl rand -hex 32` ×2).
- [ ] Set `SHOP_ID`, `NEXT_PUBLIC_SHOP_ID`, `AGENT_SHOP_ID` to the same value.
- [ ] Strong `ADMIN_PASSWORD` (no defaults).
- [ ] Real Razorpay live keys: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Razorpay dashboard webhook URL points at `https://<cloudflare-tunnel>/api/payments/webhook` and is enabled for `payment.captured`, `payment.failed`, `refund.created`, `refund.processed`.
- [ ] Run `npm.cmd --workspace apps/backend run issue-agent-token <SHOP_ID>` once and put the output into the agent's `AGENT_TOKEN`.
- [ ] Confirm `AGENT_DUMMY_PRINTER` is unset or `false` (production build will refuse it anyway).
- [ ] Verify backend exits non-zero with informative error if any required env is missing — this is the production canary.
- [ ] Set `STORAGE_DRIVER` (local or s3) and required keys; if S3, fix audit item #6 (file size).

---

## 4. Future Architecture — Single-Shop Self-Hosted Bundle

(Captured here per discussion, not implemented yet.)

QuickPrint will ship as a single-host bundle: backend + admin + web + Postgres + agent all run on the shop owner's PC. External access uses a Cloudflare Tunnel. The deliverable is one installer that:

- Provisions Postgres (Docker or embedded).
- Generates secrets on first run (`JWT_SECRET`, `AGENT_TOKEN_SECRET`, `ADMIN_PASSWORD`).
- Asks the operator for `SHOP_ID`, `SHOP_NAME`, Razorpay keys.
- Issues the agent token automatically and wires the agent config.
- Sets up the Cloudflare Tunnel (`cloudflared` is already in `docker-compose.yml`).
- Writes a single `.env` file consumed by all services — no code edits.

A first-run setup wizard (web UI) is the natural place to capture these values. Tracked separately; do not implement until the critical stabilization above is verified live.

---

## 5. Verification

After applying these fixes:

```powershell
npm.cmd --workspace apps/backend run typecheck     # PASSED
npm.cmd --workspace apps/admin run typecheck        # PASSED
npm.cmd --workspace apps/print-agent run typecheck  # PASSED
```

Runtime smoke checks still required (per `WHATS_LEFT.md` §1):

- Razorpay test-mode order → confirm via webhook only (close the browser tab to skip client confirm).
- Razorpay test-mode `payment.failed` simulation.
- Razorpay test-mode refund → verify queue cancel and job CANCELLED state.
- Connect agent with valid token → confirm joined.
- Connect agent with invalid token → confirm rejected.
- Backend boot with one missing required env → confirm fail-fast.
