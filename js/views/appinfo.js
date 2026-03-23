// ============================================
// ElektroHub – App-Info / Über / Rechtliches
// ============================================

const AppInfoView = {
  async render() {
    // Firmendaten für Impressum laden
    const appUrl = await db.getSetting('appUrl', '');
    const companyName = await db.getSetting('companyName', '');
    const companyOwner = await db.getSetting('companyOwner', '');
    const companyAddress = await db.getSetting('companyAddress', '');
    const companyPhone = await db.getSetting('companyPhone', '');
    const companyEmail = await db.getSetting('companyEmail', '');
    const companyWebsite = await db.getSetting('companyWebsite', '');
    const taxNumber = await db.getSetting('taxNumber', '');
    const ustId = await db.getSetting('ustId', '');
    const handwerksrollenNr = await db.getSetting('handwerksrollenNr', '');

    // System-Info
    const sysInfo = {
      browser: navigator.userAgent.split(' ').pop() || navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screen: `${screen.width}×${screen.height}`,
      colorDepth: `${screen.colorDepth} Bit`,
      online: navigator.onLine ? 'Ja' : 'Nein',
    };

    // DB-Stats
    const stats = {
      customers: (await db.getAll(STORES.customers)).length,
      projects: (await db.getAll(STORES.projects)).length,
      invoices: (await db.getAll(STORES.invoices)).length,
      calculations: (await db.getAll(STORES.calculations)).length,
    };

    const hasImpressum = companyName || companyOwner || companyAddress;

    return `
      <div class="page-header">
        <div>
          <h2>Über ElektroHub</h2>
          <p class="page-subtitle">App-Informationen, Rechtliches & Changelog</p>
        </div>
        <button class="btn btn-secondary" onclick="app.navigate('dashboard')">← Zurück</button>
      </div>

      <!-- Über die App -->
      <div class="card">
        <div style="display:flex;align-items:center;gap:20px;">
          <div style="font-size:3rem;min-width:60px;text-align:center;">⚡</div>
          <div>
            <h3 style="margin-bottom:2px;">ElektroHub</h3>
            <p class="text-muted" style="font-size:0.9rem;">Betriebsverwaltung für Elektro-Fachbetriebe</p>
            <div class="mt-8" style="display:flex;gap:12px;flex-wrap:wrap;">
              <span class="badge badge-blue">Version ${APP_VERSION}</span>
              <span class="badge badge-gray">Build ${APP_BUILD}</span>
            </div>
          </div>
        </div>
        <p style="margin-top:16px;color:var(--gray-600);font-size:0.9rem;line-height:1.6;">
          ElektroHub hilft dir bei der Verwaltung deines Elektro-Fachbetriebs: Kunden, Projekte, Kalkulationen, Angebote, Rechnungen, Mahnungen und mehr – alles in einer App, direkt im Browser.
        </p>
      </div>

      <!-- App QR-Code -->
      <div class="card setup-card">
        <div class="setup-header">
          <div>
            <h3>App teilen</h3>
            <p class="text-muted text-small">QR-Code zum Teilen der App mit Kollegen oder Kunden</p>
          </div>
        </div>
        <div class="setup-body">
          ${appUrl ? `
            <div style="display:flex;align-items:flex-start;gap:24px;flex-wrap:wrap;">
              <div style="padding:16px;background:white;border:2px solid var(--gray-200);border-radius:12px;display:inline-block;">
                <img src="${QRCode.toDataURL(appUrl, 5, 4)}" style="width:180px;height:180px;display:block;" alt="App QR-Code">
              </div>
              <div style="flex:1;min-width:200px;">
                <p style="font-size:0.95rem;font-weight:600;margin-bottom:4px;">ElektroHub öffnen</p>
                <p class="text-small text-muted mb-8">QR-Code scannen oder Link kopieren:</p>
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">
                  <input type="text" value="${escapeHtml(appUrl)}" readonly style="flex:1;font-size:0.85rem;padding:6px 10px;border:1px solid var(--gray-300);border-radius:6px;background:var(--gray-50);font-family:monospace;">
                  <button class="btn btn-small btn-primary" onclick="navigator.clipboard.writeText('${escapeHtml(appUrl)}');showToast('Link kopiert');">Kopieren</button>
                </div>
                <div class="btn-group">
                  <button class="btn btn-small btn-secondary" onclick="AppInfoView.downloadQR()">QR-Code herunterladen</button>
                  <button class="btn btn-small btn-secondary" onclick="AppInfoView.printQR()">QR-Code drucken</button>
                </div>
              </div>
            </div>
          ` : `
            <div style="text-align:center;padding:20px;">
              <p class="text-muted mb-16">Trage die URL deiner App ein, um einen QR-Code zu generieren.</p>
              <div style="max-width:500px;margin:0 auto;">
                <form onsubmit="AppInfoView.saveAppUrl(event)">
                  <div style="display:flex;gap:8px;">
                    <input type="url" name="url" placeholder="https://meine-firma.de/elektrohub/" required style="flex:1;padding:10px 14px;border:1px solid var(--gray-300);border-radius:8px;font-size:0.95rem;">
                    <button type="submit" class="btn btn-primary">QR-Code erstellen</button>
                  </div>
                  <p class="text-small text-muted mt-8">Das ist die Web-Adresse, unter der ElektroHub erreichbar ist (z.B. wenn du es auf einem Webserver hostest oder per TestFlight/Link teilst).</p>
                </form>
              </div>
            </div>
          `}
        </div>
      </div>

      <!-- Pflicht: Impressum -->
      <div class="card setup-card">
        <div class="setup-header">
          <div>
            <h3>Impressum</h3>
            <p class="text-muted text-small">Angaben gemäß § 5 TMG / § 5 DDG</p>
          </div>
        </div>
        <div class="setup-body">
          ${hasImpressum ? `
            <div style="line-height:1.8;font-size:0.95rem;">
              ${companyName ? `<strong>${escapeHtml(companyName)}</strong><br>` : ''}
              ${companyOwner ? `Inhaber: ${escapeHtml(companyOwner)}<br>` : ''}
              ${companyAddress ? `${escapeHtml(companyAddress).replace(/\n/g, '<br>')}<br>` : ''}
              ${companyPhone ? `Tel: ${escapeHtml(companyPhone)}<br>` : ''}
              ${companyEmail ? `E-Mail: <a href="mailto:${escapeHtml(companyEmail)}">${escapeHtml(companyEmail)}</a><br>` : ''}
              ${companyWebsite ? `Web: <a href="${escapeHtml(companyWebsite)}" target="_blank">${escapeHtml(companyWebsite)}</a><br>` : ''}
              ${taxNumber ? `<br>Steuernummer: ${escapeHtml(taxNumber)}<br>` : ''}
              ${ustId ? `USt-IdNr.: ${escapeHtml(ustId)}<br>` : ''}
              ${handwerksrollenNr ? `Handwerksrollennummer: ${escapeHtml(handwerksrollenNr)}<br>` : ''}
            </div>
          ` : `
            <div class="alert-banner alert-warning">
              <strong>Impressum nicht vollständig.</strong> Bitte trage deine Firmendaten in den <a href="#" onclick="app.navigate('settings');return false;">Einstellungen</a> ein.
            </div>
          `}
        </div>
      </div>

      <!-- Pflicht: Datenschutz & Nutzungsbedingungen -->
      <div class="card setup-card">
        <div class="setup-header">
          <div>
            <h3>Rechtliches</h3>
          </div>
        </div>
        <div class="setup-body">
          <div class="info-box" style="margin-bottom:16px;">
            <strong>Datenschutz:</strong> Alle Daten werden ausschließlich lokal in deinem Browser (IndexedDB) gespeichert. Es werden keine Daten an externe Server übertragen. Es gibt keine Tracking-Cookies, keine Analyse-Tools und keine Werbung.
          </div>

          <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="padding:12px 16px;background:var(--gray-50);border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong>Datenschutzerklärung</strong>
                <p class="text-small text-muted">Informationen zur Verarbeitung personenbezogener Daten</p>
              </div>
              <span class="badge badge-green">Keine externen Daten</span>
            </div>

            <div style="padding:12px 16px;background:var(--gray-50);border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong>Nutzungsbedingungen</strong>
                <p class="text-small text-muted">Kostenlose Nutzung, keine Gewährleistung für Berechnungen</p>
              </div>
              <span class="badge badge-gray">Lokal</span>
            </div>

            <div style="padding:12px 16px;background:var(--gray-50);border-radius:8px;">
              <strong>Haftungsausschluss</strong>
              <p class="text-small text-muted" style="margin-top:4px;line-height:1.6;">
                ElektroHub ist ein Hilfsmittel zur Betriebsverwaltung. Alle Berechnungen (MwSt., Skonto, Brutto/Netto) werden nach bestem Wissen durchgeführt, ersetzen aber keine steuerliche Beratung. Für die Richtigkeit der Berechnungen und die Einhaltung gesetzlicher Vorgaben (GoBD, UStG) ist der Anwender verantwortlich. Bitte prüfe wichtige Belege vor dem Versand.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Kontakt / Support -->
      <div class="card setup-card">
        <div class="setup-header">
          <div>
            <h3>Kontakt & Support</h3>
          </div>
        </div>
        <div class="setup-body">
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${companyEmail ? `
            <a href="mailto:${escapeHtml(companyEmail)}?subject=ElektroHub%20Support" style="text-decoration:none;">
              <div style="padding:12px 16px;background:var(--primary-light);border-radius:8px;display:flex;align-items:center;gap:12px;cursor:pointer;">
                <span style="font-size:1.3rem;">📧</span>
                <div>
                  <strong style="color:var(--primary-dark);">E-Mail senden</strong>
                  <p class="text-small" style="color:var(--primary-dark);">${escapeHtml(companyEmail)}</p>
                </div>
              </div>
            </a>
            ` : ''}
            <div style="padding:12px 16px;background:var(--gray-50);border-radius:8px;display:flex;align-items:center;gap:12px;cursor:pointer;" onclick="AppInfoView.copySupportInfo()">
              <span style="font-size:1.3rem;">📋</span>
              <div>
                <strong>Support-Info kopieren</strong>
                <p class="text-small text-muted">Version, Browser und Datenbank-Info in die Zwischenablage kopieren</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Open Source -->
      <div class="card setup-card">
        <div class="setup-header">
          <div>
            <h3>Technologie & Lizenzen</h3>
          </div>
        </div>
        <div class="setup-body">
          <p style="color:var(--gray-600);font-size:0.9rem;line-height:1.6;margin-bottom:12px;">
            ElektroHub ist eine reine Browser-App ohne externe Abhängigkeiten. Alle Komponenten sind eigenentwickelt:
          </p>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Komponente</th><th>Beschreibung</th><th>Lizenz</th></tr></thead>
              <tbody>
                <tr><td><strong>ElektroHub App</strong></td><td>Vanilla JavaScript, HTML, CSS</td><td>Proprietär</td></tr>
                <tr><td><strong>QR-Code Generator</strong></td><td>Eigener SVG-basierter QR-Code (EPC/GiroCode)</td><td>Intern</td></tr>
                <tr><td><strong>Charts</strong></td><td>Eigene SVG-Diagramme (Balken, Torte)</td><td>Intern</td></tr>
                <tr><td><strong>Datenbank</strong></td><td>Browser IndexedDB (kein Server)</td><td>Web-Standard</td></tr>
              </tbody>
            </table>
          </div>
          <p class="text-small text-muted mt-8">Keine Third-Party-Bibliotheken. Keine npm-Pakete. Keine externen CDNs.</p>
        </div>
      </div>

      <!-- Changelog -->
      <div class="card setup-card">
        <div class="setup-header">
          <div>
            <h3>Changelog – Was ist neu?</h3>
          </div>
        </div>
        <div class="setup-body">
          ${CHANGELOG.map(entry => `
            <div style="margin-bottom:20px;${entry !== CHANGELOG[0] ? 'padding-top:20px;border-top:1px solid var(--gray-200);' : ''}">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <span class="badge ${entry === CHANGELOG[0] ? 'badge-blue' : 'badge-gray'}" style="font-size:0.85rem;">v${escapeHtml(entry.version)}</span>
                <span class="text-small text-muted">${formatDate(entry.date)}</span>
                ${entry === CHANGELOG[0] ? '<span class="badge badge-green">Aktuell</span>' : ''}
              </div>
              <ul style="margin:0 0 0 18px;color:var(--gray-600);font-size:0.88rem;line-height:1.7;">
                ${entry.changes.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- System-Info & Datenbank -->
      <div class="card setup-card">
        <div class="setup-header">
          <div>
            <h3>System-Info</h3>
            <p class="text-muted text-small">Hilfreich für Support-Anfragen</p>
          </div>
        </div>
        <div class="setup-body">
          <div class="form-row">
            <div>
              <table class="text-small">
                <tbody>
                  <tr><td style="padding:4px 16px 4px 0;color:var(--gray-500);">Version</td><td><strong>${APP_VERSION}</strong> (Build ${APP_BUILD})</td></tr>
                  <tr><td style="padding:4px 16px 4px 0;color:var(--gray-500);">Browser</td><td>${escapeHtml(sysInfo.browser)}</td></tr>
                  <tr><td style="padding:4px 16px 4px 0;color:var(--gray-500);">Plattform</td><td>${escapeHtml(sysInfo.platform)}</td></tr>
                  <tr><td style="padding:4px 16px 4px 0;color:var(--gray-500);">Bildschirm</td><td>${sysInfo.screen} (${sysInfo.colorDepth})</td></tr>
                  <tr><td style="padding:4px 16px 4px 0;color:var(--gray-500);">Sprache</td><td>${escapeHtml(sysInfo.language)}</td></tr>
                  <tr><td style="padding:4px 16px 4px 0;color:var(--gray-500);">Online</td><td>${sysInfo.online}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <table class="text-small">
                <tbody>
                  <tr><td style="padding:4px 16px 4px 0;color:var(--gray-500);">Kunden</td><td><strong>${stats.customers}</strong></td></tr>
                  <tr><td style="padding:4px 16px 4px 0;color:var(--gray-500);">Projekte</td><td><strong>${stats.projects}</strong></td></tr>
                  <tr><td style="padding:4px 16px 4px 0;color:var(--gray-500);">Belege</td><td><strong>${stats.invoices}</strong></td></tr>
                  <tr><td style="padding:4px 16px 4px 0;color:var(--gray-500);">Kalkulationen</td><td><strong>${stats.calculations}</strong></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align:center;padding:24px 0;color:var(--gray-400);font-size:0.8rem;">
        ElektroHub v${APP_VERSION} · Alle Daten lokal im Browser gespeichert<br>
        Keine Server · Keine Cookies · Keine Werbung
      </div>
    `;
  },

  async copySupportInfo() {
    const stats = {
      customers: (await db.getAll(STORES.customers)).length,
      projects: (await db.getAll(STORES.projects)).length,
      invoices: (await db.getAll(STORES.invoices)).length,
    };
    const text = [
      `ElektroHub v${APP_VERSION} (Build ${APP_BUILD})`,
      `Browser: ${navigator.userAgent}`,
      `Plattform: ${navigator.platform}`,
      `Bildschirm: ${screen.width}×${screen.height}`,
      `Sprache: ${navigator.language}`,
      `Daten: ${stats.customers} Kunden, ${stats.projects} Projekte, ${stats.invoices} Belege`,
      `Datum: ${new Date().toISOString()}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      showToast('Support-Info in Zwischenablage kopiert');
    } catch (e) {
      openModal('Support-Info', `<textarea style="width:100%;height:200px;font-family:monospace;font-size:0.85rem;">${escapeHtml(text)}</textarea>`);
    }
  },

  async saveAppUrl(e) {
    e.preventDefault();
    const url = new FormData(e.target).get('url');
    if (!url) return;
    await db.setSetting('appUrl', url.trim());
    showToast('App-URL gespeichert – QR-Code erstellt');
    app.refresh();
  },

  async downloadQR() {
    const appUrl = await db.getSetting('appUrl', '');
    if (!appUrl) return;
    const svg = QRCode.toSVG(appUrl, 8, 8);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ElektroHub-QR-Code.svg';
    a.click();
    URL.revokeObjectURL(url);
    showToast('QR-Code heruntergeladen');
  },

  async printQR() {
    const appUrl = await db.getSetting('appUrl', '');
    if (!appUrl) return;
    const qrImg = QRCode.toDataURL(appUrl, 8, 8);
    const w = window.open('', '_blank');
    w.document.write(`
      <!DOCTYPE html>
      <html><head><title>ElektroHub QR-Code</title>
      <style>
        body { margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:Arial,sans-serif; }
        @media print { body { margin:0; } }
      </style></head>
      <body>
        <img src="${qrImg}" style="width:300px;height:300px;" alt="QR-Code">
        <p style="margin-top:20px;font-size:14pt;font-weight:bold;">⚡ ElektroHub</p>
        <p style="font-size:10pt;color:#666;">${escapeHtml(appUrl)}</p>
        <p style="font-size:9pt;color:#999;margin-top:8px;">QR-Code scannen um die App zu öffnen</p>
      </body></html>
    `);
    w.document.close();
    w.print();
  }
};
