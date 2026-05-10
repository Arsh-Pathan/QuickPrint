import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';
import log from 'electron-log';

export class Launcher {
  private processes: Map<string, ChildProcess> = new Map();
  private rootDir: string;
  private dbPath: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    // Map database to a writable User Data directory (standard practice)
    const userData = app.getPath('userData');
    this.dbPath = path.join(userData, 'quickprint.db');
    
    // Ensure the prisma schema directory exists relative to root
    log.info(`Launcher initialized. Root: ${this.rootDir}, DB: ${this.dbPath}`);
  }

  async startAll() {
    log.info('Launcher: Orchestrating QuickPrint Services...');
    
    await this.initDatabase();

    // 1. Start Backend (Development mode — standalone doesn't ship prod secrets)
    const backendDist = path.join(this.rootDir, 'apps/backend/dist/main.js');
    this.startService('backend', 'node', [backendDist], {
      cwd: path.join(this.rootDir, 'apps/backend'),
      env: {
        ...process.env,
        DATABASE_URL: `file:${this.dbPath}`,
        NODE_ENV: 'development',
        PORT: '3000',
        SHOP_ID: process.env.SHOP_ID || 'shop_local_standalone',
        JWT_SECRET: process.env.JWT_SECRET || 'quickprint-local-jwt-secret',
        AGENT_TOKEN_SECRET: process.env.AGENT_TOKEN_SECRET || 'quickprint-local-agent-secret',
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin',
        RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
        RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || 'placeholder_webhook',
      }
    });

    // 2. Start Admin Dashboard (dev server — no .next build in standalone)
    const adminPkg = path.join(this.rootDir, 'apps/admin');
    this.startService('admin', 'npx.cmd', ['next', 'dev', '-p', '3001'], {
      cwd: adminPkg,
    });

    // 3. Start Student Web (dev server — no .next build in standalone)
    const webPkg = path.join(this.rootDir, 'apps/web');
    this.startService('web', 'npx.cmd', ['next', 'dev', '-p', '3002'], {
      cwd: webPkg,
    });
  }

  private startService(name: string, command: string, args: string[], opts: any) {
    log.info(`Launcher: Launching ${name} service...`);
    const proc = spawn(command, args, {
      ...opts,
      shell: true,
      stdio: 'pipe',
    });

    proc.stdout?.on('data', (data) => log.info(`[${name}] ${data.toString().trim()}`));
    proc.stderr?.on('data', (data) => log.error(`[${name}] ${data.toString().trim()}`));

    proc.on('exit', (code) => {
      log.warn(`Launcher: ${name} process stopped (Exit code: ${code})`);
      this.processes.delete(name);
    });

    this.processes.set(name, proc);
  }

  private async initDatabase() {
    log.info('Launcher: Synchronizing Database Vault...');
    
    return new Promise((resolve, reject) => {
      const prismaCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const schemaPath = path.join(this.rootDir, 'apps/backend/prisma/schema.prisma');
      
      const proc = spawn(prismaCmd, ['prisma', 'db', 'push', `--schema=${schemaPath}`], {
        cwd: path.join(this.rootDir, 'apps/backend'),
        env: { ...process.env, DATABASE_URL: `file:${this.dbPath}` },
        shell: true
      });

      proc.on('exit', (code) => {
        if (code === 0) {
          log.info('Launcher: Database localized successfully');
          resolve(true);
        } else {
          log.error(`Launcher: Database sync failed (Code ${code})`);
          // We don't reject here to allow the app to try booting anyway
          resolve(false);
        }
      });
    });
  }

  stopAll() {
    log.info('Launcher: Shutting down services...');
    for (const [name, proc] of this.processes) {
      proc.kill();
    }
    this.processes.clear();
  }
}
