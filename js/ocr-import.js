// ============================================
// ElektroHub – Universaler Foto-Import (OCR)
// Erkennt Kunden, Projekte und Belege aus Fotos
// ============================================

const OCRImport = {

  // ===== Zentraler Import-Dialog =====
  async show(prefillMode) {
    const html = `
      <div id="ocr-import">
        <!-- Schritt 1: Was importieren + Bild hochladen -->
        <div id="ocr-step1">
          <p class="mb-16" style="color:var(--gray-600);line-height:1.6;">
            Lade ein Foto oder Screenshot hoch. Die App erkennt den Text und füllt die Felder automatisch vor.
          </p>

          <div class="form-group mb-16">
            <label>Was möchtest du importieren?</label>
            <div class="qrf-ec-row" id="ocr-mode-btns">
              <button class="qrf-ec-btn ${prefillMode === 'customer' ? 'active' : ''}" onclick="OCRImport._setMode('customer')">👤 Kunde</button>
              <button class="qrf-ec-btn ${prefillMode === 'project' ? 'active' : ''}" onclick="OCRImport._setMode('project')">📋 Projekt</button>
              <button class="qrf-ec-btn ${!prefillMode || prefillMode === 'invoice' ? 'active' : ''}" onclick="OCRImport._setMode('invoice')">📄 Beleg</button>
              <button class="qrf-ec-btn ${prefillMode === 'auto' ? 'active' : ''}" onclick="OCRImport._setMode('auto')">🔮 Automatisch</button>
            </div>
          </div>

          <div class="upload-dropzone" onclick="document.getElementById('ocr-file-input').click()" id="ocr-dropzone" style="min-height:140px;">
            <div class="upload-icon">📷</div>
            <div class="upload-text"><strong>Foto oder Screenshot auswählen</strong></div>
            <div class="upload-hint">JPG, PNG · Datei hierher ziehen oder klicken</div>
          </div>
          <input type="file" id="ocr-file-input" accept="image/*" style="display:none" onchange="OCRImport._onFile(this)">
        </div>

        <!-- Schritt 2: OCR läuft -->
        <div id="ocr-step2" class="hidden" style="text-align:center;padding:40px;">
          <div style="font-size:2rem;margin-bottom:12px;">🔍</div>
          <strong>Text wird erkannt...</strong>
          <div class="mt-8" style="max-width:300px;margin:0 auto;">
            <div style="width:100%;height:6px;background:var(--gray-200);border-radius:3px;overflow:hidden;">
              <div id="ocr-progress" style="width:0%;height:100%;background:var(--primary);border-radius:3px;transition:width 0.3s;"></div>
            </div>
            <span class="text-small text-muted mt-8" id="ocr-status">Wird vorbereitet...</span>
          </div>
        </div>

        <!-- Schritt 3: Ergebnis (wird dynamisch befüllt) -->
        <div id="ocr-step3" class="hidden"></div>
      </div>
    `;

    this._mode = prefillMode || 'invoice';
    openModal('📷 Aus Foto importieren', html);

    setTimeout(() => {
      const dz = document.getElementById('ocr-dropzone');
      if (dz) {
        dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.style.borderColor = 'var(--primary)'; });
        dz.addEventListener('dragleave', () => { dz.style.borderColor = ''; });
        dz.addEventListener('drop', (e) => { e.preventDefault(); dz.style.borderColor = ''; if (e.dataTransfer.files.length) OCRImport._processFile(e.dataTransfer.files[0]); });
      }
    }, 50);
  },

  _mode: 'invoice',

  _setMode(mode) {
    this._mode = mode;
    document.querySelectorAll('#ocr-mode-btns .qrf-ec-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
  },

  _onFile(input) {
    if (input.files.length) this._processFile(input.files[0]);
  },

  async _processFile(file) {
    if (!file) return;
    this._imgUrl = URL.createObjectURL(file);

    document.getElementById('ocr-step1').classList.add('hidden');
    document.getElementById('ocr-step2').classList.remove('hidden');

    try {
      if (typeof Tesseract === 'undefined') throw new Error('OCR-Bibliothek wird noch geladen. Bitte kurz warten.');

      const result = await Tesseract.recognize(file, 'deu', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100);
            const bar = document.getElementById('ocr-progress');
            const status = document.getElementById('ocr-status');
            if (bar) bar.style.width = pct + '%';
            if (status) status.textContent = `Texterkennung: ${pct}%`;
          }
        }
      });

      const text = (result.data.text || '').trim();
      if (!text) throw new Error('Kein Text erkannt. Versuche ein besseres Foto.');

      // Auto-Modus: Erkennen was es ist
      if (this._mode === 'auto') {
        this._mode = this._detectMode(text);
      }

      document.getElementById('ocr-step2').classList.add('hidden');
      document.getElementById('ocr-step3').classList.remove('hidden');

      // Je nach Modus das richtige Formular anzeigen
      switch (this._mode) {
        case 'customer': this._showCustomerForm(text); break;
        case 'project': this._showProjectForm(text); break;
        default: this._showInvoiceForm(text); break;
      }
    } catch (err) {
      document.getElementById('ocr-step2').classList.add('hidden');
      document.getElementById('ocr-step1').classList.remove('hidden');
      showToast(err.message, 'error');
    }
  },

  // Automatisch erkennen was auf dem Foto ist
  _detectMode(text) {
    const t = text.toLowerCase();
    if (t.includes('rechnung') || t.includes('angebot') || t.includes('invoice') || t.includes('netto') || t.includes('brutto') || t.includes('mwst')) return 'invoice';
    if (t.includes('projekt') || t.includes('baustelle') || t.includes('auftrag') || t.includes('objekt')) return 'project';
    // Default: Wenn Telefon/E-Mail/Adresse gefunden, ist es wahrscheinlich ein Kunde
    if (t.match(/@|telefon|tel:|mobil|e-mail|fax/)) return 'customer';
    return 'invoice';
  },

  // ===== KUNDEN-IMPORT =====
  _showCustomerForm(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const parsed = this._parseContactInfo(text, lines);

    document.getElementById('ocr-step3').innerHTML = `
      <div class="form-row mb-16">
        <div style="flex:1;"><img src="${this._imgUrl}" style="max-width:100%;max-height:180px;border-radius:8px;border:1px solid var(--gray-200);"></div>
        <div style="flex:2;"><textarea readonly rows="6" style="width:100%;font-size:0.75rem;font-family:monospace;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:6px;padding:8px;">${escapeHtml(text)}</textarea></div>
      </div>
      <div class="alert-banner alert-info mb-16">Erkannte Kundendaten – bitte prüfen und anpassen.</div>
      <div class="form-row">
        <div class="form-group"><label>Name / Firma *</label><input type="text" id="ocr-c-name" value="${escapeHtml(parsed.name)}"></div>
        <div class="form-group"><label>Typ</label>
          <select id="ocr-c-type">${CUSTOMER_TYPES.map(t => `<option value="${t.value}" ${parsed.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-group"><label>Adresse</label><textarea id="ocr-c-address" rows="2">${escapeHtml(parsed.address)}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Telefon</label><input type="tel" id="ocr-c-phone" value="${escapeHtml(parsed.phone)}"></div>
        <div class="form-group"><label>E-Mail</label><input type="email" id="ocr-c-email" value="${escapeHtml(parsed.email)}"></div>
      </div>
      <div class="form-group"><label>Ansprechpartner</label><input type="text" id="ocr-c-contact" value="${escapeHtml(parsed.contact)}"></div>
      <div class="form-group"><label>Notizen</label><textarea id="ocr-c-notes" rows="2" placeholder="z.B. Importiert aus Screenshot"></textarea></div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button class="btn btn-primary" onclick="OCRImport._saveCustomer()">Kunde anlegen</button>
      </div>
    `;
  },

  _parseContactInfo(text, lines) {
    const result = { name: '', address: '', phone: '', email: '', contact: '', type: 'privat' };

    // E-Mail
    const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
    if (emailMatch) result.email = emailMatch[0];

    // Telefon
    const phoneMatch = text.match(/(?:tel|telefon|mobil|fon|phone)[.:)]*\s*([\d\s/+\-()]{6,})/i) || text.match(/(\+?\d[\d\s/\-()]{7,})/);
    if (phoneMatch) result.phone = phoneMatch[1].trim();

    // Adresse: Zeilen mit PLZ
    const addrLines = lines.filter(l => l.match(/\d{5}\s+\w/) || l.match(/str\.|straße|weg\s|platz\s|gasse/i));
    if (addrLines.length) result.address = addrLines.join('\n');

    // Name: Erste Zeile die kein Keyword ist
    const skip = ['tel', 'fax', 'email', 'e-mail', 'mobil', 'iban', 'bic', 'steuer', 'ust', 'www', 'http', 'datum'];
    const nameCandidate = lines.find(l => l.length > 2 && l.length < 80 && !skip.some(w => l.toLowerCase().startsWith(w)) && !l.match(/^\d{5}/) && !l.match(/@/) && !l.match(/^\+?\d[\d\s/-]{5,}$/));
    if (nameCandidate) result.name = nameCandidate;

    // Typ erraten
    const t = text.toLowerCase();
    if (t.includes('gmbh') || t.includes('ag') || t.includes('ohg') || t.includes('gewerbe') || t.includes('firma')) result.type = 'gewerbe';
    else if (t.includes('hausverwaltung') || t.includes('hv ')) result.type = 'hausverwaltung';
    else if (t.includes('bauträger') || t.includes('bau ')) result.type = 'bautraeger';

    return result;
  },

  async _saveCustomer() {
    const name = document.getElementById('ocr-c-name')?.value?.trim();
    if (!name) { showToast('Name ist Pflichtfeld', 'error'); return; }

    const allCustomers = await db.getAll(STORES.customers);
    const customer = {
      id: generateId(),
      customerId: generateCustomerId(allCustomers.length + 1),
      name,
      type: document.getElementById('ocr-c-type')?.value || 'privat',
      address: document.getElementById('ocr-c-address')?.value || '',
      phone: document.getElementById('ocr-c-phone')?.value || '',
      email: document.getElementById('ocr-c-email')?.value || '',
      contact: document.getElementById('ocr-c-contact')?.value || '',
      notes: document.getElementById('ocr-c-notes')?.value || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.put(STORES.customers, customer);
    closeModal();
    showToast(`Kunde "${name}" aus Foto angelegt`);
    app.navigate('customers', customer.id);
  },

  // ===== PROJEKT-IMPORT =====
  _showProjectForm(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const parsed = this._parseProjectInfo(text, lines);

    // Kunden-Liste für Dropdown laden
    db.getAll(STORES.customers).then(customers => {
      const step3 = document.getElementById('ocr-step3');
      step3.innerHTML = `
        <div class="form-row mb-16">
          <div style="flex:1;"><img src="${this._imgUrl}" style="max-width:100%;max-height:180px;border-radius:8px;border:1px solid var(--gray-200);"></div>
          <div style="flex:2;"><textarea readonly rows="6" style="width:100%;font-size:0.75rem;font-family:monospace;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:6px;padding:8px;">${escapeHtml(text)}</textarea></div>
        </div>
        <div class="alert-banner alert-info mb-16">Erkannte Projektdaten – bitte prüfen und anpassen.</div>
        <div class="form-group"><label>Projekttitel *</label><input type="text" id="ocr-p-title" value="${escapeHtml(parsed.title)}"></div>
        <div class="form-row">
          <div class="form-group"><label>Kunde</label>
            <select id="ocr-p-customer">
              <option value="">– Kein Kunde –</option>
              ${customers.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${c.customerId})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group"><label>Adresse / Baustelle</label><input type="text" id="ocr-p-address" value="${escapeHtml(parsed.address)}"></div>
        <div class="form-group"><label>Notizen</label><textarea id="ocr-p-notes" rows="3">${escapeHtml(parsed.notes)}</textarea></div>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
          <button class="btn btn-primary" onclick="OCRImport._saveProject()">Projekt anlegen</button>
        </div>
      `;
    });
  },

  _parseProjectInfo(text, lines) {
    const result = { title: '', address: '', notes: '' };

    // Titel: Suche nach "Projekt:", "Objekt:", "Baustelle:" oder erste relevante Zeile
    const titleMatch = text.match(/(?:projekt|objekt|auftrag|baustelle)[:\s]+(.+)/i);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
    } else {
      const candidate = lines.find(l => l.length > 5 && l.length < 100 && !l.match(/^\d{5}/) && !l.match(/@/) && !l.match(/^tel/i));
      if (candidate) result.title = candidate;
    }

    // Adresse
    const addrLines = lines.filter(l => l.match(/\d{5}\s+\w/) || l.match(/str\.|straße|weg\s|platz\s/i));
    if (addrLines.length) result.address = addrLines[0];

    // Rest als Notizen
    result.notes = 'Importiert aus Foto';

    return result;
  },

  async _saveProject() {
    const title = document.getElementById('ocr-p-title')?.value?.trim();
    if (!title) { showToast('Titel ist Pflichtfeld', 'error'); return; }

    const allProjects = await db.getAll(STORES.projects);
    const project = {
      id: generateId(),
      projectId: generateProjectId(allProjects.length + 1),
      title,
      customerId: document.getElementById('ocr-p-customer')?.value || null,
      status: 'anfrage',
      address: document.getElementById('ocr-p-address')?.value || '',
      notes: document.getElementById('ocr-p-notes')?.value || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.put(STORES.projects, project);
    closeModal();
    showToast(`Projekt "${title}" aus Foto angelegt`);
    app.navigate('projects', project.id);
  },

  // ===== BELEG-IMPORT =====
  _showInvoiceForm(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const parsed = this._parseInvoiceInfo(text, lines);

    document.getElementById('ocr-step3').innerHTML = `
      <div class="form-row mb-16">
        <div style="flex:1;"><img src="${this._imgUrl}" style="max-width:100%;max-height:180px;border-radius:8px;border:1px solid var(--gray-200);"></div>
        <div style="flex:2;"><textarea readonly rows="6" style="width:100%;font-size:0.75rem;font-family:monospace;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:6px;padding:8px;">${escapeHtml(text)}</textarea></div>
      </div>
      <div class="alert-banner alert-info mb-16">Erkannte Belegdaten – bitte prüfen und anpassen.</div>
      <div class="form-row">
        <div class="form-group"><label>Dokumenttyp</label>
          <select id="ocr-doctype">${DOC_TYPES.filter(dt => dt.hasPositions).map(dt => `<option value="${dt.value}" ${dt.value === parsed.type ? 'selected' : ''}>${dt.label}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Datum</label><input type="date" id="ocr-date" value="${parsed.date}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Kunde / Firma</label><input type="text" id="ocr-customer" value="${escapeHtml(parsed.customer)}"></div>
        <div class="form-group"><label>Originalnummer</label><input type="text" id="ocr-ref" value="${escapeHtml(parsed.refNumber)}"></div>
      </div>
      <div class="form-group"><label>Adresse</label><textarea id="ocr-address" rows="2">${escapeHtml(parsed.address)}</textarea></div>

      <h4 class="mb-8 mt-16">Erkannte Positionen</h4>
      <div id="ocr-positions"></div>
      <button type="button" class="btn btn-small btn-secondary mt-8" onclick="OCRImport._addInvPos()">+ Position</button>

      <div class="calc-summary mt-16">
        <div class="calc-summary-row"><span>Netto (erkannt)</span><span id="ocr-total">0,00 €</span></div>
      </div>

      <div class="form-group mt-16"><label>Notizen</label><textarea id="ocr-notes" rows="2" placeholder="z.B. Originaldokument eingescannt"></textarea></div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button class="btn btn-primary" onclick="OCRImport._saveInvoice()">Beleg erstellen</button>
      </div>
    `;

    // Positionen einfügen
    for (const pos of parsed.positions) {
      this._addInvPos(pos.desc, pos.qty, pos.price);
    }
    if (parsed.positions.length === 0) this._addInvPos();
    this._recalcInvTotal();
  },

  _parseInvoiceInfo(text, lines) {
    const result = { type: 'rechnung', date: todayISO(), customer: '', address: '', refNumber: '', positions: [] };

    // Typ
    const t = text.toLowerCase();
    if (t.includes('angebot')) result.type = 'angebot';
    else if (t.includes('auftragsbestätigung')) result.type = 'auftragsbestaetigung';
    else if (t.includes('lieferschein')) result.type = 'lieferschein';
    else if (t.includes('kostenvoranschlag')) result.type = 'kostenvoranschlag';
    else if (t.includes('gutschrift')) result.type = 'gutschrift';

    // Datum
    const dateMatch = text.match(/(\d{2})[./](\d{2})[./](\d{4})/);
    if (dateMatch) {
      const ds = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      if (ds.match(/^\d{4}-\d{2}-\d{2}$/)) result.date = ds;
    }

    // Referenznummer
    const refMatch = text.match(/(RE|RG|AG|AB|KV|LS|INV|Nr\.?|Nummer)[- .:]*(\d[\d\-/]{3,})/i);
    if (refMatch) result.refNumber = refMatch[0].trim();

    // Kunde
    const contact = this._parseContactInfo(text, lines);
    result.customer = contact.name;
    result.address = contact.address;

    // Positionen
    const amountRegex = /(\d{1,3}(?:\.\d{3})*(?:,\d{2}))\s*€?/g;
    const posLines = lines.filter(l => l.match(/\d+[,.]?\d*\s*€/) || l.match(/^\d+[\s.)\-]+\w/));

    for (const line of posLines.slice(0, 20)) {
      const endAmount = line.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2}))\s*€?\s*$/);
      const price = endAmount ? parseFloat(endAmount[1].replace(/\./g, '').replace(',', '.')) : 0;
      const desc = endAmount ? line.substring(0, endAmount.index).replace(/^\d+[\s.)\-]+/, '').trim() : line.replace(/^\d+[\s.)\-]+/, '').trim();
      if (desc.length > 2 && price > 0) result.positions.push({ desc, qty: 1, price });
    }

    // Fallback: Grösste Beträge
    if (result.positions.length === 0) {
      let m;
      const amounts = [];
      const regex = /(\d{1,3}(?:\.\d{3})*(?:,\d{2}))\s*€/g;
      while ((m = regex.exec(text)) !== null) {
        const v = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
        if (v > 0 && v < 1000000) amounts.push(v);
      }
      [...new Set(amounts)].sort((a, b) => b - a).slice(0, 5).forEach(a => {
        result.positions.push({ desc: '(aus Foto erkannt)', qty: 1, price: a });
      });
    }

    return result;
  },

  _addInvPos(desc, qty, price) {
    const container = document.getElementById('ocr-positions');
    if (!container) return;
    container.insertAdjacentHTML('beforeend', `
      <div class="calc-position">
        <input type="text" name="ocr-pos-desc" placeholder="Beschreibung" value="${escapeHtml(desc || '')}" style="grid-column:1/4;">
        <input type="number" name="ocr-pos-qty" placeholder="Menge" value="${qty || 1}" min="0" step="any" onchange="OCRImport._recalcInvTotal()">
        <input type="number" name="ocr-pos-price" placeholder="Preis" value="${price || 0}" min="0" step="0.01" onchange="OCRImport._recalcInvTotal()" style="grid-column:5/7;">
        <span class="pos-total text-right">${formatCurrency((qty || 1) * (price || 0))}</span>
        <button type="button" class="btn-icon" onclick="this.closest('.calc-position').remove();OCRImport._recalcInvTotal()">🗑️</button>
      </div>
    `);
  },

  _recalcInvTotal() {
    let total = 0;
    document.querySelectorAll('#ocr-positions .calc-position').forEach(row => {
      const q = parseFloat(row.querySelector('[name="ocr-pos-qty"]')?.value) || 0;
      const p = parseFloat(row.querySelector('[name="ocr-pos-price"]')?.value) || 0;
      const t = Math.round(q * p * 100) / 100;
      total += t;
      const el = row.querySelector('.pos-total');
      if (el) el.textContent = formatCurrency(t);
    });
    const el = document.getElementById('ocr-total');
    if (el) el.textContent = formatCurrency(total);
  },

  async _saveInvoice() {
    const type = document.getElementById('ocr-doctype')?.value || 'rechnung';
    const positions = Array.from(document.querySelectorAll('#ocr-positions .calc-position')).map(row => {
      const description = row.querySelector('[name="ocr-pos-desc"]')?.value || '';
      const quantity = parseFloat(row.querySelector('[name="ocr-pos-qty"]')?.value) || 0;
      const unitPrice = parseFloat(row.querySelector('[name="ocr-pos-price"]')?.value) || 0;
      return { description, quantity, unitPrice, total: Math.round(quantity * unitPrice * 100) / 100 };
    }).filter(p => p.description.trim() || p.total > 0);

    const totalNet = Math.round(positions.reduce((s, p) => s + p.total, 0) * 100) / 100;
    const isKU = await isKleinunternehmer();
    const totalGross = isKU ? totalNet : Math.round(totalNet * (1 + MWST_RATE) * 100) / 100;
    const defaultPaymentDays = await db.getSetting('defaultPaymentDays', 14);
    const number = await db.getNextNumber(type);
    const dt = getDocType(type);
    const date = document.getElementById('ocr-date')?.value || todayISO();
    const refNumber = document.getElementById('ocr-ref')?.value || '';
    const notes = document.getElementById('ocr-notes')?.value || '';

    const invoice = {
      id: generateId(),
      number,
      type,
      status: 'entwurf',
      date,
      dueDate: dt.hasPayment ? calcDueDate(date, defaultPaymentDays) : null,
      customerName: document.getElementById('ocr-customer')?.value || '',
      customerAddress: document.getElementById('ocr-address')?.value || '',
      positions,
      totalNet,
      totalGross,
      kleinunternehmer: isKU,
      skontoEnabled: false,
      skontoRate: await db.getSetting('skontoRate', 2),
      skontoFrist: await db.getSetting('skontoFrist', 10),
      notes: (refNumber ? `Originalnummer: ${refNumber}\n` : '') + (notes || 'Importiert aus Foto'),
      createdAt: new Date().toISOString(),
    };

    await db.put(STORES.invoices, invoice);
    closeModal();
    showToast(`${dt.label} ${number} aus Foto erstellt`);
    app.navigate('invoices', invoice.id);
  }
};
