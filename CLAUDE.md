# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

QuickPrint is an autonomous print-shop management system for a single college-campus stationery shop. Reliability beats feature breadth — real students, real daily traffic, one shop owner (Maddy) who currently handles queues, files, and printer errors by hand.

Single-shop deployment model: one backend instance serves one shop identified by `SHOP_ID`. The whole stack is bundled as a Windows desktop installer (Electron + NSIS) that boots the backend, admin UI, web UI, and tunnel as child processes on the shop PC.

## Repo layout (npm workspaces)

- `apps/backend` — NestJS 10 + Prisma + PostgreSQL (dev) / SQLite (packaged) + Socket.IO. Source of truth.
- `apps/web` — Next.js 15 student app (port 3000 dev, 3002 packaged). Mobile-first, 3-click upload→pay→print flow.
- `apps/admin` — Next.js 15 dashboard for Maddy (port 3001).
- `apps/desktop-app` — Electron shell. Hosts the **print agent service** (printer discovery, durable SQLite queue, health monitor, retry logic) AND the `Launcher` that spawns backend/admin/web/cloudflared as child processes in packaged builds. This is the most critical component — never weaken its crash-recovery or retry guarantees.
- `packages/shared` — type-safe contracts: zod DTOs, WS event types, pricing engine, enums. Consumed by every app.

Workspaces use **npm** (not pnpm — pnpm isn't installed). The `@quickprint/shared` package is imported as `@quickprint/shared` and aliased in `vitest.config.ts` to its `src/` (not `dist/`).

## Commands

Root scripts (run from repo root):

```bash
npm run dev:backend       # NestJS dev with --watch (port 4000)
npm run dev:web           # Next dev (port 3000)
npm run dev:admin         # Next dev (port 3001)
npm run dev:desktop       # builds desktop-app then launches Electron

npm run build             # build all workspaces (--if-present)
npm run lint              # lint all workspaces
npm run typecheck         # tsc --noEmit across workspaces
npm test                  # vitest run (root config, picks up *.test.ts everywhere)

npm run db:migrate        # prisma migrate dev (postgres schema)
npm run db:generate       # prisma generate

npm run docker:up         # docker compose up -d (postgres for dev)
npm run rebuild           # electron-rebuild better-sqlite3 (required before package)
npm run package           # full Windows installer: rebuild → build → prisma generate (sqlite) → electron-builder
```

Backend has its own Jest setup (`npm --workspace apps/backend test` runs Jest, not Vitest). The root `npm test` only runs Vitest specs (e.g. `packages/shared/src/pricing.test.ts`). To run a single Vitest spec: `npx vitest run path/to/file.test.ts`.

To issue an agent token (used by the desktop-app to authenticate to the backend): `npm --workspace apps/backend run issue-agent-token`.

## Two Prisma schemas

- `apps/backend/prisma/schema.prisma` — Postgres, used in dev (`DATABASE_URL` in `.env`).
- `apps/backend/prisma/schema.sqlite.prisma` — SQLite, used inside packaged installers (DB lives at `app.getPath('userData')/quickprint.db`, seeded from `template.db`).

The packaging script regenerates Prisma against the SQLite schema. When changing models, update **both** schemas. There is no `migrations/` directory checked in — schemas are the source of truth and migrations are regenerated locally.

## Service boot in packaged builds

`apps/desktop-app/src/main/launcher.ts` spawns backend (port 4000), admin (3001), web (3002), and cloudflared as child processes, polling `/health` endpoints with `SERVICE_READY_TIMEOUT_MS = 90_000` before showing the Electron window. Native modules (`better-sqlite3`, `pdf-to-printer`, prisma engines) are unpacked from `app.asar` to `app.asar.unpacked` — `apps/desktop-app/src/main/index.ts` injects those paths into Node's module resolution at startup. Don't break that injection block when editing `index.ts`.

## Print agent invariants

The agent (`apps/desktop-app/src/main/`) is the autonomous service that survives backend/network outages:

- `local-queue.ts` — durable SQLite queue. Jobs persist across restarts.
- `printer-discovery.ts` — enumerates Windows printers via `pdf-to-printer`.
- `health-monitor.ts` — heartbeats to backend every `AGENT_HEARTBEAT_INTERVAL_MS` (default 15s).
- `queue-processor.ts` — uses `p-queue` for serialized print dispatch with retry.
- `backend-socket.ts` — Socket.IO client; reconnects automatically.

When modifying any of these: preserve crash-recovery semantics (jobs must replay from SQLite on restart), retry on transient errors, and never lose a paid job silently.

## Backend modules (`apps/backend/src/modules/`)

`admin`, `agent`, `audit-log`, `auth`, `files`, `payments`, `pricing`, `print-jobs`, `printers`, `queue`, `realtime`, `settings`, `users`. Settings module reads app-level secrets (JWT_SECRET, ADMIN_PASSWORD, Razorpay keys, AGENT_TOKEN_SECRET) lazily from the `Setting` table — only `SHOP_ID` and `DATABASE_URL` are required at boot in production (see `assertProdEnv` in `apps/backend/src/main.ts`). The admin UI manages those settings; don't reintroduce hard env-var requirements for them.

Global API prefix is `/api`. Swagger lives at `/api/docs`. CORS origins come from `CORS_ORIGINS` (comma-separated).

## External integrations

Razorpay (UPI-only checkout), S3 (or local filesystem driver), MSG91 (WhatsApp/SMS) are env-driven with stub drivers — `STORAGE_DRIVER=local|s3`, etc. Real keys come from the operator via the admin Settings page, not from env in production.

## TypeScript

`tsconfig.base.json` enables `strict`, `noUncheckedIndexedAccess`, and `noImplicitOverride`. Don't loosen these. Module resolution is `Bundler`, target `ES2022`.

## Git / tooling notes

- Repo is local-only; `gh` CLI isn't installed on this machine. Don't try to create or push to GitHub remotes without asking.
- Platform is Windows 11; the desktop-app installer targets Windows x64 (NSIS).
- Node ≥20, npm ≥10.
