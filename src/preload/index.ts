import { contextBridge, ipcRenderer } from 'electron';
import type { SpycamApi } from '../renderer/src/spycam';

const api: SpycamApi = {
  send: (msg) => ipcRenderer.send(msg),
  on: (msg, fn) => {
    const listener = () => fn();
    ipcRenderer.on(msg, listener);
    return () => ipcRenderer.removeListener(msg, listener);
  },
};

contextBridge.exposeInMainWorld('spycam', api);
