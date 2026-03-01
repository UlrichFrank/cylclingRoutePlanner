# 🚀 Quick Start Guide - travelAgent

Get the cycling route planner running in 3 commands!

## Installation

```bash
# Install frontend dependencies
pnpm install

# Install backend dependencies
cd server && npm install && cd ..
```

## Run (All Platforms)

```bash
npm start
```

That's it! The script will:
- ✅ Check for available ports
- ✅ Start backend (Express) on http://localhost:3001
- ✅ Start frontend (Vite) on http://localhost:5173
- ✅ Configure CORS and API communication
- ✅ Handle graceful shutdown

**Output:**
```
✅ Both servers started!

📱 Frontend:    http://localhost:5173
🔧 Backend API: http://localhost:3001/api

💡 Press Ctrl+C to stop both servers
```

## What You Get

### Frontend (React + Vite)
- 🗺️ Interactive map with Leaflet
- 🚴 Route calculation via Valhalla
- 📊 Elevation profile chart
- 🎯 Waypoint management (left-click map)
- 🌙 Dark mode support

### Backend (Express.js)
- 🔄 Elevation API proxy (CORS-safe)
- 💾 Route storage (JSON)
- 🏥 Health check endpoint

## First Steps

1. **Open** http://localhost:5173 in browser
2. **Allow geolocation** (optional - centers map on your location)
3. **Click 2 points** on map to create waypoints
4. **Click "Route Berechnen"** to calculate cycling route
5. **See the route** render on map with elevation profile!

## Bicycle Types Available

- 🏔️ **Mountainbike** - Off-road optimized
- 🚴 **Rennrad** - Road optimized  
- 🛣️ **Gravel** - Mixed terrain

## Project Structure

```
travelAgent/
├── src/
│   ├── components/     # React UI
│   ├── services/       # API services
│   ├── store/          # Zustand state
│   └── types/          # TypeScript types
├── server/
│   ├── server.js       # Express backend
│   └── routes.json     # Saved routes (auto-created)
├── start.js            # Universal start script
├── start.sh            # Unix/Linux/macOS script
└── start.cmd           # Windows script
```

## Troubleshooting

### Port Already in Use
The script automatically uses next available port (3002, 3003, etc.)

### Backend not connecting
Check console in DevTools (F12) → Console tab  
Should see: `[Valhalla] Elevation request...`

### Vite not starting
Ensure `pnpm` is installed:
```bash
npm install -g pnpm
```

### Permission denied on start.sh
Make it executable:
```bash
chmod +x start.sh
```

## Architecture

```
Browser (localhost:5173)
    ↓
Frontend (React + Vite)
    ↓ CORS requests
Backend (localhost:3001)
    ↓
Valhalla API (routing + elevation)
```

## Environment Variables

Configure in `.env` or `.env.local`:

```env
VITE_VALHALLA_API_URL=https://valhalla1.openstreetmap.de
VITE_BACKEND_API_URL=http://localhost:3001/api
VITE_DEBUG_LOGGING=false
```

## Next Steps

- See [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- See [START_SCRIPTS.md](START_SCRIPTS.md) for advanced options
- See [server/README.md](server/README.md) for API details

## Need Help?

1. Check console errors (F12)
2. Verify both servers are running
3. Ensure ports 3001 and 5173 are available
4. Check network tab for API calls

---

**Happy route planning!** 🚴‍♂️🗺️
