# 🏗️ QuickPrint Architecture

QuickPrint is an autonomous, self-contained print-shop management system designed for high availability and zero-touch operation in a college campus environment.

---

## 🎯 Project Philosophy

- **Reliability over Breadth**: Every paid job MUST be printed. The system is designed to survive crashes, power outages, and network failures.
- **Single-Shop Focus**: Architecture is optimized for a single physical location with local printer hardware.
- **Zero-Config Deployment**: The entire stack is bundled into a single executable that requires minimal technical knowledge to install.

---

## 🗺️ System Overview

The system operates primarily on a local "Shop PC" but bridges to the cloud for student access and payments.

```text
+-----------------------------------------------------------------------+
|                         ☁️ CLOUD / EXTERNAL                          |
|  +------------+      +------------+      +------------+    +-------+  |
|  | Cloudflare |      |  Razorpay  |      |  S3/Local  |    | MSG91 |  |
|  |   Tunnel   |      |    API     |      |   Storage  |    | (WA)  |  |
|  +-----+------+      +-----+------+      +-----+------+    +---+---+  |
+--------|-------------------|-------------------|---------------|------+
         |                   |                   |               |
+--------|-------------------|-------------------|---------------|------+
|        |              🖥️ SHOP PC (DESKTOP)    |               |      |
|        |                   |                   |               |      |
|  +-----+------+            |                   |               |      |
|  |  Student   |<-----------|-------------------+---------------+      |
|  |  Web App   |            |                                          |
|  +-----+------+            |            +--------------------------+  |
|        ^                   |            |      🚀 BACKEND          |  |
|        |                   +----------->|   (NestJS + Prisma)      |  |
|        v                                +------------+-------------+  |
|  +-----+------+                                      |                |
|  |   Admin    |<-------------------------------------+                |
|  | Dashboard  |                                      |                |
|  +------------+                        +-------------v-------------+  |
|                                        |      🗄️ DATABASE          |  |
|  +------------+       +------------+   |  (Postgres / SQLite)      |  |
|  | Launcher   |------>|   PRINT    |<--+---------------------------+  |
|  | / Monitor  |       |   AGENT    |                                  |
|  +------------+       +-----+------+                                  |
|                             |          +--------------------------+   |
|                             +--------->| 📦 DURABLE SQLITE QUEUE  |   |
|                             |          +--------------------------+   |
|                             |          +--------------------------+   |
|                             +--------->| 🖨️ WINDOWS PRINTERS      |   |
|                                        +--------------------------+   |
+-----------------------------------------------------------------------+
```

---

## 📦 Core Components

### 1. ⚙️ Backend Service (`apps/backend`)
*The "Brain" of the operation.*
- **Stack**: NestJS 10, Prisma ORM, Socket.IO.
- **Key Modules**: 
    - `Payments`: Handles Razorpay webhooks and verification.
    - `Print-Jobs`: Manages the lifecycle and state machine of every job.
    - `Files`: Orchestrates file uploads to S3 or local storage.
    - `Realtime`: Broadcasts status updates to students and print commands to the agent.
- **Persistence**: Switches between PostgreSQL (Dev) and SQLite (Prod) seamlessly via shared Prisma schemas.

### 2. 🖨️ Print Agent (`apps/desktop-app/src/main`)
*The "Hands" of the operation.*
- **Responsibility**: The agent is an autonomous background service that communicates with physical hardware.
- **Durable Queue**: Uses a local `better-sqlite3` database to ensure that even if the backend is down, the agent remembers its task list.
- **Hardware Integration**: Uses `pdf-to-printer` to interact directly with the Windows Spooler.
- **Resilience**: Implements exponential backoff for print failures and automatic Socket.IO reconnection.

### 3. 📱 Student Web App (`apps/web`)
*The "Customer Portal".*
- **Stack**: Next.js 15 (App Router).
- **Design**: Mobile-first, "3-click" philosophy:
    1. **Upload**: Select PDF/Document.
    2. **Pay**: Seamless UPI/Razorpay integration.
    3. **Done**: Live progress tracking via WebSockets.

### 4. 🛠️ Admin Dashboard (`apps/admin`)
*The "Cockpit".*
- **Stack**: Next.js 15.
- **Capabilities**: Real-time queue monitoring, manual job reprinting, printer status management, and shop settings (pricing, hours, notifications).

---

## 🔄 Print Job Lifecycle

The following sequence ensures data integrity from student upload to physical paper output.

```text
Student (Web)         Backend (NestJS)         Print Agent          Printer
      |                      |                      |                  |
      |--- 1. Upload File -->|                      |                  |
      |                      |-- Status: PENDING    |                  |
      |                      |                      |                  |
      |--- 2. Pay (Razorpay)-|                      |                  |
      |                      |-- Status: PAID       |                  |
      |                      |                      |                  |
      |                      |-- 3. 'new-job' (WS)->|                  |
      |                      |                      |-- 4. Store in Q  |
      |                      |<---- 5. Ack ---------|                  |
      |                      |                      |                  |
      |                      |<--- 6. Download File-|                  |
      |                      |                      |-- 7. Send to Prn-|
      |                      |<--- 8. PRINTING -----|                  |
      |                      |                      |       (Printing) |
      |                      |<--- 9. COMPLETED ----|<-- Job Finished -|
      |<-- 10. Status Upd ---|                      |                  |
      |                      |                      |                  |
```

---

## 🛡️ Resilience & Invariants

To maintain "QuickPrint Reliability", the following invariants are enforced:

1. **Durable Storage**: Once a job is marked `PAID`, it is written to the primary DB. Once received by the Agent, it is written to the local SQLite queue.
2. **Crash Recovery**: The `Launcher` process monitors the health of the Backend, Admin, and Web processes. If any crash, they are restarted within seconds.
3. **Network Isolation**: The Agent can continue printing jobs already in its local queue even if the internet connection is lost.
4. **No Lost Files**: Files are only deleted from storage after the Agent confirms successful printing.

---

## 🔒 Security & Auth

- **API Security**: Global prefix `/api`, protected by JWT for Admin and Agent.
- **Agent Auth**: Authenticates using a unique `AGENT_TOKEN` generated by the backend.
- **Public Access**: The student web app is exposed via a secure Cloudflare Tunnel, removing the need for port forwarding or complex network setup.

---

## 💾 Database Strategy

The system uses two parallel Prisma schemas to support different environments without code changes:

- **`schema.prisma`**: Targets PostgreSQL for high-velocity development and testing.
- **`schema.sqlite.prisma`**: Targets SQLite for zero-dependency production installs.

*Note: Any change to the data model must be reflected in both files.*
