// ============================================
// ElektroHub – Electron Main Process
// ============================================

const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;

// ── Auto-Updater Konfiguration ──────────────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater() {
  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-downloaded', {
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    // Kein Fehler anzeigen wenn einfach kein Internet oder kein Repo
    const msg = err?.message || '';
    if (!msg.includes('net::ERR') && !msg.includes('404')) {
      mainWindow?.webContents.send('update-error', msg);
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('download-progress', Math.round(progress.percent));
  });

  // Beim Start nach Updates suchen
  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
}

// ── IPC Handler ─────────────────────────────────────────
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('save-file-dialog', async (_e, opts) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: opts?.title || 'Datei speichern',
    defaultPath: opts?.defaultPath || 'export.json',
    filters: opts?.filters || [
      { name: 'JSON', extensions: ['json'] },
      { name: 'Alle Dateien', extensions: ['*'] },
    ],
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('open-file-dialog', async (_e, opts) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: opts?.title || 'Datei oeffnen',
    filters: opts?.filters || [
      { name: 'JSON', extensions: ['json'] },
      { name: 'Alle Dateien', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ── Fenster erstellen ───────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'ElektroHub',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  mainWindow.loadFile('index.html');

  // Fenster erst zeigen wenn geladen (kein weisser Blitz)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    setupAutoUpdater();
  });

  // Menue
  const menu = Menu.buildFromTemplate([
    {
      label: 'Datei',
      submenu: [
        { label: 'Neu laden', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { type: 'separator' },
        { label: 'Beenden', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ]
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo', label: 'Rueckgaengig' },
        { role: 'redo', label: 'Wiederholen' },
        { type: 'separator' },
        { role: 'cut', label: 'Ausschneiden' },
        { role: 'copy', label: 'Kopieren' },
        { role: 'paste', label: 'Einfuegen' },
        { role: 'selectAll', label: 'Alles auswaehlen' },
      ]
    },
    {
      label: 'Ansicht',
      submenu: [
        { label: 'Vergroessern', accelerator: 'CmdOrCtrl+Plus', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
        { label: 'Verkleinern', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5) },
        { label: 'Zuruecksetzen', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.setZoomLevel(0) },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Vollbild' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Entwicklertools' },
      ]
    },
  ]);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
