// ============================================
// ElektroHub – DATEV-Export
// Export für deutschen Steuerberater
// Buchungsstapel + Debitorenstammdaten
// ============================================

const DATEVExport = {

  /**
   * Exportiert Buchungen eines Monats als DATEV Buchungsstapel CSV.
   * @param {number} year - Geschäftsjahr
   * @param {number} month - Monat (1-12)
   */
  async exportBookings(year, month) {
    try {
      const invoices = await db.getAll(STORES.invoices);
      const kleinunternehmer = await isKleinunternehmer();

      // Nur bezahlte Rechnungen des angegebenen Monats filtern
      const filtered = invoices.filter(inv => {
        if (!INVOICE_LIKE_TYPES.includes(inv.type)) return false;
        if (inv.status !== 'bezahlt' && inv.status !== 'teilbezahlt') return false;

        // Datum prüfen (Belegdatum oder Erstellungsdatum)
        const dateStr = inv.date || inv.createdAt;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getFullYear() === year && (d.getMonth() + 1) === month;
      });

      if (filtered.length === 0) {
        showToast(`Keine bezahlten Rechnungen für ${String(month).padStart(2, '0')}/${year} gefunden.`, 'error');
        return;
      }

      // DATEV Buchungsstapel Header-Zeilen
      const headers = [
        'Umsatz (Soll)',
        'Umsatz (Haben)',
        'SollHabenKennzeichen',
        'WKZ',
        'Kurs',
        'Basisumsatz',
        'WKZ Basisumsatz',
        'Konto',
        'Gegenkonto (ohne BU-Schlüssel)',
        'BU-Schlüssel',
        'Belegdatum',
        'Belegfeld 1',
        'Buchungstext',
      ];

      const rows = [headers.join(';')];

      for (const inv of filtered) {
        const brutto = inv.totalBrutto || inv.total || 0;
        if (brutto === 0) continue;

        // Gegenkonto bestimmen
        let gegenKonto;
        if (kleinunternehmer) {
          gegenKonto = '8195'; // Steuerfreie Erlöse (Kleinunternehmer §19)
        } else {
          // Standardfall: 19% USt
          gegenKonto = '8400'; // Erlöse 19% USt
          // 7% USt erkennen (falls im Datensatz gespeichert)
          if (inv.mwstRate === 7 || inv.mwstRate === 0.07) {
            gegenKonto = '8300'; // Erlöse 7% USt
          }
        }

        // Belegdatum im DATEV-Format: TTMM
        const dateStr = inv.date || inv.createdAt;
        const d = new Date(dateStr);
        const belegDatum = String(d.getDate()).padStart(2, '0') + String(d.getMonth() + 1).padStart(2, '0');

        // Buchungstext (max. 60 Zeichen)
        const buchungstext = (inv.number || inv.id || '').substring(0, 60);

        // Betrag formatieren (Komma als Dezimaltrenner)
        const betrag = Math.abs(brutto).toFixed(2).replace('.', ',');

        // Storno-/Gutschrift-Logik
        const isStorno = inv.type === 'stornorechnung' || inv.type === 'gutschrift';
        const sollHaben = isStorno ? 'H' : 'S'; // Soll bei normaler Rechnung, Haben bei Storno

        const row = [
          sollHaben === 'S' ? betrag : '',   // Umsatz (Soll)
          sollHaben === 'H' ? betrag : '',   // Umsatz (Haben)
          sollHaben,                          // SollHabenKennzeichen
          'EUR',                              // WKZ
          '',                                 // Kurs
          '',                                 // Basisumsatz
          '',                                 // WKZ Basisumsatz
          '1400',                             // Konto (Forderungen aus LuL)
          gegenKonto,                         // Gegenkonto
          '',                                 // BU-Schlüssel
          belegDatum,                         // Belegdatum
          this._csvEscape(inv.number || ''),  // Belegfeld 1
          this._csvEscape(buchungstext),      // Buchungstext
        ];

        rows.push(row.join(';'));
      }

      const filename = `DATEV_Buchungen_${year}_${String(month).padStart(2, '0')}.csv`;
      this._downloadCSV(rows.join('\r\n'), filename);
      showToast(`DATEV-Export: ${filtered.length} Buchungen exportiert.`);

    } catch (err) {
      console.error('DATEV Buchungsexport fehlgeschlagen:', err);
      showToast('DATEV-Export fehlgeschlagen: ' + err.message, 'error');
    }
  },

  /**
   * Exportiert Kundenstammdaten als DATEV Debitorenstammdaten CSV.
   */
  async exportCustomers() {
    try {
      const customers = await db.getAll(STORES.customers);

      if (customers.length === 0) {
        showToast('Keine Kunden vorhanden.', 'error');
        return;
      }

      const headers = [
        'Konto',
        'Name (Adressattyp Unternehmen)',
        'Name (Adressattyp natürl. Person)',
        'Vorname (Adressattyp natürl. Person)',
        'Adressattyp',
        'Straße',
        'Postleitzahl',
        'Ort',
        'Land',
        'Telefon',
        'E-Mail',
        'Steuernummer',
        'USt-IdNr.',
      ];

      const rows = [headers.join(';')];

      customers.forEach((cust, index) => {
        // Debitorennummer: 10000 + laufende Nummer
        const konto = 10000 + index + 1;

        const isCompany = cust.type === 'gewerbe' || cust.type === 'hausverwaltung' || cust.type === 'bautraeger';
        const adressatTyp = isCompany ? '2' : '1'; // 1 = natürliche Person, 2 = Unternehmen

        // Name aufteilen
        let companyName = '';
        let lastName = '';
        let firstName = '';

        if (isCompany) {
          companyName = cust.company || cust.name || '';
          // Ansprechpartner als natürliche Person
          if (cust.name && cust.name !== cust.company) {
            const parts = (cust.name || '').split(' ');
            firstName = parts.slice(0, -1).join(' ');
            lastName = parts[parts.length - 1] || '';
          }
        } else {
          const parts = (cust.name || '').split(' ');
          firstName = parts.slice(0, -1).join(' ');
          lastName = parts[parts.length - 1] || '';
        }

        const row = [
          konto,
          this._csvEscape(companyName),
          this._csvEscape(lastName),
          this._csvEscape(firstName),
          adressatTyp,
          this._csvEscape(cust.street || ''),
          this._csvEscape(cust.zip || ''),
          this._csvEscape(cust.city || ''),
          this._csvEscape(cust.country || 'DE'),
          this._csvEscape(cust.phone || ''),
          this._csvEscape(cust.email || ''),
          this._csvEscape(cust.taxNumber || ''),
          this._csvEscape(cust.vatId || ''),
        ];

        rows.push(row.join(';'));
      });

      const filename = `DATEV_Debitoren_${new Date().getFullYear()}.csv`;
      this._downloadCSV(rows.join('\r\n'), filename);
      showToast(`DATEV-Export: ${customers.length} Kunden exportiert.`);

    } catch (err) {
      console.error('DATEV Kundenexport fehlgeschlagen:', err);
      showToast('DATEV-Export fehlgeschlagen: ' + err.message, 'error');
    }
  },

  /**
   * Zeigt das DATEV-Export-Modal mit Monatsauswahl.
   */
  showExportDialog() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Jahresoptionen (aktuelles Jahr + 2 vorherige)
    const yearOptions = [];
    for (let y = currentYear; y >= currentYear - 2; y--) {
      yearOptions.push(`<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`);
    }

    // Monatsoptionen
    const monthOptions = MONTH_NAMES.map((name, i) =>
      `<option value="${i + 1}" ${(i + 1) === currentMonth ? 'selected' : ''}>${name}</option>`
    ).join('');

    const html = `
      <div class="form-section">
        <h3 style="margin-bottom:16px;">DATEV Buchungsstapel</h3>
        <p class="text-muted" style="margin-bottom:16px;">Exportiert bezahlte Rechnungen als DATEV-kompatible CSV-Datei für Ihren Steuerberater.</p>

        <div class="form-row">
          <div class="form-group">
            <label>Jahr</label>
            <select id="datev-year" class="form-control">
              ${yearOptions.join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Monat</label>
            <select id="datev-month" class="form-control">
              ${monthOptions}
            </select>
          </div>
        </div>

        <button class="btn-primary" onclick="DATEVExport.exportBookings(
          parseInt(document.getElementById('datev-year').value),
          parseInt(document.getElementById('datev-month').value)
        )">
          Buchungen exportieren
        </button>
      </div>

      <hr style="margin:24px 0;border-color:var(--gray-700);">

      <div class="form-section">
        <h3 style="margin-bottom:16px;">DATEV Debitorenstammdaten</h3>
        <p class="text-muted" style="margin-bottom:16px;">Exportiert alle Kunden als Debitorenstammdaten.</p>

        <button class="btn-primary" onclick="DATEVExport.exportCustomers()">
          Kundenstammdaten exportieren
        </button>
      </div>

      <hr style="margin:24px 0;border-color:var(--gray-700);">

      <div class="form-section">
        <p class="text-muted" style="font-size:0.8rem;">
          <strong>Hinweise:</strong><br>
          • Kontenrahmen: SKR04 (Konto 1400 = Forderungen, 8400 = Erlöse 19%)<br>
          • Nur bezahlte Rechnungen werden exportiert<br>
          • Kleinunternehmer-Regelung wird automatisch berücksichtigt<br>
          • Dateiformat: CSV mit Semikolon-Trennung (Windows-1252 kompatibel)
        </p>
      </div>
    `;

    openModal('DATEV Export', html);
  },

  /**
   * Escape für CSV-Felder (Semikolon, Anführungszeichen, Zeilenumbrüche).
   */
  _csvEscape(value) {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  },

  /**
   * Erstellt den CSV-Download mit BOM für Windows-1252 Kompatibilität.
   */
  _downloadCSV(content, filename) {
    // UTF-8 BOM für korrekte Zeichenerkennung in Excel
    const bom = '\uFEFF';
    const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};
