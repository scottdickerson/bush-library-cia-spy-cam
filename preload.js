const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('spycam', {
  send: (msg) => ipcRenderer.send(msg),
  on: (msg, fn) => ipcRenderer.on(msg, () => fn()),
});
