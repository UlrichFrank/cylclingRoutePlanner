# 🚀 travelAgent Start Scripts

Convenient scripts to start both backend and frontend servers simultaneously.

## Quick Start

### macOS / Linux
```bash
chmod +x start.sh
./start.sh
```

### Windows
```cmd
start.cmd
```

### Node.js (Cross-platform)
```bash
npm start
# or
node start.js
```

## What They Do

1. **Check for available ports**
   - Backend defaults to 3001
   - Frontend defaults to 5173
   - Automatically finds next available port if default is taken

2. **Start backend server** (server/server.js)
   - Express.js API server
   - Port: 3001 (or next available)
   - Health: GET http://localhost:3001/health

3. **Start frontend server** (Vite dev server)
   - React development server
   - Port: 5173 (or next available)
   - Auto-reload on file changes

4. **Connect frontend to backend**
   - Sets `VITE_BACKEND_API_URL` environment variable
   - Frontend automatically uses backend for elevation API

## Output

You'll see something like:

```
🎯 travelAgent Development Server Launcher
===========================================

🔍 Checking available ports...
✅ Backend port: 3001
✅ Frontend port: 5173

🚀 Starting Backend Server...
✅ travelAgent Backend running on http://localhost:3001

🚀 Starting Frontend Server...
✅ Vite dev server running at http://localhost:5173

✅ Both servers started!

📱 Frontend:    http://localhost:5173
🔧 Backend API: http://localhost:3001/api

💡 Press Ctrl+C to stop both servers
```

## Stopping Servers

### Shell Scripts (macOS/Linux)
Press `Ctrl+C` in the terminal - both servers will shut down gracefully

### Windows Batch
Close the command prompt windows or press `Ctrl+C` in each

## Troubleshooting

### Port Already in Use
Scripts automatically find next available port. You'll see:
```
✅ Backend port: 3002
✅ Frontend port: 5174
```

### "Command not found: pnpm"
Install pnpm globally:
```bash
npm install -g pnpm
```

### Backend not starting
Check if port is in use:
```bash
# macOS/Linux
lsof -i :3001

# Windows
netstat -ano | findstr :3001
```

### Frontend can't connect to backend
Verify backend is running:
```bash
curl http://localhost:3001/health
```

## Port Configuration

To use custom ports, set environment variables before running:

```bash
# macOS/Linux
PORT=4000 VITE_PORT=6000 ./start.sh

# Windows
set PORT=4000 & set VITE_PORT=6000 & start.cmd
```

## Script Comparison

| Feature | Node.js | Shell | Batch |
|---------|---------|-------|-------|
| **Cross-platform** | ✅ Yes | ❌ Unix only | ❌ Windows only |
| **Port detection** | ✅ Built-in | ✅ via lsof | ⚠️ Manual |
| **Auto-port** | ✅ Yes | ✅ Yes | ⚠️ No |
| **Graceful shutdown** | ✅ Yes | ✅ Yes | ✅ Yes |

**Recommendation:** Use `npm start` for best cross-platform support

## Development Workflow

1. Run: `npm start`
2. Open: http://localhost:5173
3. Edit code → auto-reload
4. Press Ctrl+C to stop

## Next Steps

See [ARCHITECTURE.md](../ARCHITECTURE.md) for system overview  
See [server/README.md](../server/README.md) for backend details
