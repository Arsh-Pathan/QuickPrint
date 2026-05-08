# QuickPrint

Autonomous print management system for college campus print shops — built for shop owners who deal with long queues, manual file handling, and the daily chaos of "bhaiya mera print hua kya?"

QuickPrint replaces the manual workflow with three coordinated components:

1. **Student web app** — scan a QR, upload, pay, track queue live.
2. **Admin dashboard** — Maddy manages queue, printers, earnings, alerts.
3. **Local print agent** — a Windows desktop service on the shop PC that talks to printers, prints jobs autonomously, monitors printer health, and recovers from failures.

> Status: **early scaffold**. Architecture, schema, and module skeletons are in place; feature implementation is in progress. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design.

---

## Monorepo layout

```
quickprint/
├── apps/
│   ├── backend/          NestJS API + WebSocket gateway + Prisma
│   ├── web/              Next.js 15 student app
│   ├── admin/            Next.js 15 admin dashboard
│   └── print-agent/      Electron + Node desktop service for the shop PC
├── packages/
│   └── shared/           Shared TS types, API contracts, WS event schemas
├── docker-compose.yml    Postgres for local dev
├── .env.example          Template for all required env vars
└── ARCHITECTURE.md       System design, data flow, deployment notes
```

## Tech stack

| Layer       | Choice |
|-------------|--------|
| Frontend    | Next.js 15, TypeScript, Tailwind, shadcn/ui, React Query, Zustand |
| Backend     | NestJS, Prisma, PostgreSQL, Socket.IO |
| Auth        | JWT + phone OTP, RBAC for admin |
| Storage     | S3 / Supabase Storage with signed URLs |
| Payments    | Razorpay (UPI / QR / webhooks) |
| Realtime    | Socket.IO rooms (per-job, per-printer, admin) |
| Print agent | Electron, `pdf-to-printer`, `node-printer`, Windows spooler APIs |

## Quick start

```bash
# 1. Install
npm install

# 2. Copy env template
cp .env.example .env

# 3. Start Postgres
docker compose up -d

# 4. Generate Prisma client + migrate
npm run db:generate
npm run db:migrate

# 5. Run pieces in separate terminals
npm run dev:backend   # http://localhost:4000
npm run dev:web       # http://localhost:3000
npm run dev:admin     # http://localhost:3001
npm run dev:agent     # Electron window
```

## Implementation roadmap

- [x] Monorepo + Prisma schema + module skeletons
- [ ] Auth (phone OTP) + JWT
- [ ] File upload + page/color detection + pricing engine
- [ ] Razorpay payment + webhook verification
- [ ] WebSocket gateway: queue + printer events
- [ ] Admin dashboard: live queue, printer panel, analytics
- [ ] Print agent: printer discovery, autonomous queue processor, health monitor, retry/recovery
- [ ] Docker production build, CI, Windows installer for the agent

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full picture.

## License

Proprietary — © Maddy / QuickPrint. Not for redistribution.
