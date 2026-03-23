// ============================================
// ElektroHub – Auto-Save in lokale JSON-Datei
// Nutzt die File System Access API (Chrome/Edge)
// ============================================

const AutoSave = {
  _fileHandle: null,
  _enabled: false,
  _saving: false,
  _lastSave: null,

  // Prüfe ob der Browser es unterstützt
  isSupported() {
    return typeof window.showSaveFilePicker === 'function';
  },

  // Status-Anzeige für die Sidebar
  getStatusHtml() {
    if (!this.isSupported()) return '';
    if (!this._enabled) {
      return `<button class="sidebar-help-btn" onclick="AutoSave.setup()" style="font-size:0.78rem;padding:6px 12px;color:var(--gray-400);">💾 Auto-Save einrichten</button>`;
    }
    return `<div style="padding:6px 12px;font-size:0.72rem;color:var(--success);display:flex;align-items:center;gap:6px;">
      <span style="width:8px;height:8px;background:var(--success);border-radius:50%;display:inline-block;"></span>
      Auto-Save aktiv
    </div>`;
  },

  // Einrichten: Datei-Speicherort wählen
  async setup() {
    if (!this.isSupported()) {
      showToast('Dein Browser unterstützt Auto-Save nicht. Bitte nutze Chrome oder Edge.', 'error');
      return;
    }

    try {
      // Datei-Speicherort wählen
      this._fileHandle = await window.showSaveFilePicker({
        suggestedName: 'elektrohub-daten.json',
        types: [{
          description: 'ElektroHub Daten',
          accept: { 'application/json': ['.json'] },
        }],
      });

      this._enabled = true;

      // Sofort einmal speichern
      await this.save();

      showToast('Auto-Save eingerichtet! Daten werden automatisch gespeichert.');
      this._updateSidebarStatus();

    } catch (err) {
      if (err.name !== 'AbortError') {
        showToast('Fehler: ' + err.message, 'error');
      }
    }
  },

  // Daten in die Datei schreiben
  async save() {
    if (!this._enabled || !this._fileHandle || this._saving) return;
    this._saving = true;

    try {
      // Berechtigung prüfen/anfordern
      const perm = await this._fileHandle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        const req = await this._fileHandle.requestPermission({ mode: 'readwrite' });
        if (req !== 'granted') {
          this._enabled = false;
          this._updateSidebarStatus();
          return;
        }
      }

      // Alle Daten exportieren
      const data = await db.exportAll();
      const json = JSON.stringify(data, null, 2);

      // In Datei schreiben
      const writable = await this._fileHandle.createWritable();
      await writable.write(json);
      await writable.close();

      this._lastSave = new Date();

    } catch (err) {
      console.warn('Auto-Save fehlgeschlagen:', err.message);
      // Bei Berechtigungsfehler deaktivieren
      if (err.name === 'NotAllowedError') {
        this._enabled = false;
        this._updateSidebarStatus();
      }
    } finally {
      this._saving = false;
    }
  },

  // Aus lokaler Datei laden
  async loadFromFile() {
    if (!this.isSupported()) {
      showToast('Dein Browser unterstützt das nicht. Bitte nutze Chrome oder Edge.', 'error');
      return;
    }

    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'ElektroHub Daten',
          accept: { 'application/json': ['.json'] },
        }],
      });

      const file = await handle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);

      const count = Object.values(data).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);
      if (!confirm(`${count} Datensätze aus "${file.name}" laden?\n\nBestehende Daten werden ergänzt/überschrieben.`)) return;

      await db.importAll(data);

      // Diese Datei auch als Auto-Save Ziel verwenden
      this._fileHandle = handle;
      this._enabled = true;
      this._updateSidebarStatus();

      showToast(`${count} Datensätze geladen. Auto-Save für diese Datei aktiviert.`);
      app.navigate('dashboard');

    } catch (err) {
      if (err.name !== 'AbortError') {
        showToast('Fehler: ' + err.message, 'error');
      }
    }
  },

  // Auto-Save deaktivieren
  disable() {
    this._enabled = false;
    this._fileHandle = null;
    this._updateSidebarStatus();
    showToast('Auto-Save deaktiviert');
  },

  _updateSidebarStatus() {
    const el = document.getElementById('autosave-status');
    if (el) el.innerHTML = this.getStatusHtml();
  }
};

// ===== Database-Operationen abfangen für Auto-Save =====
// Überschreibe db.put und db.delete um nach jeder Änderung Auto-Save auszulösen

const _originalDbPut = Database.prototype.put;
Database.prototype.put = async function(storeName, data) {
  const result = await _originalDbPut.call(this, storeName, data);
  // Auto-Save nach kurzer Verzögerung (sammelt mehrere Änderungen)
  clearTimeout(AutoSave._debounceTimer);
  AutoSave._debounceTimer = setTimeout(() => AutoSave.save(), 1000);
  return result;
};

const _originalDbDelete = Database.prototype.delete;
Database.prototype.delete = async function(storeName, id) {
  const result = await _originalDbDelete.call(this, storeName, id);
  clearTimeout(AutoSave._debounceTimer);
  AutoSave._debounceTimer = setTimeout(() => AutoSave.save(), 1000);
  return result;
};
