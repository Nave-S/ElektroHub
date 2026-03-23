// ============================================
// ElektroHub – Belege (Alle Dokumenttypen) View
// ============================================

const InvoicesView = {
  async render(detailId) {
    if (detailId) return this.renderDetail(detailId);
    return this.renderList();
  },

  async renderList() {
    const invoices = await db.getAll(STORES.invoices);

    return `
      <div class="page-header">
        <div>
          <h2>Belege</h2>
          <p class="page-subtitle">${invoices.length} Dokumente</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="OCRImport.show('invoice')">📷 Aus Foto</button>
          <button class="btn btn-primary" onclick="InvoicesView.showForm()">+ Neuer Beleg</button>
        </div>
      </div>

      <div class="toolbar">
        <input type="text" class="search-input" placeholder="Belege suchen..." id="invoice-search"
               oninput="InvoicesView.filter()">
        <select class="filter-select" id="invoice-type-filter" onchange="InvoicesView.filter()">
          <option value="">Alle Typen</option>
          ${DOC_TYPES.map(dt => `<option value="${dt.value}">${escapeHtml(dt.label)}</option>`).join('')}
        </select>
        <select class="filter-select" id="invoice-status-filter" onchange="InvoicesView.filter()">
          <option value="">Alle Status</option>
          ${selectOptions(INVOICE_STATUSES, '')}
        </select>
      </div>

      <div class="card">
        ${invoices.length === 0 ?
          `<div class="empty-state">
            <div class="empty-icon">📄</div>
            <p>Noch keine Belege erstellt</p>
            <p class="text-small text-muted">Erstelle Belege direkt aus einer Kalkulation heraus</p>
          </div>` :
          `<div class="table-wrapper">
            <table id="invoices-table">
              <thead>
                <tr>
                  <th>Nummer</th>
                  <th>Typ</th>
                  <th>Projekt / Kunde</th>
                  <th>Datum</th>
                  <th>Brutto</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${InvoicesView._buildGroupedRows(invoices)}
              </tbody>
            </table>
          </div>`
        }
      </div>
    `;
  },

  async renderDetail(id) {
    const invoice = await db.get(STORES.invoices, id);
    if (!invoice) return '<p>Beleg nicht gefunden.</p>';
    const dt = getDocType(invoice.type);
    const isKU = await isKleinunternehmer();

    const settings = {
      companyName: await db.getSetting('companyName', ''),
      companyOwner: await db.getSetting('companyOwner', ''),
      companyAddress: await db.getSetting('companyAddress', ''),
      companyPhone: await db.getSetting('companyPhone', ''),
      companyEmail: await db.getSetting('companyEmail', ''),
      companyWebsite: await db.getSetting('companyWebsite', ''),
      taxNumber: await db.getSetting('taxNumber', ''),
      ustId: await db.getSetting('ustId', ''),
      bankName: await db.getSetting('bankName', ''),
      bankIBAN: await db.getSetting('bankIBAN', ''),
      bankBIC: await db.getSetting('bankBIC', ''),
      bankKontoinhaber: await db.getSetting('bankKontoinhaber', ''),
      companyLogo: await db.getSetting('companyLogo', ''),
      customQR: await db.getSetting('customQR', ''),
      qrMode: await db.getSetting('qrMode', 'auto'),
      kleinunternehmer: isKU,
      showHandwerkerbonus: await db.getSetting('showHandwerkerbonus', false),
      skontoEnabled: invoice.skontoEnabled || false,
      skontoRate: invoice.skontoRate || 2,
      skontoFrist: invoice.skontoFrist || 10,
      agbEnabled: await db.getSetting('agbEnabled', false),
      agbText: await db.getSetting('agbText', 'Es gelten unsere Allgemeinen Geschäftsbedingungen (siehe Anlage).'),
      agbPdf: await db.getSetting('agbPdf', ''),
    };

    // Load template for this doc type
    const template = await getDocTemplate(invoice.type);
    const firma = settings.companyName || 'Mein Elektrobetrieb';
    const placeholderData = {
      dokumentnr: invoice.number,
      anrede: invoice.customerAnrede || '',
      name: invoice.customerName || '',
      firma: firma,
      datum: formatDate(invoice.date),
      faelligkeitsdatum: invoice.dueDate ? formatDate(invoice.dueDate) : '',
      projektname: invoice.projectTitle || '',
      betrag: formatCurrency(invoice.totalGross),
    };

    // Skonto
    if (settings.skontoEnabled && dt.canSkonto) {
      const skontoBetrag = calcSkonto(invoice.totalGross, settings.skontoRate);
      placeholderData.skontobetrag = String(settings.skontoRate);
      placeholderData.skontofrist = String(settings.skontoFrist);
      placeholderData.berechneterSkontobetrag = formatCurrency(skontoBetrag);
      placeholderData.berechneterBetragNachSkonto = formatCurrency(invoice.totalGross - skontoBetrag);
      if (invoice.date) {
        placeholderData.skontodatum = formatDate(calcDueDate(invoice.date, settings.skontoFrist));
      }
    }

    // Arbeitskosten für Handwerkerbonus
    if (settings.showHandwerkerbonus && dt.hasPayment) {
      const arbeitskosten = calcArbeitskosten(invoice.positions);
      placeholderData.arbeitskosten = formatCurrency(nettoToBrutto(arbeitskosten));
    }

    const introText = replaceTemplatePlaceholders(template.intro, placeholderData);
    const closingText = replaceTemplatePlaceholders(template.closing, placeholderData);

    // Determine available conversions
    const canConvertToAngebot = invoice.type === 'kostenvoranschlag';
    const canConvertToAB = ['angebot', 'kostenvoranschlag'].includes(invoice.type);
    const canConvertToInvoice = ['angebot', 'kostenvoranschlag', 'auftragsbestaetigung'].includes(invoice.type);
    const canConvertToAbschlag = ['auftragsbestaetigung', 'rechnung'].includes(invoice.type);
    const canConvertToSchluss = ['auftragsbestaetigung', 'abschlagsrechnung'].includes(invoice.type);
    const canCreateGutschrift = INVOICE_LIKE_TYPES.includes(invoice.type) && invoice.status !== 'storniert';
    const canCreateStorno = INVOICE_LIKE_TYPES.includes(invoice.type) && invoice.status !== 'storniert';
    const canCreateMahnung = INVOICE_LIKE_TYPES.includes(invoice.type) && ['offen', 'ueberfaellig'].includes(invoice.status);

    // Steuer-Mismatch prüfen: Beleg wurde mit anderen Steuer-Einstellungen erstellt?
    let expectedGross;
    if (isKU) {
      expectedGross = invoice.totalNet;
    } else {
      // Compute expected gross using per-position mwstRate
      const taxByRate = {};
      (invoice.positions || []).forEach(p => {
        const rate = p.mwstRate != null ? p.mwstRate : Math.round(MWST_RATE * 100);
        taxByRate[rate] = (taxByRate[rate] || 0) + (p.total || 0) * (rate / 100);
      });
      const totalTax = Object.values(taxByRate).reduce((s, v) => s + v, 0);
      expectedGross = invoice.totalNet + totalTax;
    }
    const hasTaxMismatch = invoice.totalNet > 0 && Math.abs((invoice.totalGross || 0) - expectedGross) > 0.01;
    const isDraft = invoice.status === 'entwurf';
    const isSent = ['gesendet', 'offen', 'bezahlt', 'ueberfaellig', 'teilbezahlt'].includes(invoice.status);

    let taxWarningHtml = '';
    if (hasTaxMismatch && isDraft) {
      taxWarningHtml = `
        <div class="alert-banner alert-warning">
          <strong>Hinweis:</strong> Dieser Beleg wurde mit ${isKU ? 'MwSt.' : 'Kleinunternehmer-Regelung'} erstellt, aber aktuell ist ${isKU ? 'Kleinunternehmer (§19 UStG)' : 'MwSt.-Ausweis'} aktiv.
          <button class="btn btn-small btn-primary ml-8" onclick="InvoicesView.recalcTax('${invoice.id}')">Jetzt anpassen</button>
        </div>`;
    } else if (hasTaxMismatch && isSent) {
      taxWarningHtml = `
        <div class="alert-banner alert-danger">
          <strong>Achtung:</strong> Dieser Beleg wurde mit ${isKU ? 'MwSt.' : 'Kleinunternehmer-Regelung'} erstellt. Die Steuer-Einstellung wurde seitdem geändert. Da der Beleg bereits versendet/offen ist, kann er nicht automatisch angepasst werden. Bitte <strong>storniere den Beleg</strong> und erstelle einen neuen.
        </div>`;
    }

    // Mahnung-Info: welche Stufe wäre als nächstes?
    let mahnInfoHtml = '';
    if (canCreateMahnung) {
      const allDocs = await db.getAll(STORES.invoices);
      const existingMahnungen = allDocs.filter(d =>
        ['mahnung1', 'mahnung2', 'mahnung3'].includes(d.type) && d.basedOnId === invoice.id
      );
      const hasMahnung1 = existingMahnungen.some(m => m.type === 'mahnung1');
      const hasMahnung2 = existingMahnungen.some(m => m.type === 'mahnung2');
      const hasMahnung3 = existingMahnungen.some(m => m.type === 'mahnung3');

      let mahnLabel, mahnDesc, mahnIcon;
      if (!hasMahnung1) {
        mahnLabel = 'Zahlungserinnerung erstellen';
        mahnDesc = '1. Mahnung – freundlicher Hinweis an den Kunden, dass die Zahlung noch aussteht.';
        mahnIcon = '📨';
      } else if (!hasMahnung2) {
        mahnLabel = '2. Mahnung erstellen';
        mahnDesc = 'Dringendere Aufforderung zur Zahlung. 1. Mahnung wurde bereits versendet.';
        mahnIcon = '📨';
      } else if (!hasMahnung3) {
        mahnLabel = 'Letzte Mahnung erstellen';
        mahnDesc = 'Letzte Mahnung mit Androhung von Inkasso-Maßnahmen.';
        mahnIcon = '🔴';
      } else {
        mahnLabel = '';
        mahnDesc = 'Alle 3 Mahnstufen wurden bereits erstellt. Nächster Schritt: Inkasso oder Anwalt.';
        mahnIcon = '⚖️';
      }

      // Zeige vorhandene Mahnungen
      const mahnList = existingMahnungen.length > 0
        ? existingMahnungen.map(m => {
            const mdt = getDocType(m.type);
            return `<span class="badge doctype-${m.type}" style="cursor:pointer;" onclick="app.navigate('invoices','${m.id}')">${mdt.label} ${m.number}</span>`;
          }).join(' ')
        : '';

      mahnInfoHtml = `
        <div class="alert-banner alert-warning" style="flex-direction:column;align-items:flex-start;">
          <div style="display:flex;align-items:center;gap:10px;width:100%;">
            <span style="font-size:1.3rem;">${mahnIcon}</span>
            <div style="flex:1;">
              <strong>${invoice.status === 'ueberfaellig' ? 'Diese Rechnung ist überfällig!' : 'Rechnung ist offen'}</strong>
              <div class="text-small" style="margin-top:2px;color:var(--gray-600);">${mahnDesc}</div>
            </div>
            ${mahnLabel ? `<button class="btn btn-danger" onclick="InvoicesView.createMahnung('${invoice.id}')" style="white-space:nowrap;">${mahnLabel}</button>` : ''}
          </div>
          ${mahnList ? `<div style="margin-top:10px;display:flex;align-items:center;gap:8px;"><span class="text-small text-muted">Bereits erstellt:</span>${mahnList}</div>` : ''}
        </div>`;
    }

    return `
      ${taxWarningHtml}
      <div class="breadcrumb">
        <a href="#" onclick="app.navigate('invoices');return false;">Belege</a>
        <span class="breadcrumb-sep">›</span>
        <span class="badge doctype-${invoice.type}" style="font-size:0.75rem;" title="${escapeHtml(TOOLTIPS[dt.prefix] || dt.label)}">${escapeHtml(dt.label)}</span>
        <strong>${escapeHtml(invoice.number)}</strong>
        ${invoice.customerName ? `<span class="breadcrumb-sep">·</span><span class="text-muted">${escapeHtml(invoice.customerName)}</span>` : ''}
      </div>
      ${mahnInfoHtml}
      <div class="detail-header">
        <div style="display:flex;align-items:stretch;">
          <div class="detail-doctype-stripe doctype-${invoice.type}"></div>
          <div>
            <div class="detail-title">
              <span class="badge doctype-${invoice.type}" style="font-size:0.85rem;padding:4px 12px;margin-right:8px;" title="${escapeHtml(TOOLTIPS[dt.prefix] || dt.label)}">${escapeHtml(dt.label)}</span>
              ${escapeHtml(invoice.number)}
            </div>
          </div>
        </div>
        <div class="btn-group" style="flex-wrap:wrap;">
          ${canConvertToAngebot ? `<button class="btn btn-primary" onclick="InvoicesView.convertTo('${invoice.id}', 'angebot')">Angebot erstellen</button>` : ''}
          ${canConvertToAB ? `<button class="btn btn-secondary" onclick="InvoicesView.convertTo('${invoice.id}', 'auftragsbestaetigung')">Auftragsbestätigung erstellen</button>` : ''}
          ${canConvertToInvoice ? `<button class="btn btn-success" onclick="InvoicesView.convertTo('${invoice.id}', 'rechnung')">Rechnung erstellen</button>` : ''}
          ${canConvertToAbschlag ? `<button class="btn btn-secondary" onclick="InvoicesView.convertTo('${invoice.id}', 'abschlagsrechnung')">Abschlagsrechnung erstellen</button>` : ''}
          ${canConvertToSchluss ? `<button class="btn btn-secondary" onclick="InvoicesView.convertTo('${invoice.id}', 'schlussrechnung')">Schlussrechnung erstellen</button>` : ''}
          ${canCreateGutschrift ? `<button class="btn btn-secondary" onclick="InvoicesView.convertTo('${invoice.id}', 'gutschrift')">Gutschrift erstellen</button>` : ''}
          ${canCreateStorno ? `<button class="btn btn-secondary" onclick="InvoicesView.convertTo('${invoice.id}', 'stornorechnung')">Stornorechnung erstellen</button>` : ''}
          <button class="btn btn-primary" onclick="InvoicesView.exportPDF('${invoice.id}')">📄 PDF exportieren</button>
          ${settings.agbPdf ? `<button class="btn btn-secondary" onclick="InvoicesView.downloadAgb()">📎 AGB herunterladen</button>` : ''}
          <button class="btn btn-secondary" onclick="InvoicesView.copyEmailText('${invoice.id}')">📧 E-Mail-Text kopieren</button>
          <button class="btn btn-secondary" onclick="InvoicesView.showForm('${invoice.id}')">✏️ Bearbeiten</button>
          <button class="btn btn-danger btn-small" onclick="InvoicesView.remove('${invoice.id}')">Löschen</button>
        </div>
      </div>

      <div class="detail-meta">
        <div class="detail-meta-item">
          <div class="meta-label">Status</div>
          <div class="meta-value">${statusBadge(invoice.status, INVOICE_STATUSES)}</div>
          <div class="mt-8">
            <select onchange="InvoicesView.updateStatus('${invoice.id}', this.value)" style="font-size:0.85rem;padding:4px 8px;border:1px solid var(--gray-300);border-radius:4px;">
              ${selectOptions(InvoicesView._getValidStatuses(invoice.type), invoice.status)}
            </select>
          </div>
        </div>
        <div class="detail-meta-item">
          <div class="meta-label">Datum</div>
          <div class="meta-value">${formatDate(invoice.date)}</div>
        </div>
        ${invoice.dueDate ? `
        <div class="detail-meta-item">
          <div class="meta-label">${dt.hasPayment ? 'Fällig' : ['angebot','kostenvoranschlag'].includes(invoice.type) ? 'Gültig bis' : 'Datum'}</div>
          <div class="meta-value">${formatDate(invoice.dueDate)}</div>
        </div>` : ''}
        <div class="detail-meta-item">
          <div class="meta-label">Brutto</div>
          <div class="meta-value" style="font-size:1.3rem;">${formatCurrency(invoice.totalGross)}</div>
        </div>
        ${invoice.paidDate ? `
        <div class="detail-meta-item">
          <div class="meta-label">Bezahlt am</div>
          <div class="meta-value">${formatDate(invoice.paidDate)}</div>
          ${invoice.paidAmount && Math.abs(invoice.paidAmount - invoice.totalGross) > 0.01 ? `<div class="text-small mt-8">${formatCurrency(invoice.paidAmount)} von ${formatCurrency(invoice.totalGross)}</div>` : ''}
        </div>` : ''}
        ${invoice.reverseCharge ? `
        <div class="detail-meta-item">
          <div class="meta-label">§13b UStG</div>
          <div class="meta-value"><span class="badge badge-yellow">Reverse-Charge</span></div>
        </div>` : ''}
        ${dt.canSkonto ? `
        <div class="detail-meta-item">
          <div class="meta-label">Skonto</div>
          <div class="meta-value">
            ${invoice.skontoEnabled
              ? `<span class="badge badge-green">${invoice.skontoRate}% / ${invoice.skontoFrist} Tage</span>`
              : '<span class="badge badge-gray">Aus</span>'}
          </div>
          <div class="mt-8">
            ${invoice.skontoEnabled
              ? `<button class="btn btn-small btn-secondary" onclick="InvoicesView.toggleSkontoOnInvoice('${invoice.id}', false)">Deaktivieren</button>`
              : `<button class="btn btn-small btn-primary" onclick="InvoicesView.showSkontoQuick('${invoice.id}')">Skonto vergeben</button>`}
          </div>
        </div>
        ` : ''}
      </div>

      ${invoice.customerName ? `
      <div class="card">
        <h3 class="mb-8">Empfänger</h3>
        <p><strong>${escapeHtml(invoice.customerName)}</strong></p>
        ${invoice.customerAddress ? `<p>${escapeHtml(invoice.customerAddress).replace(/\n/g, '<br>')}</p>` : ''}
      </div>
      ` : ''}

      ${dt.hasPositions && (invoice.positions || []).length > 0 ? (() => {
        const detailHasDiscount = (invoice.positions || []).some(p => (p.discount || 0) > 0);
        const detailMwstRates = [...new Set((invoice.positions || []).map(p => p.mwstRate != null ? p.mwstRate : 19))];
        return `
      <div class="card">
        <h3 class="mb-8">Positionen</h3>
        <table>
          <thead><tr><th>Pos.</th><th>Beschreibung</th><th>Menge</th><th>Einzelpreis</th>${detailHasDiscount ? '<th>Rabatt</th>' : ''}<th>MwSt</th><th class="text-right">Gesamt</th></tr></thead>
          <tbody>
            ${(invoice.positions || []).map((pos, i) => `
              <tr>
                <td>${pos.pos || (i + 1)}</td>
                <td>${escapeHtml(pos.description)}</td>
                <td>${pos.quantity} ${escapeHtml(pos.unit || 'Stück')}</td>
                <td>${formatCurrency(pos.unitPrice)}</td>
                ${detailHasDiscount ? `<td>${(pos.discount || 0) > 0 ? pos.discount + '%' : ''}</td>` : ''}
                <td>${pos.mwstRate != null ? pos.mwstRate : 19}%</td>
                <td class="text-right"><strong>${formatCurrency(pos.total)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="calc-summary mt-16">
          <div class="calc-summary-row"><span>Netto</span><span>${formatCurrency(invoice.totalNet)}</span></div>
          ${isKU ? `
            <div class="calc-summary-row"><span style="font-size:0.85rem;color:var(--gray-500);">Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</span><span></span></div>
          ` : (() => {
            const taxByRate = {};
            (invoice.positions || []).forEach(p => {
              const rate = p.mwstRate != null ? p.mwstRate : 19;
              taxByRate[rate] = (taxByRate[rate] || 0) + (p.total || 0) * (rate / 100);
            });
            return Object.keys(taxByRate).map(Number).sort((a, b) => b - a).map(rate =>
              `<div class="calc-summary-row"><span>MwSt. ${rate}%</span><span>${formatCurrency(taxByRate[rate])}</span></div>`
            ).join('');
          })()}
          <div class="calc-summary-row total"><span>${isKU ? 'Rechnungsbetrag' : 'Brutto'}</span><span>${formatCurrency(invoice.totalGross)}</span></div>
          ${invoice.skontoEnabled && invoice.skontoRate > 0 && dt.canSkonto ? (() => {
            const sb = Math.round(invoice.totalGross * (invoice.skontoRate / 100) * 100) / 100;
            const ns = Math.round((invoice.totalGross - sb) * 100) / 100;
            const sd = invoice.date && invoice.skontoFrist ? formatDate(calcDueDate(invoice.date, invoice.skontoFrist)) : '–';
            return `
            <div class="calc-summary-row mt-8" style="font-size:0.85rem;color:var(--gray-500);">
              <span>Abzgl. ${invoice.skontoRate}% Skonto bis ${sd}</span>
              <span>−${formatCurrency(sb)}</span>
            </div>
            <div class="calc-summary-row" style="font-size:0.85rem;font-weight:600;color:var(--success);">
              <span>Zahlbetrag bei Skonto</span>
              <span>${formatCurrency(ns)}</span>
            </div>`;
          })() : ''}
        </div>
      </div>`;
      })() : ''}

      ${invoice.notes ? `
      <div class="card">
        <h3 class="mb-8">Bemerkungen</h3>
        <p>${escapeHtml(invoice.notes).replace(/\n/g, '<br>')}</p>
      </div>
      ` : ''}

      <!-- PDF Preview -->
      <div class="card" id="pdf-preview-area">
        <div class="card-header">
          <h3>Vorschau</h3>
        </div>
        <div id="invoice-preview" style="border:1px solid var(--gray-200);padding:40px;background:white;max-width:210mm;max-height:800px;overflow-y:auto;">
          ${await InvoicesView._generatePreviewHtml(invoice, settings, template, placeholderData)}
        </div>
      </div>
    `;
  },

  async _generatePreviewHtml(invoice, settings, template, placeholderData) {
    const dt = getDocType(invoice.type);
    const isKU = settings.kleinunternehmer;
    const introText = replaceTemplatePlaceholders(template.intro, placeholderData);
    const closingText = replaceTemplatePlaceholders(template.closing, placeholderData);

    // QR-Code (nur bei Zahlungs-Dokumenten)
    let qrHtml = '';
    if (dt.hasPayment && settings.qrMode !== 'off') {
      let qrImgSrc = '';
      if (settings.qrMode === 'custom' && settings.customQR) {
        qrImgSrc = settings.customQR;
      } else if (settings.qrMode === 'auto' && settings.bankIBAN && invoice.totalGross > 0) {
        const epcData = QRCode.epcQR({
          bic: settings.bankBIC || '',
          name: settings.companyName || '',
          iban: settings.bankIBAN.replace(/\s/g, ''),
          amount: invoice.totalGross,
          reference: `${invoice.number}`,
        });
        qrImgSrc = QRCode.toDataURL(epcData, 3, 2);
      }
      if (qrImgSrc) {
        const hint = settings.qrMode === 'auto'
          ? `<strong>Direkt bezahlen per QR-Code</strong><br>Scannen Sie den GiroCode mit Ihrer Banking-App.<br>IBAN: ${escapeHtml(settings.bankIBAN)}`
          : `<strong>Bezahlung per QR-Code</strong><br>Scannen Sie den QR-Code mit Ihrer Banking-App.`;
        qrHtml = `
          <div style="margin-top:24px;display:flex;align-items:flex-start;gap:16px;">
            <img src="${qrImgSrc}" style="width:120px;height:120px;object-fit:contain;" alt="QR-Code">
            <div style="font-size:8pt;color:#666;">${hint}</div>
          </div>
        `;
      }
    }

    // Skonto-Hinweis
    let skontoHtml = '';
    if (settings.skontoEnabled && dt.canSkonto) {
      skontoHtml = `<div style="margin-top:12px;font-size:9pt;color:#333;padding:8px;background:#f8f9fa;border-radius:4px;">${escapeHtml(replaceTemplatePlaceholders(DEFAULT_LEGAL_TEXTS.skonto.text, placeholderData))}</div>`;
    }

    // Handwerkerbonus
    let handwerkerbonusHtml = '';
    if (settings.showHandwerkerbonus && dt.hasPayment && invoice.positions) {
      const arbeitskosten = calcArbeitskosten(invoice.positions);
      if (arbeitskosten > 0) {
        const arbeitskostenBrutto = nettoToBrutto(arbeitskosten);
        const txt = `Der Anteil der Arbeitskosten (inkl. Fahrtkosten) an dieser Rechnung beträgt ${formatCurrency(arbeitskostenBrutto)} (brutto). Gemäß § 35a EStG können 20 % der Arbeitskosten (max. 1.200 €/Jahr) steuerlich geltend gemacht werden.`;
        handwerkerbonusHtml = `<div style="margin-top:12px;font-size:8pt;color:#666;padding:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;">${txt}</div>`;
      }
    }

    // Leistungszeitraum
    const hasServicePeriod = invoice.serviceFrom || invoice.serviceTo;

    // Zahlungsbedingungen / Konditionen Block (für alle Dokumenttypen mit Skonto oder Zahlung)
    let zahlungHtml = '';
    const isOfferType = ['angebot', 'kostenvoranschlag', 'auftragsbestaetigung'].includes(invoice.type);
    const showZahlungsBlock = dt.hasPayment || (dt.canSkonto && invoice.skontoEnabled);

    if (showZahlungsBlock || (isOfferType && invoice.dueDate)) {
      const zeilen = [];

      // Fälligkeits-/Gültigkeitsdatum
      if (invoice.dueDate) {
        if (dt.hasPayment) {
          zeilen.push(`Zahlbar bis zum <strong>${formatDate(invoice.dueDate)}</strong> ohne Abzug.`);
        } else if (isOfferType) {
          zeilen.push(`Dieses ${dt.label} ist gültig bis zum <strong>${formatDate(invoice.dueDate)}</strong>.`);
        }
      }

      // Skonto (für alle Typen wo aktiviert)
      if (invoice.skontoEnabled && invoice.skontoRate > 0) {
        const skontoBetrag = calcSkonto(invoice.totalGross, invoice.skontoRate);
        const nachSkonto = Math.round((invoice.totalGross - skontoBetrag) * 100) / 100;
        let skontoDatum = '';
        if (invoice.date && invoice.skontoFrist) {
          skontoDatum = formatDate(calcDueDate(invoice.date, invoice.skontoFrist));
        }

        if (dt.hasPayment) {
          // Rechnung: konkrete Zahlungsanweisung
          zeilen.push(`Bei Zahlung bis zum <strong>${skontoDatum}</strong> gewähren wir <strong>${invoice.skontoRate}% Skonto</strong> (${formatCurrency(skontoBetrag)} Abzug). Zahlbetrag dann: <strong>${formatCurrency(nachSkonto)}</strong>.`);
        } else {
          // Angebot/KV/AB: Zahlungskonditionen als Info
          zeilen.push(`<strong>Zahlungskonditionen bei Beauftragung:</strong> ${invoice.skontoRate}% Skonto bei Zahlung innerhalb von ${invoice.skontoFrist} Tagen nach Rechnungsstellung.`);
        }
      }

      // Bankverbindung (nur bei Zahlungsdokumenten)
      if (dt.hasPayment && settings.bankIBAN) {
        let bankLine = `Bankverbindung: ${escapeHtml(settings.bankKontoinhaber || settings.companyName || '')}`;
        bankLine += ` · IBAN: ${escapeHtml(settings.bankIBAN)}`;
        if (settings.bankBIC) bankLine += ` · BIC: ${escapeHtml(settings.bankBIC)}`;
        if (settings.bankName) bankLine += ` · ${escapeHtml(settings.bankName)}`;
        zeilen.push(bankLine);
      }

      if (zeilen.length > 0) {
        const blockTitle = dt.hasPayment ? 'Zahlungsbedingungen' : 'Konditionen';
        zahlungHtml = `
          <div class="zahlungs-block" style="margin-top:20px;padding:12px 16px;background:#f8f9fa;border:1px solid #e5e7eb;border-radius:4px;font-size:9pt;line-height:1.7;">
            <div style="font-weight:bold;margin-bottom:4px;font-size:9.5pt;">${blockTitle}</div>
            ${zeilen.map(z => `<div>${z}</div>`).join('')}
          </div>
        `;
      }
    }

    // Handwerkerbonus
    let handwerkerbonusHtml2 = '';
    if (settings.showHandwerkerbonus && dt.hasPayment && invoice.positions) {
      const arbeitskosten = calcArbeitskosten(invoice.positions);
      if (arbeitskosten > 0) {
        const arbeitskostenBrutto = isKU ? arbeitskosten : Math.round(arbeitskosten * (1 + MWST_RATE) * 100) / 100;
        handwerkerbonusHtml2 = `
          <div style="margin-top:12px;font-size:8.5pt;color:#065f46;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;">
            <strong>Hinweis gemäß § 35a EStG:</strong> Der Anteil der Arbeitskosten (inkl. Fahrtkosten) beträgt ${formatCurrency(arbeitskostenBrutto)} (brutto). Davon können 20 % (max. 1.200 €/Jahr) steuerlich geltend gemacht werden.
          </div>
        `;
      }
    }

    // Kleinunternehmer-Hinweis
    let kuHtml = '';
    if (isKU) {
      kuHtml = `<div style="font-size:8pt;color:#666;margin-top:4px;">${escapeHtml(DEFAULT_LEGAL_TEXTS.kleinunternehmer.short)}</div>`;
    }

    // Reverse-Charge-Hinweis
    let reverseChargeHtml = '';
    if (invoice.reverseCharge) {
      reverseChargeHtml = `<div style="margin-top:12px;font-size:8.5pt;color:#92400e;padding:8px 12px;background:#fef3c7;border:1px solid #fbbf24;border-radius:4px;">${escapeHtml(DEFAULT_LEGAL_TEXTS.reverseCharge.text)}</div>`;
    }

    // Gewährleistungshinweis (nur bei Rechnungen/Schlussrechnungen)
    const showGewaehrleistung = await db.getSetting('showGewaehrleistung', false);
    let gewaehrleistungHtml = '';
    if (showGewaehrleistung && ['rechnung', 'schlussrechnung'].includes(invoice.type)) {
      const gewaehrleistungText = await db.getSetting('gewaehrleistungText', DEFAULT_LEGAL_TEXTS.gewaehrleistung.text);
      gewaehrleistungHtml = `<div style="margin-top:12px;font-size:8.5pt;color:#555;">${escapeHtml(gewaehrleistungText)}</div>`;
    }

    // Positions table – check if any position has discount > 0
    const hasAnyDiscount = (invoice.positions || []).some(p => (p.discount || 0) > 0);
    // Check if mixed MwSt rates exist
    const mwstRatesUsed = [...new Set((invoice.positions || []).map(p => p.mwstRate != null ? p.mwstRate : 19))];
    const hasMixedMwst = mwstRatesUsed.length > 1 || (mwstRatesUsed.length === 1 && mwstRatesUsed[0] !== 19);

    let positionsHtml = '';
    if (dt.hasPositions && (invoice.positions || []).length > 0) {
      positionsHtml = `
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="border-bottom:2px solid #333;">
              <th style="text-align:left;padding:6px 4px;font-size:9pt;">Pos.</th>
              <th style="text-align:left;padding:6px 4px;font-size:9pt;">Beschreibung</th>
              <th style="text-align:right;padding:6px 4px;font-size:9pt;">Menge</th>
              <th style="text-align:right;padding:6px 4px;font-size:9pt;">Einzelpreis</th>
              ${hasAnyDiscount ? '<th style="text-align:right;padding:6px 4px;font-size:9pt;">Rabatt</th>' : ''}
              <th style="text-align:right;padding:6px 4px;font-size:9pt;">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            ${(invoice.positions || []).map((pos, i) => {
              const unitLabel = pos.unit || 'Stück';
              const discountStr = (pos.discount || 0) > 0 ? `${pos.discount}%` : '';
              return `
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:6px 4px;">${pos.pos || (i+1)}</td>
                <td style="padding:6px 4px;">${escapeHtml(pos.description)}</td>
                <td style="text-align:right;padding:6px 4px;">${pos.quantity} ${escapeHtml(unitLabel)}</td>
                <td style="text-align:right;padding:6px 4px;">${formatCurrency(pos.unitPrice)}</td>
                ${hasAnyDiscount ? `<td style="text-align:right;padding:6px 4px;">${discountStr}</td>` : ''}
                <td style="text-align:right;padding:6px 4px;">${formatCurrency(pos.total)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>

        <div style="width:300px;margin-left:auto;">
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9pt;"><span>Netto</span><span>${formatCurrency(invoice.totalNet)}</span></div>
          ${isKU ? '' : (() => {
            // Group tax by rate
            const taxByRate = {};
            (invoice.positions || []).forEach(p => {
              const rate = p.mwstRate != null ? p.mwstRate : 19;
              taxByRate[rate] = (taxByRate[rate] || 0) + (p.total || 0) * (rate / 100);
            });
            const rates = Object.keys(taxByRate).map(Number).sort((a, b) => b - a);
            return rates.map(rate =>
              `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9pt;"><span>MwSt. ${rate}%</span><span>${formatCurrency(taxByRate[rate])}</span></div>`
            ).join('');
          })()}
          <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:bold;border-top:2px solid #333;font-size:11pt;"><span>${isKU ? 'Rechnungsbetrag' : 'Brutto'}</span><span>${formatCurrency(invoice.totalGross)}</span></div>
          ${kuHtml}
        </div>
      `;
    }

    return `
      <div style="font-family:Arial,sans-serif;font-size:10pt;color:#333;">
        <!-- Briefkopf -->
        <div style="margin-bottom:40px;display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:16pt;font-weight:bold;">${escapeHtml(settings.companyName || 'Mein Elektrobetrieb')}</div>
            ${settings.companyOwner ? `<div style="font-size:8pt;color:#666;">Inhaber: ${escapeHtml(settings.companyOwner)}</div>` : ''}
            <div style="font-size:8pt;color:#666;">${escapeHtml(settings.companyAddress || '').replace(/\n/g, ' · ')}</div>
            ${settings.companyPhone ? `<div style="font-size:8pt;color:#666;">Tel: ${escapeHtml(settings.companyPhone)}</div>` : ''}
            ${settings.companyEmail ? `<div style="font-size:8pt;color:#666;">${escapeHtml(settings.companyEmail)}</div>` : ''}
            ${settings.companyWebsite ? `<div style="font-size:8pt;color:#666;">${escapeHtml(settings.companyWebsite)}</div>` : ''}
          </div>
          ${settings.companyLogo ? `<img src="${settings.companyLogo}" style="max-width:180px;max-height:80px;object-fit:contain;" alt="Logo">` : ''}
        </div>

        <!-- Rücksenderzeile -->
        <div style="font-size:7pt;color:#999;border-bottom:1px solid #ccc;padding-bottom:2px;margin-bottom:8px;">
          ${escapeHtml(settings.companyName || '')} · ${escapeHtml((settings.companyAddress || '').replace(/\n/g, ' · '))}
        </div>

        <!-- Empfänger -->
        <div style="margin-bottom:30px;min-height:80px;">
          <strong>${escapeHtml(invoice.customerName || '')}</strong><br>
          ${escapeHtml(invoice.customerAddress || '').replace(/\n/g, '<br>')}
        </div>

        <!-- Dokumentkopf -->
        <div style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="font-size:14pt;font-weight:bold;">${escapeHtml(dt.label)} ${escapeHtml(invoice.number)}</div>
          <div style="text-align:right;font-size:9pt;color:#666;">
            <div>Datum: <strong>${formatDate(invoice.date)}</strong></div>
            ${invoice.dueDate ? `<div>${dt.hasPayment ? 'Fällig' : ['angebot','kostenvoranschlag'].includes(invoice.type) ? 'Gültig bis' : 'Datum'}: <strong>${formatDate(invoice.dueDate)}</strong></div>` : ''}
            ${hasServicePeriod ? `<div>Leistungszeitraum: ${invoice.serviceFrom ? formatDate(invoice.serviceFrom) : '?'} – ${invoice.serviceTo ? formatDate(invoice.serviceTo) : '?'}</div>` : ''}
          </div>
        </div>
        ${invoice.projectTitle ? `<div style="font-size:9pt;color:#666;margin-bottom:16px;">Projekt: ${escapeHtml(invoice.projectTitle)}</div>` : '<div style="margin-bottom:16px;"></div>'}

        <!-- Einleitungstext -->
        ${introText ? `<div style="margin-bottom:20px;font-size:10pt;line-height:1.6;white-space:pre-line;">${escapeHtml(introText)}</div>` : ''}

        <!-- Positionen -->
        ${positionsHtml}

        <!-- Zahlungsbedingungen (Skonto, Fälligkeit, Bankdaten) -->
        <div class="zahlungs-block">${zahlungHtml}</div>

        <!-- Reverse-Charge -->
        ${reverseChargeHtml}

        <!-- Handwerkerbonus -->
        ${handwerkerbonusHtml2}

        <!-- Gewährleistung -->
        ${gewaehrleistungHtml}

        <!-- Schlusstext -->
        ${closingText ? `<div style="margin-top:24px;font-size:10pt;line-height:1.6;white-space:pre-line;">${escapeHtml(closingText)}</div>` : ''}

        <!-- QR-Code -->
        <div class="qr-block">${qrHtml}</div>

        <!-- AGB-Hinweis -->
        ${settings.agbEnabled && settings.agbText ? `<div style="margin-top:20px;font-size:8.5pt;color:#555;font-style:italic;">${escapeHtml(settings.agbText)}</div>` : ''}

        <!-- Fußzeile: Pflichtangaben -->
        <div class="footer-block" style="margin-top:40px;padding-top:12px;border-top:1px solid #ddd;font-size:7.5pt;color:#999;line-height:1.6;">
          <div>${escapeHtml(settings.companyName || '')}${settings.companyOwner ? ' · Inhaber: ' + escapeHtml(settings.companyOwner) : ''} · ${escapeHtml((settings.companyAddress || '').replace(/\n/g, ' · '))}</div>
          <div>
            ${settings.companyPhone ? 'Tel: ' + escapeHtml(settings.companyPhone) + ' · ' : ''}
            ${settings.companyEmail ? escapeHtml(settings.companyEmail) + ' · ' : ''}
            ${settings.companyWebsite ? escapeHtml(settings.companyWebsite) : ''}
          </div>
          <div>
            ${settings.taxNumber ? 'Steuernummer: ' + escapeHtml(settings.taxNumber) : ''}
            ${settings.ustId ? ' · USt-IdNr.: ' + escapeHtml(settings.ustId) : ''}
          </div>
          <div>
            ${settings.bankIBAN ? 'IBAN: ' + escapeHtml(settings.bankIBAN) : ''}
            ${settings.bankBIC ? ' · BIC: ' + escapeHtml(settings.bankBIC) : ''}
            ${settings.bankName ? ' · ' + escapeHtml(settings.bankName) : ''}
            ${settings.bankKontoinhaber ? ' · Kto.-Inh.: ' + escapeHtml(settings.bankKontoinhaber) : ''}
          </div>
        </div>
      </div>
    `;
  },

  _buildGroupedRows(invoices) {
    // Gruppiere Belege: Finde "Wurzel"-Dokumente (ohne basedOnId oder deren Parent nicht existiert)
    const byId = Object.fromEntries(invoices.map(i => [i.id, i]));
    const childrenOf = {}; // parentId -> [children]
    const roots = [];

    for (const inv of invoices) {
      if (inv.basedOnId && byId[inv.basedOnId]) {
        if (!childrenOf[inv.basedOnId]) childrenOf[inv.basedOnId] = [];
        childrenOf[inv.basedOnId].push(inv);
      } else {
        roots.push(inv);
      }
    }

    // Sortiere Roots nach Datum absteigend
    roots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let html = '';
    for (const root of roots) {
      // Sammle die ganze Kette (root + children + children von children)
      const chain = this._collectChain(root.id, childrenOf);
      const hasChildren = chain.length > 0;
      const searchText = [root, ...chain].map(i => (i.number + ' ' + (i.projectTitle||'') + ' ' + (i.customerName||'')).toLowerCase()).join(' ');

      // Hauptzeile: Klick auf Zeile = aufklappen, Klick auf Nummer = oeffnen
      const dt = getDocType(root.type);
      html += `
        <tr class="clickable invoice-row"
            data-search="${escapeHtml(searchText)}"
            data-type="${root.type} ${chain.map(c=>c.type).join(' ')}"
            data-status="${root.status} ${chain.map(c=>c.status).join(' ')}"
            onclick="${hasChildren ? `InvoicesView._toggleChain('${root.id}')` : `app.navigate('invoices', '${root.id}')`}">
          <td>
            <a href="#" onclick="event.stopPropagation();app.navigate('invoices','${root.id}');return false;" style="text-decoration:none;color:inherit;">
              <code><strong>${escapeHtml(root.number)}</strong></code>
            </a>
            ${hasChildren ? `<span class="text-small text-muted" style="margin-left:4px;">(${chain.length + 1})</span>` : ''}
          </td>
          <td>${docTypeBadge(root.type)}</td>
          <td>
            ${root.projectTitle
              ? `${escapeHtml(root.projectTitle)}${root.customerName && root.customerName !== root.projectTitle ? `<br><span class="text-small text-muted">${escapeHtml(root.customerName)}</span>` : ''}`
              : escapeHtml(root.customerName || '–')}
          </td>
          <td>${formatDate(root.date)}</td>
          <td><strong>${formatCurrency(root.totalGross)}</strong></td>
          <td>${statusBadgeWithTip(root.status, INVOICE_STATUSES)}</td>
          <td>
            ${hasChildren ? `<span class="btn-icon chain-toggle" data-chain-toggle="${root.id}" style="font-size:0.8rem;">▼</span>` : ''}
            <button class="btn-icon" onclick="event.stopPropagation(); InvoicesView.showForm('${root.id}')" title="Bearbeiten">✏️</button>
          </td>
        </tr>`;

      // Kind-Zeilen (eingerückt, anfangs eingeklappt)
      for (const child of chain) {
        const cdt = getDocType(child.type);
        html += `
        <tr class="clickable invoice-chain-row" data-chain-parent="${root.id}"
            style="display:none;"
            onclick="app.navigate('invoices', '${child.id}')">
          <td style="padding-left:28px;">
            <span class="text-muted" style="margin-right:4px;">└</span>
            <code>${escapeHtml(child.number)}</code>
          </td>
          <td>${docTypeBadge(child.type)}</td>
          <td class="text-muted text-small">${escapeHtml(child.customerName || '')}</td>
          <td class="text-small">${formatDate(child.date)}</td>
          <td>${formatCurrency(child.totalGross)}</td>
          <td>${statusBadgeWithTip(child.status, INVOICE_STATUSES)}</td>
          <td>
            <button class="btn-icon" onclick="event.stopPropagation(); InvoicesView.showForm('${child.id}')" title="Bearbeiten">✏️</button>
          </td>
        </tr>`;
      }
    }
    return html;
  },

  _collectChain(parentId, childrenOf) {
    const children = childrenOf[parentId] || [];
    children.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const result = [];
    for (const child of children) {
      result.push(child);
      result.push(...this._collectChain(child.id, childrenOf));
    }
    return result;
  },

  _getValidStatuses(docType) {
    // Nur sinnvolle Status pro Dokumenttyp anzeigen
    if (INVOICE_LIKE_TYPES.includes(docType)) {
      // Rechnungen: alle Zahlungs-Status
      return INVOICE_STATUSES;
    }
    if (['angebot', 'kostenvoranschlag'].includes(docType)) {
      // Angebote: Entwurf, Gesendet, oder Storniert (abgelehnt)
      return [
        { value: 'entwurf', label: 'Entwurf', css: 'status-entwurf' },
        { value: 'gesendet', label: 'Gesendet', css: 'status-gesendet' },
        { value: 'storniert', label: 'Abgelehnt', css: 'status-entwurf' },
      ];
    }
    if (docType === 'auftragsbestaetigung') {
      return [
        { value: 'entwurf', label: 'Entwurf', css: 'status-entwurf' },
        { value: 'gesendet', label: 'Gesendet', css: 'status-gesendet' },
        { value: 'storniert', label: 'Storniert', css: 'status-entwurf' },
      ];
    }
    if (['mahnung1', 'mahnung2', 'mahnung3'].includes(docType)) {
      // Mahnungen: Entwurf, Gesendet
      return [
        { value: 'entwurf', label: 'Entwurf', css: 'status-entwurf' },
        { value: 'gesendet', label: 'Gesendet', css: 'status-gesendet' },
      ];
    }
    if (['stornorechnung', 'gutschrift'].includes(docType)) {
      return [
        { value: 'entwurf', label: 'Entwurf', css: 'status-entwurf' },
        { value: 'gesendet', label: 'Gesendet', css: 'status-gesendet' },
        { value: 'bezahlt', label: 'Erstattet', css: 'status-bezahlt' },
      ];
    }
    // Alle anderen (Lieferschein, Abnahmeprotokoll)
    return [
      { value: 'entwurf', label: 'Entwurf', css: 'status-entwurf' },
      { value: 'gesendet', label: 'Gesendet/Erledigt', css: 'status-gesendet' },
    ];
  },

  _toggleChain(parentId) {
    const rows = document.querySelectorAll(`[data-chain-parent="${parentId}"]`);
    const anyHidden = Array.from(rows).some(r => r.style.display === 'none');
    rows.forEach(r => r.style.display = anyHidden ? '' : 'none');
    // Pfeil drehen
    const toggle = document.querySelector(`[data-chain-toggle="${parentId}"]`);
    if (toggle) toggle.textContent = anyHidden ? '▲' : '▼';
  },

  filter() {
    const search = document.getElementById('invoice-search').value.toLowerCase();
    const typeFilter = document.getElementById('invoice-type-filter').value;
    const statusFilter = document.getElementById('invoice-status-filter').value;

    // Filtere Hauptzeilen -- Suche/Filter greift ueber die ganze Kette (data-search/type/status enthaelt alle Kinder)
    document.querySelectorAll('.invoice-row').forEach(row => {
      const text = row.dataset.search || '';
      const types = row.dataset.type || '';
      const statuses = row.dataset.status || '';
      const matchSearch = !search || text.includes(search);
      const matchType = !typeFilter || types.includes(typeFilter);
      const matchStatus = !statusFilter || statuses.includes(statusFilter);
      const visible = matchSearch && matchType && matchStatus;
      row.style.display = visible ? '' : 'none';
    });

    // Kind-Zeilen: verstecken wenn Eltern-Zeile versteckt ist
    const noFilter = !search && !typeFilter && !statusFilter;
    document.querySelectorAll('.invoice-chain-row').forEach(child => {
      const parentId = child.dataset.chainParent;
      if (!parentId) return;
      const parentRow = document.querySelector(`.invoice-row[onclick*="'${parentId}'"]`);
      if (!parentRow) return;
      if (parentRow.style.display === 'none') {
        // Eltern versteckt → Kinder auch verstecken
        child.style.display = 'none';
      } else if (noFilter) {
        // Kein Filter aktiv → Kinder bleiben im Toggle-Zustand (nicht aendern)
      } else {
        // Filter aktiv + Eltern sichtbar → Kinder anzeigen (aufklappen)
        child.style.display = '';
      }
    });
  },

  async showForm(editId) {
    let invoice = editId ? await db.get(STORES.invoices, editId) : null;
    const isEdit = !!invoice;
    const projects = await db.getAll(STORES.projects);
    const customers = await db.getAll(STORES.customers);
    const defaultPaymentDays = await db.getSetting('defaultPaymentDays', 14);
    const defaultSkontoRate = await db.getSetting('skontoRate', 2);
    const defaultSkontoFrist = await db.getSetting('skontoFrist', 10);

    if (!invoice) {
      invoice = {
        type: 'angebot',
        status: 'entwurf',
        date: todayISO(),
        dueDate: calcDueDate(todayISO(), defaultPaymentDays),
        positions: [{ description: '', quantity: 1, unit: 'Stück', unitPrice: 0, mwstRate: 19, discount: 0, total: 0 }],
        totalNet: 0,
        totalGross: 0,
        skontoEnabled: false,
        skontoRate: defaultSkontoRate,
        skontoFrist: defaultSkontoFrist,
      };
    }

    const unitOptions = (selected) => UNITS.map(u =>
      `<option value="${u}" ${u === selected ? 'selected' : ''}>${escapeHtml(u)}</option>`
    ).join('');

    const mwstOptions = (selected) => MWST_RATES.map(r =>
      `<option value="${r}" ${r === selected ? 'selected' : ''}>${r}%</option>`
    ).join('');

    const positionsHtml = (invoice.positions || []).map((pos, i) => `
      <div class="calc-position" data-index="${i}">
        <input type="text" name="pos-desc" placeholder="Beschreibung" value="${escapeHtml(pos.description || '')}">
        <select name="pos-unit" onchange="InvoicesView._recalcForm()">${unitOptions(pos.unit || 'Stück')}</select>
        <input type="number" name="pos-qty" placeholder="Menge" value="${pos.quantity || 1}" min="0" step="any" onchange="InvoicesView._recalcForm()">
        <input type="number" name="pos-price" placeholder="EP" value="${pos.unitPrice || 0}" min="0" step="0.01" onchange="InvoicesView._recalcForm()">
        <select name="pos-mwst" onchange="InvoicesView._recalcForm()">${mwstOptions(pos.mwstRate != null ? pos.mwstRate : 19)}</select>
        <input type="number" name="pos-discount" placeholder="%" value="${pos.discount || 0}" min="0" max="100" step="0.5" onchange="InvoicesView._recalcForm()">
        <span class="pos-total text-right">${formatCurrency(pos.total || 0)}</span>
        <button type="button" class="btn-icon" onclick="this.closest('.calc-position').remove(); InvoicesView._recalcForm()">🗑️</button>
      </div>
    `).join('');

    const html = `
      <form id="invoice-form">
        <div class="form-row">
          <div class="form-group">
            <label>Dokumenttyp</label>
            <select name="type">
              ${DOC_TYPES.filter(dt => dt.hasPositions).map(dt =>
                `<option value="${dt.value}" ${dt.value === invoice.type ? 'selected' : ''}>${escapeHtml(dt.label)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              ${selectOptions(INVOICE_STATUSES, invoice.status)}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Rechnungsdatum</label>
            <input type="date" name="date" value="${invoice.date || todayISO()}">
          </div>
          <div class="form-group">
            <label>Zahlungsziel (fällig am)</label>
            <input type="date" name="dueDate" value="${invoice.dueDate || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Leistungszeitraum von</label>
            <input type="date" name="serviceFrom" value="${invoice.serviceFrom || ''}">
          </div>
          <div class="form-group">
            <label>Leistungszeitraum bis</label>
            <input type="date" name="serviceTo" value="${invoice.serviceTo || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Rechnungsmodus</label>
            <select name="invoiceMode">
              <option value="netto" ${(invoice.invoiceMode || 'netto') === 'netto' ? 'selected' : ''}>Netto (+ MwSt.)</option>
              <option value="brutto" ${invoice.invoiceMode === 'brutto' ? 'selected' : ''}>Brutto (inkl. MwSt.)</option>
            </select>
          </div>
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:20px;">
              <input type="checkbox" name="reverseCharge" ${invoice.reverseCharge ? 'checked' : ''}>
              <span>Reverse-Charge (§13b UStG)</span>
            </label>
            <p class="text-small text-muted">Steuerschuldnerschaft beim Leistungsempfänger</p>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Anrede</label>
            <select name="customerAnrede">
              <option value="" ${!invoice.customerAnrede ? 'selected' : ''}>–</option>
              <option value="Herr" ${invoice.customerAnrede === 'Herr' ? 'selected' : ''}>Herr</option>
              <option value="Frau" ${invoice.customerAnrede === 'Frau' ? 'selected' : ''}>Frau</option>
              <option value="Firma" ${invoice.customerAnrede === 'Firma' ? 'selected' : ''}>Firma</option>
            </select>
          </div>
          <div class="form-group">
            <label>Projekt</label>
            <select name="projectId" onchange="InvoicesView._onProjectChange(this)">
              <option value="">– Kein Projekt –</option>
              ${projects.map(p => `<option value="${p.id}" data-customer="${p.customerId || ''}" ${invoice.projectId === p.id ? 'selected' : ''}>${escapeHtml(p.title)} (${p.projectId})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Kunde</label>
            <input type="text" name="customerName" value="${escapeHtml(invoice.customerName || '')}" placeholder="Name">
          </div>
        </div>
        <div class="form-group">
          <label>Kundenadresse</label>
          <textarea name="customerAddress" rows="2">${escapeHtml(invoice.customerAddress || '')}</textarea>
        </div>

        <h4 class="mb-8 mt-16">Positionen</h4>
        <div class="calc-position" style="font-weight:600;font-size:0.75rem;color:var(--gray-500);border-bottom:2px solid var(--gray-200);padding-bottom:4px;">
          <span>Beschreibung</span><span>Einheit</span><span>Menge</span><span>EP (€)</span><span>MwSt</span><span>Rabatt</span><span style="text-align:right;">Gesamt</span><span></span>
        </div>
        <div id="invoice-positions">
          ${positionsHtml}
        </div>
        <div class="btn-group mt-8">
          <button type="button" class="btn btn-small btn-secondary" onclick="InvoicesView._addFormPosition()">+ Position</button>
          <button type="button" class="btn btn-small btn-secondary" onclick="InvoicesView._showTextBlockPicker()">📋 Textbaustein</button>
        </div>

        <div class="calc-summary mt-16" id="inv-form-summary">
          <div class="calc-summary-row"><span>Netto</span><span id="inv-form-net">${formatCurrency(invoice.totalNet)}</span></div>
          <div id="inv-form-tax-rows"></div>
          <div class="calc-summary-row total"><span>Brutto</span><span id="inv-form-gross">${formatCurrency(invoice.totalGross)}</span></div>
        </div>

        <!-- Skonto pro Beleg -->
        <div class="card mt-16" style="background:var(--gray-50);padding:16px;">
          <div class="flex-between mb-8">
            <label style="font-weight:600;font-size:0.9rem;">
              <input type="checkbox" name="skontoEnabled" ${invoice.skontoEnabled ? 'checked' : ''} onchange="InvoicesView._toggleSkonto(this.checked)"> Skonto gewähren
            </label>
          </div>
          <div id="skonto-fields" class="${invoice.skontoEnabled ? '' : 'hidden'}">
            <div class="form-row">
              <div class="form-group">
                <label>Skonto (%)</label>
                <input type="number" name="skontoRate" step="0.5" min="0" max="100" value="${invoice.skontoRate || 2}" onchange="InvoicesView._recalcForm()">
                ${presetChips('skontoRate', [2, 3, 5], '%')}
              </div>
              <div class="form-group">
                <label>Skontofrist (Tage)</label>
                <input type="number" name="skontoFrist" step="1" min="1" max="90" value="${invoice.skontoFrist || 10}">
                ${presetChips('skontoFrist', [7, 10, 14], ' Tage')}
              </div>
              <div class="form-group">
                <label>Betrag nach Skonto</label>
                <span id="inv-form-skonto" class="text-small" style="font-weight:600;display:block;margin-top:6px;">${invoice.skontoEnabled ? formatCurrency((invoice.totalGross || 0) * (1 - (invoice.skontoRate || 2) / 100)) : '–'}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group mt-16">
          <label>Bemerkungen</label>
          <textarea name="notes" rows="3">${escapeHtml(invoice.notes || '')}</textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Speichern' : 'Erstellen'}</button>
        </div>
      </form>
    `;

    openModal(isEdit ? 'Beleg bearbeiten' : 'Neuer Beleg', html);
    InvoicesView._customers = customers;
    InvoicesView._recalcForm();

    document.getElementById('invoice-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const type = fd.get('type');

      if (!isEdit) {
        invoice.id = generateId();
        invoice.number = await db.getNextNumber(type);
        invoice.createdAt = new Date().toISOString();
      }

      const selectedProject = fd.get('projectId');
      let projectTitle = '';
      if (selectedProject) {
        const proj = await db.get(STORES.projects, selectedProject);
        projectTitle = proj?.title || '';
      }

      invoice.type = type;
      invoice.status = fd.get('status');
      invoice.date = fd.get('date');
      invoice.dueDate = fd.get('dueDate') || null;
      invoice.serviceFrom = fd.get('serviceFrom') || null;
      invoice.serviceTo = fd.get('serviceTo') || null;
      invoice.invoiceMode = fd.get('invoiceMode') || 'netto';
      invoice.reverseCharge = fd.has('reverseCharge');
      invoice.projectId = selectedProject || null;
      invoice.projectTitle = projectTitle;
      invoice.customerAnrede = fd.get('customerAnrede') || '';
      invoice.customerName = fd.get('customerName');
      invoice.customerAddress = fd.get('customerAddress');
      invoice.notes = fd.get('notes');
      invoice.positions = InvoicesView._collectFormPositions()
        .filter(p => p.description.trim() || p.total > 0); // Leere Zeilen entfernen

      // Berechnung: Positionen → Netto → MwSt pro Satz → Brutto
      // 1. Jede Position: Menge × Einzelpreis × (1 - discount/100)
      invoice.positions.forEach((p, i) => {
        p.pos = i + 1;
        const discountFactor = 1 - ((p.discount || 0) / 100);
        p.total = Math.round((p.quantity || 0) * (p.unitPrice || 0) * discountFactor * 100) / 100;
      });
      // 2. Netto = Summe aller Positions-Totals
      invoice.totalNet = Math.round(invoice.positions.reduce((s, p) => s + p.total, 0) * 100) / 100;
      // 3. Brutto = Netto + MwSt grouped by rate (oder = Netto bei Kleinunternehmer)
      const isKU = await isKleinunternehmer();
      if (isKU) {
        invoice.totalTax = 0;
        invoice.totalGross = invoice.totalNet;
      } else {
        // Group by mwstRate
        const taxByRate = {};
        invoice.positions.forEach(p => {
          const rate = p.mwstRate != null ? p.mwstRate : 19;
          taxByRate[rate] = (taxByRate[rate] || 0) + p.total * (rate / 100);
        });
        invoice.totalTax = Math.round(Object.values(taxByRate).reduce((s, v) => s + v, 0) * 100) / 100;
        invoice.totalGross = Math.round((invoice.totalNet + invoice.totalTax) * 100) / 100;
      }
      invoice.kleinunternehmer = isKU;

      // Skonto pro Beleg
      invoice.skontoEnabled = fd.has('skontoEnabled');
      invoice.skontoRate = parseFloat(fd.get('skontoRate')) || 2;
      invoice.skontoFrist = parseInt(fd.get('skontoFrist')) || 10;

      invoice.updatedAt = new Date().toISOString();

      // Gegenprüfung vor dem Speichern
      const checkErrors = Validator.checkInvoice(invoice, isKU, MWST_RATE);
      const realErrors = checkErrors.filter(e => e.severity === 'error');
      if (realErrors.length > 0) {
        console.warn('Validator-Fehler beim Speichern:', realErrors);
        // Auto-Korrektur
        realErrors.forEach(err => {
          if (err.fix) {
            if (err.fix.posIndex !== undefined) {
              invoice.positions[err.fix.posIndex][err.fix.field] = err.fix.correctValue;
            } else {
              invoice[err.fix.field] = err.fix.correctValue;
            }
          }
        });
      }

      await db.put(STORES.invoices, invoice);
      closeModal();
      showToast(isEdit ? 'Beleg gespeichert' : `${getDocType(type).label} ${invoice.number} erstellt`);
      app.navigate('invoices', invoice.id);
    };
  },

  _onProjectChange(select) {
    const option = select.options[select.selectedIndex];
    const customerId = option?.dataset?.customer;
    if (customerId && InvoicesView._customers) {
      const customer = InvoicesView._customers.find(c => c.id === customerId);
      if (customer) {
        const nameInput = document.querySelector('[name="customerName"]');
        const addrInput = document.querySelector('[name="customerAddress"]');
        if (nameInput && !nameInput.value) nameInput.value = customer.name;
        if (addrInput && !addrInput.value) addrInput.value = customer.address || '';
      }
    }
  },

  _addFormPosition(prefill) {
    const container = document.getElementById('invoice-positions');
    const index = container.children.length;
    const desc = prefill?.description || '';
    const unit = prefill?.unit || 'Stück';
    const qty = prefill?.quantity || 1;
    const price = prefill?.unitPrice || 0;
    const mwst = prefill?.mwstRate != null ? prefill.mwstRate : 19;
    const discount = prefill?.discount || 0;
    const discountFactor = 1 - (discount / 100);
    const total = Math.round(qty * price * discountFactor * 100) / 100;

    const unitOpts = UNITS.map(u =>
      `<option value="${u}" ${u === unit ? 'selected' : ''}>${escapeHtml(u)}</option>`
    ).join('');
    const mwstOpts = MWST_RATES.map(r =>
      `<option value="${r}" ${r === mwst ? 'selected' : ''}>${r}%</option>`
    ).join('');

    container.insertAdjacentHTML('beforeend', `
      <div class="calc-position" data-index="${index}">
        <input type="text" name="pos-desc" placeholder="Beschreibung" value="${escapeHtml(desc)}">
        <select name="pos-unit" onchange="InvoicesView._recalcForm()">${unitOpts}</select>
        <input type="number" name="pos-qty" placeholder="Menge" value="${qty}" min="0" step="any" onchange="InvoicesView._recalcForm()">
        <input type="number" name="pos-price" placeholder="EP" value="${price}" min="0" step="0.01" onchange="InvoicesView._recalcForm()">
        <select name="pos-mwst" onchange="InvoicesView._recalcForm()">${mwstOpts}</select>
        <input type="number" name="pos-discount" placeholder="%" value="${discount}" min="0" max="100" step="0.5" onchange="InvoicesView._recalcForm()">
        <span class="pos-total text-right">${formatCurrency(total)}</span>
        <button type="button" class="btn-icon" onclick="this.closest('.calc-position').remove(); InvoicesView._recalcForm()">🗑️</button>
      </div>
    `);
    InvoicesView._recalcForm();
  },

  async _showTextBlockPicker() {
    const blocks = await getAllTextBlocks();
    const html = `
      <div class="toolbar mb-16">
        <input type="text" class="search-input" placeholder="Textbaustein suchen..." id="tb-picker-search" oninput="InvoicesView._filterPickerBlocks()">
        <select class="filter-select" id="tb-picker-cat" onchange="InvoicesView._filterPickerBlocks()">
          <option value="">Alle Kategorien</option>
          ${TEXT_BLOCK_CATEGORIES.map(c => `<option value="${c.value}">${escapeHtml(c.label)}</option>`).join('')}
        </select>
      </div>
      <div id="tb-picker-list">
        ${blocks.map(b => {
          const desc = b.description.replace(/'/g, "\\'").replace(/"/g, '&quot;');
          return `
          <div class="tb-picker-item" data-code="${escapeHtml(b.code.toLowerCase())}" data-desc="${escapeHtml(b.description.toLowerCase())}" data-cat="${b.category}">
            <div class="flex-between">
              <div>
                <code class="text-small">${escapeHtml(b.code)}</code>
                <span class="badge badge-gray ml-8">${escapeHtml(b.unit || '')}</span>
              </div>
              <button class="btn btn-small btn-primary" onclick="InvoicesView._insertTextBlock('${desc}', '${escapeHtml(b.unit || '')}', '${b.type || 'material'}')">Einfügen</button>
            </div>
            <div class="text-small mt-8">${escapeHtml(b.description)}</div>
          </div>`;
        }).join('')}
      </div>
    `;
    openPicker('Textbaustein einfügen', html);
  },

  _filterPickerBlocks() {
    const search = (document.getElementById('tb-picker-search')?.value || '').toLowerCase();
    const cat = document.getElementById('tb-picker-cat')?.value || '';
    document.querySelectorAll('#tb-picker-list .tb-picker-item').forEach(item => {
      const code = item.dataset.code;
      const desc = item.dataset.desc;
      const itemCat = item.dataset.cat;
      const matchSearch = !search || code.includes(search) || desc.includes(search);
      const matchCat = !cat || itemCat === cat;
      item.style.display = (matchSearch && matchCat) ? '' : 'none';
    });
  },

  _insertTextBlock(description, unit, type) {
    closePicker();
    InvoicesView._addFormPosition({ description, unit, quantity: 1, unitPrice: 0 });
  },

  _toggleSkonto(enabled) {
    const fields = document.getElementById('skonto-fields');
    if (fields) fields.classList.toggle('hidden', !enabled);
    InvoicesView._recalcForm();
  },

  _collectFormPositions() {
    return Array.from(document.querySelectorAll('#invoice-positions .calc-position')).map((row, i) => {
      const description = row.querySelector('[name="pos-desc"]').value;
      const unitEl = row.querySelector('[name="pos-unit"]');
      const unit = unitEl ? unitEl.value : 'Stück';
      const quantity = parseFloat(row.querySelector('[name="pos-qty"]').value) || 0;
      const unitPrice = parseFloat(row.querySelector('[name="pos-price"]').value) || 0;
      const mwstEl = row.querySelector('[name="pos-mwst"]');
      const mwstRate = mwstEl ? parseInt(mwstEl.value) : 19;
      const discountEl = row.querySelector('[name="pos-discount"]');
      const discount = discountEl ? (parseFloat(discountEl.value) || 0) : 0;
      const discountFactor = 1 - (discount / 100);
      const total = Math.round(quantity * unitPrice * discountFactor * 100) / 100;
      return { pos: i + 1, description, unit, quantity, unitPrice, mwstRate, discount, total };
    });
  },

  _recalcForm() {
    const positions = InvoicesView._collectFormPositions();
    document.querySelectorAll('#invoice-positions .calc-position').forEach((row, i) => {
      if (positions[i]) {
        row.querySelector('.pos-total').textContent = formatCurrency(positions[i].total);
      }
    });
    const net = positions.reduce((s, p) => s + p.total, 0);

    // Group tax by rate
    const taxByRate = {};
    positions.forEach(p => {
      const rate = p.mwstRate != null ? p.mwstRate : 19;
      taxByRate[rate] = (taxByRate[rate] || 0) + p.total * (rate / 100);
    });
    const totalTax = Object.values(taxByRate).reduce((s, v) => s + v, 0);
    const gross = net + totalTax;

    document.getElementById('inv-form-net').textContent = formatCurrency(net);

    // Build tax rows grouped by rate
    const taxRowsEl = document.getElementById('inv-form-tax-rows');
    if (taxRowsEl) {
      const rates = Object.keys(taxByRate).map(Number).sort((a, b) => b - a);
      taxRowsEl.innerHTML = rates.map(rate =>
        `<div class="calc-summary-row"><span>MwSt. ${rate}%</span><span>${formatCurrency(taxByRate[rate])}</span></div>`
      ).join('');
    }

    document.getElementById('inv-form-gross').textContent = formatCurrency(gross);

    // Skonto aktualisieren
    const skontoEl = document.getElementById('inv-form-skonto');
    const skontoCheck = document.querySelector('[name="skontoEnabled"]');
    const skontoRateInput = document.querySelector('[name="skontoRate"]');
    if (skontoEl && skontoCheck && skontoRateInput) {
      if (skontoCheck.checked) {
        const rate = parseFloat(skontoRateInput.value) || 0;
        skontoEl.textContent = formatCurrency(gross * (1 - rate / 100));
      } else {
        skontoEl.textContent = '–';
      }
    }
  },

  async createForProject(projectId, customerName, customerAddress, docType) {
    const project = await db.get(STORES.projects, projectId);
    if (!project) return;
    const dt = getDocType(docType);
    const number = await db.getNextNumber(docType);

    const invoice = {
      id: generateId(),
      number,
      type: docType,
      status: 'entwurf',
      date: todayISO(),
      dueDate: null,
      projectId,
      projectTitle: project.title,
      customerName: customerName || '',
      customerAddress: customerAddress || '',
      positions: [],
      totalNet: 0,
      totalGross: 0,
      notes: '',
      createdAt: new Date().toISOString(),
    };

    await db.put(STORES.invoices, invoice);
    showToast(`${dt.label} ${number} erstellt`);
    app.navigate('invoices', invoice.id);
  },

  async createFromCalc(projectId, calcId, docType) {
    docType = docType || 'angebot';
    const project = await db.get(STORES.projects, projectId);
    const calc = await db.get(STORES.calculations, calcId);
    if (!project || !calc) return;

    const dtInfo = getDocType(docType);

    let customerName = '';
    let customerAddress = '';
    if (project.customerId) {
      const customer = await db.get(STORES.customers, project.customerId);
      if (customer) {
        customerName = customer.name;
        customerAddress = customer.address || '';
      }
    }

    const number = await db.getNextNumber(docType);

    const invoice = {
      id: generateId(),
      number,
      type: docType,
      status: 'entwurf',
      date: todayISO(),
      dueDate: docType === 'angebot' || docType === 'kostenvoranschlag' ? calcDueDate(todayISO(), 30) : null,
      projectId: project.id,
      projectTitle: project.title,
      customerName,
      customerAddress,
      positions: (calc.positions || []).map((p, i) => ({
        pos: i + 1,
        description: p.description,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        total: p.total,
        type: p.type,
        unit: p.unit || 'Stück',
        mwstRate: p.mwstRate != null ? p.mwstRate : 19,
        discount: p.discount || 0,
      })),
      totalNet: calc.totalNet || 0,
      totalGross: nettoToBrutto(calc.totalNet || 0),
      notes: '',
      createdAt: new Date().toISOString(),
    };

    const isKU = await isKleinunternehmer();
    if (isKU) {
      invoice.totalGross = invoice.totalNet;
    }

    await db.put(STORES.invoices, invoice);
    showToast(`${dtInfo.label} ${invoice.number} erstellt`);
    app.navigate('invoices', invoice.id);
  },

  async convertTo(id, targetType) {
    const source = await db.get(STORES.invoices, id);
    if (!source) return;
    const dtLabel = getDocType(targetType).label;

    // Prüfe ob schon ein Dokument dieses Typs aus diesem Beleg erstellt wurde
    const allDocs = await db.getAll(STORES.invoices);
    const existing = allDocs.find(d => d.basedOnId === id && d.type === targetType);
    if (existing) {
      const action = confirm(`Es gibt bereits ${dtLabel} ${existing.number} für diesen Beleg.\n\nMöchtest du die vorhandene öffnen?\n\n(OK = Öffnen, Abbrechen = Nichts tun)`);
      if (action) {
        app.navigate('invoices', existing.id);
      }
      return;
    }

    if (!confirm(`${dtLabel} aus diesem Beleg erstellen?`)) return;

    const number = await db.getNextNumber(targetType);
    const defaultPaymentDays = await db.getSetting('defaultPaymentDays', 14);
    const hasPayment = getDocType(targetType).hasPayment;

    const defaultSkontoRate = await db.getSetting('skontoRate', 2);
    const defaultSkontoFrist = await db.getSetting('skontoFrist', 10);

    const newDoc = {
      ...source,
      id: generateId(),
      number,
      type: targetType,
      status: hasPayment ? 'offen' : 'entwurf',
      date: todayISO(),
      dueDate: hasPayment ? calcDueDate(todayISO(), defaultPaymentDays) : null,
      basedOnId: source.id,
      createdAt: new Date().toISOString(),
      // Skonto: von Vorgänger übernehmen wenn der Zieltyp es unterstützt
      skontoEnabled: getDocType(targetType).canSkonto ? (source.skontoEnabled || false) : false,
      skontoRate: defaultSkontoRate,
      skontoFrist: defaultSkontoFrist,
    };
    delete newDoc.updatedAt;

    // Storno: Negative amounts, immer Entwurf
    if (targetType === 'stornorechnung') {
      newDoc.positions = (source.positions || []).map(p => ({
        ...p,
        total: -(p.total || 0),
        unitPrice: -(p.unitPrice || 0),
      }));
      newDoc.totalNet = -(source.totalNet || 0);
      newDoc.totalGross = -(source.totalGross || 0);
      newDoc.status = 'entwurf'; // Storno ist nie direkt "offen"
      source.status = 'storniert';
      source.updatedAt = new Date().toISOString();
      await db.put(STORES.invoices, source);
    }

    // Schlussrechnung: Abschlagsrechnungen verrechnen
    if (targetType === 'schlussrechnung') {
      const allDocs = await db.getAll(STORES.invoices);
      const abschlaege = allDocs.filter(d =>
        d.type === 'abschlagsrechnung' &&
        d.projectId === source.projectId &&
        d.status === 'bezahlt'
      );
      if (abschlaege.length > 0) {
        const abschlagSummeNet = Math.round(abschlaege.reduce((s, a) => s + (a.totalNet || 0), 0) * 100) / 100;
        const abschlagSummeGross = Math.round(abschlaege.reduce((s, a) => s + (a.totalGross || 0), 0) * 100) / 100;
        newDoc.abschlaege = abschlaege.map(a => ({
          number: a.number, date: a.date, totalNet: a.totalNet, totalGross: a.totalGross,
        }));
        newDoc.abschlagSummeNet = abschlagSummeNet;
        newDoc.abschlagSummeGross = abschlagSummeGross;
        // Restbetrag berechnen
        newDoc.restNet = Math.round(((newDoc.totalNet || 0) - abschlagSummeNet) * 100) / 100;
        newDoc.restGross = Math.round(((newDoc.totalGross || 0) - abschlagSummeGross) * 100) / 100;
        newDoc.notes = (newDoc.notes || '') +
          `\n\nBereits geleistete Abschlagszahlungen:\n` +
          abschlaege.map(a => `  ${a.number} vom ${formatDate(a.date)}: ${formatCurrency(a.totalGross)}`).join('\n') +
          `\nSumme Abschläge: ${formatCurrency(abschlagSummeGross)}` +
          `\n\nVerbleibender Restbetrag: ${formatCurrency(newDoc.restGross)}`;
      }
    }

    await db.put(STORES.invoices, newDoc);
    showToast(`${dtLabel} ${newDoc.number} erstellt`);
    app.navigate('invoices', newDoc.id);
  },

  async createMahnung(invoiceId) {
    const invoice = await db.get(STORES.invoices, invoiceId);
    if (!invoice) return;

    // Determine mahnung level based on existing mahnungen
    const allDocs = await db.getAll(STORES.invoices);
    const existingMahnungen = allDocs.filter(d =>
      ['mahnung1', 'mahnung2', 'mahnung3'].includes(d.type) && d.basedOnId === invoiceId
    );
    let mahnungType = 'mahnung1';
    if (existingMahnungen.some(m => m.type === 'mahnung2')) mahnungType = 'mahnung3';
    else if (existingMahnungen.some(m => m.type === 'mahnung1')) mahnungType = 'mahnung2';

    const dtLabel = getDocType(mahnungType).label;
    if (!confirm(`${dtLabel} für Rechnung ${invoice.number} erstellen?`)) return;

    const number = await db.getNextNumber(mahnungType);
    const defaultPaymentDays = await db.getSetting('defaultPaymentDays', 14);

    const mahnung = {
      id: generateId(),
      number,
      type: mahnungType,
      status: 'entwurf',
      date: todayISO(),
      dueDate: calcDueDate(todayISO(), defaultPaymentDays),
      projectId: invoice.projectId,
      projectTitle: invoice.projectTitle,
      customerName: invoice.customerName,
      customerAnrede: invoice.customerAnrede,
      customerAddress: invoice.customerAddress,
      basedOnId: invoiceId,
      referencedInvoiceNumber: invoice.number,
      totalNet: invoice.totalNet,
      totalGross: invoice.totalGross,
      positions: [],
      notes: '',
      createdAt: new Date().toISOString(),
    };

    // Update invoice status to ueberfaellig
    invoice.status = 'ueberfaellig';
    invoice.updatedAt = new Date().toISOString();
    await db.put(STORES.invoices, invoice);

    await db.put(STORES.invoices, mahnung);
    showToast(`${dtLabel} ${mahnung.number} erstellt`);
    app.navigate('invoices', mahnung.id);
  },

  async copyEmailText(id) {
    const invoice = await db.get(STORES.invoices, id);
    if (!invoice) return;
    const template = await getDocTemplate(invoice.type);
    const firma = await db.getSetting('companyName', 'Mein Elektrobetrieb');
    const placeholders = {
      dokumentnr: invoice.number,
      anrede: invoice.customerAnrede || '',
      name: invoice.customerName || '',
      firma,
      datum: formatDate(invoice.date),
      faelligkeitsdatum: invoice.dueDate ? formatDate(invoice.dueDate) : '',
      projektname: invoice.projectTitle || '',
      betrag: formatCurrency(invoice.totalGross),
    };
    const subject = replaceTemplatePlaceholders(template.subject, placeholders);
    const body = replaceTemplatePlaceholders(template.email || template.intro + '\n\n' + template.closing, placeholders);
    const fullText = `Betreff: ${subject}\n\n${body}`;

    try {
      await navigator.clipboard.writeText(fullText);
      showToast('E-Mail-Text in Zwischenablage kopiert');
    } catch (e) {
      // Fallback
      openModal('E-Mail-Text', `<textarea style="width:100%;height:300px;font-family:inherit;">${escapeHtml(fullText)}</textarea>`);
    }
  },

  async updateStatus(id, newStatus) {
    const invoice = await db.get(STORES.invoices, id);
    if (!invoice) return;

    // Bei "bezahlt": Bezahldatum und Betrag erfassen
    if (newStatus === 'bezahlt' && INVOICE_LIKE_TYPES.includes(invoice.type)) {
      const paidAmount = prompt(`Eingegangener Betrag (€):\n(Leer lassen = voller Betrag ${formatCurrency(invoice.totalGross)})`, invoice.totalGross?.toFixed(2) || '');
      if (paidAmount === null) return; // Abgebrochen
      invoice.paidAmount = parseFloat(paidAmount) || invoice.totalGross;
      invoice.paidDate = todayISO();

      // Wenn weniger als Brutto bezahlt → Teilbezahlt
      if (invoice.paidAmount < invoice.totalGross - 0.01) {
        newStatus = 'teilbezahlt';
        showToast(`Teilzahlung: ${formatCurrency(invoice.paidAmount)} von ${formatCurrency(invoice.totalGross)} erfasst`);
      }
    }

    invoice.status = newStatus;
    invoice.updatedAt = new Date().toISOString();
    await db.put(STORES.invoices, invoice);
    showToast('Status aktualisiert');
    app.refresh();
  },

  async showSkontoQuick(id) {
    const invoice = await db.get(STORES.invoices, id);
    if (!invoice) return;
    const defaultRate = await db.getSetting('skontoRate', 2);
    const defaultFrist = await db.getSetting('skontoFrist', 10);

    const html = `
      <form id="skonto-quick-form">
        <p class="mb-16">Skonto für <strong>${escapeHtml(invoice.number)}</strong> (${formatCurrency(invoice.totalGross)} brutto)</p>
        <div class="form-row">
          <div class="form-group">
            <label>Skonto (%)</label>
            <input type="number" name="rate" step="0.5" min="0.5" max="20" value="${defaultRate}" id="sq-rate" onchange="InvoicesView._updateSkontoPreview()">
            ${presetChips('rate', [2, 3, 5], '%')}
          </div>
          <div class="form-group">
            <label>Frist (Tage)</label>
            <input type="number" name="frist" step="1" min="1" max="90" value="${defaultFrist}" onchange="InvoicesView._updateSkontoPreview()">
            ${presetChips('frist', [7, 10, 14], ' Tage')}
          </div>
        </div>
        <div class="info-box mt-8" id="sq-preview" style="font-size:0.9rem;">
          ${InvoicesView._skontoPreviewText(invoice.totalGross, defaultRate, defaultFrist, invoice.date)}
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
          <button type="submit" class="btn btn-primary">Skonto speichern</button>
        </div>
      </form>
    `;
    openModal('Skonto vergeben', html);

    // Store for preview updates
    InvoicesView._sqInvoice = invoice;

    document.getElementById('skonto-quick-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      invoice.skontoEnabled = true;
      invoice.skontoRate = parseFloat(fd.get('rate')) || 2;
      invoice.skontoFrist = parseInt(fd.get('frist')) || 10;
      invoice.updatedAt = new Date().toISOString();
      await db.put(STORES.invoices, invoice);
      closeModal();
      showToast(`${invoice.skontoRate}% Skonto aktiviert`);
      app.refresh();
    };
  },

  _skontoPreviewText(gross, rate, frist, dateStr) {
    const betrag = Math.round(gross * (rate / 100) * 100) / 100;
    const nach = Math.round((gross - betrag) * 100) / 100;
    const bis = dateStr && frist ? formatDate(calcDueDate(dateStr, frist)) : '–';
    return `Bei Zahlung bis <strong>${bis}</strong>: <strong>${rate}%</strong> Skonto = <strong>${formatCurrency(betrag)}</strong> Abzug.<br>Kunde zahlt dann: <strong>${formatCurrency(nach)}</strong>`;
  },

  _updateSkontoPreview() {
    const inv = InvoicesView._sqInvoice;
    if (!inv) return;
    const rate = parseFloat(document.querySelector('#skonto-quick-form [name="rate"]')?.value) || 0;
    const frist = parseInt(document.querySelector('#skonto-quick-form [name="frist"]')?.value) || 10;
    const el = document.getElementById('sq-preview');
    if (el) el.innerHTML = InvoicesView._skontoPreviewText(inv.totalGross, rate, frist, inv.date);
  },

  async toggleSkontoOnInvoice(id, enabled) {
    const invoice = await db.get(STORES.invoices, id);
    if (!invoice) return;
    invoice.skontoEnabled = enabled;
    invoice.updatedAt = new Date().toISOString();
    await db.put(STORES.invoices, invoice);
    showToast(enabled ? 'Skonto aktiviert' : 'Skonto deaktiviert');
    app.refresh();
  },

  async recalcTax(id) {
    const invoice = await db.get(STORES.invoices, id);
    if (!invoice) return;
    const isKU = await isKleinunternehmer();
    if (isKU) {
      invoice.totalTax = 0;
      invoice.totalGross = invoice.totalNet;
    } else {
      // Group by per-position mwstRate
      const taxByRate = {};
      (invoice.positions || []).forEach(p => {
        const rate = p.mwstRate != null ? p.mwstRate : 19;
        taxByRate[rate] = (taxByRate[rate] || 0) + (p.total || 0) * (rate / 100);
      });
      invoice.totalTax = Math.round(Object.values(taxByRate).reduce((s, v) => s + v, 0) * 100) / 100;
      invoice.totalGross = Math.round((invoice.totalNet + invoice.totalTax) * 100) / 100;
    }
    invoice.kleinunternehmer = isKU;
    invoice.updatedAt = new Date().toISOString();
    await db.put(STORES.invoices, invoice);
    showToast(isKU ? 'Beleg auf Kleinunternehmer (ohne MwSt.) angepasst' : 'Beleg mit MwSt. neu berechnet');
    app.refresh();
  },

  async downloadAgb() {
    const agbPdf = await db.getSetting('agbPdf', '');
    if (!agbPdf) {
      showToast('Keine AGB hinterlegt. Geh zu Einstellungen → AGB.', 'error');
      return;
    }
    const a = document.createElement('a');
    a.href = agbPdf;
    a.download = 'AGB.pdf';
    a.click();
  },

  async exportPDF(id) {
    const invoice = await db.get(STORES.invoices, id);
    if (!invoice) return;
    const previewEl = document.getElementById('invoice-preview');
    if (!previewEl) {
      showToast('Vorschau nicht verfügbar', 'error');
      return;
    }
    const dt = getDocType(invoice.type);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${dt.label} ${invoice.number}</title>
        <style>
          body {
            margin: 15mm 20mm;
            font-family: Arial, sans-serif;
            font-size: 10pt;
            color: #333;
          }
          @media print {
            body { margin: 10mm 15mm; }
          }
          /* Seitenumbruch-Regeln */
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          /* Zusammengehörige Blöcke nicht trennen */
          .zahlungs-block, .qr-block, .footer-block {
            page-break-inside: avoid;
          }
          /* Summenblock immer zusammen */
          div[style*="margin-left:auto"] {
            page-break-inside: avoid;
          }
          /* Bilder nicht brechen */
          img { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        ${previewEl.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();

    // AGB automatisch zum Download anbieten
    const agbEnabled = await db.getSetting('agbEnabled', false);
    const agbPdf = await db.getSetting('agbPdf', '');
    if (agbEnabled && agbPdf) {
      setTimeout(() => {
        if (confirm('AGB-PDF als separate Datei herunterladen?\n\nDu kannst sie zusammen mit der Rechnung per E-Mail versenden.')) {
          InvoicesView.downloadAgb();
        }
      }, 500);
    }
  },

  async remove(id) {
    if (!confirm('Beleg wirklich löschen?')) return;
    await db.delete(STORES.invoices, id);
    showToast('Beleg gelöscht', 'info');
    app.navigate('invoices');
  }
};
