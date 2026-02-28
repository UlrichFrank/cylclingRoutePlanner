# Fahrrad-Routenplaner Prototyp

Ein funktionsfähiger Prototyp zur Validierung von:
1. **Routenplanung** - Anzeige einer Demo-Route auf interaktiver Karte
2. **POI-Suche** - Echte API-Integration zur Suche von Restaurants, Cafés, Hotels und Bäckereien entlang der Route

## ✅ Was wurde implementiert

### Struktur
```
prototype/
├── src/
│   ├── store/                   # Zustand State Management
│   │   ├── routeStore.ts       # Route State + Demo-Route Berlin
│   │   └── poiStore.ts         # POI State (restaurants, cafes, etc.)
│   ├── components/              # React Komponenten
│   │   ├── RouteMap.tsx        # Leaflet Karte mit Route & POI-Markern
│   │   ├── POISearch.tsx       # Suchformular (Typ, Radius)
│   │   └── POIList.tsx         # Ergebnisliste
│   ├── services/                # API & Business Logic
│   │   └── overpassService.ts  # Overpass API Integration
│   ├── App.tsx                  # Main App (Grid Layout)
│   └── index.css                # Tailwind CSS
├── tailwind.config.js           # Tailwind Configuration
├── postcss.config.js            # PostCSS für Tailwind
├── tsconfig.json                # TypeScript Config (strict mode)
└── package.json                 # Dependencies & Scripts
```

### Key Features

#### **1. Zustand Stores**
- `routeStore.ts`: Speichert aktuelle Route (mit Demo-Route Berlin)
- `poiStore.ts`: Verwaltet POI-Suchergebnisse, Loading & Error States

#### **2. Overpass API Service**
- Baut dynamisch Bounding Boxes um Route
- Konvertiert Route zu Overpass QL Query
- Sucht: Restaurants, Cafés, Hotels, Bäckereien
- Fehlerhandling & Logging

#### **3. React-Leaflet Integration**
- OpenStreetMap Basemap
- Route als blaue Polyline mit Markern
- POI-Marker in verschiedenen Farben (nach Typ)
- Popup-Informationen bei Klick

#### **4. UI/UX**
- Tailwind CSS für responsives Design
- Search Panel rechts (POI-Typ, Radius-Slider)
- Ergebnisliste mit Icons
- Gradient-Header & Footer

### Demo-Daten
- **Route**: Berlin City Tour (7 Punkte, 25km, easy)
- **Standard-Radius**: 500m (anpassbar via Slider)

## 🚀 Wie du es startest

```bash
cd prototype
npm install              # Installiert alle Dependencies
npm run dev              # Startet Vite Dev Server auf http://localhost:5173
```

## 📦 Dependencies

**Production:**
- react@19
- zustand (State Management)
- leaflet & react-leaflet (Karten)
- axios (HTTP Client)
- tailwindcss (CSS Framework)

## 🔧 Available Scripts

```bash
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview prod build locally
npm run type-check       # Check TypeScript types
npm run lint             # Run ESLint
```
