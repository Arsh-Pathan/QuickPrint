# Local Setup

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop
- PostgreSQL if you do not want to use Docker
- Windows, if you want to run the Electron print agent against real printers

On PowerShell, use `npm.cmd` if `npm` is blocked by execution policy.

## 1. Install Dependencies

```powershell
npm.cmd install
```

## 2. Create Environment File

Use `.env.example` as the base.

For local `npm.cmd run dev:*` workflows, put the values in a root `.env`.

For the full Docker Compose stack, the backend container currently reads from `apps/backend/.env`, so create that file too or update `docker-compose.yml`.

At minimum, configure:

```env
DATABASE_URL=postgresql://quickprint:quickprint@localhost:5432/quickprint?schema=public
NODE_ENV=development
BACKEND_PORT=4000
JWT_SECRET=replace-with-32-byte-random-string
AGENT_TOKEN_SECRET=replace-with-32-byte-random-string
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=./storage
STORAGE_HMAC_KEY=replace-with-secure-key

OTP_PROVIDER=mock

PRICE_BW_PAISE=200
PRICE_COLOR_PAISE=1000
PRICE_DUPLEX_DISCOUNT_PCT=10

NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx

AGENT_BACKEND_URL=http://localhost:4000
AGENT_SHOP_ID=shop_local_dev
AGENT_TOKEN=replace-with-token-issued-by-backend
AGENT_LOCAL_QUEUE_DIR=./local-queue
```

## 3. Start Infrastructure

### Option A: Docker

```powershell
npm.cmd run docker:up
```

This starts:

- `postgres`
- `backend`
- `web`
- `admin`
- `cloudflared`

If you are using Docker for the full stack, confirm:

- web at `http://localhost:3000`
- admin at `http://localhost:3001`
- backend at `http://localhost:4000/api/docs`

Important:

- the backend service in `docker-compose.yml` uses `env_file: apps/backend/.env`
- if that file is missing, the Docker backend container will not get the expected environment values

### Option B: Local App Processes

Start only Postgres in Docker:

```powershell
docker compose up -d postgres
```

Then run apps from the repo:

```powershell
npm.cmd run db:generate
npm.cmd run dev:backend
npm.cmd run dev:web
npm.cmd run dev:admin
```

If you want the desktop agent too:

```powershell
npm.cmd run dev:agent
```

## 4. Generate Prisma Client

```powershell
npm.cmd run db:generate
```

## 5. Apply Database Migrations

```powershell
npm.cmd run db:migrate
```

## 6. Verify Basic Health

Check backend:

```powershell
Invoke-WebRequest http://localhost:4000/api/docs
```

Open in the browser:

- `http://localhost:3000`
- `http://localhost:3001`

## Storage Modes

### Local Storage

Recommended for development.

- `STORAGE_DRIVER=local`
- files are read and written under `LOCAL_STORAGE_DIR`
- upload and download URLs are HMAC-signed

### S3 Storage

Use when testing cloud-style storage.

Required variables:

- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

Optional:

- `S3_ENDPOINT`
- `S3_FORCE_PATH_STYLE`

## OTP Modes

### Mock

Use `OTP_PROVIDER=mock` for local development.

### Real Providers

Supported configuration placeholders already exist for:

- `msg91`
- `twilio`

## Print Agent Notes

The print agent is only fully meaningful on a Windows machine with printers available.

Important agent variables:

- `AGENT_BACKEND_URL`
- `AGENT_SHOP_ID`
- `AGENT_TOKEN`
- `AGENT_LOCAL_QUEUE_DIR`

The agent:

- receives jobs from the backend
- stores them in a local SQLite queue
- downloads files
- verifies SHA-256 integrity
- prints and reports status back

## Common Local Problems

### `npm` blocked in PowerShell

Use `npm.cmd` instead of `npm`.

### Frontend cannot reach backend

Check:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- backend is running on `4000`
- CORS origins include `3000` and `3001`

### Uploads fail

Check:

- `STORAGE_DRIVER`
- `LOCAL_STORAGE_DIR`
- backend file routes are reachable

### Payment flow does not complete

Check:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

### Agent cannot connect

Check:

- `AGENT_BACKEND_URL`
- `AGENT_TOKEN`
- backend WebSocket namespace `/realtime`
