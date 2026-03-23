# ElektroHub – Einweisung für Claude Code

## Was ist ElektroHub?

ElektroHub ist eine **Web-App für Elektro-Fachbetriebe** – eine eigenständige Neuentwicklung, die den Funktionsumfang des Excel-basierten "Der Finanzwerker PRO" (Rechnungsprogramm für Handwerker) als moderne Web-Anwendung ablöst. Aktuell wird sie für den Betrieb **M-FLEX Energie und Gebäudetechnik** (Elektroinstallation, PV-Anlagen, Gebäudetechnik) in Hannover entwickelt.

---

## Tech-Stack & Architektur

- **Frontend**: Vanilla JavaScript (kein Framework), Single-Page-App
- **Datenbank**: IndexedDB (clientseitig, `db.js`)
- **CSS**: Eigenes Design-System (`css/style.css`)
- **Externe Libs**: QRious (QR-Codes), Tesseract.js (OCR)
- **PDF-Erzeugung**: Browserseitig (Print-CSS / Canvas)
- **Kein Backend** – alles läuft lokal im Browser
- **Datensicherung**: JSON-Export/Import

### Dateistruktur

```
index.html              – Einzige HTML-Seite (SPA-Shell + Sidebar-Navigation)
css/style.css           – Gesamtes Styling
js/
  app.js                – Haupt-Controller, Navigation, Export/Import
  db.js                 – IndexedDB-Wrapper (STORES, CRUD, Nummernkreise)
  utils.js              – Hilfsfunktionen, Konstanten (DOC_TYPES, Statuses)
  templates.js          – Standard-Dokumentvorlagen (Texte pro Belegtyp)
  textblocks.js         – Textbaustein-System
  charts.js             – Diagramme (Canvas-basiert)
  validator.js          – Eingabevalidierung
  qrcode.js             – QR-Code-Generierung
  autosave.js           – Auto-Save-Logik
  audit.js              – GoBD-Änderungsprotokoll
  datev-export.js       – DATEV-Export
  signature.js          – Digitale Unterschrift
  photos.js             – Foto-Upload (Kunden/Projekte)
  ocr-import.js         – Foto-zu-Daten via Tesseract OCR
  onboarding.js         – Ersteinrichtungs-Assistent
  changelog.js          – Versionshistorie
  views/
    dashboard.js        – Startseite mit KPIs
    customers.js        – Kundenverwaltung
    projects.js         – Projektverwaltung
    invoices.js         – Belegwesen (alle Dokumenttypen)
    timetracking.js     – Zeiterfassung
    inspections.js      – E-Check / DGUV V3 Prüfprotokolle
    statistics.js       – Umsatz- und Verkaufsstatistik
    inventory.js        – Lagerverwaltung (optional)
    settings.js         – Einstellungen (Firmendaten, Steuern, Texte, etc.)
    guide.js            – Anleitung
    appinfo.js          – App-Info / Über
    qrforge.js          – QR-Code-Generator-Tool
```

### IndexedDB Stores (db.js)

| Store | keyPath | Zweck |
|---|---|---|
| `customers` | `id` | Kundenstammdaten |
| `projects` | `id` | Projekte (mit Status-Workflow) |
| `calculations` | `id` | Kalkulationen zu Projekten |
| `articles` | `id` | Artikelstammdaten / Produktkatalog |
| `stockMovements` | `id` | Lagerbewegungen |
| `invoices` | `id` | **Alle Belegtypen** (Rechnung, Angebot, etc.) |
| `settings` | `key` | Key-Value-Einstellungen |
| `textBlocks` | `id` | Benutzerdefinierte Textbausteine |
| `numberRanges` | `id` | Nummernkreise (pro Typ + Jahr, GoBD-konform) |
| `photos` | `id` | Fotos (Base64, zu Kunden/Projekten) |
| `timeEntries` | `id` | Zeiterfassungseinträge |
| `inspections` | `id` | E-Check / DGUV V3 Prüfprotokolle |
| `auditLog` | `id` | GoBD-Änderungsprotokoll |

---

## Geschäftsdomäne & Fachbegriffe

### Dokumenttypen (DOC_TYPES in utils.js)

| Typ | Prefix | Beschreibung |
|---|---|---|
| `angebot` | AG | Kostenaufstellung vor Auftrag |
| `auftragsbestaetigung` | AB | Bestätigung nach Auftragserteilung |
| `rechnung` | RE | Standardrechnung |
| `abschlagsrechnung` | AR | Teilrechnung während laufender Arbeiten |
| `schlussrechnung` | SR | Endabrechnung nach Projektabschluss (verrechnet Abschläge) |
| `stornorechnung` | ST | Korrektur/Storno einer bestehenden Rechnung |
| `gutschrift` | GS | Rückzahlung/Verrechnung |
| `lieferschein` | LS | Materiallieferung ohne Zahlungsaufforderung |
| `kostenvoranschlag` | KV | Unverbindliche Kostenschätzung (±15-20%) |
| `abnahmeprotokoll` | AP | Bestätigung der Fertigstellung mit Unterschrift |
| `mahnung1/2/3` | MA | Zahlungserinnerung, 2. Mahnung, Letzte Mahnung |
| `invoice_en` | INV | Englische Rechnung |

### Dokumentnummern-Format
`{PREFIX}-{JAHR}-{LAUFENDE_NR}` z.B. `RE-2026-0005`
- Laufende Nummer pro Typ und Jahr (GoBD: lückenlos, fortlaufend)
- Prefixe sind in Einstellungen konfigurierbar

### Projekt-Workflow (Status)
`Anfrage → Kalkulation → Beauftragt → In Arbeit → Abnahme → Abgeschlossen → Archiviert`

### Rechnungs-Status
`Entwurf → Offen → Bezahlt → Überfällig → Storniert → Teilbezahlt`

---

## Steuer- und Rechtsregeln (WICHTIG)

### Umsatzsteuer
- **Standard-MwSt**: 19% (konfigurierbar in Settings)
- **Reduzierter Satz**: 7%
- **Kleinunternehmerregelung (§19 UStG)**: Keine MwSt ausweisen, stattdessen Hinweis: "Nach § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet."
- **Reverse-Charge (§13b UStG)**: Steuerschuldnerschaft beim Leistungsempfänger
- Netto- vs. Bruttorechnung als Modus pro Beleg

### GoBD-Konformität
- **Fortlaufende, lückenlose Nummernkreise** (nie Nummern überspringen oder löschen)
- **Audit-Log** (`auditLog` Store): Jede Änderung an Belegen wird protokolliert
- Belege nach Finalisierung nicht mehr veränderbar (nur Storno + Neuausstellung)

### E-Rechnung / ZUGFeRD
- Ab 2025 Pflicht in DE für B2B
- Format: **Factur-X Basic** (EN16931-konform)
- XML wird in PDF eingebettet (CrossIndustryInvoice)
- Referenzimplementierung liegt in `Finanzhandwerker 2026/DFW_PRO_DE/Z/` mit XSD-Schemas
- Setting `eRechnungsFormat` steuert ob PDF oder E-Rechnung

### Skonto
- Konfigurierbar: Prozentsatz (Standard: 2%) und Frist (Standard: 10 Tage)
- Skonto-Text wird automatisch auf Belegen eingefügt wenn aktiviert

### Zahlungsziel
- Standard: 14 Tage (konfigurierbar `defaultPaymentDays`)
- Fälligkeitsdatum = Rechnungsdatum + Zahlungsziel

---

## Datenmodelle

### Kunde (customers Store)
```javascript
{
  id: "unique-id",
  customerId: "KND-0001",           // Fortlaufende Kundennummer
  name: "Hoppenworth",              // Nachname / Ansprechpartner
  firstName: "Stephan",             // Vorname / Firma
  type: "privat|geschaeft|behoerde",
  anrede: "Herr|Frau|Firma|Divers",
  title: "",                         // z.B. "Dr."
  street: "Am Sünderkamp",
  houseNumber: "23B",
  zip: "30629",
  city: "Hannover",
  state: "Niedersachsen",
  country: "Deutschland",
  addressExtra: "",                  // Adresszusatz
  phone: "",
  mobile: "",
  email: "s.hoppi@gmx.de",
  ustId: "",                         // UST-Identifikationsnummer
  notes: "",
  createdAt: "ISO-Date",
  updatedAt: "ISO-Date"
}
```

### Beleg (invoices Store – deckt ALLE Dokumenttypen ab)
```javascript
{
  id: "unique-id",
  number: "RE-2026-0005",           // Generierte Belegnummer
  type: "rechnung",                  // Einer der DOC_TYPES
  status: "offen",                   // entwurf|offen|bezahlt|ueberfaellig|storniert|teilbezahlt
  projectId: "projekt-id",
  customerId: "kunden-id",
  customerName: "Stephan Hoppenworth",
  customerAnrede: "Herr",
  date: "2026-03-17",               // Belegdatum
  serviceDate: "2026-03-17",        // Leistungsdatum
  dueDate: "2026-03-31",            // Fälligkeitsdatum
  paymentDays: 14,
  invoiceMode: "netto|brutto",
  positions: [
    {
      pos: 1,
      description: "Elektroinstallation...",
      quantity: 1,
      unit: "Stunde",
      unitPrice: 65.00,              // Einzelpreis netto
      mwstRate: 19,                  // MwSt-Satz in %
      discount: 0,
      total: 65.00                   // Gesamtpreis netto
    }
  ],
  totalNet: 1600.00,
  totalTax: 304.00,
  totalGross: 1904.00,
  skontoEnabled: false,
  skontoRate: 2,
  skontoFrist: 10,
  introText: "...",
  closingText: "...",
  notes: "",
  paidDate: null,
  paidAmount: 0,
  createdAt: "ISO-Date",
  updatedAt: "ISO-Date"
}
```

### Projekt (projects Store)
```javascript
{
  id: "unique-id",
  projectId: "PRJ-2026-0001",
  customerId: "kunden-id",
  title: "Elektroinstallation Am Sünderkamp 23B",
  description: "",
  status: "in-arbeit",               // anfrage|kalkulation|beauftragt|in-arbeit|abnahme|abgeschlossen|archiviert
  address: "Am Sünderkamp 23B, 30629 Hannover",
  startDate: "2026-03-01",
  endDate: null,
  budget: 5000.00,
  createdAt: "ISO-Date",
  updatedAt: "ISO-Date"
}
```

### Zeiterfassung (timeEntries Store)
```javascript
{
  id: "unique-id",
  projectId: "projekt-id",
  employee: "Kevin Mattfeldt",
  date: "2026-03-17",
  startTime: "08:00",
  endTime: "16:30",
  breakMinutes: 30,
  description: "Schalter- und Steckdosenprogramm erneuert",
  hourlyRate: 55.00,
  createdAt: "ISO-Date"
}
```

---

## Firmendaten-Settings (settings Store)

Alle über `db.getSetting(key)` abrufbar:

| Key | Beispielwert | Beschreibung |
|---|---|---|
| `companyName` | "M-FLEX Energie und Gebäudetechnik" | Firmenname |
| `companyOwner` | "Kevin Mattfeldt" | Inhaber/Ansprechpartner |
| `companyAddress` | "Hamburger Allee 6, 30161 Hannover" | Adresse |
| `companyPhone` | "0176/84672199" | Telefon |
| `companyEmail` | "K.Mattfeldt@gmx.de" | E-Mail |
| `taxNumber` | "24/128/06246" | Steuernummer |
| `ustId` | "" | UST-ID (falls vorhanden) |
| `bankName` | "Hannoversche Volksbank" | Bank |
| `bankIBAN` | "DE75 2519 0001 0725 3915 01" | IBAN |
| `bankBIC` | "VOHADE2HXXX" | BIC |
| `bankKontoinhaber` | "Kevin Mattfeldt" | Kontoinhaber |
| `kleinunternehmer` | false | §19 UStG aktiv? |
| `mwstRate` | 19 | Standard-MwSt % |
| `mwstRateReduced` | 7 | Reduzierter MwSt % |
| `defaultPaymentDays` | 14 | Standard-Zahlungsziel |
| `skontoEnabled` | false | Skonto global aktiv? |
| `skontoRate` | 2 | Skonto % |
| `skontoFrist` | 10 | Skonto-Frist Tage |
| `defaultHourlyRateMeister` | 55 | Stundensatz Meister |
| `defaultHourlyRateGeselle` | 45 | Stundensatz Geselle |
| `defaultMarkup` | 15 | Materialaufschlag % |
| `kmPauschale` | 0.52 | Km-Pauschale EUR |
| `eRechnungsFormat` | "pdf" | E-Rechnungs-Format |
| `handwerksrollenNr` | "" | Handwerksrollennummer |
| `meisterbriefNr` | "" | Meisterbriefnummer |

---

## Einheiten

Gängige Einheiten im Elektro-Handwerk:
`Stück, Stunde, Minute, Meter, m², Pauschal, Set, km, kW, kWh, Einheit, Liter, kg, Rolle, Karton, Packung, Tag, Monat`

---

## Referenz: "Der Finanzwerker PRO" (Excel-Vorlage)

Das Original liegt in `/Users/nawiedsyed/DEV/Elekto Hub/Finanzhandwerker 2026/`. Es enthält:

- **Echte Geschäftsdaten** (13 Kunden, 25+ Rechnungen, Angebote, Aufträge) als Testdaten-Referenz
- **ZUGFeRD-Implementierung** (`DFW_PRO_DE/Z/`): Python-basiert mit facturx XSD-Schemas
- **Beispiel-ZUGFeRD-XML** (`Z/_internal/Input/zugferd_XML.xml`): Factur-X Basic CrossIndustryInvoice
- **Briefpapier-Overlay-Logik** (`Briefpapier/LayerPDF/`): PDF-Layer-Zusammenführung
- **Word-Vorlagen** (`Word_Vorlagen/`): Rechnung, Angebot, Auftragsbestätigung, Storno
- **Ländervarianten**: DE (v5.1.1), AT (v4.3), CH (v4 QR mit Schweizer QR-Einzahlungsschein)
- **Daten-Import-Tool** für Versionsmigration

### Aus dem Finanzwerker übernommene Konzepte
- Fortlaufende Nummernkreise pro Dokumenttyp und Jahr
- Netto-/Bruttorechnungsmodus
- Abschlagsrechnungen mit Verrechnung in Schlussrechnung
- Kleinunternehmerregelung (§19 UStG)
- Reverse-Charge-Verfahren (§13b UStG)
- Textbausteine mit Platzhaltern
- SEPA-QR-Code auf Rechnungen
- Kundenstatistiken (Top-Kunden nach Umsatz/Rechnungsanzahl)
- Mehrere Bearbeiter/Mitarbeiter
- Artikelhistorie (welcher Artikel wann an wen verkauft)

### Noch NICHT im ElektroHub umgesetzt (Backlog aus Finanzwerker)
- ZUGFeRD/Factur-X PDF-Erzeugung (XML-Einbettung)
- Briefpapier-PDF als Hintergrund-Layer
- Saldo-Verrechnung zwischen Gutschriften und Rechnungen
- E-Mail-Versand direkt aus der App (mit konfigurierbarem CC/BCC)
- Daten-Import aus der Excel-Version

---

## Entwicklungsregeln

### Sprache
- **UI-Sprache ist Deutsch** (alle Labels, Buttons, Meldungen)
- Code-Kommentare und Variablennamen auf Englisch
- Deutsche Fachbegriffe in Strings: "Rechnung", "Angebot", "Gutschrift", etc.

### Code-Stil
- Vanilla JS, keine Frameworks – so beibehalten
- Jede View ist ein Objekt mit `render()` und optional `init()` Methode
- HTML wird als Template-Strings in JS erzeugt
- `escapeHtml()` für alle dynamischen Inhalte verwenden (XSS-Schutz)
- `formatCurrency()` und `formatDate()` für konsistente Formatierung
- IDs werden mit `generateId()` erzeugt (timestamp + random)

### Datenbank
- Alle DB-Operationen sind async (`await db.get()`, `await db.put()`, etc.)
- Settings immer über `db.getSetting(key, defaultValue)` lesen
- Neue Stores nur bei DB_VERSION-Erhöhung in `db.js` anlegen
- Nummernkreise über `db.getNextNumber(docType)` – nie manuell vergeben

### PDF / Drucken
- PDF-Erzeugung via `window.print()` mit Print-CSS
- Vorschau zeigt exakt das was gedruckt wird
- Logo, QR-Code und Firmendaten werden aus Settings geladen

### Wichtige Konventionen
- Geldbeträge immer als Number (Cent-Genauigkeit), Anzeige via `formatCurrency()`
- Datumswerte als ISO-String (`YYYY-MM-DD`), Anzeige via `formatDate()`
- MwSt-Sätze als ganze Zahlen (19, 7) – nicht als Dezimal (0.19)
- Toast-Nachrichten für Feedback: `showToast('Gespeichert')` / `showToast('Fehler', 'error')`
- Modals über `openModal(title, bodyHtml)` / `closeModal()`
