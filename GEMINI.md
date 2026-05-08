# QuickPrint — Project Context

QuickPrint is an autonomous print management system designed for college campus print shops. It streamlines the printing workflow by allowing students to upload files and pay online, while providing shop owners with an automated queue management and printing system.

## Project Structure

This is a monorepo managed with npm workspaces:

- **`apps/backend`**: NestJS-based REST API and WebSocket gateway. Uses Prisma with PostgreSQL.
- **`apps/web`**: Student-facing mobile-first Next.js 15 application.
- **`apps/admin`**: Shop-owner-facing Next.js 15 dashboard for queue and printer management.
- **`apps/print-agent`**: Electron desktop application that runs on the shop PC to handle local printer discovery and job execution.
- **`packages/shared`**: Shared TypeScript types, enums, Zod schemas, and WebSocket event definitions.

## Core Tech Stack

- **Languages**: TypeScript (Strict mode)
- **Backend**: NestJS, Prisma, PostgreSQL, Socket.IO, Razorpay (Payments)
- **Frontend**: Next.js 15 (App Router), Tailwind CSS, shadcn/ui, React Query, Zustand
- **Desktop**: Electron, `pdf-to-printer`, `node-printer`, Better SQLite3
- **DevOps**: Docker Compose (Local DB), GitHub Actions (CI)

## Getting Started

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker (for local database)

### Initial Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start local PostgreSQL
npm run docker:up

# Initialize Database
npm run db:generate
npm run db:migrate
```

### Development Commands
- `npm run dev:backend`: Starts the NestJS API (Port 4000)
- `npm run dev:web`: Starts the student web app (Port 3000)
- `npm run dev:admin`: Starts the admin dashboard (Port 3001)
- `npm run dev:agent`: Starts the Electron print agent
- `npm run lint`: Runs linting across all packages
- `npm run typecheck`: Runs TypeScript type checks across all packages

## Development Conventions

### General
- **Monorepo Hygiene**: Always prefer shared types/logic from `@quickprint/shared`.
- **Typing**: Use strict TypeScript. Avoid `any`. Define Zod schemas for data validation.
- **Architecture**: Follow the module-based architecture in the backend and the App Router pattern in Next.js.

### Backend (`apps/backend`)
- Follow NestJS best practices: Controllers for routing, Services for business logic, Modules for organization.
- Use Prisma for all database interactions.
- WebSocket events should follow the definitions in `packages/shared/src/ws-events.ts`.

### Frontend (`apps/web` & `apps/admin`)
- Use Tailwind CSS for styling and shadcn/ui for components.
- State management: Use Zustand for lightweight client state and React Query for server state.
- Mobile-first design for the student web app.

### Print Agent (`apps/print-agent`)
- Handles local hardware interaction.
- Uses a local SQLite database for a durable queue to prevent job loss on restart.
- Communicates with the backend via authenticated Socket.IO connection.

## Key Documentation
- `README.md`: High-level overview and quick start.
- `ARCHITECTURE.md`: Detailed system design, data flow, and WebSocket contracts.
- `ROADMAP.md`: Current progress and upcoming tasks.
