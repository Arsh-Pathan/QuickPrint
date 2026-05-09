# Audit Fixes - May 9, 2026

This file records the work completed after reviewing `AUDIT_REPORT.md` on May 9, 2026.

## Summary

Not every item in the audit report still matched the repository state. I first validated each finding against the current code, then fixed the issues that were still real.

## What Was Actually Fixed

### 1. Frontend build failures

Status: fixed

What changed:

- `apps/admin` root layout now imports global CSS and wraps the app in `Providers`
- `apps/web` no longer depends on `next/font/google` at build time
- both Next.js apps also no longer rely on remote Google font imports in `globals.css`

Why this mattered:

- admin was failing because React Query hooks rendered without a `QueryClientProvider`
- web build stability improved because production build no longer depended on remote font fetching

Verified with:

```powershell
npm.cmd --workspace apps/admin run build
cd apps\web
npx.cmd next build --debug
```

### 2. Automated testing baseline

Status: improved

What changed:

- existing shared pricing tests were retained
- added backend tests for `PageAnalyzerService`
- added backend tests for `AuthService.anonymousLogin`
- verified the root Vitest suite passes

Why this mattered:

- the audit said there were no tests, but that was no longer true
- backend-specific behavior around PDF analysis and guest cleanup now has direct coverage

Verified with:

```powershell
npm.cmd test
```

### 3. PDF color page analysis

Status: fixed

What changed:

- `PageAnalyzerService` now performs best-effort PDF color detection
- it inspects PDF content streams and XObject color space metadata
- it now returns a real `colorPages` count instead of always returning `0`

Important note:

- pricing still uses the user's selected session mode
- `colorPages` is currently metadata, analytics, and downstream signal, not mixed per-page billing

### 4. Anonymous user bloat

Status: mitigated

What changed:

- `AuthService.anonymousLogin()` now prunes stale anonymous student users older than 24 hours
- cleanup is conservative and only removes rows with no linked jobs, payments, notifications, or audit logs
- login still succeeds even if cleanup fails

Why this mattered:

- guest logins previously created unbounded `User` rows

### 5. File hash verification

Status: already present, documentation and typing tightened

What I found:

- backend already persisted `fileHash` on `PrintJob`
- backend already sent `fileHash` in the agent assignment payload
- print agent already verified SHA-256 after download and failed the job on mismatch

What changed:

- moved the agent assignment payload shape into the shared WebSocket contract
- aligned backend and print-agent on one typed payload definition

Why this mattered:

- this confirms the security path exists in code
- shared typing reduces drift between sender and receiver

## Audit Items That Were Stale or Partially Outdated

### "Both frontends fail due to `<Html>` import conflict"

What I found:

- there was no `next/document` or `<Html>` misuse in the repo
- the real admin failure was missing React Query provider setup
- the web app was not reproducing the reported `<Html>` error

### "There are zero tests"

What I found:

- `packages/shared/src/pricing.test.ts` already existed
- the repo already had Vitest configured at the root

## Verification Performed

All of these passed on May 9, 2026:

```powershell
npm.cmd test
npm.cmd --workspace apps/backend run typecheck
npm.cmd --workspace packages/shared run typecheck
npm.cmd --workspace apps/print-agent run typecheck
npm.cmd --workspace apps/backend run build
npm.cmd --workspace apps/admin run build
cd apps\web
npx.cmd next build --debug
```

## Remaining Live-System Testing Still Recommended

Even after the fixes, these still need runtime validation in a real environment:

- Razorpay end-to-end payment flow
- full student upload-to-print flow against live services
- Windows print-agent behavior with actual printers
- live Postgres migration flow on a new environment
- agent reconnect and long-running queue recovery scenarios
