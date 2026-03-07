# Travel Agent - Cycling Route Planner

A web application for planning and exploring cycling routes with interactive maps, elevation profiles, and points of interest discovery.

## Features

### Route Management
- Create and save cycling routes with custom waypoints
- Name and describe routes for better organization
- Store routes in browser localStorage with persistence
- Route history for quick access to previously planned routes

### Interactive Map
- Full-featured map powered by Leaflet for route visualization
- Right-click context menu to add or delete waypoints
- Waypoint markers with automatic address resolution via OpenStreetMap Nominatim
- Drag-and-drop map navigation
- Map layer management for organized route display

### Waypoint Handling
- Forward geocoding: Search for addresses and convert to coordinates
- Reverse geocoding: Convert GPS coordinates to human-readable addresses
- Lock waypoints to prevent accidental modification
- Automatic address lookup when loading routes with coordinates only
- Support for 26 waypoints per route (A through Z)

### Route Analysis
- Elevation profiles with detailed statistics
- Distance and duration estimation
- Elevation gain/loss calculation
- Difficulty levels (easy, medium, hard) based on elevation
- Route profile selection (road, mountain, gravel)
- Integration with Valhalla routing engine for accurate calculations

### Points of Interest
- Discover restaurants, cafes, hotels, bakeries, and shops along your route
- Filter POI types for focused exploration
- Marker clustering to reduce visual clutter
- Detailed POI information with addresses and categories
- Data sourced from OpenStreetMap via Overpass API

### Data Import
- GPX file import for existing route data
- Automatic parsing of track points and elevation data
- Elevation profile calculation from imported GPX files
- POI discovery along imported routes

### Accessibility
- Responsive design for desktop and smaller screens
- Light and dark theme support
- Keyboard shortcuts for common actions
- Multi-language ready (German interface)

## Building and Running

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Starts a local development server with hot module reload on `http://localhost:5173`

### Production Build
```bash
npm run build
```
Creates an optimized production bundle in the `dist/` directory. The build process:
1. Compiles TypeScript with strict type checking
2. Bundles and optimizes assets with Vite
3. Generates source maps for debugging
4. Applies tree-shaking to remove unused code

### Backend Server
The application includes a Node.js backend for elevation and routing services:
```bash
cd server && npm start
```
The server provides:
- Elevation data endpoints
- Integration with Valhalla routing engine
- Open Elevation API fallback for elevation queries

## Architecture

### Frontend Stack
- React 18+ with TypeScript
- Zustand for state management
- Tailwind CSS for styling
- Radix UI for accessible components
- Leaflet for map infrastructure
- @boxicons/react for icons

### Backend Stack
- Express.js server
- SQLite database
- Integration with external APIs (Nominatim, Overpass, Valhalla)

### Data Flow
1. User creates waypoints via search or map clicks
2. Application geocodes addresses to coordinates
3. Valhalla calculates optimal route geometry
4. Elevation profile generated from route geometry
5. Overpass API queries nearby POIs
6. Client displays route, elevation, and POIs on interactive map
7. All routes persisted to localStorage for offline access

## API Integrations

- OpenStreetMap Nominatim: Forward and reverse geocoding
- Valhalla: Route calculation and optimization
- Overpass: POI discovery along routes
- Open Elevation: Fallback elevation data source

## Testing

Frontend tests:
```bash
npm run test
```

Backend tests:
```bash
cd server && npm test
```

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

Licensed under the [LICENSE](LICENSE) file in the repository.
