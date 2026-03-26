// ============================================
// ElektroHub – Preload Script (secure IPC bridge)
// ============================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Auto-Updater (removeAllListeners prevents accumulation on page reload)
  onUpdateAvailable: (cb) => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.on('update-available', (_e, info) => cb(info));
  },
  onUpdateDownloaded: (cb) => {
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.on('update-downloaded', (_e, info) => cb(info));
  },
  onUpdateError: (cb) => {
    ipcRenderer.removeAllListeners('update-error');
    ipcRenderer.on('update-error', (_e, msg) => cb(msg));
  },
  onDownloadProgress: (cb) => {
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.on('download-progress', (_e, pct) => cb(pct));
  },
  installUpdate: () => ipcRenderer.send('install-update'),

  // Native file dialogs
  saveFileDialog: (opts) => ipcRenderer.invoke('save-file-dialog', opts),
  openFileDialog: (opts) => ipcRenderer.invoke('open-file-dialog', opts),

  // Data path management
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  getDefaultDataPath: () => ipcRenderer.invoke('get-default-data-path'),
  changeDataPath: () => ipcRenderer.invoke('change-data-path'),
  resetDataPath: () => ipcRenderer.invoke('reset-data-path'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
