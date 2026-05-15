<p align="center">
  <img src="docs/banner.png" alt="QuickPrint" width="100%"/>
</p>

<p align="center">
  <a href="https://github.com/Arsh-Pathan/QuickPrint"><img src="https://img.shields.io/badge/Project%20Status-Active-brightgreen" alt="Project Status"></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Framework-Next.js%2015-black" alt="Next.js 15"></a>
  <a href="https://nestjs.com/"><img src="https://img.shields.io/badge/Backend-NestJS%2010-red" alt="NestJS 10"></a>
  <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/Desktop-Electron-blue" alt="Electron"></a>
  <a href="#-license"><img src="https://img.shields.io/badge/License-Proprietary-lightgrey" alt="License"></a>
  <a href="https://www.microsoft.com/windows/"><img src="https://img.shields.io/badge/Platform-Windows%2010%2F11-0078d7" alt="Windows"></a>
</p>

<p align="center">
  <b>QuickPrint</b> is an autonomous print-shop management system designed for a single college-campus stationery shop.<br/>
  It automates the entire flow from document upload and UPI payment to physical printing,
  so the shop owner can focus on service instead of queues.
</p>

---

## ✨ Key Features

- **🚀 3-click print flow** — Students upload, pay via UPI, and track their print status in real time.
- **🛡️ Rock-solid reliability** — Local print agent with durable SQLite queueing ensures paid jobs are never lost, even across crashes and reboots.
- **📦 All-in-one installer** — A single Windows installer bundles the backend, student app, admin panel, print agent and the Cloudflare tunnel.
- **📊 Admin control** — Real-time queue monitoring, financial reporting, audit log, and shop configuration.
- **🌐 Secure remote access** — Built-in Cloudflare Tunnel for secure student access without port forwarding.
- **📝 Detailed setup logs** — The installer writes a full timestamped install log (system probe, payload size, executable verification, data-directory creation) to both `$INSTDIR\install.log` and `%LOCALAPPDATA%\QuickPrint\install.log`.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | NestJS 10, Prisma, Socket.IO |
| **Student UI** | Next.js 15 (Mobile-first), Tailwind CSS |
| **Admin UI** | Next.js 15, Lucide Icons |
| **Desktop Shell** | Electron 33, NSIS Installer |
| **Database** | PostgreSQL (dev), SQLite (production / packaged) |
| **Integrations** | Razorpay (Payments), MSG91 (WhatsApp), Cloudflare (Tunnel) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `>= 20.0.0`
- **npm** `>= 10.0.0`
- **Docker** (for running PostgreSQL during development)
- **Windows 10 or 11** (required for the desktop app — uses native printer APIs)

### Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/Arsh-Pathan/QuickPrint.git
   cd QuickPrint
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize environment**
   ```bash
   cp .env.example .env
   # Update your .env with local credentials
   ```

4. **Start the development database**
   ```bash
   npm run docker:up
   npm run db:generate
   npm run db:migrate
   ```

---

## 💻 Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev:backend` | Start NestJS API (port 4000) |
| `npm run dev:web` | Start student web app (port 3000) |
| `npm run dev:admin` | Start admin dashboard (port 3001) |
| `npm run dev:desktop` | Launch Electron developer environment |
| `npm test` | Run Vitest suite across all workspaces |
| `npm run lint` | Run ESLint and Prettier checks |
| `npm run typecheck` | Run `tsc --noEmit` across all workspaces |
| `npm run package` | Generate production Windows installer (`.exe`) |

---

## 📦 Building the Windows Installer

A single command produces a fully self-contained installer:

```bash
npm run package
```

This rebuilds native modules, builds every workspace, regenerates Prisma for SQLite, and runs electron-builder to produce `dist/installers/QuickPrint Setup <version>.exe`.

The installer is **assisted** (welcome → license → directory → install → finish), shows a fully detailed install log on the progress page, and registers an Add/Remove Programs entry under your name. See [`build/installer.nsh`](build/installer.nsh) for the custom NSIS logic and [`build/license.txt`](build/license.txt) for the end-user licence.

---

## 📂 Project Structure

```text
QuickPrint/
├── apps/
│   ├── backend/        # NestJS API & Prisma schema
│   ├── web/            # Student Next.js app
│   ├── admin/          # Shop owner dashboard
│   └── desktop-app/    # Electron shell & print agent
├── packages/
│   └── shared/         # Zod DTOs, enums, pricing engine
├── build/              # Electron-builder inputs (icon, license, NSIS hooks)
├── docs/               # Documentation assets (banner, screenshots)
├── package.json        # Workspace configuration
└── CLAUDE.md           # Critical development invariants
```

---

## 🏗️ Architecture

For a deep dive into the system design, sequence diagrams, and resilience strategies, please refer to **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## 📜 Development Guidelines

- **Shared logic** — Always put cross-app types and DTOs in `packages/shared`.
- **Database** — When modifying models, update **both** `schema.prisma` and `schema.sqlite.prisma`.
- **Print agent** — Never modify `apps/desktop-app` without ensuring crash-recovery logic remains intact.

---

## 👤 Author

**Arsh Pathan**

- ✉️ &nbsp;[mail.arsh.pathan@gmail.com](mailto:mail.arsh.pathan@gmail.com)
- 🐙 &nbsp;[github.com/Arsh-Pathan](https://github.com/Arsh-Pathan)
- 📍 &nbsp;Pune, Maharashtra, India

> Designed, built and maintained solo. If you find QuickPrint useful or want to license it for your own print shop, get in touch.

---

## 📄 License

**Proprietary — All Rights Reserved.**

Copyright © 2026 Arsh Pathan &lt;mail.arsh.pathan@gmail.com&gt;.

QuickPrint is closed-source software. See [`build/license.txt`](build/license.txt) for the full End User License Agreement that ships with the installer. Unauthorised copying, modification, or commercial deployment is strictly prohibited.
