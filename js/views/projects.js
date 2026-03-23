// ============================================
// ElektroHub – Projekte View
// ============================================

const ProjectsView = {
  async render(detailId) {
    if (detailId) return this.renderDetail(detailId);
    return this.renderList();
  },

  async renderList() {
    const projects = await db.getAll(STORES.projects);
    const customers = await db.getAll(STORES.customers);
    const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));

    return `
      <div class="page-header">
        <div>
          <h2>Projekte</h2>
          <p class="page-subtitle">${projects.length} Projekte</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="OCRImport.show('project')">📷 Aus Foto</button>
          <button class="btn btn-primary" onclick="ProjectsView.showForm()">+ Neues Projekt</button>
        </div>
      </div>

      <div class="toolbar">
        <input type="text" class="search-input" placeholder="Projekte suchen..." id="project-search"
               oninput="ProjectsView.filter()">
        <select class="filter-select" id="project-status-filter" onchange="ProjectsView.filter()">
          <option value="">Alle Status</option>
          ${selectOptions(PROJECT_STATUSES, '')}
        </select>
      </div>

      <div class="card">
        ${projects.length === 0 ?
          `<div class="empty-state">
            <div class="empty-icon">📋</div>
            <p>Noch keine Projekte angelegt</p>
            <button class="btn btn-primary" onclick="ProjectsView.showForm()">Erstes Projekt anlegen</button>
          </div>` :
          `<div class="table-wrapper">
            <table id="projects-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Projekt</th>
                  <th>Kunde</th>
                  <th>Status</th>
                  <th>Erstellt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${projects.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(p => {
                  const customer = customerMap[p.customerId];
                  return `
                    <tr class="clickable project-row"
                        data-title="${escapeHtml(p.title.toLowerCase())}"
                        data-status="${p.status}"
                        onclick="app.navigate('projects', '${p.id}')">
                      <td><code>${escapeHtml(p.projectId)}</code></td>
                      <td><strong>${escapeHtml(p.title)}</strong>
                        ${p.address ? `<br><span class="text-small text-muted">${escapeHtml(p.address)}</span>` : ''}
                      </td>
                      <td>${customer ? escapeHtml(customer.name) : '<span class="text-muted">–</span>'}</td>
                      <td>${statusBadgeWithTip(p.status, PROJECT_STATUSES)}</td>
                      <td>${formatDate(p.createdAt)}</td>
                      <td>
                        <button class="btn-icon" onclick="event.stopPropagation(); ProjectsView.showForm('${p.id}')" title="Bearbeiten">✏️</button>
                      </td>
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

  async renderDetail(id) {
    const project = await db.get(STORES.projects, id);
    if (!project) return '<p>Projekt nicht gefunden.</p>';
    const customer = project.customerId ? await db.get(STORES.customers, project.customerId) : null;
    const calculations = await db.getByIndex(STORES.calculations, 'projectId', id);
    const lagerEnabled = await db.getSetting('lagerEnabled', false);
    const movements = lagerEnabled ? await db.getByIndex(STORES.stockMovements, 'projectId', id) : [];
    const invoices = (await db.getAll(STORES.invoices)).filter(i => i.projectId === id);

    // Berechne Gesamtkalkulation
    let totalNet = 0;
    let totalCost = 0;
    calculations.forEach(calc => {
      totalNet += calc.totalNet || 0;
      totalCost += calc.totalCost || 0;
    });
    const marginPct = calcMarginPercent(totalNet, totalCost);

    return `
      <div class="breadcrumb">
        <a href="#" onclick="app.navigate('projects');return false;">Projekte</a>
        <span class="breadcrumb-sep">›</span>
        <strong>${escapeHtml(project.title)}</strong>
      </div>
      <div class="detail-header">
        <div>
          <div class="detail-title">${escapeHtml(project.title)}</div>
          <div class="detail-id">${escapeHtml(project.projectId)}${customer ? ` · ${escapeHtml(customer.name)}` : ''}</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="ProjectsView.showForm('${project.id}')">✏️ Bearbeiten</button>
          <button class="btn btn-danger" onclick="ProjectsView.remove('${project.id}')">Löschen</button>
        </div>
      </div>

      <div class="detail-meta">
        <div class="detail-meta-item">
          <div class="meta-label">Status</div>
          <div class="meta-value">${statusBadgeWithTip(project.status, PROJECT_STATUSES)}</div>
          ${ProjectsView._nextStepButton(project)}
        </div>
        <div class="detail-meta-item">
          <div class="meta-label">Kunde</div>
          <div class="meta-value">${customer ?
            `<a href="#" onclick="app.navigate('customers','${customer.id}');return false">${escapeHtml(customer.name)}</a>` :
            '–'}</div>
        </div>
        <div class="detail-meta-item">
          <div class="meta-label">Adresse</div>
          <div class="meta-value">${escapeHtml(project.address || '–')}</div>
        </div>
        ${project.startDate || project.endDate ? `
        <div class="detail-meta-item">
          <div class="meta-label">Zeitraum</div>
          <div class="meta-value">${project.startDate ? formatDate(project.startDate) : '?'} – ${project.endDate ? formatDate(project.endDate) : 'offen'}</div>
        </div>` : ''}
        ${project.budget ? `
        <div class="detail-meta-item">
          <div class="meta-label">Budget</div>
          <div class="meta-value">${formatCurrency(project.budget)}</div>
          ${totalNet > 0 ? `<div class="text-small ${totalNet > project.budget ? 'text-danger' : 'text-success'} mt-8">${totalNet > project.budget ? 'Budget überschritten' : 'Im Budget'} (${formatCurrency(totalNet)} kalkuliert)</div>` : ''}
        </div>` : ''}
        <div class="detail-meta-item">
          <div class="meta-label">Kalkulation netto</div>
          <div class="meta-value">${formatCurrency(totalNet)}</div>
          ${totalNet > 0 ? `
            <div class="text-small text-muted mt-8">Marge: ${marginPct.toFixed(1)}%</div>
            <div class="margin-bar"><div class="margin-bar-fill ${marginClass(marginPct)}" style="width:${Math.min(marginPct, 100)}%"></div></div>
          ` : ''}
        </div>
      </div>

      ${project.description ? `
        <div class="card">
          <h3 class="mb-8">Beschreibung</h3>
          <p>${escapeHtml(project.description).replace(/\n/g, '<br>')}</p>
        </div>
      ` : ''}

      ${project.notes ? `
        <div class="card">
          <h3 class="mb-8">Notizen</h3>
          <p>${escapeHtml(project.notes).replace(/\n/g, '<br>')}</p>
        </div>
      ` : ''}

      <!-- Kalkulationen -->
      <div class="card">
        <div class="card-header">
          <h3>Kalkulationen (${calculations.length})</h3>
          <button class="btn btn-small btn-primary" onclick="ProjectsView.showCalcForm('${project.id}')">+ Neue Kalkulation</button>
        </div>
        ${calculations.length === 0 ? '<p class="text-muted text-small">Keine Kalkulationen</p>' :
          calculations.map(calc => `
            <div class="card" style="background:var(--gray-50);margin-top:12px;">
              <div class="flex-between mb-8">
                <div>
                  <strong>${escapeHtml(calc.title || 'Kalkulation')}</strong>
                  <span class="text-small text-muted ml-8">${formatDate(calc.createdAt)}</span>
                </div>
                <div class="btn-group">
                  <button class="btn btn-small btn-secondary" onclick="ProjectsView.showCalcForm('${project.id}', '${calc.id}')">✏️</button>
                  <button class="btn btn-small btn-secondary" onclick="InvoicesView.createFromCalc('${project.id}', '${calc.id}', 'kostenvoranschlag')">Kostenvoranschlag erstellen</button>
                  <button class="btn btn-small btn-primary" onclick="InvoicesView.createFromCalc('${project.id}', '${calc.id}', 'angebot')">Angebot erstellen</button>
                  <button class="btn-icon" onclick="ProjectsView.removeCalc('${calc.id}')" title="Löschen">🗑️</button>
                </div>
              </div>
              <table>
                <thead><tr><th>Typ</th><th>Beschreibung</th><th>Menge</th><th>Einzelpreis</th><th class="text-right">Gesamt</th></tr></thead>
                <tbody>
                  ${(calc.positions || []).map(pos => `
                    <tr>
                      <td><span class="badge badge-gray">${CALC_POSITION_TYPES.find(t=>t.value===pos.type)?.label || pos.type}</span></td>
                      <td>${escapeHtml(pos.description)}</td>
                      <td>${pos.quantity} ${escapeHtml(pos.unit || 'Stück')}</td>
                      <td>${formatCurrency(pos.unitPrice)}</td>
                      <td class="text-right"><strong>${formatCurrency(pos.total)}</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="calc-summary">
                <div class="calc-summary-row"><span>Netto</span><span>${formatCurrency(calc.totalNet)}</span></div>
                <div class="calc-summary-row"><span>MwSt. 19%</span><span>${formatCurrency(calc.totalNet * MWST_RATE)}</span></div>
                <div class="calc-summary-row total"><span>Brutto</span><span>${formatCurrency(nettoToBrutto(calc.totalNet))}</span></div>
                ${calc.totalCost > 0 ? `<div class="calc-summary-row mt-8"><span>Marge</span><span>${calcMarginPercent(calc.totalNet, calc.totalCost).toFixed(1)}%</span></div>` : ''}
              </div>
            </div>
          `).join('')
        }
      </div>

      ${lagerEnabled ? `
      <!-- Material-Entnahmen -->
      <div class="card">
        <div class="card-header">
          <h3>Material-Entnahmen (${movements.length})</h3>
        </div>
        ${movements.length === 0 ? '<p class="text-muted text-small">Keine Entnahmen für dieses Projekt</p>' :
          `<table>
            <thead><tr><th>Datum</th><th>Artikel</th><th>Menge</th></tr></thead>
            <tbody>
              ${movements.map(m => `
                <tr>
                  <td>${formatDate(m.date)}</td>
                  <td>${escapeHtml(m.articleName || '–')}</td>
                  <td>${m.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        }
      </div>
      ` : ''}

      <!-- Belege -->
      <div class="card">
        <div class="card-header">
          <h3>Belege (${invoices.length})</h3>
          <div class="btn-group">
            <button class="btn btn-small btn-secondary" onclick="InvoicesView.createForProject('${project.id}', '${customer ? customer.name : ''}', '${customer ? (customer.address || '').replace(/'/g, "\\'") : ''}', 'lieferschein')">Lieferschein</button>
            <button class="btn btn-small btn-secondary" onclick="InvoicesView.createForProject('${project.id}', '${customer ? customer.name : ''}', '${customer ? (customer.address || '').replace(/'/g, "\\'") : ''}', 'abnahmeprotokoll')">Abnahmeprotokoll</button>
          </div>
        </div>
        ${invoices.length === 0 ? '<p class="text-muted text-small">Keine Belege</p>' :
          `<table>
            <thead><tr><th>Nummer</th><th>Typ</th><th>Betrag</th><th>Status</th></tr></thead>
            <tbody>
              ${invoices.map(inv => `
                <tr class="clickable" onclick="app.navigate('invoices', '${inv.id}')">
                  <td><code>${escapeHtml(inv.number)}</code></td>
                  <td>${docTypeBadge(inv.type)}</td>
                  <td>${formatCurrency(inv.totalGross)}</td>
                  <td>${statusBadgeWithTip(inv.status, INVOICE_STATUSES)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        }
      </div>

      <!-- Fotos -->
      ${await PhotoGallery.renderGallery('project', id)}
    `;
  },

  _nextStepButton(project) {
    // Definiere den logischen nächsten Schritt
    const steps = {
      'anfrage': { next: 'kalkulation', label: '→ Kalkulation starten', hint: 'Erstelle eine Kalkulation für dieses Projekt' },
      'kalkulation': { next: 'beauftragt', label: '→ Beauftragt', hint: 'Kunde hat den Auftrag erteilt' },
      'beauftragt': { next: 'in-arbeit', label: '→ In Arbeit', hint: 'Arbeiten haben begonnen' },
      'in-arbeit': { next: 'abnahme', label: '→ Abnahme', hint: 'Arbeiten sind fertig, Abnahme steht an' },
      'abnahme': { next: 'abgerechnet', label: '→ Abgerechnet', hint: 'Rechnung wurde erstellt' },
      'abgerechnet': { next: 'abgeschlossen', label: '→ Abgeschlossen', hint: 'Zahlung eingegangen, Projekt fertig' },
    };

    const current = steps[project.status];
    if (!current) {
      // Abgeschlossen oder unbekannter Status
      if (project.status === 'abgeschlossen') return '<div class="mt-8 text-small text-muted">Projekt abgeschlossen</div>';
      // Fallback: Status reparieren
      return `<div class="mt-8"><button class="btn btn-small btn-secondary" onclick="ProjectsView.updateStatus('${project.id}', 'anfrage')">Status zurücksetzen</button></div>`;
    }

    return `
      <div class="mt-8">
        <button class="btn btn-small btn-primary" onclick="ProjectsView.updateStatus('${project.id}', '${current.next}')" title="${current.hint}">${current.label}</button>
        <div class="text-small text-muted" style="margin-top:4px;">${current.hint}</div>
      </div>
    `;
  },

  filter() {
    const search = document.getElementById('project-search').value.toLowerCase();
    const statusFilter = document.getElementById('project-status-filter').value;
    document.querySelectorAll('.project-row').forEach(row => {
      const title = row.dataset.title;
      const status = row.dataset.status;
      const matchSearch = !search || title.includes(search);
      const matchStatus = !statusFilter || status === statusFilter;
      row.style.display = (matchSearch && matchStatus) ? '' : 'none';
    });
  },

  async showForm(editId, prefillCustomerId) {
    let project = editId ? await db.get(STORES.projects, editId) : null;
    const isEdit = !!project;
    const customers = await db.getAll(STORES.customers);

    const html = `
      <form id="project-form">
        <div class="form-group">
          <label>Titel *</label>
          <input type="text" name="title" required value="${escapeHtml(project?.title || '')}" placeholder="z.B. Elektroinstallation Neubau Müller">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Kunde</label>
            <select name="customerId">
              <option value="">– Kein Kunde –</option>
              ${customers.map(c => `<option value="${c.id}" ${(project?.customerId || prefillCustomerId) === c.id ? 'selected' : ''}>${escapeHtml(c.name)} (${c.customerId})</option>`).join('')}
            </select>
          </div>
          ${isEdit ? `
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              ${selectOptions(PROJECT_STATUSES, project?.status || 'anfrage')}
            </select>
          </div>
          ` : ''}
        </div>
        <div class="form-group">
          <label>Adresse / Baustelle</label>
          <input type="text" name="address" value="${escapeHtml(project?.address || '')}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Startdatum</label>
            <input type="date" name="startDate" value="${project?.startDate || ''}">
          </div>
          <div class="form-group">
            <label>Enddatum (geplant)</label>
            <input type="date" name="endDate" value="${project?.endDate || ''}">
          </div>
          <div class="form-group">
            <label>Budget (€)</label>
            <input type="number" name="budget" step="0.01" min="0" value="${project?.budget || ''}" placeholder="Optional">
          </div>
        </div>
        <div class="form-group">
          <label>Beschreibung</label>
          <textarea name="description" rows="2" placeholder="Kurze Projektbeschreibung">${escapeHtml(project?.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Notizen</label>
          <textarea name="notes" rows="3">${escapeHtml(project?.notes || '')}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Speichern' : 'Anlegen'}</button>
        </div>
      </form>
    `;

    openModal(isEdit ? 'Projekt bearbeiten' : 'Neues Projekt', html);

    document.getElementById('project-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);

      if (!isEdit) {
        const allProjects = await db.getAll(STORES.projects);
        const seq = allProjects.length + 1;
        project = {
          id: generateId(),
          projectId: generateProjectId(seq),
          createdAt: new Date().toISOString(),
        };
      }

      project.title = fd.get('title');
      project.customerId = fd.get('customerId') || null;
      project.status = fd.get('status') || project.status || 'anfrage';
      project.address = fd.get('address');
      project.startDate = fd.get('startDate') || null;
      project.endDate = fd.get('endDate') || null;
      project.budget = parseFloat(fd.get('budget')) || null;
      project.description = fd.get('description');
      project.notes = fd.get('notes');
      project.updatedAt = new Date().toISOString();

      await db.put(STORES.projects, project);
      closeModal();
      showToast(isEdit ? 'Projekt gespeichert' : 'Projekt angelegt');
      app.navigate('projects', project.id);
    };
  },

  async updateStatus(projectId, newStatus) {
    const project = await db.get(STORES.projects, projectId);
    if (!project) return;
    project.status = newStatus;
    project.updatedAt = new Date().toISOString();
    await db.put(STORES.projects, project);
    showToast('Status aktualisiert');
    app.refresh();
  },

  async showCalcForm(projectId, editCalcId) {
    let calc = editCalcId ? await db.get(STORES.calculations, editCalcId) : null;
    const isEdit = !!calc;
    const articles = await db.getAll(STORES.articles);

    if (!calc) {
      calc = {
        id: generateId(),
        projectId,
        title: '',
        positions: [{ type: 'material', description: '', unit: 'Stück', quantity: 1, unitPrice: 0, markup: 0, total: 0 }],
        totalNet: 0,
        totalCost: 0,
        createdAt: new Date().toISOString(),
      };
    }

    const articleOptions = articles.map(a => `<option value="${a.id}" data-ek="${a.purchasePrice}" data-vk="${a.salePrice}">${escapeHtml(a.name)} (${formatCurrency(a.purchasePrice)} EK)</option>`).join('');

    const positionsHtml = (calc.positions || []).map((pos, i) => ProjectsView._positionRowHtml(pos, i, articleOptions)).join('');

    const html = `
      <form id="calc-form">
        <div class="form-group">
          <label>Bezeichnung</label>
          <input type="text" name="title" value="${escapeHtml(calc.title || '')}" placeholder="z.B. Hauptkalkulation">
        </div>

        <h4 class="mb-8">Positionen</h4>
        <div class="calc-position-project" style="font-weight:600;font-size:0.75rem;color:var(--gray-500);border-bottom:2px solid var(--gray-200);padding-bottom:4px;">
          <span>Typ</span><span>Beschreibung</span><span>Einheit</span><span>Menge</span><span>EP (€)</span><span style="text-align:right;">Gesamt</span><span></span>
        </div>
        <div id="calc-positions">
          ${positionsHtml}
        </div>
        <div class="btn-group mt-8">
          <button type="button" class="btn btn-small btn-secondary" onclick="ProjectsView._addPosition()">+ Position</button>
          <button type="button" class="btn btn-small btn-secondary" onclick="ProjectsView._showTextBlockPicker()">📋 Textbaustein</button>
        </div>

        <div class="calc-summary mt-16" id="calc-live-summary">
          <div class="calc-summary-row"><span>Netto</span><span id="calc-sum-net">0,00 €</span></div>
          <div id="calc-sum-tax-row" class="calc-summary-row" ${await isKleinunternehmer() ? 'style="display:none;"' : ''}><span>MwSt. ${(MWST_RATE * 100).toFixed(0)}%</span><span id="calc-sum-tax">0,00 €</span></div>
          <div class="calc-summary-row total"><span>${await isKleinunternehmer() ? 'Gesamt' : 'Brutto'}</span><span id="calc-sum-gross">0,00 €</span></div>
          ${await isKleinunternehmer() ? '<div class="text-small text-muted" style="margin-top:4px;">Kleinunternehmer – keine MwSt.</div>' : ''}
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Speichern' : 'Anlegen'}</button>
        </div>
      </form>
    `;

    openModal(isEdit ? 'Kalkulation bearbeiten' : 'Neue Kalkulation', html);

    // Store articles for lookup
    ProjectsView._articles = articles;
    ProjectsView._articleOptions = articleOptions;
    ProjectsView._recalculate();

    document.getElementById('calc-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      calc.title = fd.get('title') || 'Kalkulation';
      calc.positions = ProjectsView._collectPositions()
        .filter(p => p.description.trim() || p.total > 0); // Leere Zeilen entfernen
      calc.totalNet = Math.round(calc.positions.reduce((s, p) => s + p.total, 0) * 100) / 100;
      calc.totalCost = Math.round(calc.positions.reduce((s, p) => s + (p.cost || 0), 0) * 100) / 100;
      calc.updatedAt = new Date().toISOString();

      await db.put(STORES.calculations, calc);
      closeModal();
      showToast(isEdit ? 'Kalkulation gespeichert' : 'Kalkulation angelegt');
      app.refresh();
    };
  },

  _positionRowHtml(pos, index, articleOptions) {
    const unitOpts = UNITS.map(u =>
      `<option value="${u}" ${u === (pos.unit || 'Stück') ? 'selected' : ''}>${escapeHtml(u)}</option>`
    ).join('');
    return `
      <div class="calc-position-project" data-index="${index}">
        <select name="pos-type" onchange="ProjectsView._recalculate()">
          ${selectOptions(CALC_POSITION_TYPES, pos.type)}
        </select>
        <input type="text" name="pos-desc" placeholder="Beschreibung" value="${escapeHtml(pos.description || '')}">
        <select name="pos-unit">${unitOpts}</select>
        <input type="number" name="pos-qty" placeholder="Menge" value="${pos.quantity || 1}" min="0" step="any" onchange="ProjectsView._recalculate()">
        <input type="number" name="pos-price" placeholder="EP" value="${pos.unitPrice || 0}" min="0" step="0.01" onchange="ProjectsView._recalculate()">
        <span class="pos-total text-right">${formatCurrency(pos.total || 0)}</span>
        <button type="button" class="btn-icon" onclick="this.closest('.calc-position-project').remove(); ProjectsView._recalculate()">🗑️</button>
      </div>
    `;
  },

  _addPosition(prefill) {
    const container = document.getElementById('calc-positions');
    const index = container.children.length;
    const pos = {
      type: prefill?.type || 'material',
      description: prefill?.description || '',
      unit: prefill?.unit || 'Stück',
      quantity: prefill?.quantity || 1,
      unitPrice: prefill?.unitPrice || 0,
      total: (prefill?.quantity || 1) * (prefill?.unitPrice || 0),
    };
    container.insertAdjacentHTML('beforeend', ProjectsView._positionRowHtml(pos, index, ProjectsView._articleOptions));
    ProjectsView._recalculate();
  },

  async _showTextBlockPicker() {
    const blocks = await getAllTextBlocks();
    const html = `
      <div class="toolbar mb-16">
        <input type="text" class="search-input" placeholder="Textbaustein suchen..." id="tb-calc-search" oninput="ProjectsView._filterCalcTextBlocks()">
        <select class="filter-select" id="tb-calc-cat" onchange="ProjectsView._filterCalcTextBlocks()">
          <option value="">Alle Kategorien</option>
          ${TEXT_BLOCK_CATEGORIES.map(c => `<option value="${c.value}">${escapeHtml(c.label)}</option>`).join('')}
        </select>
      </div>
      <div id="tb-calc-list">
        ${blocks.map(b => {
          const desc = b.description.replace(/'/g, "\\'").replace(/"/g, '&quot;');
          return `
          <div class="tb-picker-item" data-code="${escapeHtml(b.code.toLowerCase())}" data-desc="${escapeHtml(b.description.toLowerCase())}" data-cat="${b.category}">
            <div class="flex-between">
              <div>
                <code class="text-small">${escapeHtml(b.code)}</code>
                <span class="badge badge-gray ml-8">${escapeHtml(b.unit || '')}</span>
                <span class="badge badge-blue ml-8">${escapeHtml((CALC_POSITION_TYPES.find(t=>t.value===b.type)||{}).label || b.type)}</span>
              </div>
              <button class="btn btn-small btn-primary" onclick="ProjectsView._insertFromTextBlock('${desc}', '${b.type || 'material'}')">Einfügen</button>
            </div>
            <div class="text-small mt-8">${escapeHtml(b.description)}</div>
          </div>`;
        }).join('')}
      </div>
    `;
    openPicker('Textbaustein einfügen', html);
  },

  _filterCalcTextBlocks() {
    const search = (document.getElementById('tb-calc-search')?.value || '').toLowerCase();
    const cat = document.getElementById('tb-calc-cat')?.value || '';
    document.querySelectorAll('#tb-calc-list .tb-picker-item').forEach(item => {
      const code = item.dataset.code;
      const desc = item.dataset.desc;
      const itemCat = item.dataset.cat;
      const matchSearch = !search || code.includes(search) || desc.includes(search);
      const matchCat = !cat || itemCat === cat;
      item.style.display = (matchSearch && matchCat) ? '' : 'none';
    });
  },

  _insertFromTextBlock(description, type) {
    closePicker();
    ProjectsView._addPosition({ type, description, quantity: 1, unitPrice: 0 });
  },

  _collectPositions() {
    const container = document.getElementById('calc-positions');
    if (!container) return [];
    const rows = container.querySelectorAll('.calc-position-project');
    return Array.from(rows).map(row => {
      const type = row.querySelector('[name="pos-type"]').value;
      const description = row.querySelector('[name="pos-desc"]').value;
      const unitEl = row.querySelector('[name="pos-unit"]');
      const unit = unitEl ? unitEl.value : 'Stück';
      const quantity = parseFloat(row.querySelector('[name="pos-qty"]').value) || 0;
      const unitPrice = parseFloat(row.querySelector('[name="pos-price"]').value) || 0;
      const total = Math.round(quantity * unitPrice * 100) / 100;
      // Materialkosten schaetzen: VK-Preis abzgl. Standard-Aufschlag
      // Eigenleistung hat keine Materialkosten
      const isMaterial = type === 'material';
      const cost = isMaterial ? Math.round(total * 0.7 * 100) / 100 : 0;
      return { type, description, unit, quantity, unitPrice, total, cost };
    });
  },

  _recalculate() {
    const positions = ProjectsView._collectPositions();
    const container = document.getElementById('calc-positions');
    if (!container) return;
    // Update individual totals
    container.querySelectorAll('.calc-position-project').forEach((row, i) => {
      if (positions[i]) {
        row.querySelector('.pos-total').textContent = formatCurrency(positions[i].total);
      }
    });
    const net = positions.reduce((s, p) => s + p.total, 0);
    // KU-Check: Wenn taxRow versteckt, keine MwSt berechnen
    const taxRow = document.getElementById('calc-sum-tax-row');
    const isHidden = taxRow && taxRow.style.display === 'none';
    const tax = isHidden ? 0 : net * MWST_RATE;
    const gross = net + tax;
    const netEl = document.getElementById('calc-sum-net');
    const taxEl = document.getElementById('calc-sum-tax');
    const grossEl = document.getElementById('calc-sum-gross');
    if (netEl) netEl.textContent = formatCurrency(net);
    if (taxEl) taxEl.textContent = formatCurrency(tax);
    if (grossEl) grossEl.textContent = formatCurrency(gross);
  },

  async removeCalc(calcId) {
    if (!confirm('Kalkulation wirklich löschen?')) return;
    await db.delete(STORES.calculations, calcId);
    showToast('Kalkulation gelöscht', 'info');
    app.refresh();
  },

  async remove(id) {
    if (!confirm('Projekt wirklich löschen? Alle zugehörigen Kalkulationen werden ebenfalls gelöscht.')) return;
    // Lösche zugehörige Kalkulationen
    const calcs = await db.getByIndex(STORES.calculations, 'projectId', id);
    for (const c of calcs) await db.delete(STORES.calculations, c.id);
    await db.delete(STORES.projects, id);
    showToast('Projekt gelöscht', 'info');
    app.navigate('projects');
  }
};
