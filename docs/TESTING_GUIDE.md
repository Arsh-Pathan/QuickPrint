# Testing Guide

## What Was Already Verified

These checks passed on May 9, 2026:

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

That means:

- automated tests pass
- backend types compile
- shared package types compile
- print-agent types compile
- backend production build works
- admin production build works
- web production build works

## Automated Checks

### Run All Current Tests

```powershell
npm.cmd test
```

Current test coverage includes:

- shared pricing logic
- backend PDF page analysis
- backend anonymous guest cleanup behavior

### Run Global Typecheck

```powershell
npm.cmd run typecheck
```

### Run All Builds

```powershell
npm.cmd run build
```

If you want to reproduce the exact web build check:

```powershell
cd apps\web
npx.cmd next build --debug
```

## Manual End-to-End Testing

## 1. Student Login Flow

Goal: verify auth entry points.

Steps:

1. open `http://localhost:3000/login`
2. try OTP login if a real or mock OTP path is configured
3. try `Continue as Guest`
4. confirm local auth state is stored and you are redirected

Expected:

- login succeeds
- token is stored
- upload page becomes accessible

## 2. File Upload Flow

Goal: verify backend signed upload and job creation.

Steps:

1. sign in on `http://localhost:3000`
2. go to `/upload`
3. upload a backend-supported file type: PDF, PNG, JPEG, or DOCX
4. choose copies, color, duplex
5. continue to payment creation

Expected:

- backend returns signed upload URL
- upload succeeds
- backend creates a `PrintJob`
- price is returned

## 3. Payment Flow

Goal: verify order creation and payment confirmation.

Steps:

1. use Razorpay test keys
2. create a payment order from the upload flow
3. finish a test payment
4. watch the job status screen

Expected:

- `/api/payments/orders` succeeds
- `/api/payments/confirm` succeeds
- job moves to `QUEUED`

## 4. Student Status Tracking

Goal: verify realtime updates.

Steps:

1. after payment, open `/jobs/[id]`
2. keep the page open while the backend and agent process the job

Expected:

- page subscribes to `job:<id>`
- status updates appear as backend emits `job:status`

## 5. Admin Dashboard

Goal: verify shop visibility.

Steps:

1. open `http://localhost:3001/login`
2. log in as admin
3. visit overview, printers, queue, analytics, settings

Expected:

- dashboard renders without QueryClient errors
- queue page loads
- printer list loads
- stats render

## 6. Queue API

Goal: verify queue logic.

Steps:

1. create one or more paid jobs
2. open admin queue view
3. optionally call queue endpoints directly

Useful endpoint:

- `GET /api/queue?shopId=shop_local_dev`

Expected:

- queue entries appear
- ETA values are calculated
- deleting a queue item cancels the job

## 7. Agent Assignment and Integrity Verification

Goal: verify secure handoff from backend to agent.

Steps:

1. run backend
2. run the Electron print agent on Windows
3. ensure agent connects with correct `AGENT_TOKEN` and `AGENT_SHOP_ID`
4. complete a paid job

Expected:

- backend emits `agent:job-assigned`
- payload includes `fileHash`
- agent downloads file
- agent verifies SHA-256 hash before printing
- job completes or retries on failure

## 8. Real Printer Test

Goal: verify hardware printing.

Steps:

1. run the print agent on a Windows machine with a working printer
2. create a paid job from the web app
3. watch the printer and agent logs

Expected:

- selected printer is found
- file prints
- backend receives `agent:job-result`
- job reaches `COMPLETED`

## 9. PDF Color Analysis Test

Goal: verify `colorPages` metadata behavior.

Steps:

1. upload a PDF with grayscale-only pages
2. upload a PDF with known colored elements on some pages
3. inspect stored `PrintJob.colorPages` in the database

Expected:

- grayscale PDF returns `colorPages = 0`
- mixed-color PDF returns `colorPages > 0`

Important note:

- pricing is still based on the user-selected session mode, not mixed per-page billing

## 10. Anonymous Guest Cleanup Test

Goal: verify stale guest pruning.

Steps:

1. insert anonymous `User` rows older than 24 hours with no linked data
2. trigger `POST /api/auth/anonymous`
3. inspect the database

Expected:

- stale guest rows without linked jobs, payments, notifications, or audit logs are deleted
- a fresh guest user is created

## Useful API Endpoints for Manual Testing

- `POST /api/auth/otp/request`
- `POST /api/auth/otp/verify`
- `POST /api/auth/anonymous`
- `POST /api/auth/admin/login`
- `POST /api/files/sign-upload`
- `PUT /api/files/local-upload`
- `GET /api/files/local-download`
- `POST /api/print-jobs`
- `GET /api/print-jobs`
- `GET /api/print-jobs/:id`
- `GET /api/print-jobs/admin/list`
- `GET /api/print-jobs/admin/stats`
- `POST /api/payments/orders`
- `POST /api/payments/confirm`
- `POST /api/payments/webhook`
- `GET /api/printers`
- `GET /api/queue`
- `DELETE /api/queue/:jobId`

## Recommended Regression Checklist

Run this before merging bigger changes:

1. `npm.cmd test`
2. `npm.cmd run typecheck`
3. `npm.cmd --workspace apps/backend run build`
4. `npm.cmd --workspace apps/admin run build`
5. `cd apps\web && npx.cmd next build --debug`
6. manual student upload flow
7. manual admin queue flow
8. manual agent assignment flow

## What Is Not Fully Proved by Build/Test Checks Alone

- live Razorpay processing
- live Postgres migrations on a fresh environment
- real printer behavior on Windows hardware
- long-running agent reconnect behavior
- production deployment environment wiring
