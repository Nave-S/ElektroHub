// ============================================
// ElektroHub – Prüfprotokolle (E-Check / DGUV V3)
// ============================================

const INSPECTION_TYPES = [
  { value: 'echeck', label: 'E-Check' },
  { value: 'dguv3_ortsfest', label: 'DGUV V3 ortsfeste Anlagen' },
  { value: 'dguv3_ortsveraenderlich', label: 'DGUV V3 ortsveränd. Geräte' },
];

const INSPECTION_RESULTS = [
  { value: 'bestanden', label: 'Bestanden', css: 'badge-green' },
  { value: 'maengel', label: 'Mängel', css: 'badge-yellow' },
  { value: 'nicht_bestanden', label: 'Nicht bestanden', css: 'badge-red' },
];

const DEFECT_SEVERITIES = [
  { value: 'leicht', label: 'Leicht', css: 'badge-yellow' },
  { value: 'schwer', label: 'Schwer', css: 'badge-red' },
  { value: 'gefahr', label: 'Gefahr', css: 'badge-red' },
];

const PREDEFINED_TESTS = {
  echeck: [
    { test: 'Sichtprüfung', limit: 'i.O.' },
    { test: 'Isolationswiderstand', limit: '≥ 1,0 MΩ' },
    { test: 'Schleifenimpedanz', limit: 'nach Berechnung' },
    { test: 'RCD-Auslösezeit', limit: '≤ 200 ms' },
    { test: 'RCD-Auslösestrom', limit: '≤ 30 mA' },
    { test: 'Schutzleiterwiderstand', limit: '≤ 1,0 Ω' },
    { test: 'Drehfeld', limit: 'rechts' },
  ],
  dguv3_ortsfest: [
    { test: 'Sichtprüfung', limit: 'i.O.' },
    { test: 'Schutzleiterwiderstand', limit: '≤ 1,0 Ω' },
    { test: 'Isolationswiderstand', limit: '≥ 1,0 MΩ' },
    { test: 'Ableitstrom', limit: '≤ 3,5 mA' },
    { test: 'Berührungsstrom', limit: '≤ 0,5 mA' },
    { test: 'Funktionsprüfung', limit: 'i.O.' },
  ],
  dguv3_ortsveraenderlich: [
    { test: 'Sichtprüfung', limit: 'i.O.' },
    { test: 'Schutzleiterwiderstand', limit: '≤ 0,3 Ω' },
    { test: 'Isolationswiderstand', limit: '≥ 1,0 MΩ' },
    { test: 'Ableitstrom', limit: '≤ 3,5 mA' },
    { test: 'Berührungsstrom', limit: '≤ 0,5 mA' },
    { test: 'Funktionsprüfung', limit: 'i.O.' },
  ],
};

// Next inspection intervals in months
const INSPECTION_INTERVALS = {
  echeck: 48,
  dguv3_ortsfest: 48,
  dguv3_ortsveraenderlich: 12, // default 12, can vary 6-24
};

const InspectionsView = {

  // ------------------------------------------------------------------
  // Router
  // ------------------------------------------------------------------
  async render(detailId) {
    if (detailId) return this.renderDetail(detailId);
    return this.renderList();
  },

  init() {
    // post-render hook (called by app after render)
  },

  // ------------------------------------------------------------------
  // List view
  // ------------------------------------------------------------------
  async renderList() {
    const inspections = await db.getAll(STORES.inspections);
    const today = todayISO();

    return `
      <div class="page-header">
        <div>
          <h2>Prüfprotokolle</h2>
          <p class="page-subtitle">${inspections.length} Protokolle</p>
        </div>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="InspectionsView.showForm()">+ Neue Prüfung</button>
        </div>
      </div>

      <div class="toolbar">
        <input type="text" class="search-input" placeholder="Prüfprotokolle suchen..." id="insp-search"
               oninput="InspectionsView.filter()">
        <select class="filter-select" id="insp-type-filter" onchange="InspectionsView.filter()">
          <option value="">Alle Typen</option>
          ${INSPECTION_TYPES.map(t => `<option value="${t.value}">${escapeHtml(t.label)}</option>`).join('')}
        </select>
        <select class="filter-select" id="insp-result-filter" onchange="InspectionsView.filter()">
          <option value="">Alle Ergebnisse</option>
          ${INSPECTION_RESULTS.map(r => `<option value="${r.value}">${escapeHtml(r.label)}</option>`).join('')}
          <option value="faellig">Fällig / Überfällig</option>
        </select>
      </div>

      <div class="card">
        ${inspections.length === 0 ?
          `<div class="empty-state">
            <div class="empty-icon">🔌</div>
            <p>Noch keine Prüfprotokolle angelegt</p>
            <button class="btn btn-primary" onclick="InspectionsView.showForm()">Erste Prüfung anlegen</button>
          </div>` :
          `<div class="table-wrapper">
            <table id="inspections-table">
              <thead>
                <tr>
                  <th>Nr.</th>
                  <th>Typ</th>
                  <th>Objekt / Kunde</th>
                  <th>Prüfdatum</th>
                  <th>Ergebnis</th>
                  <th>Nächste Prüfung</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${inspections.sort((a, b) => new Date(b.inspectionDate || b.createdAt) - new Date(a.inspectionDate || a.createdAt)).map(insp => {
                  const overdue = insp.nextInspectionDate && insp.nextInspectionDate <= today;
                  const typeLabel = (INSPECTION_TYPES.find(t => t.value === insp.type) || {}).label || insp.type;
                  const resultInfo = INSPECTION_RESULTS.find(r => r.value === insp.result) || {};
                  const objectLabel = insp.type === 'echeck'
                    ? (insp.location || insp.customerName || '–')
                    : (insp.deviceName || insp.location || insp.customerName || '–');
                  return `
                    <tr class="clickable inspection-row ${overdue ? 'inspection-overdue' : ''}"
                        data-search="${escapeHtml((insp.inspectionNumber + ' ' + (insp.customerName || '') + ' ' + (insp.deviceName || '') + ' ' + (insp.location || '')).toLowerCase())}"
                        data-type="${insp.type}"
                        data-result="${insp.result}"
                        data-overdue="${overdue ? '1' : '0'}"
                        onclick="app.navigate('inspections', '${insp.id}')">
                      <td><code>${escapeHtml(insp.inspectionNumber || '–')}</code></td>
                      <td><span class="badge badge-blue">${escapeHtml(typeLabel)}</span></td>
                      <td>
                        <strong>${escapeHtml(objectLabel)}</strong>
                        ${insp.customerName ? `<br><span class="text-small text-muted">${escapeHtml(insp.customerName)}</span>` : ''}
                      </td>
                      <td>${formatDate(insp.inspectionDate)}</td>
                      <td><span class="badge ${resultInfo.css || 'badge-gray'}">${escapeHtml(resultInfo.label || insp.result || '–')}</span></td>
                      <td>
                        ${insp.nextInspectionDate
                          ? `<span class="${overdue ? 'text-danger' : ''}">${formatDate(insp.nextInspectionDate)}</span>
                             ${overdue ? '<br><span class="badge badge-red">Überfällig</span>' : ''}`
                          : '–'}
                      </td>
                      <td>
                        <button class="btn-icon" onclick="event.stopPropagation(); InspectionsView.showForm('${insp.id}')" title="Bearbeiten">✏️</button>
                        <button class="btn-icon" onclick="event.stopPropagation(); InspectionsView.remove('${insp.id}')" title="Löschen">🗑️</button>
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

  // ------------------------------------------------------------------
  // Filter
  // ------------------------------------------------------------------
  filter() {
    const search = (document.getElementById('insp-search')?.value || '').toLowerCase();
    const typeFilter = document.getElementById('insp-type-filter')?.value || '';
    const resultFilter = document.getElementById('insp-result-filter')?.value || '';
    document.querySelectorAll('.inspection-row').forEach(row => {
      const text = row.dataset.search || '';
      const type = row.dataset.type;
      const result = row.dataset.result;
      const overdue = row.dataset.overdue === '1';
      const matchSearch = !search || text.includes(search);
      const matchType = !typeFilter || type === typeFilter;
      let matchResult = true;
      if (resultFilter === 'faellig') {
        matchResult = overdue;
      } else if (resultFilter) {
        matchResult = result === resultFilter;
      }
      row.style.display = (matchSearch && matchType && matchResult) ? '' : 'none';
    });
  },

  // ------------------------------------------------------------------
  // Detail view (printable protocol)
  // ------------------------------------------------------------------
  async renderDetail(id) {
    const insp = await db.get(STORES.inspections, id);
    if (!insp) return '<p>Prüfprotokoll nicht gefunden.</p>';

    const typeLabel = (INSPECTION_TYPES.find(t => t.value === insp.type) || {}).label || insp.type;
    const resultInfo = INSPECTION_RESULTS.find(r => r.value === insp.result) || {};
    const customer = insp.customerId ? await db.get(STORES.customers, insp.customerId) : null;
    const settings = {
      companyName: await db.getSetting('companyName', ''),
      companyAddress: await db.getSetting('companyAddress', ''),
      companyPhone: await db.getSetting('companyPhone', ''),
      companyEmail: await db.getSetting('companyEmail', ''),
      companyLogo: await db.getSetting('companyLogo', ''),
    };
    const today = todayISO();
    const overdue = insp.nextInspectionDate && insp.nextInspectionDate <= today;

    const measurements = insp.measurements || [];
    const defects = insp.defects || [];

    return `
      <style>
        /* Print-specific styles for inspection protocol */
        @media print {
          .inspection-protocol { padding: 0 !important; box-shadow: none !important; }
          .detail-header .btn, .detail-header .btn-group { display: none !important; }
          .inspection-protocol { break-inside: avoid; }
          .protocol-section { break-inside: avoid; }
          .no-print { display: none !important; }
          .inspection-protocol table { font-size: 0.85rem; }
          .protocol-header { border-bottom: 3px solid #111 !important; }
          .protocol-stamp { border: 2px solid #333; padding: 20px; text-align: center; min-height: 100px; margin-top: 20px; }
          body { background: white !important; }
          #content { padding: 10px !important; }
        }
        .inspection-protocol .protocol-section { margin-bottom: 20px; }
        .inspection-protocol .protocol-section h3 {
          font-size: 1rem; font-weight: 700; padding: 8px 0; margin-bottom: 8px;
          border-bottom: 2px solid var(--gray-200);
        }
        .protocol-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding-bottom: 16px; margin-bottom: 16px;
          border-bottom: 2px solid var(--primary);
        }
        .protocol-header-logo img { max-height: 60px; max-width: 200px; }
        .protocol-meta-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px;
        }
        .protocol-meta-grid dt { font-weight: 600; font-size: 0.85rem; color: var(--gray-500); }
        .protocol-meta-grid dd { font-size: 0.95rem; margin: 0 0 8px 0; }
        .measurement-passed { color: #065f46; font-weight: 600; }
        .measurement-failed { color: #991b1b; font-weight: 600; }
        .result-banner {
          padding: 16px 24px; border-radius: var(--radius); text-align: center;
          font-size: 1.2rem; font-weight: 700; margin: 16px 0;
        }
        .result-bestanden { background: var(--success-light); color: #065f46; border: 2px solid var(--success); }
        .result-maengel { background: var(--warning-light); color: #92400e; border: 2px solid var(--warning); }
        .result-nicht_bestanden { background: var(--danger-light); color: #991b1b; border: 2px solid var(--danger); }
        .signature-box {
          border: 1px solid var(--gray-300); border-radius: var(--radius);
          min-height: 80px; padding: 8px; margin-top: 8px; background: var(--gray-50);
          display: flex; align-items: center; justify-content: center;
        }
        .signature-box img { max-height: 80px; }
        .inspection-overdue { background: var(--danger-light) !important; }
        .text-danger { color: var(--danger) !important; font-weight: 600; }
      </style>

      <div class="detail-header no-print">
        <div>
          <button class="btn btn-secondary btn-small mb-8" onclick="app.navigate('inspections')">← Zurück</button>
          <div class="detail-title">${escapeHtml(typeLabel)} – ${escapeHtml(insp.inspectionNumber || '')}</div>
          <div class="detail-id">${escapeHtml(insp.customerName || '')} ${insp.location ? '| ' + escapeHtml(insp.location) : ''}</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-secondary" onclick="window.print()">🖨️ Drucken / PDF</button>
          <button class="btn btn-secondary" onclick="InspectionsView.showForm('${insp.id}')">✏️ Bearbeiten</button>
          <button class="btn btn-danger" onclick="InspectionsView.remove('${insp.id}')">Löschen</button>
        </div>
      </div>

      <div class="card inspection-protocol">

        <!-- Protocol Header -->
        <div class="protocol-header">
          <div>
            <h2 style="margin:0;font-size:1.4rem;">Prüfprotokoll</h2>
            <div style="font-size:1.1rem;font-weight:600;color:var(--primary);margin-top:4px;">${escapeHtml(typeLabel)}</div>
            ${settings.companyName ? `<div class="text-small text-muted mt-8">${escapeHtml(settings.companyName)}</div>` : ''}
            ${settings.companyAddress ? `<div class="text-small text-muted">${escapeHtml(settings.companyAddress)}</div>` : ''}
          </div>
          <div class="protocol-header-logo" style="text-align:right;">
            ${settings.companyLogo ? `<img src="${settings.companyLogo}" alt="Logo">` : ''}
            <div style="font-size:0.85rem;color:var(--gray-500);margin-top:8px;">
              Protokoll-Nr.: <strong>${escapeHtml(insp.inspectionNumber || '–')}</strong>
            </div>
          </div>
        </div>

        <!-- General Information -->
        <div class="protocol-section">
          <h3>Allgemeine Angaben</h3>
          <div class="protocol-meta-grid">
            <dt>Prüfart</dt>
            <dd>${escapeHtml(typeLabel)}</dd>
            <dt>Prüfdatum</dt>
            <dd>${formatDate(insp.inspectionDate)}</dd>
            <dt>Auftraggeber / Kunde</dt>
            <dd>${customer
              ? `<a href="#" onclick="app.navigate('customers','${customer.id}');return false">${escapeHtml(customer.name)}</a>`
              : escapeHtml(insp.customerName || '–')}</dd>
            <dt>Prüfer</dt>
            <dd>${escapeHtml(insp.inspector || '–')}</dd>
            <dt>Prüfort</dt>
            <dd>${escapeHtml(insp.location || '–')}</dd>
            <dt>Nächste Prüfung</dt>
            <dd>
              <span class="${overdue ? 'text-danger' : ''}">${formatDate(insp.nextInspectionDate)}</span>
              ${overdue ? ' <span class="badge badge-red">Überfällig</span>' : ''}
            </dd>
          </div>
        </div>

        <!-- Type-specific fields -->
        ${insp.type === 'echeck' ? `
        <div class="protocol-section">
          <h3>Objekt-Daten (E-Check)</h3>
          <div class="protocol-meta-grid">
            <dt>Gebäudetyp</dt>
            <dd>${escapeHtml(insp.buildingType || '–')}</dd>
            <dt>Zählernummer</dt>
            <dd>${escapeHtml(insp.meterNumber || '–')}</dd>
            <dt>Anzahl Stromkreise</dt>
            <dd>${insp.circuits || '–'}</dd>
          </div>
        </div>
        ` : ''}

        ${insp.type === 'dguv3_ortsfest' || insp.type === 'dguv3_ortsveraenderlich' ? `
        <div class="protocol-section">
          <h3>Geräte-Daten (DGUV V3)</h3>
          <div class="protocol-meta-grid">
            <dt>Gerätebezeichnung</dt>
            <dd>${escapeHtml(insp.deviceName || '–')}</dd>
            <dt>Hersteller</dt>
            <dd>${escapeHtml(insp.manufacturer || '–')}</dd>
            <dt>Seriennummer</dt>
            <dd>${escapeHtml(insp.serialNumber || '–')}</dd>
            <dt>Inventarnummer</dt>
            <dd>${escapeHtml(insp.inventoryNumber || '–')}</dd>
          </div>
        </div>
        ` : ''}

        <!-- Measurements -->
        <div class="protocol-section">
          <h3>Messergebnisse</h3>
          ${measurements.length === 0
            ? '<p class="text-muted text-small">Keine Messergebnisse erfasst</p>'
            : `
          <table>
            <thead>
              <tr>
                <th>Prüfung</th>
                <th>Messwert</th>
                <th>Grenzwert</th>
                <th>Ergebnis</th>
              </tr>
            </thead>
            <tbody>
              ${measurements.map(m => `
                <tr>
                  <td>${escapeHtml(m.test)}</td>
                  <td>${escapeHtml(m.measured || '–')}</td>
                  <td>${escapeHtml(m.limit || '–')}</td>
                  <td>${m.passed
                    ? '<span class="measurement-passed">&#10003; Bestanden</span>'
                    : '<span class="measurement-failed">&#10007; Nicht bestanden</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}
        </div>

        <!-- Defects -->
        <div class="protocol-section">
          <h3>Festgestellte Mängel</h3>
          ${defects.length === 0
            ? '<p class="text-muted text-small">Keine Mängel festgestellt</p>'
            : `
          <table>
            <thead>
              <tr>
                <th>Beschreibung</th>
                <th>Schwere</th>
                <th>Behoben</th>
              </tr>
            </thead>
            <tbody>
              ${defects.map(d => {
                const sev = DEFECT_SEVERITIES.find(s => s.value === d.severity) || {};
                return `
                <tr>
                  <td>${escapeHtml(d.description)}</td>
                  <td><span class="badge ${sev.css || 'badge-gray'}">${escapeHtml(sev.label || d.severity)}</span></td>
                  <td>${d.fixed
                    ? '<span class="measurement-passed">&#10003; Ja</span>'
                    : '<span class="measurement-failed">&#10007; Nein</span>'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>`}
        </div>

        <!-- Notes -->
        ${insp.notes ? `
        <div class="protocol-section">
          <h3>Bemerkungen</h3>
          <p>${escapeHtml(insp.notes).replace(/\n/g, '<br>')}</p>
        </div>
        ` : ''}

        <!-- Result Banner -->
        <div class="result-banner result-${insp.result || 'bestanden'}">
          Gesamtergebnis: ${escapeHtml(resultInfo.label || insp.result || '–')}
        </div>

        <!-- Signature -->
        <div class="protocol-section" style="margin-top:24px;">
          <h3>Unterschrift Prüfer</h3>
          <div class="signature-box">
            ${insp.signature
              ? `<img src="${insp.signature}" alt="Unterschrift">`
              : '<span class="text-muted text-small">Keine Unterschrift hinterlegt</span>'}
          </div>
          <div class="text-small text-muted mt-8">
            ${escapeHtml(insp.inspector || '')}${insp.inspectionDate ? ', ' + formatDate(insp.inspectionDate) : ''}
          </div>
        </div>

        <!-- Print stamp area -->
        <div class="protocol-stamp" style="display:none;">
          <p style="margin:0;font-size:0.85rem;color:#666;">Stempel / Firmenstempel</p>
        </div>

      </div>
    `;
  },

  // ------------------------------------------------------------------
  // Form (modal)
  // ------------------------------------------------------------------
  async showForm(editId) {
    let insp = editId ? await db.get(STORES.inspections, editId) : null;
    const isEdit = !!insp;
    const customers = await db.getAll(STORES.customers);
    const projects = await db.getAll(STORES.projects);

    if (!insp) {
      const allInsp = await db.getAll(STORES.inspections);
      const seq = allInsp.length + 1;
      const year = new Date().getFullYear();
      insp = {
        id: generateId(),
        type: 'echeck',
        inspectionNumber: `PRF-${year}-${String(seq).padStart(4, '0')}`,
        customerId: '',
        customerName: '',
        projectId: '',
        inspectionDate: todayISO(),
        inspector: '',
        location: '',
        result: 'bestanden',
        nextInspectionDate: '',
        buildingType: '',
        meterNumber: '',
        circuits: '',
        deviceName: '',
        manufacturer: '',
        serialNumber: '',
        inventoryNumber: '',
        measurements: [],
        defects: [],
        notes: '',
        signature: '',
        createdAt: new Date().toISOString(),
      };
    }

    // Store current state for dynamic form updates
    InspectionsView._currentInsp = insp;
    InspectionsView._customers = customers;

    const html = `
      <form id="inspection-form" style="max-height:70vh;overflow-y:auto;padding-right:8px;">

        <!-- Type & Number -->
        <div class="form-row">
          <div class="form-group">
            <label>Prüfart *</label>
            <select name="type" onchange="InspectionsView._onTypeChange(this.value)">
              ${INSPECTION_TYPES.map(t => `<option value="${t.value}" ${insp.type === t.value ? 'selected' : ''}>${escapeHtml(t.label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Protokoll-Nr.</label>
            <input type="text" name="inspectionNumber" value="${escapeHtml(insp.inspectionNumber)}" readonly
                   style="background:var(--gray-50);cursor:default;">
          </div>
        </div>

        <!-- Customer & Project -->
        <div class="form-row">
          <div class="form-group">
            <label>Kunde *</label>
            <select name="customerId" onchange="InspectionsView._onCustomerChange(this.value)">
              <option value="">– Kunde wählen –</option>
              ${customers.map(c => `<option value="${c.id}" ${insp.customerId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Projekt (optional)</label>
            <select name="projectId">
              <option value="">– Kein Projekt –</option>
              ${projects.map(p => `<option value="${p.id}" ${insp.projectId === p.id ? 'selected' : ''}>${escapeHtml(p.title)}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Date, Inspector, Location -->
        <div class="form-row-3">
          <div class="form-group">
            <label>Prüfdatum *</label>
            <input type="date" name="inspectionDate" value="${insp.inspectionDate || todayISO()}" required>
          </div>
          <div class="form-group">
            <label>Prüfer *</label>
            <input type="text" name="inspector" value="${escapeHtml(insp.inspector)}" placeholder="Name des Prüfers" required>
          </div>
          <div class="form-group">
            <label>Prüfort</label>
            <input type="text" name="location" value="${escapeHtml(insp.location)}" placeholder="Adresse / Raum">
          </div>
        </div>

        <!-- E-Check specific -->
        <div id="echeck-fields" class="${insp.type === 'echeck' ? '' : 'hidden'}">
          <div class="form-row-3">
            <div class="form-group">
              <label>Gebäudetyp</label>
              <input type="text" name="buildingType" value="${escapeHtml(insp.buildingType || '')}" placeholder="z.B. Wohnhaus, Gewerbe">
            </div>
            <div class="form-group">
              <label>Zählernummer</label>
              <input type="text" name="meterNumber" value="${escapeHtml(insp.meterNumber || '')}" placeholder="Zähler-Nr.">
            </div>
            <div class="form-group">
              <label>Anzahl Stromkreise</label>
              <input type="number" name="circuits" value="${insp.circuits || ''}" min="0" placeholder="0">
            </div>
          </div>
        </div>

        <!-- DGUV V3 specific -->
        <div id="dguv-fields" class="${insp.type !== 'echeck' ? '' : 'hidden'}">
          <div class="form-row">
            <div class="form-group">
              <label>Gerätebezeichnung</label>
              <input type="text" name="deviceName" value="${escapeHtml(insp.deviceName || '')}" placeholder="z.B. Bohrmaschine">
            </div>
            <div class="form-group">
              <label>Hersteller</label>
              <input type="text" name="manufacturer" value="${escapeHtml(insp.manufacturer || '')}" placeholder="Hersteller">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Seriennummer</label>
              <input type="text" name="serialNumber" value="${escapeHtml(insp.serialNumber || '')}" placeholder="S/N">
            </div>
            <div class="form-group">
              <label>Inventarnummer</label>
              <input type="text" name="inventoryNumber" value="${escapeHtml(insp.inventoryNumber || '')}" placeholder="Inv.-Nr.">
            </div>
          </div>
        </div>

        <!-- Measurements -->
        <div style="margin-top:16px;">
          <div class="flex-between mb-8">
            <h4>Messergebnisse</h4>
            <button type="button" class="btn btn-small btn-secondary" onclick="InspectionsView._addMeasurement()">+ Messung</button>
          </div>
          <div id="measurements-container">
            ${InspectionsView._renderMeasurementRows(insp.measurements || [], insp.type)}
          </div>
          ${(insp.measurements || []).length === 0 ? `
            <button type="button" class="btn btn-small btn-secondary mt-8" onclick="InspectionsView._loadPredefinedTests()">Standardprüfungen laden</button>
          ` : ''}
        </div>

        <!-- Defects -->
        <div style="margin-top:16px;">
          <div class="flex-between mb-8">
            <h4>Festgestellte Mängel</h4>
            <button type="button" class="btn btn-small btn-secondary" onclick="InspectionsView._addDefect()">+ Mangel</button>
          </div>
          <div id="defects-container">
            ${InspectionsView._renderDefectRows(insp.defects || [])}
          </div>
        </div>

        <!-- Result & Next date -->
        <div class="form-row" style="margin-top:16px;">
          <div class="form-group">
            <label>Gesamtergebnis *</label>
            <select name="result" required>
              ${INSPECTION_RESULTS.map(r => `<option value="${r.value}" ${insp.result === r.value ? 'selected' : ''}>${escapeHtml(r.label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Nächste Prüfung</label>
            <input type="date" name="nextInspectionDate" value="${insp.nextInspectionDate || ''}">
            <button type="button" class="btn btn-small btn-secondary mt-8" onclick="InspectionsView._calcNextDate()">Automatisch berechnen</button>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label>Bemerkungen</label>
          <textarea name="notes" rows="3" placeholder="Zusätzliche Bemerkungen...">${escapeHtml(insp.notes || '')}</textarea>
        </div>

        <!-- Signature -->
        <div class="form-group">
          <label>Unterschrift (optional)</label>
          <div id="signature-area">
            ${insp.signature
              ? `<div class="signature-box" style="min-height:60px;"><img src="${insp.signature}" alt="Unterschrift" style="max-height:60px;"></div>
                 <button type="button" class="btn btn-small btn-secondary mt-8" onclick="InspectionsView._clearSignature()">Unterschrift entfernen</button>`
              : `<canvas id="signature-canvas" width="400" height="100"
                   style="border:1px solid var(--gray-300);border-radius:6px;cursor:crosshair;display:block;max-width:100%;background:white;"></canvas>
                 <div class="btn-group mt-8">
                   <button type="button" class="btn btn-small btn-secondary" onclick="InspectionsView._clearSignatureCanvas()">Löschen</button>
                 </div>`}
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Speichern' : 'Anlegen'}</button>
        </div>
      </form>
    `;

    openModal(isEdit ? 'Prüfprotokoll bearbeiten' : 'Neue Prüfung', html);

    // Init signature canvas
    setTimeout(() => InspectionsView._initSignatureCanvas(), 100);

    // Form submit
    document.getElementById('inspection-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);

      insp.type = fd.get('type');
      insp.inspectionNumber = fd.get('inspectionNumber');
      insp.customerId = fd.get('customerId') || '';
      insp.projectId = fd.get('projectId') || '';
      insp.inspectionDate = fd.get('inspectionDate');
      insp.inspector = fd.get('inspector');
      insp.location = fd.get('location');
      insp.result = fd.get('result');
      insp.nextInspectionDate = fd.get('nextInspectionDate') || '';
      insp.notes = fd.get('notes');

      // E-Check fields
      insp.buildingType = fd.get('buildingType') || '';
      insp.meterNumber = fd.get('meterNumber') || '';
      insp.circuits = fd.get('circuits') ? parseInt(fd.get('circuits')) : '';

      // DGUV fields
      insp.deviceName = fd.get('deviceName') || '';
      insp.manufacturer = fd.get('manufacturer') || '';
      insp.serialNumber = fd.get('serialNumber') || '';
      insp.inventoryNumber = fd.get('inventoryNumber') || '';

      // Customer name for display
      const selCustomer = InspectionsView._customers.find(c => c.id === insp.customerId);
      insp.customerName = selCustomer ? selCustomer.name : '';

      // Collect measurements
      insp.measurements = InspectionsView._collectMeasurements();

      // Collect defects
      insp.defects = InspectionsView._collectDefects();

      // Signature
      const canvas = document.getElementById('signature-canvas');
      if (canvas && InspectionsView._signatureDrawn) {
        insp.signature = canvas.toDataURL('image/png');
      } else if (!insp.signature) {
        insp.signature = '';
      }

      // Index field for nextDue (used by DB index)
      insp.nextDue = insp.nextInspectionDate || '';

      insp.updatedAt = new Date().toISOString();

      await db.put(STORES.inspections, insp);
      closeModal();
      showToast(isEdit ? 'Prüfprotokoll gespeichert' : 'Prüfprotokoll angelegt');
      app.navigate('inspections', insp.id);
    };
  },

  // ------------------------------------------------------------------
  // Dynamic form helpers
  // ------------------------------------------------------------------
  _onTypeChange(type) {
    const echeckFields = document.getElementById('echeck-fields');
    const dguvFields = document.getElementById('dguv-fields');
    if (echeckFields) echeckFields.classList.toggle('hidden', type !== 'echeck');
    if (dguvFields) dguvFields.classList.toggle('hidden', type === 'echeck');
  },

  _onCustomerChange(customerId) {
    // Could auto-fill location from customer address if needed
  },

  _calcNextDate() {
    const form = document.getElementById('inspection-form');
    if (!form) return;
    const type = form.querySelector('[name="type"]').value;
    const inspDate = form.querySelector('[name="inspectionDate"]').value;
    if (!inspDate) {
      showToast('Bitte zuerst Prüfdatum eingeben', 'error');
      return;
    }
    const months = INSPECTION_INTERVALS[type] || 48;
    const d = new Date(inspDate);
    d.setMonth(d.getMonth() + months);
    form.querySelector('[name="nextInspectionDate"]').value = d.toISOString().split('T')[0];
    showToast(`Nächste Prüfung in ${months} Monaten berechnet`);
  },

  // ------------------------------------------------------------------
  // Measurements
  // ------------------------------------------------------------------
  _renderMeasurementRows(measurements, type) {
    if (!measurements || measurements.length === 0) return '';
    return measurements.map((m, i) => InspectionsView._measurementRowHtml(m, i)).join('');
  },

  _measurementRowHtml(m, index) {
    return `
      <div class="measurement-row" data-index="${index}" style="display:grid;grid-template-columns:2fr 1fr 1fr auto auto;gap:8px;align-items:center;margin-bottom:8px;">
        <input type="text" name="m-test" value="${escapeHtml(m.test || '')}" placeholder="Prüfung" style="padding:6px 10px;border:1px solid var(--gray-300);border-radius:6px;font-size:0.85rem;">
        <input type="text" name="m-measured" value="${escapeHtml(m.measured || '')}" placeholder="Messwert" style="padding:6px 10px;border:1px solid var(--gray-300);border-radius:6px;font-size:0.85rem;">
        <input type="text" name="m-limit" value="${escapeHtml(m.limit || '')}" placeholder="Grenzwert" style="padding:6px 10px;border:1px solid var(--gray-300);border-radius:6px;font-size:0.85rem;">
        <label style="display:flex;align-items:center;gap:4px;font-size:0.85rem;white-space:nowrap;cursor:pointer;">
          <input type="checkbox" name="m-passed" ${m.passed ? 'checked' : ''} style="width:16px;height:16px;"> i.O.
        </label>
        <button type="button" class="btn-icon" onclick="this.closest('.measurement-row').remove()" title="Entfernen">🗑️</button>
      </div>
    `;
  },

  _addMeasurement(prefill) {
    const container = document.getElementById('measurements-container');
    if (!container) return;
    const index = container.children.length;
    const m = prefill || { test: '', measured: '', limit: '', passed: true };
    container.insertAdjacentHTML('beforeend', InspectionsView._measurementRowHtml(m, index));
  },

  _loadPredefinedTests() {
    const form = document.getElementById('inspection-form');
    if (!form) return;
    const type = form.querySelector('[name="type"]').value;
    const tests = PREDEFINED_TESTS[type] || [];
    const container = document.getElementById('measurements-container');
    if (!container) return;
    container.innerHTML = '';
    tests.forEach((t, i) => {
      InspectionsView._addMeasurement({ test: t.test, measured: '', limit: t.limit, passed: true });
    });
    // Remove the "load" button
    const loadBtn = form.querySelector('[onclick="InspectionsView._loadPredefinedTests()"]');
    if (loadBtn) loadBtn.remove();
    showToast(`${tests.length} Standardprüfungen geladen`);
  },

  _collectMeasurements() {
    const container = document.getElementById('measurements-container');
    if (!container) return [];
    return Array.from(container.querySelectorAll('.measurement-row')).map(row => ({
      test: row.querySelector('[name="m-test"]').value.trim(),
      measured: row.querySelector('[name="m-measured"]').value.trim(),
      limit: row.querySelector('[name="m-limit"]').value.trim(),
      passed: row.querySelector('[name="m-passed"]').checked,
    })).filter(m => m.test); // skip empty rows
  },

  // ------------------------------------------------------------------
  // Defects
  // ------------------------------------------------------------------
  _renderDefectRows(defects) {
    if (!defects || defects.length === 0) return '';
    return defects.map((d, i) => InspectionsView._defectRowHtml(d, i)).join('');
  },

  _defectRowHtml(d, index) {
    return `
      <div class="defect-row" data-index="${index}" style="display:grid;grid-template-columns:3fr 1fr auto auto;gap:8px;align-items:center;margin-bottom:8px;">
        <input type="text" name="d-desc" value="${escapeHtml(d.description || '')}" placeholder="Mangelbeschreibung" style="padding:6px 10px;border:1px solid var(--gray-300);border-radius:6px;font-size:0.85rem;">
        <select name="d-severity" style="padding:6px 10px;border:1px solid var(--gray-300);border-radius:6px;font-size:0.85rem;">
          ${DEFECT_SEVERITIES.map(s => `<option value="${s.value}" ${d.severity === s.value ? 'selected' : ''}>${escapeHtml(s.label)}</option>`).join('')}
        </select>
        <label style="display:flex;align-items:center;gap:4px;font-size:0.85rem;white-space:nowrap;cursor:pointer;">
          <input type="checkbox" name="d-fixed" ${d.fixed ? 'checked' : ''} style="width:16px;height:16px;"> Behoben
        </label>
        <button type="button" class="btn-icon" onclick="this.closest('.defect-row').remove()" title="Entfernen">🗑️</button>
      </div>
    `;
  },

  _addDefect() {
    const container = document.getElementById('defects-container');
    if (!container) return;
    const index = container.children.length;
    container.insertAdjacentHTML('beforeend', InspectionsView._defectRowHtml(
      { description: '', severity: 'leicht', fixed: false }, index
    ));
  },

  _collectDefects() {
    const container = document.getElementById('defects-container');
    if (!container) return [];
    return Array.from(container.querySelectorAll('.defect-row')).map(row => ({
      description: row.querySelector('[name="d-desc"]').value.trim(),
      severity: row.querySelector('[name="d-severity"]').value,
      fixed: row.querySelector('[name="d-fixed"]').checked,
    })).filter(d => d.description); // skip empty rows
  },

  // ------------------------------------------------------------------
  // Signature canvas
  // ------------------------------------------------------------------
  _signatureDrawn: false,

  _initSignatureCanvas() {
    const canvas = document.getElementById('signature-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let drawing = false;
    InspectionsView._signatureDrawn = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const start = (e) => {
      e.preventDefault();
      drawing = true;
      InspectionsView._signatureDrawn = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const move = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#111';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const stop = () => { drawing = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('mouseleave', stop);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', stop);
  },

  _clearSignatureCanvas() {
    const canvas = document.getElementById('signature-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    InspectionsView._signatureDrawn = false;
  },

  _clearSignature() {
    if (InspectionsView._currentInsp) {
      InspectionsView._currentInsp.signature = '';
    }
    const area = document.getElementById('signature-area');
    if (!area) return;
    area.innerHTML = `
      <canvas id="signature-canvas" width="400" height="100"
        style="border:1px solid var(--gray-300);border-radius:6px;cursor:crosshair;display:block;max-width:100%;background:white;"></canvas>
      <div class="btn-group mt-8">
        <button type="button" class="btn btn-small btn-secondary" onclick="InspectionsView._clearSignatureCanvas()">Löschen</button>
      </div>
    `;
    setTimeout(() => InspectionsView._initSignatureCanvas(), 50);
  },

  // ------------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------------
  async remove(id) {
    if (!confirm('Prüfprotokoll wirklich löschen?')) return;
    await db.delete(STORES.inspections, id);
    showToast('Prüfprotokoll gelöscht', 'info');
    app.navigate('inspections');
  },
};
