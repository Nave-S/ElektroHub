// ============================================
// ElektroHub – QR Forge (nativer QR-Code-Generator)
// ============================================

const QRForgeView = {
  _type: 'url',
  _data: {},
  _ecLevel: 'M',
  _size: 600,
  _fg: '#000000',
  _bg: '#ffffff',
  _canvas: null,

  _types: [
    { id: 'url',      icon: '🔗', label: 'URL',      fields: [{ key:'url', label:'URL', placeholder:'https://example.com', type:'url' }] },
    { id: 'text',     icon: '✏️', label: 'Text',     fields: [{ key:'text', label:'Text', placeholder:'Beliebiger Text...', type:'textarea' }] },
    { id: 'wifi',     icon: '📶', label: 'WLAN',     fields: [
      { key:'ssid', label:'Netzwerkname (SSID)', placeholder:'MeinWLAN' },
      { key:'password', label:'Passwort', placeholder:'Passwort', type:'password' },
      { key:'encryption', label:'Verschlüsselung', type:'select', options:['WPA','WEP','nopass'] }
    ]},
    { id: 'vcard',    icon: '👤', label: 'Kontakt',  fields: [
      { key:'firstName', label:'Vorname', placeholder:'Max' },
      { key:'lastName', label:'Nachname', placeholder:'Mustermann' },
      { key:'phone', label:'Telefon', placeholder:'+49 123 4567890' },
      { key:'email', label:'E-Mail', placeholder:'max@example.com' },
      { key:'org', label:'Firma', placeholder:'Firma GmbH' },
      { key:'url', label:'Website', placeholder:'https://example.com' }
    ]},
    { id: 'email',    icon: '✉️', label: 'E-Mail',   fields: [
      { key:'to', label:'Empfänger', placeholder:'name@example.com' },
      { key:'subject', label:'Betreff', placeholder:'Betreff...' },
      { key:'body', label:'Nachricht', placeholder:'Hallo...', type:'textarea' }
    ]},
    { id: 'sms',      icon: '💬', label: 'SMS',      fields: [
      { key:'phone', label:'Telefonnummer', placeholder:'+49 123 4567890' },
      { key:'message', label:'Nachricht', placeholder:'Hallo...', type:'textarea' }
    ]},
    { id: 'tel',      icon: '📞', label: 'Telefon',  fields: [{ key:'phone', label:'Telefonnummer', placeholder:'+49 123 4567890' }] },
    { id: 'whatsapp', icon: '💚', label: 'WhatsApp', fields: [
      { key:'phone', label:'Nummer (mit Ländercode)', placeholder:'4912345678' },
      { key:'message', label:'Nachricht', placeholder:'Hallo!', type:'textarea' }
    ]},
    { id: 'geo',      icon: '📍', label: 'Standort', fields: [
      { key:'lat', label:'Breitengrad', placeholder:'51.6618', type:'number' },
      { key:'lng', label:'Längengrad', placeholder:'6.9626', type:'number' }
    ]},
    { id: 'event',    icon: '📅', label: 'Event',    fields: [
      { key:'title', label:'Titel', placeholder:'Meeting' },
      { key:'start', label:'Start', type:'datetime-local' },
      { key:'end', label:'Ende', type:'datetime-local' },
      { key:'location', label:'Ort', placeholder:'Büro' },
      { key:'description', label:'Beschreibung', placeholder:'Details...', type:'textarea' }
    ]}
  ],

  async render() {
    const typeBtns = this._types.map(t =>
      `<button class="qrf-type-btn ${t.id === this._type ? 'active' : ''}" onclick="QRForgeView._selectType('${t.id}')">
        <span class="qrf-type-icon">${t.icon}</span>${t.label}
      </button>`
    ).join('');

    const currentType = this._types.find(t => t.id === this._type);

    return `
      <div class="page-header">
        <div>
          <h2>QR Forge</h2>
          <p class="page-subtitle">QR-Codes für alles generieren</p>
        </div>
      </div>

      <div class="qrf-type-grid">${typeBtns}</div>

      <div class="qrf-layout">
        <!-- Links: Formular -->
        <div class="card">
          <h3 class="mb-16">${currentType.icon} ${currentType.label}</h3>
          <div id="qrf-form">
            ${this._buildFormFields(currentType)}
          </div>
        </div>

        <!-- Rechts: Vorschau -->
        <div class="card qrf-preview-card">
          <h3 class="mb-16">Vorschau</h3>

          <div class="qrf-preview" id="qrf-preview">
            <div class="text-muted text-center" style="padding:40px;">
              Gib Daten ein um den QR-Code zu generieren
            </div>
          </div>

          <div id="qrf-payload" class="qrf-payload">—</div>

          <div class="form-row mt-16">
            <div class="form-group">
              <label>Vordergrund</label>
              <input type="color" id="qrf-fg" value="${this._fg}" onchange="QRForgeView._fg=this.value;QRForgeView._update()" style="width:100%;height:36px;border:1px solid var(--gray-300);border-radius:6px;cursor:pointer;">
            </div>
            <div class="form-group">
              <label>Hintergrund</label>
              <input type="color" id="qrf-bg" value="${this._bg}" onchange="QRForgeView._bg=this.value;QRForgeView._update()" style="width:100%;height:36px;border:1px solid var(--gray-300);border-radius:6px;cursor:pointer;">
            </div>
          </div>

          <div class="form-group mt-8">
            <label>Größe: <strong id="qrf-size-val">${this._size}px</strong></label>
            <input type="range" id="qrf-size" min="200" max="1200" value="${this._size}" step="50"
              oninput="QRForgeView._size=parseInt(this.value);document.getElementById('qrf-size-val').textContent=this.value+'px';QRForgeView._update()"
              style="width:100%;">
          </div>

          <div class="form-group mt-8">
            <label>Fehlerkorrektur</label>
            <div class="qrf-ec-row">
              ${['L','M','Q','H'].map(ec =>
                `<button class="qrf-ec-btn ${ec === this._ecLevel ? 'active' : ''}" onclick="QRForgeView._setEC('${ec}')">${ec} · ${ec==='L'?'7':ec==='M'?'15':ec==='Q'?'25':'30'}%</button>`
              ).join('')}
            </div>
          </div>

          <div class="btn-group mt-16" style="flex-direction:column;">
            <button class="btn btn-primary btn-big" onclick="QRForgeView._downloadPNG()" style="width:100%;">PNG herunterladen</button>
            <button class="btn btn-secondary" onclick="QRForgeView._downloadSVG()" style="width:100%;">SVG herunterladen</button>
          </div>
        </div>
      </div>
    `;
  },

  _buildFormFields(type) {
    return type.fields.map(f => {
      const val = this._data[f.key] || '';
      if (f.type === 'textarea') {
        return `<div class="form-group"><label>${f.label}</label><textarea name="${f.key}" placeholder="${f.placeholder || ''}" oninput="QRForgeView._onInput('${f.key}',this.value)">${escapeHtml(val)}</textarea></div>`;
      }
      if (f.type === 'select') {
        const opts = f.options.map(o => `<option value="${o}" ${val===o?'selected':''}>${o === 'nopass' ? 'Keine' : o}</option>`).join('');
        return `<div class="form-group"><label>${f.label}</label><select name="${f.key}" onchange="QRForgeView._onInput('${f.key}',this.value)">${opts}</select></div>`;
      }
      return `<div class="form-group"><label>${f.label}</label><input type="${f.type||'text'}" name="${f.key}" placeholder="${f.placeholder||''}" value="${escapeHtml(val)}" oninput="QRForgeView._onInput('${f.key}',this.value)"></div>`;
    }).join('');
  },

  _selectType(id) {
    this._type = id;
    this._data = {};
    this._canvas = null;
    app.refresh();
  },

  _setEC(level) {
    this._ecLevel = level;
    document.querySelectorAll('.qrf-ec-btn').forEach(b => b.classList.toggle('active', b.textContent.startsWith(level)));
    this._update();
  },

  _onInput(key, value) {
    this._data[key] = value;
    this._update();
  },

  _buildPayload() {
    const d = this._data;
    switch (this._type) {
      case 'url': return d.url || '';
      case 'text': return d.text || '';
      case 'wifi':
        if (!d.ssid) return '';
        return `WIFI:T:${d.encryption||'WPA'};S:${d.ssid};P:${d.password||''};;`;
      case 'vcard':
        if (!d.firstName && !d.lastName) return '';
        return ['BEGIN:VCARD','VERSION:3.0',`N:${d.lastName||''};${d.firstName||''};;;`,`FN:${(d.firstName||'')+' '+(d.lastName||'')}`.trim(),d.phone?`TEL:${d.phone}`:'',d.email?`EMAIL:${d.email}`:'',d.org?`ORG:${d.org}`:'',d.url?`URL:${d.url}`:'','END:VCARD'].filter(Boolean).join('\n');
      case 'email':
        if (!d.to) return '';
        return `mailto:${d.to}?subject=${encodeURIComponent(d.subject||'')}&body=${encodeURIComponent(d.body||'')}`;
      case 'sms':
        if (!d.phone) return '';
        return `sms:${d.phone}${d.message?'?body='+encodeURIComponent(d.message):''}`;
      case 'tel': return d.phone ? `tel:${d.phone}` : '';
      case 'whatsapp':
        if (!d.phone) return '';
        return `https://wa.me/${d.phone.replace(/[^0-9]/g,'')}${d.message?'?text='+encodeURIComponent(d.message):''}`;
      case 'geo':
        if (!d.lat || !d.lng) return '';
        return `geo:${d.lat},${d.lng}`;
      case 'event':
        if (!d.title) return '';
        const fmt = (dt) => dt ? dt.replace(/[-:T]/g,'').slice(0,15)+'00' : '';
        return ['BEGIN:VEVENT',`SUMMARY:${d.title}`,d.start?`DTSTART:${fmt(d.start)}`:'',d.end?`DTEND:${fmt(d.end)}`:'',d.location?`LOCATION:${d.location}`:'',d.description?`DESCRIPTION:${d.description}`:'','END:VEVENT'].filter(Boolean).join('\n');
      default: return '';
    }
  },

  _update() {
    const payload = this._buildPayload();
    const payloadEl = document.getElementById('qrf-payload');
    const previewEl = document.getElementById('qrf-preview');
    if (payloadEl) payloadEl.textContent = payload || '—';

    if (!payload || !previewEl) {
      if (previewEl) previewEl.innerHTML = '<div class="text-muted text-center" style="padding:40px;">Gib Daten ein um den QR-Code zu generieren</div>';
      this._canvas = null;
      return;
    }

    // QRious muss geladen sein
    if (typeof QRious === 'undefined') {
      previewEl.innerHTML = '<div class="text-muted text-center" style="padding:40px;">QR-Bibliothek wird geladen...</div>';
      return;
    }

    const offscreen = document.createElement('canvas');
    this._canvas = offscreen;

    try {
      new QRious({ element: offscreen, value: payload, size: this._size, foreground: this._fg, background: this._bg, level: this._ecLevel });

      const display = document.createElement('canvas');
      const ds = 240;
      display.width = ds;
      display.height = ds;
      display.style.borderRadius = '8px';
      display.style.maxWidth = '100%';
      const ctx = display.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreen, 0, 0, ds, ds);

      previewEl.innerHTML = '';
      previewEl.appendChild(display);
    } catch (e) {
      previewEl.innerHTML = '<div class="text-muted text-center" style="padding:40px;">Fehler bei der Generierung</div>';
    }
  },

  _downloadPNG() {
    if (!this._canvas) { showToast('Erst Daten eingeben', 'error'); return; }
    const a = document.createElement('a');
    a.download = `qr-${this._type}-${Date.now()}.png`;
    a.href = this._canvas.toDataURL('image/png');
    a.click();
    showToast('PNG heruntergeladen');
  },

  _downloadSVG() {
    if (!this._canvas) { showToast('Erst Daten eingeben', 'error'); return; }
    const size = this._canvas.width;
    const ctx = this._canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, size, size);
    const threshold = 128;

    let moduleSize = 1;
    const r0 = imgData.data[0];
    for (let x = 1; x < size; x++) {
      if ((imgData.data[x * 4] < threshold) !== (r0 < threshold)) { moduleSize = x; break; }
    }
    if (moduleSize < 2) moduleSize = Math.round(size / 50);

    const modules = Math.round(size / moduleSize);
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${modules} ${modules}" width="${size}" height="${size}">`;
    svg += `<rect width="${modules}" height="${modules}" fill="${this._bg}"/>`;
    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        const px = Math.floor(x * moduleSize + moduleSize / 2);
        const py = Math.floor(y * moduleSize + moduleSize / 2);
        const idx = (py * size + px) * 4;
        if (imgData.data[idx] < threshold) svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="${this._fg}"/>`;
      }
    }
    svg += '</svg>';

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.download = `qr-${this._type}-${Date.now()}.svg`;
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('SVG heruntergeladen');
  }
};
