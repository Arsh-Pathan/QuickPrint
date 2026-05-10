# Mock / Dead / Placeholder Code Audit

Date: 2026-05-10
Scope: full monorepo (apps/backend, apps/web, apps/admin, apps/print-agent, packages/shared)

This audit identifies code that is mocked, stubbed, hardcoded for development, dead, or otherwise not production-ready. Findings are grouped by severity.

> **Update 2026-05-10:** All five Critical findings have been fixed. See [`CRITICAL_FIXES_AND_SCENARIOS.md`](./CRITICAL_FIXES_AND_SCENARIOS.md) for implementation details, scenarios prevented, and the deployment checklist. Items below now show **[FIXED]** markers where applicable; Medium and Low items are still open.

---

## Critical — Deploy Blockers

### 1. Hardcoded `shop_local_dev` shop ID — **[FIXED]**

The dev shop ID is wired into both the admin UI and the agent defaults. With a real shop, none of these will resolve correctly.

- `apps/admin/src/app/page.tsx:17` — `SHOP_ID = 'shop_local_dev'`
- `apps/admin/src/app/printers/page.tsx:15` — `SHOP_ID = 'shop_local_dev'`
- `apps/admin/src/app/queue/page.tsx:8` — `SHOP_ID = 'shop_local_dev'`
- `apps/admin/src/lib/socket.ts:8` — `SHOP_ID = 'shop_local_dev'`
- `apps/backend/src/modules/print-jobs/print-jobs.service.ts:144` — fallback to `'shop_local_dev'`
- `apps/print-agent/src/main/config.ts:15-16` — defaults `'shop_local_dev'` and `'dev-token'`

**Resolution:** QuickPrint is a single-shop deployment. Centralized `SHOP_ID` via env (`SHOP_ID` backend, `NEXT_PUBLIC_SHOP_ID` admin, `AGENT_SHOP_ID` agent). Admin reads from `apps/admin/src/lib/config.ts`. Backend `assertProdEnv()` in `main.ts` fails fast on missing/placeholder values in production. Agent fails fast on missing `AGENT_SHOP_ID` / `AGENT_TOKEN` in production builds.

### 2. Agent WebSocket auth not validated (security) — **[FIXED]**

- `apps/backend/src/modules/realtime/realtime.gateway.ts:42` — TODO: validate `auth.token` against `AGENT_TOKEN_SECRET`

Any client connecting with `role='AGENT'` is currently trusted. An attacker could claim agent identity and consume jobs or report fake status.

**Resolution:** `realtime.gateway.ts` now verifies `HMAC-SHA256(shopId, AGENT_TOKEN_SECRET)` against the supplied token using `timingSafeEqual`. Fail-closed in production. Token issuance via `npm.cmd --workspace apps/backend run issue-agent-token <shopId>`.

### 3. Razorpay silently falls back to mock orders — **[FIXED]**

- `apps/backend/src/modules/payments/razorpay.service.ts:35-42`
  - L36: `this.logger.warn('Razorpay keys missing; returning mock order')`
  - L38: `orderId: \`mock_${receipt}_${Date.now()}\``
  - L41: `keyId: this.keyId || 'rzp_test_mock'`

If `RAZORPAY_KEY_ID/SECRET` are missing in production, the system issues fake order IDs instead of failing — students appear to pay but nothing is actually charged.

**Resolution:** `RazorpayService` constructor throws on prod startup if `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET` are missing. `createOrder` throws in prod when client is unconfigured. `verifyClientSignature` and `verifyWebhookSignature` return `false` (reject) in prod when secrets are missing — closes the previous `return true` dev pass-through.

### 4. Dummy printer enabled by default in the agent — **[FIXED]**

- `apps/print-agent/src/main/config.ts:19` — `dummyPrinter: process.env.AGENT_DUMMY_PRINTER !== 'false'`
- `apps/print-agent/src/main/queue-processor.ts:166-169` — dummy mode sleeps 5s instead of printing

The default is **on**. A freshly deployed agent will simulate prints unless someone explicitly sets `AGENT_DUMMY_PRINTER=false`.

**Resolution:** Default inverted to opt-in (`=== 'true'`). Production builds reject the flag entirely — even a misconfigured env cannot enable simulation in prod. Loud multi-line warning logged when active in dev.

### 5. Payment webhook events ignored — **[FIXED]**

- `apps/backend/src/modules/payments/payments.service.ts:72-74` — TODO: handle `payment.captured`, `payment.failed`, refund events

Webhooks arrive but nothing happens. Failed payments and refunds never propagate to job status — users see stale "paid" jobs that will never print or never get refunded.

**Resolution:** Implemented `payment.captured` (authoritative confirm, handles closed-tab payments), `payment.failed` (marks payment failed, leaves job retryable), and `refund.created` / `refund.processed` (refunds payment, cancels queue entry, sets job to `CANCELLED`). All handlers idempotent. `PaymentsModule` now imports `QueueModule`.

---

## Medium — Fix Before Go-Live

### 6. S3 file size reported as zero

- `apps/backend/src/modules/files/storage.service.ts:132-133` — `statLocal()` returns `{ size: 0 }` for S3 keys

Any size validation, billing logic, or quota check will be wrong against S3 storage.

**Fix:** Call S3 `HeadObject` and return `ContentLength`.

### 7. Agent offline recovery / polling not implemented

- `apps/backend/src/modules/realtime/realtime.gateway.ts:89-90` — TODO: agent-initiated polling

If the agent disconnects mid-shift, there is no documented backfill path for jobs assigned during the gap.

**Fix:** Either implement an agent backfill endpoint (`GET /api/agent/pending-jobs`) or document the existing recovery behavior explicitly.

### 8. Hardcoded shop name default

- `apps/backend/src/modules/settings/settings.service.ts:28` — `shopName: "Maddy's Print Shop"`

**Fix:** Require `SHOP_NAME` env var, or seed real shop config and reject defaults at startup.

### 9. Simulation mode reads file every health-check tick

- `apps/print-agent/simulate.js` writes `dummy_status.txt`
- `apps/print-agent/src/main/health-monitor.ts:68-82` reads it on every poll
- L79-81 silently swallows errors with a fall-back-to-online comment

Simulation file I/O ships in production builds, and the silent catch could mask real disk errors.

**Fix:** Gate simulation reads behind `NODE_ENV !== 'production'`. Log at `warn` when the read fails for unexpected reasons.

---

## Low — Cleanup

### 10. Test fixture in repo root

- `dummy.pdf` (~30 KB) at `C:\Users\ArshPathan\Projects\Websites\QuickPrint\dummy.pdf`

**Fix:** Move to `apps/print-agent/test/fixtures/` or delete.

### 11. Dev-only simulation script shipped

- `apps/print-agent/simulate.js`

**Fix:** Move to `scripts/` and exclude from packaged builds, or document clearly as dev-only.

### 12. Debug `console.error` in production UI

- `apps/admin/src/app/analytics/page.tsx:36` — `console.error('Analytics loading error:', err)`

**Fix:** Replace with structured logging or error boundary.

### 13. Verify `AnalyticsService` backend implementation

- `apps/admin/src/app/analytics/page.tsx` — calls `AnalyticsService.getDailyEarnings()`, `getPeakHours()`, `getTopSettings()`

Backend service was not located during the audit. Either the page is calling a non-existent service, or the service is named differently. Worth a 5-minute confirmation.

---

## Recommended Order of Fixes

**Critical items #1–#5 are complete** (see `CRITICAL_FIXES_AND_SCENARIOS.md`). Remaining order:

1. **#6–#9 Medium** — go-live polish: S3 size (when storage flips off `local`), agent reconnect backlog, hardcoded shop name default in `settings.service.ts`, simulation file I/O hardening.
2. **#10–#13 Low** — cleanup PR: remove `dummy.pdf`, gate `simulate.js` to dev, replace `console.error` in admin analytics, verify `AnalyticsService` backend impl exists.

---

## Out of Scope / Known Stubs (not blockers)

These are documented design choices, not findings:

- MSG91 / Twilio OTP integration paths — env-driven, mock provider used in dev (per `docs/WHATS_LEFT.md` §5).
- S3 vs local storage selection — env-driven driver pattern is intentional; only the `statLocal` size bug above is a real defect.
- Razorpay `rzp_test_*` test keys in dev — expected; finding #3 is specifically about the silent fallback when keys are absent entirely.
