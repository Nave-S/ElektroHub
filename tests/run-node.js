#!/usr/bin/env node
// ============================================
// ElektroHub – Unit Tests (Node.js Runner)
// Führt Tests ohne Browser aus
// ============================================

// Big.js laden
globalThis.Big = require('big.js');

// DOM-Stubs
globalThis.document = {
  createElement: () => {
    let text = '', html = '';
    return {
      set textContent(v) { text = v; html = String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },
      get innerHTML() { return html; }
    };
  }
};
globalThis.navigator = { clipboard: {}, userAgent: 'Node', platform: 'test', language: 'de' };
globalThis.screen = { width: 1920, height: 1080, colorDepth: 24 };
globalThis.window = globalThis;
globalThis.Intl = Intl;

// Kern-Module laden via vm.runInThisContext (macht const/function global)
const fs = require('fs');
const vm = require('vm');
const loadScript = (path) => {
  const code = fs.readFileSync(require('path').join(__dirname, '..', path), 'utf8');
  vm.runInThisContext(code, { filename: path });
};
loadScript('js/utils.js');
loadScript('js/templates.js');
loadScript('js/textblocks.js');

// Test-Framework
let total = 0, passed = 0, failed = 0;
const RED = '\x1b[31m', GREEN = '\x1b[32m', RESET = '\x1b[0m', BOLD = '\x1b[1m', DIM = '\x1b[2m';

function describe(name, fn) {
  console.log(`\n${BOLD}${name}${RESET}`);
  fn();
}

function it(desc, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ${GREEN}✓${RESET} ${desc}`);
  } catch(e) {
    failed++;
    console.log(`  ${RED}✗ ${desc}${RESET}`);
    console.log(`    ${RED}${e.message}${RESET}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) { if (actual !== expected) throw new Error(`Erwartet: ${expected}, Bekommen: ${actual}`); },
    toBeCloseTo(expected, tol=0.001) { if (Math.abs(actual-expected)>tol) throw new Error(`Erwartet: ~${expected}, Bekommen: ${actual}`); },
    toBeTrue() { if (actual !== true) throw new Error(`Erwartet: true, Bekommen: ${actual}`); },
    toBeFalse() { if (actual !== false) throw new Error(`Erwartet: false, Bekommen: ${actual}`); },
    toContain(str) { if (typeof actual!=='string'||!actual.includes(str)) throw new Error(`"${actual}" enthält nicht "${str}"`); },
    toBeGreaterThan(v) { if (actual<=v) throw new Error(`${actual} nicht > ${v}`); },
    toEqual(exp) { if (JSON.stringify(actual)!==JSON.stringify(exp)) throw new Error(`Erwartet: ${JSON.stringify(exp)}, Bekommen: ${JSON.stringify(actual)}`); },
    not: { toBe(exp) { if (actual===exp) throw new Error(`Sollte nicht ${exp} sein`); } }
  };
}

// ===== TESTS =====
const start = Date.now();

describe('M – Präzise Arithmetik (Big.js)', () => {
  it('M.mul: 0.1 × 0.2 = 0.02', () => expect(M.mul(0.1, 0.2)).toBe(0.02));
  it('M.mul: 24 × 38 = 912', () => expect(M.mul(24, 38)).toBe(912));
  it('M.mul: 80 × 4.50 = 360', () => expect(M.mul(80, 4.50)).toBe(360));
  it('M.add: 0.1 + 0.2 = 0.3', () => expect(M.add(0.1, 0.2)).toBe(0.3));
  it('M.sub: 100.10 - 0.10 = 100', () => expect(M.sub(100.10, 0.10)).toBe(100));
  it('M.div: 100 / 3 = 33.33', () => expect(M.div(100, 3)).toBe(33.33));
  it('M.div: Division durch 0 = 0', () => expect(M.div(100, 0)).toBe(0));
  it('M.round2: 3.145 → 3.15', () => expect(M.round2(3.145)).toBe(3.15));
  it('M.round2: null → 0', () => expect(M.round2(null)).toBe(0));
  it('M.sum: [0.1, 0.2, 0.3] = 0.6', () => expect(M.sum([0.1, 0.2, 0.3])).toBe(0.6));
  it('M.sum: leeres Array = 0', () => expect(M.sum([])).toBe(0));
});

describe('M.posTotal – Positions-Berechnung', () => {
  it('24 × 38 = 912', () => expect(M.posTotal(24, 38, 0)).toBe(912));
  it('32 × 45 - 5% = 1368', () => expect(M.posTotal(32, 45, 5)).toBe(1368));
  it('80 × 4.50 = 360', () => expect(M.posTotal(80, 4.50, 0)).toBe(360));
  it('80 × 0.60 = 48', () => expect(M.posTotal(80, 0.60, 0)).toBe(48));
  it('null × null = 0', () => expect(M.posTotal(null, null, null)).toBe(0));
  it('100% Rabatt = 0', () => expect(M.posTotal(10, 50, 100)).toBe(0));
});

describe('M.netToGross / M.tax', () => {
  it('1000 + 19% = 1190', () => expect(M.netToGross(1000, 19)).toBe(1190));
  it('4798 + 19% = 5709.62', () => expect(M.netToGross(4798, 19)).toBe(5709.62));
  it('100 + 7% = 107', () => expect(M.netToGross(100, 7)).toBe(107));
  it('MwSt 1000 bei 19% = 190', () => expect(M.tax(1000, 19)).toBe(190));
  it('MwSt 4798 bei 19% = 911.62', () => expect(M.tax(4798, 19)).toBe(911.62));
});

describe('M.grossFromPositions', () => {
  it('1 Pos 1000€ bei 19% = 1190', () => expect(M.grossFromPositions([{total:1000,mwstRate:19}], false)).toBe(1190));
  it('Gemischt: 1000@19% + 500@7% = 1725', () => expect(M.grossFromPositions([{total:1000,mwstRate:19},{total:500,mwstRate:7}], false)).toBe(1725));
  it('KU: Brutto = Netto', () => expect(M.grossFromPositions([{total:1000,mwstRate:19}], true)).toBe(1000));
  it('Leer = 0', () => expect(M.grossFromPositions([], false)).toBe(0));
  it('Demo Weber: 4798 netto = 5709.62 brutto', () => {
    const pos = [345,440,48,232,288,280,2640,350,175].map(t => ({total:t,mwstRate:19}));
    expect(M.grossFromPositions(pos, false)).toBe(5709.62);
  });
});

describe('M.skonto', () => {
  it('2% von 5709.62 = 114.19', () => expect(M.skonto(5709.62, 2)).toBe(114.19));
  it('3% von 1000 = 30', () => expect(M.skonto(1000, 3)).toBe(30));
  it('0% = 0', () => expect(M.skonto(5000, 0)).toBe(0));
  it('null = 0', () => expect(M.skonto(null, null)).toBe(0));
});

describe('M.margin', () => {
  it('1000/700 = 30%', () => expect(M.margin(1000, 700)).toBe(30));
  it('0 Umsatz = 0%', () => expect(M.margin(0, 500)).toBe(0));
});

describe('formatCurrency', () => {
  it('1000 enthält "1.000"', () => expect(formatCurrency(1000)).toContain('1.000'));
  it('0 enthält "0,00"', () => expect(formatCurrency(0)).toContain('0,00'));
});

describe('formatDate', () => {
  it('2026-03-24 → 24.03.2026', () => expect(formatDate('2026-03-24')).toBe('24.03.2026'));
  it('null → –', () => expect(formatDate(null)).toBe('–'));
});

describe('calcDueDate', () => {
  it('+14 Tage', () => expect(calcDueDate('2026-03-01', 14)).toBe('2026-03-15'));
  it('+30 Tage über Monatsgrenze', () => expect(calcDueDate('2026-01-25', 30)).toBe('2026-02-24'));
});

describe('escapeHtml', () => {
  it('Text bleibt gleich', () => expect(escapeHtml('Hallo')).toBe('Hallo'));
  it('HTML wird escaped', () => expect(escapeHtml('<b>test</b>')).toContain('&lt;'));
  it('null → ""', () => expect(escapeHtml(null)).toBe(''));
});

describe('DOC_TYPES', () => {
  it('14 Typen', () => expect(DOC_TYPES.length).toBe(14));
  it('Angebot canSkonto', () => expect(getDocType('angebot').canSkonto).toBeTrue());
  it('Rechnung hasPayment', () => expect(getDocType('rechnung').hasPayment).toBeTrue());
  it('Storno kein Skonto', () => expect(getDocType('stornorechnung').canSkonto).toBeFalse());
});

describe('UNITS', () => {
  it('18 Einheiten', () => expect(UNITS.length).toBe(18));
  it('Stück vorhanden', () => expect(UNITS.includes('Stück')).toBeTrue());
});

describe('DEFAULT_TEMPLATES', () => {
  it('14 Vorlagen', () => expect(Object.keys(DEFAULT_TEMPLATES).length).toBe(14));
  it('Rechnung enthält [Dokumentnr]', () => expect(DEFAULT_TEMPLATES.rechnung.intro).toContain('[Dokumentnr]'));
});

describe('replaceTemplatePlaceholders', () => {
  it('Ersetzt [Name]', () => expect(replaceTemplatePlaceholders('Hi [Name]', {name:'Weber'})).toBe('Hi Weber'));
  it('null → ""', () => expect(replaceTemplatePlaceholders(null, {})).toBe(''));
});

describe('getFormattedAddress', () => {
  it('Neue Felder', () => expect(getFormattedAddress({street:'Str.',houseNumber:'1',zip:'12345',city:'Ort'})).toBe('Str. 1\n12345 Ort'));
  it('Legacy', () => expect(getFormattedAddress({address:'Alt'})).toBe('Alt'));
  it('null → ""', () => expect(getFormattedAddress(null)).toBe(''));
});

describe('getCustomerDisplayName', () => {
  it('Voll', () => expect(getCustomerDisplayName({anrede:'Herr',firstName:'Max',name:'M'})).toBe('Herr Max M'));
  it('null → ""', () => expect(getCustomerDisplayName(null)).toBe(''));
});

describe('DEFAULT_TEXT_BLOCKS', () => {
  it('40+ Bausteine', () => expect(DEFAULT_TEXT_BLOCKS.length).toBeGreaterThan(39));
  it('INST-001 Steckdose', () => expect(DEFAULT_TEXT_BLOCKS.find(b=>b.code==='INST-001').description).toContain('Steckdose'));
});

describe('Integration: Komplette Rechnung', () => {
  const pos = [
    {quantity:80, unitPrice:4.50, discount:0, mwstRate:19},
    {quantity:40, unitPrice:6.80, discount:0, mwstRate:19},
    {quantity:24, unitPrice:38, discount:0, mwstRate:19},
    {quantity:12, unitPrice:35, discount:0, mwstRate:19},
    {quantity:1, unitPrice:680, discount:0, mwstRate:19},
    {quantity:32, unitPrice:55, discount:0, mwstRate:19},
    {quantity:5, unitPrice:35, discount:0, mwstRate:19},
  ];
  pos.forEach(p => { p.total = M.posTotal(p.quantity, p.unitPrice, p.discount); });
  const net = M.sum(pos.map(p=>p.total));
  const gross = M.grossFromPositions(pos, false);

  it('Netto = 4579', () => expect(net).toBe(4579));
  it('Brutto = 5449.01', () => expect(gross).toBe(5449.01));
  it('MwSt = 870.01', () => expect(M.sub(gross, net)).toBe(870.01));
  it('Skonto 2% = 108.98', () => expect(M.skonto(gross, 2)).toBe(108.98));
  it('Nach Skonto = 5340.03', () => expect(M.sub(gross, M.skonto(gross, 2))).toBe(5340.03));
});

describe('Integration: Gemischte MwSt', () => {
  const pos = [
    {quantity:10, unitPrice:100, discount:0, mwstRate:19},
    {quantity:5, unitPrice:50, discount:10, mwstRate:7},
  ];
  pos.forEach(p => { p.total = M.posTotal(p.quantity, p.unitPrice, p.discount); });
  it('Pos 1: 1000', () => expect(pos[0].total).toBe(1000));
  it('Pos 2: 225 (5×50-10%)', () => expect(pos[1].total).toBe(225));
  it('Netto: 1225', () => expect(M.sum(pos.map(p=>p.total))).toBe(1225));
  it('Brutto: 1430.75', () => expect(M.grossFromPositions(pos, false)).toBe(1430.75));
});

// ===== Ergebnis =====
const dur = Date.now() - start;
console.log(`\n${'='.repeat(50)}`);
if (failed === 0) {
  console.log(`${GREEN}${BOLD}✓ Alle ${total} Tests bestanden${RESET} ${DIM}(${dur}ms)${RESET}`);
} else {
  console.log(`${RED}${BOLD}✗ ${failed} von ${total} Tests fehlgeschlagen${RESET} ${DIM}(${dur}ms)${RESET}`);
}
process.exit(failed > 0 ? 1 : 0);
