// ============================================
// ElektroHub – Kalkulations-Textbausteine
// Vordefinierte Leistungsbeschreibungen für Elektro-Arbeiten
// ============================================

const TEXT_BLOCK_CATEGORIES = [
  { value: 'installation', label: 'Installationsarbeiten' },
  { value: 'kabel', label: 'Kabelverlegung' },
  { value: 'verteiler', label: 'Verteiler & Zähler' },
  { value: 'beleuchtung', label: 'Beleuchtung' },
  { value: 'pruefung', label: 'Prüfung & Messung' },
  { value: 'nebenkosten', label: 'Nebenkosten' },
];

const DEFAULT_TEXT_BLOCKS = [
  // === Installationsarbeiten ===
  { code: 'INST-001', category: 'installation', description: 'Steckdose setzen (Unterputz), inkl. Dose, Rahmen und Einsatz', unit: 'Stk', type: 'material' },
  { code: 'INST-002', category: 'installation', description: 'Lichtschalter setzen (Unterputz), inkl. Dose, Rahmen und Einsatz', unit: 'Stk', type: 'material' },
  { code: 'INST-003', category: 'installation', description: 'Wechselschalter setzen (Unterputz), inkl. Verkabelung', unit: 'Stk', type: 'material' },
  { code: 'INST-004', category: 'installation', description: 'Kreuzschalter setzen (Unterputz), inkl. Verkabelung', unit: 'Stk', type: 'material' },
  { code: 'INST-005', category: 'installation', description: 'Dimmer setzen (Unterputz), inkl. Dose und Rahmen', unit: 'Stk', type: 'material' },
  { code: 'INST-006', category: 'installation', description: 'Steckdose setzen (Aufputz), inkl. Dose und Einsatz', unit: 'Stk', type: 'material' },
  { code: 'INST-007', category: 'installation', description: 'Netzwerkdose (RJ45 Cat6a) setzen, inkl. Dose und Einsatz', unit: 'Stk', type: 'material' },
  { code: 'INST-008', category: 'installation', description: 'TAE-Dose (Telefon) setzen', unit: 'Stk', type: 'material' },
  { code: 'INST-009', category: 'installation', description: 'SAT-/Antennendose setzen', unit: 'Stk', type: 'material' },
  { code: 'INST-010', category: 'installation', description: 'Herdanschlussdose (5-polig) setzen, inkl. Verkabelung', unit: 'Stk', type: 'material' },

  // === Kabelverlegung ===
  { code: 'KAB-001', category: 'kabel', description: 'NYM-J 3×1,5 mm² verlegen (Unterputz), inkl. Schlitz und Verschließen', unit: 'm', type: 'material' },
  { code: 'KAB-002', category: 'kabel', description: 'NYM-J 5×2,5 mm² verlegen (Unterputz), inkl. Schlitz und Verschließen', unit: 'm', type: 'material' },
  { code: 'KAB-003', category: 'kabel', description: 'NYM-J 5×2,5 mm² verlegen (Aufputz im Kabelkanal)', unit: 'm', type: 'material' },
  { code: 'KAB-004', category: 'kabel', description: 'Cat7 Netzwerkkabel verlegen (Unterputz/Leerrohr)', unit: 'm', type: 'material' },
  { code: 'KAB-005', category: 'kabel', description: 'Erdkabel NYY-J 5×6 mm² verlegen, inkl. Schutzrohr', unit: 'm', type: 'material' },
  { code: 'KAB-006', category: 'kabel', description: 'Leerrohr DN25 verlegen (Unterputz)', unit: 'm', type: 'material' },
  { code: 'KAB-007', category: 'kabel', description: 'Kabelkanal (40×60mm) montieren, inkl. Befestigung', unit: 'm', type: 'material' },

  // === Verteiler & Zähler ===
  { code: 'VT-001', category: 'verteiler', description: 'Zählerschrank setzen (1-Feld, APZ), inkl. Bestückung und Verdrahtung', unit: 'Stk', type: 'material' },
  { code: 'VT-002', category: 'verteiler', description: 'Zählerschrank setzen (2-Feld, APZ), inkl. Bestückung und Verdrahtung', unit: 'Stk', type: 'material' },
  { code: 'VT-003', category: 'verteiler', description: 'Unterverteiler (12 TE) setzen, inkl. Bestückung', unit: 'Stk', type: 'material' },
  { code: 'VT-004', category: 'verteiler', description: 'Unterverteiler (24 TE) setzen, inkl. Bestückung', unit: 'Stk', type: 'material' },
  { code: 'VT-005', category: 'verteiler', description: 'FI-Schutzschalter 40A/30mA einbauen und anschließen', unit: 'Stk', type: 'material' },
  { code: 'VT-006', category: 'verteiler', description: 'Leitungsschutzschalter (LS) B16A einbauen und anschließen', unit: 'Stk', type: 'material' },
  { code: 'VT-007', category: 'verteiler', description: 'Überspannungsschutz Typ 2 einbauen', unit: 'Stk', type: 'material' },
  { code: 'VT-008', category: 'verteiler', description: 'Potentialausgleichsschiene montieren und anschließen', unit: 'Stk', type: 'material' },

  // === Beleuchtung ===
  { code: 'LI-001', category: 'beleuchtung', description: 'Deckenleuchte montieren und anschließen', unit: 'Stk', type: 'material' },
  { code: 'LI-002', category: 'beleuchtung', description: 'LED-Einbaustrahler setzen und anschließen', unit: 'Stk', type: 'material' },
  { code: 'LI-003', category: 'beleuchtung', description: 'Außenleuchte (Wandmontage) montieren und anschließen', unit: 'Stk', type: 'material' },
  { code: 'LI-004', category: 'beleuchtung', description: 'Bewegungsmelder montieren und anschließen', unit: 'Stk', type: 'material' },
  { code: 'LI-005', category: 'beleuchtung', description: 'LED-Feuchtraumleuchte montieren und anschließen', unit: 'Stk', type: 'material' },

  // === Prüfung & Messung ===
  { code: 'PR-001', category: 'pruefung', description: 'E-Check / Prüfung der elektrischen Anlage nach DIN VDE 0100-600', unit: 'Pausch', type: 'pauschale' },
  { code: 'PR-002', category: 'pruefung', description: 'Isolationsmessung pro Stromkreis', unit: 'Stk', type: 'pauschale' },
  { code: 'PR-003', category: 'pruefung', description: 'Schleifenimpedanzmessung pro Stromkreis', unit: 'Stk', type: 'pauschale' },
  { code: 'PR-004', category: 'pruefung', description: 'RCD-Prüfung (Auslösezeit und Auslösestrom)', unit: 'Stk', type: 'pauschale' },
  { code: 'PR-005', category: 'pruefung', description: 'Erstellen Prüfprotokoll / Anlagendokumentation', unit: 'Pausch', type: 'pauschale' },
  { code: 'PR-006', category: 'pruefung', description: 'Thermografie-Aufnahme Verteilung (inkl. Bericht)', unit: 'Pausch', type: 'pauschale' },

  // === Nebenkosten ===
  { code: 'NK-001', category: 'nebenkosten', description: 'Anfahrtspauschale (bis 25 km)', unit: 'Pausch', type: 'nebenkosten' },
  { code: 'NK-002', category: 'nebenkosten', description: 'Anfahrt je zusätzlicher km (über 25 km)', unit: 'km', type: 'nebenkosten' },
  { code: 'NK-003', category: 'nebenkosten', description: 'Kleinmaterialpauschale (Schrauben, Dübel, Kabelbinder etc.)', unit: 'Pausch', type: 'nebenkosten' },
  { code: 'NK-004', category: 'nebenkosten', description: 'Entsorgung Altmaterial / Bauschutt', unit: 'Pausch', type: 'nebenkosten' },
  { code: 'NK-005', category: 'nebenkosten', description: 'Baustelleneinrichtung / Abdeckarbeiten', unit: 'Pausch', type: 'nebenkosten' },
  { code: 'NK-006', category: 'nebenkosten', description: 'Stundenlohnarbeiten (Meister)', unit: 'Std', type: 'stunden' },
  { code: 'NK-007', category: 'nebenkosten', description: 'Stundenlohnarbeiten (Geselle)', unit: 'Std', type: 'stunden' },
  { code: 'NK-008', category: 'nebenkosten', description: 'Zuschlag Wochenendarbeit / Notdienst', unit: 'Std', type: 'stunden' },
];

// Get all text blocks (custom + defaults)
async function getAllTextBlocks() {
  const custom = await db.getAll(STORES.textBlocks);
  const defaults = DEFAULT_TEXT_BLOCKS.map(b => ({ ...b, id: 'default_' + b.code, isDefault: true }));
  // Merge: custom blocks override defaults with same code
  const customCodes = new Set(custom.map(c => c.code));
  const merged = [
    ...custom,
    ...defaults.filter(d => !customCodes.has(d.code)),
  ];
  return merged.sort((a, b) => a.code.localeCompare(b.code));
}

// Search text blocks
function searchTextBlocks(blocks, query, category) {
  let filtered = blocks;
  if (category) {
    filtered = filtered.filter(b => b.category === category);
  }
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(b =>
      (b.code || '').toLowerCase().includes(q) ||
      (b.description || '').toLowerCase().includes(q) ||
      (b.category || '').toLowerCase().includes(q)
    );
  }
  return filtered;
}
