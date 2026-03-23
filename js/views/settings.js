// ============================================
// ElektroHub – Einstellungen View (Vollständig)
// ============================================

const SettingsView = {
  async render() {
    // Load all settings
    const companyLogo = await db.getSetting('companyLogo', '');
    const agbPdf = await db.getSetting('agbPdf', '');
    const agbEnabled = await db.getSetting('agbEnabled', false);
    const agbText = await db.getSetting('agbText', 'Es gelten unsere Allgemeinen Geschäftsbedingungen (siehe Anlage).');
    const companyName = await db.getSetting('companyName', '');
    const companyOwner = await db.getSetting('companyOwner', '');
    const companyAddress = await db.getSetting('companyAddress', '');
    const companyPhone = await db.getSetting('companyPhone', '');
    const companyMobile = await db.getSetting('companyMobile', '');
    const companyEmail = await db.getSetting('companyEmail', '');
    const companyWebsite = await db.getSetting('companyWebsite', '');
    const taxNumber = await db.getSetting('taxNumber', '');
    const ustId = await db.getSetting('ustId', '');
    const handwerksrollenNr = await db.getSetting('handwerksrollenNr', '');
    const meisterbriefNr = await db.getSetting('meisterbriefNr', '');
    const efgNr = await db.getSetting('efgNr', '');

    const bankName = await db.getSetting('bankName', '');
    const bankIBAN = await db.getSetting('bankIBAN', '');
    const bankBIC = await db.getSetting('bankBIC', '');
    const bankKontoinhaber = await db.getSetting('bankKontoinhaber', '');

    const qrMode = await db.getSetting('qrMode', 'auto');
    const customQR = await db.getSetting('customQR', '');

    const defaultPaymentDays = await db.getSetting('defaultPaymentDays', 14);
    const skontoEnabled = await db.getSetting('skontoEnabled', false);
    const skontoRate = await db.getSetting('skontoRate', 2);
    const skontoFrist = await db.getSetting('skontoFrist', 10);
    const kleinunternehmer = await db.getSetting('kleinunternehmer', false);
    const mwstRate = await db.getSetting('mwstRate', 19);
    const mwstRateReduced = await db.getSetting('mwstRateReduced', 7);
    const showHandwerkerbonus = await db.getSetting('showHandwerkerbonus', false);
    const eRechnungsFormat = await db.getSetting('eRechnungsFormat', 'pdf');

    const showGewaehrleistung = await db.getSetting('showGewaehrleistung', false);
    const gewaehrleistungText = await db.getSetting('gewaehrleistungText', DEFAULT_LEGAL_TEXTS.gewaehrleistung.text);

    const defaultHourlyRateMeister = await db.getSetting('defaultHourlyRateMeister', 55);
    const defaultHourlyRateGeselle = await db.getSetting('defaultHourlyRateGeselle', 45);
    const defaultMarkup = await db.getSetting('defaultMarkup', 15);
    const defaultAnfahrt = await db.getSetting('defaultAnfahrt', 35);
    const kmPauschale = await db.getSetting('kmPauschale', 0.52);
    const gewinnaufschlag = await db.getSetting('gewinnaufschlag', 10);

    // Load number prefixes for each doc type
    const prefixInputs = [];
    for (const dt of DOC_TYPES) {
      const val = await db.getSetting(`numPrefix_${dt.value}`, dt.prefix);
      prefixInputs.push({ value: dt.value, label: dt.label, prefix: val });
    }

    // Load text blocks for section 8
    const allBlocks = await getAllTextBlocks();

    const lagerEnabled = await db.getSetting('lagerEnabled', false);

    return `
      <div class="page-header">
        <h2>Einstellungen</h2>
        <p class="page-subtitle">Hier richtest du alles ein, was auf deinen Belegen erscheint</p>
      </div>

      <!-- Betriebsart -->
      <div class="card" style="padding:16px 20px;margin-bottom:12px;border:2px solid ${kleinunternehmer ? 'var(--warning)' : 'var(--success)'};">
        <div class="flex-between">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:1.5rem;">${kleinunternehmer ? '🏠' : '🏢'}</span>
            <div>
              <strong style="font-size:1.05rem;">${kleinunternehmer ? 'Kleinunternehmer (§19 UStG)' : 'Regelbesteuert (mit MwSt.)'}</strong>
              <p class="text-small text-muted">${kleinunternehmer ? 'Keine Umsatzsteuer auf Belegen – Hinweis §19 UStG wird automatisch eingefügt' : `Standard-MwSt ${mwstRate}% wird auf allen Rechnungen ausgewiesen`}</p>
            </div>
          </div>
          <button class="btn btn-small ${kleinunternehmer ? 'btn-secondary' : 'btn-secondary'}" onclick="SettingsView.toggleBetriebsart()">
            ${kleinunternehmer ? 'Zu Regelbesteuerung wechseln' : 'Kleinunternehmer aktivieren'}
          </button>
        </div>
      </div>

      <!-- Module -->
      <div class="card" style="padding:16px 20px;margin-bottom:20px;">
        <div class="flex-between">
          <div>
            <strong>Module</strong>
            <span class="text-small text-muted" style="margin-left:8px;">Funktionen ein-/ausblenden</span>
          </div>
          <div>
            <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:0.9rem;">
              <input type="checkbox" ${lagerEnabled ? 'checked' : ''} onchange="SettingsView.toggleModule('lagerEnabled', this.checked)">
              📦 Lagerverwaltung
            </label>
          </div>
        </div>
      </div>

      <!-- ========== 1. LOGO ========== -->
      <div class="card setup-card">
        <div class="setup-header">
          <span class="setup-number">1</span>
          <div>
            <h3>Firmenlogo</h3>
            <p class="text-muted text-small">Erscheint oben rechts auf jedem Angebot und jeder Rechnung</p>
          </div>
        </div>
        <div class="setup-body">
          <div class="upload-area" id="logo-upload-area">
            ${companyLogo ? `
              <div class="upload-preview">
                <img src="${companyLogo}" alt="Logo">
              </div>
              <div class="upload-actions">
                <span class="upload-success">Logo ist gespeichert</span>
                <div class="btn-group mt-8">
                  <button class="btn btn-secondary" onclick="document.getElementById('logo-file-input').click()">Anderes Logo wählen</button>
                  <button class="btn btn-danger btn-small" onclick="SettingsView.removeLogo()">Entfernen</button>
                </div>
              </div>
            ` : `
              <div class="upload-dropzone" onclick="document.getElementById('logo-file-input').click()">
                <div class="upload-icon">🖼️</div>
                <div class="upload-text"><strong>Klicke hier</strong> um dein Logo hochzuladen</div>
                <div class="upload-hint">PNG oder JPG Bild</div>
              </div>
            `}
            <input type="file" id="logo-file-input" accept="image/png,image/jpeg,image/svg+xml" style="display:none"
                   onchange="SettingsView.uploadImage(this, 'companyLogo')">
          </div>
        </div>
      </div>

      <!-- ========== AGB ========== -->
      <div class="card setup-card">
        <div class="setup-header">
          <span class="setup-number">2</span>
          <div>
            <h3>AGB (Allgemeine Geschäftsbedingungen)</h3>
            <p class="text-muted text-small">Lade deine AGB als PDF hoch – sie werden beim Versand an Belege angehängt</p>
          </div>
        </div>
        <div class="setup-body">
          <div class="upload-area" id="agb-upload-area">
            ${agbPdf ? `
              <div class="upload-preview" style="background:var(--gray-50);padding:20px;">
                <div style="font-size:2rem;">📎</div>
                <div style="margin-left:12px;">
                  <strong>AGB-PDF gespeichert</strong>
                  <div class="text-small text-muted mt-8">
                    <a href="${agbPdf}" download="AGB.pdf" class="btn btn-small btn-secondary">Herunterladen</a>
                  </div>
                </div>
              </div>
              <div class="upload-actions">
                <span class="upload-success">AGB ist hinterlegt</span>
                <div class="btn-group mt-8">
                  <button class="btn btn-secondary" onclick="document.getElementById('agb-file-input').click()">Andere Datei wählen</button>
                  <button class="btn btn-danger btn-small" onclick="SettingsView.removeAgb()">Entfernen</button>
                </div>
              </div>
            ` : `
              <div class="upload-dropzone" onclick="document.getElementById('agb-file-input').click()">
                <div class="upload-icon">📎</div>
                <div class="upload-text"><strong>Klicke hier</strong> um deine AGB als PDF hochzuladen</div>
                <div class="upload-hint">PDF-Datei (max. 5 MB)</div>
              </div>
            `}
            <input type="file" id="agb-file-input" accept="application/pdf" style="display:none"
                   onchange="SettingsView.uploadAgb(this)">
          </div>

          <form id="settings-agb-form" class="mt-16">
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" name="agbEnabled" ${agbEnabled ? 'checked' : ''}>
                <span>AGB-Hinweis auf Belegen anzeigen</span>
              </label>
              <p class="text-small text-muted" style="margin-top:4px;">Wenn aktiv, erscheint der Hinweistext unten auf jedem Beleg</p>
            </div>
            <div class="form-group">
              <label>Hinweistext auf dem Beleg</label>
              <input type="text" name="agbText" value="${escapeHtml(agbText)}" placeholder="Es gelten unsere AGB (siehe Anlage).">
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">AGB-Einstellungen speichern</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ========== 3. FIRMENSTAMMDATEN ========== -->
      <div class="card setup-card">
        <div class="setup-header">
          <span class="setup-number">3</span>
          <div>
            <h3>Firmenstammdaten</h3>
            <p class="text-muted text-small">Name, Adresse, Kontakt und Registrierungsdaten — erscheint auf jedem Beleg</p>
          </div>
        </div>
        <div class="setup-body">
          <form id="settings-company-form">
            <div class="form-row">
              <div class="form-group">
                <label>Firmenname</label>
                <input type="text" name="companyName" value="${escapeHtml(companyName)}" placeholder="z.B. Elektro Müller GmbH" style="font-size:1.05rem;">
              </div>
              <div class="form-group">
                <label>Inhaber</label>
                <input type="text" name="companyOwner" value="${escapeHtml(companyOwner)}" placeholder="z.B. Max Müller">
              </div>
            </div>
            <div class="form-group">
              <label>Adresse</label>
              <textarea name="companyAddress" rows="3" placeholder="Musterstraße 12&#10;53111 Bonn">${escapeHtml(companyAddress)}</textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Telefon</label>
                <input type="tel" name="companyPhone" value="${escapeHtml(companyPhone)}" placeholder="0228 1234567">
              </div>
              <div class="form-group">
                <label>Mobil</label>
                <input type="tel" name="companyMobile" value="${escapeHtml(companyMobile)}" placeholder="0171 1234567">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>E-Mail</label>
                <input type="email" name="companyEmail" value="${escapeHtml(companyEmail)}" placeholder="info@mein-betrieb.de">
              </div>
              <div class="form-group">
                <label>Website</label>
                <input type="url" name="companyWebsite" value="${escapeHtml(companyWebsite)}" placeholder="https://www.mein-betrieb.de">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Steuernummer</label>
                <input type="text" name="taxNumber" value="${escapeHtml(taxNumber)}" placeholder="z.B. 12/345/67890">
              </div>
              <div class="form-group">
                <label>USt-ID</label>
                <input type="text" name="ustId" value="${escapeHtml(ustId)}" placeholder="z.B. DE123456789">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Handwerksrollen-Nr.</label>
                <input type="text" name="handwerksrollenNr" value="${escapeHtml(handwerksrollenNr)}" placeholder="z.B. 12345">
              </div>
              <div class="form-group">
                <label>Meisterbrief-Nr.</label>
                <input type="text" name="meisterbriefNr" value="${escapeHtml(meisterbriefNr)}" placeholder="z.B. MB-2020-1234">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>EFG-Nr. (Installateur-Ausweis)</label>
                <input type="text" name="efgNr" value="${escapeHtml(efgNr)}" placeholder="z.B. EFG-12345">
              </div>
              <div class="form-group"></div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary btn-big">Firmendaten speichern</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ========== 3. BANKVERBINDUNG ========== -->
      <div class="card setup-card">
        <div class="setup-header">
          <span class="setup-number">4</span>
          <div>
            <h3>Bankverbindung</h3>
            <p class="text-muted text-small">Wird auf Rechnungen und Belegen angezeigt</p>
          </div>
        </div>
        <div class="setup-body">
          <form id="settings-bank-form">
            <div class="form-row">
              <div class="form-group">
                <label>Bankname</label>
                <input type="text" name="bankName" value="${escapeHtml(bankName)}" placeholder="z.B. Sparkasse Bonn">
              </div>
              <div class="form-group">
                <label>Kontoinhaber</label>
                <input type="text" name="bankKontoinhaber" value="${escapeHtml(bankKontoinhaber)}" placeholder="z.B. Max Müller">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>IBAN</label>
                <input type="text" name="bankIBAN" value="${escapeHtml(bankIBAN)}" placeholder="DE89 3704 0044 0532 0130 00" style="font-family:monospace;font-size:1.05rem;letter-spacing:1px;">
              </div>
              <div class="form-group">
                <label>BIC</label>
                <input type="text" name="bankBIC" value="${escapeHtml(bankBIC)}" placeholder="COBADEFFXXX" style="font-family:monospace;">
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary btn-big">Bankdaten speichern</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ========== 4. QR-CODE ========== -->
      <div class="card setup-card">
        <div class="setup-header">
          <span class="setup-number">5</span>
          <div>
            <h3>QR-Code für Rechnungen</h3>
            <p class="text-muted text-small">Damit kann dein Kunde direkt per Banking-App bezahlen</p>
          </div>
        </div>
        <div class="setup-body">

          <!-- QR Modus Auswahl -->
          <div class="qr-mode-selector">
            <label class="qr-mode-option ${qrMode === 'auto' ? 'active' : ''}" onclick="SettingsView.setQRMode('auto')">
              <input type="radio" name="qrMode" value="auto" ${qrMode === 'auto' ? 'checked' : ''}>
              <div class="qr-mode-content">
                <div class="qr-mode-icon">⚡</div>
                <div>
                  <strong>Automatisch erstellen</strong>
                  <p class="text-small text-muted">QR-Code wird aus deiner IBAN + Rechnungsbetrag generiert</p>
                </div>
              </div>
            </label>
            <label class="qr-mode-option ${qrMode === 'custom' ? 'active' : ''}" onclick="SettingsView.setQRMode('custom')">
              <input type="radio" name="qrMode" value="custom" ${qrMode === 'custom' ? 'checked' : ''}>
              <div class="qr-mode-content">
                <div class="qr-mode-icon">📷</div>
                <div>
                  <strong>Eigenen QR-Code hochladen</strong>
                  <p class="text-small text-muted">Du hast schon einen QR-Code? Lade ihn als Bild hoch</p>
                </div>
              </div>
            </label>
            <label class="qr-mode-option ${qrMode === 'off' ? 'active' : ''}" onclick="SettingsView.setQRMode('off')">
              <input type="radio" name="qrMode" value="off" ${qrMode === 'off' ? 'checked' : ''}>
              <div class="qr-mode-content">
                <div class="qr-mode-icon">✖️</div>
                <div>
                  <strong>Kein QR-Code</strong>
                  <p class="text-small text-muted">Rechnungen ohne QR-Code erstellen</p>
                </div>
              </div>
            </label>
          </div>

          <!-- Auto-Modus: IBAN eingeben -->
          <div id="qr-auto-section" class="${qrMode === 'auto' ? '' : 'hidden'}">
            <div class="info-box mt-16">
              So funktioniert's: Du gibst einmal deine IBAN ein. Bei jeder Rechnung wird automatisch ein QR-Code mit dem richtigen Betrag erstellt. Dein Kunde scannt ihn mit seiner Banking-App — fertig.
            </div>
            ${bankIBAN ? `
              <div class="qr-test-preview mt-16">
                <p class="text-small mb-8"><strong>Vorschau</strong> — so sieht der QR-Code auf einer Rechnung aus (Testbetrag 100 €):</p>
                <div class="qr-preview-box">
                  <img src="${QRCode.toDataURL(QRCode.epcQR({ bic: bankBIC, name: companyName, iban: bankIBAN.replace(/\\s/g, ''), amount: 100, reference: 'Test' }), 4, 4)}" alt="QR-Vorschau">
                </div>
              </div>
            ` : `
              <div class="info-box mt-16" style="opacity:0.6;">
                Speichere zuerst deine IBAN unter "Bankverbindung" (Abschnitt 3), damit der QR-Code automatisch erstellt werden kann.
              </div>
            `}
          </div>

          <!-- Custom-Modus: Bild hochladen -->
          <div id="qr-custom-section" class="${qrMode === 'custom' ? '' : 'hidden'}">
            <div class="info-box mt-16">
              Lade dein eigenes QR-Code-Bild hoch. Es wird genau so auf jede Rechnung gedruckt — unten, neben deinen Bankdaten.
            </div>
            <div class="upload-area mt-16" id="qr-upload-area">
              ${customQR ? `
                <div class="upload-preview" style="background:#fff;">
                  <img src="${customQR}" alt="QR-Code" style="max-width:160px;max-height:160px;">
                </div>
                <div class="upload-actions">
                  <span class="upload-success">QR-Code ist gespeichert</span>
                  <div class="btn-group mt-8">
                    <button class="btn btn-secondary" onclick="document.getElementById('qr-file-input').click()">Anderen hochladen</button>
                    <button class="btn btn-danger btn-small" onclick="SettingsView.removeCustomQR()">Entfernen</button>
                  </div>
                </div>
              ` : `
                <div class="upload-dropzone" onclick="document.getElementById('qr-file-input').click()">
                  <div class="upload-icon">📷</div>
                  <div class="upload-text"><strong>Klicke hier</strong> um deinen QR-Code hochzuladen</div>
                  <div class="upload-hint">PNG oder JPG Bild</div>
                </div>
              `}
              <input type="file" id="qr-file-input" accept="image/png,image/jpeg" style="display:none"
                     onchange="SettingsView.uploadImage(this, 'customQR')">
            </div>
          </div>

          <!-- Off-Modus -->
          <div id="qr-off-section" class="${qrMode === 'off' ? '' : 'hidden'}">
            <div class="info-box mt-16" style="opacity:0.6;">
              Kein QR-Code — Rechnungen werden ohne QR-Code erstellt. Du kannst das jederzeit ändern.
            </div>
          </div>

        </div>
      </div>

      <!-- ========== 5. DOKUMENTEINSTELLUNGEN ========== -->
      <div class="card setup-card">
        <div class="setup-header">
          <span class="setup-number">6</span>
          <div>
            <h3>Dokumenteinstellungen</h3>
            <p class="text-muted text-small">Zahlungsziele, Steuersätze, Nummernpräfixe und weitere Dokumentoptionen</p>
          </div>
        </div>
        <div class="setup-body">
          <form id="settings-doc-form">
            <div class="form-row">
              <div class="form-group">
                <label>Standard-Zahlungsziel (Tage)</label>
                <input type="number" name="defaultPaymentDays" min="1" step="1" value="${defaultPaymentDays}">
                ${presetChips('defaultPaymentDays', [7, 14, 21, 30], ' Tage')}
              </div>
              <div class="form-group">
                <label>E-Rechnungsformat</label>
                <select name="eRechnungsFormat">
                  <option value="pdf" ${eRechnungsFormat === 'pdf' ? 'selected' : ''}>Nur PDF</option>
                  <option value="zugferd" ${eRechnungsFormat === 'zugferd' ? 'selected' : ''}>ZUGFeRD (PDF + XML)</option>
                  <option value="xrechnung" ${eRechnungsFormat === 'xrechnung' ? 'selected' : ''}>XRechnung (XML)</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Standard-MwSt (%)</label>
                <input type="number" name="mwstRate" min="0" step="0.5" value="${mwstRate}">
                ${presetChips('mwstRate', [0, 7, 19], '%')}
              </div>
              <div class="form-group">
                <label>Reduzierter MwSt-Satz (%)</label>
                <input type="number" name="mwstRateReduced" min="0" step="0.5" value="${mwstRateReduced}">
                ${presetChips('mwstRateReduced', [0, 5, 7], '%')}
              </div>
            </div>

            <div style="margin:16px 0;padding:16px;background:var(--gray-50);border-radius:8px;">
              <p class="text-small text-muted mb-8">Skonto-Standardwerte (werden beim Erstellen neuer Belege vorausgefüllt – du kannst Skonto pro Beleg individuell anpassen)</p>
              <div class="form-row">
                <div class="form-group">
                  <label>Standard-Skontosatz (%)</label>
                  <input type="number" name="skontoRate" min="0" step="0.5" value="${skontoRate}">
                  ${presetChips('skontoRate', [2, 3, 5], '%')}
                </div>
                <div class="form-group">
                  <label>Standard-Skontofrist (Tage)</label>
                  <input type="number" name="skontoFrist" min="1" step="1" value="${skontoFrist}">
                  ${presetChips('skontoFrist', [7, 10, 14], ' Tage')}
                </div>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px;">
              <label class="onboarding-toggle">
                <input type="checkbox" name="kleinunternehmer" ${kleinunternehmer ? 'checked' : ''}>
                <div>
                  <strong>Kleinunternehmer-Regelung (§19 UStG)</strong>
                  <p class="text-small text-muted">Keine Umsatzsteuer auf Rechnungen ausweisen. Nur aktivieren wenn du Kleinunternehmer bist.</p>
                </div>
              </label>

              <label class="onboarding-toggle">
                <input type="checkbox" name="showHandwerkerbonus" ${showHandwerkerbonus ? 'checked' : ''}>
                <div>
                  <strong>Handwerkerbonus anzeigen (§35a EStG)</strong>
                  <p class="text-small text-muted">Arbeitskosten-Anteil auf Rechnungen separat ausweisen. Privatkunden können das steuerlich absetzen.</p>
                </div>
              </label>

              <label class="onboarding-toggle">
                <input type="checkbox" name="showGewaehrleistung" ${showGewaehrleistung ? 'checked' : ''}>
                <div>
                  <strong>Gewährleistungshinweis</strong>
                  <p class="text-small text-muted">Hinweis auf die Gewährleistungsfrist auf Rechnungen und Schlussrechnungen anzeigen.</p>
                </div>
              </label>
            </div>

            <div class="form-group mt-16">
              <label>Gewährleistungstext</label>
              <textarea name="gewaehrleistungText" rows="2" style="font-size:0.9rem;">${escapeHtml(gewaehrleistungText)}</textarea>
              ${presetTextChips('gewaehrleistungText', [
                { label: 'VOB/B – 4 Jahre', value: 'Auf die ausgeführten Arbeiten gewähren wir eine Gewährleistung gemäß VOB/B von 4 Jahren ab Abnahmedatum.' },
                { label: 'BGB – 5 Jahre', value: 'Auf die ausgeführten Arbeiten gewähren wir eine Gewährleistung gemäß BGB von 5 Jahren ab Abnahmedatum.' },
                { label: 'VOB/B – 2 Jahre', value: 'Auf die ausgeführten Arbeiten gewähren wir eine Gewährleistung gemäß VOB/B von 2 Jahren ab Abnahmedatum.' },
              ])}
            </div>

            <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--gray-200);">
              <h4 style="margin-bottom:12px;">Nummernpräfixe</h4>
              <p class="text-small text-muted" style="margin-bottom:12px;">Kürzel vor der Dokumentnummer, z.B. RE-2026-0001</p>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
                ${prefixInputs.map(p => `
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="text-small">${escapeHtml(p.label)}</label>
                    <input type="text" name="numPrefix_${p.value}" value="${escapeHtml(p.prefix)}" maxlength="6" style="font-family:monospace;">
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="form-actions" style="margin-top:20px;">
              <button type="submit" class="btn btn-primary btn-big">Dokumenteinstellungen speichern</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ========== 6. KALKULATIONSEINSTELLUNGEN ========== -->
      <div class="card setup-card">
        <div class="setup-header">
          <span class="setup-number">7</span>
          <div>
            <h3>Kalkulationseinstellungen</h3>
            <p class="text-muted text-small">Standardwerte für neue Kalkulationen</p>
          </div>
        </div>
        <div class="setup-body">
          <form id="settings-calc-form">
            <div class="form-row">
              <div class="form-group">
                <label>Stundensatz Meister (€/Std)</label>
                <input type="number" name="defaultHourlyRateMeister" step="0.5" min="0" value="${defaultHourlyRateMeister}">
                ${presetChips('defaultHourlyRateMeister', [45, 50, 55, 60, 65], ' €')}
              </div>
              <div class="form-group">
                <label>Stundensatz Geselle (€/Std)</label>
                <input type="number" name="defaultHourlyRateGeselle" step="0.5" min="0" value="${defaultHourlyRateGeselle}">
                ${presetChips('defaultHourlyRateGeselle', [35, 40, 45, 50], ' €')}
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Material-Aufschlag (%)</label>
                <input type="number" name="defaultMarkup" step="1" min="0" value="${defaultMarkup}">
                ${presetChips('defaultMarkup', [10, 15, 20, 25], '%')}
              </div>
              <div class="form-group">
                <label>Gewinnaufschlag (%)</label>
                <input type="number" name="gewinnaufschlag" step="0.5" min="0" value="${gewinnaufschlag}">
                ${presetChips('gewinnaufschlag', [5, 10, 15, 20], '%')}
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Anfahrtspauschale (€)</label>
                <input type="number" name="defaultAnfahrt" step="0.5" min="0" value="${defaultAnfahrt}">
                ${presetChips('defaultAnfahrt', [25, 30, 35, 45], ' €')}
              </div>
              <div class="form-group">
                <label>Kilometerpauschale (€/km)</label>
                <input type="number" name="kmPauschale" step="0.01" min="0" value="${kmPauschale}">
                ${presetChips('kmPauschale', [0.30, 0.42, 0.52], ' €')}
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary btn-big">Kalkulationsvorgaben speichern</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ========== 7. DOKUMENTVORLAGEN ========== -->
      <div class="card setup-card">
        <div class="setup-header">
          <span class="setup-number">8</span>
          <div>
            <h3>Dokumentvorlagen</h3>
            <p class="text-muted text-small">Begrüßungs- und Schlusstexte, die automatisch auf deinen Belegen erscheinen</p>
          </div>
        </div>
        <div class="setup-body">
          <div class="info-box mb-16" style="font-size:0.88rem;line-height:1.7;">
            <strong>Was ist das?</strong> Jeder Dokumenttyp (Angebot, Rechnung, Mahnung usw.) hat eigene Standardtexte, die automatisch auf dem Beleg erscheinen – z.B.:<br><br>
            <em style="color:#4b5563;">„Guten Tag Herr Weber, vielen Dank für Ihren Auftrag. Anbei finden Sie unsere Rechnung Nr. RE-2026-0001."</em><br><br>
            Platzhalter wie <code>[Name]</code>, <code>[Dokumentnr]</code>, <code>[Firma]</code> werden automatisch durch die echten Daten ersetzt.<br>
            <strong>Du musst hier nichts ändern</strong> – es funktioniert direkt mit guten Standardtexten. Nur wenn du den Wortlaut anpassen möchtest, wähle unten den Dokumenttyp aus.
          </div>

          <div class="form-group">
            <label>Dokumenttyp auswählen</label>
            <select id="template-doctype-select">
              <option value="">— Dokumenttyp wählen um Texte anzupassen —</option>
              ${DOC_TYPES.map(dt => `<option value="${dt.value}">${escapeHtml(dt.label)}</option>`).join('')}
            </select>
          </div>

          <div id="template-editor" class="hidden">
            <form id="settings-template-form">
              <div class="form-group">
                <label>Betreff</label>
                <input type="text" name="tpl_subject" id="tpl_subject" placeholder="Betreff-Zeile">
              </div>
              <div class="form-group">
                <label>Einleitungstext</label>
                <textarea name="tpl_intro" id="tpl_intro" rows="5" placeholder="Text vor den Positionen"></textarea>
              </div>
              <div class="form-group">
                <label>Schlusstext</label>
                <textarea name="tpl_closing" id="tpl_closing" rows="5" placeholder="Text nach den Positionen"></textarea>
              </div>
              <div class="form-group">
                <label>E-Mail-Text</label>
                <textarea name="tpl_email" id="tpl_email" rows="5" placeholder="Text für E-Mail-Versand"></textarea>
              </div>
              <div class="info-box text-small" style="margin-bottom:16px;">
                Platzhalter: [Dokumentnr], [Anrede], [Name], [Firma], [Datum], [Fälligkeitsdatum], [Projektname], [Betrag], [Skontobetrag], [Skontofrist]
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary">Vorlage speichern</button>
                <button type="button" class="btn btn-secondary" onclick="SettingsView.resetTemplate()">Zurücksetzen</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- ========== 8. TEXTBAUSTEINE ========== -->
      <div class="card setup-card">
        <div class="setup-header">
          <span class="setup-number">9</span>
          <div>
            <h3>Textbausteine verwalten</h3>
            <p class="text-muted text-small">Fertige Leistungstexte, die du per Klick in Kalkulationen einfügen kannst</p>
          </div>
        </div>
        <div class="setup-body">
          <div class="info-box mb-16" style="font-size:0.88rem;line-height:1.7;">
            <strong>Was ist das?</strong> Textbausteine sind fertige Beschreibungen für typische Elektro-Arbeiten, z.B.:<br><br>
            <em style="color:#4b5563;">„INST-001 – Steckdose setzen (Unterputz), inkl. Dose, Rahmen und Einsatz"</em><br><br>
            <strong>So nutzt du sie:</strong> Beim Erstellen einer Kalkulation oder eines Belegs klickst du auf den <strong>📋 Textbaustein</strong>-Button. Dann suchst du den passenden Text, klickst <em>Einfügen</em> – und die Position ist drin. Du trägst nur noch Menge und Preis ein.<br><br>
            Es gibt über 40 vorgefertigte Bausteine (🔒) in 6 Kategorien. Hier kannst du <strong>eigene hinzufügen</strong> oder bestehende anpassen.
          </div>

          <div class="form-row" style="margin-bottom:16px;">
            <div class="form-group" style="flex:2;">
              <input type="text" id="textblock-search" placeholder="Suchen nach Code oder Beschreibung..." oninput="SettingsView.filterTextBlocks()">
            </div>
            <div class="form-group" style="flex:1;">
              <select id="textblock-category-filter" onchange="SettingsView.filterTextBlocks()">
                <option value="">Alle Kategorien</option>
                ${TEXT_BLOCK_CATEGORIES.map(c => `<option value="${c.value}">${escapeHtml(c.label)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="flex:0 0 auto;display:flex;align-items:flex-end;">
              <button class="btn btn-primary" onclick="SettingsView.openTextBlockModal()">+ Neuer Textbaustein</button>
            </div>
          </div>

          <div style="overflow-x:auto;">
            <table class="data-table" id="textblock-table">
              <thead>
                <tr>
                  <th style="width:100px;">Code</th>
                  <th style="width:140px;">Kategorie</th>
                  <th>Beschreibung</th>
                  <th style="width:60px;">Einheit</th>
                  <th style="width:100px;">Aktionen</th>
                </tr>
              </thead>
              <tbody id="textblock-tbody">
                ${SettingsView._renderTextBlockRows(allBlocks)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========== 9. DATENSICHERUNG ========== -->
      <div class="card setup-card">
        <div class="setup-header">
          <span class="setup-number">10</span>
          <div>
            <h3>Datensicherung</h3>
            <p class="text-muted text-small">Deine Daten sind sicher im Browser gespeichert. Mach trotzdem regelmäßig ein Backup!</p>
          </div>
        </div>
        <div class="setup-body">
          ${AutoSave.isSupported() ? `
          <!-- Auto-Save -->
          <div style="padding:16px;background:var(--gray-50);border-radius:8px;margin-bottom:20px;">
            <div class="flex-between">
              <div>
                <strong>💾 Auto-Save in lokale Datei</strong>
                <p class="text-small text-muted mt-8">Daten werden automatisch in eine JSON-Datei auf deinem Computer geschrieben – bei jeder Änderung. So hast du immer eine aktuelle Sicherung als Datei.</p>
              </div>
            </div>
            <div class="btn-group mt-16">
              ${AutoSave._enabled
                ? `<button class="btn btn-secondary" onclick="AutoSave.save();showToast('Manuell gespeichert')">Jetzt speichern</button>
                   <button class="btn btn-danger btn-small" onclick="AutoSave.disable()">Deaktivieren</button>
                   <span class="badge badge-green ml-8" style="padding:6px 12px;">Aktiv</span>`
                : `<button class="btn btn-primary" onclick="AutoSave.setup()">Speicherort wählen</button>
                   <button class="btn btn-secondary" onclick="AutoSave.loadFromFile()">Aus Datei laden</button>`
              }
            </div>
          </div>
          ` : ''}

          <!-- Manuelles Backup -->
          <div class="backup-box">
            <div class="backup-option">
              <div>
                <strong>Backup herunterladen</strong>
                <p class="text-small text-muted">Speichert alle Daten als JSON-Datei</p>
              </div>
              <button class="btn btn-primary btn-big" onclick="app.exportData()">Backup herunterladen</button>
            </div>
            <div class="backup-option mt-16">
              <div>
                <strong>Backup einspielen</strong>
                <p class="text-small text-muted">Stellt Daten aus einer JSON-Datei wieder her</p>
              </div>
              <button class="btn btn-secondary btn-big" onclick="document.getElementById('import-file').click()">Datei auswählen</button>
            </div>
          </div>

          <!-- DATEV Export -->
          <div class="backup-option mt-16" style="padding-top:16px;border-top:1px solid var(--gray-200);">
            <div>
              <strong>DATEV-Export</strong>
              <p class="text-small text-muted">Buchungsdaten für deinen Steuerberater exportieren</p>
            </div>
            <button class="btn btn-secondary btn-big" onclick="DATEVExport.showExportDialog()">DATEV Export</button>
          </div>

          <div class="mt-24" style="padding-top:16px;border-top:1px solid var(--gray-200);">
            <details>
              <summary style="cursor:pointer;color:var(--gray-500);font-size:0.85rem;">Gefahrenzone</summary>
              <div class="mt-8">
                <button class="btn btn-danger" onclick="SettingsView.resetData()">Alle Daten löschen</button>
              </div>
            </details>
          </div>
        </div>
      </div>

      <!-- ========== 10. DEMO-DATEN ========== -->
      <div class="card setup-card" style="border:2px dashed var(--gray-300);">
        <div class="setup-header">
          <span class="setup-number">11</span>
          <div>
            <h3>Demo-Daten</h3>
            <p class="text-muted text-small">Beispieldaten zum Ausprobieren laden</p>
          </div>
        </div>
        <div class="setup-body" style="text-align:center;padding:24px;">
          <p class="text-muted mb-8">Erste Schritte? Lade Beispieldaten zum Ausprobieren.</p>
          <div class="btn-group" style="justify-content:center;flex-wrap:wrap;">
            <button class="btn btn-secondary" onclick="SettingsView.loadDemoData()">Demo-Daten laden</button>
            <button class="btn btn-danger btn-small" onclick="SettingsView.removeDemoData()">Demo-Daten löschen</button>
            <button class="btn btn-secondary btn-small" onclick="Onboarding.restart()">Einrichtung wiederholen</button>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    setTimeout(() => {
      // ── AGB Form ──
      const agbForm = document.getElementById('settings-agb-form');
      if (agbForm) {
        agbForm.onsubmit = async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          await db.setSetting('agbEnabled', fd.has('agbEnabled'));
          await db.setSetting('agbText', fd.get('agbText') || '');
          showToast('AGB-Einstellungen gespeichert');
        };
      }

      // ── 3. Firmendaten Form ──
      const companyForm = document.getElementById('settings-company-form');
      if (companyForm) {
        companyForm.onsubmit = async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          await db.setSetting('companyName', fd.get('companyName'));
          await db.setSetting('companyOwner', fd.get('companyOwner'));
          await db.setSetting('companyAddress', fd.get('companyAddress'));
          await db.setSetting('companyPhone', fd.get('companyPhone'));
          await db.setSetting('companyMobile', fd.get('companyMobile'));
          await db.setSetting('companyEmail', fd.get('companyEmail'));
          await db.setSetting('companyWebsite', fd.get('companyWebsite'));
          await db.setSetting('taxNumber', fd.get('taxNumber'));
          await db.setSetting('ustId', fd.get('ustId'));
          await db.setSetting('handwerksrollenNr', fd.get('handwerksrollenNr'));
          await db.setSetting('meisterbriefNr', fd.get('meisterbriefNr'));
          await db.setSetting('efgNr', fd.get('efgNr'));
          showToast('Firmendaten gespeichert');
        };
      }

      // ── 3. Bankdaten Form ──
      const bankForm = document.getElementById('settings-bank-form');
      if (bankForm) {
        bankForm.onsubmit = async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          await db.setSetting('bankName', fd.get('bankName'));
          await db.setSetting('bankIBAN', fd.get('bankIBAN'));
          await db.setSetting('bankBIC', fd.get('bankBIC'));
          await db.setSetting('bankKontoinhaber', fd.get('bankKontoinhaber'));
          showToast('Bankdaten gespeichert');
        };
      }

      // ── 5. Dokumenteinstellungen Form ──
      const docForm = document.getElementById('settings-doc-form');
      if (docForm) {
        docForm.onsubmit = async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          await db.setSetting('defaultPaymentDays', parseInt(fd.get('defaultPaymentDays')) || 14);
          await db.setSetting('eRechnungsFormat', fd.get('eRechnungsFormat') || 'pdf');
          await db.setSetting('mwstRate', parseFloat(fd.get('mwstRate')) || 19);
          await db.setSetting('mwstRateReduced', parseFloat(fd.get('mwstRateReduced')) || 7);
          await db.setSetting('skontoRate', parseFloat(fd.get('skontoRate')) || 2);
          await db.setSetting('skontoFrist', parseInt(fd.get('skontoFrist')) || 10);
          await db.setSetting('kleinunternehmer', fd.has('kleinunternehmer'));
          await db.setSetting('showHandwerkerbonus', fd.has('showHandwerkerbonus'));
          await db.setSetting('showGewaehrleistung', fd.has('showGewaehrleistung'));
          await db.setSetting('gewaehrleistungText', fd.get('gewaehrleistungText') || DEFAULT_LEGAL_TEXTS.gewaehrleistung.text);

          // Save number prefixes
          for (const dt of DOC_TYPES) {
            const prefix = fd.get(`numPrefix_${dt.value}`);
            if (prefix !== null) {
              await db.setSetting(`numPrefix_${dt.value}`, prefix.trim() || dt.prefix);
            }
          }

          // Reload global MwSt rate
          if (typeof loadMwstRate === 'function') await loadMwstRate();

          // Kleinunternehmer-Änderung: Entwürfe anpassen, Versendete warnen
          const isKU = fd.has('kleinunternehmer');
          const allInvoices = await db.getAll(STORES.invoices);
          const drafts = allInvoices.filter(i => i.status === 'entwurf');
          const sent = allInvoices.filter(i => i.status !== 'entwurf');

          let draftCount = 0;
          for (const inv of drafts) {
            const shouldBe = isKU ? inv.totalNet : inv.totalNet * (1 + MWST_RATE);
            if (Math.abs((inv.totalGross || 0) - shouldBe) > 0.01) {
              inv.totalGross = shouldBe;
              inv.kleinunternehmer = isKU;
              inv.updatedAt = new Date().toISOString();
              await db.put(STORES.invoices, inv);
              draftCount++;
            }
          }

          // Prüfe ob versendete Belege betroffen sind
          let sentMismatch = 0;
          for (const inv of sent) {
            const shouldBe = isKU ? inv.totalNet : inv.totalNet * (1 + MWST_RATE);
            if (Math.abs((inv.totalGross || 0) - shouldBe) > 0.01) {
              sentMismatch++;
            }
          }

          if (draftCount > 0 || sentMismatch > 0) {
            let msg = 'Dokumenteinstellungen gespeichert. ';
            if (draftCount > 0) msg += `${draftCount} Entwurf/Entwürfe automatisch angepasst. `;
            if (sentMismatch > 0) msg += `⚠️ ${sentMismatch} bereits versendete/offene Belege wurden NICHT geändert – diese müssen ggf. storniert und neu erstellt werden.`;
            showToast(msg, sentMismatch > 0 ? 'info' : 'success');
          } else {
            showToast('Dokumenteinstellungen gespeichert');
          }
        };
      }

      // ── 6. Kalkulationseinstellungen Form ──
      const calcForm = document.getElementById('settings-calc-form');
      if (calcForm) {
        calcForm.onsubmit = async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          await db.setSetting('defaultHourlyRateMeister', parseFloat(fd.get('defaultHourlyRateMeister')) || 55);
          await db.setSetting('defaultHourlyRateGeselle', parseFloat(fd.get('defaultHourlyRateGeselle')) || 45);
          await db.setSetting('defaultMarkup', parseFloat(fd.get('defaultMarkup')) || 15);
          await db.setSetting('defaultAnfahrt', parseFloat(fd.get('defaultAnfahrt')) || 35);
          await db.setSetting('kmPauschale', parseFloat(fd.get('kmPauschale')) || 0.52);
          await db.setSetting('gewinnaufschlag', parseFloat(fd.get('gewinnaufschlag')) || 10);
          showToast('Kalkulationsvorgaben gespeichert');
        };
      }

      // ── 7. Dokumentvorlagen – Dropdown-Handler ──
      const tplSelect = document.getElementById('template-doctype-select');
      if (tplSelect) {
        tplSelect.onchange = async () => {
          const docType = tplSelect.value;
          const editor = document.getElementById('template-editor');
          if (!docType) {
            editor.classList.add('hidden');
            return;
          }
          editor.classList.remove('hidden');
          SettingsView._currentTemplateType = docType;

          const tpl = await getDocTemplate(docType);
          document.getElementById('tpl_subject').value = tpl.subject || '';
          document.getElementById('tpl_intro').value = tpl.intro || '';
          document.getElementById('tpl_closing').value = tpl.closing || '';
          document.getElementById('tpl_email').value = tpl.email || '';
        };
      }

      // ── 7. Dokumentvorlagen – Save-Handler ──
      const tplForm = document.getElementById('settings-template-form');
      if (tplForm) {
        tplForm.onsubmit = async (e) => {
          e.preventDefault();
          const docType = SettingsView._currentTemplateType;
          if (!docType) return;
          const fd = new FormData(e.target);
          await saveDocTemplate(docType, {
            label: (DEFAULT_TEMPLATES[docType] || {}).label || docType,
            subject: fd.get('tpl_subject'),
            intro: fd.get('tpl_intro'),
            closing: fd.get('tpl_closing'),
            email: fd.get('tpl_email'),
          });
          showToast('Vorlage gespeichert');
        };
      }
    }, 50);
  },

  // ── Internal state ──
  _currentTemplateType: null,

  // ── Helper: render text block rows ──
  _renderTextBlockRows(blocks) {
    if (!blocks || blocks.length === 0) {
      return '<tr><td colspan="5" class="text-center text-muted" style="padding:24px;">Keine Textbausteine gefunden</td></tr>';
    }
    const catMap = {};
    TEXT_BLOCK_CATEGORIES.forEach(c => { catMap[c.value] = c.label; });

    return blocks.map(b => {
      const isDefault = b.isDefault;
      return `<tr>
        <td style="font-family:monospace;font-size:0.85rem;">${escapeHtml(b.code)}</td>
        <td>${escapeHtml(catMap[b.category] || b.category || '–')}</td>
        <td>${escapeHtml(b.description)}</td>
        <td>${escapeHtml(b.unit || '–')}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-secondary btn-small" onclick="SettingsView.editTextBlock('${escapeHtml(b.id || '')}', ${isDefault ? 'true' : 'false'})" title="Bearbeiten">✏️</button>
            ${isDefault
              ? '<span title="Standard-Textbaustein" style="opacity:0.4;font-size:1.1rem;">🔒</span>'
              : `<button class="btn btn-danger btn-small" onclick="SettingsView.deleteTextBlock('${escapeHtml(b.id)}')" title="Löschen">🗑️</button>`
            }
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  // ── Filter/search text blocks ──
  async filterTextBlocks() {
    const query = (document.getElementById('textblock-search') || {}).value || '';
    const category = (document.getElementById('textblock-category-filter') || {}).value || '';
    const allBlocks = await getAllTextBlocks();
    const filtered = searchTextBlocks(allBlocks, query, category);
    const tbody = document.getElementById('textblock-tbody');
    if (tbody) {
      tbody.innerHTML = SettingsView._renderTextBlockRows(filtered);
    }
  },

  // ── Open text block modal (add/edit) ──
  async openTextBlockModal(existingBlock = null) {
    const isEdit = !!existingBlock;
    const title = isEdit ? 'Textbaustein bearbeiten' : 'Neuer Textbaustein';

    const catOptions = TEXT_BLOCK_CATEGORIES.map(c =>
      `<option value="${c.value}" ${existingBlock && existingBlock.category === c.value ? 'selected' : ''}>${escapeHtml(c.label)}</option>`
    ).join('');

    const typeOptions = CALC_POSITION_TYPES.map(t =>
      `<option value="${t.value}" ${existingBlock && existingBlock.type === t.value ? 'selected' : ''}>${escapeHtml(t.label)}</option>`
    ).join('');

    const html = `
      <form id="textblock-modal-form">
        <div class="form-group">
          <label>Code</label>
          <input type="text" name="code" value="${escapeHtml((existingBlock || {}).code || '')}" placeholder="z.B. INST-011" required style="font-family:monospace;" ${isEdit && existingBlock.isDefault ? 'readonly' : ''}>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Kategorie</label>
            <select name="category" required>
              <option value="">— Bitte wählen —</option>
              ${catOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Typ</label>
            <select name="type" required>
              ${typeOptions}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Beschreibung</label>
          <textarea name="description" rows="3" required placeholder="Leistungsbeschreibung">${escapeHtml((existingBlock || {}).description || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Einheit</label>
          <input type="text" name="unit" value="${escapeHtml((existingBlock || {}).unit || '')}" placeholder="z.B. Stk, m, Pausch, Std">
        </div>
        <input type="hidden" name="existingId" value="${escapeHtml((existingBlock || {}).id || '')}">
        <input type="hidden" name="isDefaultOverride" value="${existingBlock && existingBlock.isDefault ? '1' : '0'}">
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${isEdit ? 'Speichern' : 'Anlegen'}</button>
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        </div>
      </form>
    `;

    openModal(title, html);

    // Bind form handler after modal is rendered
    setTimeout(() => {
      const form = document.getElementById('textblock-modal-form');
      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const existingId = fd.get('existingId');
          const isDefaultOverride = fd.get('isDefaultOverride') === '1';

          const block = {
            id: isDefaultOverride ? generateId() : (existingId || generateId()),
            code: fd.get('code').trim(),
            category: fd.get('category'),
            type: fd.get('type'),
            description: fd.get('description').trim(),
            unit: fd.get('unit').trim(),
          };

          if (!block.code || !block.description) {
            showToast('Code und Beschreibung sind Pflichtfelder', 'error');
            return;
          }

          // If editing a non-default block, keep the same id
          if (existingId && !isDefaultOverride) {
            block.id = existingId;
          }

          await db.put(STORES.textBlocks, block);
          closeModal();
          showToast(existingId && !isDefaultOverride ? 'Textbaustein aktualisiert' : 'Textbaustein gespeichert');
          await SettingsView.filterTextBlocks();
        };
      }
    }, 50);
  },

  // ── Edit text block ──
  async editTextBlock(id, isDefault) {
    const allBlocks = await getAllTextBlocks();
    const block = allBlocks.find(b => b.id === id);
    if (!block) {
      showToast('Textbaustein nicht gefunden', 'error');
      return;
    }
    await SettingsView.openTextBlockModal(block);
  },

  // ── Delete text block ──
  async deleteTextBlock(id) {
    if (!confirm('Textbaustein wirklich löschen?')) return;
    await db.delete(STORES.textBlocks, id);
    showToast('Textbaustein gelöscht');
    await SettingsView.filterTextBlocks();
  },

  // ── Reset template to default ──
  async resetTemplate() {
    const docType = SettingsView._currentTemplateType;
    if (!docType) return;
    if (!confirm('Vorlage wirklich auf Standard zurücksetzen?')) return;
    await resetDocTemplate(docType);
    const tpl = await getDocTemplate(docType);
    document.getElementById('tpl_subject').value = tpl.subject || '';
    document.getElementById('tpl_intro').value = tpl.intro || '';
    document.getElementById('tpl_closing').value = tpl.closing || '';
    document.getElementById('tpl_email').value = tpl.email || '';
    showToast('Vorlage zurückgesetzt');
  },

  // ── Betriebsart Toggle ──
  async toggleBetriebsart() {
    const isKU = await db.getSetting('kleinunternehmer', false);
    const newMode = !isKU;

    if (newMode) {
      if (!confirm('Zu Kleinunternehmer wechseln?\n\n• Keine MwSt. mehr auf neuen Belegen\n• Bestehende Belege im Entwurf werden angepasst\n• Bereits versendete Belege bleiben unverändert')) return;
    } else {
      if (!confirm('Zu Regelbesteuerung wechseln?\n\n• MwSt. wird auf neuen Belegen ausgewiesen\n• Bestehende Belege im Entwurf werden angepasst')) return;
    }

    await db.setSetting('kleinunternehmer', newMode);
    await loadMwstRate();

    // Entwürfe automatisch anpassen
    const allInvoices = await db.getAll(STORES.invoices);
    let draftCount = 0;
    for (const inv of allInvoices) {
      if (inv.status === 'entwurf') {
        const positions = inv.positions || [];
        let newGross;
        if (newMode) {
          newGross = inv.totalNet;
        } else {
          const taxByRate = {};
          positions.forEach(p => {
            const rate = p.mwstRate != null ? p.mwstRate : 19;
            const posNet = (p.total || 0);
            taxByRate[rate] = (taxByRate[rate] || 0) + posNet * (rate / 100);
          });
          const totalTax = Object.values(taxByRate).reduce((s, v) => s + v, 0);
          newGross = Math.round((inv.totalNet + totalTax) * 100) / 100;
        }
        if (Math.abs((inv.totalGross || 0) - newGross) > 0.01) {
          inv.totalGross = newGross;
          inv.kleinunternehmer = newMode;
          inv.updatedAt = new Date().toISOString();
          await db.put(STORES.invoices, inv);
          draftCount++;
        }
      }
    }

    showToast(newMode
      ? `Kleinunternehmer aktiviert.${draftCount > 0 ? ` ${draftCount} Entwürfe angepasst.` : ''}`
      : `Regelbesteuerung aktiviert.${draftCount > 0 ? ` ${draftCount} Entwürfe angepasst.` : ''}`);
    app.refresh();
  },

  // ── Module Toggle ──
  async toggleModule(key, enabled) {
    await db.setSetting(key, enabled);
    await app.updateModuleVisibility();
    showToast(enabled ? 'Modul aktiviert' : 'Modul deaktiviert');
  },

  // ── AGB Upload ──
  async uploadAgb(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showToast('Bitte eine PDF-Datei wählen.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Die Datei ist zu groß. Maximal 5 MB erlaubt.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      await db.setSetting('agbPdf', e.target.result);
      showToast('AGB-PDF gespeichert');
      app.refresh();
    };
    reader.onerror = () => {
      showToast('Fehler beim Lesen der Datei.', 'error');
    };
    reader.readAsDataURL(file);
  },

  async removeAgb() {
    if (!confirm('AGB-PDF wirklich entfernen?')) return;
    await db.setSetting('agbPdf', '');
    showToast('AGB entfernt');
    app.refresh();
  },

  // ── QR Mode ──
  async setQRMode(mode) {
    await db.setSetting('qrMode', mode);
    document.querySelectorAll('.qr-mode-option').forEach(el => el.classList.remove('active'));
    document.querySelector(`.qr-mode-option input[value="${mode}"]`)?.closest('.qr-mode-option')?.classList.add('active');
    document.getElementById('qr-auto-section')?.classList.toggle('hidden', mode !== 'auto');
    document.getElementById('qr-custom-section')?.classList.toggle('hidden', mode !== 'custom');
    document.getElementById('qr-off-section')?.classList.toggle('hidden', mode !== 'off');
    showToast(mode === 'auto' ? 'QR-Code wird automatisch erstellt' : mode === 'custom' ? 'Eigener QR-Code aktiv' : 'QR-Code deaktiviert');
  },

  // ── Image Upload ──
  async uploadImage(input, settingKey) {
    const file = input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Das ist kein Bild. Bitte eine PNG oder JPG Datei wählen.', 'error');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast('Das Bild ist zu groß. Maximal 3 MB erlaubt.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      await db.setSetting(settingKey, e.target.result);
      const label = settingKey === 'companyLogo' ? 'Logo' : 'QR-Code';
      showToast(`${label} gespeichert`);
      app.refresh();
    };
    reader.onerror = () => {
      showToast('Fehler beim Lesen der Datei. Bitte nochmal versuchen.', 'error');
    };
    reader.readAsDataURL(file);
  },

  // ── Remove Logo ──
  async removeLogo() {
    if (!confirm('Logo wirklich entfernen?')) return;
    await db.setSetting('companyLogo', '');
    showToast('Logo entfernt');
    app.refresh();
  },

  // ── Remove Custom QR ──
  async removeCustomQR() {
    if (!confirm('QR-Code wirklich entfernen?')) return;
    await db.setSetting('customQR', '');
    showToast('QR-Code entfernt');
    app.refresh();
  },

  // ── Reset All Data ──
  async resetData() {
    if (!confirm('ACHTUNG: Alle Daten werden unwiderruflich gelöscht!\n\nVorher ein Backup erstellen?')) return;
    if (!confirm('Wirklich ALLE Daten löschen?\n\nDas kann NICHT rückgängig gemacht werden!')) return;

    const names = Object.values(STORES);
    for (const name of names) {
      const items = await db.getAll(name);
      for (const item of items) {
        await db.delete(name, item.id || item.key);
      }
    }
    showToast('Alle Daten gelöscht', 'info');
    app.navigate('dashboard');
  },

  // ── Load Demo Data ──
  async loadDemoData() {
    if (!confirm('Demo-Daten laden? Bestehende Daten werden nicht überschrieben.')) return;

    // Aktuelle Steuer-Einstellung berücksichtigen
    const isKU = await db.getSetting('kleinunternehmer', false);
    const currentMwst = await db.getSetting('mwstRate', 19);
    const calcGross = (net, positions) => {
      if (isKU) return net;
      let tax = 0;
      (positions || []).forEach(p => {
        const rate = p.mwstRate != null ? p.mwstRate : currentMwst;
        const df = 1 - ((p.discount || 0) / 100);
        tax += (p.quantity || 0) * (p.unitPrice || 0) * df * (rate / 100);
      });
      return Math.round((net + tax) * 100) / 100;
    };

    const customers = [
      { id: 'demo-k1', customerId: 'KND-0001', anrede: 'Herr', firstName: 'Thomas', name: 'Weber', type: 'privat', street: 'Musterstraße', houseNumber: '12', zip: '53111', city: 'Bonn', country: 'Deutschland', phone: '0171 1234567', email: 'weber@email.de', address: 'Musterstraße 12\n53111 Bonn', notes: 'Schlüssel liegt unter der Fußmatte', createdAt: '2026-01-15T10:00:00Z' },
      { id: 'demo-k2', customerId: 'KND-0002', anrede: 'Firma', name: 'Schneider Hausverwaltung GmbH', type: 'geschaeft', street: 'Industriestr.', houseNumber: '5', zip: '53121', city: 'Bonn', country: 'Deutschland', phone: '0228 9876543', email: 'info@hv-schneider.de', address: 'Industriestr. 5\n53121 Bonn', contact: 'Frau Meier', ustId: 'DE234567890', createdAt: '2026-01-20T10:00:00Z' },
      { id: 'demo-k3', customerId: 'KND-0003', anrede: 'Herr', firstName: 'Klaus', name: 'Hoffmann', type: 'geschaeft', street: 'Hauptstr.', houseNumber: '78', zip: '50667', city: 'Köln', country: 'Deutschland', phone: '0221 5551234', mobile: '0172 9876543', email: 'hoffmann@baeckerei.de', address: 'Hauptstr. 78\n50667 Köln', notes: 'Bäckerei Hoffmann, Anlieferung nur vor 6 Uhr', createdAt: '2026-02-01T10:00:00Z' },
      { id: 'demo-k4', customerId: 'KND-0004', anrede: 'Firma', name: 'Stadtwerke Bonn AöR', type: 'behoerde', street: 'Welschnonnenstr.', houseNumber: '4', zip: '53111', city: 'Bonn', country: 'Deutschland', phone: '0228 7114000', email: 'technik@swb-bonn.de', address: 'Welschnonnenstr. 4\n53111 Bonn', contact: 'Hr. Dr. Fischer, Abt. Technik', ustId: 'DE345678901', createdAt: '2026-02-15T10:00:00Z' },
      { id: 'demo-k5', customerId: 'KND-0005', anrede: 'Frau', firstName: 'Maria', name: 'Schulz', type: 'privat', street: 'Lindenweg', houseNumber: '7', zip: '30629', city: 'Hannover', country: 'Deutschland', phone: '0511 4445566', email: 'm.schulz@web.de', address: 'Lindenweg 7\n30629 Hannover', notes: 'Bestandskundin, immer zufrieden', createdAt: '2026-02-20T10:00:00Z' },
      { id: 'demo-k6', customerId: 'KND-0006', anrede: 'Herr', firstName: 'Stefan', name: 'Richter', type: 'geschaeft', street: 'Gewerbepark', houseNumber: '15a', zip: '30659', city: 'Hannover', country: 'Deutschland', phone: '0511 7788990', mobile: '0176 1112233', email: 'richter@richter-bau.de', address: 'Gewerbepark 15a\n30659 Hannover', contact: 'Richter Bau GmbH', ustId: 'DE456789012', createdAt: '2026-03-01T10:00:00Z' },
    ];

    const projects = [
      { id: 'demo-p1', projectId: 'PRJ-2026-0001', title: 'Elektroinstallation Neubau Weber', customerId: 'demo-k1', status: 'in-arbeit', address: 'Musterstraße 12, 53111 Bonn', startDate: '2026-02-01', budget: 6000, description: 'Komplette Neuinstallation EG + OG', notes: 'Zählerschrank muss erneuert werden.', createdAt: '2026-01-15T10:00:00Z' },
      { id: 'demo-p2', projectId: 'PRJ-2026-0002', title: 'Treppenhausbeleuchtung MFH', customerId: 'demo-k2', status: 'kalkulation', address: 'Industriestr. 5, 53121 Bonn', description: 'LED-Umrüstung 4 Etagen, Bewegungsmelder nachrüsten', createdAt: '2026-02-10T10:00:00Z' },
      { id: 'demo-p3', projectId: 'PRJ-2026-0003', title: 'Starkstromanschluss Backofen', customerId: 'demo-k3', status: 'beauftragt', address: 'Hauptstr. 78, 50667 Köln', startDate: '2026-03-15', budget: 800, description: 'CEE-Anschluss für neuen Gewerbeofen', createdAt: '2026-03-01T10:00:00Z' },
      { id: 'demo-p4', projectId: 'PRJ-2026-0004', title: 'E-Check Bürogebäude', customerId: 'demo-k4', status: 'abnahme', address: 'Welschnonnenstr. 4, 53111 Bonn', startDate: '2026-03-05', description: 'Jährliche Prüfung nach DGUV V3, 3 Etagen', createdAt: '2026-03-05T10:00:00Z' },
      { id: 'demo-p5', projectId: 'PRJ-2026-0005', title: 'PV-Anlage 10 kWp Schulz', customerId: 'demo-k5', status: 'anfrage', address: 'Lindenweg 7, 30629 Hannover', budget: 15000, description: 'Photovoltaikanlage Süddach, inkl. Speicher', createdAt: '2026-03-10T10:00:00Z' },
      { id: 'demo-p6', projectId: 'PRJ-2026-0006', title: 'Büroausbau Richter Bau', customerId: 'demo-k6', status: 'abgeschlossen', address: 'Gewerbepark 15a, 30659 Hannover', startDate: '2026-01-10', endDate: '2026-02-28', budget: 12000, description: 'Komplette Elektroinstallation Büroetage, 8 Arbeitsplätze', createdAt: '2026-01-05T10:00:00Z' },
    ];

    const articles = [
      { id: 'demo-a1', name: 'NYM-J 3x1,5mm² (100m)', ean: '4014427123456', supplier: 'Sonepar', purchasePrice: 89.00, salePrice: 115.00, stock: 5, minStock: 2, location: 'Regal A1', createdAt: '2026-01-01T10:00:00Z' },
      { id: 'demo-a2', name: 'NYM-J 5x2,5mm² (100m)', ean: '4014427123457', supplier: 'Sonepar', purchasePrice: 175.00, salePrice: 220.00, stock: 3, minStock: 1, location: 'Regal A1', createdAt: '2026-01-01T10:00:00Z' },
      { id: 'demo-a3', name: 'Schalterdose UP Ø68mm', ean: '4014427654321', supplier: 'Rexel', purchasePrice: 0.35, salePrice: 0.60, stock: 150, minStock: 50, location: 'Regal B2', createdAt: '2026-01-01T10:00:00Z' },
      { id: 'demo-a4', name: 'Steckdose Berker S.1 reinweiß', ean: '4011334987654', supplier: 'Sonepar', purchasePrice: 3.20, salePrice: 5.80, stock: 40, minStock: 20, location: 'Regal C1', createdAt: '2026-01-01T10:00:00Z' },
      { id: 'demo-a5', name: 'LED-Panel 60x60 40W 4000K', ean: '4260123456789', supplier: 'Rexel', purchasePrice: 28.50, salePrice: 45.00, stock: 8, minStock: 4, location: 'Regal D3', createdAt: '2026-01-01T10:00:00Z' },
      { id: 'demo-a6', name: 'FI/LS 2p B16 30mA', ean: '4012345678901', supplier: 'Sonepar', purchasePrice: 32.00, salePrice: 48.00, stock: 6, minStock: 3, location: 'Regal E1', createdAt: '2026-01-01T10:00:00Z' },
      { id: 'demo-a7', name: 'Zählerschrank 3-reihig', ean: '4098765432100', supplier: 'Sonepar', purchasePrice: 185.00, salePrice: 280.00, stock: 1, minStock: 1, location: 'Lager Keller', createdAt: '2026-01-01T10:00:00Z' },
      { id: 'demo-a8', name: 'Kabelkanal 40x60 2m weiß', ean: '4055667788990', supplier: 'Rexel', purchasePrice: 4.50, salePrice: 7.50, stock: 0, minStock: 10, location: 'Regal A3', createdAt: '2026-01-01T10:00:00Z' },
    ];

    const calcPositions = [
      { type: 'material', description: 'NYM-J 3x1,5mm² (3 Ringe)', unit: 'Rolle', quantity: 3, unitPrice: 115.00, mwstRate: 19, discount: 0, total: 345.00, cost: 267.00 },
      { type: 'material', description: 'NYM-J 5x2,5mm² (2 Ringe)', unit: 'Rolle', quantity: 2, unitPrice: 220.00, mwstRate: 19, discount: 0, total: 440.00, cost: 350.00 },
      { type: 'material', description: 'Schalterdosen UP (80 Stk)', unit: 'Stück', quantity: 80, unitPrice: 0.60, mwstRate: 19, discount: 0, total: 48.00, cost: 28.00 },
      { type: 'material', description: 'Steckdosen Berker S.1', unit: 'Stück', quantity: 40, unitPrice: 5.80, mwstRate: 19, discount: 0, total: 232.00, cost: 128.00 },
      { type: 'material', description: 'FI/LS B16 30mA', unit: 'Stück', quantity: 6, unitPrice: 48.00, mwstRate: 19, discount: 0, total: 288.00, cost: 192.00 },
      { type: 'material', description: 'Zählerschrank 3-reihig', unit: 'Stück', quantity: 1, unitPrice: 280.00, mwstRate: 19, discount: 0, total: 280.00, cost: 185.00 },
      { type: 'stunden', description: 'Elektroinstallation komplett', unit: 'Stunde', quantity: 48, unitPrice: 55.00, mwstRate: 19, discount: 0, total: 2640.00, cost: 0 },
      { type: 'pauschale', description: 'Zählerschrankumbau', unit: 'Pauschal', quantity: 1, unitPrice: 350.00, mwstRate: 19, discount: 0, total: 350.00, cost: 0 },
      { type: 'nebenkosten', description: 'Anfahrt (5 Tage)', unit: 'Pauschal', quantity: 5, unitPrice: 35.00, mwstRate: 19, discount: 0, total: 175.00, cost: 0 },
    ];
    const calcPositionsRichter = [
      { type: 'material', description: 'Elektroinstallation Büroetage komplett', unit: 'Pauschal', quantity: 1, unitPrice: 8500.00, mwstRate: isKU ? 0 : 19, discount: 0, total: 8500.00, cost: 5100.00 },
      { type: 'material', description: 'Netzwerkverkabelung Cat7', unit: 'Stück', quantity: 8, unitPrice: 85.00, mwstRate: isKU ? 0 : 19, discount: 0, total: 680.00, cost: 340.00 },
      { type: 'material', description: 'LED-Einbaustrahler', unit: 'Stück', quantity: 32, unitPrice: 45.00, mwstRate: isKU ? 0 : 19, discount: 0, total: 1440.00, cost: 912.00 },
      { type: 'nebenkosten', description: 'Anfahrt', unit: 'Pauschal', quantity: 10, unitPrice: 35.00, mwstRate: isKU ? 0 : 19, discount: 0, total: 350.00, cost: 0 },
    ];
    const calculations = [
      { id: 'demo-c1', projectId: 'demo-p1', title: 'Hauptkalkulation EG+OG', positions: calcPositions, totalNet: 4798.00, totalCost: 1150.00, createdAt: '2026-01-20T10:00:00Z' },
      { id: 'demo-c2', projectId: 'demo-p6', title: 'Kalkulation Büroausbau', positions: calcPositionsRichter, totalNet: 10970.00, totalCost: 6352.00, createdAt: '2026-01-08T10:00:00Z' },
    ];

    const invPos = calcPositions.map(p => ({ description: p.description, quantity: p.quantity, unit: p.unit, unitPrice: p.unitPrice, mwstRate: isKU ? 0 : (p.mwstRate || 19), discount: 0, total: p.total, type: p.type }));

    const kvPositions = [
      { description: 'LED-Panel 60x60 40W', unit: 'Stück', quantity: 16, unitPrice: 45.00, mwstRate: isKU ? 0 : 19, discount: 0, total: 720.00 },
      { description: 'Bewegungsmelder', unit: 'Stück', quantity: 8, unitPrice: 35.00, mwstRate: isKU ? 0 : 19, discount: 0, total: 280.00 },
      { description: 'Montage und Verkabelung', unit: 'Stunde', quantity: 24, unitPrice: 55.00, mwstRate: isKU ? 0 : 19, discount: 0, total: 1320.00 },
      { description: 'Anfahrt', unit: 'Pauschal', quantity: 3, unitPrice: 35.00, mwstRate: isKU ? 0 : 19, discount: 0, total: 105.00 },
    ];

    const lsPositions = [
      { description: 'NYM-J 5x2,5mm² (1 Ring)', unit: 'Rolle', quantity: 1, unitPrice: 220.00, mwstRate: isKU ? 0 : 19, discount: 0, total: 220.00 },
      { description: 'Herdanschlussdose 5-polig', unit: 'Stück', quantity: 1, unitPrice: 12.50, mwstRate: isKU ? 0 : 19, discount: 0, total: 12.50 },
      { description: 'FI/LS B16 30mA', unit: 'Stück', quantity: 1, unitPrice: 48.00, mwstRate: isKU ? 0 : 19, discount: 0, total: 48.00 },
    ];

    const rePositions = [
      { description: 'Komplette Elektroinstallation Büroetage', unit: 'Pauschal', quantity: 1, unitPrice: 8500.00, mwstRate: isKU ? 0 : 19, discount: 0, total: 8500.00 },
      { description: 'Netzwerkverkabelung Cat7 (8 Doppeldosen)', unit: 'Stück', quantity: 8, unitPrice: 85.00, mwstRate: isKU ? 0 : 19, discount: 0, total: 680.00 },
      { description: 'LED-Einbaustrahler', unit: 'Stück', quantity: 32, unitPrice: 45.00, mwstRate: isKU ? 0 : 19, discount: 5, total: 1368.00 },
      { description: 'Anfahrt', unit: 'Pauschal', quantity: 10, unitPrice: 35.00, mwstRate: isKU ? 0 : 19, discount: 0, total: 350.00 },
    ];

    const invoices = [
      // Projekt 1: Komplette Kette AG → AB → RE (mit Skonto)
      {
        id: 'demo-i1', number: 'AG-2026-0001', type: 'angebot', status: 'gesendet',
        date: '2026-01-22', dueDate: '2026-02-21', projectId: 'demo-p1', projectTitle: 'Elektroinstallation Neubau Weber',
        customerName: 'Herr Thomas Weber', customerAddress: 'Musterstraße 12\n53111 Bonn',
        positions: invPos, totalNet: 4798.00, totalGross: calcGross(4798, invPos),
        kleinunternehmer: isKU,
        skontoEnabled: true, skontoRate: 2, skontoFrist: 10,
        createdAt: '2026-01-22T10:00:00Z',
      },
      {
        id: 'demo-i2', number: 'AB-2026-0001', type: 'auftragsbestaetigung', status: 'gesendet',
        date: '2026-02-01', projectId: 'demo-p1', projectTitle: 'Elektroinstallation Neubau Weber',
        customerName: 'Herr Thomas Weber', customerAddress: 'Musterstraße 12\n53111 Bonn',
        positions: invPos, totalNet: 4798.00, totalGross: calcGross(4798, invPos),
        kleinunternehmer: isKU,
        skontoEnabled: true, skontoRate: 2, skontoFrist: 10,
        basedOnId: 'demo-i1', createdAt: '2026-02-01T10:00:00Z',
      },
      {
        id: 'demo-i3', number: 'RE-2026-0001', type: 'rechnung', status: 'offen',
        date: '2026-03-10', dueDate: '2026-03-24', serviceFrom: '2026-02-01', serviceTo: '2026-03-08',
        projectId: 'demo-p1', projectTitle: 'Elektroinstallation Neubau Weber',
        customerName: 'Herr Thomas Weber', customerAddress: 'Musterstraße 12\n53111 Bonn',
        positions: invPos, totalNet: 4798.00, totalGross: calcGross(4798, invPos),
        kleinunternehmer: isKU,
        skontoEnabled: true, skontoRate: 2, skontoFrist: 10,
        basedOnId: 'demo-i2', createdAt: '2026-03-10T10:00:00Z',
      },

      // Projekt 2: KV (Hausverwaltung, Geschäftskunde)
      {
        id: 'demo-i4', number: 'KV-2026-0001', type: 'kostenvoranschlag', status: 'gesendet',
        date: '2026-02-12', dueDate: '2026-03-14', projectId: 'demo-p2', projectTitle: 'Treppenhausbeleuchtung MFH',
        customerName: 'Schneider Hausverwaltung GmbH', customerAddress: 'Industriestr. 5\n53121 Bonn',
        positions: kvPositions, totalNet: 2425.00, totalGross: calcGross(2425, kvPositions),
        kleinunternehmer: isKU,
        createdAt: '2026-02-12T10:00:00Z',
      },

      // Projekt 3: Lieferschein (Bäckerei)
      {
        id: 'demo-i5', number: 'LS-2026-0001', type: 'lieferschein', status: 'gesendet',
        date: '2026-03-08', projectId: 'demo-p3', projectTitle: 'Starkstromanschluss Backofen',
        customerName: 'Herr Klaus Hoffmann', customerAddress: 'Hauptstr. 78\n50667 Köln',
        positions: lsPositions, totalNet: 280.50, totalGross: calcGross(280.50, lsPositions),
        kleinunternehmer: isKU,
        createdAt: '2026-03-08T10:00:00Z',
      },

      // Projekt 6: Bezahlte Rechnung (Richter Bau, abgeschlossen)
      {
        id: 'demo-i6', number: 'RE-2026-0002', type: 'rechnung', status: 'bezahlt',
        date: '2026-02-28', dueDate: '2026-03-14', serviceFrom: '2026-01-10', serviceTo: '2026-02-28',
        projectId: 'demo-p6', projectTitle: 'Büroausbau Richter Bau',
        customerName: 'Herr Stefan Richter', customerAddress: 'Gewerbepark 15a\n30659 Hannover',
        positions: rePositions, totalNet: 10898.00, totalGross: calcGross(10898, rePositions),
        kleinunternehmer: isKU,
        paidDate: '2026-03-10', paidAmount: calcGross(10898, rePositions),
        skontoEnabled: false,
        createdAt: '2026-02-28T10:00:00Z',
      },
    ];

    for (const c of customers) await db.put(STORES.customers, c);
    for (const p of projects) await db.put(STORES.projects, p);
    for (const a of articles) await db.put(STORES.articles, a);
    for (const c of calculations) await db.put(STORES.calculations, c);
    for (const i of invoices) await db.put(STORES.invoices, i);

    showToast('Demo-Daten geladen!');
    app.navigate('dashboard');
  },

  async removeDemoData() {
    if (!confirm('Alle Demo-Daten löschen? Deine eigenen Daten bleiben erhalten.')) return;

    const demoPrefix = 'demo-';
    const stores = [STORES.customers, STORES.projects, STORES.calculations, STORES.articles, STORES.invoices, STORES.stockMovements];
    let count = 0;

    for (const storeName of stores) {
      const items = await db.getAll(storeName);
      for (const item of items) {
        if (item.id && item.id.startsWith(demoPrefix)) {
          await db.delete(storeName, item.id);
          count++;
        }
      }
    }

    showToast(`${count} Demo-Datensätze gelöscht`, 'info');
    app.navigate('dashboard');
  }
};
