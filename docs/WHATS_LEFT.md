# What's Left

This file lists the main work still remaining in the QuickPrint repository based on the current codebase.

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

## 3. Agent Authentication Hardening

The realtime gateway still contains a TODO around agent token validation.

Current gap:

- agent socket connections are grouped by `shopId`, but the gateway comment still notes that `auth.token` should be validated against `AGENT_TOKEN_SECRET`

## 4. Payment Webhook Handling Expansion

`apps/backend/src/modules/payments/payments.service.ts` still contains a TODO around additional webhook event handling.

What remains:

- explicit handling for `payment.captured`
- explicit handling for `payment.failed`
- refund-related event handling

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
- documented deployment playbooks for production
- explicit seeded admin and shop bootstrap flow
- better reconciliation between printers discovered by the agent and printers stored in the backend

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
