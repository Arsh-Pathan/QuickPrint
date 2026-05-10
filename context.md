# QuickPrint: The Master Project Context

This is the definitive "Ground Truth" for QuickPrint as of May 10, 2026. It contains everything a new developer or AI agent needs to know to operate on this codebase without breaking the established "Zero-Setup" standalone architecture.

---

## 🏗️ 1. Core Architecture: The "Standalone" Pivot
QuickPrint was originally a multi-tenant cloud app. We have pivoted it to a **local shop standalone suite**.
- **The Orchestrator:** `apps/desktop-app` is the brain. It manages the lifecycle of the Backend (NestJS), Admin (Next.js), and Web (Next.js) as local services.
- **The Database:** SQLite (`dev.db` in dev, `quickprint.db` in `%APPDATA%` for prod) is the source of truth.
- **One Shop, One ID:** We hardcoded the `SHOP_ID` to `shop_local_dev`. Even though multitenancy exists in the code, it is "shadowed" to prioritize this single local instance.

---

## ⚡ 2. Current "Zero-Setup" Features

### A. Static Student Access (Tunnels)
- **Problem:** Students need a link that never changes, even if the shop PC restarts.
- **Binary Bundling:** `cloudflared.exe` is now bundled directly in `apps/desktop-app/bin/`.
- **Auto-Launch:** The `Launcher` class in the desktop app polls the database every 30 seconds for a `cloudflareToken`. When found, it automatically spawns the tunnel process in the background.
- **Crash Protection:** Added an error listener to the tunnel spawn logic to prevent "ENOENT" JavaScript errors from crashing the main process if the binary is missing or blocked.
- **Path Priority:** The launcher prioritizes the bundled binary (`app.asar.unpacked/apps/desktop-app/bin/cloudflared.exe`) over system PATH.

### B. Targeted Printing (QR Codes)
- **Logic:** Each printer in the Admin Dashboard has a unique "Tray QR". 
- **Flow:** When scanned, the `printerId` is appended to the URL. The backend stores this and the Print Agent prioritizes that specific physical printer for the job.
- **Status:** The backend logic respects `printerId` during the `markPaidAndEnqueue` phase.

### C. High-Fidelity Paper Preview
- **Logic:** The web preview (`apps/web`) uses strict CSS to mimic an A4 Word Document (210mm x 297mm).
- **Styling:** We removed all legacy browser frames to create a clean "What You See Is What You Get" experience.

---

## 💾 3. Critical Code & Database Patches

### The "JSON Crash" Fix
- **File:** `apps/backend/src/modules/settings/settings.service.ts`
- **Why:** Postgres stores JSON as objects; SQLite stores it as strings. We implemented a `typeof === 'string' ? JSON.parse(val) : val` check to prevent the server from crashing when loading settings.

### The "Automatic Typo" Fixer
- **File:** `apps/backend/src/modules/settings/settings.service.ts`
- **Why:** Users often type `https://https://...`. The backend now automatically strips the redundant prefix during the `update` call.

### Admin DTO Relaxation
- **File:** `apps/backend/src/modules/settings/settings.controller.ts`
- **Why:** Strict validation was blocking saves. We relaxed the `UpdateSettingsDto` so it only requires a string/number/boolean without complex length constraints.

---

## 💸 4. Payments & Pricing
- **Provider:** Razorpay (Test Mode active).
- **Pricing:** 
  - Calculated in `Paise` (smallest currency unit).
  - Configurable in Admin: `bwPaise`, `colorPaise`, `duplexDiscountPct`.
  - Session-based Job Modes: Pricing applies to the entire job mode, not mixed per-page.

---

## 📦 5. Building & Deployment
- **Command:** `npm run package` (Root)
- **Bundle Strategy:**
  - `better-sqlite3` and `pdf-to-printer` must be `asarUnpack`'d because they are native C++ binaries.
  - `cloudflared.exe` (the tunnel engine) is also `asarUnpack`'d so the launcher can point to it.
- **Log Location:** `%APPDATA%\quickprint\logs\main.log` for the primary system output.

---

## 🧭 6. Hidden Knowledge (The "Gotchas")
- **Manual Node Kill:** If the app fails to start with `EADDRINUSE`, the previous `node.exe` processes must be killed in Task Manager.
- **Prisma Generation:** After changing `schema.sqlite.prisma`, you MUST run `npx prisma generate --schema=apps/backend/prisma/schema.sqlite.prisma`.
- **Port Conflict:** Backend `4000`, Admin `3001`, Web `3002`. Ensure no other app (like another dev project) is using these.

---
*Context verified and updated: May 10, 2026*
