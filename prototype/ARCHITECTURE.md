# Architektur & Komponenten-Struktur

## Component Hierarchy

```
<App>
  ├── <RouteMap />          ← Fullscreen Leaflet Map (z: 0)
  ├── <WaypointInput />     ← Left Panel (z: 40)
  ├── <POIFilterButtons />  ← Bottom Panel (z: 40)
  └── <Header />            ← Top Bar (z: 50)
```

## File Structure

```
prototype/
├── src/
│   ├── components/
│   │   ├── RouteMap.tsx           (94 lines) - Leaflet map with layers
│   │   ├── WaypointInput.tsx       (125 lines) - Waypoint editor
│   │   ├── POIFilterButtons.tsx    (107 lines) - NEW: POI category filters
│   │   ├── POISearch.tsx           (old, not used in new layout)
│   │   ├── POIList.tsx             (old, not used in new layout)
│   │   └── RouteInfo.tsx           (old, not used in new layout)
│   ├── store/
│   │   ├── routeStore.ts           (Zustand: routes)
│   │   └── poiStore.ts             (Zustand: POI results + filters)
│   ├── services/
│   │   └── overpassService.ts      (Overpass API + mock data)
│   ├── App.tsx                     (REDESIGNED: fullscreen layout)
│   ├── App.css                     (Leaflet + layout styles)
│   ├── index.css                   (Tailwind + fullscreen CSS)
│   └── main.tsx                    (Entry point)
├── postcss.config.cjs
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── package.json

Documentation/
├── UI_DESIGN.md                    (NEW: UI specifications)
├── IMPLEMENTATION_SUMMARY.md       (NEW: Implementation details)
├── CHANGES.md                      (NEW: What changed)
└── ARCHITECTURE.md                 (THIS FILE)
```

## State Management (Zustand)

### routeStore
```typescript
interface Route {
  name: string;
  coordinates: RouteCoordinate[];
  distance: number;
  duration: string;
  difficulty: 'easy' | 'moderate' | 'hard';
}

interface RouteStore {
  currentRoute: Route;
  setRoute: (route: Route) => void;
  getRoute: () => Route;
}
```

**Demo Route**: Berlin (7 waypoints, 52.52°N 13.40°E)

### poiStore
```typescript
interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'restaurant' | 'cafe' | 'hotel' | 'bakery' | 'attraction';
  address?: string;
}

interface POIStore {
  pois: POI[];
  loading: boolean;
  error: string | null;
  activeType: string;
  radius: number; // 1000m = 1km
  setPOIs: (pois: POI[]) => void;
  setLoading: (loading: boolean) => void;
  // ... etc
}
```

## Leaflet Layer Management

### RouteMap Component

```typescript
const mapInstance = useRef<L.Map>();
const routeLayerGroup = useRef<L.LayerGroup>();  // Route polyline + markers
const poiLayerGroup = useRef<L.LayerGroup>();     // POI circles

// Initialization (once)
L.map(container) + L.tileLayer() + scale control

// Updates (on route change)
routeLayerGroup.clearLayers()
  → L.polyline (blue dashed)
  → L.marker x N (waypoints)
  → mapInstance.fitBounds()

// Updates (on POI filter)
poiLayerGroup.clearLayers()
  → L.circleMarker x N (colored by type)
```

**Colors**:
- Route: Blue (#3b82f6), dashed
- Restaurant: Red (#ef4444)
- Café: Orange (#f97316)
- Bakery: Yellow (#eab308)
- Hotel: Blue (#3b82f6)
- Attraction: Purple (#a855f7)

## Data Flow

### 1. Route Planning
```
WaypointInput (user input)
  ↓ onChange → state
  ↓ "Route übernehmen" button
  → routeStore.setRoute()
  → RouteMap.useEffect([currentRoute])
  → Update route polyline + markers
  → fitBounds()
```

### 2. POI Search
```
POIFilterButtons (user click)
  ↓ handleFilterToggle()
  ↓ fetchPOIs(route, category)
  → overpassService.fetchPOIs()
  → Haversine distance filter (<= 1km)
  → poiStore.setPOIs()
  → RouteMap.useEffect([pois])
  → Update POI circle markers
```

### 3. API Integration
```
POIFilterButtons
  ↓ fetchPOIs(coordinates, type)
  → overpassService.buildBBox(coordinates)
  → overpassService.buildOverpassQuery(bbox, amenity)
  ↓ axios.post(OVERPASS_API)
  → Parse elements
  → Calculate distances
  → Filter (<= 1km)
  ↓ (on error) → MOCK_DATA fallback
  → setPOIs(results)
```

## Haversine Distance Formula

```typescript
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * π / 180;
  const dLng = (lng2 - lng1) * π / 180;
  const a = sin²(dLat/2) + cos(lat1) * cos(lat2) * sin²(dLng/2);
  const c = 2 * atan2(√a, √(1-a));
  return R * c; // distance in km
};
```

**Accuracy**: ±0.5% (good enough for 1km radius)

## CSS Z-Index Strategy

```
50  ← Header (top bar)
40  ← WaypointInput + POIFilterButtons (overlays)
 0  ← RouteMap (fullscreen background)
```

**Leaflet Controls** (auto-positioned):
- Zoom: top-left (doesn't overlap)
- Scale: bottom-right (visible)
- Attribution: bottom-left (visible)

## Production Build

```bash
pnpm build

Output:
dist/
├── index.html               (0.46 KB gzip)
├── assets/
│   ├── index-*.js           (123.75 KB gzip)
│   └── index-*.css          (7.98 KB gzip)
└── vite.svg
```

**Total Size**: ~132 KB gzip (very light!)

## Performance Characteristics

- **Initial Load**: ~2s (Vite HMR)
- **Route Update**: <100ms (re-render + Leaflet layer update)
- **POI Filter**: ~1s (API call to Overpass) + <100ms (map update)
- **Memory**: ~50MB (browser + Leaflet + React)
- **CPU**: Minimal (Leaflet is efficient with layers)

## Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✓ Tested | Fullscreen works |
| Safari | ✓ Expected | No known issues |
| Firefox | ✓ Expected | No known issues |
| Edge | ✓ Expected | Chromium-based |
| Mobile | ⚠️ Not optimized | Touch controls not yet implemented |

## Error Handling

### Overpass API Failures
```
Timeout (8s) or Error 504 (Gateway Timeout)
  → Log warning
  → Fall back to MOCK_DATA
  → User sees "Wird geladen..." then results
```

### Invalid Waypoint Input
```
NaN or missing coordinates
  → parseFloat() returns 0 or NaN
  → Route still renders (graceful degradation)
  → User can correct input
```

### Map Container Not Found
```
console.error('Map container not found')
→ Early return (component doesn't crash)
→ Map renders empty
```

## Future Enhancements

1. **Mobile Responsiveness**
   - Hamburger menu for waypoint editor
   - Floating action button for POI filters
   - Touch-optimized controls

2. **Route Features**
   - GPX/TCX file upload
   - Elevation profile
   - Turn-by-turn directions (OpenRouteService)
   - Route optimization

3. **Data Persistence**
   - localStorage for draft routes
   - IndexedDB for large route history
   - Cloud sync with user account

4. **Advanced Filtering**
   - Multi-category POI search
   - Custom radius per category
   - Rating/review filtering
   - Opening hours display

5. **Map Features**
   - 3D elevation view
   - Weather overlay
   - Traffic conditions
   - Satellite imagery toggle

