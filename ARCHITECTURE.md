# QuickPrint Architecture

This document describes the current architecture implemented in the repository. It is grounded in the code that exists now.

## 1. System Overview

```text
Student Web (Next.js) ----\
                           \
Admin Web (Next.js) --------> Backend API + Realtime Gateway (NestJS + Prisma)
                           /
Print Agent (Electron) ----/

Backend persistence:
- PostgreSQL for core data
- local disk or S3-compatible storage for uploaded files

Print execution:
- Electron print agent
- Windows printer environment
```

The backend is the source of truth. The web apps and the print agent are clients of the same REST and Socket.IO surface.

## 2. Monorepo Layout

```text
apps/
  backend/
  web/
  admin/
  print-agent/
packages/
  shared/
docs/
```

## 3. Current Applications

### `apps/backend`

NestJS application with these active modules:

- `auth`
- `users`
- `files`
- `pricing`
- `print-jobs`
- `payments`
- `printers`
- `queue`
- `realtime`
- `agent`

Additional backend pieces:

- `prisma`: database access and schema
- `health.controller.ts`: `/api/healthz` and `/api/readyz`

Important behavior:

- JWT auth for student and admin flows
- signed upload and download URLs
- file SHA-256 hashing
- PDF page counting and best-effort color-page detection
- payment confirmation and queueing
- realtime job and printer status events

### `apps/web`

Student-facing Next.js 15 app using the App Router.

Implemented routes:

- `/`
- `/login`
- `/upload`
- `/jobs/[id]`
- `/terms`
- `/privacy`
- `/contact`
- `not-found`

Current student flow:

1. login by OTP or guest access
2. upload file
3. create print job with settings
4. create Razorpay order
5. confirm payment
6. watch job status live

### `apps/admin`

Admin-facing Next.js 15 app using the App Router.

Implemented routes:

- `/`
- `/login`
- `/printers`
- `/queue`
- `/analytics`
- `/settings`
- `not-found`

Current state:

- overview page is live and fetches recent jobs and shop stats
- printers page is live
- queue page is live and supports job cancellation
- analytics and settings are currently placeholder pages

### `apps/print-agent`

Electron desktop app for the shop PC.

Implemented responsibilities:

- printer discovery through `pdf-to-printer`
- health polling for discovered printers
- authenticated Socket.IO connection to backend
- durable local SQLite queue
- download via signed URL
- SHA-256 file integrity verification
- print dispatch through `pdf-to-printer`
- retry with exponential backoff

## 4. Shared Package

`packages/shared` contains shared code used across workspaces:

- enums
- Zod schemas and DTO types for print jobs
- pricing logic
- WebSocket event contracts

## 5. Data Flow

### Student Upload and Print Flow

```text
student login
-> request signed upload URL
-> upload file
-> create print job
-> backend analyzes file
-> backend stores page count, colorPages, fileHash
-> create payment order
-> payment confirmation
-> backend marks job queued
-> backend assigns job to agent
-> agent downloads file
-> agent verifies fileHash
-> agent prints
-> backend updates final status
```

### Admin Monitoring Flow

```text
admin login
-> fetch stats, printers, queue, recent jobs
-> subscribe to shop room over WebSocket
-> receive printer and queue-related updates
```

## 6. Backend API Surface

Current controller groups:

- `/api/auth`
- `/api/users`
- `/api/files`
- `/api/print-jobs`
- `/api/payments`
- `/api/printers`
- `/api/queue`
- `/api/healthz`
- `/api/readyz`
- `/api/docs`

Important endpoints:

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

## 7. Current Upload Support

The backend currently allows these MIME types:

- `application/pdf`
- `image/png`
- `image/jpeg`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

Current upload size cap:

- `50 MB`

## 8. Realtime Contract

Defined in `packages/shared/src/ws-events.ts`.

Current server-to-client events:

- `job:status`
- `job:progress`
- `printer:status`
- `queue:paused`
- `queue:resumed`
- `queue:position`
- `agent:job-assigned`

Current client-to-server events:

- `agent:heartbeat`
- `agent:job-claimed`
- `agent:job-result`
- `agent:printer-event`
- `subscribe:job`
- `subscribe:shop`

## 9. Print Job State

Current job statuses in the schema:

- `CREATED`
- `PAID`
- `QUEUED`
- `PRINTING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

Common transition path:

```text
CREATED -> QUEUED -> PRINTING -> COMPLETED
                     PRINTING -> FAILED
QUEUED -> CANCELLED
```

Payment confirmation is what drives a newly created job into the queued state.

## 10. Persistence Model

Defined in `apps/backend/prisma/schema.prisma`.

Core tables:

- `User`
- `Shop`
- `Printer`
- `PrinterHealthSnapshot`
- `PrintJob`
- `Payment`
- `QueueEntry`
- `Notification`
- `AuditLog`
- `SystemEvent`

Important `PrintJob` fields:

- file metadata: `fileKey`, `fileName`, `fileSize`, `mimeType`, `fileHash`
- analysis metadata: `pages`, `colorPages`
- user-selected settings: `color`, `duplex`, `copies`, `paperSize`, `pageRange`
- money and lifecycle: `priceTotalPaise`, `priceBreakdown`, `status`, `paidAt`, `printedAt`

## 11. Security and Integrity

Currently implemented:

- JWT-protected student and admin endpoints
- role checks for admin and agent routes
- signed upload and download URLs
- SHA-256 file hashing on backend
- SHA-256 verification in the print agent after download
- webhook signature verification for Razorpay
- request validation with `class-validator`
- throttling with NestJS throttler

## 12. Deployment and Runtime

Local defaults:

- backend: `4000`
- web: `3000`
- admin: `3001`
- postgres: `5432`

`docker-compose.yml` currently provisions:

- `postgres`
- `backend`
- `web`
- `admin`
- `cloudflared`

## 13. Important Current Constraints

- pricing is session-based: the user selects B&W or color for the whole job
- `colorPages` is computed as metadata, not mixed per-page billing
- analytics and settings pages in admin are not feature-complete yet
- there is schema support for notifications and audit/system events, but no standalone notification module is active in the current backend app module
