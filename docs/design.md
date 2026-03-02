# Design Document - travelAgent (MVP)

## 1. Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────┐
│                    React Application                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐        ┌──────────────────┐       │
│  │    Pages/Routes  │        │   Components     │       │
│  │  - HomePage      │────────│  - RouteMap      │       │
│  │  - RouteEditor   │        │  - LeftPanel     │       │
│  └──────────────────┘        │  - RouteInfo     │       │
│           ▲                   │  - POIList       │       │
│           │                   └──────────────────┘       │
│           └────────────────┬───────────────────┘        │
│                            │                             │
│                    ┌───────▼────────┐                    │
│                    │ Zustand Stores │                    │
│                    │ - routeStore   │                    │
│                    │ - poiStore     │                    │
│                    │ - mapStore     │                    │
│                    └───────┬────────┘                    │
│                            │                             │
│                    ┌───────▼────────────┐                │
│                    │    Services        │                │
│                    │ - routeService     │                │
│                    │ - poiService       │                │
│                    │ - storageService   │                │
│                    │ - valhallaService◆ │ (Phase 2)     │
│                    │ - nominatimService │                │
│                    │ - overpassService  │                │
│                    └───────┬────────────┘                │
│                            │                             │
│         ┌──────────────────┼──────────────────┐         │
│         │                  │                  │         │
│    ┌────▼──────┐   ┌──────▼──────┐  ┌───────▼─────┐   │
│    │ localStorage│  │ Nominatim   │  │ Overpass    │   │
│    │ (Routes)   │  │ (Geocoding) │  │ (POIs)      │   │
│    └────────────┘  └─────────────┘  └─────────────┘   │
│                                                          │
│              ◆ Valhalla API (Phase 2)                   │
│    http://localhost:8002 (self-hosted or cloud)        │
│    Profiles: bike, ebike, pedestrian, etc.             │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 2. Data Model

### Route
```typescript
interface Route {
  id: string;                    // UUID
  name: string;                  // z.B. "Tour du Mont Blanc"
  description?: string;
  difficultyLevel: "easy" | "medium" | "hard";
  points: RoutePoint[];          // Punkte der Route
  pois: PointOfInterest[];       // Infrastruktur-Punkte
  createdAt: number;             // Timestamp
  updatedAt: number;
  metadata: {
    distanceKm?: number;         // Berechnete Länge
    estimatedDurationHours?: number;
    tags?: string[];
  };
}

interface RoutePoint {
  id: string;
  lat: number;
  lng: number;
  order: number;                 // Position in der Route
  label?: string;                // z.B. "Café at km 15"
}
```

### Point of Interest (POI)
```typescript
interface PointOfInterest {
  id: string;
  routeId: string;               // Referenz zur Route
  type: "restaurant" | "café" | "bakery" | "hotel";
  name: string;
  lat: number;
  lng: number;
  distanceFromRouteKm?: number;  // ungefähre Entfernung
  notes?: string;                // Benutzer-Notizen
  createdAt: number;
}
```

### Storage Schema (localStorage)
```
localStorage Key: "travelAgent_routes"
Value: {
  version: "1.0",
  routes: Route[],
  lastUpdated: number
}
```

## 3. State Management (Zustand)

### routeStore
- `routes: Route[]` - alle Routen
- `currentRoute: Route | null` - aktiv bearbeitete Route
- `addRoute(route)` - neue Route erstellen
- `updateRoute(id, updates)` - Route aktualisieren
- `deleteRoute(id)` - Route löschen
- `loadRoute(id)` - Route zum Bearbeiten laden
- `setCurrentRoute(route)` - aktive Route setzen

### mapStore
- `mapCenter: [lat, lng]` - Kartenmittelpunkt
- `zoomLevel: number` - Zoom-Level
- `selectedMapFeature: id | null` - ausgewählter Punkt/POI
- `setMapCenter(lat, lng)` - Kartenmittelpunkt setzen
- `setZoomLevel(level)` - Zoom ändern
- `setSelectedFeature(id)` - Feature auswählen

### poiStore
- `selectedPOIType: POIType | null` - aktuell zu erstellender POI-Typ
- `editingPOI: PointOfInterest | null` - POI im Bearbeitungsmodus
- `setSelectedPOIType(type)` - POI-Typ für Erstellung
- `setEditingPOI(poi)` - POI zum Bearbeiten laden

## 4. Services

### routeService
```typescript
- createRoute(name, difficultyLevel): Route
- updateRoute(route): Route
- deleteRoute(id): void
- calculateDistance(points): number
- getRouteStats(route): { distance, duration, elevation }
```

### poiService
```typescript
- addPOI(routeId, poi): void
- updatePOI(routeId, poi): void
- deletePOI(routeId, poiId): void
- getPOIsForRoute(routeId): PointOfInterest[]
- calculateDistanceFromRoute(poi, route): number
```

### storageService
```typescript
- saveRoutes(routes): void
- loadRoutes(): Route[]
- exportRoute(route): JSON string
- importRoute(jsonString): Route
- clearStorage(): void
```

### valhallaService (Phase 2+)
```typescript
- calculateRoute(waypoints: Coordinate[], mode: 'bike'|'ebike'|'pedestrian'): RouteGeometry
- getElevationProfile(route: Route): ElevationData[]
- calculateRoutingStats(route: Route): { distance, duration, elevation_gain, elevation_loss }
- getRouteGeometry(waypoints): GeoJSON LineString
```

## 5. Component Hierarchy

```
App
├── Header
│   ├── Logo
│   └── Navigation
├── MainLayout (2-spaltig)
│   ├── Sidebar (links)
│   │   ├── RouteList
│   │   │   ├── RouteItem
│   │   │   ├── RouteActions
│   │   │   └── NewRouteButton
│   │   └── POIForm (wenn aktive Route)
│   │       ├── POITypeSelector
│   │       ├── POINameInput
│   │       └── POINotesInput
│   │
│   └── MapPanel (rechts)
│       ├── RouteMap (Leaflet)
│       ├── MapControls
│       │   ├── ZoomControls
│       │   └── DrawingControls
│       ├── RouteInfo
│       │   ├── RouteName
│       │   ├── DifficultyLevel
│       │   ├── DistanceDisplay
│       │   └── RouteActions
│       │       ├── EditButton
│       │       ├── DeleteButton
│       │       ├── ExportButton
│       │       └── ImportButton
│       └── POIList
│           └── POIItem (mit Edit/Delete)
└── Footer
    └── StatusBar
```

## 6. User Flows

### Flow 1: Route erstellen
1. Benutzer klickt "Neue Route"
2. Route wird mit Default-Namen erstellt
3. Zustand wechselt in "Zeichnungsmodus"
4. Benutzer klickt auf Karte → RoutePoints werden hinzugefügt
5. Benutzer weist Schwierigkeitslevel zu
6. Benutzer speichert Route (localStorage)

### Flow 2: POI hinzufügen
1. Route ist geladen/aktiv
2. Benutzer wählt POI-Typ (Restaurant, Hotel, etc.)
3. Benutzer klickt auf Karte an POI-Position
4. POI-Form öffnet sich
5. Benutzer gibt Name und Notizen ein
6. POI wird gespeichert (mit Route)

### Flow 3: Route exportieren
1. Benutzer lädt Route
2. Klickt "Exportieren"
3. JSON-Datei wird heruntergeladen
4. JSON enthält komplette Route mit POIs

### Flow 4: Route importieren
1. Benutzer klickt "Importieren"
2. Wählt JSON-Datei
3. Route wird validiert
4. Route wird in localStorage gespeichert
5. Wird in Liste angezeigt

## 7. Technische Entscheidungen

### Browser Storage statt Backend
**Entscheidung**: localStorage für MVP (REQ-003, REQ-022)
- **Rationale**: Schneller MVP ohne Backend-Setup
- **Limitationen**: Keine Cloudisierung, keine Mehrbenutzer-Synchronisation
- **Future**: Kann zu SQLite/REST-API migriert werden

### Zustand statt Redux/Context
**Entscheidung**: Zustand für State-Management
- **Rationale**: Weniger boilerplate, gute Performance, einfach zu testen
- **Stores**: Separate Stores pro Domain (nicht alles in 1 Store)

### React Router für Navigation
**Entscheidung**: Client-seitige Routing
- **Routes**:
  - `/` - RouteList
  - `/route/:id` - RouteDetail/Editor
  - `/settings` - Einstellungen (future)

### Leaflet + React-Leaflet
**Entscheidung**: Nicht raw Leaflet API
- **Rationale**: bessere React-Integration
- **Mapbox**: Nicht im MVP (kostet, externe Abhängigkeit)

### Valhalla für Routenberechnung (Phase 2)
**Entscheidung**: Valhalla statt OSRM oder Google Directions API
- **Rationale**: 
  - Open Source, selbst hostbar
  - Excellent Fahrrad-Routing ("Bicycle" Profile)
  - Höhendaten Integration (Elevation API)
  - Unterstützt Multiple Transportmodi (car, pedestrian, bike, scooter)
  - Kostenlos selbst zu hosten, keine API-Keys erforderlich
- **Integration**:
  - Optional selbst hosten oder use Valhalla API service
  - Route calculation zwischen Wegpunkten
  - Elevation-Profil generieren
  - Routing-Statistiken (Distanz, Zeit, Schwierigkeit)
- **MVP**: Wegpunkte werden manual erstellt (Haversine distance)
- **Phase 2**: Valhalla für optimale Fahrraddwege ersetzen

### TDD Approach
**Entscheidung**: Tests vor Implementation (REQ-025)
- **Frontend-Tests**: Jest + React Testing Library
- **Test-Struktur**: Component.test.tsx neben Component.tsx
- **Coverage-Ziel**: ≥ 80% für Business Logic

## 8. File Structure (Target) - Phase 3 Backend

```
src/
├── types/
│   ├── route.ts
│   ├── poi.ts
│   └── index.ts
│
├── store/
│   ├── routeStore.ts
│   ├── mapStore.ts
│   ├── poiStore.ts
│   └── index.ts
│
├── services/
│   ├── backendRouteService.ts    # NEW: Backend API calls
│   ├── backendElevationService.ts # NEW: Backend elevation proxy
│   ├── routeService.ts
│   ├── poiService.ts
│   ├── storageService.ts
│   ├── valhallaService.ts        # (deprecated - moved to backend)
│   └── index.ts
│
├── hooks/
│   ├── useRoute.ts
│   ├── useMap.ts
│   ├── usePOI.ts
│   ├── useLocalStorage.ts
│   └── index.ts
│
├── components/
│   ├── Layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MapPanel.tsx
│   │   └── Footer.tsx
│   │
│   ├── Routes/
│   │   ├── RouteList.tsx
│   │   ├── RouteItem.tsx
│   │   ├── RouteMap.tsx
│   │   ├── RouteInfo.tsx
│   │   ├── RouteCalculator.tsx
│   │   └── ElevationProfile.tsx
│   │
│   ├── POIs/
│   │   ├── POIForm.tsx
│   │   ├── POIList.tsx
│   │   ├── POIItem.tsx
│   │   └── POITypeSelector.tsx
│   │
│   └── Common/
│       ├── ConfirmDialog.tsx
│       ├── Button.tsx
│       └── Input.tsx
│
├── pages/
│   ├── HomePage.tsx
│   ├── RouteEditorPage.tsx
│   └── RouteDetailPage.tsx
│
├── utils/
│   ├── validation.ts
│   ├── calculations.ts
│   ├── formatting.ts
│   └── constants.ts
│
├── App.tsx
├── App.css
└── index.tsx

server/
├── db.js                    # NEW: SQLite initialization
├── server.js                # Express app (refactored)
│
├── services/                # NEW
│   ├── valhallaService.js   # Valhalla API wrapper
│   ├── elevationService.js  # Elevation calculations
│   ├── routeService.js      # Route CRUD
│   └── index.js
│
├── routes/                  # NEW
│   ├── routeRoutes.js       # Route API endpoints
│   ├── elevationRoutes.js   # Elevation API endpoint
│   └── index.js
│
├── middleware/              # NEW
│   ├── errorHandler.js      # Error handling
│   ├── validation.js        # Input validation
│   └── index.js
│
├── tests/                   # NEW
│   ├── routes.test.js       # Route calculation tests
│   ├── elevation.test.js    # Elevation tests
│   ├── routes-db.test.js    # CRUD tests
│   └── e2e.test.js          # End-to-end tests
│
├── package.json
├── server.test.js           # Main test runner
└── README.md
```

## 9. API Contracts (localStorage)

### GET /localStorage
```json
{
  "travelAgent_routes": {
    "version": "1.0",
    "routes": [
      {
        "id": "uuid-1",
        "name": "Alpenüberquerung",
        "difficultyLevel": "hard",
        "points": [
          { "id": "p1", "lat": 47.5, "lng": 10.5, "order": 0 },
          { "id": "p2", "lat": 47.6, "lng": 10.6, "order": 1 }
        ],
        "pois": [
          {
            "id": "poi-1",
            "routeId": "uuid-1",
            "type": "hotel",
            "name": "Hotel Alpenrose",
            "lat": 47.55,
            "lng": 10.55
          }
        ],
        "createdAt": 1234567890,
        "updatedAt": 1234567890,
        "metadata": { "distanceKm": 250 }
      }
    ],
    "lastUpdated": 1234567890
  }
}
```

## 10. Traceability

| Design Element | Requirement IDs |
|---|---|
| RouteStore | REQ-001, REQ-003, REQ-004, REQ-005, REQ-006 |
| MapComponent | REQ-010, REQ-011, REQ-012 |
| RouteCalculation | REQ-012b, REQ-012c, REQ-012d (Phase 2) |
| Valhalla Service | REQ-012b, REQ-012c, REQ-012d, REQ-012e (Phase 2) |
| POIForm/List | REQ-014, REQ-015, REQ-017, REQ-018, REQ-019 |
| Export/Import | REQ-020, REQ-021 |
| DifficultyLevel UI | REQ-007, REQ-008, REQ-009 |
| StorageService | REQ-003, NFREQ-005 |
| TypeScript Types | NFREQ-001 |

## 11. Testing Strategy (TDD)

### Unit Tests
- `routeService.test.ts` - Route calculations, CRUD
- `poiService.test.ts` - POI operations
- `storageService.test.ts` - localStorage I/O
- `utils/*.test.ts` - Calculations, formatting

### Integration Tests (Component)
- `RouteMap.test.tsx` - Map rendering + POI interaction
- `RouteList.test.tsx` - Route list operations
- `POIForm.test.tsx` - POI form submission

### E2E Flow (Future)
- Create → Edit → Add POI → Export → Import → Delete

## 12. Known Limitations & Future

### MVP Limitations
- ❌ Keine echten Routenberechnung (manuell gezeichnet)
- ❌ Keine Höhendaten Integration
- ❌ Keine Benutzerkonten
- ❌ Keine Cloud-Synchronisation
- ❌ Keine Offline-Karten
- ❌ localStorage-Limit (~5MB)

### Phase 2 Enhancements (Routing)
- ✅ Valhalla Integration für Routenberechnung
- ✅ Fahrrad-optimierte Routing (Fahrradwege bevorzugen)
- ✅ Höhendaten & Elevation-Profil
- ✅ Verschiedene Transportmodi
- ✅ Routenoptimierung (kürzeste/schnellste/angenehmste)

### Future Enhancements (Phase 3+)
- Real POI APIs (Overpass, Google Places)
- Backend Server (Node.js + SQLite)
- User Accounts & Auth
- Route Sharing (mit Link oder Benutzer)
- Elevation Profile
- GPX Import/Export
- Analytics & Statistics
- PWA / Offline Support
