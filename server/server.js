import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dbModule from './db.js';
import { calculateRoute, getElevationProfile } from './services/valhallaService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const ROUTES_FILE = path.join(__dirname, 'routes.json');

let db; // Will be initialized after DB init

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb', extended: true }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Load routes from file
function loadRoutes() {
  if (fs.existsSync(ROUTES_FILE)) {
    const data = fs.readFileSync(ROUTES_FILE, 'utf-8');
    return JSON.parse(data);
  }
  return {};
}

// Save routes to file
function saveRoutes(routes) {
  fs.writeFileSync(ROUTES_FILE, JSON.stringify(routes, null, 2));
}

/**
 * Route Calculation Endpoint (TDD Green Phase)
 * Uses Valhalla service with retry logic and structured error handling
 */
app.post('/api/route', async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    const { locations, costing, costing_options } = req.body;

    // Use Valhalla service (with retry logic)
    const result = await calculateRoute(locations, costing, costing_options);

    // Structured success response
    return res.status(200).json({
      success: true,
      data: result,
      meta: {
        distance: result.trip?.summary?.length || 0,
        duration: result.trip?.summary?.time || 0,
        waypoints: locations?.length || 0
      },
      timestamp
    });
  } catch (error) {
    // Structured error response (not "undefined"!)
    const statusCode = error.statusCode || 500;
    const code = error.code || 'UNKNOWN_ERROR';
    
    console.error(`[API /route] ${code}:`, error.message);

    return res.status(statusCode).json({
      success: false,
      error: error.message,
      code,
      timestamp
    });
  }
});

/**
 * Elevation Data Endpoint
 * Returns elevation profile with gain/loss calculations
 */
app.post('/api/elevation', async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    const { shape } = req.body;

    // Use Valhalla service (with retry logic and statistics)
    const result = await getElevationProfile(shape);

    return res.status(200).json({
      success: true,
      data: result,
      timestamp
    });
  } catch (error) {
    // Structured error response
    const statusCode = error.statusCode || 500;
    const code = error.code || 'UNKNOWN_ERROR';
    
    console.error(`[API /elevation] ${code}:`, error.message);

    return res.status(statusCode).json({
      success: false,
      error: error.message,
      code,
      timestamp
    });
  }
});

/**
 * Save Route
 */
app.post('/api/routes', async (req, res) => {
  try {
    const { id, name, description, waypoints, geometry, profile, difficultyLevel, createdAt, updatedAt } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: 'Missing id or name' });
    }

    const routes = loadRoutes();
    routes[id] = {
      id,
      name,
      description: description || '',
      waypoints,
      geometry,
      profile,
      difficultyLevel,
      createdAt,
      updatedAt,
    };
    
    saveRoutes(routes);
    console.log('[Routes] Saved route:', id);
    res.json({ id, message: 'Route saved successfully' });
  } catch (error) {
    console.error('[Routes] Error saving:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get All Routes
 */
app.get('/api/routes', async (req, res) => {
  try {
    const routes = loadRoutes();
    const routesArray = Object.values(routes);
    res.json(routesArray);
  } catch (error) {
    console.error('[Routes] Error fetching:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Route by ID
 */
app.get('/api/routes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const routes = loadRoutes();
    const route = routes[id];

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json(route);
  } catch (error) {
    console.error('[Routes] Error fetching:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete Route
 */
app.delete('/api/routes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const routes = loadRoutes();
    
    delete routes[id];
    saveRoutes(routes);
    
    console.log('[Routes] Deleted route:', id);
    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    console.error('[Routes] Error deleting:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health Check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Error Handler Middleware
 */
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message 
  });
});

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

/**
 * Initialization and Server Start
 */
async function startServer() {
  try {
    // Initialize database
    db = await dbModule.initDatabase();
    console.log('[DB] Database initialized');
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`\n✅ travelAgent Backend running on http://localhost:${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api`);
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   Routes file: ${ROUTES_FILE}\n`);
    });

    // Handle server errors
    server.on('error', (err) => {
      console.error('[Server Error]', err.message);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n[Server] Shutting down...');
      dbModule.closeDatabase();
      server.close(() => {
        console.log('[Server] Closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('[Startup Error]', error.message);
    process.exit(1);
  }
}

startServer();
