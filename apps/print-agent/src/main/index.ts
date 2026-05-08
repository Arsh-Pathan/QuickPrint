import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } from 'electron';
import path from 'node:path';
import { exec } from 'node:child_process';
import log from 'electron-log';
import { startAgent, stopAgent } from './agent';

log.initialize();
log.transports.file.level = 'info';
log.info('QuickPrint Agent starting');

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 720,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
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
  
  // Register Docker Handlers
  ipcMain.handle('docker:start', () => {
    return new Promise((resolve, reject) => {
      exec('docker-compose up -d --build', { cwd: path.join(__dirname, '../../../../') }, (error, stdout, stderr) => {
        if (error) { log.error(error); reject(error.message); return; }
        resolve(true);
      });
    });
  });

  ipcMain.handle('docker:stop', () => {
    return new Promise((resolve, reject) => {
      exec('docker-compose down', { cwd: path.join(__dirname, '../../../../') }, (error, stdout, stderr) => {
        if (error) { log.error(error); reject(error.message); return; }
        resolve(true);
      });
    });
  });

  ipcMain.on('admin:open', () => {
    shell.openExternal('http://localhost:3001');
  });

  await startAgent();
});

app.on('before-quit', async () => {
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
