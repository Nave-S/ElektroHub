// ============================================
// ElektroHub – Globale Suche mit Synonymen
// ============================================

const GlobalSearch = {
  _open: false,
  _debounce: null,

  // Synonyme und Umschreibungen: Suchbegriff → was gemeint sein könnte
  _synonyms: {
    // Kunden
    'kunde': ['customers', 'Kunden', 'Kundenverwaltung', 'Kontakte', 'Auftraggeber'],
    'kontakt': ['customers', 'Kunden'],
    'adresse': ['customers', 'Kunden', 'Anschrift'],
    'telefon': ['customers', 'Kunden', 'Kontaktdaten'],
    'auftraggeber': ['customers', 'Kunden'],

    // Projekte
    'projekt': ['projects', 'Projekte', 'Auftrag', 'Baustelle'],
    'baustelle': ['projects', 'Projekte', 'Bauvorhaben'],
    'auftrag': ['projects', 'Projekte', 'Auftragsbestätigung'],

    // Belege
    'rechnung': ['invoices', 'Belege', 'Rechnung erstellen', 'Faktura'],
    'angebot': ['invoices', 'Belege', 'Angebot erstellen', 'Offerte'],
    'beleg': ['invoices', 'Belege', 'Dokumente'],
    'mahnung': ['invoices', 'Belege', 'Zahlungserinnerung', 'überfällig'],
    'storno': ['invoices', 'Belege', 'Stornorechnung', 'Korrektur'],
    'gutschrift': ['invoices', 'Belege', 'Rückerstattung'],
    'kostenvoranschlag': ['invoices', 'Belege', 'KV', 'Schätzung'],
    'abnahme': ['invoices', 'Belege', 'Abnahmeprotokoll'],
    'abschlag': ['invoices', 'Belege', 'Abschlagsrechnung', 'Teilrechnung'],
    'schlussrechnung': ['invoices', 'Belege', 'Endrechnung', 'Endabrechnung'],

    // Kalkulation
    'kalkulation': ['projects', 'Projekte', 'Kalkulation', 'Kostenberechnung', 'kalkulieren'],
    'preis': ['projects', 'Kalkulation', 'Preisberechnung'],
    'kosten': ['projects', 'Kalkulation', 'Kostenvoranschlag'],

    // Geld
    'skonto': ['settings', 'Einstellungen', 'Rabatt bei schneller Zahlung'],
    'rabatt': ['settings', 'Einstellungen', 'Skonto', 'Nachlass', 'Preisnachlass'],
    'mwst': ['settings', 'Einstellungen', 'Mehrwertsteuer', 'Umsatzsteuer', '19%', '7%'],
    'steuer': ['settings', 'Einstellungen', 'MwSt', 'Umsatzsteuer', 'Steuernummer'],
    'kleinunternehmer': ['settings', 'Einstellungen', '§19 UStG', 'keine MwSt'],
    'zahlung': ['invoices', 'Belege', 'Zahlungsziel', 'bezahlt', 'offen'],

    // Zeit
    'zeit': ['timetracking', 'Zeiterfassung', 'Stunden', 'Arbeitszeit'],
    'stunden': ['timetracking', 'Zeiterfassung', 'Arbeitszeit erfassen'],
    'timer': ['timetracking', 'Zeiterfassung', 'Stoppuhr'],

    // Prüfung
    'prüfung': ['inspections', 'Prüfprotokolle', 'E-Check', 'DGUV V3'],
    'echeck': ['inspections', 'Prüfprotokolle', 'E-Check', 'Elektroprüfung'],
    'dguv': ['inspections', 'Prüfprotokolle', 'DGUV V3', 'Betriebsmittelprüfung'],

    // Statistik
    'statistik': ['statistics', 'Statistiken', 'Auswertung', 'Umsatz'],
    'umsatz': ['statistics', 'Statistiken', 'Einnahmen', 'Gewinn'],
    'auswertung': ['statistics', 'Statistiken', 'Analyse', 'Übersicht'],
    'diagramm': ['statistics', 'Statistiken', 'Chart', 'Tortendiagramm'],

    // Einstellungen
    'einstellung': ['settings', 'Einstellungen', 'Konfiguration'],
    'firma': ['settings', 'Einstellungen', 'Firmendaten', 'Betriebsdaten'],
    'bank': ['settings', 'Einstellungen', 'IBAN', 'Bankverbindung'],
    'iban': ['settings', 'Einstellungen', 'Bankverbindung', 'Konto'],
    'logo': ['settings', 'Einstellungen', 'Firmenlogo hochladen'],
    'agb': ['settings', 'Einstellungen', 'AGB hochladen', 'Geschäftsbedingungen'],
    'backup': ['settings', 'Einstellungen', 'Datensicherung', 'Export'],
    'stundensatz': ['settings', 'Einstellungen', 'Kalkulationseinstellungen', 'Meister', 'Geselle'],
    'vorlage': ['settings', 'Einstellungen', 'Dokumentvorlagen', 'Textbausteine'],
    'textbaustein': ['settings', 'Einstellungen', 'Textbausteine', 'Leistungsbeschreibung'],
    'nummernkreis': ['settings', 'Einstellungen', 'Dokumentnummern', 'Präfix'],

    // Sonstiges
    'pdf': ['invoices', 'Belege', 'PDF exportieren', 'drucken'],
    'drucken': ['invoices', 'Belege', 'PDF exportieren'],
    'email': ['invoices', 'Belege', 'E-Mail-Text kopieren'],
    'qr': ['qrforge', 'QR Forge', 'QR-Code erstellen'],
    'hilfe': ['guide', 'Anleitung', 'Hilfe', 'Bedienung'],
    'anleitung': ['guide', 'Anleitung', 'Hilfe'],
    'foto': ['customers', 'Kunden', 'Foto importieren', 'OCR', 'Screenshot'],
    'import': ['settings', 'Einstellungen', 'Daten importieren', 'Backup einspielen'],
    'export': ['settings', 'Einstellungen', 'Daten exportieren', 'Backup'],
    'datev': ['settings', 'Einstellungen', 'DATEV-Export', 'Steuerberater'],
    'demo': ['settings', 'Einstellungen', 'Demo-Daten', 'Beispieldaten'],
    'lager': ['inventory', 'Lager', 'Artikel', 'Bestand', 'Material'],
    'dashboard': ['dashboard', 'Dashboard', 'Startseite', 'Übersicht'],
  },

  // Navigations-Ziele
  _pages: [
    { view: 'dashboard', icon: '🏠', label: 'Dashboard', desc: 'Startseite mit Übersicht und Aufgaben', keywords: 'start übersicht home aufgaben hinweise' },
    { view: 'customers', icon: '👥', label: 'Kunden', desc: 'Kundenverwaltung – anlegen, bearbeiten, suchen', keywords: 'kunde kontakt adresse telefon email anlegen neu' },
    { view: 'projects', icon: '📋', label: 'Projekte', desc: 'Projekte mit Kalkulationen und Status', keywords: 'projekt baustelle auftrag kalkulation status' },
    { view: 'invoices', icon: '📄', label: 'Belege', desc: 'Angebote, Rechnungen, Mahnungen, alle Dokumenttypen', keywords: 'rechnung angebot beleg mahnung storno gutschrift kostenvoranschlag abschlag schlussrechnung' },
    { view: 'timetracking', icon: '⏱️', label: 'Zeiterfassung', desc: 'Arbeitszeiten pro Projekt und Mitarbeiter', keywords: 'zeit stunden timer arbeitszeit mitarbeiter' },
    { view: 'inspections', icon: '🔌', label: 'Prüfprotokolle', desc: 'E-Check und DGUV V3 Prüfungen', keywords: 'prüfung echeck dguv protokoll messung' },
    { view: 'statistics', icon: '📊', label: 'Statistiken', desc: 'Umsatz, Diagramme, Auswertungen', keywords: 'statistik umsatz diagramm auswertung jahresübersicht torte' },
    { view: 'qrforge', icon: '⬡', label: 'QR Forge', desc: 'QR-Codes für URLs, WLAN, Kontakte erstellen', keywords: 'qr code qrcode erstellen generator' },
    { view: 'settings', icon: '⚙️', label: 'Einstellungen', desc: 'Firmendaten, Steuern, Vorlagen, Backup', keywords: 'einstellung firma bank logo agb backup datev vorlage textbaustein skonto mwst kleinunternehmer stundensatz' },
    { view: 'guide', icon: '❓', label: 'Anleitung', desc: 'Schritt-für-Schritt Hilfe', keywords: 'hilfe anleitung erklärung wie funktioniert' },
    { view: 'appinfo', icon: 'ℹ️', label: 'Über ElektroHub', desc: 'Version, Impressum, Rechtliches', keywords: 'über info version impressum datenschutz' },
  ],

  // Aktionen
  _actions: [
    { action: () => app.navigate('customers'), icon: '➕', label: 'Neuen Kunden anlegen', desc: 'Kunden → + Neuer Kunde', keywords: 'kunde anlegen neu erstellen kontakt hinzufügen' },
    { action: () => app.navigate('projects'), icon: '➕', label: 'Neues Projekt anlegen', desc: 'Projekte → + Neues Projekt', keywords: 'projekt anlegen neu erstellen auftrag baustelle' },
    { action: () => app.navigate('invoices'), icon: '➕', label: 'Neuen Beleg erstellen', desc: 'Belege → + Neuer Beleg', keywords: 'rechnung angebot beleg erstellen neu schreiben' },
    { action: () => { if(typeof OCRImport!=='undefined') OCRImport.show('auto'); }, icon: '📷', label: 'Aus Foto importieren', desc: 'Kunden, Projekte oder Belege per Foto einlesen', keywords: 'foto screenshot import ocr kamera bild einlesen' },
    { action: () => app.exportData(), icon: '💾', label: 'Backup erstellen', desc: 'Alle Daten als JSON-Datei sichern', keywords: 'backup sichern export speichern datensicherung' },
    { action: () => openGuideWindow(), icon: '❓', label: 'Anleitung öffnen', desc: 'Hilfe in separatem Fenster', keywords: 'hilfe anleitung fenster erklärung' },
    { action: () => { if(typeof DATEVExport!=='undefined') DATEVExport.showExportDialog(); }, icon: '📊', label: 'DATEV-Export', desc: 'Buchungsdaten für den Steuerberater', keywords: 'datev export steuerberater buchhaltung' },
  ],

  open() {
    this._open = true;
    const el = document.getElementById('global-search-results');
    if (el) el.style.display = 'block';
    // Schließen bei Klick außerhalb
    setTimeout(() => {
      document.addEventListener('click', GlobalSearch._closeHandler);
    }, 100);
  },

  _closeHandler(e) {
    if (!e.target.closest('#global-search') && !e.target.closest('#global-search-results')) {
      GlobalSearch.close();
    }
  },

  close() {
    this._open = false;
    const el = document.getElementById('global-search-results');
    if (el) el.style.display = 'none';
    document.removeEventListener('click', GlobalSearch._closeHandler);
  },

  search(query) {
    clearTimeout(this._debounce);
    this._debounce = setTimeout(() => this._doSearch(query), 150);
  },

  _doSearch(query) {
    const el = document.getElementById('global-search-results');
    if (!el) return;

    query = (query || '').trim().toLowerCase();
    if (!query) {
      el.innerHTML = '<div class="gs-hint">Tippe um zu suchen – z.B. „Rechnung", „Stundensatz", „neuer Kunde"</div>';
      el.style.display = this._open ? 'block' : 'none';
      return;
    }
    el.style.display = 'block';

    const results = [];
    const words = query.split(/\s+/);

    // 1. Seiten durchsuchen
    this._pages.forEach(page => {
      const score = this._matchScore(words, `${page.label} ${page.desc} ${page.keywords}`);
      if (score > 0) {
        results.push({ type: 'page', score, ...page });
      }
    });

    // 2. Aktionen durchsuchen
    this._actions.forEach(act => {
      const score = this._matchScore(words, `${act.label} ${act.desc} ${act.keywords}`);
      if (score > 0) {
        results.push({ type: 'action', score, ...act });
      }
    });

    // 3. Synonyme durchsuchen
    words.forEach(word => {
      Object.entries(this._synonyms).forEach(([key, values]) => {
        if (key.includes(word) || word.includes(key)) {
          const targetView = values[0]; // Erster Wert ist die View
          const existing = results.find(r => r.view === targetView);
          if (existing) {
            existing.score += 2;
            if (!existing.synonym) existing.synonym = values.slice(1).join(', ');
          } else {
            const page = this._pages.find(p => p.view === targetView);
            if (page) {
              results.push({ type: 'page', score: 2, ...page, synonym: values.slice(1).join(', ') });
            }
          }
        }
      });
    });

    // Sortieren nach Score (höchster zuerst), Duplikate entfernen
    const seen = new Set();
    const unique = results.filter(r => {
      const key = r.label;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => b.score - a.score).slice(0, 8);

    if (unique.length === 0) {
      el.innerHTML = `<div class="gs-hint">Nichts gefunden für „${escapeHtml(query)}"</div>`;
      return;
    }

    el.innerHTML = unique.map(r => `
      <div class="gs-result" onclick="${r.type === 'action' ? `(${r.action.toString()})()` : `app.navigate('${r.view}')`}; GlobalSearch.close(); document.getElementById('global-search').value='';">
        <span class="gs-icon">${r.icon}</span>
        <div class="gs-info">
          <div class="gs-label">${this._highlight(r.label, words)}</div>
          <div class="gs-desc">${this._highlight(r.desc, words)}</div>
          ${r.synonym ? `<div class="gs-synonym">Auch: ${escapeHtml(r.synonym)}</div>` : ''}
        </div>
        <span class="gs-type">${r.type === 'action' ? 'Aktion' : 'Seite'}</span>
      </div>
    `).join('');
  },

  _matchScore(words, text) {
    const t = text.toLowerCase();
    let score = 0;
    words.forEach(word => {
      if (t.includes(word)) score += word.length;
    });
    return score;
  },

  _highlight(text, words) {
    let result = escapeHtml(text);
    words.forEach(word => {
      if (word.length < 2) return;
      const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(regex, '<mark>$1</mark>');
    });
    return result;
  }
};

// Tastaturkürzel: Ctrl+K oder Cmd+K öffnet die Suche
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const input = document.getElementById('global-search');
    if (input) { input.focus(); GlobalSearch.open(); }
  }
  if (e.key === 'Escape') {
    GlobalSearch.close();
  }
});
