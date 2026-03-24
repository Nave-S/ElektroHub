// ============================================
// ElektroHub – Changelog / Versionshistorie
// ============================================

const APP_VERSION = '2.1.0-beta';
const APP_BUILD = (() => {
  // Build-Nummer = Datum (YYYYMMDD) + täglicher Zähler
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const stored = localStorage.getItem('ehub_build_date');
  const storedCount = parseInt(localStorage.getItem('ehub_build_count') || '0');
  if (stored === today) {
    return today + String(storedCount).padStart(2, '0');
  }
  // Neuer Tag → Zähler zurücksetzen
  localStorage.setItem('ehub_build_date', today);
  localStorage.setItem('ehub_build_count', '1');
  return today + '01';
})();
const APP_STAGE = 'prototype'; // prototype | beta | stable

// Build-Zähler hochzählen bei jeder Änderung (wird von Auto-Save getriggert)
function incrementBuild() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const stored = localStorage.getItem('ehub_build_date');
  if (stored === today) {
    const count = parseInt(localStorage.getItem('ehub_build_count') || '0') + 1;
    localStorage.setItem('ehub_build_count', String(count));
  }
}

const CHANGELOG = [
  {
    version: '2.1.0-beta',
    date: '2026-03-24',
    changes: [
      'Globale Suche mit Synonymen und Umschreibungen (Strg+K)',
      'Positionstypen: Meister, Geselle, Helfer mit automatischen Stundensätzen',
      'Einheiten pro Position (Stück, Meter, Stunde, Pauschal, ...)',
      'MwSt-Satz pro Position (19%/7%/0%) für gemischte Rechnungen',
      'Rabatt pro Position (%)',
      'Erweitertes Kundenmodell (Anrede, Vorname, getrennte Adressfelder, USt-ID)',
      'Projekt mit Startdatum, Enddatum und Budget',
      'Netto-/Bruttomodus und Reverse-Charge (§13b UStG) pro Beleg',
      'Bezahlt-Tracking mit Datum und Betrag (Teilzahlung erkannt)',
      'Schlussrechnung verrechnet automatisch Abschlagsrechnungen',
      'Big.js Präzisionsarithmetik für alle Berechnungen (kein Floating-Point)',
      'Betriebsart-Umschalter (Kleinunternehmer/Regelbesteuert) mit auto Anpassung',
      'Statistiken: Erklärungstexte und KU-aware (MwSt-Spalten ausblenden)',
      'Kalkulationseinstellungen werden in Kalkulationen eingesetzt',
      'Prototyp-Hinweis in App-Info und Sidebar',
      'Anleitung komplett aktualisiert mit allen neuen Features',
      'Breadcrumbs auf allen Detailseiten',
      'Seitenübergangs-Animation',
      'PDF-Seitenumbruch optimiert (unterer Block bleibt zusammen)',
      'Demo-Daten mit 6 Kunden, Meister/Geselle/Helfer, KU-aware Berechnung',
      '68 Unit Tests mit Big.js Präzision',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-03-23',
    changes: [
      'Komplett neues Dokumentensystem mit 14 Dokumenttypen',
      'Dokumentvorlagen mit Platzhaltern (pro Typ anpassbar)',
      '45 vordefinierte Textbausteine für Elektro-Arbeiten',
      'Skonto pro Beleg individuell einstellbar',
      'Automatischer Mahnprozess mit 3 Stufen + Dashboard-Hinweise',
      'Statistiken & Auswertungen (Jahresübersicht, Tortendiagramme, Soll/Ist)',
      'GoBD-konforme Nummernkreise (konfigurierbare Präfixe)',
      'Zahlungsbedingungen-Block auf Rechnungen (Skonto, Fälligkeit, Bankdaten)',
      'QR-Code (GiroCode) für SEPA-Überweisungen',
      'Handwerkerbonus-Hinweis (§35a EStG)',
      'Gewährleistungshinweis (VOB/B oder BGB)',
      'Kleinunternehmer-Regelung (§19 UStG) mit automatischer Anpassung',
      'AGB-Upload und automatischer Hinweis auf Belegen',
      'Beleg-Gruppierung (Kette: Angebot → AB → Rechnung)',
      'Farbige Dokumenttyp-Badges',
      'Berechnungs-Validator mit dreifacher Prüfung',
      'Smarte Hinweise auf dem Dashboard (Backup, Pflichtangaben, Überfällige)',
      'Lagerverwaltung als optionales Modul (ein-/ausschaltbar)',
      'Anleitung mit Suche und Schritt-für-Schritt-Erklärungen',
      'Separates Anleitungsfenster (neben der App nutzbar)',
      'Preset-Chips für schnelle Werteingabe',
      'Projekt-Status mit klarem Nächster-Schritt-Button',
      'Demo-Daten laden und löschen',
      'Backup-Erinnerung auf dem Dashboard',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-20',
    changes: [
      'Erste Version: Dashboard, Projekte, Kunden, Lager, Belege',
      'Kalkulationen mit Positionen und Margenberechnung',
      'Angebote und Rechnungen erstellen',
      'PDF-Export (Druckansicht)',
      'QR-Code-Generator (EPC/GiroCode)',
      'Import/Export als JSON-Backup',
      'Responsive Design für Desktop und Mobil',
    ],
  },
];
