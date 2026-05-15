# 🖨️ QuickPrint

[![Project Status: Active](https://img.shields.io/badge/Project%20Status-Active-brightgreen)](https://github.com/Arsh-Pathan/QuickPrint)
[![Framework: Next.js 15](https://img.shields.io/badge/Framework-Next.js%2015-black)](https://nextjs.org/)
[![Backend: NestJS 10](https://img.shields.io/badge/Backend-NestJS%2010-red)](https://nestjs.com/)
[![Desktop: Electron](https://img.shields.io/badge/Desktop-Electron-blue)](https://www.electronjs.org/)

**QuickPrint** is an autonomous print-shop management system designed specifically for college campus stationery shops. It automates the entire flow from document upload and payment to physical printing, allowing shop owners to focus on service rather than queues.

---

## ✨ Key Features

- **🚀 3-Click Print Flow**: Students upload, pay via UPI, and track their print status in real-time.
- **🛡️ Rock-Solid Reliability**: Local agent with durable SQLite queuing ensures jobs are never lost.
- **📦 All-in-One Installer**: Bundles the backend, student app, admin panel, and print agent into a single Windows application.
- **📊 Admin Control**: Real-time queue monitoring, financial reporting, and shop configuration.
- **🌐 Secure Remote Access**: Built-in Cloudflare Tunnel for secure student access without port forwarding.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | NestJS 10, Prisma, Socket.IO |
| **Student UI** | Next.js 15 (Mobile-first), Tailwind CSS |
| **Admin UI** | Next.js 15, Lucide Icons |
| **Desktop Shell** | Electron, NSIS Installer |
| **Database** | PostgreSQL (Dev), SQLite (Prod) |
| **Integrations** | Razorpay (Payments), MSG91 (WhatsApp), Cloudflare (Tunnel) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher
- **Docker**: For running PostgreSQL during development
- **Windows**: Required for the Desktop App (Printer communication)

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

3. **Initialize Environment**
   ```bash
   cp .env.example .env
   # Update your .env with local credentials
   ```

4. **Start Development Database**
   ```bash
   npm run docker:up
   npm run db:generate
   npm run db:migrate
   ```

---

## 💻 Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev:backend` | Start NestJS API (Port 4000) |
| `npm run dev:web` | Start Student Web App (Port 3000) |
| `npm run dev:admin` | Start Admin Dashboard (Port 3001) |
| `npm run dev:desktop` | Launch Electron Developer Environment |
| `npm test` | Run Vitest suite across all workspaces |
| `npm run lint` | Run ESLint and Prettier checks |
| `npm run package` | Generate production Windows Installer (.exe) |

---

## 📂 Project Structure

```text
QuickPrint/
├── apps/
│   ├── backend/        # NestJS API & Prisma Schema
│   ├── web/            # Student Next.js App
│   ├── admin/          # Shop Owner Dashboard
│   └── desktop-app/    # Electron Shell & Print Agent
├── packages/
│   └── shared/         # Zod DTOs, Enums, Pricing Engine
├── package.json        # Workspace configuration
└── CLAUDE.md           # Critical development invariants
```

---

## 🏗️ Architecture

For a deep dive into the system design, sequence diagrams, and resilience strategies, please refer to our **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## 📜 Development Guidelines

- **Shared Logic**: Always put cross-app types and DTOs in `packages/shared`.
- **Database**: When modifying models, update **both** `schema.prisma` and `schema.sqlite.prisma`.
- **Print Agent**: Never modify `apps/desktop-app` without ensuring crash-recovery logic remains intact.

---

## 📄 License

Proprietary - All Rights Reserved.

Copyright © 2026 Arsh Pathan <mail.arsh.pathan@gmail.com>.

QuickPrint is closed-source software. See [`build/license.txt`](build/license.txt) for the full End User License Agreement that ships with the installer.
