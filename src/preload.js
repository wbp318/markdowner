const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('markdowner', {
  openDialog: () => ipcRenderer.invoke('open-dialog'),
  openPath: (p) => ipcRenderer.invoke('open-path', p),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  saveHtml: (payload) => ipcRenderer.invoke('save-html', payload),
  pathForFile: (file) => webUtils.getPathForFile(file),
  onFileOpened: (cb) => ipcRenderer.on('file-opened', (_e, data) => cb(data)),
  onToggleTheme: (cb) => ipcRenderer.on('toggle-theme', () => cb()),
  onRequestExport: (cb) => ipcRenderer.on('request-export', () => cb())
});
