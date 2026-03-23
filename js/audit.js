// ============================================
// ElektroHub – GoBD-konformes Audit-Trail
// Protokolliert alle Datenänderungen automatisch
// ============================================

const AuditLog = {
  // Stores die NICHT geloggt werden (Settings + AuditLog selbst)
  _skipStores: [STORES.settings, STORES.auditLog, STORES.numberRanges],

  /**
   * Berechnet die Differenz zwischen altem und neuem Objekt.
   * Gibt nur geänderte Felder zurück: { field: { old, new } }
   */
  _diff(oldData, newData) {
    const changes = {};
    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);

    for (const key of allKeys) {
      const oldVal = oldData ? oldData[key] : undefined;
      const newVal = newData ? newData[key] : undefined;

      // Tiefenvergleich per JSON
      const oldJson = JSON.stringify(oldVal);
      const newJson = JSON.stringify(newVal);

      if (oldJson !== newJson) {
        changes[key] = { old: oldVal, new: newVal };
      }
    }
    return changes;
  },

  /**
   * Schreibt einen Audit-Eintrag direkt in die DB (ohne Interceptor).
   */
  async _writeEntry(entry) {
    return new Promise((resolve, reject) => {
      const tx = db.db.transaction(STORES.auditLog, 'readwrite');
      const store = tx.objectStore(STORES.auditLog);
      const request = store.put(entry);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Liest einen Datensatz direkt aus der DB (ohne Interceptor).
   */
  async _readDirect(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = db.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Erstellt einen Log-Eintrag für eine PUT-Operation.
   */
  async logPut(storeName, data) {
    if (this._skipStores.includes(storeName)) return;
    if (!db.db) return;

    try {
      const entityId = data.id || data.key;
      if (!entityId) return;

      // Bestehenden Datensatz lesen um Create vs Update zu unterscheiden
      let existing = null;
      try {
        existing = await this._readDirect(storeName, entityId);
      } catch (e) {
        // Store existiert evtl. noch nicht
      }

      const entry = {
        id: generateId(),
        entityType: storeName,
        entityId: String(entityId),
        timestamp: new Date().toISOString(),
      };

      if (existing) {
        // Update: Nur geänderte Felder speichern
        entry.action = 'update';
        entry.changes = this._diff(existing, data);

        // Keine echte Änderung? Nicht loggen.
        if (Object.keys(entry.changes).length === 0) return;
      } else {
        // Create: Vollständigen Snapshot speichern
        entry.action = 'create';
        entry.snapshot = JSON.parse(JSON.stringify(data));
      }

      await this._writeEntry(entry);
    } catch (err) {
      console.warn('AuditLog: Fehler beim Protokollieren (put):', err.message);
    }
  },

  /**
   * Erstellt einen Log-Eintrag für eine DELETE-Operation.
   */
  async logDelete(storeName, id) {
    if (this._skipStores.includes(storeName)) return;
    if (!db.db) return;

    try {
      // Bestehenden Datensatz lesen für Snapshot
      let existing = null;
      try {
        existing = await this._readDirect(storeName, id);
      } catch (e) {
        // Ignorieren
      }

      const entry = {
        id: generateId(),
        entityType: storeName,
        entityId: String(id),
        action: 'delete',
        timestamp: new Date().toISOString(),
      };

      // Snapshot des gelöschten Datensatzes
      if (existing) {
        entry.snapshot = JSON.parse(JSON.stringify(existing));
      }

      await this._writeEntry(entry);
    } catch (err) {
      console.warn('AuditLog: Fehler beim Protokollieren (delete):', err.message);
    }
  },

  /**
   * Gibt die Änderungshistorie für einen bestimmten Datensatz zurück.
   */
  async getHistory(entityType, entityId) {
    if (!db.db) return [];

    try {
      const all = await db.getByIndex(STORES.auditLog, 'entityId', String(entityId));
      return all
        .filter(e => e.entityType === entityType)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (err) {
      console.warn('AuditLog: Fehler beim Lesen der Historie:', err.message);
      return [];
    }
  },

  /**
   * Gibt die N letzten Änderungen zurück.
   */
  async getRecent(limit = 50) {
    if (!db.db) return [];

    try {
      const all = await db.getAll(STORES.auditLog);
      return all
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (err) {
      console.warn('AuditLog: Fehler beim Lesen der letzten Änderungen:', err.message);
      return [];
    }
  }
};


// ===== Database-Operationen abfangen für Audit-Log =====
// Kettet sich an die bestehende AutoSave-Überschreibung an.

const _auditPrevPut = Database.prototype.put;
Database.prototype.put = async function(storeName, data) {
  // Audit-Log VOR dem Schreiben erfassen (braucht alten Zustand)
  await AuditLog.logPut(storeName, data);
  // Weiterleitung an vorherige Implementierung (AutoSave-Chain)
  return _auditPrevPut.call(this, storeName, data);
};

const _auditPrevDelete = Database.prototype.delete;
Database.prototype.delete = async function(storeName, id) {
  // Audit-Log VOR dem Löschen erfassen (braucht Snapshot)
  await AuditLog.logDelete(storeName, id);
  // Weiterleitung an vorherige Implementierung (AutoSave-Chain)
  return _auditPrevDelete.call(this, storeName, id);
};
