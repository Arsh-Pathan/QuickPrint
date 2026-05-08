# Roadmap

## Done (this scaffold)

- Monorepo (npm workspaces) with `apps/` + `packages/`
- Architecture doc, full Prisma schema, env template, docker-compose
- Shared contracts package (enums, zod DTOs, pricing engine, WS event types)
- Backend (NestJS): auth (phone OTP + JWT + RBAC), files, pricing, print-jobs, payments (Razorpay), printers, queue, realtime gateway, Swagger, throttler, helmet, Dockerfile
- Student web app (Next.js 15): landing, upload, live job tracker subscribed via Socket.IO
- Admin dashboard (Next.js 15): sidebar layout, overview, queue, printers, analytics, settings
- Print agent (Electron): printer discovery, health monitor, durable SQLite queue, queue processor with retry, authenticated Socket.IO client, tray UI, electron-builder Windows installer config
- GitHub Actions CI

## Next up (priority order)

### Vertical slice — make it actually print
1. Wire OTP → JWT in the web app (login screen + token storage).
2. Implement a local-disk storage driver in `StorageService` so file uploads work without S3 keys.
3. Implement real PDF page count + color detection in `PageAnalyzerService` (pdf-lib + ghostscript).
4. Hook up Razorpay test-mode checkout in `/jobs/[id]` — open `Razorpay()` widget, call `/payments/confirm` on success.
5. Backend → agent push: emit `agent:job-assigned` from `markPaidAndEnqueue`.
6. Agent → backend status: relay `agent:job-result` to update `PrintJob.status` + emit `job:status` over WS.

After 1–6 the end-to-end flow works on a single shop PC.

### Hardening
- ClamAV/file-type sniff before signing upload URL.
- Razorpay webhook idempotency keyed on `razorpay_payment_id`.
- Audit log entries for every job state transition.
- Admin queue: drag-to-reorder (dnd-kit) + cancel/reprint actions.
- Printer pause/resume button surfaced in admin when `paper_out` / `jam`.

### Scale
- Move Socket.IO to Redis adapter for horizontal scale.
- Add BullMQ for cross-process job orchestration if multiple agents per shop.
- Multi-printer load balancing: pick least-busy printer matching capability requirements.
- Prometheus metrics + Grafana dashboards.

### Nice-to-haves
- WhatsApp notifications via Meta Business API.
- Google Drive picker on the upload page.
- Email-to-print inbox.
- OCR preview of uploaded files.
- Smart ETA via rolling average of recent print times.
