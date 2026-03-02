# travelAgent Start Script Guide

## Quick Start

```bash
./start.sh
```

**What starts:**
- 🔧 Backend Server (port 3001) - Express API
- 📱 Frontend Dev Server (port 5173) - Vite + React
- 🌐 **External APIs:**
  - Valhalla: https://valhalla1.openstreetmap.de (routing)
  - Open-Elevation: https://api.open-elevation.com (elevation data)

---

## Service URLs

Once started:

```
Frontend:        http://localhost:5173
Backend API:     http://localhost:3001/api
  - Routes:      http://localhost:3001/api/route
  - Elevation:   http://localhost:3001/api/elevation
  - Health:      http://localhost:3001/health
```

---

## Manual Testing

### Test Route Calculation
```bash
curl -X POST http://localhost:3001/api/route \
  -H "Content-Type: application/json" \
  -d '{"locations":[{"lat":48.7758,"lon":9.1829},{"lat":48.8961,"lon":9.1899}],"costing":"bicycle"}'
```

Expected: 15.71 km route with polyline encoded

### Test Elevation
```bash
# Get polyline from route response first
curl -X POST http://localhost:3001/api/elevation \
  -H "Content-Type: application/json" \
  -d '{"polyline":"_p~iF~ps|U_ulLnnqC_mqNvxq`@"}'
```

Expected: elevation_gain, elevation_loss, min/max elevation

---

## How It Works

### Architecture
1. **Frontend** sends route request (2+ waypoints)
2. **Backend** calls Valhalla API for routing
3. **Valhalla** returns: route + polyline (encoded)
4. **Frontend** displays route on map
5. **Frontend** calls `/api/elevation` with polyline
6. **Backend**:
   - Decodes polyline → all route points
   - Samples every 50m (e.g., 500km = ~10,000 points)
   - Sends all sampled points in ONE request to Open-Elevation
7. **Open-Elevation** returns elevation for all points at once
8. **Backend** calculates: gain/loss/min/max
9. **Frontend** displays elevation profile

### Why This Approach?
- ✅ Reduces API calls (one bulk request vs many individual calls)
- ✅ Respects rate limits (can batch ~2000 points per request)
- ✅ Fast elevation retrieval (most latency is network, not API processing)
- ✅ Uses standard APIs (no special setup required)

---

## Elevation Sampling

Configuration in `server/.env`:
```
ELEVATION_SAMPLE_DISTANCE_M=50
```

**What this means:**
- 50m = sample point every 50 meters along the route
- 500km route = ~10,000 elevation sample points
- Sent in ONE request to api.open-elevation.com

**Adjust if needed:**
- `30` = more detailed elevation, more API load
- `100` = less detailed elevation, fewer API calls

---

## Advanced Usage

### Run Backend Only
```bash
cd server
npm run start:dev
```

### Run Frontend Only
```bash
npm run dev
```

### Run Tests
```bash
cd server
npm test          # All tests
npm test -- full-integration.test.js  # Specific test
```

### View Logs

#### Backend
Check console output for `[Valhalla]` and `[Elevation]` messages

#### Check External APIs
```bash
# Valhalla health
curl https://valhalla1.openstreetmap.de/health

# Open-Elevation (test with single point)
curl -X POST https://api.open-elevation.com/api/v1/lookup \
  -H "Content-Type: application/json" \
  -d '{"locations":[{"latitude":48.7758,"longitude":9.1829}]}'
```

---

## Troubleshooting

### "Network error" or "fetch failed"
- Check internet connection
- Verify Valhalla API is reachable: `curl https://valhalla1.openstreetmap.de/health`
- Check Open-Elevation: `curl https://api.open-elevation.com/api/v1/lookup`

### Elevation returns 0m
- Normal behavior when Open-Elevation temporarily unavailable
- Check their status: https://api.open-elevation.com/api/v1/lookup?locations=48.7758,9.1829

### Polyline decoding issues
- Polyline from Valhalla should be a string like `"_p~iF~ps|U..."`
- Frontend sends it to backend as: `{"polyline":"..."}`
- Backend decodes and samples automatically

### "Port already in use"
Script finds next available port automatically:
```
✅ Frontend port: 5174   # (5173 was taken)
```

---

## Stopping Services

Press `Ctrl+C` in terminal running `./start.sh`

This stops:
1. Frontend server
2. Backend server

**External services** (Valhalla, Open-Elevation) are cloud-hosted, no cleanup needed.

---

## Configuration

Edit `server/.env`:

```bash
# Valhalla routing (public API - no login required)
VALHALLA_API_URL=https://valhalla1.openstreetmap.de

# Elevation API (public API - no login required)
OPEN_ELEVATION_API_URL=https://api.open-elevation.com/api/v1/lookup

# Distance between elevation samples (meters)
ELEVATION_SAMPLE_DISTANCE_M=50

# Node
PORT=3001
NODE_ENV=development
```

---

## Performance

Typical response times:
- Route calculation: <1s
- Elevation lookup (500km route): <2s
- Total workflow: <3s

Depends on:
- Internet connection speed
- API response times (both Valhalla and Open-Elevation)
- Route complexity (more points = longer encoding/decoding)

---

## API Contracts

### POST /api/route
**Request:**
```json
{
  "locations": [
    {"lat": 48.7758, "lon": 9.1829},
    {"lat": 48.8961, "lon": 9.1899}
  ],
  "costing": "bicycle"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trip": {
      "legs": [{
        "summary": {"length": 15.7, "time": 3357},
        "shape": "...encoded polyline..."
      }]
    }
  }
}
```

### POST /api/elevation
**Request:**
```json
{
  "polyline": "...encoded polyline from route..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "elevation": [240, 245, 250, ...],
    "elevation_gain": 45,
    "elevation_loss": 22,
    "min_elevation": 240,
    "max_elevation": 280,
    "avg_elevation": 255,
    "sampled_points": 142
  }
}
```

---

**Last Updated:** 2026-03-02  
**Status:** Public APIs (no local services needed)  
**Tested On:** macOS + Linux
