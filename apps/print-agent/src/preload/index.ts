import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('agent', {
  ping: () => ipcRenderer.invoke('agent:ping'),
  subscribeStatus: (cb: (s: unknown) => void) => {
    const sub = (_: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on('agent:status', sub);
    return () => ipcRenderer.off('agent:status', sub);
  },
});
