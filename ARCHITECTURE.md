# QuickPrint — Architecture

This document describes the system design, the responsibilities of each component, and the contracts between them. It is the source of truth — code in this repo should match what is described here, and changes should land in this doc first.

## 1. System overview

```
┌────────────────────┐         ┌────────────────────┐
│  Student Web App   │         │  Admin Dashboard   │
│  (Next.js, mobile) │         │     (Next.js)      │
└─────────┬──────────┘         └─────────┬──────────┘
          │ HTTPS + WSS                   │ HTTPS + WSS
          └──────────────┬────────────────┘
                         │
                ┌────────┴─────────┐
                │   Backend API    │  NestJS
                │  REST + Socket   │  Prisma → PostgreSQL
                │      .IO         │  Razorpay webhooks
                └────────┬─────────┘
                         │ WSS (auth via agent token)
                         │
                ┌────────┴─────────┐
                │  Local Print     │  Electron + Node
                │  Agent (shop PC) │  printer APIs, spooler
                └──────────────────┘
                         │ USB / network
                       Printers
```

The backend is the only source of truth. The two web apps and the print agent are clients of the same API + Socket.IO gateway.

## 2. Components

### 2.1 Backend (`apps/backend`)
NestJS modular monolith. Modules:

- `auth` — phone OTP login, JWT issuance, RBAC guards (`student`, `admin`, `agent`).
- `users` — user profile.
- `files` — signed URL minting for upload, page/color detection, virus scan hook.
- `pricing` — page count + color pages → price. Configurable rates.
- `print-jobs` — job lifecycle: `created → paid → queued → printing → completed | failed`.
- `payments` — Razorpay order creation, webhook verification, idempotent status sync.
- `printers` — printer registry, capabilities, health snapshots.
- `queue` — FIFO + priority queue, ETA calculation.
- `realtime` — Socket.IO gateway, rooms per job and per shop.
- `notifications` — WhatsApp / email / push (stubbed initially).
- `audit` — append-only log of state-changing events.

### 2.2 Student web (`apps/web`)
Mobile-first 3-click flow: upload → confirm settings + price → pay (Razorpay UPI/QR) → live status screen subscribed to `job:<id>`.

### 2.3 Admin dashboard (`apps/admin`)
Live queue (drag to reorder, pause/resume/cancel), per-printer status panel, analytics (daily earnings, peak hours, top settings), printer alert inbox.

### 2.4 Print agent (`apps/print-agent`)
Electron app that runs on Maddy's shop PC. The "autonomous print server."

Responsibilities:

- **Discovery** — enumerate printers via Windows spooler, detect color/duplex capability.
- **Queue subscription** — open authenticated Socket.IO connection, subscribe to `shop:<id>:queue`. Falls back to HTTP polling when offline.
- **Job execution** — download file via signed URL, validate hash, hand off to `pdf-to-printer` / `node-printer`. Track spooler job ID.
- **Health monitor** — periodic poll of printer status (online, paper, toner, jam, spooler service). Push deltas to backend.
- **Failure recovery** — exponential backoff retry; pause shop queue on `paper-out`/`offline`/`jam`; auto-resume when condition clears; persistent local SQLite queue so a reboot does not lose jobs.
- **Local cache** — files cached encrypted on disk; deleted after successful print + ack.

## 3. Data model (Prisma)

See `apps/backend/prisma/schema.prisma`. Core entities:

- `User` — phone, role, name.
- `PrintJob` — owner, file ref, settings (color, duplex, copies, paper size), pages, colorPages, priceCents, status, createdAt, printedAt.
- `Printer` — shopId, name, driver, capabilities, lastSeenAt, status enum.
- `PrinterHealthSnapshot` — periodic readings (paper, toner, online).
- `Payment` — razorpayOrderId, razorpayPaymentId, status, signature.
- `QueueEntry` — jobId, position, priority, eta.
- `PrintSettings` — embedded in PrintJob; kept as separate type for reuse.
- `Notification` — channel, target, payload, deliveredAt.
- `AuditLog` — actorId, action, entityType, entityId, before/after JSON.
- `SystemEvent` — printer-failure, queue-paused, etc.

## 4. WebSocket event contract

Defined in `packages/shared/src/ws-events.ts`. Summary:

| Event                       | Direction          | Payload                              |
|-----------------------------|--------------------|--------------------------------------|
| `job:status`                | server → client    | `{ jobId, status, eta? }`            |
| `job:progress`              | server → client    | `{ jobId, pagesPrinted, pagesTotal}` |
| `printer:status`            | server → client    | `{ printerId, online, paper, toner}` |
| `queue:paused`              | server → client    | `{ shopId, reason }`                 |
| `queue:resumed`             | server → client    | `{ shopId }`                         |
| `agent:heartbeat`           | agent → server     | `{ agentId, printers[], stats }`     |
| `agent:job-result`          | agent → server     | `{ jobId, status, error? }`          |

## 5. Job state machine

```
created ──pay──▶ paid ──enqueue──▶ queued ──agent picks──▶ printing
                                                 │
                                  ┌──────────────┴──────────────┐
                                  ▼                             ▼
                              completed                       failed
                                                                │
                                                          retry? │ → queued
```

## 6. Security

- All file URLs signed and short-lived.
- JWT in `Authorization: Bearer`. Agent uses a long-lived agent token + per-shop scope.
- Razorpay webhooks verified by HMAC; processed idempotently keyed on `razorpay_payment_id`.
- File type allowlist (PDF/PNG/JPG/DOCX); MIME sniff + extension check; size cap; optional ClamAV scan hook.
- Rate limiting on auth and upload endpoints.
- Agent ↔ backend traffic over WSS only.

## 7. Deployment

- Backend: Dockerfile → any container host (Fly, Render, ECS).
- Web + admin: Vercel or container.
- Postgres: managed (Neon / RDS / Supabase).
- Print agent: `electron-builder` produces a signed Windows installer that registers itself as a startup app and (optionally) a Windows service.

## 8. Observability

- Structured JSON logs (pino) on backend and agent.
- `SystemEvent` table doubles as an in-app event timeline.
- Health endpoints: `/healthz`, `/readyz`. Agent reports its own status to backend every 15 s.
