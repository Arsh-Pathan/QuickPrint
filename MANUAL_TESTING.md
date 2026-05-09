# QuickPrint — Manual Testing & Demo Guide

This guide explains how to set up the environment and perform a complete end-to-end demonstration of the QuickPrint system using simulated hardware.

## 1. Prerequisites
- **Docker Desktop** installed and running.
- **Node.js 20+** (only for running the Print Agent locally).
- **Public URL**: Ensure the Cloudflare tunnel is running (handled by `docker-compose`).

## 2. Infrastructure Setup
Start all backend and web services:
```bash
docker-compose up -d --build
```
This starts:
- **Postgres**: Database.
- **Backend**: API on port 4000.
- **Web**: Student app on port 3000.
- **Admin**: Dashboard on port 3001.
- **Cloudflared**: Public tunnel.

## 3. Running the Print Agent (Simulation Mode)
The Print Agent runs on the shop computer. For testing, we use "Dummy Mode" to bypass physical printers.

1. Open a new terminal in `apps/print-agent`.
2. Install dependencies (if not done): `npm install`.
3. Start the agent with the dummy flag:
   ```bash
   # Windows (CMD)
   set AGENT_DUMMY_PRINTER=true && npm run dev
   
   # Windows (PowerShell)
   $env:AGENT_DUMMY_PRINTER="true"; npm run dev
   ```
4. The agent will show a "Simulated Cloud Printer" in the status bar.

## 4. Full Demo Flow (The "Golden Path")

### A. Student Side (Mobile/Web)
1. Visit the Public URL (URL is in `docker logs quickprint-cloudflared`).
2. Click **'Continue as Guest'**.
3. **Upload** any PDF or Image.
4. Configure settings (Color/B&W, Copies).
5. Click **'Pay & Print'**.
6. In the Razorpay Modal:
   - Select **UPI** or any method.
   - Click the **'Success'** button (Razorpay Test Mode allows this).
7. You will be redirected to the **Print Status** page.

### B. The Print Lifecycle
- **Awaiting Payment**: Initial state.
- **Pending**: Payment confirmed, waiting for agent to grab the job.
- **Printing**: (Visible for 5 seconds) Simulated by the Dummy Agent.
- **Ready for Pickup**: Final state once the agent finishes "printing".

### C. Admin Side
1. Visit `http://localhost:3001`.
2. Check the **Queue** tab to see the job move from "Paid" to "Printed".
3. Check the **Printers** tab to see the "Simulated Cloud Printer" online.

---

## Troubleshooting
- **"Failed to fetch"**: Ensure `PUBLIC_BASE_URL` is empty in `docker-compose.yml` (relative paths).
- **Agent not connecting**: Ensure `AGENT_BACKEND_URL` in `apps/print-agent/src/main/config.ts` matches your host URL (usually `http://localhost:4000`).
