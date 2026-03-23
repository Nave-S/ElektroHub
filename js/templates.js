// ============================================
// ElektroHub – Standard-Dokumentvorlagen
// Platzhalter: [Dokumentnr], [Anrede], [Name], [Firma], [Datum],
//   [Fälligkeitsdatum], [Projektname], [Skontobetrag], [Skontofrist],
//   [Betrag]
// ============================================

const DEFAULT_TEMPLATES = {
  angebot: {
    label: 'Angebot',
    subject: 'Angebot Nr. [Dokumentnr] – [Projektname]',
    intro: 'Guten Tag [Anrede] [Name],\n\nvielen Dank für Ihr Interesse an unseren Leistungen. Anbei finden Sie unser Angebot mit der Nr. [Dokumentnr].\n\nDieses Angebot ist 30 Tage gültig. Gerne stehen wir Ihnen für Rückfragen oder eine Baustellenbegehung zur Verfügung.',
    closing: 'Unsere Zahlungsbedingungen: Zahlbar innerhalb von 14 Tagen nach Rechnungsstellung. Bei Zahlung innerhalb von 10 Tagen gewähren wir 2 % Skonto.\n\nWir würden uns freuen, den Auftrag für Sie ausführen zu dürfen.\n\nMit freundlichen Grüßen\n[Firma]',
    email: 'Guten Tag [Anrede] [Name],\n\nvielen Dank für Ihr Interesse an unseren Leistungen. Anbei finden Sie unser Angebot mit der Nr. [Dokumentnr].\n\nBei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.\n\nMit freundlichen Grüßen\n[Firma]',
  },
  auftragsbestaetigung: {
    label: 'Auftragsbestätigung',
    subject: 'Auftragsbestätigung Nr. [Dokumentnr] – [Projektname]',
    intro: 'Guten Tag [Anrede] [Name],\n\nvielen Dank für Ihren Auftrag. Anbei finden Sie die Auftragsbestätigung mit der Nr. [Dokumentnr].\n\nWir werden die vereinbarten Arbeiten gemäß den nachstehenden Positionen für Sie ausführen.',
    closing: 'Zahlungsbedingungen: Zahlbar innerhalb von 14 Tagen nach Rechnungsstellung. Bei Zahlung innerhalb von 10 Tagen gewähren wir 2 % Skonto.\n\nWir freuen uns auf die Zusammenarbeit.\n\nMit freundlichen Grüßen\n[Firma]',
    email: 'Guten Tag [Anrede] [Name],\n\nvielen Dank für Ihren Auftrag. Anbei finden Sie die Auftragsbestätigung mit der Nr. [Dokumentnr].\n\nDen geplanten Ausführungstermin stimmen wir zeitnah mit Ihnen ab.\n\nMit freundlichen Grüßen\n[Firma]',
  },
  rechnung: {
    label: 'Rechnung',
    subject: 'Rechnung Nr. [Dokumentnr]',
    intro: 'Guten Tag [Anrede] [Name],\n\nvielen Dank für Ihren Auftrag. Anbei finden Sie unsere Rechnung mit der Nr. [Dokumentnr].',
    closing: 'Bitte überweisen Sie den Rechnungsbetrag bis zum [Fälligkeitsdatum] auf das unten angegebene Konto.\n\nVielen Dank für die gute Zusammenarbeit.\n\nMit freundlichen Grüßen\n[Firma]',
    email: 'Guten Tag [Anrede] [Name],\n\nvielen Dank für Ihren Auftrag. Anbei finden Sie unsere Rechnung mit der Nr. [Dokumentnr].\n\nMit freundlichen Grüßen\n[Firma]',
  },
  abschlagsrechnung: {
    label: 'Abschlagsrechnung',
    subject: 'Abschlagsrechnung Nr. [Dokumentnr] – [Projektname]',
    intro: 'Guten Tag [Anrede] [Name],\n\ngemäß Vereinbarung erlauben wir uns, folgenden Abschlag in Rechnung zu stellen. Abschlagsrechnung Nr. [Dokumentnr].',
    closing: 'Bitte überweisen Sie den Abschlagsbetrag bis zum [Fälligkeitsdatum] auf das unten angegebene Konto.\n\nDie Schlussrechnung erfolgt nach Fertigstellung und Abnahme der Arbeiten.\n\nMit freundlichen Grüßen\n[Firma]',
    email: 'Guten Tag [Anrede] [Name],\n\ngemäß Vereinbarung erlauben wir uns, folgenden Abschlag in Rechnung zu stellen. Abschlagsrechnung Nr. [Dokumentnr].\n\nMit freundlichen Grüßen\n[Firma]',
  },
  schlussrechnung: {
    label: 'Schlussrechnung',
    subject: 'Schlussrechnung Nr. [Dokumentnr] – [Projektname]',
    intro: 'Guten Tag [Anrede] [Name],\n\ndie beauftragten Arbeiten wurden abgeschlossen. Anbei finden Sie unsere Schlussrechnung mit der Nr. [Dokumentnr].\n\nBereits geleistete Abschlagszahlungen wurden berücksichtigt und sind nachstehend aufgeführt.',
    closing: 'Bitte überweisen Sie den verbleibenden Rechnungsbetrag bis zum [Fälligkeitsdatum].\n\nVielen Dank für Ihr Vertrauen.\n\nMit freundlichen Grüßen\n[Firma]',
    email: 'Guten Tag [Anrede] [Name],\n\ndie beauftragten Arbeiten wurden abgeschlossen. Anbei finden Sie unsere Schlussrechnung mit der Nr. [Dokumentnr].\n\nMit freundlichen Grüßen\n[Firma]',
  },
  stornorechnung: {
    label: 'Stornorechnung',
    subject: 'Stornorechnung Nr. [Dokumentnr]',
    intro: 'Guten Tag [Anrede] [Name],\n\nwir haben Ihre Rechnung wie besprochen korrigiert. Anbei finden Sie die Stornorechnung Nr. [Dokumentnr].',
    closing: 'Eine eventuelle Überzahlung wird Ihnen umgehend erstattet.\n\nMit freundlichen Grüßen\n[Firma]',
    email: 'Guten Tag [Anrede] [Name],\n\nanbei erhalten Sie die Stornorechnung Nr. [Dokumentnr] zur Korrektur der ursprünglichen Rechnung.\n\nMit freundlichen Grüßen\n[Firma]',
  },
  gutschrift: {
    label: 'Gutschrift',
    subject: 'Gutschrift Nr. [Dokumentnr]',
    intro: 'Guten Tag [Anrede] [Name],\n\nwir bedanken uns für die gute Zusammenarbeit. Anbei finden Sie die Gutschrift Nr. [Dokumentnr].',
    closing: 'Der Gutschriftsbetrag wird Ihnen auf das hinterlegte Konto überwiesen.\n\nMit freundlichen Grüßen\n[Firma]',
    email: 'Guten Tag [Anrede] [Name],\n\nanbei erhalten Sie die Gutschrift Nr. [Dokumentnr].\n\nMit freundlichen Grüßen\n[Firma]',
  },
  lieferschein: {
    label: 'Lieferschein',
    subject: 'Lieferschein Nr. [Dokumentnr]',
    intro: 'Guten Tag [Anrede] [Name],\n\nanbei finden Sie den Lieferschein Nr. [Dokumentnr] zu den gelieferten Materialien.',
    closing: 'Bitte prüfen Sie die Lieferung auf Vollständigkeit und Richtigkeit. Reklamationen bitten wir innerhalb von 5 Werktagen zu melden.\n\nMit freundlichen Grüßen\n[Firma]',
    email: 'Guten Tag [Anrede] [Name],\n\nanbei finden Sie den Lieferschein Nr. [Dokumentnr].\n\nMit freundlichen Grüßen\n[Firma]',
  },
  kostenvoranschlag: {
    label: 'Kostenvoranschlag',
    subject: 'Kostenvoranschlag Nr. [Dokumentnr] – [Projektname]',
    intro: 'Guten Tag [Anrede] [Name],\n\nauf Basis unserer Baustellenbesichtigung haben wir folgenden Kostenvoranschlag für Sie erstellt. Nr. [Dokumentnr].\n\nBitte beachten Sie, dass es sich um eine Kostenschätzung handelt. Die tatsächlichen Kosten können um bis zu 15–20 % abweichen.',
    closing: 'Für Rückfragen stehen wir Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen\n[Firma]',
    email: 'Guten Tag [Anrede] [Name],\n\nanbei finden Sie unseren Kostenvoranschlag Nr. [Dokumentnr] für das Projekt [Projektname].\n\nMit freundlichen Grüßen\n[Firma]',
  },
  abnahmeprotokoll: {
    label: 'Abnahmeprotokoll',
    subject: 'Abnahmeprotokoll – [Projektname]',
    intro: 'Guten Tag [Anrede] [Name],\n\nanbei erhalten Sie das Abnahmeprotokoll zu den durchgeführten Arbeiten am Objekt [Projektname].',
    closing: 'Die vorstehend beschriebenen Leistungen wurden in Augenschein genommen und abgenommen.\n\nOrt, Datum: ___________________________\n\nUnterschrift Auftraggeber: ___________________________\n\nUnterschrift Auftragnehmer: ___________________________',
    email: 'Guten Tag [Anrede] [Name],\n\nanbei erhalten Sie das Abnahmeprotokoll für das Projekt [Projektname].\n\nMit freundlichen Grüßen\n[Firma]',
  },
  mahnung1: {
    label: 'Zahlungserinnerung',
    subject: 'Zahlungserinnerung – Rechnung Nr. [Dokumentnr]',
    intro: 'Guten Tag [Anrede] [Name],\n\nbei der Durchsicht unserer Buchhaltung haben wir festgestellt, dass die Rechnung Nr. [Dokumentnr] vom [Datum] über [Betrag] € noch offen ist.\n\nMöglicherweise hat sich unsere Erinnerung mit Ihrer Zahlung überschnitten. In diesem Fall bitten wir Sie, dieses Schreiben als gegenstandslos zu betrachten.',
    closing: 'Andernfalls bitten wir Sie, den ausstehenden Betrag bis zum [Fälligkeitsdatum] auf unser Konto zu überweisen.\n\nMit freundlichen Grüßen\n[Firma]',
    email: '',
  },
  mahnung2: {
    label: '2. Mahnung',
    subject: '2. Mahnung – Rechnung Nr. [Dokumentnr]',
    intro: 'Guten Tag [Anrede] [Name],\n\nleider konnten wir bis heute keinen Zahlungseingang zu unserer Rechnung Nr. [Dokumentnr] vom [Datum] über [Betrag] € feststellen.',
    closing: 'Wir bitten Sie dringend, den ausstehenden Betrag bis zum [Fälligkeitsdatum] zu überweisen.\n\nSollte der Betrag bereits überwiesen worden sein, betrachten Sie dieses Schreiben bitte als gegenstandslos.\n\nMit freundlichen Grüßen\n[Firma]',
    email: '',
  },
  mahnung3: {
    label: 'Letzte Mahnung',
    subject: 'Letzte Mahnung – Rechnung Nr. [Dokumentnr]',
    intro: 'Guten Tag [Anrede] [Name],\n\ntrotz unserer bisherigen Zahlungserinnerungen ist die Rechnung Nr. [Dokumentnr] vom [Datum] über [Betrag] € weiterhin unbeglichen.',
    closing: 'Wir setzen Ihnen hiermit eine letzte Frist bis zum [Fälligkeitsdatum]. Sollte bis dahin kein Zahlungseingang erfolgen, sehen wir uns gezwungen, die Angelegenheit ohne weitere Ankündigung an ein Inkassobüro zu übergeben. Die daraus entstehenden Kosten gehen zu Ihren Lasten.\n\nMit freundlichen Grüßen\n[Firma]',
    email: '',
  },
  invoice_en: {
    label: 'Invoice (EN)',
    subject: 'Invoice No. [Dokumentnr]',
    intro: 'Dear [Anrede] [Name],\n\nthank you for your order. Please find attached our invoice no. [Dokumentnr].',
    closing: 'Please transfer the invoice amount by [Fälligkeitsdatum] to the bank account stated below.\n\nBest regards,\n[Firma]',
    email: 'Dear [Anrede] [Name],\n\nplease find attached our invoice no. [Dokumentnr].\n\nBest regards,\n[Firma]',
  },
};

// Legal / notice texts
const DEFAULT_LEGAL_TEXTS = {
  kleinunternehmer: {
    label: 'Kleinunternehmer-Regelung (§19 UStG)',
    short: 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',
    long: 'Kein Ausweis von Umsatzsteuer, da Kleinunternehmer gemäß § 19 Abs. 1 UStG. Der Rechnungsbetrag enthält keine Umsatzsteuer.',
  },
  skonto: {
    label: 'Skonto-Hinweis',
    text: 'Bei Zahlung innerhalb von [Skontofrist] Tagen gewähren wir [Skontobetrag] % Skonto. Skontobetrag: [berechneter Skontobetrag] €. Zahlbar dann: [berechneter Betrag nach Skonto] €.',
    short: 'Abzgl. [Skontobetrag] % Skonto bei Zahlung bis [Skontodatum].',
  },
  reverseCharge: {
    label: 'Reverse-Charge (§13b UStG)',
    text: 'Steuerschuldnerschaft des Leistungsempfängers gemäß § 13b UStG. Die Umsatzsteuer ist vom Leistungsempfänger zu entrichten.',
  },
  handwerkerbonus: {
    label: 'Handwerkerbonus-Hinweis',
    text: 'Der Anteil der Arbeitskosten (inkl. Fahrtkosten) an dieser Rechnung beträgt [Arbeitskosten] € (brutto). Gemäß § 35a EStG können 20 % der Arbeitskosten (max. 1.200 €/Jahr) steuerlich geltend gemacht werden.',
  },
  gewaehrleistung: {
    label: 'Gewährleistungshinweis',
    text: 'Auf die ausgeführten Arbeiten gewähren wir eine Gewährleistung gemäß VOB/B von 4 Jahren ab Abnahmedatum.',
    textBGB: 'Auf die ausgeführten Arbeiten gewähren wir eine Gewährleistung gemäß BGB von 5 Jahren ab Abnahmedatum.',
  },
  qrHint: {
    label: 'QR-Code Hinweis',
    text: 'Scannen Sie den QR-Code mit Ihrer Banking-App für eine schnelle und fehlerfreie SEPA-Überweisung.',
  },
  eRechnung: {
    label: 'E-Rechnungs-Hinweis',
    text: 'Diese Rechnung wird als E-Rechnung im ZUGFeRD-Format (Profil EN 16931) bereitgestellt und erfüllt die Anforderungen der E-Rechnungspflicht.',
  },
  aufbewahrung: {
    label: 'Aufbewahrungshinweis (intern)',
    text: 'Rechnungen und Geschäftsunterlagen sind gemäß §§ 147 AO, 14b UStG 10 Jahre aufzubewahren. Angebote und Handelsbriefe 6 Jahre.',
  },
};

// Replace placeholders in template text
function replaceTemplatePlaceholders(text, data) {
  if (!text) return '';
  return text
    .replace(/\[Dokumentnr\]/g, data.dokumentnr || '')
    .replace(/\[Anrede\]/g, data.anrede || '')
    .replace(/\[Name\]/g, data.name || '')
    .replace(/\[Firma\]/g, data.firma || '')
    .replace(/\[Datum\]/g, data.datum || '')
    .replace(/\[Fälligkeitsdatum\]/g, data.faelligkeitsdatum || '')
    .replace(/\[Projektname\]/g, data.projektname || '')
    .replace(/\[Skontobetrag\]/g, data.skontobetrag || '')
    .replace(/\[Skontofrist\]/g, data.skontofrist || '')
    .replace(/\[Betrag\]/g, data.betrag || '')
    .replace(/\[Arbeitskosten\]/g, data.arbeitskosten || '')
    .replace(/\[Skontodatum\]/g, data.skontodatum || '')
    .replace(/\[berechneter Skontobetrag\]/g, data.berechneterSkontobetrag || '')
    .replace(/\[berechneter Betrag nach Skonto\]/g, data.berechneterBetragNachSkonto || '');
}

// Get template for a document type (custom or default)
async function getDocTemplate(docType) {
  const customKey = `docTemplate_${docType}`;
  const custom = await db.getSetting(customKey, null);
  if (custom) {
    try {
      return JSON.parse(custom);
    } catch (e) { /* fall through to default */ }
  }
  return DEFAULT_TEMPLATES[docType] || DEFAULT_TEMPLATES.rechnung;
}

// Save custom template
async function saveDocTemplate(docType, template) {
  const key = `docTemplate_${docType}`;
  await db.setSetting(key, JSON.stringify(template));
}

// Reset template to default
async function resetDocTemplate(docType) {
  const key = `docTemplate_${docType}`;
  await db.setSetting(key, null);
}
