# Anforderungsspezifikation - travelAgent (MVP)

## 1. Funktionale Anforderungen

### 1.1 Routenerstellung und -verwaltung

| ID | Anforderung | Beschreibung | Erfolskriterium |
|---|---|---|---|
| REQ-001 | Route erstellen | Benutzer kann neue Routen erstellen | Route wird mit Name, Schwierigkeitslevel und Beschreibung gespeichert |
| REQ-002 | Route auf Karte zeichnen | Benutzer kann Route visuell auf Karte zeichnen | Punkte können auf Karte angeklickt werden und verbinden sich zu einer Linie |
| REQ-003 | Route speichern | Erstellte Route wird lokal gespeichert | Route wird in Browser-Storage persistiert und ist nach Seiten-Reload noch vorhanden |
| REQ-004 | Route laden | Benutzer kann gespeicherte Routen laden | Liste aller gespeicherten Routen wird angezeigt und kann ausgewählt werden |
| REQ-005 | Route bearbeiten | Benutzer kann bestehende Route modifizieren | Punkte können hinzugefügt, gelöscht oder verschoben werden |
| REQ-006 | Route löschen | Benutzer kann Route aus Speicher entfernen | Nach Bestätigung wird Route gelöscht und nicht mehr in Liste gezeigt |

### 1.2 Schwierigkeitslevel

| ID | Anforderung | Beschreibung | Erfolskriterium |
|---|---|---|---|
| REQ-007 | Schwierigkeitslevel setzen | Routen können Schwierigkeitslevel zugewiesen bekommen | Level: Easy, Medium, Hard; wird mit Route gespeichert |
| REQ-008 | Schwierigkeitslevel visuell darstellen | Level wird auf UI erkennbar gemacht | Unterschiedliche Farben/Icons für verschiedene Level |
| REQ-009 | Nach Level filtern | Routen nach Schwierigkeitslevel filtern | Filter in Route-Liste funktioniert |

### 1.3 Kartenfunktionalität

| ID | Anforderung | Beschreibung | Erfolskriterium |
|---|---|---|---|
| REQ-010 | Karte anzeigen | Interaktive Karte wird angezeigt | Leaflet-Karte wird geladen und ist navigierbar (Pan, Zoom) |
| REQ-011 | Route auf Karte visualisieren | Aktuelle/geladene Route wird auf Karte gezeigt | Route als Linie mit Start- und Endpunkt-Markern |
| REQ-012 | Routenlänge berechnen | System berechnet Länge der Route | Länge in km wird angezeigt und aktualisiert sich bei Änderungen |
| REQ-013 | Höhenprofil anzeigen | Optional: Höhenverlauf der Route | Grafische Darstellung des Höhenprofils (future: mit echten Höhendaten) |

### 1.3b Routenplanung & Berechnung

| ID | Anforderung | Beschreibung | Erfolskriterium |
|---|---|---|---|
| REQ-012b | Fahrrad-optimierte Routenberechnung | System plant Routen basierend auf Straßennetz | Route wird zwischen Wegpunkten berechnet, bevorzugt Fahrradwege |
| REQ-012c | Routenoptimierung nach Kriterien | Route kann nach verschiedenen Kriterien optimiert werden | Optionen: kürzeste Distanz, schnellste Zeit, angenehme Strecke (Vermeidung Hauptstraßen) |
| REQ-012d | Höhendaten in Routenberechnung | Höhendaten fließen in Berechnung ein | Steigungen und Gefälle werden berücksichtigt, Schwierigkeitslevel wird berechnet |
| REQ-012e | Verschiedene Transportmodi | System unterstützt verschiedene Fahrtmodi | Modi: Fahrrad (Standard), E-Bike, Rennrad, MTB (Geländefahrten) |

### 1.4 Punkte von Interesse (POI) & Infrastruktur

| ID | Anforderung | Beschreibung | Erfolskriterium |
|---|---|---|---|
| REQ-014 | POIs auf Route hinzufügen | Benutzer kann Restaurants, Cafés, Bäckereien, Hotels auf Route eintragen | POI-Typ wird ausgewählt, Position auf Karte gesetzt, wird mit Route gespeichert |
| REQ-015 | POI-Typ klassifizieren | POIs haben Kategorien | Kategorien: Restaurant, Café, Bakery, Hotel (erweiterbar) |
| REQ-016 | POIs auf Karte anzeigen | POIs werden visuell auf Karte dargestellt | Verschiedene Icons/Farben für verschiedene POI-Typen |
| REQ-017 | POI-Details anzeigen | Klick auf POI zeigt Details (Name, Typ, Notizen) | Pop-up oder Side-Panel mit POI-Informationen |
| REQ-018 | POI-Details bearbeiten | Benutzer kann POI-Informationen ändern | Name, Typ, Notizen können aktualisiert werden |
| REQ-019 | POI löschen | POI von Route entfernen | POI wird aus Liste und von Karte gelöscht |

### 1.5 Teilen & Export

| ID | Anforderung | Beschreibung | Erfolskriterium |
|---|---|---|---|
| REQ-020 | Route als JSON exportieren | Route kann exportiert werden | JSON-Datei mit Route und POIs wird heruntergeladen |
| REQ-021 | Route importieren | Route aus JSON-Datei laden | Importierte Route wird in Speicher geladen und ist editierbar |
| REQ-022 | Route kopieren | Benutzter kann bestehende Route duplizieren | Kopie wird mit "-Copy" Suffix erstellt |

### 1.6 UI/UX

| ID | Anforderung | Beschreibung | Erfolskriterium |
|---|---|---|---|
| REQ-023 | Responsive Design | App funktioniert auf Desktop und Tablet | Layout passt sich an verschiedene Bildschirmgrößen an |
| REQ-024 | Intuitive Navigation | Hauptfunktionen sind leicht auffindbar | Menü/Navigation ist selbsterklärend |
| REQ-025 | Bestätigungsdialoge | Kritische Aktionen (Löschen) erfordern Bestätigung | Bestätigungsdialog vor Löschen von Routen/POIs |

---

## 2. Nicht-funktionale Anforderungen

| ID | Anforderung | Beschreibung | Erfolskriterium |
|---|---|---|---|
| NFREQ-001 | TypeScript Strict Mode | Code ist vollständig typisiert | Keine `any`-Typen außer wo absolut notwendig |
| NFREQ-002 | Performance | App lädt und reagiert schnell | Karte renderiert in <1s, POI-Operationen in <500ms |
| NFREQ-003 | Browser Kompatibilität | Moderne Browser werden unterstützt | Chrome, Firefox, Safari, Edge (letzte 2 Versionen) |
| NFREQ-004 | Offline-Funktionalität | App funktioniert offline | Nur mit localStorage (no Service Worker im MVP) |
| NFREQ-005 | Datenpersistenz | Daten gehen nicht verloren | localStorage bleibt über Sessions erhalten |

---

## 3. MVP-Scope vs. Future

### MVP (Phase 1)
- Routen zeichnen und speichern
- Grundlegende Kartenfunktionalität
- Routenlängen-Berechnung
- POI-Management (einfach)
- Export/Import als JSON
- Mock-Daten (keine echten APIs)
- Browser-Storage Persistierung

### Phase 2 (Routenplanung)
- Valhalla-Integration für Routenberechnung
- Fahrrad-optimierte Routing
- Höhendaten & Höhenprofil
- Verschiedene Transportmodi (Bike, E-Bike, MTB, Rennrad)
- Routenoptimierung nach Kriterien

### Future Releases (Phase 3+)
- Backend mit SQLite für persistente Speicherung
- Authentifizierung & Benutzerprofile
- Teilen von Routen mit anderen Nutzern
- Echte POI-APIs (OpenStreetMap Overpass, Google Places)
- Höhendaten Integration
- Offline-Karten
- Route-Statistiken & Analytics
- Social Features (Kommentare, Bewertungen)

---

## 4. Definitionen & Glossar

| Begriff | Definition |
|---|---|
| Route | Eine geplante Radstrecke mit Start-, End- und Zwischenpunkten |
| POI (Point of Interest) | Sehenswürdigkeit oder Infrastruktur-Punkt (Restaurant, Hotel, etc.) |
| Schwierigkeitslevel | Klassifizierung der Route: Easy, Medium, Hard |
| Browser-Storage | localStorage API für lokale Datenspeicherung im Browser |
| Mock-Daten | Beispieldaten statt echter API-Daten (für MVP) |

---

## 5. Annahmen & Constraints

### Annahmen
- Benutzer haben modernes Browser mit localStorage-Unterstützung
- Internetverbindung ist vorhanden (für Kartenkacheln)
- Routen sind zyklisch oder linear (keine komplexen Geometrien)

### Constraints
- Keine Benutzerauthentifizierung im MVP
- Keine Server-Seite Persistierung (nur localStorage)
- Keine echten POI-APIs im MVP (Mock-Daten)
- Maximale Route-Länge: praktisch begrenzt durch Browser-Speicher (~5MB localStorage)

---

## 6. Akzeptanzkriterien (gesamt)

✅ Benutzer kann Route zeichnen und speichern  
✅ Route wird nach Seiten-Reload noch angezeigt  
✅ Schwierigkeitslevel kann zugewiesen werden  
✅ POIs können auf Route hinzugefügt werden  
✅ Route kann exportiert und importiert werden  
✅ App ist responsive und funktioniert auf Tablet/Desktop  
✅ Keine kritischen TypeScript-Fehler  
✅ Code ist wartbar und getestet (TDD)
