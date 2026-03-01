# Implementierungsplan - travelAgent MVP Phase 2 (mit Valhalla-Routing)

## Übersicht

Dieser Plan dokumentiert die Schritte zur Fertigstellung des MVP Phase 2 mit integrierter Valhalla-Routenplanung. Das System wird Benutzern ermöglichen, Wegpunkte zu setzen und automatisch fahrradoptimierte Routen dazwischen zu berechnen.

## Phasen-Übersicht

### Phase 1 (Aktuell - Abgeschlossen)
✅ Grundlegende Route-Verwaltung:
- Route erstellen/speichern/laden
- Waypoints manuell hinzufügen (Nominatim Geocoding)
- Haversine-Distanzberechnung
- POI-Suche (Overpass API)
- Dark Mode & UI

### Phase 2 (Nächster MVP - Dieser Plan)
🔄 Valhalla-Integration für Routenplanung:
- Valhalla API Setup (Self-Hosted oder Cloud)
- Automatische Routenberechnung zwischen Wegpunkten
- Elevation-Profil & Steigungsdaten
- Routenoptimierung nach Profil (Fahrrad/E-Bike/Rennrad)
- Visualisierung von Steigungen auf Karte
- Routenstatistiken (Schwierigkeit, Höhenmeter)

### Phase 3+ (Future)
- Backend-Persistierung (SQLite)
- Benutzerkonten & Teilen
- Mobile App
- Offline-Karten
- Social Features

## Implementierungsschritte

### Sprint 1: Valhalla-Setup & API-Integration (1-2 Tage)

**1.1 Valhalla-Instanz Setup**
- [ ] Option A: Docker-Container lokal aufsetzen
  - `docker pull valhalla/valhalla`
  - Port 8002 mapping
  - Datenbanken (LZ4-komprimiert)
- [ ] Option B: Verwendung von Valhalla Cloud/Public API
  - Registrierung und API-Key
  - Fallback für Produktivumgebung
- [ ] Test-Requests mit curl/Postman

**1.2 valhallaService erstellen** (`src/services/valhallaService.ts`)
```typescript
interface ValhallaConfig {
  baseUrl: string;           // "http://localhost:8002"
  profile: 'bicycle' | 'ebike' | 'pedestrian' | 'bikeshare';
  costing_options?: {
    bicycle: {
      use_roads?: number;
      avoid_bad_surfaces?: boolean;
    };
  };
}

export const valhallaService = {
  // Hauptfunktion: Route zwischen Wegpunkten berechnen
  calculateRoute(waypoints, profile): Promise<RouteGeometry>,
  
  // Elevation-Daten für Route
  getElevationProfile(route): Promise<ElevationPoint[]>,
  
  // Route-Statistiken (Distance, Duration, Elevation)
  getRouteStats(route): Promise<RouteStats>,
  
  // Distanzmatrix (für multi-point-Optimierung)
  getDistanceMatrix(waypoints): Promise<DistanceMatrix>,
  
  // Fehlerbehandlung & Fallback
  handleError(error): Promise<Fallback>,
};
```

**1.3 Environment-Variablen**
- `.env.example`: `VITE_VALHALLA_API_URL=http://localhost:8002`
- `.env.local`: Aktuelle Konfiguration (git-ignored)

**Erfolgstest**: `curl http://localhost:8002/route?json=...` gibt valides GeoJSON zurück

---

### Sprint 2: Route-UI Integration (1-2 Tage)

**2.1 LeftPanel erweitern**
- [ ] Route-Name & Difficulty-Selector (bereits vorhanden, aber testen)
- [ ] Wegpunkte-Liste mit Indizes (A, B, C, ...)
- [ ] "Calculate Route" Button
- [ ] Loading-State beim Valhalla-Aufruf
- [ ] Error-Handling (Valhalla-Fehler anzeigen)

**2.2 RouteMap Visualization**
- [ ] Route als Polyline zeichnen (statt gerade Linie)
  - Farbe nach Schwierigkeit: Grün (easy) → Rot (hard)
  - Optional: Farbverlauf nach Steigung
- [ ] Wegpunkt-Marker mit Labels (A, B, C)
- [ ] Elevation-Profil anzeigen (Chart/Graph)
  - Optional: Steigungsprozente auf Strecke
- [ ] Route-Statistiken Panel
  - Gesamtdistanz
  - Höhenmeter (Aufstieg/Abstieg)
  - Geschätzte Dauer
  - Durchschnittliche Steigung

**2.3 RouteInfo Component Update**
```typescript
// Neue Felder:
- elevationGain: number          // Höhenmeter Aufstieg
- elevationLoss: number          // Höhenmeter Abstieg
- maxElevation: number           // Höchster Punkt
- minElevation: number           // Tiefster Punkt
- averageGrade: number           // Durchschnittliche Steigung %
- difficulty: 'easy' | 'medium' | 'hard'  // Auto-berechnet
- viaRoute: boolean              // true = Valhalla-Route, false = direkt
```

**Erfolgstest**: Nutzer setzt 2 Wegpunkte → Route wird berechnet & visualisiert

---

### Sprint 3: Elevation & Statistiken (1-2 Tage)

**3.1 Elevation-Profile Component** (`src/components/ElevationProfile.tsx`)
- [ ] Chart-Library (z.B. Recharts, Chart.js)
- [ ] X-Achse: Distanz (km)
- [ ] Y-Achse: Höhe (m)
- [ ] Hover-Info: aktuelle Position, Höhe, Steigung
- [ ] Farbcodierung: grün (flach) → rot (steil)
- [ ] Responsive Design

**3.2 Schwierigkeitsgrad-Berechnung**
```typescript
function calculateDifficulty(route: Route): 'easy' | 'medium' | 'hard' {
  const avgGrade = route.metadata.averageGrade || 0;
  const totalElevation = route.metadata.elevationGain || 0;
  const distance = route.metadata.distance || 0;
  
  // Heuristik:
  // Easy: < 50m Aufstieg + < 3% Steigung
  // Medium: 50-300m Aufstieg + 3-8% Steigung
  // Hard: > 300m Aufstieg + > 8% Steigung
}
```

**3.3 RouteInfo erweitern**
- [ ] Elevation-Profil anzeigen
- [ ] Statistiken-Table:
  - Distanz, Dauer, Aufstieg, Abstieg
  - Max Höhe, Min Höhe, Durchschnittliche Steigung
- [ ] Schwierigkeitslevel anzeigen (berechnet)

**Erfolgstest**: Route mit Valhalla berechnet → Profil & Stats angezeigt

---

### Sprint 4: Routenoptimierung & Fallback (1-2 Tage)

**4.1 Profil-Auswahl**
- [ ] UI-Control in LeftPanel
  - Options: Fahrrad (Standard), E-Bike, Rennrad, MTB, Zu Fuß
- [ ] Valhalla-Parameter updaten basierend auf Profil
  - `costing: 'bicycle' | 'bikeshare' | 'pedestrian' | 'scooter'`
  - Optionen wie `use_roads`, `avoid_bad_surfaces`, `avoid_unpaved`

**4.2 Error-Handling & Fallback**
- [ ] Valhalla-Timeout: 30s Warnung
- [ ] Valhalla-Fehler (503, 5xx): Fallback zu gerader Linie + Warnung
- [ ] Network-Fehler: Offline-Mode (localStorage-Route verwenden)
- [ ] Validierung: Min 2 Wegpunkte erforderlich

**4.3 Performance-Optimierung**
- [ ] Request-Debounce: 500ms nach Waypoint-Änderung
- [ ] Caching: Routen-Hash → berechnet Route (localStorage)
- [ ] Progressive Loading: Erste Route schnell, dann Elevation

**Erfolgstest**: Waypoints ändern → neue Route in < 2s

---

### Sprint 5: Testing & Dokumentation (1 Tag)

**5.1 Feature-Tests**
- [ ] Test: Valhalla-Route mit 2 Wegpunkten
- [ ] Test: Elevation-Profil korrekt
- [ ] Test: Schwierigkeitslevel berechnet
- [ ] Test: Profil-Wechsel aktualisiert Route
- [ ] Test: Fallback auf gerade Linie bei Valhalla-Fehler
- [ ] Test: Dark Mode kompatibel

**5.2 Dokumentation**
- [ ] README.md: Valhalla Setup-Anleitung
- [ ] implementation.md: Diese Datei aktualisieren mit Done-Status
- [ ] Inline-Kommentare: valhallaService und komplexe Logik

**5.3 Browser-Testing**
- [ ] Chrome, Firefox, Safari
- [ ] Mobile (iOS Safari, Android Chrome)
- [ ] Offline-Modus (DevTools)

---

## File-Struktur (Neu/Modifiziert)

### Neue Dateien
```
src/
├── services/
│   └── valhallaService.ts         # Valhalla API Integration
│
├── components/Routes/
│   ├── ElevationProfile.tsx        # Chart für Höhenprofil
│   ├── RouteMap.tsx                # Updated: Valhalla-Routing
│   ├── RouteInfo.tsx               # Updated: Elevation Stats
│   └── LeftPanel.tsx               # Updated: Profil-Selector
│
├── types/
│   ├── route.ts                    # Updated: elevationGain, etc.
│   └── valhalla.ts                 # Neue: Valhalla Interfaces
│
└── hooks/
    └── useValhalla.ts              # Optional: Custom Hook für Routing
```

### Modifizierte Dateien
- `src/store/routeStore.ts` - Valhalla-Status hinzufügen (loading, error)
- `src/services/routeService.ts` - calculateDifficulty() hinzufügen
- `src/components/Routes/LeftPanel.tsx` - Profil-Selector UI
- `src/components/Routes/RouteMap.tsx` - Polyline statt Linie
- `src/components/Routes/RouteInfo.tsx` - Elevation-Statistiken
- `.env.example` - VITE_VALHALLA_API_URL
- `.gitignore` - .env.local

---

## API-Verträge

### Valhalla POST /route

**Request:**
```json
{
  "locations": [
    {"lat": 52.52, "lon": 13.4},
    {"lat": 52.525, "lon": 13.41}
  ],
  "costing": "bicycle",
  "costing_options": {
    "bicycle": {
      "use_roads": 0.1,
      "avoid_bad_surfaces": true
    }
  },
  "shape_match": "map_snap",
  "filters": {
    "attributes": ["edge.id", "edge.length", "matched.point", "matched.type"],
    "action": "include"
  }
}
```

**Response:**
```json
{
  "trip": {
    "legs": [
      {
        "shape": "...",
        "maneuvers": [...],
        "summary": {
          "length": 5.234,
          "time": 1200,
          "cost": 1200
        }
      }
    ],
    "summary": {
      "length": 5.234,
      "time": 1200
    }
  }
}
```

### Valhalla POST /elevation

**Request:**
```json
{
  "shape": "encoded_polyline",
  "range": true
}
```

**Response:**
```json
{
  "shape": "...",
  "elevation": [42, 45, 48, ...]
}
```

---

## Abhängigkeiten

### Neue npm-Packages (Optional)
- `recharts` oder `chart.js` - Für Elevation-Chart
- (Valhalla selbst ist externe API, kein npm-Package nötig)

### Valhalla Setup
- Docker: `docker run -p 8002:8002 valhalla/valhalla`
- oder: Valhalla Public API / Custom Hosting

---

## Testing-Checkliste

### Unit Tests
- [ ] `valhallaService.calculateRoute()` - API-Aufruf mock
- [ ] `routeService.calculateDifficulty()` - Schwierigkeit-Heuristik
- [ ] Elevation-Profil-Berechnung aus Valhalla-Response

### Integration Tests
- [ ] LeftPanel: Waypoint setzen → Route berechnet
- [ ] RouteMap: Route visualisiert mit korrekten Koordinaten
- [ ] RouteInfo: Stats korrekt berechnet
- [ ] Dark Mode: ElevationProfile lesbar

### E2E Szenarien
1. **Happy Path**: Neue Route → 2 Wegpunkte → Route berechnet → Profil sichtbar
2. **Fehlerfall**: Valhalla offline → Fallback Gerade Linie
3. **Profil-Wechsel**: Fahrrad → E-Bike → Route ändert sich
4. **Speichern & Laden**: Route persistiert mit Valhalla-Geom

---

## Konfiguration & Deployment

### Lokal (Entwicklung)
```bash
# Valhalla starten
docker run -p 8002:8002 valhalla/valhalla

# .env.local
VITE_VALHALLA_API_URL=http://localhost:8002

# App starten
pnpm dev
```

### Production
```bash
# Option 1: Valhalla Cloud
VITE_VALHALLA_API_URL=https://api.valhalla.com

# Option 2: Self-Hosted
VITE_VALHALLA_API_URL=https://routing.example.com
```

---

## Qualitätsziele

| Metrik | Ziel | Status |
|--------|------|--------|
| Route-Berechnung < 2s | ✓ | Pending |
| Elevation-Profil < 500ms | ✓ | Pending |
| Fehlerrate < 1% | ✓ | Pending |
| Browser-Kompatibilität | Chrome, Firefox, Safari | Pending |
| Responsive auf Mobile | < 768px | Pending |
| TypeScript Coverage | Keine `any` Types | Pending |

---

## Timeline

| Sprint | Fokus | Dauer | Abhängigkeiten |
|--------|-------|-------|-----------------|
| 1 | Valhalla Setup & API | 1-2 Tage | Valhalla-Instanz |
| 2 | Route-UI Integration | 1-2 Tage | Sprint 1 |
| 3 | Elevation & Stats | 1-2 Tage | Sprint 2 |
| 4 | Optimierung & Fallback | 1-2 Tage | Sprint 3 |
| 5 | Testing & Docs | 1 Tag | Sprint 4 |
| **Gesamt** | **MVP Phase 2** | **5-9 Tage** | - |

---

## Nächste Schritte (Nach Phase 2)

- [ ] Phase 3: Backend (Node.js + SQLite)
- [ ] Phase 4: User Accounts & Auth
- [ ] Phase 5: Route Sharing
- [ ] Phase 6: Mobile App

---

## Kontaktinformation & Ressourcen

- **Valhalla Doku**: https://valhalla.readthedocs.io/
- **Valhalla GitHub**: https://github.com/valhalla/valhalla
- **Valhalla Docker Hub**: https://hub.docker.com/r/valhalla/valhalla
- **OpenStreetMap Tagging**: https://wiki.openstreetmap.org/wiki/Bicycle

---

**Letztes Update**: 2026-03-01  
**Status**: 📋 Plan ready for approval  
**Nächster Meilenstein**: Sprint 1 Valhalla Setup
