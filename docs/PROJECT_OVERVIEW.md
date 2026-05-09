# Project Overview

## What QuickPrint Does

QuickPrint is an autonomous printing system for a campus print shop. A student uploads a file, chooses print settings, pays online, and tracks status live. An admin sees queue and printer state. A local Windows print agent receives paid jobs and sends them to real printers.

## Monorepo Structure

```text
.
|-- apps/
|   |-- backend/
|   |-- web/
|   |-- admin/
|   `-- print-agent/
|-- packages/
|   `-- shared/
|-- docs/
|-- docker-compose.yml
`-- package.json
```

## Main Applications

### `apps/backend`

NestJS backend with these responsibilities:

- authentication for students, admins, and agents
- signed upload and download URLs
- document analysis and file hashing
- pricing
- print job lifecycle management
- Razorpay order creation and payment confirmation
- queue management
- printer registry and health snapshots
- Socket.IO realtime events

Main API groups:

- `/api/auth`
- `/api/files`
- `/api/print-jobs`
- `/api/payments`
- `/api/printers`
- `/api/queue`
- `/api/users`

### `apps/web`

Student web app in Next.js. Main flow:

1. sign in with OTP or continue as guest
2. upload file
3. choose settings
4. create payment order
5. pay
6. watch live job status

Routes currently present:

- `/`
- `/login`
- `/upload`
- `/jobs/[id]`
- `/terms`
- `/privacy`
- `/contact`

### `apps/admin`

Admin dashboard in Next.js for shop operations. It consumes backend queue, printer, and print-job APIs and subscribes to realtime updates.

Routes currently present:

- `/`
- `/login`
- `/analytics`
- `/printers`
- `/queue`
- `/settings`

Current implementation note:

- overview, queue, and printers are live
- analytics and settings are currently placeholder pages

### `apps/print-agent`

Electron desktop agent for the print shop PC. It:

- connects to the backend over Socket.IO
- receives assigned jobs
- stores jobs in a durable local SQLite queue
- downloads files through signed URLs
- verifies file SHA-256 hashes
- prints through Windows printer APIs
- retries failures with backoff

### `packages/shared`

Shared TypeScript package for:

- enums
- print job DTOs and schemas
- pricing logic
- WebSocket event contracts

## Current Upload Support

Backend allowlist:

- PDF
- PNG
- JPEG
- DOCX

## Core Job Flow

```text
student login
  -> upload file
  -> backend signs upload
  -> file stored
  -> backend analyzes file
  -> print job created
  -> payment order created
  -> payment confirmed
  -> job marked queued
  -> backend assigns job to agent
  -> agent downloads and verifies file
  -> agent prints
  -> backend updates final status
```

## Data Model Summary

Important tables in `apps/backend/prisma/schema.prisma`:

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

- ownership: `ownerId`, `shopId`, `printerId`
- file metadata: `fileKey`, `fileName`, `fileSize`, `mimeType`, `fileHash`
- document analysis: `pages`, `colorPages`
- settings: `color`, `duplex`, `copies`, `paperSize`, `pageRange`
- billing: `priceTotalPaise`, `priceBreakdown`
- lifecycle: `status`, `paidAt`, `printedAt`, `failureReason`

## Realtime Contract

Defined in `packages/shared/src/ws-events.ts`.

Key server-to-client events:

- `job:status`
- `job:progress`
- `printer:status`
- `queue:paused`
- `queue:resumed`
- `queue:position`
- `agent:job-assigned`

Key client-to-server events:

- `agent:heartbeat`
- `agent:job-claimed`
- `agent:job-result`
- `agent:printer-event`
- `subscribe:job`
- `subscribe:shop`

## Important Scripts

Root scripts:

- `npm.cmd run dev:backend`
- `npm.cmd run dev:web`
- `npm.cmd run dev:admin`
- `npm.cmd run dev:agent`
- `npm.cmd run build`
- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run docker:up`
- `npm.cmd run docker:down`
- `npm.cmd run db:generate`
- `npm.cmd run db:migrate`

Workspace-specific scripts:

- backend: `build`, `start:dev`, `prisma:generate`, `prisma:migrate`, `typecheck`
- web: `dev`, `build`, `typecheck`
- admin: `dev`, `build`, `typecheck`
- print-agent: `build`, `dev`, `typecheck`, `package:win`

## Runtime Ports

- backend: `4000`
- web: `3000`
- admin: `3001`
- postgres: `5432`

## External Services and Dependencies

- PostgreSQL
- Razorpay
- local filesystem or S3-compatible object storage
- Windows printer environment for the Electron agent
- optional SMS provider for OTP

## Current Code-Level Notes

- pricing is session-based: the user chooses B&W or color for the whole job
- PDF analysis now computes `colorPages` as metadata for analytics and downstream use
- agent download integrity verification is implemented through `fileHash`
- guest login now includes cleanup of stale anonymous users older than 24 hours
