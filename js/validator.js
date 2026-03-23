// ============================================
// ElektroHub – Berechnungs-Validator & Smarte Hinweise
// ============================================

const Validator = {

  // ===== Berechnung eines einzelnen Belegs prüfen =====
  checkInvoice(invoice, isKU, mwstRate) {
    const errors = [];
    const positions = invoice.positions || [];

    // 1. Positionen-Summen prüfen (supports discount per position)
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const discountFactor = 1 - ((pos.discount || 0) / 100);
      const expected = Math.round((pos.quantity || 0) * (pos.unitPrice || 0) * discountFactor * 100) / 100;
      const actual = Math.round((pos.total || 0) * 100) / 100;
      if (Math.abs(expected - actual) > 0.01) {
        errors.push({
          type: 'position_total',
          severity: 'error',
          message: `Position ${i + 1} "${pos.description || '?'}": Menge × Preis${pos.discount ? ' × Rabatt' : ''} = ${expected.toFixed(2)} €, gespeichert: ${actual.toFixed(2)} €`,
          fix: { posIndex: i, field: 'total', correctValue: expected }
        });
      }
    }

    // 2. Netto-Summe prüfen
    const recalcNet = Math.round(positions.reduce((s, p) => {
      const df = 1 - ((p.discount || 0) / 100);
      return s + (p.quantity || 0) * (p.unitPrice || 0) * df;
    }, 0) * 100) / 100;
    const storedNet = Math.round((invoice.totalNet || 0) * 100) / 100;
    if (Math.abs(recalcNet - storedNet) > 0.01) {
      errors.push({
        type: 'total_net',
        severity: 'error',
        message: `Netto-Summe: berechnet ${recalcNet.toFixed(2)} €, gespeichert ${storedNet.toFixed(2)} €`,
        fix: { field: 'totalNet', correctValue: recalcNet }
      });
    }

    // 3. Brutto-Summe prüfen (supports mixed MwSt rates per position)
    let expectedGross;
    if (isKU) {
      expectedGross = recalcNet;
    } else {
      // Group tax by per-position mwstRate (default to global mwstRate for backward compat)
      const taxByRate = {};
      positions.forEach(p => {
        const df = 1 - ((p.discount || 0) / 100);
        const posNet = (p.quantity || 0) * (p.unitPrice || 0) * df;
        const rate = p.mwstRate != null ? p.mwstRate : (mwstRate * 100);
        taxByRate[rate] = (taxByRate[rate] || 0) + posNet * (rate / 100);
      });
      const totalTax = Object.values(taxByRate).reduce((s, v) => s + v, 0);
      expectedGross = Math.round((recalcNet + totalTax) * 100) / 100;
    }
    const storedGross = Math.round((invoice.totalGross || 0) * 100) / 100;
    if (Math.abs(expectedGross - storedGross) > 0.01) {
      errors.push({
        type: 'total_gross',
        severity: 'warning',
        message: `Brutto-Summe: erwartet ${expectedGross.toFixed(2)} €, gespeichert ${storedGross.toFixed(2)} €`,
        fix: { field: 'totalGross', correctValue: expectedGross }
      });
    }

    // 4. Skonto-Logik prüfen
    if (invoice.skontoEnabled) {
      if (!invoice.skontoRate || invoice.skontoRate <= 0) {
        errors.push({
          type: 'skonto',
          severity: 'warning',
          message: `Skonto ist aktiviert, aber der Skontosatz ist 0% oder nicht gesetzt.`,
        });
      }
      if (!invoice.skontoFrist || invoice.skontoFrist <= 0) {
        errors.push({
          type: 'skonto',
          severity: 'warning',
          message: `Skonto ist aktiviert, aber die Skontofrist ist nicht gesetzt.`,
        });
      }
    }

    return errors;
  },

  // ===== Alle Belege prüfen =====
  async checkAllInvoices() {
    const invoices = await db.getAll(STORES.invoices);
    const isKU = await isKleinunternehmer();
    const results = [];

    for (const inv of invoices) {
      const errors = this.checkInvoice(inv, isKU, MWST_RATE);
      if (errors.length > 0) {
        results.push({ invoice: inv, errors });
      }
    }
    return results;
  },

  // ===== Beleg reparieren =====
  async fixInvoice(invoiceId) {
    const invoice = await db.get(STORES.invoices, invoiceId);
    if (!invoice) return null;
    const isKU = await isKleinunternehmer();
    let changed = false;

    // Positionen-Summen korrigieren (supports discount)
    (invoice.positions || []).forEach(pos => {
      const discountFactor = 1 - ((pos.discount || 0) / 100);
      const correct = Math.round((pos.quantity || 0) * (pos.unitPrice || 0) * discountFactor * 100) / 100;
      if (Math.abs((pos.total || 0) - correct) > 0.01) {
        pos.total = correct;
        changed = true;
      }
    });

    // Netto neu berechnen
    const correctNet = Math.round((invoice.positions || []).reduce((s, p) => s + (p.total || 0), 0) * 100) / 100;
    if (Math.abs((invoice.totalNet || 0) - correctNet) > 0.01) {
      invoice.totalNet = correctNet;
      changed = true;
    }

    // Brutto neu berechnen (supports mixed MwSt rates)
    let correctGross;
    if (isKU) {
      correctGross = correctNet;
    } else {
      const taxByRate = {};
      (invoice.positions || []).forEach(p => {
        const rate = p.mwstRate != null ? p.mwstRate : Math.round(MWST_RATE * 100);
        taxByRate[rate] = (taxByRate[rate] || 0) + (p.total || 0) * (rate / 100);
      });
      const totalTax = Object.values(taxByRate).reduce((s, v) => s + v, 0);
      correctGross = Math.round((correctNet + totalTax) * 100) / 100;
    }
    if (Math.abs((invoice.totalGross || 0) - correctGross) > 0.01) {
      invoice.totalGross = correctGross;
      changed = true;
    }

    if (changed) {
      invoice.updatedAt = new Date().toISOString();
      await db.put(STORES.invoices, invoice);
    }
    return { changed, invoice };
  },

  // ===== Alle reparieren =====
  async fixAllInvoices() {
    const results = await this.checkAllInvoices();
    let fixedCount = 0;
    let skippedCount = 0;

    for (const r of results) {
      // Nur Entwürfe automatisch reparieren
      if (r.invoice.status === 'entwurf') {
        const fix = await this.fixInvoice(r.invoice.id);
        if (fix && fix.changed) fixedCount++;
      } else {
        skippedCount++;
      }
    }
    return { total: results.length, fixed: fixedCount, skipped: skippedCount };
  },

  // ===== Smarte Hinweise für Dashboard =====
  async getSmartHints() {
    const hints = [];

    // --- Firmendaten prüfen ---
    const companyName = await db.getSetting('companyName', '');
    const companyAddress = await db.getSetting('companyAddress', '');
    const taxNumber = await db.getSetting('taxNumber', '');
    const bankIBAN = await db.getSetting('bankIBAN', '');
    const ustId = await db.getSetting('ustId', '');
    const isKU = await db.getSetting('kleinunternehmer', false);
    const companyLogo = await db.getSetting('companyLogo', '');

    if (!companyName) {
      hints.push({ icon: '⚠️', severity: 'warning', text: 'Firmenname ist nicht eingetragen.', action: 'Einstellungen öffnen', view: 'settings' });
    }
    if (!companyAddress) {
      hints.push({ icon: '⚠️', severity: 'warning', text: 'Firmenadresse fehlt – wird auf Belegen benötigt.', action: 'Einstellungen öffnen', view: 'settings' });
    }
    if (!taxNumber && !ustId) {
      hints.push({ icon: '⚠️', severity: 'warning', text: 'Weder Steuernummer noch USt-ID eingetragen.', action: 'Einstellungen öffnen', view: 'settings' });
    }
    if (!bankIBAN) {
      hints.push({ icon: '💳', severity: 'info', text: 'Keine IBAN hinterlegt – QR-Code auf Rechnungen nicht möglich.', action: 'Bankdaten eintragen', view: 'settings' });
    }
    if (!companyLogo) {
      hints.push({ icon: '🖼️', severity: 'info', text: 'Kein Firmenlogo hochgeladen.', action: 'Logo hochladen', view: 'settings' });
    }

    // --- Kleinunternehmer-Sicherheitschecks ---
    if (isKU && ustId) {
      hints.push({ icon: '❗', severity: 'error', text: 'Kleinunternehmer ist aktiv, aber eine USt-ID ist eingetragen. Kleinunternehmer haben in der Regel keine USt-ID – bitte prüfen.', action: 'Einstellungen prüfen', view: 'settings' });
    }
    if (isKU) {
      hints.push({ icon: 'ℹ️', severity: 'info', text: 'Kleinunternehmer (§19 UStG) aktiv – keine MwSt. auf Belegen.' });

      // Prüfe ob Belege existieren die NICHT als KU markiert sind (Widerspruch)
      const allInv = await db.getAll(STORES.invoices);
      const mismatchInv = allInv.filter(i =>
        i.status === 'entwurf' &&
        i.kleinunternehmer !== true &&
        i.totalNet > 0 &&
        Math.abs((i.totalGross || 0) - (i.totalNet || 0)) > 0.01
      );
      if (mismatchInv.length > 0) {
        hints.push({ icon: '⚠️', severity: 'warning', text: `${mismatchInv.length} Entwurf/Entwürfe enthalten noch MwSt., obwohl Kleinunternehmer aktiv ist.`, action: 'Automatisch korrigieren', fixAction: 'fixAll' });
      }
    }
    if (!isKU) {
      // Prüfe ob Belege existieren die als KU markiert sind (Widerspruch)
      const allInv2 = await db.getAll(STORES.invoices);
      const kuMismatch = allInv2.filter(i =>
        i.status === 'entwurf' &&
        i.kleinunternehmer === true &&
        i.totalNet > 0 &&
        Math.abs((i.totalGross || 0) - (i.totalNet || 0)) < 0.01
      );
      if (kuMismatch.length > 0) {
        hints.push({ icon: '⚠️', severity: 'warning', text: `${kuMismatch.length} Entwurf/Entwürfe sind als Kleinunternehmer markiert, aber Regelbesteuerung ist aktiv.`, action: 'Automatisch korrigieren', fixAction: 'fixAll' });
      }
    }

    // --- Überfällige Rechnungen automatisch markieren ---
    const invoices = await db.getAll(STORES.invoices);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let overdueCount = 0;
    let autoUpdated = 0;

    for (const inv of invoices) {
      if (INVOICE_LIKE_TYPES.includes(inv.type) && ['offen', 'gesendet'].includes(inv.status) && inv.dueDate) {
        const due = new Date(inv.dueDate);
        due.setHours(0, 0, 0, 0);
        if (today > due) {
          overdueCount++;
          // Automatisch auf überfällig setzen
          if (inv.status !== 'ueberfaellig') {
            inv.status = 'ueberfaellig';
            inv.updatedAt = new Date().toISOString();
            await db.put(STORES.invoices, inv);
            autoUpdated++;
          }
        }
      }
    }

    if (overdueCount > 0) {
      hints.push({ icon: '🔴', severity: 'error', text: `${overdueCount} Rechnung(en) überfällig!`, action: 'Offene Posten anzeigen', view: 'statistics' });
    }
    if (autoUpdated > 0) {
      hints.push({ icon: '🔄', severity: 'info', text: `${autoUpdated} Rechnung(en) automatisch als "überfällig" markiert.` });
    }

    // --- Belege ohne Fälligkeitsdatum ---
    const noDueDate = invoices.filter(i =>
      INVOICE_LIKE_TYPES.includes(i.type) &&
      ['offen', 'gesendet', 'entwurf'].includes(i.status) &&
      !i.dueDate
    );
    if (noDueDate.length > 0) {
      hints.push({ icon: '📅', severity: 'warning', text: `${noDueDate.length} offene Rechnung(en) ohne Fälligkeitsdatum.`, action: 'Belege prüfen', view: 'invoices' });
    }

    // --- Bald fällige Rechnungen (in den nächsten 3 Tagen) ---
    const soonDue = invoices.filter(inv => {
      if (!INVOICE_LIKE_TYPES.includes(inv.type)) return false;
      if (!['offen', 'gesendet'].includes(inv.status)) return false;
      if (!inv.dueDate) return false;
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((due - today) / 86400000);
      return diffDays >= 0 && diffDays <= 3;
    });
    for (const inv of soonDue) {
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((due - today) / 86400000);
      const dringend = diffDays === 0 ? 'HEUTE fällig' : diffDays === 1 ? 'morgen fällig' : `in ${diffDays} Tagen fällig`;
      hints.push({
        icon: '⏰',
        severity: 'warning',
        text: `${inv.number} (${formatCurrency(inv.totalGross)}) – ${dringend}! Kunde: ${inv.customerName || '–'}`,
        action: 'Rechnung öffnen',
        invoiceId: inv.id,
      });
    }

    // --- Mahnung-Vorschläge für überfällige Rechnungen ---
    const allDocs = invoices; // already loaded
    for (const inv of invoices) {
      if (!INVOICE_LIKE_TYPES.includes(inv.type)) continue;
      if (inv.status !== 'ueberfaellig') continue;
      if (!inv.dueDate) continue;

      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      const overdueDays = Math.floor((today - due) / 86400000);

      // Prüfe welche Mahnungen schon existieren
      const existingMahnungen = allDocs.filter(d =>
        ['mahnung1', 'mahnung2', 'mahnung3'].includes(d.type) && d.basedOnId === inv.id
      );
      const hasMahnung1 = existingMahnungen.some(m => m.type === 'mahnung1');
      const hasMahnung2 = existingMahnungen.some(m => m.type === 'mahnung2');
      const hasMahnung3 = existingMahnungen.some(m => m.type === 'mahnung3');

      // Letzte Mahnung-Datum
      const lastMahnungDate = existingMahnungen.length > 0
        ? new Date(Math.max(...existingMahnungen.map(m => new Date(m.createdAt || m.date).getTime())))
        : null;
      const daysSinceLastMahnung = lastMahnungDate
        ? Math.floor((today - lastMahnungDate) / 86400000)
        : overdueDays;

      if (!hasMahnung1 && overdueDays >= 1) {
        hints.push({
          icon: '📨',
          severity: 'error',
          text: `${inv.number} ist ${overdueDays} Tage überfällig (${formatCurrency(inv.totalGross)}). Zahlungserinnerung senden!`,
          action: 'Mahnung erstellen',
          invoiceId: inv.id,
          mahnAction: true,
        });
      } else if (hasMahnung1 && !hasMahnung2 && daysSinceLastMahnung >= 7) {
        hints.push({
          icon: '📨',
          severity: 'error',
          text: `${inv.number}: 1. Mahnung vor ${daysSinceLastMahnung} Tagen – jetzt 2. Mahnung senden? (${formatCurrency(inv.totalGross)})`,
          action: '2. Mahnung erstellen',
          invoiceId: inv.id,
          mahnAction: true,
        });
      } else if (hasMahnung2 && !hasMahnung3 && daysSinceLastMahnung >= 7) {
        hints.push({
          icon: '🔴',
          severity: 'error',
          text: `${inv.number}: 2. Mahnung vor ${daysSinceLastMahnung} Tagen – letzte Mahnung senden? (${formatCurrency(inv.totalGross)})`,
          action: 'Letzte Mahnung',
          invoiceId: inv.id,
          mahnAction: true,
        });
      } else if (hasMahnung3 && daysSinceLastMahnung >= 14) {
        hints.push({
          icon: '⚖️',
          severity: 'error',
          text: `${inv.number}: Letzte Mahnung vor ${daysSinceLastMahnung} Tagen ohne Reaktion. Inkasso/Anwalt einschalten? (${formatCurrency(inv.totalGross)})`,
        });
      }
    }

    // --- Entwürfe die bereit zum Versenden sind ---
    const readyDrafts = invoices.filter(i =>
      i.status === 'entwurf' &&
      i.customerName &&
      i.positions && i.positions.length > 0 &&
      i.totalNet > 0
    );
    if (readyDrafts.length > 0) {
      for (const inv of readyDrafts.slice(0, 3)) {
        const dt = getDocType(inv.type);
        hints.push({
          icon: '📤',
          severity: 'info',
          text: `${dt.label} ${inv.number} (${formatCurrency(inv.totalGross)}) ist fertig – noch als Entwurf. Versenden?`,
          action: 'Beleg öffnen',
          invoiceId: inv.id,
        });
      }
    }

    // --- Pflichtangaben auf Belegen prüfen (§14 UStG) ---
    const draftInvoices = invoices.filter(i => i.status === 'entwurf');
    for (const inv of draftInvoices) {
      const dt = getDocType(inv.type);
      const missing = [];
      if (!inv.customerName) missing.push('Kundenname');
      if (!inv.customerAddress) missing.push('Kundenadresse');
      if (!inv.date) missing.push('Datum');
      if (dt.hasPayment && !inv.dueDate) missing.push('Fälligkeitsdatum');
      if (dt.hasPositions && (!inv.positions || inv.positions.length === 0)) missing.push('Positionen');
      if (INVOICE_LIKE_TYPES.includes(inv.type) && !inv.serviceFrom && !inv.serviceTo) missing.push('Leistungszeitraum');

      if (missing.length > 0) {
        hints.push({
          icon: '📝',
          severity: 'warning',
          text: `Entwurf ${inv.number || '(ohne Nr.)'}: ${missing.join(', ')} fehlt.`,
          action: 'Beleg öffnen',
          view: 'invoices'
        });
        // Max 3 solcher Hinweise
        if (hints.filter(h => h.icon === '📝').length >= 3) break;
      }
    }

    // --- Backup-Erinnerung ---
    const lastBackup = await db.getSetting('lastBackupDate', null);
    if (!lastBackup) {
      hints.push({ icon: '💾', severity: 'warning', text: 'Du hast noch nie ein Backup gemacht! Deine Daten sind nur im Browser gespeichert.', action: 'Backup erstellen', view: 'settings' });
    } else {
      const daysSinceBackup = Math.floor((today - new Date(lastBackup)) / 86400000);
      if (daysSinceBackup >= 7) {
        hints.push({ icon: '💾', severity: 'warning', text: `Letztes Backup vor ${daysSinceBackup} Tagen. Mach regelmäßig ein Backup!`, action: 'Backup erstellen', view: 'settings' });
      }
    }

    // --- Berechnungsfehler ---
    const calcErrors = await this.checkAllInvoices();
    if (calcErrors.length > 0) {
      const draftErrors = calcErrors.filter(r => r.invoice.status === 'entwurf');
      const otherErrors = calcErrors.filter(r => r.invoice.status !== 'entwurf');
      if (draftErrors.length > 0) {
        hints.push({ icon: '🔢', severity: 'warning', text: `${draftErrors.length} Entwurf/Entwürfe mit Berechnungsfehlern gefunden.`, action: 'Automatisch korrigieren', fixAction: 'fixAll' });
      }
      if (otherErrors.length > 0) {
        hints.push({ icon: '🔢', severity: 'error', text: `${otherErrors.length} versendete/offene Beleg(e) mit abweichenden Berechnungen. Bitte manuell prüfen.`, action: 'Belege anzeigen', view: 'invoices' });
      }
    }

    // --- Kalkulations-Summen prüfen ---
    const calculations = await db.getAll(STORES.calculations);
    let calcMismatch = 0;
    for (const calc of calculations) {
      const recalcNet = (calc.positions || []).reduce((s, p) => s + (p.quantity || 0) * (p.unitPrice || 0), 0);
      if (Math.abs((calc.totalNet || 0) - recalcNet) > 0.01) {
        calcMismatch++;
        // Auto-fix
        calc.totalNet = Math.round(recalcNet * 100) / 100;
        calc.totalCost = (calc.positions || []).reduce((s, p) => s + (p.cost || 0), 0);
        calc.updatedAt = new Date().toISOString();
        await db.put(STORES.calculations, calc);
      }
    }
    if (calcMismatch > 0) {
      hints.push({ icon: '🔧', severity: 'info', text: `${calcMismatch} Kalkulation(en) mit Summenfehler automatisch korrigiert.` });
    }

    return hints;
  }
};
