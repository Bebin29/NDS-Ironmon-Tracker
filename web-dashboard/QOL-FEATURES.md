# Quality of Life Features — Web Dashboard

> Priorisiert nach Aufwand/Nutzen. Bezieht sich nur auf das Web Dashboard, nicht auf den Lua Tracker selbst.

## Status-Legende

| Symbol | Bedeutung |
|--------|-----------|
| done | Bereits implementiert |
| next | Naechster Sprint |
| planned | Geplant |
| idea | Idee, noch nicht spezifiziert |

---

## Was bereits existiert (done)

| Feature | Komponente |
|---------|------------|
| Live Party-Anzeige mit Stats, Moves, HP-Bar | `PartyPanel` |
| Battle View mit Damage Calc, KO-Chances, Crit-Ranges | `BattleView` |
| Speed-Vergleich (inkl. Stat-Stages, Paralysis) | `BattleView > SpeedIndicator` |
| Move Effectiveness + STAB Overlay | `BattleView`, `PartyPanel` |
| Switch-In Advisor (Top 3 Kandidaten, Scoring) | `BattleView`, `switchin-calc` |
| Team Defensive Weaknesses + Offensive Coverage Gaps | `TeamWeaknesses`, `chat-context` |
| Graveyard mit Todesursache (Gegner, Level, wild/trainer) | `Graveyard`, `useGraveyard` |
| Auto-Clear bei Run-Reset (Game-Wechsel, Badge-Reset) | `useGraveyard` |
| Multi-Game Level Caps (alle 9 NDS-Spiele) | `game-data` |
| AI Chat Advisor mit vollem Kampf-Kontext | `ChatPanel`, `chat-context` |
| Healing Inventory | `HealingInventory` |
| Route Encounters (gesehene Pokemon pro Route) | `RouteEncounters` |
| Nuzlocke Status + Warnungen | `NuzlockeTracker` |
| Pokecenter-Counter mit Dringlichkeit | `ProgressBar`, `chat-context` |
| Badge Progress + Timer | `ProgressBar` |
| Active Battle Pokemon Tracking (PID-basiert) | `Network.lua`, `page.tsx` |
| Battle-Memory Party Data (aktuelle HP im Kampf) | `Network.lua`, `BattleHandlerBase` |

---

## P0 — Quick Wins (< 1h, hoher Nutzen)

### Natur-Hervorhebung in Stat-Bars
**Status:** next
**Aufwand:** Sehr klein (< 20 Zeilen)
**Dateien:** `PartyPanel.tsx`, `StatBar.tsx`

Aktuell steht nur "Adamant" als Text. Stattdessen:
- Gruen markieren welcher Stat geboosted wird (+10%)
- Rot markieren welcher Stat gesenkt wird (-10%)
- Direkt in den Stat-Bars oder als farbige Pfeile
- Nature-ID Encoding: `floor(id/5)` = Boost, `id % 5` = Penalty (0=ATK, 1=DEF, 2=SPE, 3=SPA, 4=SPD)

---

### Held-Item-Tooltip auf Party-Karten
**Status:** next
**Aufwand:** Sehr klein (< 15 Zeilen)
**Dateien:** `PartyPanel.tsx`

`getItemShortDesc()` existiert bereits, wird aber nur im Battle View genutzt. Auf der Party-Karte steht nur der Item-Name. Zeige die Kurzbeschreibung als Tooltip oder inline.

---

### Ability-Beschreibung auf Party-Karten
**Status:** next
**Aufwand:** Sehr klein (< 15 Zeilen)
**Dateien:** `PartyPanel.tsx`

Gleich wie Item-Tooltip: `getAbilityShortDesc()` existiert, wird im Battle View genutzt aber nicht in der Party-Uebersicht.

---

## P1 — Kleine Features (1-3h, mittlerer Nutzen)

### EV/IV-Schaetzung
**Status:** planned
**Aufwand:** Klein
**Dateien:** Neue `iv-calc.ts`, `PartyPanel.tsx`, `StatBar.tsx`

Aus Level + Base Stats + Nature + EVs (vom Tracker verfuegbar) lassen sich IV-Ranges berechnen:
```
IV = floor(((Stat / NatureMod - 5) * 100 / Level - 2 * BaseStat - EV/4))
```
- Farbige Markierung der Stat-Bars: Blau = hohe IVs, Grau = niedrige
- Tooltip mit IV-Range (z.B. "28-31")
- EVs sind bereits im Lua-Export vorhanden (`HP_EV`, `ATK_EV`, etc.), werden aber noch nicht ans Frontend gesendet

**Vorbedingung:** EV-Daten muessen in Network.lua exportiert werden (Block A, Offsets 16-26).

---

### Evolutions-Vorschau
**Status:** planned
**Aufwand:** Klein-Mittel (Daten-Tabelle noetig)
**Dateien:** Neue `evolution-data.ts`, `PartyPanel.tsx`

- Pro Party-Mon zeigen: "Evolves at Lv.36" oder "Needs Moon Stone" oder "Trade (nicht moeglich!)"
- Warnung bei unmoglichen Evos (Trade-Evos in Nuzlocke)
- Move-Learning-Vorschau: "Lernt Close Combat bei Lv.38"
- Datenquelle: `EvoDataGen4.lua` / `EvoDataGen5.lua` koennten als JSON exportiert werden, oder statische Tabelle im Frontend

---

### Natur-Filter / Pokemon-Bewertung
**Status:** planned
**Aufwand:** Klein
**Dateien:** `PartyPanel.tsx`

Quick-Check Indikator:
- Natur passt zum Pokemon (z.B. Adamant fuer physische Angreifer) = gruen
- Natur ist neutral = gelb
- Natur senkt den wichtigsten Stat = rot
- Basierend auf Base Stats: hoechster Angriffs-Stat bestimmt ob physisch/speziell

---

### Badge-Splits / Timer-Details
**Status:** planned
**Aufwand:** Klein
**Dateien:** `ProgressBar.tsx`, neuer `useBadgeSplits` Hook

- Timer laeuft schon, aber zeige Badge-Splits (Zeit pro Badge)
- Speichere Zeitpunkt jedes Badge-Erhalts in localStorage
- Anzeige: "Badge 3: +12:34" neben dem Badge-Icon
- Nuetzlich fuer Speedrun-Tracking

---

### Battle History Log
**Status:** planned
**Aufwand:** Klein-Mittel
**Dateien:** Neuer `useBattleHistory` Hook, neue `BattleHistory.tsx` Komponente

- Logge letzte 10-15 Kaempfe (Gegner, Ergebnis, Schaden genommen/ausgeteilt)
- Zeige als kompakte Liste in der Sidebar
- Erkennt Muster: "3 von 5 Deaths waren gegen Water-Types"
- Nuetzlich fuer die AI: "Basierend auf deiner Battle History..."

---

## P2 — Mittlere Features (3-6h)

### Encounter Checklist
**Status:** planned
**Aufwand:** Mittel
**Dateien:** Neue `EncounterChecklist.tsx`, erweiterte `useEncounters` Hook

- Pro Route: gefangen / verpasst / noch offen
- Persistent in localStorage
- Visueller Fortschrittsbalken
- "Remaining Encounters" Counter
- Integration mit Route Encounters Daten

---

### Kontextuelle Auto-Tipps
**Status:** planned
**Aufwand:** Mittel
**Dateien:** Neuer `useAutoTips` Hook, neue `AutoTips.tsx` Komponente

Automatische Warnungen ohne Chat-Frage:
- "Naechster Gym: Fantina (Ghost) — du hast keinen Dark/Ghost-Move"
- "Dein Lead hat nur 23% HP — heile vor dem naechsten Trainer"
- "Garchomp ist schneller als dein gesamtes Team"
- Trigger-basiert, dezente Toast-Benachrichtigungen
- Nutzt vorhandene Daten: `game-data`, `type-effectiveness`, `damage-calc`

---

### Typ-Coverage-Matrix UI
**Status:** planned
**Aufwand:** Mittel
**Dateien:** Neue `CoverageMatrix.tsx` Komponente

- Heatmap: welche Typen deckt das Team offensiv ab
- Pro Move-Typ eine Spalte, pro Team-Member eine Zeile
- Farbcodiert: Gruen = STAB super-effective, Gelb = super-effective, Grau = neutral, Rot = Luecke
- Coverage Gaps sind bereits im `chat-context` berechnet — nur UI fehlt

---

### OBS Browser-Source Modus
**Status:** idea
**Aufwand:** Mittel
**Dateien:** Neues `/obs` Route, eigenes Layout

- Kompakt-Layout mit transparentem Hintergrund
- Nur Party + Battle Info, kein Chat
- URL-Parameter fuer Konfiguration: `?panels=party,battle&theme=transparent`
- CSS: `background: transparent`, keine Borders
- Fuer Streamer als Browser-Source in OBS

---

## P3 — Groessere Features (6h+)

### Trainer-Datenbank
**Status:** idea
**Aufwand:** Gross (Daten-Tabelle)
**Dateien:** Neue `trainer-data.ts`, `TrainerPreview.tsx`

- Alle Trainer pro Route mit Teams (Pokemon, Level, Moves)
- Warnung bei gefaehrlichen Trainern auf der naechsten Route
- Gym Leader Detail-Ansicht: volles Team, Items, KI-Verhalten
- Hinweis: Trainer-Teams sind in Randomizern meist NICHT random — Daten bleiben nuetzlich
- Datenquelle: `TrainerData.lua` koennte exportiert werden

---

### Randomizer-Support
**Status:** idea
**Aufwand:** Gross

- Run-Modus Toggle: Vanilla / Randomized
- Bei Randomized: keine statischen Encounter-Tipps, AI fokussiert auf beobachtete Daten
- Live Encounter Discovery: progressives Aufdecken der Randomizer-Karte
- Optional: Universal Pokemon Randomizer Log-Import

---

### Soul Link Erweiterungen
**Status:** idea
**Aufwand:** Gross

- Partner-Tracker Integration (zweiter SSE-Stream)
- Link-Management UI: Pokemon per Route verlinken
- Death-Cascade-Warnung: "Linked Partner muss auch sterben"
- Geteilte Notizen zwischen Spielern

---

### Run History & Statistiken
**Status:** idea
**Aufwand:** Mittel-Gross

- Abgeschlossene Runs speichern (Win/Loss, Team, Dauer, Deaths)
- Run-Vergleich Dashboard
- Gesamt-Statistiken: Win-Rate, gefaehrlichste Stellen, beliebteste Pokemon
- Export als JSON

---

### Stream Integration
**Status:** idea
**Aufwand:** Gross

- Twitch Chat Commands: `!team`, `!deaths`, `!levelcap`
- OBS Overlay-Modus (siehe P2)
- StreamElements/Streamlabs Widget-Export

---

## Priorisierungs-Matrix

| Prio | Feature | Aufwand | Impact | Abhaengigkeit |
|------|---------|---------|--------|---------------|
| P0 | Natur-Hervorhebung Stat-Bars | XS | Hoch | Keine |
| P0 | Item-Tooltip Party | XS | Mittel | Keine |
| P0 | Ability-Beschreibung Party | XS | Mittel | Keine |
| P1 | EV/IV-Schaetzung | S | Hoch | EV-Export aus Lua |
| P1 | Evolutions-Vorschau | S-M | Hoch | Evo-Daten |
| P1 | Pokemon-Bewertung (Natur) | S | Mittel | Keine |
| P1 | Badge-Splits | S | Mittel | Keine |
| P1 | Battle History Log | S-M | Mittel | Keine |
| P2 | Encounter Checklist | M | Mittel | Keine |
| P2 | Auto-Tipps | M | Hoch | Keine |
| P2 | Coverage-Matrix UI | M | Mittel | Keine |
| P2 | OBS Browser-Source | M | Mittel (Streamer) | Keine |
| P3 | Trainer-Datenbank | L | Hoch | Trainer-Daten |
| P3 | Randomizer-Support | L | Hoch (Random) | Run-Modus Config |
| P3 | Soul Link Erweiterungen | L | Hoch (Soul Link) | Partner-Tracker |
| P3 | Run History | M-L | Mittel | Persistence Layer |
| P3 | Stream Integration | L | Mittel (Streamer) | OBS-Modus |
