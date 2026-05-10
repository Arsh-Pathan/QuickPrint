import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } from 'electron';
import path from 'node:path';
import { exec } from 'node:child_process';
import log from 'electron-log';
import { startAgent, stopAgent } from './agent';
import { Launcher } from './launcher';

log.initialize();
log.transports.file.level = 'info';
log.info('QuickPrint Agent starting');

// PROD MODULE RESOLUTION FIX: In packaged builds, native modules are unpacked to app.asar.unpacked.
// We need to ensure Node knows where to find them, especially since the main.js is nested.
if (app.isPackaged) {
  const mod = require('node:module');
  const resourcesPath = process.resourcesPath;
  const unpackedNodeModules = path.join(resourcesPath, 'app.asar.unpacked', 'node_modules');
  const asarNodeModules = path.join(resourcesPath, 'app.asar', 'node_modules');
  
  // Inject these paths into the module search algorithm
  if (mod.globalPaths) {
    mod.globalPaths.push(unpackedNodeModules);
    mod.globalPaths.push(asarNodeModules);
  }
  
  // Also fix for the current process relative to this script
  process.env.NODE_PATH = [
    unpackedNodeModules,
    asarNodeModules,
    process.env.NODE_PATH
  ].filter(Boolean).join(path.delimiter);
  
  // @ts-ignore - Re-initialize the module system's path cache
  mod._initPaths();
  
  log.info('Native module resolution paths injected:', {
    unpacked: unpackedNodeModules,
    asar: asarNodeModules
  });
}

/**
 * The agent window embeds the admin dashboard (http://localhost:3001) so the
 * shop owner has one desktop app for everything: agent service runs in this
 * process while the same window shows the admin UI.
 *
 * Future: a bundled launcher will start backend + admin + Postgres before
 * opening this window. See docs/CRITICAL_FIXES_AND_SCENARIOS.md §4.
 */
const ADMIN_URL = process.env.ADMIN_URL ?? 'http://127.0.0.1:3001';
const ADMIN_LOAD_RETRY_MS = 2000;
const ADMIN_LOAD_MAX_RETRIES = 90; // 3 minutes — plenty of time for DB migration

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let launcher: Launcher | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    title: 'QuickPrint',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loadAdminWithRetry(0);

  mainWindow.on('close', (e: any) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

/**
 * Load the admin URL, retrying with a holding screen until the admin server
 * comes up. Necessary because the user's plan is to launch the agent and the
 * admin server together — the agent window may open before admin is ready.
 */
function loadAdminWithRetry(attempt: number) {
  if (!mainWindow) return;

  // Only load the splash screen once. Subsequent "retries" only update the text via JS.
  if (attempt === 0) {
    mainWindow.loadURL(loadingScreenDataUrl(0)).catch(() => undefined);
  }

  fetch(ADMIN_URL)
    .then((res) => {
      if (res.ok) {
        mainWindow?.loadURL(ADMIN_URL).catch((err) => log.error('Final dashboard load failed:', err));
      } else {
        throw new Error('Not ready');
      }
    })
    .catch(() => {
      if (attempt < ADMIN_LOAD_MAX_RETRIES) {
        const newStatus = getStatusMessage(attempt + 1);
        mainWindow?.webContents.executeJavaScript(
          `void function(){ var s = document.querySelector('.status'); if(s) s.innerText = '${newStatus}'; }()`
        ).catch(() => undefined);

        setTimeout(() => loadAdminWithRetry(attempt + 1), ADMIN_LOAD_RETRY_MS);
      } else {
        mainWindow?.loadURL(loadingScreenDataUrl(attempt + 1, true)).catch(() => undefined);
      }
    });
}

function getStatusMessage(a: number) {
  if (a < 6) return 'Starting services\u2026';
  if (a < 12) return 'Setting up database\u2026';
  if (a < 25) return 'Connecting to backend\u2026';
  if (a < 45) return 'Loading dashboard\u2026';
  return 'Almost ready\u2026';
}

function loadingScreenDataUrl(attempt: number, fatal = false, customMsg?: string): string {
  const status = customMsg || (fatal
    ? 'Something went wrong. Please restart QuickPrint.'
    : getStatusMessage(attempt));

  const html = `<!doctype html><html><head><meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        height: 100vh;
        background: #fff;
        font-family: 'Inter', system-ui, sans-serif;
        display: flex; align-items: center; justify-content: center;
      }
      .wrap { text-align: center; }
      .logo {
        font-size: 22px; font-weight: 600; color: #202124;
        margin-bottom: 32px; letter-spacing: -0.5px;
      }
      .logo span { color: #1a73e8; }
      .spinner {
        width: 28px; height: 28px;
        border: 3px solid #dadce0; border-top-color: #1a73e8;
        border-radius: 50%; margin: 0 auto 24px;
        animation: spin 0.8s linear infinite;
      }
      .status {
        font-size: 13px; color: #5f6368; font-weight: 400;
        line-height: 1.5;
      }
      .fatal { color: #d93025; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style></head><body>
      <div class="wrap">
        <div class="logo"><span>Quick</span>Print</div>
        <div class="spinner"></div>
        <div class="status ${fatal ? 'fatal' : ''}">${status}</div>
      </div>
    </body></html>`;
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('QuickPrint Agent');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show', click: () => mainWindow?.show() },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on('click', () => mainWindow?.show());
}

app.whenReady().then(async () => {
  createWindow();
  createTray();
  
  // Universal Path Logic: Works in both Prod and Dev
  const rootDir = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked')
    : path.join(__dirname, '../../../../');
    
  log.info(`Service Orchestrator active. App Mode: ${app.isPackaged ? 'PROD' : 'DEV'}`);
  launcher = new Launcher(rootDir);

  if (app.isPackaged) {
    log.info('Packaged mode detected. Starting bundled services directly...');
    if (mainWindow) {
      launcher
        ?.startAll(mainWindow)
        .catch((error) => {
          log.error('Bundled service startup failed:', error);
          mainWindow?.loadURL(
            loadingScreenDataUrl(
              0,
              true,
              'QuickPrint could not start its local services. Please restart the app.',
            ),
          ).catch(() => undefined);
        });
    }
  } else {
    // AUTOMATED STARTUP: Check for Docker and launch services
    log.info('Checking for Docker environment...');
    exec('docker info', (infoErr) => {
      if (infoErr) {
        log.warn('Docker not found or not running. Falling back to BARE METAL mode...');
        if (mainWindow) {
          launcher
            ?.startAll(mainWindow)
            .catch((error) => log.error('Bare metal fallback failed:', error));
        }
        return;
      }

      log.info('Orchestrating local infrastructure via Docker...');
      exec('docker-compose up -d', { cwd: rootDir }, (error) => {
        if (error) {
          log.error('Docker orchestration failed:', error);
          log.info('Attempting BARE METAL fallback after Docker failure...');
          if (mainWindow) {
            launcher
              ?.startAll(mainWindow)
              .catch((fallbackError) => log.error('Bare metal fallback failed:', fallbackError));
          }
        } else {
          log.info('Docker services started successfully');
        }
      });
    });
  }

  // Register Docker Handlers for manual control if needed
  ipcMain.handle('docker:start', () => {
    return new Promise((resolve, reject) => {
      exec('docker-compose up -d', { cwd: rootDir }, (error) => {
        if (error) { log.error(error); reject(error.message); return; }
        resolve(true);
      });
    });
  });

  ipcMain.handle('docker:stop', () => {
    return new Promise((resolve, reject) => {
      exec('docker-compose down', { cwd: rootDir }, (error) => {
        if (error) { log.error(error); reject(error.message); return; }
        resolve(true);
      });
    });
  });

  ipcMain.on('admin:open', () => {
    shell.openExternal(ADMIN_URL);
  });

  await startAgent();
});

app.on('before-quit', async () => {
  log.info('Shutting down local infrastructure...');
  launcher?.stopAll();
  if (!app.isPackaged) {
    exec('docker-compose stop', { cwd: path.join(__dirname, '../../../../') });
  }
  await stopAgent();
});

app.on('window-all-closed', () => {
  // Keep agent running in background even when window closed
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Electron {
    interface App {
      isQuitting?: boolean;
    }
  }
}
