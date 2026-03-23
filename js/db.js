// ============================================
// ElektroHub – IndexedDB Datenbank
// ============================================

const DB_NAME = 'ElektroHub';
const DB_VERSION = 4;

const STORES = {
  customers: 'customers',
  projects: 'projects',
  calculations: 'calculations',
  articles: 'articles',
  stockMovements: 'stockMovements',
  invoices: 'invoices',
  settings: 'settings',
  textBlocks: 'textBlocks',
  numberRanges: 'numberRanges',
  photos: 'photos',
  timeEntries: 'timeEntries',
  inspections: 'inspections',
  auditLog: 'auditLog',
};

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Kunden
        if (!db.objectStoreNames.contains(STORES.customers)) {
          const store = db.createObjectStore(STORES.customers, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }

        // Projekte
        if (!db.objectStoreNames.contains(STORES.projects)) {
          const store = db.createObjectStore(STORES.projects, { keyPath: 'id' });
          store.createIndex('customerId', 'customerId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Kalkulationen
        if (!db.objectStoreNames.contains(STORES.calculations)) {
          const store = db.createObjectStore(STORES.calculations, { keyPath: 'id' });
          store.createIndex('projectId', 'projectId', { unique: false });
        }

        // Artikel
        if (!db.objectStoreNames.contains(STORES.articles)) {
          const store = db.createObjectStore(STORES.articles, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('ean', 'ean', { unique: false });
          store.createIndex('supplier', 'supplier', { unique: false });
        }

        // Lagerbewegungen
        if (!db.objectStoreNames.contains(STORES.stockMovements)) {
          const store = db.createObjectStore(STORES.stockMovements, { keyPath: 'id' });
          store.createIndex('articleId', 'articleId', { unique: false });
          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }

        // Belege (alle Dokumenttypen)
        if (!db.objectStoreNames.contains(STORES.invoices)) {
          const store = db.createObjectStore(STORES.invoices, { keyPath: 'id' });
          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('number', 'number', { unique: true });
        }

        // Einstellungen
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: 'key' });
        }

        // Textbausteine (benutzerdefinierte)
        if (!db.objectStoreNames.contains(STORES.textBlocks)) {
          const store = db.createObjectStore(STORES.textBlocks, { keyPath: 'id' });
          store.createIndex('code', 'code', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }

        // Nummernkreise (Zähler pro Typ und Jahr)
        if (!db.objectStoreNames.contains(STORES.numberRanges)) {
          db.createObjectStore(STORES.numberRanges, { keyPath: 'id' });
        }

        // Fotos (Kunden-/Projekt-Bilder)
        if (!db.objectStoreNames.contains(STORES.photos)) {
          const store = db.createObjectStore(STORES.photos, { keyPath: 'id' });
          store.createIndex('parentId', 'parentId', { unique: false });
          store.createIndex('parentType', 'parentType', { unique: false });
        }

        // Zeiterfassung
        if (!db.objectStoreNames.contains(STORES.timeEntries)) {
          const store = db.createObjectStore(STORES.timeEntries, { keyPath: 'id' });
          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('employee', 'employee', { unique: false });
        }

        // E-Check / DGUV V3 Prüfprotokolle
        if (!db.objectStoreNames.contains(STORES.inspections)) {
          const store = db.createObjectStore(STORES.inspections, { keyPath: 'id' });
          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('customerId', 'customerId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('nextDue', 'nextDue', { unique: false });
        }

        // Audit-Log (GoBD-Änderungsprotokoll)
        if (!db.objectStoreNames.contains(STORES.auditLog)) {
          const store = db.createObjectStore(STORES.auditLog, { keyPath: 'id' });
          store.createIndex('entityType', 'entityType', { unique: false });
          store.createIndex('entityId', 'entityId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => reject(e.target.error);
    });
  }

  // --- Generic CRUD ---

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Export / Import ---

  async exportAll() {
    const data = {};
    for (const name of Object.values(STORES)) {
      data[name] = await this.getAll(name);
    }
    return data;
  }

  async importAll(data) {
    // numberRanges und auditLog nicht importieren (wuerden Zaehler/Protokoll ueberschreiben)
    const skipStores = [STORES.numberRanges, STORES.auditLog];
    for (const [storeName, records] of Object.entries(data)) {
      if (!Object.values(STORES).includes(storeName)) continue;
      if (skipStores.includes(storeName)) continue;
      for (const record of records) {
        await this.put(storeName, record);
      }
    }
  }

  // --- Settings ---

  async getSetting(key, defaultValue = null) {
    const result = await this.get(STORES.settings, key);
    return result ? result.value : defaultValue;
  }

  async setSetting(key, value) {
    return this.put(STORES.settings, { key, value });
  }

  // --- Number Ranges (GoBD-konform) ---

  async getNextNumber(docType) {
    const year = new Date().getFullYear();
    const rangeId = `${docType}_${year}`;
    let range = await this.get(STORES.numberRanges, rangeId);

    // Get configurable prefix
    const customPrefix = await this.getSetting(`numPrefix_${docType}`, null);
    const defaultPrefixes = {
      angebot: 'AG', auftragsbestaetigung: 'AB', rechnung: 'RE',
      abschlagsrechnung: 'AR', schlussrechnung: 'SR', stornorechnung: 'ST',
      gutschrift: 'GS', lieferschein: 'LS', kostenvoranschlag: 'KV',
      abnahmeprotokoll: 'AP', mahnung1: 'MA', mahnung2: 'MA', mahnung3: 'MA',
      invoice_en: 'INV',
    };
    const prefix = customPrefix || defaultPrefixes[docType] || 'DOC';

    if (!range) {
      range = { id: rangeId, docType, year, counter: 0 };
    }
    range.counter += 1;
    await this.put(STORES.numberRanges, range);

    return `${prefix}-${year}-${String(range.counter).padStart(4, '0')}`;
  }
}

const db = new Database();
