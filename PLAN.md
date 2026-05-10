# QuickPrint Standalone Evolution Plan

This document tracks the transition from a developer-centric Docker setup to a "Zero-Dependency" standalone desktop application for non-technical users (Maddy's Shop).

## 📋 Progress Tracking
To update this plan: 
1. Check off completed items with `[x]`.
2. Add new sub-tasks as technical hurdles arise.
3. Keep the "Current Status" section updated at the end of every session.

---

## 🛠 Phase 1: Docker Discovery & Electron Integration (CURRENT)
- [x] Delete legacy renderer files from agent (moved to Admin UI).
- [x] Configure Electron to load `http://localhost:3001` directly.
- [x] Implement `loadAdminWithRetry` to handle cold-boot delays.
- [x] Implement automated `docker-compose up -d` on app startup.
- [x] Add Docker detection logic (check if Docker Desktop is installed/running).
- [x] Add user-friendly Error UI inside Electron for missing Docker.

## 💾 Phase 2: SQLite Migration (Backend) - COMPLETE
*Goal: Eliminate the need for a PostgreSQL server for local hosting.*
- [x] Create SQLite-compatible schema (`schema.sqlite.prisma`).
- [x] Create Database Switcher script (`scripts/switch-db.js`).
- [x] Implement conditional database connection in `PrismaService`.
- [x] Handle Prisma migration automation on app startup (`prisma db push`).
- [x] Verify all backend enums and JSON fields work with SQLite (Converted to String/Json shims).

## 🚀 Phase 3: "Bare Metal" Launcher - IN PROGRESS
*Goal: Remove Docker entirely from the user experience.*
- [x] Create `Launcher` service for subprocess management.
- [x] Integrate Launcher into Electron lifecycle.
- [x] Implement Docker-to-BareMetal fallback orchestration.
- [ ] Implement production-ready environment tunneling (Cloudflare binary).
- [ ] Verify persistence with SQLite in "Local" mode.

## 📦 Phase 4: Production Build & Installer - IN PROGRESS
*Goal: One-click .exe for the shop owner.*
- [x] Configure `electron-builder` for multi-workspaces bundling.
- [x] Implement NSIS installer with favicon branding.
- [x] Implement "First Run" SQLite initialization (auto-migrate if DB missing).
- [ ] Bundle Node.js runtime / Handle native `better-sqlite3` bindings.
- [ ] Build the final `.exe` and verify in a VM.

---

## 📍 Current Status
**Date:** 2026-05-10
**Last Change:** Automated Docker orchestration and enhanced error handling in the agent window.
**Next Task:** Start Phase 2 — SQLite Migration for the backend.

---

## 💡 Continuation Instructions for AI
If resuming this project in a new session:
1. **Read `PLAN.md`** first to see the current phase.
2. **Review `apps/print-agent/src/main/index.ts`** to understand the current startup orchestration.
3. **Review `apps/backend/prisma/schema.prisma`** before starting SQLite conversion.
4. **Always Update this file** when a task is finished!
