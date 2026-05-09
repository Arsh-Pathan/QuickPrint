# QuickPrint Project Context

This file is a concise repo-context reference for tooling and contributors. It reflects the code currently present in the repository.

## Repository Shape

QuickPrint is an npm-workspaces monorepo with these main workspaces:

- `apps/backend`: NestJS API and Socket.IO gateway
- `apps/web`: student-facing Next.js app
- `apps/admin`: admin-facing Next.js app
- `apps/print-agent`: Electron desktop print agent
- `packages/shared`: shared TypeScript types, schemas, pricing logic, and WebSocket contracts

## Current Stack

- Language: TypeScript
- Package manager: npm workspaces
- Backend: NestJS, Prisma, PostgreSQL, Socket.IO, Razorpay
- Web apps: Next.js 15, React Query, Zustand, Tailwind CSS
- Print agent: Electron, `pdf-to-printer`, `better-sqlite3`, `socket.io-client`
- Testing: Vitest at repo root

## Important Current Behaviors

- backend uses JWT auth for student and admin routes
- student web supports OTP login and guest login
- backend signs upload and download URLs
- backend computes page count, `colorPages`, and `fileHash`
- print agent verifies `fileHash` after downloading assigned files
- guest login prunes stale anonymous users older than 24 hours when possible
- pricing is session-based by the selected job mode, not mixed per-page color billing

## Current Upload Allowlist

- `application/pdf`
- `image/png`
- `image/jpeg`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

## Current Scripts

Root:

- `npm.cmd run dev:backend`
- `npm.cmd run dev:web`
- `npm.cmd run dev:admin`
- `npm.cmd run dev:agent`
- `npm.cmd run build`
- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run db:generate`
- `npm.cmd run db:migrate`
- `npm.cmd run docker:up`
- `npm.cmd run docker:down`

Workspace highlights:

- backend: `build`, `start:dev`, `typecheck`, `prisma:generate`, `prisma:migrate`
- web: `dev`, `build`, `typecheck`
- admin: `dev`, `build`, `typecheck`
- print-agent: `build`, `dev`, `typecheck`, `package:win`

## Current Docs

- `README.md`
- `ARCHITECTURE.md`
- `docs/PROJECT_OVERVIEW.md`
- `docs/LOCAL_SETUP.md`
- `docs/TESTING_GUIDE.md`
- `docs/AUDIT_FIXES_2026-05-09.md`
- `docs/WHATS_LEFT.md`

## Current Verification Status

The repo has been verified recently with:

- root Vitest suite
- backend typecheck and build
- shared typecheck
- print-agent typecheck
- admin production build
- web production build

## Implementation Notes

- admin `analytics` and `settings` pages are placeholders
- printer discovery falls back to a mock printer when native enumeration is unavailable
- the print agent supports a dummy printer mode through `AGENT_DUMMY_PRINTER=true`
- Docker compose currently expects backend environment values from `apps/backend/.env`

## Guidance

- prefer `@quickprint/shared` for cross-workspace types and contracts
- keep docs grounded in the implemented code, not future intent
- on Windows PowerShell, prefer `npm.cmd` if `npm` script execution is blocked
