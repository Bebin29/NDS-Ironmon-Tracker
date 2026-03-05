# Feature Roadmap — Ironmon Tracker Web Dashboard

## 1. Encounter & Route Intelligence

### 1a. Route Encounter Table
- Zwei Modi: **Vanilla** (statische Datenbank) und **Randomized** (lernt aus beobachteten Encounters)
- Vanilla: zeigt pro Route verfuegbare Pokemon, Level-Range, Encounter-Rate, Methode (Grass/Surf/Fish/Headbutt)
- Randomized: baut die Encounter-Tabelle live auf aus dem was der Tracker tatsaechlich sieht
- Hervorhebung der **aktuellen Route** basierend auf Tracker-Location
- Filter: bereits gefangen / noch verfuegbar / tot (Nuzlocke-Logik)

### 1b. Randomizer-Aware Encounter Log
- Protokolliert automatisch jeden Encounter den der Tracker meldet (Route + Pokemon + Level)
- Baut eine "entdeckte Encounter-Map" auf: was wurde wo gesehen
- Zeigt Encounter-Rate-Schaetzung basierend auf bisherigen Sichtungen
- "Noch nicht besuchte Routen" Markierung — hier koennten neue Pokemon sein
- Erkennt Muster: "Auf dieser Route gibt es anscheinend Fire-Types"

### 1c. Encounter Vorschau
- "Was kommt als naechstes?" Panel: naechste 2-3 Story-Routen
- Vanilla-Modus: zeigt bekannte Encounter-Pools
- Randomized-Modus: zeigt "unbekannt" fuer unbesuchte Routen, bekannte fuer besuchte
- Typen-Abdeckung der verfuegbaren/bekannten Encounter vs. aktuellem Team
- Empfehlung welche Encounter wertvoll waeren fuer Team-Luecken

### 1d. Trainer-Datenbank
- Alle Trainer pro Route mit Teams (Pokemon, Level, Moves)
- Warnung bei gefaehrlichen Trainern ("Ace Trainer auf Route 210 hat Gyarados Lv.35")
- Gym Leader Detail-Ansicht: volles Team, Items, KI-Verhalten
- Hinweis: Trainer-Teams sind in den meisten Randomizern **nicht** randomized — Daten bleiben nuetzlich

### 1e. Typ-Effektivitaets-Rechner
- Schneller Lookup: "Was ist effektiv gegen mein aktuelles Battle-Pokemon?"
- Defensiv-Check: "Welche Typen bedrohen mein Team am meisten?"
- Integration in Battle View: automatische Schwaechen/Staerken-Anzeige beim Gegner

### 1f. Starter-Tracking (Randomized)
- Erkennt automatisch den Starter (erstes Party-Pokemon nach Spielstart)
- Bei Randomized Startern: loggt welcher Starter erhalten wurde
- Soul Link: zeigt beide Starter nebeneinander (eigener + Partner)
- Starter-Bewertung: Typ-Matchup gegen erste Gym, Movepool-Potenzial

---

## 2. Randomizer Support

### 2a. Run-Modus Konfiguration
- Einstellung beim Run-Start: Vanilla / Randomized Encounters / Randomized Starters / Full Random
- Dashboard passt sich an: bei Vanilla zeigt es statische Daten, bei Random baut es live Daten auf
- Konfigurierbar welche Elemente randomized sind (Encounters, Starters, TMs, Trainer, Abilities)

### 2b. Live Encounter Discovery
- Jeder vom Tracker gemeldete Encounter wird in einer lokalen DB gespeichert
- Progressives Aufdecken der "Randomizer-Karte": je mehr man spielt, desto mehr weiss man
- Heatmap-Ansicht: welche Routen sind bereits erkundet, wo fehlen Daten
- Cross-Run Learning: wenn mehrere Runs mit gleichem Seed gespielt werden, Daten uebertragen

### 2c. Randomizer-Aware AI
- AI Advisor weiss ob der Run randomized ist
- Gibt keine Vanilla-Encounter-Tipps wenn Encounters random sind
- Fokussiert auf: beobachtete Encounters, Typ-Analyse des bisherigen Teams, generelle Strategie
- "Basierend auf den Encountern die du bisher gesehen hast, koennten Fire-Types haeufig sein"

### 2d. Seed-Analyse (Optional/Advanced)
- Falls Seed bekannt: Encounter-Prediction basierend auf Seed + Route
- Universal Pokemon Randomizer Log-Import: liest die Randomizer-Logs ein
- Zeigt dann die vollstaendige randomisierte Encounter-Tabelle

---

## 3. Soul Link Features

### 2a. Partner-Tracker Integration
- Zweiter Tracker-State (Partner spielt parallel auf eigenem Emulator)
- Dual-Party-Ansicht: beide Teams nebeneinander
- Automatische Link-Erkennung: gleiche Route = verlinkte Pokemon

### 2b. Link-Management
- Manuelles Linking-Interface: Partner-Pokemon per Route zuordnen
- Persistente Link-Tabelle (localStorage oder JSON-File)
- Wenn ein Pokemon stirbt: automatische Warnung "Linked Partner muss auch sterben"
- Death-Cascade-Visualisierung: zeigt Ketten-Effekte von Deaths

### 3c. Soul Link Regeln-Engine
- Konfigurierbare Regeln: "Gleicher Typ = Re-Encounter erlaubt?"
- Dupes Clause Tracking: bereits gefangene Species pro Route
- Shiny Clause, Gift Pokemon Regeln, Static Encounter Regeln
- Randomizer-spezifisch: "Re-roll erlaubt wenn beide Spieler gleiches Pokemon bekommen?"

### 2d. Partner-Kommunikation
- Geteilte Notizen zwischen beiden Spielern (WebSocket oder shared JSON)
- "Mein Partner hat X gefangen auf Route Y" — Benachrichtigungen
- Gemeinsamer Encounter-Plan: wer faengt was, wo

---

## 3. Nuzlocke Management

### 3a. Graveyard / Box View
- Vollstaendige Liste aller gestorbenen Pokemon mit Todesursache
- "Friedhof"-Ansicht mit Sprites, Level, Todesort, Gegner der den Kill gemacht hat
- Statistiken: durchschnittliche Lebensdauer, haeufigste Todesursache

### 3b. Box Pokemon Tracking
- Nicht nur Party, auch Box-Pokemon tracken (falls Lua-Export erweitert wird)
- "Ersatzbank"-Ansicht: wer koennte eingewechselt werden
- Level-Status der Box-Mons vs. Level Cap

### 3c. Encounter Checklist
- Pro Route: gefangen / nicht gefangen / fehlgeschlagen / uebersprungen
- Visuell auf einer Karte oder als Liste
- Remaining-Encounters-Counter

### 3d. Run History & Statistiken
- Speichere abgeschlossene Runs (Win/Loss, Team, Dauer, Deaths)
- Run-Vergleich: "Dieser Run vs. letzter Run"
- Gesamt-Statistiken: Win-Rate, beliebteste Pokemon, gefaehrlichste Stellen

---

## 4. Battle Intelligence

### 4a. Damage Calculator Integration
- Eingebauter Damage Calc basierend auf aktuellem Battle-State
- "Kann der Gegner mich OHKOen?" / "Kann ich den Gegner OHKOen?"
- Beruecksichtigt: Level, Stats, Nature, Ability, Item, STAB, Wetter

### 4b. Speed Check
- Automatischer Speed-Vergleich im Battle: "Wer ist schneller?"
- Beruecksichtigt: Base Speed, Nature, EVs/IVs (geschaetzt), Paralysis, Choice Scarf
- Warnung bei unsicheren Speed Ties

### 4c. Move Effectiveness Overlay
- Im Battle View: jede eigene Attacke zeigt errechneten Schaden-Range
- Farbcodiert: Gruen (sicherer Kill), Gelb (2HKO), Rot (braucht 3+)
- Gegner-Moves: geschaetzter Schaden gegen aktives Pokemon

### 4d. Switch-In Empfehlung
- "Welches Party-Member sollte ich einwechseln?"
- Beruecksichtigt Typ-Matchup, HP, Speed, und Gegner-Moveset
- Warnung vor gefaehrlichen Switch-Ins ("Einwechseln in eine volle Earthquake...")

---

## 5. Team Analyse

### 5a. Typ-Coverage-Matrix
- Heatmap: welche Typen deckt das aktuelle Team offensiv ab
- Defensive Schwaechen-Analyse: "Euer Team hat 4 Pokemon die schwach gegen Wasser sind"
- Empfehlungen fuer Team-Ergaenzungen basierend auf verfuegbaren Encounters

### 5b. EV/IV Schaetzung
- Basierend auf Level + Stats: geschaetzte IV-Ranges berechnen
- Natur-Einfluss visuell hervorheben (+ und - Stat)
- "Ist dieses Pokemon gut oder schlecht?" Quick-Check

### 5c. Evolutions-Planer
- Zeigt fuer jedes Party-Mon: wann kommt die naechste Evo, was braucht es (Level, Item, Trade)
- Warnung: "Haunter braucht Trade-Evo — nicht moeglich in Nuzlocke!"
- Move-Learning-Vorschau: "Bei Lv.38 lernt Infernape Close Combat"

### 5d. Move-Set Optimierung
- AI-gestuetzte Empfehlung: "Welche 4 Moves sind optimal fuer die naechste Gym?"
- Beruecksichtigt: verfuegbare TMs, Level-Up Moves, Tutor Moves
- Move-Vergleich: "Flamethrower vs. Fire Blast — was ist besser fuer diese Situation?"

---

## 6. AI Advisor Erweiterungen

### 6a. Kontextuelle Auto-Tipps
- Automatische Hinweise ohne Frage: "Achtung: Fantina's Mismagius kennt Shadow Ball"
- Trigger-basiert: bei Gym-Naehe, bei kritischer HP, bei Overlevel
- Dezente Benachrichtigungen im Dashboard (nicht nur Chat)

### 6b. Strategischer Route-Planer
- AI plant die naechsten Schritte: "Trainiere auf Route 209, dann Fantina"
- Beruecksichtigt: Level Cap, Team-Staerken, verfuegbare Items
- Interaktiv: "Was wenn ich stattdessen erst Byron mache?"

### 6c. Post-Battle Analyse
- Nach jedem wichtigen Kampf: "Das lief gut/schlecht weil..."
- Vorschlaege fuer Anpassungen: "Du solltest ein Pokemon mit Ground-Move holen"
- Risk-Assessment: "Bei diesem HP-Stand ist der naechste Trainer gefaehrlich"

### 6d. Conversation Memory
- Chat-Verlauf persistent speichern (ueber Sessions hinweg)
- AI erinnert sich an fruehere Entscheidungen und Empfehlungen
- "Letztes Mal habe ich dir Flamethrower empfohlen — hat das geklappt?"

---

## 7. UI/UX Verbesserungen

### 7a. Responsive Layout
- Mobile-optimiert fuer Tablet/Handy neben dem Emulator
- Kompakt-Modus: nur die wichtigsten Infos
- OBS-Browser-Source kompatibel fuer Streaming

### 7b. Themes & Customization
- Verschiedene Farb-Themes (Pine Green, Classic Blue, Red Nuzlocke, Shiny Gold)
- Anpassbare Panel-Anordnung (Drag & Drop Grid)
- Font-Groesse und Density-Einstellungen

### 7c. Sound & Notifications
- Audio-Alarm bei: Death, Overlevel, kritischer HP
- Browser-Notifications fuer wichtige Events
- Konfigurierbar: welche Alerts aktiv sind

### 7d. Keyboard Shortcuts
- Schneller Chat-Zugriff (z.B. `/` zum Fokussieren)
- Panel ein-/ausblenden mit Tastenkuerzeln
- Navigation zwischen Screens

---

## 8. Daten & Persistenz

### 8a. Run-Datenbank (SQLite/JSON)
- Lokale Datenbank fuer alle Runs, Encounters, Deaths, Teams
- Export als JSON/CSV fuer eigene Auswertungen
- Import von alten Runs

### 8b. Pokemon-Datenbank (PokeAPI/lokal)
- Vollstaendige lokale Pokemon-Daten: Stats, Moves, Abilities, Evolutions
- Keine API-Abhaengigkeit zur Laufzeit
- Gen 4 + Gen 5 spezifische Daten (Movepools, TM-Listen, Tutor-Moves)

### 8c. Screenshot & Clip Capture
- Dashboard-Screenshot per Knopfdruck
- "Highlight"-Marker: markiere wichtige Momente im Run
- Timeline-Ansicht: Run als chronologische Story

### 8d. Stream Integration
- Twitch Chat Commands: `!team`, `!deaths`, `!levelcap`
- OBS Overlay-Modus: transparenter Hintergrund, nur Daten
- StreamElements/Streamlabs Widget-Export

---

## Priorisierung (Vorschlag)

| Prio | Feature | Aufwand | Impact |
|------|---------|---------|--------|
| P0 | 2a Run-Modus Konfiguration (Vanilla/Random) | Klein | Hoch |
| P0 | 1a Route Encounter Table (dual-mode) | Mittel | Hoch |
| P0 | 1b Randomizer-Aware Encounter Log | Mittel | Hoch |
| P0 | 1e Typ-Effektivitaets-Rechner | Klein | Hoch |
| P0 | 3b Link-Management (Soul Link) | Mittel | Hoch (Soul Link) |
| P0 | 5a Damage Calculator | Mittel | Hoch |
| P1 | 1f Starter-Tracking (Randomized) | Klein | Mittel |
| P1 | 1c Encounter Vorschau | Klein | Mittel |
| P1 | 1d Trainer-Datenbank | Gross | Hoch |
| P1 | 2c Randomizer-Aware AI | Klein | Mittel |
| P1 | 4a Graveyard View | Klein | Mittel |
| P1 | 4c Encounter Checklist | Klein | Mittel |
| P1 | 6a Typ-Coverage-Matrix | Klein | Mittel |
| P1 | 6c Evolutions-Planer | Klein | Mittel |
| P1 | 7a Kontextuelle Auto-Tipps | Mittel | Hoch |
| P2 | 2b Live Encounter Discovery | Mittel | Mittel |
| P2 | 2d Seed-Analyse / Log-Import | Mittel | Hoch (Random) |
| P2 | 3a Partner-Tracker Integration | Gross | Hoch (Soul Link) |
| P2 | 5b Speed Check | Klein | Mittel |
| P2 | 5c Move Effectiveness Overlay | Mittel | Hoch |
| P2 | 6b EV/IV Schaetzung | Klein | Mittel |
| P2 | 8a Responsive/OBS Layout | Mittel | Mittel |
| P2 | 9b Pokemon-Datenbank lokal | Mittel | Hoch |
| P3 | 3d Partner-Kommunikation | Gross | Mittel |
| P3 | 4d Run History | Mittel | Mittel |
| P3 | 7d Conversation Memory | Klein | Mittel |
| P3 | 8b Themes | Klein | Klein |
| P3 | 9d Stream Integration | Gross | Mittel |
