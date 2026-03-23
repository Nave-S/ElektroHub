// ============================================
// ElektroHub – Dashboard View
// ============================================

const DashboardView = {
  async render() {
    const lagerEnabled = await db.getSetting('lagerEnabled', false);

    // Smarte Hinweise laden (prüft auch Berechnungen)
    const hints = await Validator.getSmartHints();

    const promises = [
      db.getAll(STORES.projects),
      db.getAll(STORES.customers),
      db.getAll(STORES.invoices),
    ];
    if (lagerEnabled) promises.push(db.getAll(STORES.articles));

    const [projects, customers, invoices, articles] = await Promise.all(promises);

    const activeProjects = projects.filter(p => !['abgeschlossen', 'abgerechnet'].includes(p.status));
    const openInvoices = invoices.filter(i => INVOICE_LIKE_TYPES.includes(i.type) && ['offen', 'gesendet', 'ueberfaellig', 'teilbezahlt'].includes(i.status));
    const openTotal = openInvoices.reduce((sum, i) => sum + (i.totalGross || 0), 0);
    const paidInvoices = invoices.filter(i => INVOICE_LIKE_TYPES.includes(i.type) && i.status === 'bezahlt');
    const revenue = paidInvoices.reduce((sum, i) => sum + (i.totalGross || 0), 0);

    const lowStockArticles = lagerEnabled ? (articles || []).filter(a => a.stock <= (a.minStock || 0)) : [];

    return `
      <div class="page-header">
        <div>
          <h2>Dashboard</h2>
          <p class="page-subtitle">Übersicht deines Betriebs</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Aktive Projekte</span>
          <span class="stat-value">${activeProjects.length}</span>
          <span class="stat-sub">${projects.length} gesamt</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Kunden</span>
          <span class="stat-value">${customers.length}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Offene Rechnungen</span>
          <span class="stat-value">${formatCurrency(openTotal)}</span>
          <span class="stat-sub">${openInvoices.length} Belege</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Umsatz (bezahlt)</span>
          <span class="stat-value">${formatCurrency(revenue)}</span>
          <span class="stat-sub">${paidInvoices.length} Rechnungen</span>
        </div>
      </div>

      ${hints.length > 0 ? `
      <div class="card hints-card" style="margin-bottom:16px;">
        <div class="card-header">
          <h3>Aufgaben & Hinweise</h3>
          <span class="badge ${hints.some(h => h.severity === 'error') ? 'badge-red' : hints.some(h => h.severity === 'warning') ? 'badge-yellow' : 'badge-blue'}">${hints.length}</span>
        </div>
        <div class="hints-list">
          ${hints.map(h => `
            <div class="hint-item hint-${h.severity}">
              <span class="hint-icon">${h.icon}</span>
              <span class="hint-text">${h.text}</span>
              <div class="hint-actions">
                ${h.fixAction === 'fixAll' ? `<button class="btn btn-small btn-primary" onclick="DashboardView.fixAllCalcs()">Korrigieren</button>` : ''}
                ${h.mahnAction && h.invoiceId ? `<button class="btn btn-small btn-danger" onclick="InvoicesView.createMahnung('${h.invoiceId}')">Mahnung</button>` : ''}
                ${h.invoiceId && !h.mahnAction ? `<button class="btn btn-small btn-primary" onclick="app.navigate('invoices','${h.invoiceId}')">${escapeHtml(h.action || 'Öffnen')}</button>` : ''}
                ${h.view && !h.invoiceId ? `<button class="btn btn-small btn-secondary" onclick="app.navigate('${h.view}')">${escapeHtml(h.action)}</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <div style="display:grid; grid-template-columns: ${lagerEnabled ? '1fr 1fr' : '1fr'}; gap: 16px;">
        <div class="card">
          <div class="card-header">
            <h3>Aktive Projekte</h3>
            <button class="btn btn-small btn-primary" onclick="app.navigate('projects')">Alle anzeigen</button>
          </div>
          ${activeProjects.length === 0 ? '<p class="text-muted text-small">Keine aktiven Projekte</p>' :
            `<table>
              <thead><tr><th>Projekt</th><th>Status</th></tr></thead>
              <tbody>
                ${activeProjects.slice(0, 8).map(p => `
                  <tr class="clickable" onclick="app.navigate('projects', '${p.id}')">
                    <td>
                      <strong>${escapeHtml(p.title)}</strong><br>
                      <span class="text-small text-muted">${escapeHtml(p.projectId)}</span>
                    </td>
                    <td>${statusBadgeWithTip(p.status, PROJECT_STATUSES)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`
          }
        </div>

        ${lagerEnabled ? `
        <div class="card">
          <div class="card-header">
            <h3>Lager-Warnungen</h3>
            <button class="btn btn-small btn-primary" onclick="app.navigate('inventory')">Zum Lager</button>
          </div>
          ${lowStockArticles.length === 0 ? '<p class="text-muted text-small">Alle Bestände OK</p>' :
            `<table>
              <thead><tr><th>Artikel</th><th>Bestand</th><th>Minimum</th></tr></thead>
              <tbody>
                ${lowStockArticles.slice(0, 8).map(a => `
                  <tr>
                    <td>${escapeHtml(a.name)}</td>
                    <td><span class="badge badge-red">${a.stock}</span></td>
                    <td>${a.minStock || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`
          }
        </div>
        ` : ''}
      </div>

      <div class="card mt-16">
        <div class="card-header">
          <h3>Letzte Belege</h3>
          <button class="btn btn-small btn-primary" onclick="app.navigate('invoices')">Alle Belege</button>
        </div>
        ${invoices.length === 0 ? '<p class="text-muted text-small">Noch keine Belege erstellt</p>' :
          `<table>
            <thead><tr><th>Nummer</th><th>Typ</th><th>Projekt</th><th>Betrag</th><th>Status</th></tr></thead>
            <tbody>
              ${invoices.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5).map(inv => `
                <tr class="clickable" onclick="app.navigate('invoices', '${inv.id}')">
                  <td><strong>${escapeHtml(inv.number)}</strong></td>
                  <td>${getDocType(inv.type).label}</td>
                  <td class="text-muted">${escapeHtml(inv.projectTitle || '–')}</td>
                  <td>${formatCurrency(inv.totalGross)}</td>
                  <td>${statusBadgeWithTip(inv.status, INVOICE_STATUSES)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        }
      </div>
    `;
  },

  async fixAllCalcs() {
    const result = await Validator.fixAllInvoices();
    if (result.fixed > 0) {
      showToast(`${result.fixed} Beleg(e) korrigiert.${result.skipped > 0 ? ` ${result.skipped} versendete Beleg(e) übersprungen.` : ''}`);
    } else {
      showToast('Keine Korrekturen nötig.');
    }
    app.refresh();
  }
};
