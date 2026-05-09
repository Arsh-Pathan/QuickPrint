# QuickPrint Print Agent

The QuickPrint print agent is an Electron desktop app intended to run on the shop PC. It connects to the backend, keeps a durable local queue, downloads paid jobs, verifies file integrity, and dispatches them to Windows printers.

## Current Modules

| File | Responsibility |
|---|---|
| `printer-discovery.ts` | Discovers available printers through `pdf-to-printer.getPrinters()` and falls back to a mock printer in development. |
| `health-monitor.ts` | Polls printer status and emits backend printer events when the status changes. |
| `local-queue.ts` | SQLite-backed durable queue with atomic claiming and retry support. |
| `queue-processor.ts` | Downloads files, verifies SHA-256 integrity, prints, and retries failed jobs with backoff. |
| `backend-socket.ts` | Authenticated Socket.IO client for job assignments, heartbeats, printer events, and job results. |
| `agent.ts` | Wires discovery, health monitoring, socket connection, local queue, and processor together. |
| `index.ts` | Electron main process entrypoint, tray setup, hidden window, and app lifecycle. |

## What It Currently Does

- connects to the backend namespace `/realtime`
- subscribes to the configured shop
- stores incoming jobs in a local SQLite queue
- downloads files through signed URLs
- verifies `fileHash` after download
- prints through `pdf-to-printer`
- retries failed jobs up to 5 times
- reports printer state changes and final job results

## Current Configuration

Configured through environment variables in `src/main/config.ts`:

- `AGENT_BACKEND_URL`
- `AGENT_SHOP_ID`
- `AGENT_TOKEN`
- `AGENT_HEARTBEAT_INTERVAL_MS`
- `AGENT_LOCAL_QUEUE_DIR`
- `AGENT_DUMMY_PRINTER`

Defaults:

- backend URL: `http://localhost:4000`
- shop ID: `shop_local_dev`
- heartbeat interval: `15000`
- local queue directory: `./local-queue`

## Running Locally

On Windows PowerShell, use `npm.cmd` if `npm` is blocked by execution policy.

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run start
```

Development mode:

```powershell
npm.cmd run dev
```

## Typecheck

```powershell
npm.cmd --workspace apps/print-agent run typecheck
```

## Packaging

Windows packaging:

```powershell
npm.cmd --workspace apps/print-agent run package:win
```

This produces an Electron installer through `electron-builder`.

## Tray and Local UI

The app currently:

- runs with a tray icon
- keeps the main window hidden by default
- hides instead of exiting when the window is closed
- exposes a tray menu with `Show` and `Quit`

The Electron main process also includes handlers to:

- start Docker services from the repo root
- stop Docker services from the repo root
- open the admin UI in the browser

## Dummy and Fallback Modes

### Dummy printer mode

Set:

```env
AGENT_DUMMY_PRINTER=true
```

When enabled:

- a simulated printer is added
- printing is simulated instead of sent to hardware

### Mock discovery fallback

If native printer discovery fails, the agent falls back to:

- `Mock Printer (dev)`

This keeps local development usable even without printer hardware.

## Crash Recovery

On startup, the local queue releases previously claimed rows so jobs are retried instead of being silently stranded after a crash or reboot.

## Security and Integrity

Currently implemented:

- outbound backend connection only
- per-shop authenticated socket connection
- signed file download URLs
- SHA-256 verification after download

Important note:

- files are cached locally and deleted after successful printing, but the current code does not encrypt the local cache
