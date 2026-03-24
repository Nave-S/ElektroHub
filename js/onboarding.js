// ============================================
// ElektroHub – Interaktives Onboarding
// Ersteinrichtung + geführte Tour mit Beispieldaten
// ============================================

const Onboarding = {
  _step: 0,
  _totalSteps: 9,
  _data: {},

  async shouldShow() {
    const done = await db.getSetting('onboardingDone', false);
    const skipped = await db.getSetting('onboardingSkipped', false);
    return !done && !skipped;
  },

  async start() {
    this._step = 0;
    this._data = {};
    this._showStep();
  },

  async restart() {
    await db.setSetting('onboardingDone', false);
    await db.setSetting('onboardingSkipped', false);
    this.start();
  },

  async skip() {
    await db.setSetting('onboardingSkipped', true);
    this._restoreModal();
    closeModal();
    showToast('Du kannst die Einrichtung jederzeit unter Einstellungen wiederholen.');
  },

  _showStep() {
    const steps = [
      this._stepWelcome,
      this._stepCompany,
      this._stepBank,
      this._stepOptions,
      this._stepCustomerDemo,
      this._stepProjectDemo,
      this._stepCalcDemo,
      this._stepDocChain,
      this._stepDone,
    ];

    const stepFn = steps[this._step];
    if (!stepFn) return;

    const html = `
      <div class="onboarding">
        <div class="onboarding-progress">
          ${Array.from({ length: this._totalSteps }, (_, i) => `
            <div class="onboarding-dot ${i < this._step ? 'done' : ''} ${i === this._step ? 'active' : ''}"></div>
          `).join('<div class="onboarding-line"></div>')}
        </div>
        <div class="onboarding-content">
          ${stepFn.call(this)}
        </div>
        <div class="onboarding-nav">
          <div>
            ${this._step === 0 ? `<button class="btn btn-secondary" onclick="Onboarding.skip()">Überspringen</button>` : ''}
            ${this._step > 0 && this._step < this._totalSteps - 1 ? `<button class="btn btn-secondary" onclick="Onboarding._prev()">← Zurück</button>` : ''}
          </div>
          <div class="text-small text-muted" style="text-align:center;">Schritt ${this._step + 1} / ${this._totalSteps}</div>
          <div>
            ${this._step < this._totalSteps - 1
              ? `<button class="btn btn-primary btn-big" onclick="Onboarding._next()">Weiter →</button>`
              : `<button class="btn btn-primary btn-big" onclick="Onboarding._finish()">Los geht's!</button>`}
          </div>
        </div>
      </div>
    `;

    openModal('', html);
    const titleEl = document.getElementById('modal-title');
    const closeBtn = document.getElementById('modal-close');
    if (titleEl) titleEl.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'none';
  },

  _restoreModal() {
    const titleEl = document.getElementById('modal-title');
    const closeBtn = document.getElementById('modal-close');
    if (titleEl) titleEl.style.display = '';
    if (closeBtn) closeBtn.style.display = '';
  },

  // ══════════════════════════════════════════
  // SCHRITT 0: Willkommen
  // ══════════════════════════════════════════
  _stepWelcome() {
    return `
      <div style="text-align:center;padding:10px 0;">
        <div style="font-size:3.5rem;margin-bottom:12px;">⚡</div>
        <h2 style="font-size:1.5rem;margin-bottom:8px;">Willkommen bei ElektroHub</h2>
        <p style="color:var(--gray-500);font-size:0.95rem;line-height:1.6;max-width:440px;margin:0 auto 20px;">
          Wir richten jetzt gemeinsam alles ein und erstellen zusammen einen <strong>Beispielkunden mit Projekt und Angebot</strong> – damit du siehst, wie alles funktioniert.
        </p>
        <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
          <div class="onboarding-feature"><span>1</span> Firmendaten eintragen</div>
          <div class="onboarding-feature"><span>2</span> Bankdaten & Optionen</div>
          <div class="onboarding-feature"><span>3</span> Beispielkunde anlegen</div>
          <div class="onboarding-feature"><span>4</span> Projekt & Angebot erstellen</div>
        </div>
        <p style="color:var(--gray-400);font-size:0.82rem;margin-top:16px;">Dauert ca. 3 Minuten. Du kannst alles später ändern.</p>
      </div>
    `;
  },

  // ══════════════════════════════════════════
  // SCHRITT 1: Firmendaten
  // ══════════════════════════════════════════
  _stepCompany() {
    const d = this._data;
    return `
      <div>
        <h2 style="margin-bottom:4px;">Dein Betrieb</h2>
        <p class="text-muted mb-16">Diese Daten erscheinen auf all deinen Angeboten und Rechnungen – im Briefkopf und in der Fußzeile.</p>
        <div class="form-group">
          <label>Firmenname *</label>
          <input type="text" id="ob-companyName" value="${escapeHtml(d.companyName || '')}" placeholder="z.B. Elektro Müller GmbH" style="font-size:1.05rem;">
        </div>
        <div class="form-group">
          <label>Inhaber / Geschäftsführer</label>
          <input type="text" id="ob-companyOwner" value="${escapeHtml(d.companyOwner || '')}" placeholder="z.B. Max Müller">
        </div>
        <div class="form-group">
          <label>Adresse</label>
          <textarea id="ob-companyAddress" rows="2" placeholder="Musterstraße 12&#10;53111 Bonn">${escapeHtml(d.companyAddress || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Telefon</label>
            <input type="tel" id="ob-companyPhone" value="${escapeHtml(d.companyPhone || '')}" placeholder="0228 1234567">
          </div>
          <div class="form-group">
            <label>E-Mail</label>
            <input type="email" id="ob-companyEmail" value="${escapeHtml(d.companyEmail || '')}" placeholder="info@mein-betrieb.de">
          </div>
        </div>
        <div class="form-group">
          <label>Steuernummer</label>
          <input type="text" id="ob-taxNumber" value="${escapeHtml(d.taxNumber || '')}" placeholder="12/345/67890">
        </div>
      </div>
    `;
  },

  // ══════════════════════════════════════════
  // SCHRITT 2: Bankverbindung
  // ══════════════════════════════════════════
  _stepBank() {
    const d = this._data;
    return `
      <div>
        <h2 style="margin-bottom:4px;">Bankverbindung</h2>
        <p class="text-muted mb-16">Erscheint auf deinen Rechnungen. Aus der IBAN wird automatisch ein QR-Code generiert, den der Kunde mit seiner Banking-App scannen kann.</p>
        <div class="form-group">
          <label>IBAN</label>
          <input type="text" id="ob-bankIBAN" value="${escapeHtml(d.bankIBAN || '')}" placeholder="DE89 3704 0044 0532 0130 00" style="font-family:monospace;font-size:1.05rem;letter-spacing:1px;">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>BIC (optional)</label>
            <input type="text" id="ob-bankBIC" value="${escapeHtml(d.bankBIC || '')}" placeholder="COBADEFFXXX" style="font-family:monospace;">
          </div>
          <div class="form-group">
            <label>Bank</label>
            <input type="text" id="ob-bankName" value="${escapeHtml(d.bankName || '')}" placeholder="Sparkasse Bonn">
          </div>
        </div>
        <div class="info-box mt-8" style="font-size:0.88rem;">
          <strong>So funktioniert der QR-Code:</strong> Auf jeder Rechnung erscheint automatisch ein GiroCode. Dein Kunde scannt ihn → Banking-App öffnet sich → IBAN, Betrag und Verwendungszweck sind vorausgefüllt → ein Tipp auf „Senden" → fertig.
        </div>
      </div>
    `;
  },

  // ══════════════════════════════════════════
  // SCHRITT 3: Optionen
  // ══════════════════════════════════════════
  _stepOptions() {
    const d = this._data;
    return `
      <div>
        <h2 style="margin-bottom:4px;">Einstellungen</h2>
        <p class="text-muted mb-16">Alles kannst du später noch ändern.</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <label class="onboarding-toggle">
            <input type="checkbox" id="ob-kleinunternehmer" ${d.kleinunternehmer ? 'checked' : ''}>
            <div>
              <strong>Kleinunternehmer (§19 UStG)</strong>
              <p class="text-small text-muted">Keine MwSt. auf Rechnungen. Aktiviere das nur, wenn du Kleinunternehmer bist.</p>
            </div>
          </label>
          <label class="onboarding-toggle">
            <input type="checkbox" id="ob-showHandwerkerbonus" checked>
            <div>
              <strong>Handwerkerbonus (§35a EStG)</strong>
              <p class="text-small text-muted">Zeigt den Arbeitskosten-Anteil auf Rechnungen – Privatkunden können das steuerlich absetzen.</p>
            </div>
          </label>
          <label class="onboarding-toggle">
            <input type="checkbox" id="ob-showGewaehrleistung" checked>
            <div>
              <strong>Gewährleistungshinweis</strong>
              <p class="text-small text-muted">Hinweis auf die Gewährleistungsfrist auf Rechnungen.</p>
            </div>
          </label>
        </div>
        <div class="form-row mt-16">
          <div class="form-group">
            <label>Zahlungsziel</label>
            <input type="number" id="ob-paymentDays" value="${d.paymentDays || 14}" min="1">
            ${presetChips('ob-paymentDays', [7, 14, 21, 30], ' Tage')}
          </div>
          <div class="form-group">
            <label>Stundensatz Meister</label>
            <input type="number" id="ob-hourlyRate" value="${d.hourlyRate || 55}" min="0" step="0.5">
            ${presetChips('ob-hourlyRate', [45, 50, 55, 60, 65], ' €')}
          </div>
        </div>

        <!-- Skonto -->
        <div style="margin-top:16px;padding:16px;background:var(--gray-50);border-radius:10px;">
          <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
            <div>
              <strong>Skonto – Rabatt für schnelle Zahlung</strong>
              <p class="text-small text-muted" style="margin-top:2px;">Kunden die schnell zahlen, bekommen einen kleinen Rabatt. Das motiviert zur schnellen Zahlung und verbessert deinen Cashflow. Skonto erscheint auf Angeboten als Info und auf Rechnungen als konkreter Abzugsbetrag.</p>
            </div>
          </div>
          <label class="onboarding-toggle" style="margin-bottom:12px;">
            <input type="checkbox" id="ob-skontoEnabled" ${d.skontoEnabled !== false ? 'checked' : ''}>
            <div>
              <strong>Skonto standardmäßig anbieten</strong>
              <p class="text-small text-muted">Du kannst es trotzdem pro Beleg ein-/ausschalten</p>
            </div>
          </label>
          <div class="form-row">
            <div class="form-group">
              <label>Skonto-Prozent</label>
              <input type="number" id="ob-skontoRate" value="${d.skontoRate || 2}" min="0" step="0.5">
              ${presetChips('ob-skontoRate', [2, 3, 5], '%')}
            </div>
            <div class="form-group">
              <label>Skonto-Frist</label>
              <input type="number" id="ob-skontoFrist" value="${d.skontoFrist || 10}" min="1">
              ${presetChips('ob-skontoFrist', [7, 10, 14], ' Tage')}
            </div>
          </div>
          <div class="guide-tip" style="margin-top:8px;">
            <strong>Beispiel:</strong> Bei 2% Skonto und einer Rechnung über 5.000 € brutto spart der Kunde 100 € wenn er innerhalb von 10 Tagen zahlt.
          </div>
        </div>
      </div>
    `;
  },

  // ══════════════════════════════════════════
  // SCHRITT 4: Beispielkunde anlegen
  // ══════════════════════════════════════════
  _stepCustomerDemo() {
    const d = this._data;
    return `
      <div>
        <div class="info-box mb-16" style="background:#f0fdf4;border-color:#bbf7d0;color:#065f46;">
          <strong>Jetzt wird's praktisch!</strong> Wir erstellen zusammen einen Beispielkunden. Du kannst die Daten ändern oder die Vorschläge übernehmen.
        </div>
        <h2 style="margin-bottom:4px;">👥 Beispielkunde anlegen</h2>
        <p class="text-muted mb-16">So legst du später jeden Kunden an. Trag Testdaten ein oder nutze unsere Vorschläge.</p>
        <div class="form-row">
          <div class="form-group" style="flex:0 0 120px;">
            <label>Anrede</label>
            <select id="ob-custAnrede">
              <option value="">–</option>
              ${CUSTOMER_ANREDEN.map(a => `<option value="${a.value}" ${(d.custAnrede || 'Herr') === a.value ? 'selected' : ''}>${a.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Vorname</label>
            <input type="text" id="ob-custFirstName" value="${escapeHtml(d.custFirstName || 'Stephan')}">
          </div>
          <div class="form-group">
            <label>Nachname / Firma *</label>
            <input type="text" id="ob-custName" value="${escapeHtml(d.custName || 'Hoppenworth')}">
          </div>
        </div>
        <div class="form-group">
          <label>Typ</label>
          <select id="ob-custType">
            ${CUSTOMER_TYPES.map(t => `<option value="${t.value}" ${(d.custType || 'privat') === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Straße</label>
            <input type="text" id="ob-custStreet" value="${escapeHtml(d.custStreet || 'Am Sünderkamp')}">
          </div>
          <div class="form-group" style="flex:0 0 100px;">
            <label>Hausnr.</label>
            <input type="text" id="ob-custHouseNumber" value="${escapeHtml(d.custHouseNumber || '23B')}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:0 0 100px;">
            <label>PLZ</label>
            <input type="text" id="ob-custZip" value="${escapeHtml(d.custZip || '30629')}">
          </div>
          <div class="form-group">
            <label>Ort</label>
            <input type="text" id="ob-custCity" value="${escapeHtml(d.custCity || 'Hannover')}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Telefon</label>
            <input type="tel" id="ob-custPhone" value="${escapeHtml(d.custPhone || '')}">
          </div>
          <div class="form-group">
            <label>E-Mail</label>
            <input type="email" id="ob-custEmail" value="${escapeHtml(d.custEmail || 's.hoppi@gmx.de')}">
          </div>
        </div>
        <div class="guide-tip">So legst du später Kunden an: <strong>Kunden</strong> → <strong>+ Neuer Kunde</strong> → Daten eintragen → Speichern.</div>
      </div>
    `;
  },

  // ══════════════════════════════════════════
  // SCHRITT 5: Beispielprojekt anlegen
  // ══════════════════════════════════════════
  _stepProjectDemo() {
    const d = this._data;
    return `
      <div>
        <div class="info-box mb-16" style="background:#eff6ff;border-color:#93c5fd;color:#1e40af;">
          <strong>Schritt 2:</strong> Jetzt erstellen wir ein Projekt für den Kunden. Ein Projekt bündelt alles: Kalkulation, Angebot, Rechnung, Fotos.
        </div>
        <h2 style="margin-bottom:4px;">📋 Beispielprojekt</h2>
        <p class="text-muted mb-16">Wird dem Kunden „${escapeHtml([this._data.custFirstName, this._data.custName].filter(Boolean).join(' ') || 'Hoppenworth')}" zugeordnet.</p>
        <div class="form-group">
          <label>Projekttitel *</label>
          <input type="text" id="ob-projTitle" value="${escapeHtml(d.projTitle || `Elektroinstallation ${this._data.custStreet || ''} ${this._data.custHouseNumber || ''}`.trim() || 'Elektroinstallation Neubau')}" placeholder="z.B. Elektroinstallation Neubau" style="font-size:1.05rem;">
        </div>
        <div class="form-group">
          <label>Baustellen-Adresse</label>
          <input type="text" id="ob-projAddress" value="${escapeHtml(d.projAddress || `${this._data.custStreet || ''} ${this._data.custHouseNumber || ''}, ${this._data.custZip || ''} ${this._data.custCity || ''}`.replace(/^[\s,]+|[\s,]+$/g, '') || '')}">
        </div>
        <div class="form-group">
          <label>Beschreibung</label>
          <textarea id="ob-projNotes" rows="2" placeholder="z.B. Komplette Neuinstallation EG + OG">${escapeHtml(d.projNotes || 'Komplette Neuinstallation EG + OG.\nZählerschrank muss erneuert werden.')}</textarea>
        </div>
        <div class="guide-tip">Der <strong>Status</strong> startet immer bei „Anfrage". Auf der Projektseite siehst du dann einen Button für den nächsten Schritt (z.B. → Kalkulation → Beauftragt → In Arbeit...).</div>
      </div>
    `;
  },

  // ══════════════════════════════════════════
  // SCHRITT 6: Beispiel-Kalkulation & Angebot
  // ══════════════════════════════════════════
  _stepCalcDemo() {
    return `
      <div>
        <div class="info-box mb-16" style="background:#fef3c7;border-color:#fbbf24;color:#92400e;">
          <strong>Schritt 3:</strong> Wir erstellen eine Kalkulation mit typischen Elektro-Positionen und daraus ein Angebot.
        </div>
        <h2 style="margin-bottom:4px;">📄 Kalkulation & Angebot</h2>
        <p class="text-muted mb-16">Diese Positionen werden als Beispiel angelegt:</p>
        <div class="table-wrapper" style="max-height:260px;overflow-y:auto;">
          <table>
            <thead><tr><th>Pos.</th><th>Beschreibung</th><th>Menge</th><th class="text-right">Preis</th><th class="text-right">Gesamt</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>NYM-J 3×1,5mm² verlegen (UP)</td><td>80 m</td><td class="text-right">4,50 €</td><td class="text-right"><strong>360,00 €</strong></td></tr>
              <tr><td>2</td><td>NYM-J 5×2,5mm² verlegen (UP)</td><td>40 m</td><td class="text-right">6,80 €</td><td class="text-right"><strong>272,00 €</strong></td></tr>
              <tr><td>3</td><td>Steckdose setzen (UP), inkl. Dose & Rahmen</td><td>24 Stk</td><td class="text-right">38,00 €</td><td class="text-right"><strong>912,00 €</strong></td></tr>
              <tr><td>4</td><td>Lichtschalter setzen (UP)</td><td>12 Stk</td><td class="text-right">35,00 €</td><td class="text-right"><strong>420,00 €</strong></td></tr>
              <tr><td>5</td><td>Zählerschrank 3-reihig, inkl. Bestückung</td><td>1 Stk</td><td class="text-right">680,00 €</td><td class="text-right"><strong>680,00 €</strong></td></tr>
              <tr><td>6</td><td>Elektroinstallation (Arbeitszeit)</td><td>32 Std</td><td class="text-right">55,00 €</td><td class="text-right"><strong>1.760,00 €</strong></td></tr>
              <tr><td>7</td><td>Anfahrt (5 Tage)</td><td>5</td><td class="text-right">35,00 €</td><td class="text-right"><strong>175,00 €</strong></td></tr>
            </tbody>
            <tfoot>
              <tr style="font-weight:bold;border-top:2px solid var(--gray-300);">
                <td colspan="4">Netto</td><td class="text-right">4.579,00 €</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="guide-tip mt-8">So geht's später: Projekt öffnen → <strong>+ Neue Kalkulation</strong> → Positionen hinzufügen (manuell oder per 📋 Textbaustein) → Speichern → <strong>📄 Beleg</strong> klicken → Angebot wird erstellt.</div>
      </div>
    `;
  },

  // ══════════════════════════════════════════
  // SCHRITT 7: Dokumentenkette erklaeren
  // ══════════════════════════════════════════
  _stepDocChain() {
    return `
      <div>
        <h2 style="margin-bottom:4px;">📄 Der komplette Ablauf</h2>
        <p class="text-muted mb-16">Von der ersten Anfrage bis zur Rechnung – wir erstellen alle Schritte als Beispiel.</p>

        <div style="display:flex;flex-direction:column;gap:0;">
          <div style="display:flex;align-items:stretch;gap:12px;">
            <div style="display:flex;flex-direction:column;align-items:center;">
              <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.85rem;background:var(--gray-100);color:var(--gray-600);font-weight:600;">1</div>
              <div style="flex:1;width:2px;background:var(--gray-200);"></div>
            </div>
            <div style="flex:1;padding-bottom:16px;">
              <strong>Kostenvoranschlag</strong> <span style="color:var(--gray-400);font-size:0.8rem;">(optional)</span>
              <p class="text-small text-muted" style="margin-top:2px;">Der Kunde fragt: „Was würde das ungefähr kosten?" Du gibst eine <strong>Schätzung</strong> – die darf bis zu 20% vom Endpreis abweichen. Nicht jeder Auftrag braucht einen KV.</p>
            </div>
          </div>

          <div style="display:flex;align-items:stretch;gap:12px;">
            <div style="display:flex;flex-direction:column;align-items:center;">
              <div class="badge badge-blue" style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.85rem;">2</div>
              <div style="flex:1;width:2px;background:var(--gray-200);"></div>
            </div>
            <div style="flex:1;padding-bottom:16px;">
              <strong>Angebot</strong>
              <p class="text-small text-muted" style="margin-top:2px;">Der Kunde will es genau wissen → du erstellst ein <strong>verbindliches Angebot</strong> mit festem Preis. Gültig 30 Tage. ${this._data.skontoEnabled ? 'Das Angebot zeigt dem Kunden auch die <strong>Skonto-Konditionen</strong> – z.B. „2% Skonto bei Zahlung innerhalb von 10 Tagen".' : 'Im Schlusstext stehen deine Zahlungsbedingungen.'}</p>
            </div>
          </div>

          <div style="display:flex;align-items:stretch;gap:12px;">
            <div style="display:flex;flex-direction:column;align-items:center;">
              <div class="badge badge-green" style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.85rem;">3</div>
              <div style="flex:1;width:2px;background:var(--gray-200);"></div>
            </div>
            <div style="flex:1;padding-bottom:16px;">
              <strong>Auftragsbestätigung</strong>
              <p class="text-small text-muted" style="margin-top:2px;">Kunde sagt „ja, machen wir" → du klickst im Angebot auf <strong>„Auftragsbestätigung erstellen"</strong>. Bestätigt den Auftrag offiziell.</p>
            </div>
          </div>

          <div style="display:flex;align-items:stretch;gap:12px;">
            <div style="display:flex;flex-direction:column;align-items:center;">
              <div class="badge badge-green" style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.85rem;">4</div>
              <div style="flex:1;width:2px;background:var(--gray-200);"></div>
            </div>
            <div style="flex:1;padding-bottom:16px;">
              <strong>Arbeit erledigen</strong>
              <p class="text-small text-muted" style="margin-top:2px;">Du machst die Arbeit. Im Projekt verfolgst du den Status: In Arbeit → Abnahme.</p>
            </div>
          </div>

          <div style="display:flex;align-items:stretch;gap:12px;">
            <div style="display:flex;flex-direction:column;align-items:center;">
              <div class="badge badge-green" style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.85rem;">5</div>
            </div>
            <div style="flex:1;padding-bottom:8px;">
              <strong>Rechnung</strong>
              <p class="text-small text-muted" style="margin-top:2px;">Arbeit fertig → Klick auf <strong>„Rechnung erstellen"</strong>. Die Rechnung hat Fälligkeitsdatum, Bankdaten und QR-Code. ${this._data.skontoEnabled ? '<strong>Skonto wird automatisch übernommen</strong> – der Kunde sieht den konkreten Abzugsbetrag und das Skonto-Datum.' : 'Hier kannst du auch Skonto vergeben.'}</p>
            </div>
          </div>
        </div>

        <div class="info-box mt-12" style="font-size:0.85rem;">
          <strong>Was wird jetzt erstellt:</strong> Kostenvoranschlag → Angebot → Auftragsbestätigung → Rechnung. Alle verknüpft als Kette. In der Belege-Übersicht siehst du sie zusammen.
        </div>
      </div>
    `;
  },

  // ══════════════════════════════════════════
  // SCHRITT 8: Fertig
  // ══════════════════════════════════════════
  _stepDone() {
    const custName = [this._data.custFirstName, this._data.custName].filter(Boolean).join(' ') || 'Stephan Hoppenworth';
    const projTitle = this._data.projTitle || 'Elektroinstallation Neubau';
    return `
      <div style="text-align:center;padding:10px 0;">
        <div style="font-size:3.5rem;margin-bottom:12px;">🎉</div>
        <h2 style="font-size:1.5rem;margin-bottom:8px;">Alles eingerichtet!</h2>
        <p style="color:var(--gray-500);font-size:0.95rem;line-height:1.6;max-width:440px;margin:0 auto 16px;">
          Dein Betrieb ist startklar. Wir haben einen kompletten Beispiel-Ablauf erstellt:
        </p>
        <div style="background:var(--gray-50);border-radius:12px;padding:20px;max-width:440px;margin:0 auto;text-align:left;">
          <div style="display:flex;flex-direction:column;gap:8px;font-size:0.88rem;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="badge badge-green" style="min-width:22px;text-align:center;">✓</span>
              <span>Firmendaten & Bankverbindung</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="badge badge-green" style="min-width:22px;text-align:center;">✓</span>
              <span><strong>Kunde:</strong> ${escapeHtml(custName)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="badge badge-green" style="min-width:22px;text-align:center;">✓</span>
              <span><strong>Projekt:</strong> ${escapeHtml(projTitle)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="badge badge-green" style="min-width:22px;text-align:center;">✓</span>
              <span><strong>Kalkulation</strong> mit 7 Positionen (4.579 € netto)</span>
            </div>
            <div style="padding-left:32px;border-left:2px solid var(--gray-200);margin-left:10px;display:flex;flex-direction:column;gap:6px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="badge doctype-kostenvoranschlag" style="font-size:0.7rem;">1</span>
                Kostenvoranschlag (Gesendet)
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="badge doctype-angebot" style="font-size:0.7rem;">2</span>
                Angebot (Gesendet)
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="badge doctype-auftragsbestaetigung" style="font-size:0.7rem;">3</span>
                Auftragsbestätigung (Gesendet)
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="badge doctype-rechnung" style="font-size:0.7rem;">4</span>
                Rechnung (Offen, fällig in ${this._data.paymentDays || 14} Tagen)
              </div>
            </div>
          </div>
        </div>
        <div style="margin-top:16px;padding:14px 16px;background:var(--primary-light);border-radius:10px;max-width:440px;margin-left:auto;margin-right:auto;text-align:left;">
          <div style="font-weight:600;color:var(--primary-dark);margin-bottom:6px;">Schau dir jetzt an:</div>
          <ul style="margin:0 0 0 16px;color:var(--primary-dark);font-size:0.88rem;line-height:1.7;">
            <li>Das <strong>Projekt</strong> mit allen Dokumenten</li>
            <li>Die <strong>Belege-Liste</strong> mit der gruppierter Kette</li>
            <li>Die <strong>Rechnungs-Vorschau</strong> mit QR-Code und Zahlungsbedingungen</li>
          </ul>
        </div>
      </div>
    `;
  },

  // ══════════════════════════════════════════
  // Navigation
  // ══════════════════════════════════════════
  _collectData() {
    switch (this._step) {
      case 1:
        this._data.companyName = document.getElementById('ob-companyName')?.value || '';
        this._data.companyOwner = document.getElementById('ob-companyOwner')?.value || '';
        this._data.companyAddress = document.getElementById('ob-companyAddress')?.value || '';
        this._data.companyPhone = document.getElementById('ob-companyPhone')?.value || '';
        this._data.companyEmail = document.getElementById('ob-companyEmail')?.value || '';
        this._data.taxNumber = document.getElementById('ob-taxNumber')?.value || '';
        break;
      case 2:
        this._data.bankIBAN = document.getElementById('ob-bankIBAN')?.value || '';
        this._data.bankBIC = document.getElementById('ob-bankBIC')?.value || '';
        this._data.bankName = document.getElementById('ob-bankName')?.value || '';
        break;
      case 3:
        this._data.kleinunternehmer = document.getElementById('ob-kleinunternehmer')?.checked || false;
        this._data.showHandwerkerbonus = document.getElementById('ob-showHandwerkerbonus')?.checked || false;
        this._data.showGewaehrleistung = document.getElementById('ob-showGewaehrleistung')?.checked || false;
        this._data.paymentDays = parseInt(document.getElementById('ob-paymentDays')?.value) || 14;
        this._data.hourlyRate = parseFloat(document.getElementById('ob-hourlyRate')?.value) || 55;
        this._data.skontoEnabled = document.getElementById('ob-skontoEnabled')?.checked || false;
        this._data.skontoRate = parseFloat(document.getElementById('ob-skontoRate')?.value) || 2;
        this._data.skontoFrist = parseInt(document.getElementById('ob-skontoFrist')?.value) || 10;
        break;
      case 4:
        this._data.custAnrede = document.getElementById('ob-custAnrede')?.value || '';
        this._data.custFirstName = document.getElementById('ob-custFirstName')?.value || '';
        this._data.custName = document.getElementById('ob-custName')?.value || 'Hoppenworth';
        this._data.custType = document.getElementById('ob-custType')?.value || 'privat';
        this._data.custStreet = document.getElementById('ob-custStreet')?.value || '';
        this._data.custHouseNumber = document.getElementById('ob-custHouseNumber')?.value || '';
        this._data.custZip = document.getElementById('ob-custZip')?.value || '';
        this._data.custCity = document.getElementById('ob-custCity')?.value || '';
        this._data.custPhone = document.getElementById('ob-custPhone')?.value || '';
        this._data.custEmail = document.getElementById('ob-custEmail')?.value || '';
        break;
      case 5:
        this._data.projTitle = document.getElementById('ob-projTitle')?.value || 'Elektroinstallation Neubau';
        this._data.projAddress = document.getElementById('ob-projAddress')?.value || '';
        this._data.projNotes = document.getElementById('ob-projNotes')?.value || '';
        break;
    }
  },

  _next() {
    this._collectData();
    if (this._step < this._totalSteps - 1) {
      this._step++;
      this._showStep();
    }
  },

  _prev() {
    this._collectData();
    if (this._step > 0) {
      this._step--;
      this._showStep();
    }
  },

  async _finish() {
    const d = this._data;

    // ── Firmendaten speichern ──
    const settingsMap = {
      companyName: d.companyName, companyOwner: d.companyOwner,
      companyAddress: d.companyAddress, companyPhone: d.companyPhone,
      companyEmail: d.companyEmail, taxNumber: d.taxNumber,
      bankIBAN: d.bankIBAN, bankBIC: d.bankBIC, bankName: d.bankName,
      kleinunternehmer: d.kleinunternehmer || false,
      showHandwerkerbonus: d.showHandwerkerbonus || false,
      showGewaehrleistung: d.showGewaehrleistung || false,
      defaultPaymentDays: d.paymentDays || 14,
      defaultHourlyRateMeister: d.hourlyRate || 55,
      skontoRate: d.skontoRate || 2,
      skontoFrist: d.skontoFrist || 10,
    };
    for (const [key, val] of Object.entries(settingsMap)) {
      if (val !== undefined && val !== '') await db.setSetting(key, val);
    }
    if (d.kleinunternehmer) await loadMwstRate();

    // ── Beispielkunde anlegen ──
    const allCust = await db.getAll(STORES.customers);
    const custId = generateId();
    const customer = {
      id: custId,
      customerId: generateCustomerId(allCust.length + 1),
      anrede: d.custAnrede || 'Herr',
      firstName: d.custFirstName || 'Stephan',
      name: d.custName || 'Hoppenworth',
      type: d.custType || 'privat',
      street: d.custStreet || 'Am Sünderkamp',
      houseNumber: d.custHouseNumber || '23B',
      zip: d.custZip || '30629',
      city: d.custCity || 'Hannover',
      country: 'Deutschland',
      phone: d.custPhone || '',
      email: d.custEmail || 's.hoppi@gmx.de',
      contact: '',
      notes: 'Erstellt im Onboarding',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    customer.address = getFormattedAddress(customer);
    await db.put(STORES.customers, customer);

    // ── Beispielprojekt anlegen ──
    const allProj = await db.getAll(STORES.projects);
    const projId = generateId();
    const projAddr = d.projAddress || `${customer.street || ''} ${customer.houseNumber || ''}, ${customer.zip || ''} ${customer.city || ''}`.trim().replace(/^,\s*/, '');
    const project = {
      id: projId,
      projectId: generateProjectId(allProj.length + 1),
      title: d.projTitle || `Elektroinstallation ${customer.street || 'Neubau'} ${customer.houseNumber || ''}`.trim(),
      customerId: custId,
      status: 'kalkulation',
      address: projAddr,
      startDate: todayISO(),
      description: d.projNotes || 'Komplette Neuinstallation EG + OG.\nZählerschrank muss erneuert werden.',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.put(STORES.projects, project);

    // ── Beispiel-Kalkulation anlegen ──
    const hourlyRate = d.hourlyRate || 55;
    const mwst = d.kleinunternehmer ? 0 : 19;
    const positions = [
      { type: 'material', description: 'NYM-J 3×1,5mm² verlegen (UP), inkl. Schlitz', quantity: 80, unit: 'Meter', unitPrice: 4.50, mwstRate: mwst, discount: 0, total: M.mul(80, 4.50), cost: M.mul(M.mul(80, 4.50), 0.7) },
      { type: 'material', description: 'NYM-J 5×2,5mm² verlegen (UP)', quantity: 40, unit: 'Meter', unitPrice: 6.80, mwstRate: mwst, discount: 0, total: M.mul(40, 6.80), cost: M.mul(M.mul(40, 6.80), 0.7) },
      { type: 'material', description: 'Steckdose setzen (UP), inkl. Dose, Rahmen, Einsatz', quantity: 24, unit: 'Stück', unitPrice: 38, mwstRate: mwst, discount: 0, total: M.mul(24, 38), cost: M.mul(M.mul(24, 38), 0.7) },
      { type: 'material', description: 'Lichtschalter setzen (UP)', quantity: 12, unit: 'Stück', unitPrice: 35, mwstRate: mwst, discount: 0, total: M.mul(12, 35), cost: M.mul(M.mul(12, 35), 0.7) },
      { type: 'material', description: 'Zählerschrank 3-reihig, inkl. Bestückung', quantity: 1, unit: 'Stück', unitPrice: 680, mwstRate: mwst, discount: 0, total: 680, cost: 476 },
      { type: 'stunden', description: 'Meister – Elektroinstallation', quantity: 24, unit: 'Stunde', unitPrice: hourlyRate, mwstRate: mwst, discount: 0, total: M.mul(24, hourlyRate), cost: 0 },
      { type: 'stunden_geselle', description: 'Geselle – Montage und Verkabelung', quantity: 32, unit: 'Stunde', unitPrice: 45, mwstRate: mwst, discount: 0, total: M.mul(32, 45), cost: 0 },
      { type: 'nebenkosten', description: 'Anfahrtspauschale', quantity: 5, unit: 'Pauschal', unitPrice: 35, mwstRate: mwst, discount: 0, total: M.mul(5, 35), cost: 0 },
    ];
    const totalNet = M.sum(positions.map(p => p.total));
    const totalCost = M.sum(positions.map(p => p.cost || 0));

    const calcId = generateId();
    await db.put(STORES.calculations, {
      id: calcId,
      projectId: projId,
      title: 'Hauptkalkulation',
      positions,
      totalNet,
      totalCost,
      createdAt: new Date().toISOString(),
    });

    // ── Komplette Dokumentenkette erstellen ──
    const isKU = d.kleinunternehmer || false;
    // Brutto berechnen per-Position MwSt (konsistent mit Validator)
    let totalGross;
    if (isKU) {
      totalGross = totalNet;
    } else {
      const taxByRate = {};
      positions.forEach(p => {
        const rate = p.mwstRate != null ? p.mwstRate : 19;
        taxByRate[rate] = (taxByRate[rate] || 0) + (p.total || 0) * (rate / 100);
      });
      const totalTax = Object.values(taxByRate).reduce((s, v) => s + v, 0);
      totalGross = M.add(totalNet, totalTax);
    }
    const paymentDays = d.paymentDays || 14;

    const posData = positions.map(p => ({
      description: p.description, quantity: p.quantity, unit: p.unit || 'Stück',
      unitPrice: p.unitPrice, mwstRate: p.mwstRate != null ? p.mwstRate : 19,
      discount: p.discount || 0, total: p.total, type: p.type,
    }));

    const baseDoc = {
      projectId: projId,
      projectTitle: project.title,
      customerName: getCustomerDisplayName(customer),
      customerAddress: customer.address,
      positions: posData,
      totalNet,
      totalGross,
      kleinunternehmer: isKU,
      skontoEnabled: d.skontoEnabled || false,
      skontoRate: d.skontoRate || 2,
      skontoFrist: d.skontoFrist || 10,
      notes: '',
    };

    // 1. Kostenvoranschlag (erste Schätzung)
    const kvId = generateId();
    const kvNum = await db.getNextNumber('kostenvoranschlag');
    await db.put(STORES.invoices, {
      ...baseDoc, id: kvId, number: kvNum, type: 'kostenvoranschlag',
      status: 'gesendet', date: todayISO(), dueDate: calcDueDate(todayISO(), 30),
      createdAt: new Date().toISOString(),
    });

    // 2. Angebot (verbindlicher Preis, basiert auf KV)
    const agId = generateId();
    const agNum = await db.getNextNumber('angebot');
    await db.put(STORES.invoices, {
      ...baseDoc, id: agId, number: agNum, type: 'angebot',
      status: 'gesendet', date: todayISO(), dueDate: calcDueDate(todayISO(), 30),
      basedOnId: kvId,
      createdAt: new Date().toISOString(),
    });

    // 3. Auftragsbestätigung (Kunde hat zugesagt)
    const abId = generateId();
    const abNum = await db.getNextNumber('auftragsbestaetigung');
    await db.put(STORES.invoices, {
      ...baseDoc, id: abId, number: abNum, type: 'auftragsbestaetigung',
      status: 'gesendet', date: todayISO(), dueDate: null,
      basedOnId: agId,
      createdAt: new Date().toISOString(),
    });

    // 4. Rechnung (Arbeit erledigt)
    const reId = generateId();
    const reNum = await db.getNextNumber('rechnung');
    await db.put(STORES.invoices, {
      ...baseDoc, id: reId, number: reNum, type: 'rechnung',
      status: 'offen', date: todayISO(), dueDate: calcDueDate(todayISO(), paymentDays),
      basedOnId: abId,
      serviceFrom: todayISO(), serviceTo: todayISO(),
      createdAt: new Date().toISOString(),
    });

    // Projektstatus auf "abgerechnet" setzen
    project.status = 'abgerechnet';
    project.updatedAt = new Date().toISOString();
    await db.put(STORES.projects, project);

    // ── Fertig ──
    await db.setSetting('onboardingDone', true);
    await db.setSetting('onboardingSkipped', false);

    this._restoreModal();
    closeModal();
    await app.updateModuleVisibility();
    showToast('Einrichtung abgeschlossen! Beispieldaten wurden erstellt.');
    app.navigate('projects', projId);
  }
};
