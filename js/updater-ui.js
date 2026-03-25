// ============================================
// ElektroHub – Auto-Update UI (Electron only)
// ============================================

(function () {
  if (!window.electronAPI) return; // Nur in Electron aktiv

  const BANNER_ID = 'update-banner';

  function createBanner(html) {
    let banner = document.getElementById(BANNER_ID);
    if (!banner) {
      banner = document.createElement('div');
      banner.id = BANNER_ID;
      document.body.prepend(banner);
    }
    banner.innerHTML = html;
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
      background: linear-gradient(135deg, #2563eb, #1e40af);
      color: white; padding: 10px 20px; text-align: center;
      font-family: 'DM Sans', sans-serif; font-size: 14px;
      display: flex; align-items: center; justify-content: center; gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    return banner;
  }

  function removeBanner() {
    const banner = document.getElementById(BANNER_ID);
    if (banner) banner.remove();
  }

  // Update verfuegbar → Download laeuft automatisch
  window.electronAPI.onUpdateAvailable((info) => {
    createBanner(`
      <span>Neue Version <strong>v${info.version}</strong> wird heruntergeladen...</span>
      <span id="update-progress" style="opacity:0.8">0%</span>
    `);
  });

  // Download-Fortschritt
  window.electronAPI.onDownloadProgress((pct) => {
    const el = document.getElementById('update-progress');
    if (el) el.textContent = pct + '%';
  });

  // Download fertig → Installieren-Button anzeigen
  window.electronAPI.onUpdateDownloaded((info) => {
    const banner = createBanner(`
      <span>Version <strong>v${info.version}</strong> ist bereit!</span>
      <button id="btn-install-update" style="
        background: white; color: #1e40af; border: none; padding: 6px 16px;
        border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px;
      ">Jetzt installieren</button>
      <button id="btn-dismiss-update" style="
        background: transparent; color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.4);
        padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px;
      ">Spaeter</button>
    `);

    document.getElementById('btn-install-update').addEventListener('click', () => {
      window.electronAPI.installUpdate();
    });

    document.getElementById('btn-dismiss-update').addEventListener('click', () => {
      removeBanner();
    });
  });

  // Version in App-Info anzeigen
  window.electronAPI.getAppVersion().then((version) => {
    window._electronAppVersion = version;
  });
})();
