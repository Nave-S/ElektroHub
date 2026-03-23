// ============================================
// ElektroHub – Statistiken & Auswertungen View
// ============================================

const StatisticsView = {
  _activeTab: 'yearly',
  _selectedYear: new Date().getFullYear(),
  _selectedProjectId: null,

  async render() {
    const lagerEnabled = await db.getSetting('lagerEnabled', false);
    const isKU = await db.getSetting('kleinunternehmer', false);

    const promises = [
      db.getAll(STORES.invoices),
      db.getAll(STORES.projects),
      db.getAll(STORES.customers),
      db.getAll(STORES.calculations),
    ];
    if (lagerEnabled) {
      promises.push(db.getAll(STORES.articles));
      promises.push(db.getAll(STORES.stockMovements));
    }

    const [invoices, projects, customers, calculations, articles, stockMovements] = await Promise.all(promises);

    // Determine available years from invoice data
    const years = this._getAvailableYears(invoices);
    if (!years.includes(this._selectedYear) && years.length > 0) {
      this._selectedYear = years[0];
    }

    // If active tab is inventory but lager is disabled, switch to yearly
    if (this._activeTab === 'inventory' && !lagerEnabled) {
      this._activeTab = 'yearly';
    }

    return `
      <div class="page-header">
        <div>
          <h2>Statistiken & Auswertungen</h2>
          <p class="page-subtitle">Kennzahlen und Berichte</p>
        </div>
      </div>

      <div class="tabs" id="stats-tabs">
        <button class="tab-btn ${this._activeTab === 'yearly' ? 'active' : ''}" onclick="StatisticsView.switchTab('yearly')">Jahresübersicht</button>
        <button class="tab-btn ${this._activeTab === 'distribution' ? 'active' : ''}" onclick="StatisticsView.switchTab('distribution')">Umsatzverteilung</button>
        <button class="tab-btn ${this._activeTab === 'project' ? 'active' : ''}" onclick="StatisticsView.switchTab('project')">Projekt-Auswertung</button>
        <button class="tab-btn ${this._activeTab === 'openitems' ? 'active' : ''}" onclick="StatisticsView.switchTab('openitems')">Offene Posten</button>
        ${lagerEnabled ? `<button class="tab-btn ${this._activeTab === 'inventory' ? 'active' : ''}" onclick="StatisticsView.switchTab('inventory')">Lager-Auswertung</button>` : ''}
      </div>

      <div id="stats-content">
        <div id="tab-yearly" class="stats-tab-panel" style="display:${this._activeTab === 'yearly' ? 'block' : 'none'}">
          ${this._renderYearlyOverview(invoices, years, isKU)}
        </div>
        <div id="tab-distribution" class="stats-tab-panel" style="display:${this._activeTab === 'distribution' ? 'block' : 'none'}">
          ${this._renderDistribution(invoices, customers, calculations, articles || [], stockMovements || [])}
        </div>
        <div id="tab-project" class="stats-tab-panel" style="display:${this._activeTab === 'project' ? 'block' : 'none'}">
          ${this._renderProjectAnalysis(projects, calculations, invoices, stockMovements || [])}
        </div>
        <div id="tab-openitems" class="stats-tab-panel" style="display:${this._activeTab === 'openitems' ? 'block' : 'none'}">
          ${this._renderOpenItems(invoices, customers)}
        </div>
        ${lagerEnabled ? `
        <div id="tab-inventory" class="stats-tab-panel" style="display:${this._activeTab === 'inventory' ? 'block' : 'none'}">
          ${this._renderInventoryAnalysis(articles || [])}
        </div>
        ` : ''}
      </div>
    `;
  },

  init() {
    // Post-render event binding (called by app after render)
    const yearSelect = document.getElementById('stats-year-select');
    if (yearSelect) {
      yearSelect.addEventListener('change', async (e) => {
        StatisticsView._selectedYear = parseInt(e.target.value);
        app.refresh();
      });
    }

    const projectSelect = document.getElementById('stats-project-select');
    if (projectSelect) {
      projectSelect.addEventListener('change', async (e) => {
        StatisticsView._selectedProjectId = e.target.value || null;
        app.refresh();
      });
    }
  },

  switchTab(tab) {
    this._activeTab = tab;
    // Toggle visibility without full re-render
    document.querySelectorAll('.stats-tab-panel').forEach(panel => {
      panel.style.display = 'none';
    });
    const activePanel = document.getElementById(`tab-${tab}`);
    if (activePanel) activePanel.style.display = 'block';

    document.querySelectorAll('#stats-tabs .tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.classList.add('active');
  },

  // ===== Helper: available years =====
  _getAvailableYears(invoices) {
    const yearSet = new Set();
    invoices.forEach(inv => {
      if (inv.date) {
        yearSet.add(new Date(inv.date).getFullYear());
      }
      if (inv.createdAt) {
        yearSet.add(new Date(inv.createdAt).getFullYear());
      }
    });
    // Always include current year
    yearSet.add(new Date().getFullYear());
    return Array.from(yearSet).sort((a, b) => b - a);
  },

  // ===== 5.1 Jahresübersicht =====
  _renderYearlyOverview(invoices, years, isKU) {
    const year = this._selectedYear;

    // Filter invoices for selected year
    const yearInvoices = invoices.filter(inv => {
      if (!inv.date) return false;
      return new Date(inv.date).getFullYear() === year;
    });

    const offers = yearInvoices.filter(inv => OFFER_LIKE_TYPES.includes(inv.type));
    const bills = yearInvoices.filter(inv => INVOICE_LIKE_TYPES.includes(inv.type));

    // Build monthly data
    const monthlyData = [];
    let totalOfferCount = 0, totalOfferNet = 0;
    let totalBillCount = 0, totalRevenueNet = 0, totalRevenueGross = 0;
    let totalVat = 0, totalOpen = 0;

    for (let m = 0; m < 12; m++) {
      const monthOffers = offers.filter(inv => new Date(inv.date).getMonth() === m);
      const monthBills = bills.filter(inv => new Date(inv.date).getMonth() === m);

      const offerCount = monthOffers.length;
      const offerNet = monthOffers.reduce((s, inv) => s + (inv.totalNet || 0), 0);
      const billCount = monthBills.length;
      const revenueNet = monthBills.reduce((s, inv) => s + (inv.totalNet || 0), 0);
      const revenueGross = monthBills.reduce((s, inv) => s + (inv.totalGross || 0), 0);
      const vat = revenueGross - revenueNet;
      const openBills = monthBills.filter(inv => ['offen', 'gesendet', 'ueberfaellig', 'teilbezahlt'].includes(inv.status));
      const openAmount = openBills.reduce((s, inv) => s + (inv.totalGross || 0), 0);

      totalOfferCount += offerCount;
      totalOfferNet += offerNet;
      totalBillCount += billCount;
      totalRevenueNet += revenueNet;
      totalRevenueGross += revenueGross;
      totalVat += vat;
      totalOpen += openAmount;

      monthlyData.push({
        month: MONTH_NAMES[m],
        monthShort: MONTH_SHORT[m],
        offerCount,
        offerNet,
        billCount,
        revenueNet,
        revenueGross,
        vat,
        openAmount,
      });
    }

    // Monthly bar chart data
    const chartMonths = monthlyData.map(d => ({
      label: d.monthShort,
      value: d.revenueNet,
    }));

    return `
      <div class="card">
        <div class="card-header">
          <h3>Jahresübersicht</h3>
          <select id="stats-year-select" class="filter-select" style="width:auto;">
            ${years.map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>

        ${isKU ? `<div class="alert-banner alert-info" style="margin-bottom:12px;">Kleinunternehmer (§19 UStG) – keine Umsatzsteuer. Alle Beträge sind Endpreise.</div>` : ''}

        <!-- Erklärung -->
        <details style="margin-bottom:12px;">
          <summary style="cursor:pointer;font-size:0.85rem;color:var(--primary);font-weight:500;">Was bedeuten die Spalten?</summary>
          <div style="margin-top:8px;padding:12px 16px;background:var(--gray-50);border-radius:8px;font-size:0.85rem;line-height:1.7;color:var(--gray-600);">
            <strong>Angebote:</strong> Alle Angebote und Kostenvoranschläge die du in diesem Monat erstellt hast – unabhängig davon ob der Kunde zugesagt hat. Das ist KEIN Umsatz, sondern zeigt wie viel du angeboten hast.<br>
            <strong>Rechnungen:</strong> Anzahl der Rechnungen (inkl. Abschlags- und Schlussrechnungen) die in diesem Monat erstellt wurden.<br>
            ${isKU ? '' : '<strong>Umsatz netto:</strong> Summe aller Rechnungen OHNE MwSt. Das ist dein tatsächlicher Erlös.<br><strong>Umsatz brutto:</strong> Summe aller Rechnungen MIT MwSt. Das ist was der Kunde zahlt.<br><strong>USt. abzuführen:</strong> Die Differenz zwischen Brutto und Netto – diesen Betrag musst du ans Finanzamt abführen.<br>'}
            ${isKU ? '<strong>Umsatz:</strong> Summe aller Rechnungen. Als Kleinunternehmer gibt es keine MwSt., daher nur eine Spalte.<br>' : ''}
            <strong>Offene Posten:</strong> Rechnungen die noch nicht bezahlt sind (Status: Offen, Gesendet oder Überfällig). Bezahlte Rechnungen sind hier NICHT enthalten.
          </div>
        </details>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Monat</th>
                <th class="text-right" title="Anzahl Angebote + Kostenvoranschläge in diesem Monat">Angebote</th>
                <th class="text-right" title="Netto-Summe aller Angebote + KV (kein Umsatz!)">Angebote (€)</th>
                <th class="text-right" title="Anzahl Rechnungen in diesem Monat">Rechnungen</th>
                <th class="text-right" title="${isKU ? 'Summe aller Rechnungen (Endpreis)' : 'Summe aller Rechnungen ohne MwSt.'}">Umsatz ${isKU ? '' : 'netto'}</th>
                ${isKU ? '' : '<th class="text-right" title="Summe aller Rechnungen mit MwSt. (was der Kunde zahlt)">Umsatz brutto</th>'}
                ${isKU ? '' : '<th class="text-right" title="MwSt.-Betrag der ans Finanzamt abgeführt werden muss">USt.</th>'}
                <th class="text-right" title="Summe der noch nicht bezahlten Rechnungen">Offen</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyData.map(d => `
                <tr>
                  <td>${d.month}</td>
                  <td class="text-right">${d.offerCount}</td>
                  <td class="text-right">${formatCurrency(d.offerNet)}</td>
                  <td class="text-right">${d.billCount}</td>
                  <td class="text-right">${formatCurrency(isKU ? d.revenueGross : d.revenueNet)}</td>
                  ${isKU ? '' : `<td class="text-right">${formatCurrency(d.revenueGross)}</td>`}
                  ${isKU ? '' : `<td class="text-right">${formatCurrency(d.vat)}</td>`}
                  <td class="text-right">${d.openAmount > 0 ? `<strong class="text-danger">${formatCurrency(d.openAmount)}</strong>` : formatCurrency(0)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="font-weight:bold; border-top:2px solid var(--gray-400);">
                <td>Gesamt</td>
                <td class="text-right">${totalOfferCount}</td>
                <td class="text-right">${formatCurrency(totalOfferNet)}</td>
                <td class="text-right">${totalBillCount}</td>
                <td class="text-right">${formatCurrency(isKU ? totalRevenueGross : totalRevenueNet)}</td>
                ${isKU ? '' : `<td class="text-right">${formatCurrency(totalRevenueGross)}</td>`}
                ${isKU ? '' : `<td class="text-right">${formatCurrency(totalVat)}</td>`}
                <td class="text-right">${totalOpen > 0 ? `<span class="text-danger">${formatCurrency(totalOpen)}</span>` : formatCurrency(0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="card mt-16">
        <h3 class="mb-8">Monatlicher Umsatz (netto) – ${year}</h3>
        ${Charts.monthlyBars({ months: chartMonths, width: 700, height: 280 })}
      </div>
    `;
  },

  // ===== 5.2 Umsatzverteilung =====
  _renderDistribution(invoices, customers, calculations, articles, stockMovements) {
    // Only paid/invoiced bills
    const bills = invoices.filter(inv => INVOICE_LIKE_TYPES.includes(inv.type));

    // --- Pie 1: Umsatz nach Leistungsart ---
    // Aggregate from calculations linked to invoiced projects
    const revenueByType = { material: 0, stunden: 0, pauschale: 0, nebenkosten: 0 };
    calculations.forEach(calc => {
      (calc.positions || []).forEach(pos => {
        const type = pos.type || 'material';
        if (revenueByType.hasOwnProperty(type)) {
          revenueByType[type] += (pos.total || 0);
        }
      });
    });

    const typeLabels = { material: 'Material', stunden: 'Eigenleistung (Std.)', pauschale: 'Eigenleistung (Pausch.)', nebenkosten: 'Nebenkosten' };
    const pieTypeData = Object.entries(revenueByType)
      .filter(([, val]) => val > 0)
      .map(([key, val]) => ({ label: typeLabels[key] || key, value: val }));

    // --- Pie 2: Umsatz nach Kundentyp ---
    const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));
    // Map projects to customers for invoice lookup
    const revenueByCustomerType = {};
    CUSTOMER_TYPES.forEach(ct => { revenueByCustomerType[ct.value] = 0; });
    revenueByCustomerType['unbekannt'] = 0;

    bills.forEach(inv => {
      const custId = inv.customerId;
      const customer = custId ? customerMap[custId] : null;
      const custType = customer?.type || 'unbekannt';
      if (!revenueByCustomerType.hasOwnProperty(custType)) {
        revenueByCustomerType[custType] = 0;
      }
      revenueByCustomerType[custType] += (inv.totalNet || 0);
    });

    const pieCustomerData = Object.entries(revenueByCustomerType)
      .filter(([, val]) => val > 0)
      .map(([key, val]) => {
        const ct = CUSTOMER_TYPES.find(t => t.value === key);
        return { label: ct ? ct.label : 'Unbekannt', value: val };
      });

    // --- Bar: Top 10 Kunden nach Umsatz ---
    const revenueByCustomer = {};
    bills.forEach(inv => {
      const name = inv.customerName || 'Unbekannt';
      revenueByCustomer[name] = (revenueByCustomer[name] || 0) + (inv.totalNet || 0);
    });
    const topCustomers = Object.entries(revenueByCustomer)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value]) => ({ label, value }));

    // --- Bar: Top 10 Artikel nach Verbrauch ---
    const articleMap = Object.fromEntries(articles.map(a => [a.id, a]));
    const consumptionByArticle = {};
    stockMovements.forEach(mv => {
      // Negative movements or type 'ausgang'/'entnahme' = consumption
      const qty = mv.type === 'eingang' ? 0 : Math.abs(mv.quantity || 0);
      if (qty > 0 && mv.articleId) {
        const article = articleMap[mv.articleId];
        const name = article ? article.name : mv.articleId;
        consumptionByArticle[name] = (consumptionByArticle[name] || 0) + qty;
      }
    });
    const topArticles = Object.entries(consumptionByArticle)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value]) => ({ label, value }));

    // --- Pie 3: Belegstatus (bezahlt/offen/überfällig) ---
    const paidTotal = bills.filter(i => i.status === 'bezahlt').reduce((s, i) => s + (i.totalGross || 0), 0);
    const openTotal = bills.filter(i => ['offen', 'gesendet'].includes(i.status)).reduce((s, i) => s + (i.totalGross || 0), 0);
    const overdueTotal = bills.filter(i => i.status === 'ueberfaellig').reduce((s, i) => s + (i.totalGross || 0), 0);
    const draftTotal = bills.filter(i => i.status === 'entwurf').reduce((s, i) => s + (i.totalGross || 0), 0);
    const pieStatusData = [
      { label: 'Bezahlt', value: paidTotal, color: '#10b981' },
      { label: 'Offen', value: openTotal, color: '#f59e0b' },
      { label: 'Überfällig', value: overdueTotal, color: '#ef4444' },
      { label: 'Entwurf', value: draftTotal, color: '#9ca3af' },
    ].filter(d => d.value > 0);

    // --- Pie 4: Dokumenttypen-Verteilung ---
    const docTypeCounts = {};
    invoices.forEach(inv => {
      const dt = getDocType(inv.type);
      docTypeCounts[dt.label] = (docTypeCounts[dt.label] || 0) + 1;
    });
    const pieDocTypeData = Object.entries(docTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));

    // --- Kennzahlen ---
    const totalRevenue = bills.filter(i => i.status === 'bezahlt').reduce((s, i) => s + (i.totalNet || 0), 0);
    const avgInvoiceValue = bills.length > 0 ? bills.reduce((s, i) => s + (i.totalGross || 0), 0) / bills.length : 0;
    const conversionRate = invoices.filter(i => OFFER_LIKE_TYPES.includes(i.type)).length > 0
      ? Math.round((bills.length / invoices.filter(i => OFFER_LIKE_TYPES.includes(i.type)).length) * 100)
      : 0;

    return `
      <!-- Kennzahlen -->
      <div class="stats-grid" style="margin-bottom:16px;">
        <div class="stat-card">
          <span class="stat-label">Gesamtumsatz (bezahlt)</span>
          <span class="stat-value">${formatCurrency(totalRevenue)}</span>
          <span class="stat-sub">${bills.filter(i => i.status === 'bezahlt').length} Rechnungen</span>
        </div>
        <div class="stat-card" title="Durchschnittlicher Bruttobetrag aller Rechnungen">
          <span class="stat-label">Ø Rechnungsbetrag</span>
          <span class="stat-value">${formatCurrency(avgInvoiceValue)}</span>
          <span class="stat-sub">${bills.length} Rechnungen gesamt</span>
        </div>
        <div class="stat-card" title="Wie viel Prozent deiner Angebote zu Rechnungen geworden sind">
          <span class="stat-label">Angebot → Rechnung</span>
          <span class="stat-value">${conversionRate}%</span>
          <span class="stat-sub">Auftragsquote</span>
        </div>
      </div>

      <!-- Tortendiagramme Reihe 1 -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
        <div class="card">
          <h3 class="mb-8">Zahlungsstatus</h3>
          <p class="text-small text-muted mb-8">Wie viel von deinen Rechnungen ist bezahlt, offen oder überfällig?</p>
          ${pieStatusData.length > 0
            ? Charts.pie({ data: pieStatusData, width: 260, height: 260, donut: true, showLegend: true })
            : '<p class="text-muted text-small">Keine Rechnungsdaten vorhanden</p>'
          }
        </div>

        <div class="card">
          <h3 class="mb-8">Dokumenttypen</h3>
          <p class="text-small text-muted mb-8">Wie viele Angebote, Rechnungen, Mahnungen usw. hast du erstellt?</p>
          ${pieDocTypeData.length > 0
            ? Charts.pie({ data: pieDocTypeData, width: 260, height: 260, donut: true, showLegend: true })
            : '<p class="text-muted text-small">Keine Belege vorhanden</p>'
          }
        </div>
      </div>

      <!-- Tortendiagramme Reihe 2 -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;margin-top:16px;">
        <div class="card">
          <h3 class="mb-8">Umsatz nach Leistungsart</h3>
          <p class="text-small text-muted mb-8">Aus Kalkulationen: Material, Arbeitszeit, Pauschalen, Nebenkosten</p>
          ${pieTypeData.length > 0
            ? Charts.pie({ data: pieTypeData, width: 260, height: 260, donut: true, showLegend: true })
            : '<p class="text-muted text-small">Keine Kalkulationsdaten vorhanden</p>'
          }
        </div>

        <div class="card">
          <h3 class="mb-8">Umsatz nach Kundentyp</h3>
          <p class="text-small text-muted mb-8">Privat, Geschäftskunden, Behörden – wer bringt den meisten Umsatz?</p>
          ${pieCustomerData.length > 0
            ? Charts.pie({ data: pieCustomerData, width: 260, height: 260, donut: true, showLegend: true })
            : '<p class="text-muted text-small">Keine Umsatzdaten vorhanden</p>'
          }
        </div>
      </div>

      <div class="card mt-16">
        <h3 class="mb-8">Top 10 Kunden nach Umsatz (netto)</h3>
        ${topCustomers.length > 0
          ? Charts.bar({ data: topCustomers, width: 700, height: Math.max(250, topCustomers.length * 36), horizontal: true, formatValue: v => formatCurrency(v) })
          : '<p class="text-muted text-small">Keine Umsatzdaten vorhanden</p>'
        }
      </div>

      <div class="card mt-16">
        <h3 class="mb-8">Top 10 Artikel nach Verbrauch</h3>
        ${topArticles.length > 0
          ? Charts.bar({ data: topArticles, width: 700, height: Math.max(250, topArticles.length * 36), horizontal: true, valueSuffix: ' Stk.' })
          : '<p class="text-muted text-small">Keine Lagerbewegungen vorhanden</p>'
        }
      </div>
    `;
  },

  // ===== 5.3 Projekt-Auswertung =====
  _renderProjectAnalysis(projects, calculations, invoices, stockMovements) {
    const selectedId = this._selectedProjectId;

    const projectOptions = projects
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(p => `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.projectId)} – ${escapeHtml(p.title)}</option>`)
      .join('');

    let analysisHtml = '';

    if (selectedId) {
      const project = projects.find(p => p.id === selectedId);
      if (project) {
        // Kalkuliert: from calculations for this project
        const projectCalcs = calculations.filter(c => c.projectId === selectedId);
        const projectInvoicesAll = invoices.filter(inv => inv.projectId === selectedId && INVOICE_LIKE_TYPES.includes(inv.type));

        // Wenn keine Kalkulation UND keine Rechnung → Hinweis
        if (projectCalcs.length === 0 && projectInvoicesAll.length === 0) {
          analysisHtml = `<div class="card mt-16"><div class="alert-banner alert-info">Für dieses Projekt gibt es noch keine Kalkulation und keine Rechnung. Der Soll/Ist-Vergleich ist erst möglich wenn beides vorhanden ist.</div></div>`;
        } else if (projectCalcs.length === 0) {
          analysisHtml = `<div class="card mt-16"><div class="alert-banner alert-warning"><strong>Keine Kalkulation vorhanden.</strong> Es gibt ${projectInvoicesAll.length} Rechnung(en) mit ${formatCurrency(projectInvoicesAll.reduce((s,i) => s + (i.totalNet||0), 0))} netto, aber keine Kalkulation zum Vergleichen. Erstelle eine Kalkulation im Projekt um den Soll/Ist-Vergleich zu sehen.</div></div>`;
        } else {
        const calcMaterial = this._sumPositionsByType(projectCalcs, 'material');
        const calcStunden = this._sumPositionsByType(projectCalcs, 'stunden');
        const calcPauschale = this._sumPositionsByType(projectCalcs, 'pauschale');
        const calcNebenkosten = this._sumPositionsByType(projectCalcs, 'nebenkosten');
        const calcTotal = calcMaterial + calcStunden + calcPauschale + calcNebenkosten;

        // Tatsaechlich: from invoices for this project (invoice-like types)
        const projectInvoices = invoices.filter(inv => inv.projectId === selectedId && INVOICE_LIKE_TYPES.includes(inv.type));
        const actualTotal = projectInvoices.reduce((s, inv) => s + (inv.totalNet || 0), 0);

        // Actual breakdown from invoice positions (if positions have type info)
        let actualMaterial = 0, actualStunden = 0, actualPauschale = 0, actualNebenkosten = 0;
        projectInvoices.forEach(inv => {
          (inv.positions || []).forEach(pos => {
            const type = pos.type || 'material';
            if (type === 'material') actualMaterial += (pos.total || 0);
            else if (type === 'stunden') actualStunden += (pos.total || 0);
            else if (type === 'pauschale') actualPauschale += (pos.total || 0);
            else if (type === 'nebenkosten') actualNebenkosten += (pos.total || 0);
            else actualMaterial += (pos.total || 0);
          });
        });

        // If no typed positions in invoices, use total as material fallback
        const actualBreakdownTotal = actualMaterial + actualStunden + actualPauschale + actualNebenkosten;
        if (actualBreakdownTotal === 0 && actualTotal > 0) {
          actualMaterial = actualTotal;
        }
        const finalActualTotal = actualBreakdownTotal > 0 ? actualBreakdownTotal : actualTotal;

        // Margin
        const projectMovements = stockMovements.filter(m => m.projectId === selectedId);
        const materialCost = projectMovements.reduce((s, m) => {
          return s + Math.abs(m.quantity || 0) * (m.purchasePrice || 0);
        }, 0);
        const marginPct = calcMarginPercent(finalActualTotal, materialCost);

        const rows = [
          this._comparisonRow('Material', calcMaterial, actualMaterial),
          this._comparisonRow('Eigenleistung (Std.)', calcStunden, actualStunden),
          this._comparisonRow('Eigenleistung (Pausch.)', calcPauschale, actualPauschale),
          this._comparisonRow('Nebenkosten', calcNebenkosten, actualNebenkosten),
        ];

        const totalDeviation = finalActualTotal - calcTotal;
        const totalDeviationPct = calcTotal > 0 ? ((totalDeviation / calcTotal) * 100).toFixed(1) : '–';
        const deviationClass = totalDeviation > 0 ? 'text-danger' : totalDeviation < 0 ? 'text-success' : '';

        analysisHtml = `
          <div class="card mt-16">
            <h3 class="mb-8">Soll/Ist-Vergleich: ${escapeHtml(project.title)}</h3>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Position</th>
                    <th class="text-right">Kalkuliert</th>
                    <th class="text-right">Tatsächlich</th>
                    <th class="text-right">Abweichung</th>
                    <th class="text-right">Abweichung (%)</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.join('')}
                </tbody>
                <tfoot>
                  <tr style="font-weight:bold; border-top:2px solid var(--gray-400);">
                    <td>Gesamt netto</td>
                    <td class="text-right">${formatCurrency(calcTotal)}</td>
                    <td class="text-right">${formatCurrency(finalActualTotal)}</td>
                    <td class="text-right ${deviationClass}">${formatCurrency(totalDeviation)}</td>
                    <td class="text-right ${deviationClass}">${totalDeviationPct}%</td>
                  </tr>
                  <tr style="font-weight:bold;">
                    <td>Marge</td>
                    <td class="text-right" colspan="2">Materialkosten (Lager): ${formatCurrency(materialCost)}</td>
                    <td class="text-right" colspan="2">${marginPct.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        `;
        } // end else (has calculations)
      }
    }

    return `
      <div class="card">
        <div class="card-header">
          <h3>Projekt-Auswertung</h3>
          <select id="stats-project-select" class="filter-select" style="width:auto; min-width:300px;">
            <option value="">– Projekt wählen –</option>
            ${projectOptions}
          </select>
        </div>
        ${!selectedId ? `
          <details style="margin-top:8px;">
            <summary style="cursor:pointer;font-size:0.85rem;color:var(--primary);font-weight:500;">Was ist das?</summary>
            <div style="margin-top:8px;padding:12px;background:var(--gray-50);border-radius:8px;font-size:0.85rem;color:var(--gray-600);line-height:1.7;">
              <strong>Soll/Ist-Vergleich:</strong> Vergleicht was du <strong>kalkuliert</strong> hast (geplanter Preis in der Kalkulation) mit dem was du <strong>tatsächlich berechnet</strong> hast (Summe der Rechnungen).<br><br>
              <strong>Beispiel:</strong> Du kalkulierst 5.000 € für eine Installation. Am Ende stellst du 5.400 € in Rechnung weil Zusatzarbeiten nötig waren. Die Abweichung zeigt +400 € (+8%).<br><br>
              <strong>Voraussetzung:</strong> Das Projekt braucht sowohl eine Kalkulation als auch eine Rechnung, damit der Vergleich Sinn ergibt.
            </div>
          </details>
          <p class="text-muted text-small mt-8">Wähle ein Projekt aus, um den Soll/Ist-Vergleich zu sehen.</p>
        ` : ''}
      </div>
      ${analysisHtml}
    `;
  },

  _sumPositionsByType(calculations, type) {
    let sum = 0;
    calculations.forEach(calc => {
      (calc.positions || []).forEach(pos => {
        if ((pos.type || 'material') === type) {
          sum += (pos.total || 0);
        }
      });
    });
    return sum;
  },

  _comparisonRow(label, planned, actual) {
    const deviation = actual - planned;
    const deviationPct = planned > 0 ? ((deviation / planned) * 100).toFixed(1) : (actual > 0 ? '100.0' : '0.0');
    const deviationClass = deviation > 0 ? 'text-danger' : deviation < 0 ? 'text-success' : '';
    return `
      <tr>
        <td>${label}</td>
        <td class="text-right">${formatCurrency(planned)}</td>
        <td class="text-right">${formatCurrency(actual)}</td>
        <td class="text-right ${deviationClass}">${formatCurrency(deviation)}</td>
        <td class="text-right ${deviationClass}">${deviationPct}%</td>
      </tr>
    `;
  },

  // ===== 5.4 Offene-Posten-Liste =====
  _renderOpenItems(invoices, customers) {
    const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Open invoices (rechnung-like, not bezahlt/storniert)
    const openInvoices = invoices
      .filter(inv => INVOICE_LIKE_TYPES.includes(inv.type) && ['offen', 'gesendet', 'ueberfaellig', 'teilbezahlt'].includes(inv.status))
      .map(inv => {
        const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
        let overdueDays = 0;
        if (dueDate) {
          dueDate.setHours(0, 0, 0, 0);
          overdueDays = Math.max(0, Math.floor((today - dueDate) / 86400000));
        }
        return { ...inv, overdueDays };
      })
      .sort((a, b) => b.overdueDays - a.overdueDays);

    const totalOpen = openInvoices.reduce((s, inv) => s + (inv.totalGross || 0), 0);

    return `
      <div class="card">
        <div class="card-header">
          <h3>Offene Posten</h3>
          <span class="stat-value" style="font-size:1.1rem;">${formatCurrency(totalOpen)} offen</span>
        </div>
        ${openInvoices.length === 0 ?
          '<p class="text-muted text-small">Keine offenen Posten vorhanden.</p>' :
          `<div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Rechnung Nr.</th>
                  <th>Kunde</th>
                  <th>Datum</th>
                  <th class="text-right">Betrag</th>
                  <th>Fällig am</th>
                  <th class="text-right">Überfällig (Tage)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${openInvoices.map(inv => {
                  const overdueClass = inv.overdueDays > 30 ? 'text-danger' : inv.overdueDays > 0 ? 'text-warning' : '';
                  return `
                    <tr class="clickable" onclick="app.navigate('invoices', '${inv.id}')">
                      <td><code><strong>${escapeHtml(inv.number)}</strong></code></td>
                      <td>${escapeHtml(inv.customerName || '–')}</td>
                      <td>${formatDate(inv.date)}</td>
                      <td class="text-right"><strong>${formatCurrency(inv.totalGross)}</strong></td>
                      <td>${inv.dueDate ? formatDate(inv.dueDate) : '–'}</td>
                      <td class="text-right ${overdueClass}"><strong>${inv.overdueDays > 0 ? inv.overdueDays : '–'}</strong></td>
                      <td>${statusBadge(inv.status, INVOICE_STATUSES)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>`
        }
      </div>
    `;
  },

  // ===== 5.5 Lager-Auswertung =====
  _renderInventoryAnalysis(articles) {
    // Total stock value
    const totalStockValue = articles.reduce((s, a) => {
      return s + (a.stock || 0) * (a.purchasePrice || 0);
    }, 0);

    // Articles below minimum stock
    const lowStockArticles = articles
      .filter(a => {
        const minStock = a.minStock || 0;
        return minStock > 0 && (a.stock || 0) < minStock;
      })
      .map(a => ({
        ...a,
        shortage: (a.minStock || 0) - (a.stock || 0),
      }))
      .sort((a, b) => b.shortage - a.shortage);

    return `
      <div class="stats-grid" style="grid-template-columns: 1fr;">
        <div class="stat-card">
          <span class="stat-label">Lagerwert gesamt</span>
          <span class="stat-value">${formatCurrency(totalStockValue)}</span>
          <span class="stat-sub">${articles.length} Artikel im Lager</span>
        </div>
      </div>

      <div class="card mt-16">
        <div class="card-header">
          <h3>Artikel unter Mindestbestand</h3>
          <span class="badge ${lowStockArticles.length > 0 ? 'badge-red' : 'badge-green'}">${lowStockArticles.length} Artikel</span>
        </div>
        ${lowStockArticles.length === 0 ?
          '<p class="text-muted text-small">Alle Bestände sind ausreichend.</p>' :
          `<div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Artikel</th>
                  <th class="text-right">Aktuell</th>
                  <th class="text-right">Mindest</th>
                  <th class="text-right">Fehlmenge</th>
                  <th>Lieferant</th>
                </tr>
              </thead>
              <tbody>
                ${lowStockArticles.map(a => `
                  <tr class="clickable" onclick="app.navigate('inventory', '${a.id}')">
                    <td><strong>${escapeHtml(a.name)}</strong></td>
                    <td class="text-right"><span class="badge badge-red">${a.stock || 0}</span></td>
                    <td class="text-right">${a.minStock || 0}</td>
                    <td class="text-right"><strong class="text-danger">${a.shortage}</strong></td>
                    <td>${escapeHtml(a.supplier || '–')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`
        }
      </div>
    `;
  },
};
