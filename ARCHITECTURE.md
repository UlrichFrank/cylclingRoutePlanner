# travelAgent Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│               http://localhost:5173                         │
├─────────────────────────────────────────────────────────────┤
│  • RouteMap (Leaflet)                                       │
│  • RouteCalculator (Valhalla profile selector)              │
│  • ElevationProfile (Recharts chart)                        │
│  • POI search (Overpass API)                                │
│  • Waypoint management (context menu)                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ CORS requests
                   ↓
┌─────────────────────────────────────────────────────────────┐
│           Backend (Express.js) - http://localhost:3001      │
├─────────────────────────────────────────────────────────────┤
│  • Elevation API Proxy (/api/elevation)                     │
│  • Route Storage (/api/routes)                              │
│  • Health Check (/health)                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ↓                     ↓
   ┌─────────────────┐  ┌──────────────┐
   │ Valhalla API    │  │ routes.json  │
   │ (Public SaaS)   │  │ (JSON file)  │
   │ Routing         │  │ Storage      │
   │ Elevation       │  │              │
   └─────────────────┘  └──────────────┘
```

## Data Flow

### 1. Route Calculation
```
User clicks 2+ waypoints → RouteCalculator.tsx
  ↓
Sends to valhallaService.calculateRoute()
  ↓
Calls: POST https://valhalla1.openstreetmap.de/route
  ↓
Decodes polyline geometry
  ↓
Stores in Zustand routeStore
  ↓
RouteMap.tsx renders polyline on Leaflet
```

### 2. Elevation Data
```
RouteCalculator calls getRouteStats()
  ↓
Sends geometry to valhallaService.getElevationProfile()
  ↓
Calls: POST http://localhost:3001/api/elevation (backend proxy)
  ↓
Backend forwards to: https://valhalla1.openstreetmap.de/elevation
  ↓
Returns elevation data
  ↓
ElevationProfile.tsx renders chart via Recharts
  ↓
Stats calculated (gain, loss, grade, difficulty)
```

### 3. Route Persistence
```
User saves route → RouteInfo.tsx (future)
  ↓
Sends to: POST http://localhost:3001/api/routes
  ↓
Backend saves to routes.json
  ↓
User can load saved routes anytime
```

## Technology Stack

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Radix UI** - Headless components
- **Zustand** - State management
- **Leaflet** - Map rendering
- **Recharts** - Elevation chart
- **React Router** - Navigation

### Backend
- **Express.js** - HTTP server
- **CORS** - Cross-origin requests
- **JSON** - Route storage (upgradeable to SQLite)

### External APIs
- **Valhalla** - Routing & elevation
- **Nominatim** - Geocoding (future)
- **Overpass** - POI search

## Directory Structure

```
travelAgent/
├── src/
│   ├── components/
│   │   ├── Routes/
│   │   │   ├── RouteMap.tsx        # Leaflet map + context menu
│   │   │   ├── RouteCalculator.tsx # Valhalla profile selector
│   │   │   ├── ElevationProfile.tsx # Recharts chart
│   │   │   └── RouteInfo.tsx       # Route details panel
│   │   ├── Layout/
│   │   ├── POI/                    # Points of interest
│   │   └── ...
│   ├── services/
│   │   ├── valhallaService.ts      # Routing + elevation
│   │   ├── overpassService.ts      # POI search
│   │   ├── routeService.ts         # Route utilities
│   │   └── ...
│   ├── store/
│   │   ├── routeStore.ts           # Zustand route state
│   │   ├── poiStore.ts             # POI state
│   │   └── ...
│   ├── types/
│   │   ├── route.ts                # Route interfaces
│   │   ├── valhalla.ts             # Valhalla API types
│   │   └── ...
│   └── ...
├── server/
│   ├── server.js                   # Express app
│   ├── package.json
│   ├── routes.json                 # Route storage (created at runtime)
│   └── README.md
├── .env.example                    # Environment template
├── package.json                    # Frontend dependencies
└── vite.config.ts                  # Vite configuration
```

## Key Design Decisions

### 1. Coordinate System
- **Valhalla returns**: `[lng, lat]` (GeoJSON)
- **Leaflet expects**: `[lat, lng]`
- **Our format**: Store as `{lat, lng}` objects for clarity
- **Conversion**: Happens in polyline decoder (returns `[lat, lng]`)

### 2. Elevation Proxy
- Direct Valhalla elevation calls blocked by CORS
- Backend proxy transparently forwards requests
- Allows elevation data to work in browser

### 3. Route Storage
- JSON file for MVP (simplicity)
- Upgradeable to SQLite/PostgreSQL
- No auth yet (Phase 3)

### 4. State Management
- Zustand for global state (routes, POIs)
- React hooks for component state
- localStorage for persistence (future)

### 5. Error Handling
- Try/catch in async services
- Fallback to approximate routes
- User-friendly error messages with emojis

## Current Limitations

- No user authentication
- Routes not persisted to backend yet
- Elevation API unreliable (rate limiting)
- POI search has rate limits
- Single database endpoint

## Next Phase (Phase 3)

- [ ] User authentication (JWT)
- [ ] SQLite database with proper schema
- [ ] Route sharing & collaboration
- [ ] Offline maps support
- [ ] Mobile app version
- [ ] Advanced analytics & heatmaps
