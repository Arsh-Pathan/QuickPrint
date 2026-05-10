# What's Left

This file lists the main work still remaining in the QuickPrint repository based on the current codebase.

> **Update 2026-05-10:** Critical production-readiness fixes have landed. See [`CRITICAL_FIXES_AND_SCENARIOS.md`](./CRITICAL_FIXES_AND_SCENARIOS.md) for what was fixed (agent auth, Razorpay mock removal, webhook handlers, dummy-printer default, single-shop config). Items #3, #4 below are now resolved; the remaining items below are still open.

## 1. Live End-to-End Validation

These are not fully proved by the current automated checks:

- student upload to payment to print flow in a running environment
- Razorpay test-mode payment confirmation against live keys
- print-agent execution on a Windows machine with real printers
- long-running reconnect and recovery behavior for the agent
- fresh-environment database migration validation

## 2. Admin Dashboard Completion

These admin areas are still incomplete:

- `apps/admin/src/app/analytics/page.tsx` is a placeholder
- `apps/admin/src/app/settings/page.tsx` is a placeholder

What remains:

- analytics queries and charts
- settings persistence for pricing and shop defaults
- agent provisioning and operational controls UI

## 3. Agent Authentication Hardening — DONE (2026-05-10)

Implemented in `apps/backend/src/modules/realtime/realtime.gateway.ts`. Agent sockets now verify `auth.token` as `HMAC-SHA256(shopId, AGENT_TOKEN_SECRET)`. Tokens are issued via `npm.cmd --workspace apps/backend run issue-agent-token <shopId>`. Fail-closed in production; permissive (with warning) in dev.

## 4. Payment Webhook Handling Expansion — DONE (2026-05-10)

Implemented in `apps/backend/src/modules/payments/payments.service.ts`:

- `payment.captured` — authoritative confirm (handles closed-tab payments)
- `payment.failed` — marks payment failed, leaves job retryable
- `refund.created` / `refund.processed` — refunds payment, cancels job + queue entry

All idempotent on payment id and current status.

## 5. OTP Provider Integrations

Current state:

- local development can use mock OTP mode

What remains:

- real `MSG91` integration path
- real `Twilio` integration path
- end-to-end validation of provider-backed OTP delivery

## 6. Operational and Product Hardening

Good next improvements:

- stronger runtime monitoring and error dashboards
- documented deployment playbooks for production (deployment checklist now in `CRITICAL_FIXES_AND_SCENARIOS.md` §3)
- explicit seeded admin and shop bootstrap flow
- better reconciliation between printers discovered by the agent and printers stored in the backend
- agent reconnect backlog — `GET /api/agent/pending-jobs` so a reconnecting agent picks up jobs assigned during downtime (audit scenario S9)
- S3 file size — `storage.service.ts` `statLocal()` returns 0 for S3; needs `HeadObject`
- single-host bundle + first-run setup wizard (Cloudflare tunnel) — see `CRITICAL_FIXES_AND_SCENARIOS.md` §4

## 7. Test Coverage Growth

Baseline tests exist now, but more coverage is still needed.

Highest-value additions:

- backend service tests for payments and queue logic
- integration tests for `print-jobs` creation and payment confirmation
- frontend tests for student login, upload, and job tracking
- admin dashboard integration tests
- agent workflow tests around retry and integrity-failure handling

## 8. Documentation Maintenance

The markdown set is now aligned to the current repo, but it will need ongoing updates whenever:

- API routes change
- upload support changes
- Docker configuration changes
- admin pages move from placeholder to live functionality
- agent auth and printer behavior are hardened
