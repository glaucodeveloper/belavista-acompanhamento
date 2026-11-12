const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('atlasFiles', {
  saveProgressPdf: (filename, bytes) => ipcRenderer.invoke('save-progress-pdf', { filename, bytes }),
  saveReportCsv: (filename, bytes) => ipcRenderer.invoke('save-report-csv', { filename, bytes }),
});
contextBridge.exposeInMainWorld('atlasCredential', {
  save: value => ipcRenderer.invoke('credential-save', value),
  read: () => ipcRenderer.invoke('credential-read'),
  clear: () => ipcRenderer.invoke('credential-clear'),
});
