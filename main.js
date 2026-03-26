// ============================================
// ElektroHub – Electron Main Process
// ============================================

const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// ── Single Instance Lock (verhindert Daten-Konflikte) ───
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow;

// ── Benutzerdefinierter Datenpfad ───────────────────────
// Config-Datei liegt IMMER im Standard-Pfad (nicht im benutzerdefinierten)
const defaultUserData = app.getPath('userData');
const configPath = path.join(defaultUserData, 'path-config.json');

function readPathConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (data.customPath && fs.existsSync(data.customPath)) {
        return data.customPath;
      }
    }
  } catch (_) {}
  return null;
}

function writePathConfig(customPath) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({ customPath }, null, 2), 'utf-8');
}

// Datenpfad setzen BEVOR app ready (wichtig!)
const customDataPath = readPathConfig();
if (customDataPath) {
  app.setPath('userData', customDataPath);
}

// ── Auto-Updater Konfiguration ──────────────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater() {
  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', {
      version: String(info.version || ''),
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-downloaded', {
      version: String(info.version || ''),
    });
  });

  autoUpdater.on('error', (err) => {
    const msg = String(err?.message || err || '');
    if (!msg.includes('net::ERR') && !msg.includes('404')) {
      mainWindow?.webContents.send('update-error', msg);
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('download-progress', Math.round(progress.percent));
  });

  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error('Auto-update check failed:', err?.message);
  });
}

// ── IPC Handler ─────────────────────────────────────────
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-data-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('get-default-data-path', () => {
  return defaultUserData;
});

ipcMain.handle('change-data-path', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Datenpfad waehlen',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return null;

  const newPath = path.resolve(result.filePaths[0]);
  const oldPath = path.resolve(app.getPath('userData'));

  // Schutz: gleicher Pfad
  if (newPath === oldPath) {
    await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Datenpfad',
      message: 'Das ist bereits der aktuelle Datenpfad.',
    });
    return null;
  }

  // Schutz: Ziel ist Unterverzeichnis der Quelle (endlose Rekursion)
  if (newPath.startsWith(oldPath + path.sep)) {
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Fehler',
      message: 'Der Zielpfad darf kein Unterverzeichnis des aktuellen Datenpfads sein.',
    });
    return null;
  }

  const confirm = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Verschieben und neu starten', 'Abbrechen'],
    defaultId: 0,
    title: 'Datenpfad aendern',
    message: `Daten verschieben nach:\n${newPath}`,
    detail: 'Alle Daten (Kunden, Projekte, Rechnungen) werden in den neuen Ordner kopiert. Die App startet danach automatisch neu.',
  });

  if (confirm.response !== 0) return null;

  try {
    copyDirSync(oldPath, newPath);
  } catch (err) {
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Fehler',
      message: 'Daten konnten nicht verschoben werden.',
      detail: err.message,
    });
    return null;
  }

  writePathConfig(newPath);
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('reset-data-path', async () => {
  if (!mainWindow) return null;

  const confirm = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Zuruecksetzen und neu starten', 'Abbrechen'],
    defaultId: 0,
    title: 'Datenpfad zuruecksetzen',
    message: 'Datenpfad auf Standard zuruecksetzen?',
    detail: `Standardpfad: ${defaultUserData}\n\nDie Daten im aktuellen Pfad bleiben erhalten. Die App nutzt dann wieder den Standardpfad.`,
  });

  if (confirm.response !== 0) return null;

  try { fs.unlinkSync(configPath); } catch (_) {}
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('open-data-folder', async () => {
  const error = await shell.openPath(app.getPath('userData'));
  return error || null;
});

ipcMain.handle('save-file-dialog', async (_e, opts) => {
  if (!mainWindow) return null;
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
  if (!mainWindow) return null;
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

// ── Hilfsfunktion: Verzeichnis rekursiv kopieren ────────
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    // Symlinks ueberspringen
    if (entry.isSymbolicLink()) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

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
