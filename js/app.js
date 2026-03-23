// ============================================
// ElektroHub – Main Application
// ============================================

const app = {
  currentView: 'dashboard',
  currentDetailId: null,

  async init() {
    await db.init();
    await loadMwstRate();
    await this.updateModuleVisibility();
    // Auto-Save Status
    const asEl = document.getElementById('autosave-status');
    if (asEl) asEl.innerHTML = AutoSave.getStatusHtml();
    // Version anzeigen
    const vEl = document.getElementById('app-version');
    if (vEl) vEl.textContent = `v${APP_VERSION}`;
    this.bindNavigation();
    this.bindModal();
    this.bindExportImport();
    this.navigate('dashboard');

    // Onboarding beim ersten Start
    if (await Onboarding.shouldShow()) {
      setTimeout(() => Onboarding.start(), 300);
    }
  },

  async updateModuleVisibility() {
    const lagerEnabled = await db.getSetting('lagerEnabled', false);
    const navInv = document.getElementById('nav-inventory');
    if (navInv) navInv.style.display = lagerEnabled ? '' : 'none';
  },

  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.navigate(item.dataset.view);
      });
    });
  },

  bindModal() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  },

  bindExportImport() {
    document.getElementById('btn-export').addEventListener('click', () => this.exportData());
    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', (e) => this.importData(e));
  },

  async navigate(view, detailId = null) {
    this.currentView = view;
    this.currentDetailId = detailId;

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === view);
    });

    await this.renderView();
  },

  async renderView() {
    const content = document.getElementById('content');
    content.innerHTML = '<div class="text-center text-muted" style="padding:60px;">Laden...</div>';

    try {
      let html = '';
      switch (this.currentView) {
        case 'dashboard':
          html = await DashboardView.render();
          break;
        case 'projects':
          html = await ProjectsView.render(this.currentDetailId);
          break;
        case 'customers':
          html = await CustomersView.render(this.currentDetailId);
          break;
        case 'inventory':
          html = await InventoryView.render(this.currentDetailId);
          break;
        case 'invoices':
          html = await InvoicesView.render(this.currentDetailId);
          break;
        case 'statistics':
          html = await StatisticsView.render();
          break;
        case 'qrforge':
          html = await QRForgeView.render();
          break;
        case 'guide':
          html = await GuideView.render();
          break;
        case 'appinfo':
          html = await AppInfoView.render();
          break;
        case 'inspections':
          html = await InspectionsView.render(this.currentDetailId);
          break;
        case 'timetracking':
          html = await TimeTrackingView.render();
          break;
        case 'settings':
          html = await SettingsView.render();
          break;
        default:
          html = '<p>View nicht gefunden.</p>';
      }
      content.innerHTML = html;

      // Post-render hooks
      if (this.currentView === 'statistics') {
        StatisticsView.init();
      }
      if (this.currentView === 'timetracking' && TimeTrackingView.init) {
        TimeTrackingView.init();
      }
      if (this.currentView === 'inspections' && InspectionsView.init) {
        InspectionsView.init();
      }
      if (this.currentView === 'settings') {
        SettingsView.init();
      }
    } catch (err) {
      console.error('Render error:', err);
      content.innerHTML = `<div class="card"><h3 style="color:var(--danger)">Fehler</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
  },

  async refresh() {
    await this.renderView();
  },

  async exportData() {
    try {
      const data = await db.exportAll();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `elektrohub-backup-${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await db.setSetting('lastBackupDate', new Date().toISOString());
      showToast('Backup exportiert');
    } catch (err) {
      showToast('Export fehlgeschlagen: ' + err.message, 'error');
    }
  },

  async importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!confirm(`Daten importieren? Dies fügt ${Object.values(data).reduce((s,a) => s + a.length, 0)} Datensätze hinzu.`)) return;
      await db.importAll(data);
      showToast('Daten importiert');
      this.navigate('dashboard');
    } catch (err) {
      showToast('Import fehlgeschlagen: ' + err.message, 'error');
    }

    // Reset file input
    event.target.value = '';
  }
};

// Start
document.addEventListener('DOMContentLoaded', () => app.init());
