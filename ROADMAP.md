# QuickPrint Roadmap

Suggested next features after the current frontend redesign + wiring pass.
Effort labels: **S** ≈ half-day, **M** ≈ 1–2 days, **L** ≈ 3–5 days.
Priority is shop-impact ordered — reliability and shop-owner ergonomics first, then growth.

---

## Web (student app)

### High value
- **Multi-page PDF tile preview** — render every PDF page as a tiled grid via `pdfjs-dist`, with a "this is sheet N of M after duplex/copies" overlay. The new image preview is true-to-print; PDFs still go through an iframe. **M**
- **Smart B&W detection** — scan the uploaded image/PDF; if there's no meaningful color content, nudge the user toward B&W ("This document is mostly grayscale — save ₹X by switching"). Pure UX, no backend change. **S**
- **Pickup ETA on home page** — anonymous endpoint returns current queue length + average wait. Surface "≈ 6 min wait" on the upload CTA so students decide before uploading. **S** (backend) + **S** (web)
- **Job sharing / handoff** — generate a tokenized share link so a friend can pick up the print on the owner's behalf. **M**
- **Reprint** — "Reprint this" button on completed jobs (skip upload, re-use stored fileKey, re-charge). Works because backend keeps the file. **S**
- **Saved presets** — students who print the same kind of doc (assignment vs. handout) save a settings preset. Today the app remembers the *last* settings; presets let them switch quickly. **S**

### Polish
- **Optimistic price ticker** — recompute totalPaise locally as settings change without round-tripping to backend; only sync on Pay. (Mostly done — `syncReadyJobs` is the round-trip.) Make sure shimmer pricing matches the eventual server price. **S**
- **Pre-pay file scan** — show file warnings before payment: scanned at low DPI, password-protected PDF, mixed paper sizes inside one PDF. Most are inferable client-side. **M**
- **Offline-resilient cart** — IndexedDB persistence for the in-progress cart so a flaky campus WiFi doesn't lose 4 uploaded files. **M**

## Admin (shop dashboard)

### High value
- **Manual job intervention** — pause / resume / re-queue / mark-as-printed / refund directly from the queue row. Currently the queue only supports DELETE. **M**
- **Live printer console** — per-printer panel with paper-out / toner-low banner, "send test page" button, last-error log. The agent already emits `printer:status`; expose more depth. **M**
- **Daily reconciliation report** — end-of-day summary: ₹ collected vs ₹ refunded vs failed-job count, exportable CSV. Audit-log has the data; aggregate it server-side. **M**
- **Refund dashboard** — list of auto-refunded jobs with reason and Razorpay refund ID. Maddy needs to know what to apologize for. **M**
- **Push-to-WhatsApp tool** — type a number, push a status update or a "pickup ready" reminder. Uses the MSG91 driver that already exists. **S**
- **Pricing scheduler** — surge pricing or off-hours discount via Settings (e.g. 20% off between 11 PM–7 AM). Backend has `bwPaise`/`colorPaise`; add a time-window override table. **L**

### Polish
- **Search + filter** in queue/jobs list (by reference ID, student phone, status, date range). **S**
- **Sound/desktop notifications** when a new job lands or an error occurs. **S**
- **Audit log viewer** — the data is already aggregated for analytics; expose a raw log timeline with filters. **S**

## Print agent (Electron, the autonomous service)

### High value
- **Self-test job on boot** — on agent startup, print a tiny "QuickPrint online — DD/MM HH:MM" header page on the default printer. Confirms the whole stack end-to-end without waiting for a customer. **S**
- **Paper level estimator** — count pages printed since last "tray refilled" admin action; alert when threshold passes a configurable value. Printers rarely report paper level accurately. **M**
- **Crash-safe printer reservation** — when assigning a job, reserve the printer in SQLite *before* sending to OS spooler, release on completion or timeout. Prevents two agents (during upgrade overlap) racing. **M**
- **Auto-retry on jammed-printer recovery** — current retry handles transient errors; add detection for "printer was offline, came back, replay the last failed job". **M**

### Polish
- **Tray monitor UI** — small Electron window showing current job + last 10 events. Useful when Maddy is troubleshooting. **M**
- **Agent log streaming to backend** — opt-in upload of last N log lines on error, so remote debug is possible without screen-share. **M**

## Backend / cross-cutting

- **Anonymous queue snapshot endpoint** (`/queue/public`) — for the home-page ETA above. **S**
- **Idempotency keys on `/payments/confirm`** — already retried client-side; ensure the server is fully idempotent on `paymentId`. **S** (audit)
- **Webhook reconciliation worker** — periodic job that re-checks any `created` order older than 2 min against Razorpay's API. Belt-and-suspenders with the existing webhook. **M**
- **File lifecycle policy** — auto-purge file blobs N days after `completed`, keep job metadata for analytics. GDPR-friendly + storage savings. **M**

---

## Effort summary (highest leverage first)

1. **Manual job intervention** (admin) — Maddy's biggest pain.
2. **Agent self-test on boot** — catches printer issues before students do.
3. **Pickup ETA on home page** — biggest student-UX lift.
4. **Multi-page PDF tile preview** — completes the preview story now that images are accurate.
5. **Refund dashboard** — closes the loop on auto-refunds.

Everything else is incremental polish.
