// ============================================
// ElektroHub – Utility Functions
// ============================================

// ---- Präzise Arithmetik mit Big.js ----
// Alle Geld-Berechnungen laufen über diese Funktionen
const M = {
  // Multiplizieren: Menge × Preis
  mul(a, b) { return new Big(a || 0).times(b || 0).round(2).toNumber(); },
  // Addieren
  add(a, b) { return new Big(a || 0).plus(b || 0).round(2).toNumber(); },
  // Subtrahieren
  sub(a, b) { return new Big(a || 0).minus(b || 0).round(2).toNumber(); },
  // Dividieren
  div(a, b) { return b ? new Big(a || 0).div(b).round(2).toNumber() : 0; },
  // Runden auf 2 Dezimalstellen
  round2(a) { return new Big(a || 0).round(2).toNumber(); },
  // Summe eines Arrays
  sum(arr) { return arr.reduce((s, v) => new Big(s).plus(v || 0), new Big(0)).round(2).toNumber(); },
  // Positions-Total: Menge × Preis × (1 - Rabatt/100)
  posTotal(qty, price, discount) {
    return new Big(qty || 0).times(price || 0).times(new Big(1).minus(new Big(discount || 0).div(100))).round(2).toNumber();
  },
  // Netto zu Brutto (mit MwSt-Satz als ganze Zahl, z.B. 19)
  netToGross(net, mwstPercent) {
    return new Big(net || 0).times(new Big(1).plus(new Big(mwstPercent || 0).div(100))).round(2).toNumber();
  },
  // MwSt-Betrag berechnen
  tax(net, mwstPercent) {
    return new Big(net || 0).times(new Big(mwstPercent || 0).div(100)).round(2).toNumber();
  },
  // Skonto-Betrag
  skonto(brutto, skontoPercent) {
    return new Big(brutto || 0).times(new Big(skontoPercent || 0).div(100)).round(2).toNumber();
  },
  // Brutto aus Positionen berechnen (gemischte MwSt-Sätze, mit Rabatt)
  grossFromPositions(positions, isKU) {
    if (isKU) return M.sum(positions.map(p => p.total || 0));
    const net = M.sum(positions.map(p => p.total || 0));
    const taxByRate = {};
    (positions || []).forEach(p => {
      const rate = p.mwstRate != null ? p.mwstRate : 19;
      const posNet = p.total || 0;
      taxByRate[rate] = M.add(taxByRate[rate] || 0, M.tax(posNet, rate));
    });
    const totalTax = M.sum(Object.values(taxByRate));
    return M.add(net, totalTax);
  },
  // Marge in Prozent
  margin(revenue, cost) {
    if (!revenue || revenue === 0) return 0;
    return new Big(revenue).minus(cost || 0).div(revenue).times(100).round(1).toNumber();
  }
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateCustomerId(seq) {
  return `KND-${String(seq).padStart(4, '0')}`;
}

function generateProjectId(seq) {
  const year = new Date().getFullYear();
  return `PRJ-${year}-${String(seq).padStart(4, '0')}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Monatsnamen
const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

// Alle Dokumenttypen
const DOC_TYPES = [
  { value: 'angebot', label: 'Angebot', prefix: 'AG', hasPositions: true, hasPayment: false, canSkonto: true },
  { value: 'auftragsbestaetigung', label: 'Auftragsbestätigung', prefix: 'AB', hasPositions: true, hasPayment: false, canSkonto: true },
  { value: 'rechnung', label: 'Rechnung', prefix: 'RE', hasPositions: true, hasPayment: true, canSkonto: true },
  { value: 'abschlagsrechnung', label: 'Abschlagsrechnung', prefix: 'AR', hasPositions: true, hasPayment: true, canSkonto: true },
  { value: 'schlussrechnung', label: 'Schlussrechnung', prefix: 'SR', hasPositions: true, hasPayment: true, canSkonto: true },
  { value: 'stornorechnung', label: 'Stornorechnung', prefix: 'ST', hasPositions: true, hasPayment: false, canSkonto: false },
  { value: 'gutschrift', label: 'Gutschrift', prefix: 'GS', hasPositions: true, hasPayment: false, canSkonto: false },
  { value: 'lieferschein', label: 'Lieferschein', prefix: 'LS', hasPositions: true, hasPayment: false, canSkonto: false },
  { value: 'kostenvoranschlag', label: 'Kostenvoranschlag', prefix: 'KV', hasPositions: true, hasPayment: false, canSkonto: true },
  { value: 'abnahmeprotokoll', label: 'Abnahmeprotokoll', prefix: 'AP', hasPositions: false, hasPayment: false, canSkonto: false },
  { value: 'mahnung1', label: 'Zahlungserinnerung', prefix: 'MA', hasPositions: false, hasPayment: true, canSkonto: false },
  { value: 'mahnung2', label: '2. Mahnung', prefix: 'MA', hasPositions: false, hasPayment: true, canSkonto: false },
  { value: 'mahnung3', label: 'Letzte Mahnung', prefix: 'MA', hasPositions: false, hasPayment: true, canSkonto: false },
  { value: 'invoice_en', label: 'Invoice (EN)', prefix: 'INV', hasPositions: true, hasPayment: true, canSkonto: true },
];

// Typen die als "Rechnung" gelten (für Zahlungs-/Umsatzauswertung)
const INVOICE_LIKE_TYPES = ['rechnung', 'abschlagsrechnung', 'schlussrechnung', 'invoice_en'];
const OFFER_LIKE_TYPES = ['angebot', 'kostenvoranschlag'];

// Status-Labels
const PROJECT_STATUSES = [
  { value: 'anfrage', label: 'Anfrage', css: 'status-anfrage' },
  { value: 'kalkulation', label: 'Kalkulation', css: 'status-kalkulation' },
  { value: 'beauftragt', label: 'Beauftragt', css: 'status-beauftragt' },
  { value: 'in-arbeit', label: 'In Arbeit', css: 'status-in-arbeit' },
  { value: 'abnahme', label: 'Abnahme', css: 'status-abnahme' },
  { value: 'abgerechnet', label: 'Abgerechnet', css: 'status-abgerechnet' },
  { value: 'abgeschlossen', label: 'Abgeschlossen', css: 'status-abgeschlossen' },
];

const CUSTOMER_TYPES = [
  { value: 'privat', label: 'Privat' },
  { value: 'geschaeft', label: 'Geschäftskunde' },
  { value: 'behoerde', label: 'Behörde' },
];

const CUSTOMER_ANREDEN = [
  { value: 'Herr', label: 'Herr' },
  { value: 'Frau', label: 'Frau' },
  { value: 'Firma', label: 'Firma' },
  { value: 'Divers', label: 'Divers' },
];

// Computed formatted address for a customer object (supports legacy `address` field)
function getFormattedAddress(customer) {
  if (!customer) return '';
  // New split fields
  if (customer.street || customer.zip || customer.city) {
    const line1 = [customer.street, customer.houseNumber].filter(Boolean).join(' ');
    const line2 = [customer.zip, customer.city].filter(Boolean).join(' ');
    return [line1, line2, customer.addressExtra].filter(Boolean).join('\n');
  }
  // Legacy single-string address
  return customer.address || '';
}

// Full display name: Anrede + Titel + Vorname + Nachname
function getCustomerDisplayName(customer) {
  if (!customer) return '';
  return [customer.anrede, customer.title, customer.firstName, customer.name].filter(Boolean).join(' ');
}

const CALC_POSITION_TYPES = [
  { value: 'material', label: 'Material' },
  { value: 'stunden', label: 'Meister (Std.)' },
  { value: 'stunden_geselle', label: 'Geselle (Std.)' },
  { value: 'stunden_helfer', label: 'Helfer (Std.)' },
  { value: 'pauschale', label: 'Eigenleistung (Pausch.)' },
  { value: 'nebenkosten', label: 'Nebenkosten' },
];

const UNITS = [
  'Stück', 'Stunde', 'Minute', 'Meter', 'm²', 'Pauschal', 'Set',
  'km', 'kW', 'kWh', 'Einheit', 'Liter', 'kg', 'Rolle', 'Karton',
  'Packung', 'Tag', 'Monat'
];

const MWST_RATES = [19, 7, 0];

const INVOICE_STATUSES = [
  { value: 'entwurf', label: 'Entwurf', css: 'status-entwurf' },
  { value: 'gesendet', label: 'Gesendet', css: 'status-gesendet' },
  { value: 'offen', label: 'Offen', css: 'status-offen' },
  { value: 'bezahlt', label: 'Bezahlt', css: 'status-bezahlt' },
  { value: 'ueberfaellig', label: 'Überfällig', css: 'status-ueberfaellig' },
  { value: 'teilbezahlt', label: 'Teilbezahlt', css: 'status-offen' },
  { value: 'storniert', label: 'Storniert', css: 'status-entwurf' },
];

function statusBadge(value, list) {
  const s = list.find(s => s.value === value);
  if (!s) return `<span class="badge badge-gray">${escapeHtml(value)}</span>`;
  return `<span class="badge ${s.css}">${escapeHtml(s.label)}</span>`;
}

function selectOptions(list, selected) {
  return list.map(o =>
    `<option value="${o.value}" ${o.value === selected ? 'selected' : ''}>${escapeHtml(o.label)}</option>`
  ).join('');
}

// Get doc type info
function getDocType(value) {
  return DOC_TYPES.find(d => d.value === value) || DOC_TYPES[0];
}

// Tooltip-Texte für alle Abkürzungen
const TOOLTIPS = {
  // Dokumenttypen
  'AG': 'Angebot – Verbindliches Preisangebot an den Kunden (30 Tage gültig)',
  'AB': 'Auftragsbestätigung – Bestätigt den Auftrag nach Kundenzusage',
  'RE': 'Rechnung – Zahlungsaufforderung nach erledigter Arbeit',
  'AR': 'Abschlagsrechnung – Teilrechnung während der Arbeit',
  'SR': 'Schlussrechnung – Endabrechnung nach Fertigstellung (abzgl. Abschläge)',
  'ST': 'Stornorechnung – Storniert/korrigiert eine fehlerhafte Rechnung',
  'GS': 'Gutschrift – Rückerstattung an den Kunden',
  'LS': 'Lieferschein – Bestätigt die Lieferung von Material',
  'KV': 'Kostenvoranschlag – Unverbindliche Kostenschätzung (darf 15-20% abweichen)',
  'AP': 'Abnahmeprotokoll – Dokumentiert die Abnahme der fertigen Arbeit',
  'MA': 'Mahnung – Zahlungserinnerung bei überfälligen Rechnungen',
  'INV': 'Invoice – Englische Rechnung',
  // Projektstatus
  'anfrage': 'Anfrage – Kunde hat sich gemeldet, noch kein Angebot',
  'kalkulation': 'Kalkulation – Kosten werden berechnet',
  'beauftragt': 'Beauftragt – Kunde hat zugesagt, Auftrag erteilt',
  'in-arbeit': 'In Arbeit – Arbeiten auf der Baustelle laufen',
  'abnahme': 'Abnahme – Arbeiten fertig, Kunde prüft das Ergebnis',
  'abgerechnet': 'Abgerechnet – Rechnung wurde erstellt und versendet',
  'abgeschlossen': 'Abgeschlossen – Bezahlt und erledigt',
  // Belegstatus
  'entwurf': 'Entwurf – Noch nicht versendet, kann bearbeitet werden',
  'gesendet': 'Gesendet – An den Kunden verschickt',
  'offen': 'Offen – Rechnung versendet, Zahlung steht aus',
  'bezahlt': 'Bezahlt – Geld ist eingegangen',
  'ueberfaellig': 'Überfällig – Fälligkeitsdatum überschritten, keine Zahlung',
  'teilbezahlt': 'Teilbezahlt – Ein Teil des Betrags ist eingegangen',
  'storniert': 'Storniert – Beleg wurde storniert/zurückgezogen',
  // Sonstiges
  'MwSt': 'Mehrwertsteuer – Aktuell 19% (reduziert 7%)',
  'USt': 'Umsatzsteuer – Anderer Begriff für Mehrwertsteuer',
  'USt-ID': 'Umsatzsteuer-Identifikationsnummer – Für Geschäfte innerhalb der EU',
  'IBAN': 'Internationale Bankkontonummer – Deine Kontonummer für Überweisungen',
  'BIC': 'Bank Identifier Code – Internationale Bankleitzahl',
  'GoBD': 'Grundsätze ordnungsmäßiger Buchführung – Gesetzliche Anforderungen an digitale Buchführung',
  'EPC': 'European Payments Council – Standard für den QR-Code auf Rechnungen (GiroCode)',
  'SEPA': 'Single Euro Payments Area – Einheitlicher Euro-Zahlungsverkehr',
  'DATEV': 'Datenverarbeitungszentrale – Standard-Format für Steuerberater',
  'DGUV V3': 'Deutsche Gesetzliche Unfallversicherung Vorschrift 3 – Prüfpflicht für elektrische Betriebsmittel',
  'VOB/B': 'Vergabe- und Vertragsordnung für Bauleistungen – 4 Jahre Gewährleistung',
  'BGB': 'Bürgerliches Gesetzbuch – 5 Jahre Gewährleistung',
  'UStG': 'Umsatzsteuergesetz',
  '§19 UStG': 'Kleinunternehmerregelung – Keine MwSt. bei Jahresumsatz unter 22.000 €',
  '§35a EStG': 'Handwerkerbonus – Privatkunden können 20% der Arbeitskosten steuerlich absetzen',
  '§13b UStG': 'Reverse-Charge – Steuerschuldnerschaft geht auf den Leistungsempfänger über',
  'ZUGFeRD': 'Zentraler User Guide des Forums elektronische Rechnung Deutschland – Hybrides E-Rechnungsformat (PDF + XML)',
  'XRechnung': 'Deutsches E-Rechnungsformat (reines XML) – Pflicht für öffentliche Auftraggeber',
};

// Badge mit Tooltip erzeugen
function docTypeBadge(type) {
  const dt = getDocType(type);
  const tip = TOOLTIPS[dt.prefix] || dt.label;
  return `<span class="badge doctype-${type}" title="${escapeHtml(tip)}">${escapeHtml(dt.label)}</span>`;
}

function statusBadgeWithTip(value, list) {
  const s = list.find(s => s.value === value);
  const tip = TOOLTIPS[value] || '';
  if (!s) return `<span class="badge badge-gray" title="${escapeHtml(tip)}">${escapeHtml(value)}</span>`;
  return `<span class="badge ${s.css}" title="${escapeHtml(tip)}">${escapeHtml(s.label)}</span>`;
}

// Toast
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Modal
function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// Anleitung in separatem Fenster öffnen
function openGuideWindow() {
  const w = Math.min(620, Math.floor(screen.width * 0.4));
  const h = Math.floor(screen.height * 0.9);
  const left = 0;
  const top = Math.floor((screen.height - h) / 2);
  window.open('guide.html', 'ElektroHub_Anleitung', `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`);
}

// Preset-Chips: Klickbare Schnellauswahl neben Eingabefeldern
function presetChips(inputName, presets, suffix) {
  suffix = suffix || '';
  return `<div class="preset-chips">${presets.map(v =>
    `<button type="button" class="preset-chip" onclick="var el=this.closest('form').querySelector('[name=&quot;${inputName}&quot;]');if(el){el.value='${v}';el.dispatchEvent(new Event('change',{bubbles:true}));}">${v}${suffix}</button>`
  ).join('')}</div>`;
}

// Preset-Chips für Textfelder (setzt den ganzen Text)
function presetTextChips(inputName, presets) {
  return `<div class="preset-chips">${presets.map(p =>
    `<button type="button" class="preset-chip" onclick="var el=this.closest('form')?.querySelector('[name=&quot;${inputName}&quot;]')||document.querySelector('[name=&quot;${inputName}&quot;]');if(el){el.value='${p.value.replace(/'/g, "\\'")}';el.dispatchEvent(new Event('change',{bubbles:true}));}" title="${escapeHtml(p.value)}">${escapeHtml(p.label)}</button>`
  ).join('')}</div>`;
}

// Picker Overlay (zweite Ebene über dem Modal)
function openPicker(title, bodyHtml) {
  document.getElementById('picker-title').textContent = title;
  document.getElementById('picker-body').innerHTML = bodyHtml;
  document.getElementById('picker-overlay').classList.remove('hidden');
}

function closePicker() {
  document.getElementById('picker-overlay').classList.add('hidden');
}

// Netto/Brutto
let MWST_RATE = 0.19;

async function loadMwstRate() {
  const custom = await db.getSetting('mwstRate', 19);
  MWST_RATE = custom / 100;
}

function nettoToBrutto(netto) {
  return M.netToGross(netto, MWST_RATE * 100);
}

function calcMarginPercent(revenue, cost) {
  return M.margin(revenue, cost);
}

function marginClass(pct) {
  if (pct < 10) return 'margin-low';
  if (pct < 25) return 'margin-ok';
  return 'margin-good';
}

// Skonto berechnen (präzise mit Big.js)
function calcSkonto(bruttoBetrag, skontoProzent) {
  return M.skonto(bruttoBetrag, skontoProzent);
}

// Fälligkeitsdatum berechnen
function calcDueDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Prüfe ob Kleinunternehmer
async function isKleinunternehmer() {
  return await db.getSetting('kleinunternehmer', false);
}

// Arbeitskosten aus Positionen berechnen (für Handwerkerbonus)
function calcArbeitskosten(positions) {
  const arbeitsTypen = ['stunden', 'stunden_geselle', 'stunden_helfer', 'pauschale', 'nebenkosten'];
  return M.sum((positions || []).filter(p => arbeitsTypen.includes(p.type)).map(p => p.total || 0));
}
