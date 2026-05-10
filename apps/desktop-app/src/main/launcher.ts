import { ChildProcess, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import log from 'electron-log';

const BACKEND_PORT = 4000;
const ADMIN_PORT = 3001;
const WEB_PORT = 3002;
const HEALTH_POLL_INTERVAL_MS = 1000;
const HEALTH_REQUEST_TIMEOUT_MS = 2000;
const SERVICE_READY_TIMEOUT_MS = 90_000;
const SERVICE_RESTART_LIMIT = 2;

type ServiceName = 'backend' | 'admin' | 'web' | 'tunnel';

interface ServiceConfig {
  name: ServiceName;
  script: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  healthUrl: string;
  startupStatus: string;
  readyStatus?: string;
  readyTimeoutMs?: number;
  restartLimit?: number;
}

interface ManagedProcess {
  name: ServiceName;
  proc: ChildProcess;
  ready: boolean;
}

export class Launcher {
  private processes = new Map<ServiceName, ManagedProcess>();
  private readonly rootDir: string;
  private readonly dbPath: string;
  private readonly childNodePath: string;
  private readonly prismaQueryEnginePath: string | null;
  private readonly prismaSchemaEnginePath: string | null;
  private mainWindow?: BrowserWindow;
  private stopping = false;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.dbPath = path.join(app.getPath('userData'), 'quickprint.db');
    this.childNodePath = this.collectNodePaths().join(path.delimiter);
    const enginePath = path.join(process.resourcesPath, 'prisma', 'query_engine-windows.dll.node');
    this.prismaQueryEnginePath = fs.existsSync(enginePath) ? enginePath : null;

    if (!this.prismaQueryEnginePath) {
      log.error('Launcher: Prisma Query Engine NOT FOUND at:', enginePath);
    } else {
      log.info('Launcher: Prisma Query Engine confirmed at:', enginePath);
    }

    this.prismaSchemaEnginePath = path.join(process.resourcesPath, 'prisma', 'schema-engine-windows.exe');

    log.info('Launcher initialized', {
      rootDir: this.rootDir,
      dbPath: this.dbPath,
      nodePath: this.childNodePath,
      prismaQueryEnginePath: this.prismaQueryEnginePath,
      prismaSchemaEnginePath: this.prismaSchemaEnginePath,
    });
  }

  async startAll(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.stopping = false;
    log.info('Launcher: Orchestrating packaged QuickPrint services...');

    this.setStatus('Synchronizing Database...');
    await this.initDatabase();

    const backendConfig = this.getBackendConfig();
    await this.startManagedService(backendConfig);

    const adminConfig = this.getAdminConfig();
    const webConfig = this.getWebConfig();
    await Promise.all([
      this.startManagedService(adminConfig),
      this.startManagedService(webConfig),
    ]);

    this.setStatus('QuickPrint is ready.');

    // Start tunnel in background if a token exists
    this.startTunnelSupport();
  }

  stopAll() {
    this.stopping = true;
    log.info('Launcher: Shutting down services...');

    for (const managed of this.processes.values()) {
      managed.proc.kill();
    }

    this.processes.clear();
  }

  private getBackendConfig(): ServiceConfig {
    return {
      name: 'backend',
      script: this.requirePath('apps/backend/dist/main.js'),
      cwd: this.requireDirectory('apps/backend'),
      healthUrl: `http://127.0.0.1:${BACKEND_PORT}/api/readyz`,
      startupStatus: 'Starting Backend Service...',
      readyStatus: 'Backend Ready.',
      readyTimeoutMs: SERVICE_READY_TIMEOUT_MS,
      restartLimit: SERVICE_RESTART_LIMIT,
      env: {
        DATABASE_URL: `file:${this.dbPath}`,
        BACKEND_PORT: String(BACKEND_PORT),
        NODE_ENV: 'production', // Match validation expectation
        SHOP_ID: 'shop_local_dev',
        JWT_SECRET: 'quickprint-local-jwt-secret-stable-2026',
        AGENT_TOKEN_SECRET: 'quickprint-local-agent-secret-stable-2026',
        ADMIN_PASSWORD: 'admin',
        PRISMA_QUERY_ENGINE_LIBRARY: this.prismaQueryEnginePath || '',
        RAZORPAY_KEY_ID: 'rzp_test_SmxpE8i6nRCGAT',
        RAZORPAY_KEY_SECRET: 'z0yuRk0ntNWImD81u7ld4FxQ',
        RAZORPAY_WEBHOOK_SECRET: 'standalone_placeholder_webhook',
        PUBLIC_BASE_URL: `http://127.0.0.1:${BACKEND_PORT}`,
        CORS_ORIGINS: `http://127.0.0.1:${ADMIN_PORT},http://127.0.0.1:${WEB_PORT}`,
      },
    };
  }

  private getAdminConfig(): ServiceConfig {
    const standaloneRoot = this.requireDirectory('apps/admin/.next/standalone');
    const adminRoot = path.join(standaloneRoot, 'apps/admin');
    const serverPath = path.join(adminRoot, 'server.js');

    return {
      name: 'admin',
      script: serverPath,
      cwd: adminRoot,
      healthUrl: `http://127.0.0.1:${ADMIN_PORT}/login`,
      startupStatus: 'Initializing Admin Dashboard...',
      readyStatus: 'Admin Dashboard Ready.',
      readyTimeoutMs: SERVICE_READY_TIMEOUT_MS,
      restartLimit: SERVICE_RESTART_LIMIT,
      env: {
        PORT: String(ADMIN_PORT),
        HOSTNAME: '127.0.0.1',
        INTERNAL_API_URL: `http://127.0.0.1:${BACKEND_PORT}`,
      },
    };
  }

  private getWebConfig(): ServiceConfig {
    const standaloneRoot = this.requireDirectory('apps/web/.next/standalone');
    const webRoot = path.join(standaloneRoot, 'apps/web');
    const serverPath = path.join(webRoot, 'server.js');

    return {
      name: 'web',
      script: serverPath,
      cwd: webRoot,
      healthUrl: `http://127.0.0.1:${WEB_PORT}/`,
      startupStatus: 'Preparing Student Interface...',
      readyStatus: 'Student Interface Ready.',
      readyTimeoutMs: SERVICE_READY_TIMEOUT_MS,
      restartLimit: SERVICE_RESTART_LIMIT,
      env: {
        PORT: String(WEB_PORT),
        HOSTNAME: '127.0.0.1',
        INTERNAL_API_URL: `http://127.0.0.1:${BACKEND_PORT}`,
      },
    };
  }

  private startTunnelSupport() {
    // Periodically check for tunnel token and start if found
    setInterval(async () => {
      if (this.processes.has('tunnel') || this.stopping) return;
      const token = await this.getTunnelToken();
      if (token) {
        log.info('Launcher: Active Tunnel Token discovered, starting cloudflared...');
        this.spawnTunnel(token);
      }
    }, 30_000);
    
    // Immediate check
    this.getTunnelToken().then(token => {
      if (token) this.spawnTunnel(token);
    });
  }

  private async getTunnelToken(): Promise<string | null> {
    // 1. Check environment variables first (Dev mode / Docker)
    if (process.env.CLOUDFLARE_TUNNEL_TOKEN) return process.env.CLOUDFLARE_TUNNEL_TOKEN;

    // 2. Check the database
    try {
      const BetterSqlite = require('better-sqlite3');
      // In dev, the DB might be in the backend folder. In prod, it's in userData.
      const dbPath = app.isPackaged 
        ? this.dbPath 
        : path.join(this.rootDir, 'apps/backend/prisma/dev.db');

      if (!fs.existsSync(dbPath)) return null;

      const db = new BetterSqlite(dbPath);
      const row = db.prepare("SELECT value FROM Setting WHERE key = 'shop'").get() as any;
      db.close();
      
      if (row) {
        const settings = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        return settings.cloudflareToken || null;
      }
    } catch (e) {
      log.warn('Launcher: Could not read tunnel token from database', e);
    }
    return null;
  }

  private spawnTunnel(token: string) {
    try {
      // Hunt for the binary in potential unpacked locations
      const possiblePaths = [
        path.join(this.rootDir, 'apps/desktop-app/bin/cloudflared.exe'),
        path.join(process.resourcesPath, 'app.asar.unpacked/apps/desktop-app/bin/cloudflared.exe'),
        path.join(app.getAppPath().replace('app.asar', 'app.asar.unpacked'), 'apps/desktop-app/bin/cloudflared.exe')
      ];

      let cloudflaredPath = null;
      for (const p of possiblePaths) {
        log.info(`Launcher: Checking for tunnel engine at: ${p}`);
        if (fs.existsSync(p)) {
          cloudflaredPath = p;
          break;
        }
      }

      // Final fallback to dev path if still not found (only for non-packaged dev mode)
      if (!cloudflaredPath) {
        const devPath = path.join(app.getAppPath(), 'apps/desktop-app/bin/cloudflared.exe');
        if (fs.existsSync(devPath)) cloudflaredPath = devPath;
      }

      if (!cloudflaredPath) {
        log.error('Launcher: FAILED TO FIND TUNNEL ENGINE IN ANY UNPACKED LOCATION');
        cloudflaredPath = 'cloudflared'; // System path fallback
      }
      
      log.info(`Launcher: Spawning tunnel using engine at ${cloudflaredPath}`);
      
      const proc = spawn(cloudflaredPath, ['tunnel', '--no-autoupdate', 'run', '--token', token], {
        shell: false, // Use false now that we have the full path
        windowsHide: true,
      });

      this.processes.set('tunnel', {
        name: 'tunnel',
        proc,
        ready: true
      });

      proc.stdout?.on('data', (data) => log.info(`[tunnel] ${data.toString().trim()}`));
      proc.stderr?.on('data', (data) => log.warn(`[tunnel] ${data.toString().trim()}`));

      proc.on('error', (err) => {
        log.error(`Launcher: Tunnel process error (check if binary exists): ${err.message}`);
        this.processes.delete('tunnel');
      });

      proc.on('close', (code) => {
        log.warn(`Launcher: Tunnel process exited with code ${code}`);
        this.processes.delete('tunnel');
      });
    } catch (err: any) {
      log.error('Launcher: Fatal error in spawnTunnel:', err.message);
    }
  }

  private async initDatabase() {
    const templatePath = this.requirePath('apps/backend/prisma/template.db');
    
    // Ensure the target directory exists
    await fs.promises.mkdir(path.dirname(this.dbPath), { recursive: true });

    // Check if the user's database already exists
    try {
      await fs.promises.access(this.dbPath);
      log.info('Launcher: Database already exists. Skipping template copy.');
      return;
    } catch (e) {
      log.info('Launcher: First run detected. Deploying template database...', {
        templatePath,
        targetPath: this.dbPath,
      });
    }

    try {
      await fs.promises.copyFile(templatePath, this.dbPath);
      log.info('Launcher: Database template deployed successfully.');
    } catch (copyErr: any) {
      log.error(`Launcher: Critical failure - could not copy database template: ${copyErr.message}`);
      throw copyErr;
    }
  }

  private async startManagedService(config: ServiceConfig) {
    const restartLimit = config.restartLimit ?? 0;

    for (let attempt = 0; attempt <= restartLimit; attempt += 1) {
      this.setStatus(
        attempt === 0 ? config.startupStatus : `${config.startupStatus} Retry ${attempt}/${restartLimit}...`,
      );

      log.info(`Launcher: Launching ${config.name} (attempt ${attempt + 1}/${restartLimit + 1})`, {
        script: config.script,
        cwd: config.cwd,
        healthUrl: config.healthUrl,
      });

      const proc = this.spawnNodeProcess(config.name, config.script, {
        cwd: config.cwd,
        env: config.env,
      });

      this.processes.set(config.name, { name: config.name, proc, ready: false });

      try {
        await this.waitForHttpReady(
          config.name,
          proc,
          config.healthUrl,
          config.readyTimeoutMs ?? SERVICE_READY_TIMEOUT_MS,
        );

        const managed = this.processes.get(config.name);
        if (managed) {
          managed.ready = true;
        }

        if (config.readyStatus) {
          this.setStatus(config.readyStatus);
        }

        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Launcher: ${config.name} failed during startup`, message);
        this.processes.delete(config.name);

        if (proc.exitCode === null && !proc.killed) {
          proc.kill();
        }

        if (attempt === restartLimit) {
          throw error;
        }
      }
    }
  }

  private spawnNodeProcess(
    name: string,
    scriptPath: string,
    options: { cwd: string; env?: NodeJS.ProcessEnv },
  ) {
    const env = this.buildChildEnv(options.env);
    const proc = spawn(process.execPath, [scriptPath], {
      cwd: options.cwd,
      env,
      shell: false,
      stdio: 'pipe',
      windowsHide: true,
    });

    proc.stdout?.on('data', (data) => log.info(`[${name}] ${data.toString().trim()}`));
    proc.stderr?.on('data', (data) => log.error(`[${name}] ${data.toString().trim()}`));

    proc.on('exit', (code, signal) => {
      const managed = this.processes.get(name as ServiceName);
      const wasReady = managed?.ready ?? false;
      this.processes.delete(name as ServiceName);

      if (this.stopping) {
        log.info(`Launcher: ${name} stopped during shutdown`, { code, signal });
        return;
      }

      log.warn(`Launcher: ${name} exited`, { code, signal, wasReady });

      if (wasReady) {
        this.setStatus(`${name} stopped unexpectedly. Restart QuickPrint.`);
      }
    });

    return proc;
  }

  private async runNodeCommand(
    name: string,
    scriptPath: string,
    args: string[],
    options: { cwd: string; env?: NodeJS.ProcessEnv },
  ) {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(process.execPath, [scriptPath, ...args], {
        cwd: options.cwd,
        env: this.buildChildEnv(options.env),
        shell: false,
        stdio: 'pipe',
        windowsHide: true,
      });

      let stderr = '';

      proc.stdout?.on('data', (data) => log.info(`[${name}] ${data.toString().trim()}`));
      proc.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        log.error(`[${name}] ${chunk.trim()}`);
      });

      proc.on('exit', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(
          new Error(
            `${name} exited with code ${code}${stderr ? `: ${stderr.trim()}` : ''}`,
          ),
        );
      });
    });
  }

  private async waitForHttpReady(
    name: string,
    proc: ChildProcess,
    healthUrl: string,
    timeoutMs: number,
  ) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (this.stopping) {
        throw new Error(`${name} startup cancelled`);
      }

      if (proc.exitCode !== null) {
        throw new Error(`${name} exited before becoming healthy (code ${proc.exitCode})`);
      }

      try {
        const response = await fetch(healthUrl, {
          signal: AbortSignal.timeout(HEALTH_REQUEST_TIMEOUT_MS),
        });

        if (response.ok || response.status < 500) {
          log.info(`Launcher: ${name} passed health check`, { healthUrl, status: response.status });
          return;
        }
      } catch {
        // Keep polling until timeout or process exit.
      }

      await this.delay(HEALTH_POLL_INTERVAL_MS);
    }

    throw new Error(`${name} did not become healthy within ${timeoutMs}ms`);
  }

  private buildChildEnv(overrides?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    return {
      ...process.env,
      ...overrides,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_PATH: this.childNodePath,
      PRISMA_QUERY_ENGINE_LIBRARY:
        overrides?.PRISMA_QUERY_ENGINE_LIBRARY || this.prismaQueryEnginePath || process.env.PRISMA_QUERY_ENGINE_LIBRARY,
      PRISMA_SCHEMA_ENGINE_BINARY:
        overrides?.PRISMA_SCHEMA_ENGINE_BINARY || this.prismaSchemaEnginePath || process.env.PRISMA_SCHEMA_ENGINE_BINARY,
    };
  }

  private collectNodePaths() {
    const inheritedNodePaths = (process.env.NODE_PATH ?? '')
      .split(path.delimiter)
      .filter(Boolean);

    const candidates = [
      path.join(this.rootDir, 'node_modules'),
      path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules'),
      path.join(process.resourcesPath, 'app.asar', 'node_modules'),
      ...inheritedNodePaths,
    ];

    return [...new Set(candidates.filter((candidate) => fs.existsSync(candidate)))];
  }

  private requirePath(relativePath: string) {
    const absolutePath = path.join(this.rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Missing packaged file: ${absolutePath}`);
    }
    return absolutePath;
  }

  private requireDirectory(relativePath: string) {
    const absolutePath = this.requirePath(relativePath);
    const stat = fs.statSync(absolutePath);
    if (!stat.isDirectory()) {
      throw new Error(`Expected directory but found file: ${absolutePath}`);
    }
    return absolutePath;
  }

  private resolveIfExists(...candidates: string[]) {
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private setStatus(status: string) {
    log.info(`Launcher status: ${status}`);

    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    this.mainWindow.webContents.send('agent:status', status);

    const escapedStatus = JSON.stringify(status);
    this.mainWindow.webContents
      .executeJavaScript(
        `void function(){var s=document.querySelector('.status');if(s){s.innerText=${escapedStatus};}}()`,
      )
      .catch(() => undefined);
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
