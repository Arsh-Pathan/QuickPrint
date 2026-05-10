# 🖨️ QuickPrint
**The Zero-Setup Standalone Print Management Suite**

QuickPrint is a high-fidelity, monorepo-based ecosystem designed to transform any local shop PC into a smart document printing hub. It bridges the gap between student mobile devices and physical shop printers through automated Cloudflare tunneling and a robust Electron-based service orchestrator.

---

## ✨ Key Features

### 🚀 Zero-Setup Deployment
Say goodbye to complex server configurations. QuickPrint bundles its own tunneling engine (`cloudflared`) and manages its own internal servers. Install the `.exe`, and you're live.

### 🎯 Targeted "Tray" Printing
Each physical printer tray can have its own unique QR code. When a student scans it, the software automatically routes the job to that specific printer—no more manual tray selection by the shop owner.

### 📄 High-Fidelity Paper Preview
A "What-You-See-Is-What-You-Get" web interface that perfectly mimics A4 paper dimensions (210mm x 297mm), ensuring students know exactly how their prints will look.

### 💸 Smart Pricing & Payments
Built-in Razorpay integration with support for:
- Per-page B&W vs Color pricing.
- Automated Duplex (Double-sided) discounts.
- Seamless UPI and Card payments.

---

## 🏗️ Repository Architecture

QuickPrint is an npm-workspaces monorepo designed for modularity and speed:

- **`apps/desktop-app`**: The "Brain." An Electron orchestrator that manages the lifecycle of the backend, admin, web, and tunnel services.
- **`apps/backend`**: NestJS Core. Handles business logic, SQLite persistence through Prisma, and WebSocket state synchronization.
- **`apps/admin`**: Next.js Dashboard. Real-time queue management, printer configuration, and financial analytics.
- **`apps/web`**: Next.js Mobile-First. The student interface for file uploads, previewing, and secure checkout.
- **`packages/shared`**: Shared TypeScript contracts, pricing logic, and WebSocket protocols.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Language** | TypeScript |
| **Backend** | NestJS, Prisma, Socket.IO |
| **Database** | SQLite (Standalone) / PostgreSQL (Cloud) |
| **Frontend** | Next.js 15, React Query, Zustand, Tailwind CSS |
| **Desktop** | Electron, pdf-to-printer, @electron/rebuild |
| **Tunneling** | Cloudflare Tunnels (Bundled) |
| **Payments** | Razorpay Integration |

---

## 🚀 Getting Started (Development)

### 1. Prerequisites
- Node.js v18+
- Windows OS (for native printer support)
- Docker Desktop (Optional, for Postgres testing)

### 2. Installation
```powershell
# Clone and install
git clone ...
npm.cmd install

# Generate database client
npm.cmd run db:generate
```

### 3. Local Development
```powershell
# Start everything in dev mode
npm.cmd run dev:backend
npm.cmd run dev:web
npm.cmd run dev:admin
npm.cmd run dev:desktop
```

---

## 📦 Production Building

To generate a standalone Windows installer containing the entire ecosystem:

```powershell
# Full production build and package
npm.cmd run package
```
*The output `.exe` will be located in the `dist/` folder.*

---

## 🧭 Documentation Index
- [📚 Project Overview](docs/PROJECT_OVERVIEW.md)
- [⚙️ Local Setup Guide](docs/LOCAL_SETUP.md)
- [🧪 Testing Strategies](docs/TESTING_GUIDE.md)
- [🛡️ Audit & Security Fixes](docs/AUDIT_FIXES_2026-05-09.md)
- [🧠 Context & History](context.md)

---
*Built with ❤️ for local shop owners. Part of the Advanced Coding Initiative.*
