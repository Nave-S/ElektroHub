// ============================================
// ElektroHub – Preload Script (secure IPC bridge)
// ============================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Auto-Updater
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_e, info) => cb(info)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_e, info) => cb(info)),
  onUpdateError: (cb) => ipcRenderer.on('update-error', (_e, msg) => cb(msg)),
  onDownloadProgress: (cb) => ipcRenderer.on('download-progress', (_e, pct) => cb(pct)),
  installUpdate: () => ipcRenderer.send('install-update'),

  // Native file dialogs
  saveFileDialog: (opts) => ipcRenderer.invoke('save-file-dialog', opts),
  openFileDialog: (opts) => ipcRenderer.invoke('open-file-dialog', opts),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
