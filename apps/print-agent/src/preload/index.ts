import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('agent', {
  ping: () => ipcRenderer.invoke('agent:ping'),
  dockerStart: () => ipcRenderer.invoke('docker:start'),
  dockerStop: () => ipcRenderer.invoke('docker:stop'),
  openAdmin: () => ipcRenderer.send('admin:open'),
  subscribeStatus: (cb: (s: unknown) => void) => {
    const sub = (_: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on('agent:status', sub);
    return () => ipcRenderer.off('agent:status', sub);
  },
});
