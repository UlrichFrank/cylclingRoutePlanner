# UI Design für Cycling Route Planner

## Layout

### Fullscreen Map
- **Karte** füllt das gesamte Browserfenster aus
- **Skala** in der unteren rechten Ecke (Leaflet default control)
- **Header** oben mit Titel und Beschreibung (Position: fixed, z-index: 50)

### Linkes Panel - Wegpunkte Editor
- **Position**: absolute (top-4, left-4)
- **Design**: Rechteckige Box mit abgerundeten Ecken, weißer Hintergrund, Schatten
- **Features**:
  - ✏️ Eingabe Breite/Länge für jeden Waypoint (lat/lng)
  - ➕ Button zum neue Punkte hinzufügen
  - ✕ Button zum Punkte entfernen (bei >2 Punkten)
  - 📍 GPS-Import-Button (Format: "52.52,13.4;52.53,13.41;...")
  - ✓ Übernehmen-Button zur Route Update

### Unten Panel - POI Filter Buttons
- **Position**: absolute (bottom-4, left-4, right-4)
- **Design**: Weiße Box mit abgerundeten Ecken, Schatten
- **Filter-Buttons**: 5 runde Schaltflächen mit Emojis
  - 🍽️ Restaurants (rot)
  - ☕ Cafés (orange)
  - 🥐 Bäckereien (gelb)
  - 🏨 Hotels (blau)
  - 🎯 Sehenswürdigkeiten (lila)
- **Filterung**: Nur POIs im 1km-Abstand zur Route anzeigen
- **Haversine Formel**: Echte Distanzberechnung

## Farb-Schema

| POI-Typ | Farbe | Emoji |
|---------|-------|-------|
| Restaurant | Rot (#ef4444) | 🍽️ |
| Café | Orange (#f97316) | ☕ |
| Bakery | Gelb (#eab308) | 🥐 |
| Hotel | Blau (#3b82f6) | 🏨 |
| Attraction | Lila (#a855f7) | 🎯 |

## Technische Implementierung

### Komponenten
- `RouteMap.tsx` - Leaflet-Karte mit OpenStreetMap Tiles
- `WaypointInput.tsx` - Waypoint Editor mit GPS-Import
- `POIFilterButtons.tsx` - POI-Filter mit Distanzberechnung
- `App.tsx` - Hauptlayout mit Fullscreen-Setup

### State Management (Zustand)
- `routeStore.ts` - Aktuelle Route mit Waypoints
- `poiStore.ts` - POI-Ergebnisse und Filter-Status

### Services
- `overpassService.ts` - Overpass API Integration mit Mock-Data Fallback

## Responsive Design
- **Desktop**: Vollständiges UI mit allen Panels
- **Mobile**: Noch nicht optimiert (future enhancement)

## API Integration

### Overpass API
- Queries für: restaurant, café, hotel, bakery, tourism (attractions)
- Timeout: 8 Sekunden
- Fallback: Mock-Daten bei API-Fehler

### OSM Daten
- Tile Layer: openstreetmap.org
- Attribution: Automatisch eingebunden
