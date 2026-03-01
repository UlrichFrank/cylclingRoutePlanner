# travelAgent Backend Server

Express.js backend for the travelAgent cycling route planner.

## Features

- **Elevation API Proxy** - Bypasses CORS restrictions for Valhalla elevation data
- **Route Storage** - Save, retrieve, and delete cycling routes
- **CORS Enabled** - Configured for localhost development

## Installation

```bash
cd server
npm install
```

## Running

### Development
```bash
npm run dev    # Uses --watch flag
```

### Production
```bash
npm start
```

Server runs on `http://localhost:3001` (configurable via `PORT` env var)

## API Endpoints

### Health Check
```http
GET /health
```
Returns: `{ status: "ok", timestamp: "2026-03-01T..." }`

### Elevation Proxy
```http
POST /api/elevation
Content-Type: application/json

{
  "shape": [
    { "lat": 52.52, "lon": 13.4 },
    { "lat": 52.53, "lon": 13.5 }
  ]
}
```

Returns elevation data from Valhalla API (bypasses CORS)

### Save Route
```http
POST /api/routes
Content-Type: application/json

{
  "id": "route-123",
  "name": "Berlin to Potsdam",
  "description": "Scenic cycling route",
  "waypoints": [{ "lat": 52.52, "lng": 13.4 }, { "lat": 52.38, "lng": 13.08 }],
  "geometry": { "geometry": [...], "distance": 35.2, ... },
  "profile": "road",
  "difficultyLevel": "easy",
  "createdAt": 1725188600000,
  "updatedAt": 1725188600000
}
```

### Get All Routes
```http
GET /api/routes
```

Returns array of all saved routes

### Get Single Route
```http
GET /api/routes/:id
```

### Delete Route
```http
DELETE /api/routes/:id
```

## Data Storage

Routes are stored in `server/routes.json` (created automatically on first save)

```json
{
  "route-123": {
    "id": "route-123",
    "name": "...",
    ...
  }
}
```

## Environment Variables

```env
PORT=3001                  # Server port
VITE_BACKEND_API_URL=...   # Set in frontend .env
```

## Development Notes

- Uses Express.js for HTTP server
- CORS middleware configured for localhost:5173 (Vite dev server)
- Routes stored as JSON (easily upgradeable to SQLite/PostgreSQL)
- No authentication yet (coming in Phase 3)

## Troubleshooting

### Port Already in Use
```bash
PORT=3002 npm start
```

### CORS Errors
Check that `http://localhost:5173` is in the CORS origin list

### Routes Not Saving
Ensure `server/` directory is writable

## Future Improvements

- [ ] SQLite database instead of JSON
- [ ] User authentication
- [ ] Route sharing API
- [ ] Advanced analytics
- [ ] Deployment configuration
