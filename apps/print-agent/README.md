# QuickPrint Print Agent

The Windows desktop service that turns Maddy's shop PC into an autonomous print server. Runs in the system tray, talks to the backend over Socket.IO, and prints jobs as they arrive.

## What it does

| Module                  | Responsibility |
|-------------------------|----------------|
| `printer-discovery.ts`  | Enumerate connected printers on Windows (`pdf-to-printer.getPrinters()`). |
| `health-monitor.ts`     | Poll printer state every 15 s via `Get-Printer` PowerShell cmdlet, emit deltas only. |
| `local-queue.ts`        | SQLite-backed durable queue. Survives crashes and reboots. WAL mode, atomic claim. |
| `queue-processor.ts`    | Drains the queue. Downloads file via signed URL, prints via `pdf-to-printer.print()`, exponential-backoff retry up to 5 attempts. |
| `backend-socket.ts`     | Authenticated Socket.IO connection. Receives job assignments, sends heartbeats + printer events + job results. |
| `agent.ts`              | Wires the modules together; exposes `startAgent` / `stopAgent` to Electron. |
| `main/index.ts`         | Electron entrypoint: tray icon, hidden window, lifecycle management. |

## Running locally

```bash
npm install
npm run build       # tsc → dist/
npm start           # launches Electron in tray
```

For development with auto-rebuild use `npm run dev`.

## Packaging for distribution

```bash
npm run package:win   # → release/QuickPrint-Agent-Setup-x.y.z.exe (NSIS)
```

The installer registers QuickPrint Agent as a startup app. To run as a real Windows service, wrap the resulting exe with [`nssm`](https://nssm.cc/) — see `ARCHITECTURE.md` §7.

## Crash recovery

On startup, `releaseAllClaims()` resets any in-flight rows so a job that was being printed when the PC died gets retried instead of dropped silently.

## Security

- Only outbound WSS connections; no inbound ports opened.
- Files cached under `userData/local-queue/` and deleted on successful print.
- Agent token (loaded from env) scopes the socket to a specific shop.
