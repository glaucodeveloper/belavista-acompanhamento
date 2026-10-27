const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aliancaDesktop', {
  runtime: () => ipcRenderer.invoke('desktop:runtime'),
  switchEnvironment: mode => ipcRenderer.invoke('desktop:switchEnvironment', mode),
  openExternal: url => ipcRenderer.invoke('desktop:openExternal', url),
  goAdmin: () => ipcRenderer.invoke('desktop:goAdmin'),
});
