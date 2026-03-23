// ============================================
// ElektroHub – Anleitung / Hilfe View
// ============================================

const GuideView = {
  async render() {
    return `
      <div class="page-header">
        <div>
          <h2>Anleitung</h2>
          <p class="page-subtitle">So nutzt du ElektroHub – Schritt für Schritt</p>
        </div>
        <button class="btn btn-secondary" onclick="app.navigate('dashboard')">← Zurück zum Dashboard</button>
      </div>

      <div class="toolbar" style="margin-bottom:20px;">
        <input type="text" class="search-input" placeholder="Anleitung durchsuchen... z.B. Mahnung, Skonto, AGB, Kalkulation..." id="guide-search" oninput="GuideView.filter()">
      </div>

      <!-- Schnellstart -->
      <div class="card guide-section" data-keywords="schnellstart anfangen einrichten firmendaten logo kunde projekt kalkulation angebot rechnung starten erste schritte">
        <h3 class="mb-16">Schnellstart – In 5 Minuten loslegen</h3>

        <div class="guide-step">
          <div class="guide-step-number">1</div>
          <div class="guide-step-content">
            <h4>Firmendaten einrichten</h4>
            <p>Geh zu <strong>Einstellungen</strong> und trage deinen Firmennamen, Adresse, Telefon, E-Mail und Steuernummer ein. Diese Daten erscheinen auf all deinen Dokumenten.</p>
            <div class="guide-tip">Tipp: Lade auch dein Firmenlogo hoch – es erscheint oben rechts auf jedem Beleg.</div>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">2</div>
          <div class="guide-step-content">
            <h4>Bankverbindung eintragen</h4>
            <p>Trage deine IBAN ein. Dann wird auf jeder Rechnung automatisch ein <strong>QR-Code</strong> erzeugt, den dein Kunde mit seiner Banking-App scannen kann.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">3</div>
          <div class="guide-step-content">
            <h4>Ersten Kunden anlegen</h4>
            <p>Geh zu <strong>Kunden</strong> und klick auf <strong>+ Neuer Kunde</strong>. Trag Name, Adresse und Kontaktdaten ein. Wähl den Typ (Privat, Gewerbe, Hausverwaltung oder Bauträger).</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">4</div>
          <div class="guide-step-content">
            <h4>Projekt anlegen</h4>
            <p>Geh zu <strong>Projekte</strong> und klick auf <strong>+ Neues Projekt</strong>. Gib dem Projekt einen Namen (z.B. „Elektroinstallation Neubau Müller"), wähl den Kunden aus und trag die Baustellen-Adresse ein.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">5</div>
          <div class="guide-step-content">
            <h4>Kalkulation erstellen</h4>
            <p>Öffne das Projekt und klick auf <strong>+ Neue Kalkulation</strong>. Füge Positionen hinzu – entweder manuell oder über den <strong>Textbaustein-Button</strong> (📋). Dort findest du vorgefertigte Leistungstexte für typische Elektroarbeiten.</p>
            <div class="guide-tip">Tipp: Wähle pro Position den richtigen Typ (Material, Eigenleistung Std., Pauschale, Nebenkosten). So kann ElektroHub Marge und Arbeitskosten richtig berechnen.</div>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">6</div>
          <div class="guide-step-content">
            <h4>Angebot erstellen & versenden</h4>
            <p>In der Kalkulation klickst du auf <strong>📄 Beleg</strong> – daraus wird automatisch ein Angebot mit allen Positionen. Du kannst es als <strong>PDF exportieren</strong> (Drucken-Dialog) oder den <strong>E-Mail-Text kopieren</strong> (📧 Button).</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">7</div>
          <div class="guide-step-content">
            <h4>Angebot in Rechnung umwandeln</h4>
            <p>Wenn der Kunde zustimmt, öffne das Angebot und klick <strong>→ Rechnung</strong>. Es wird eine neue Rechnung mit eigener Nummer erstellt. Das Angebot bleibt erhalten.</p>
            <div class="guide-tip">Tipp: Du kannst auch zuerst eine Auftragsbestätigung (→ Auftragsbestätigung) und dann erst die Rechnung erstellen.</div>
          </div>
        </div>
      </div>

      <!-- Funktionen im Detail -->
      <div class="card guide-section" data-keywords="funktionen dokumenttypen textbausteine lager lagerverwaltung statistiken auswertungen qr code qr-code girocode sepa iban einstellungen kleinunternehmer skonto handwerkerbonus nummernkreise">
        <h3 class="mb-16">Funktionen im Detail</h3>

        <div class="guide-step">
          <div class="guide-step-number">📄</div>
          <div class="guide-step-content">
            <h4>Dokumenttypen</h4>
            <p>ElektroHub unterstützt 14 Dokumenttypen: Angebot, Auftragsbestätigung, Rechnung, Abschlagsrechnung, Schlussrechnung, Stornorechnung, Gutschrift, Lieferschein, Kostenvoranschlag, Abnahmeprotokoll, Zahlungserinnerung, 2. Mahnung, Letzte Mahnung und Invoice (EN).</p>
            <p class="mt-8">Jeder Typ hat <strong>eigene Vorlagentexte</strong> (Einleitung, Schlusstext, E-Mail). Du kannst diese unter <strong>Einstellungen → Dokumentvorlagen</strong> anpassen.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">📋</div>
          <div class="guide-step-content">
            <h4>Textbausteine</h4>
            <p>Textbausteine sind vorgefertigte Leistungsbeschreibungen, die du in Kalkulationen und Belege einfügen kannst. Es gibt über 40 Vorlagen in 6 Kategorien: Installationsarbeiten, Kabelverlegung, Verteiler & Zähler, Beleuchtung, Prüfung & Messung, Nebenkosten.</p>
            <p class="mt-8">Eigene Textbausteine kannst du unter <strong>Einstellungen → Textbausteine</strong> anlegen.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">📦</div>
          <div class="guide-step-content">
            <h4>Lagerverwaltung</h4>
            <p>Unter <strong>Lager</strong> verwaltest du deine Artikel mit EAN, Einkaufs-/Verkaufspreis und Mindestbestand. Material-Zu- und -Abgänge werden protokolliert. Entnahmen kannst du einem Projekt zuordnen.</p>
            <p class="mt-8">Artikel mit leerem Bestand oder unter Mindestbestand werden auf dem <strong>Dashboard</strong> und in der <strong>Lager-Auswertung</strong> (Statistiken) angezeigt.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">📊</div>
          <div class="guide-step-content">
            <h4>Statistiken & Auswertungen</h4>
            <p>Unter <strong>Statistiken</strong> findest du 5 Auswertungen:</p>
            <ul style="margin:8px 0 0 20px;color:var(--gray-600);font-size:0.9rem;line-height:1.8;">
              <li><strong>Jahresübersicht</strong> – Monatliche Tabelle mit Angeboten, Umsatz, USt. und offenen Posten</li>
              <li><strong>Umsatzverteilung</strong> – Diagramme nach Leistungsart, Kundentyp, Top-Kunden und Top-Artikel</li>
              <li><strong>Projekt-Auswertung</strong> – Soll/Ist-Vergleich pro Projekt (Kalkulation vs. tatsächliche Rechnung)</li>
              <li><strong>Offene Posten</strong> – Alle unbezahlten Rechnungen mit Fälligkeitsdatum und überfälligen Tagen</li>
              <li><strong>Lager-Auswertung</strong> – Gesamter Lagerwert und Artikel unter Mindestbestand</li>
            </ul>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">⚡</div>
          <div class="guide-step-content">
            <h4>QR-Code auf Rechnungen</h4>
            <p>Wenn du deine IBAN in den Einstellungen einträgst, wird auf jeder Rechnung automatisch ein <strong>GiroCode (EPC QR-Code)</strong> erzeugt. Dein Kunde scannt ihn mit seiner Banking-App und die Überweisung ist vorausgefüllt – richtige IBAN, richtiger Betrag, richtige Rechnungsnummer.</p>
            <p class="mt-8">Alternativ kannst du auch einen eigenen QR-Code als Bild hochladen oder die Funktion deaktivieren.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">⚙️</div>
          <div class="guide-step-content">
            <h4>Wichtige Einstellungen</h4>
            <ul style="margin:4px 0 0 20px;color:var(--gray-600);font-size:0.9rem;line-height:1.8;">
              <li><strong>Kleinunternehmer (§19 UStG)</strong> – Wenn aktiv, wird keine MwSt. ausgewiesen und ein Hinweis eingefügt</li>
              <li><strong>Skonto</strong> – Aktiviere Skonto und setze Prozentsatz und Frist. Der Hinweis erscheint automatisch auf Rechnungen</li>
              <li><strong>Handwerkerbonus</strong> – Zeigt den Anteil der Arbeitskosten auf der Rechnung an (§35a EStG)</li>
              <li><strong>Nummernkreise</strong> – Die Prefixe für Dokumentnummern sind konfigurierbar (z.B. RE- statt RNG-)</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Tipps -->
      <div class="card guide-section" data-keywords="tipps backup sichern datensicherung handy mobil tablet demo daten ausprobieren">
        <h3 class="mb-16">Wichtige Tipps</h3>

        <div class="guide-step">
          <div class="guide-step-number">💾</div>
          <div class="guide-step-content">
            <h4>Regelmäßig Backup machen!</h4>
            <p>Deine Daten werden im Browser gespeichert (IndexedDB). Wenn du den Browser-Cache löschst, sind sie weg. Geh regelmäßig zu <strong>Einstellungen → Datensicherung → Backup herunterladen</strong> und speichere die JSON-Datei sicher ab.</p>
            <div class="guide-tip">Tipp: Mach mindestens einmal pro Woche ein Backup. Die Datei ist klein und enthält alle deine Daten.</div>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">📱</div>
          <div class="guide-step-content">
            <h4>Auch auf dem Handy nutzbar</h4>
            <p>ElektroHub funktioniert auch auf dem Smartphone oder Tablet. Die Seitenleiste wird automatisch schmaler. Ideal für die Baustelle!</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">🧪</div>
          <div class="guide-step-content">
            <h4>Demo-Daten zum Ausprobieren</h4>
            <p>Unter <strong>Einstellungen → Demo-Daten</strong> kannst du Beispieldaten laden, um alle Funktionen durchzuspielen. Danach kannst du die Demo-Daten mit einem Klick wieder löschen – deine eigenen Daten bleiben erhalten.</p>
          </div>
        </div>
      </div>

      <!-- Typischer Ablauf -->
      <div class="card guide-section" data-keywords="ablauf projekt workflow anfrage kalkulation angebot beauftragt arbeit abnahme rechnung abgeschlossen material entnahme lager status">
        <h3 class="mb-16">Typischer Ablauf eines Projekts</h3>

        <!-- Visueller Workflow -->
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid var(--gray-200);">
          <span class="badge status-anfrage" style="font-size:0.9rem;padding:6px 14px;">1. Anfrage</span>
          <span style="color:var(--gray-400);">→</span>
          <span class="badge status-kalkulation" style="font-size:0.9rem;padding:6px 14px;">2. Kalkulation</span>
          <span style="color:var(--gray-400);">→</span>
          <span class="badge badge-blue" style="font-size:0.9rem;padding:6px 14px;">3. Angebot</span>
          <span style="color:var(--gray-400);">→</span>
          <span class="badge status-beauftragt" style="font-size:0.9rem;padding:6px 14px;">4. Beauftragt</span>
          <span style="color:var(--gray-400);">→</span>
          <span class="badge status-in-arbeit" style="font-size:0.9rem;padding:6px 14px;">5. Arbeit</span>
          <span style="color:var(--gray-400);">→</span>
          <span class="badge status-abnahme" style="font-size:0.9rem;padding:6px 14px;">6. Abnahme</span>
          <span style="color:var(--gray-400);">→</span>
          <span class="badge badge-green" style="font-size:0.9rem;padding:6px 14px;">7. Rechnung</span>
          <span style="color:var(--gray-400);">→</span>
          <span class="badge status-abgeschlossen" style="font-size:0.9rem;padding:6px 14px;">8. Fertig</span>
        </div>

        <!-- Schritt-für-Schritt mit Reiter-Angaben -->
        <div class="guide-step">
          <div class="guide-step-number">1</div>
          <div class="guide-step-content">
            <h4>Anfrage kommt rein</h4>
            <div class="guide-nav-badge">👥 Kunden → <strong>+ Neuer Kunde</strong></div>
            <p>Leg den Kunden an (Name, Adresse, Telefon, Typ).</p>
            <div class="guide-nav-badge">📋 Projekte → <strong>+ Neues Projekt</strong></div>
            <p>Erstelle ein Projekt, wähle den Kunden aus, trag die Baustellen-Adresse ein. Status bleibt auf <strong>Anfrage</strong>.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">2</div>
          <div class="guide-step-content">
            <h4>Kalkulation erstellen</h4>
            <div class="guide-nav-badge">📋 Projekte → Projekt öffnen → <strong>+ Neue Kalkulation</strong></div>
            <p>Klick in der Projekt-Detailseite auf <strong>+ Neue Kalkulation</strong>. Es öffnet sich ein Formular:</p>
            <ul style="margin:8px 0 0 20px;color:var(--gray-600);font-size:0.9rem;line-height:1.8;">
              <li>Gib einen Namen ein (z.B. „Hauptkalkulation")</li>
              <li>Füge Positionen hinzu: Wähle den <strong>Typ</strong> (Material / Eigenleistung Std. / Pauschale / Nebenkosten)</li>
              <li>Oder klick <strong>📋 Textbaustein</strong> – dort findest du fertige Leistungstexte wie „Steckdose setzen" oder „NYM-J 3×1,5 verlegen"</li>
              <li>Trag <strong>Menge</strong> und <strong>Einzelpreis</strong> ein – die Summe berechnet sich automatisch</li>
              <li>Klick <strong>Anlegen</strong></li>
            </ul>
            <p class="mt-8">Dann stell den Projekt-Status auf <strong>Kalkulation</strong> um (Dropdown in der Projekt-Detailseite).</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">3</div>
          <div class="guide-step-content">
            <h4>Angebot erstellen & versenden</h4>
            <div class="guide-nav-badge">📋 Projekte → Projekt öffnen → Kalkulation → <strong>📄 Beleg</strong></div>
            <p>In der Kalkulation klickst du auf den <strong>📄 Beleg</strong>-Button. Es wird automatisch ein <strong>Angebot</strong> mit allen Positionen und Kundendaten erstellt.</p>
            <div class="guide-nav-badge">📄 Belege → Angebot öffnen</div>
            <p>Du landest in der Beleg-Detailansicht. Dort kannst du:</p>
            <ul style="margin:8px 0 0 20px;color:var(--gray-600);font-size:0.9rem;line-height:1.8;">
              <li><strong>📄 PDF</strong> – Druckansicht öffnen und als PDF speichern/drucken</li>
              <li><strong>📧 E-Mail-Text</strong> – Vorformulierten E-Mail-Text in die Zwischenablage kopieren</li>
              <li>Status auf <strong>Gesendet</strong> setzen</li>
            </ul>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">4</div>
          <div class="guide-step-content">
            <h4>Kunde sagt zu → Auftrag</h4>
            <div class="guide-nav-badge">📄 Belege → Angebot öffnen → <strong>→ Auftragsbestätigung</strong></div>
            <p>Optional: Erstelle eine Auftragsbestätigung aus dem Angebot (Button oben rechts).</p>
            <div class="guide-nav-badge">📋 Projekte → Projekt öffnen → Status ändern</div>
            <p>Stell den Projekt-Status auf <strong>Beauftragt</strong> um.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">5</div>
          <div class="guide-step-content">
            <h4>Arbeit durchführen</h4>
            <div class="guide-nav-badge">📋 Projekte → Projekt öffnen → Status: <strong>In Arbeit</strong></div>
            <p>Stell den Status auf <strong>In Arbeit</strong>.</p>
            <div class="guide-nav-badge">📦 Lager → Artikel → <strong>📤 Entnahme</strong></div>
            <p>Wenn du Material aus dem Lager nimmst: Geh zu <strong>Lager</strong>, wähle den Artikel und buche eine <strong>Entnahme</strong>. Ordne sie dem Projekt zu – dann siehst du später im Projekt, welches Material verbraucht wurde.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">6</div>
          <div class="guide-step-content">
            <h4>Abnahme</h4>
            <div class="guide-nav-badge">📋 Projekte → Projekt öffnen → Status: <strong>Abnahme</strong></div>
            <p>Stell den Status auf <strong>Abnahme</strong>.</p>
            <div class="guide-nav-badge">📄 Belege → <strong>+ Neuer Beleg</strong> → Typ: Abnahmeprotokoll</div>
            <p>Optional: Erstelle ein <strong>Abnahmeprotokoll</strong> (enthält Unterschriftsfelder für Auftraggeber und Auftragnehmer).</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">7</div>
          <div class="guide-step-content">
            <h4>Rechnung stellen</h4>
            <div class="guide-nav-badge">📄 Belege → Angebot öffnen → <strong>→ Rechnung</strong></div>
            <p>Öffne das ursprüngliche Angebot und klick auf <strong>→ Rechnung</strong>. Es wird eine neue Rechnung mit eigener Nummer, Fälligkeitsdatum und QR-Code erstellt. Das Angebot bleibt erhalten.</p>
            <p class="mt-8">Dann: <strong>📄 PDF</strong> exportieren und versenden. Status auf <strong>Offen</strong> oder <strong>Gesendet</strong>.</p>
            <div class="guide-tip">Tipp: Bei größeren Projekten kannst du vorher <strong>Abschlagsrechnungen</strong> stellen und am Ende eine <strong>Schlussrechnung</strong>.</div>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">8</div>
          <div class="guide-step-content">
            <h4>Zahlung erhalten & abschließen</h4>
            <div class="guide-nav-badge">📄 Belege → Rechnung öffnen → Status: <strong>Bezahlt</strong></div>
            <p>Wenn die Zahlung eingegangen ist, stell den Rechnungs-Status auf <strong>Bezahlt</strong>.</p>
            <div class="guide-nav-badge">📋 Projekte → Projekt öffnen → Status: <strong>Abgeschlossen</strong></div>
            <p>Stell den Projekt-Status auf <strong>Abgeschlossen</strong>. Das Projekt verschwindet vom Dashboard und ist archiviert.</p>
            <div class="guide-tip">Tipp: Unter <strong>📊 Statistiken → Projekt-Auswertung</strong> kannst du den Soll/Ist-Vergleich sehen – was war kalkuliert, was wurde tatsächlich berechnet?</div>
          </div>
        </div>

      </div>

      <!-- Rechnungs- und Mahnprozess -->
      <div class="card guide-section" data-keywords="rechnung zahlung mahnung zahlungserinnerung inkasso überfällig fällig fälligkeit bezahlt offen gesendet entwurf automatisch dashboard aufgaben hinweise mahnprozess eskalation">
        <h3 class="mb-16">Rechnungen, Zahlungen & Mahnungen</h3>

        <p style="color:var(--gray-600);font-size:0.9rem;line-height:1.6;margin-bottom:20px;">
          So läuft der gesamte Zahlungsprozess – von der Rechnung bis zur letzten Mahnung. Vieles passiert automatisch, aber du behältst immer die Kontrolle.
        </p>

        <div class="guide-step">
          <div class="guide-step-number">1</div>
          <div class="guide-step-content">
            <h4>Rechnung erstellen</h4>
            <div class="guide-nav-badge">📄 Belege → Angebot anklicken → <strong>→ Rechnung</strong></div>
            <p>Du erstellst die Rechnung (z.B. aus einem Angebot heraus). Das <strong>Fälligkeitsdatum</strong> wird automatisch gesetzt – Rechnungsdatum + Zahlungsziel aus den Einstellungen (z.B. 14 Tage). Der Status ist erstmal <strong>Entwurf</strong>.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">2</div>
          <div class="guide-step-content">
            <h4>Rechnung versenden</h4>
            <div class="guide-nav-badge">📄 Belege → Rechnung anklicken → <strong>📄 PDF</strong> + <strong>📧 E-Mail-Text</strong></div>
            <p>Exportiere die Rechnung als PDF und verschicke sie per E-Mail (E-Mail-Text kannst du mit einem Klick kopieren). Danach setzt du den Status auf <strong>Gesendet</strong> oder <strong>Offen</strong>.</p>
            <div class="guide-tip">Das Dashboard zeigt dir fertige Entwürfe an: <em>„Rechnung RE-2026-0001 ist fertig – noch als Entwurf. Versenden?"</em></div>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">3</div>
          <div class="guide-step-content">
            <h4>Warten auf Zahlung</h4>
            <div class="guide-nav-badge">🏠 Dashboard → Aufgaben & Hinweise (automatisch)</div>
            <p>Jetzt passiert alles automatisch im Hintergrund:</p>
            <ul style="margin:8px 0 0 20px;color:var(--gray-600);font-size:0.9rem;line-height:1.8;">
              <li><strong>3 Tage vor Fälligkeit:</strong> Das Dashboard warnt dich: <em>„RE-2026-0001 – in 3 Tagen fällig!"</em></li>
              <li><strong>Am Fälligkeitstag:</strong> <em>„RE-2026-0001 – HEUTE fällig!"</em></li>
              <li><strong>Nach Fälligkeit:</strong> Der Status wird <strong>automatisch</strong> auf <strong>Überfällig</strong> gesetzt</li>
            </ul>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">4</div>
          <div class="guide-step-content">
            <h4>Kunde zahlt nicht → Mahnung</h4>
            <p>Wenn eine Rechnung überfällig ist, schlägt das Dashboard dir automatisch die nächste Mahnstufe vor. <strong>Du klickst nur auf den Button</strong> – den Rest macht die App:</p>

            <div style="margin:12px 0;padding:16px;background:var(--gray-50);border-radius:8px;">
              <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--gray-200);">
                <span class="badge badge-yellow" style="min-width:100px;text-align:center;">1–7 Tage</span>
                <div style="font-size:0.9rem;">
                  <strong>Zahlungserinnerung</strong> (freundlicher Ton)<br>
                  <span class="text-muted text-small"><em>„Möglicherweise hat sich unsere Erinnerung mit Ihrer Zahlung überschnitten…"</em></span>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--gray-200);">
                <span class="badge badge-yellow" style="min-width:100px;text-align:center;">+ 7 Tage</span>
                <div style="font-size:0.9rem;">
                  <strong>2. Mahnung</strong> (dringender)<br>
                  <span class="text-muted text-small"><em>„Wir bitten Sie dringend, den ausstehenden Betrag zu überweisen…"</em></span>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--gray-200);">
                <span class="badge badge-red" style="min-width:100px;text-align:center;">+ 7 Tage</span>
                <div style="font-size:0.9rem;">
                  <strong>Letzte Mahnung</strong> (mit Inkasso-Androhung)<br>
                  <span class="text-muted text-small"><em>„…sehen wir uns gezwungen, die Angelegenheit an ein Inkassobüro zu übergeben."</em></span>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:12px;padding:8px 0;">
                <span class="badge badge-red" style="min-width:100px;text-align:center;">+ 14 Tage</span>
                <div style="font-size:0.9rem;">
                  <strong>Inkasso/Anwalt</strong> – das Dashboard erinnert dich daran
                </div>
              </div>
            </div>

            <div class="guide-nav-badge">📄 Belege → Rechnung anklicken → <strong>→ Mahnung</strong></div>
            <p>Du kannst die Mahnung auch manuell erstellen, indem du die Rechnung öffnest und auf <strong>→ Mahnung</strong> klickst. Die App erkennt automatisch, welche Stufe als nächstes dran ist.</p>
            <p class="mt-8">Jede Mahnung bekommt eine <strong>eigene Nummer</strong> (z.B. MA-2026-0001) und einen <strong>eigenen Vorlagentext</strong>, den du unter Einstellungen → Dokumentvorlagen anpassen kannst.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">5</div>
          <div class="guide-step-content">
            <h4>Kunde zahlt → Bezahlt setzen</h4>
            <div class="guide-nav-badge">📄 Belege → Rechnung anklicken → Status: <strong>Bezahlt</strong></div>
            <p>Wenn das Geld auf dem Konto ist, setzt du den Status auf <strong>Bezahlt</strong>. Die Rechnung verschwindet aus den offenen Posten und wird im Umsatz gezählt.</p>
          </div>
        </div>

        <!-- Was passiert automatisch, was nicht -->
        <div style="margin-top:24px;padding:20px;background:var(--gray-50);border-radius:8px;">
          <h4 class="mb-8">Zusammenfassung: Was passiert automatisch?</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:0.9rem;">
            <div>
              <div style="font-weight:600;color:var(--success);margin-bottom:6px;">Automatisch:</div>
              <ul style="margin:0 0 0 16px;color:var(--gray-600);line-height:1.8;">
                <li>Fälligkeitsdatum berechnen</li>
                <li>Status auf „Überfällig" setzen</li>
                <li>Warnungen auf dem Dashboard</li>
                <li>Mahnstufe erkennen</li>
                <li>Vorlagentexte einsetzen</li>
                <li>Berechnungen prüfen</li>
              </ul>
            </div>
            <div>
              <div style="font-weight:600;color:var(--primary);margin-bottom:6px;">Machst du selbst:</div>
              <ul style="margin:0 0 0 16px;color:var(--gray-600);line-height:1.8;">
                <li>Status auf „Gesendet" setzen</li>
                <li>Mahnung per Klick erstellen</li>
                <li>Mahnung versenden (PDF/Mail)</li>
                <li>Status auf „Bezahlt" setzen</li>
                <li>Bei Inkasso: Anwalt kontaktieren</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Skonto -->
      <div class="card guide-section" data-keywords="skonto rabatt zahlung schnell prozent frist konditionen zahlungsbedingungen">
        <h3 class="mb-16">Skonto – Rabatt für schnelle Zahlung</h3>
        <p style="color:var(--gray-600);font-size:0.9rem;line-height:1.6;margin-bottom:16px;">
          Skonto ist ein Rabatt, den du dem Kunden gibst, wenn er schnell zahlt. Das ist kein Vertrag – es ist ein freiwilliges Angebot von dir. Du schreibst es auf die Rechnung, und der Kunde kann es nutzen oder nicht.
        </p>

        <div class="guide-step">
          <div class="guide-step-number">1</div>
          <div class="guide-step-content">
            <h4>Skonto auf einem Beleg aktivieren</h4>
            <div class="guide-nav-badge">📄 Belege → Beleg anklicken → Skonto-Feld → <strong>Skonto vergeben</strong></div>
            <p>In der Beleg-Detailansicht siehst du oben das Skonto-Feld. Klick auf <strong>Skonto vergeben</strong>, wähle Prozentsatz und Frist – fertig.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">2</div>
          <div class="guide-step-content">
            <h4>Was auf der Rechnung erscheint</h4>
            <p>Im Zahlungsbedingungen-Block steht dann z.B.:</p>
            <div style="margin:8px 0;padding:12px 16px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:6px;font-size:0.88rem;line-height:1.7;">
              Zahlbar bis zum <strong>15.04.2026</strong> ohne Abzug.<br>
              Bei Zahlung bis zum <strong>05.04.2026</strong> gewähren wir <strong>2% Skonto</strong> (114,19 € Abzug). Zahlbetrag dann: <strong>5.595,43 €</strong>.
            </div>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">3</div>
          <div class="guide-step-content">
            <h4>Typische Konditionen</h4>
            <ul style="margin:4px 0 0 20px;color:var(--gray-600);font-size:0.9rem;line-height:1.8;">
              <li><strong>2% bei 10 Tagen</strong> – am häufigsten im Handwerk</li>
              <li><strong>3% bei 7 Tagen</strong> – für Stammkunden oder große Aufträge</li>
              <li><strong>5% bei Vorkasse</strong> – eher selten, aber möglich</li>
            </ul>
            <div class="guide-tip">In den Einstellungen kannst du Standard-Werte festlegen (z.B. immer 2% / 10 Tage). Die werden beim Erstellen neuer Belege automatisch vorgeschlagen.</div>
          </div>
        </div>
      </div>

      <!-- AGB -->
      <div class="card guide-section" data-keywords="agb allgemeine geschäftsbedingungen pdf hochladen anhang anlage beleg rechnung versenden">
        <h3 class="mb-16">AGB – Allgemeine Geschäftsbedingungen</h3>
        <p style="color:var(--gray-600);font-size:0.9rem;line-height:1.6;margin-bottom:16px;">
          Du hast fertige AGB als PDF? ElektroHub kann sie an deine Belege anhängen.
        </p>

        <div class="guide-step">
          <div class="guide-step-number">1</div>
          <div class="guide-step-content">
            <h4>AGB-PDF hochladen</h4>
            <div class="guide-nav-badge">⚙️ Einstellungen → Abschnitt 2: <strong>AGB</strong></div>
            <p>Lade deine AGB als PDF-Datei hoch (max. 5 MB). Sie wird in der App gespeichert.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">2</div>
          <div class="guide-step-content">
            <h4>Hinweis auf Belegen aktivieren</h4>
            <div class="guide-nav-badge">⚙️ Einstellungen → Abschnitt 2: <strong>AGB-Hinweis auf Belegen anzeigen</strong> ✓</div>
            <p>Setz den Haken bei <strong>„AGB-Hinweis auf Belegen anzeigen"</strong>. Dann erscheint auf jeder Rechnung, jedem Angebot usw. automatisch der Text:</p>
            <div style="margin:8px 0;padding:10px 14px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:6px;font-size:0.88rem;font-style:italic;color:#555;">
              Es gelten unsere Allgemeinen Geschäftsbedingungen (siehe Anlage).
            </div>
            <p class="mt-8">Den Text kannst du auch anpassen.</p>
          </div>
        </div>

        <div class="guide-step">
          <div class="guide-step-number">3</div>
          <div class="guide-step-content">
            <h4>AGB beim Versenden mitschicken</h4>
            <p>Wenn du eine Rechnung als PDF exportierst (<strong>📄 PDF</strong>), fragt die App automatisch:</p>
            <div style="margin:8px 0;padding:10px 14px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:6px;font-size:0.88rem;">
              <em>„AGB-PDF als separate Datei herunterladen?"</em>
            </div>
            <p class="mt-8">Bei <strong>Ja</strong> wird die AGB-PDF heruntergeladen. Du hast dann zwei Dateien:</p>
            <ul style="margin:8px 0 0 20px;color:var(--gray-600);font-size:0.9rem;line-height:1.8;">
              <li>Die Rechnung (PDF)</li>
              <li>Die AGB (PDF)</li>
            </ul>
            <p class="mt-8">Beide hängst du an die E-Mail an den Kunden.</p>
            <div class="guide-tip">Du kannst die AGB auch jederzeit einzeln herunterladen: Öffne einen Beleg und klick auf den <strong>📎 AGB</strong>-Button.</div>
          </div>
        </div>

        <div style="margin-top:16px;padding:16px;background:var(--gray-50);border-radius:8px;">
          <h4 class="mb-8" style="font-size:0.95rem;">Zusammenfassung</h4>
          <ul style="margin:0 0 0 16px;color:var(--gray-600);font-size:0.9rem;line-height:1.8;">
            <li><strong>Einmal einrichten:</strong> AGB-PDF hochladen + Haken setzen</li>
            <li><strong>Danach automatisch:</strong> Hinweistext erscheint auf jedem Beleg</li>
            <li><strong>Beim Versenden:</strong> App bietet AGB-Download an → beide Dateien per Mail</li>
            <li><strong>Du musst nichts manuell pro Beleg machen</strong> – es passiert automatisch</li>
          </ul>
        </div>
      </div>
    `;
  },

  filter() {
    const query = (document.getElementById('guide-search')?.value || '').toLowerCase().trim();
    document.querySelectorAll('.guide-section').forEach(section => {
      if (!query) {
        section.style.display = '';
        return;
      }
      const keywords = (section.dataset.keywords || '').toLowerCase();
      const text = section.textContent.toLowerCase();
      const match = query.split(/\s+/).every(word => keywords.includes(word) || text.includes(word));
      section.style.display = match ? '' : 'none';
    });

    // Kein Treffer? Hinweis anzeigen
    const visibleCount = document.querySelectorAll('.guide-section:not([style*="display: none"])').length;
    let noResult = document.getElementById('guide-no-result');
    if (query && visibleCount === 0) {
      if (!noResult) {
        noResult = document.createElement('div');
        noResult.id = 'guide-no-result';
        noResult.className = 'card';
        noResult.style.textAlign = 'center';
        noResult.style.padding = '40px';
        noResult.style.color = 'var(--gray-400)';
        noResult.innerHTML = 'Kein Abschnitt gefunden. Versuch andere Suchbegriffe.';
        document.getElementById('content').appendChild(noResult);
      }
      noResult.style.display = '';
    } else if (noResult) {
      noResult.style.display = 'none';
    }
  }
};
