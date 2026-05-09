# QuickPrint

QuickPrint is a monorepo for a campus print workflow with four main parts:

- `apps/backend`: NestJS API, WebSocket gateway, Prisma, payments, storage, queueing
- `apps/web`: student-facing Next.js app
- `apps/admin`: admin dashboard in Next.js
- `apps/print-agent`: Electron desktop agent that runs on the shop PC

## Docs

- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [Local Setup](docs/LOCAL_SETUP.md)
- [Testing Guide](docs/TESTING_GUIDE.md)
- [Audit Fixes - May 9, 2026](docs/AUDIT_FIXES_2026-05-09.md)
- [What's Left](docs/WHATS_LEFT.md)

## Quick Commands

From PowerShell on Windows, use `npm.cmd` if `npm` is blocked by execution policy.

```powershell
npm.cmd install
npm.cmd run docker:up
npm.cmd run db:generate
npm.cmd run dev:backend
npm.cmd run dev:web
npm.cmd run dev:admin
```

## Current Verified State

These checks were run successfully on May 9, 2026:

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
