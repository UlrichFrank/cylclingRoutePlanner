import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const ROUTES_FILE = path.join(__dirname, 'routes.json');

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

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
 * Elevation Proxy Endpoint
 * Forwards requests to Valhalla elevation API to bypass CORS
 */
app.post('/api/elevation', async (req, res) => {
  try {
    const { shape } = req.body;

    if (!shape || !Array.isArray(shape)) {
      return res.status(400).json({ error: 'Missing or invalid shape array' });
    }

    console.log('[Elevation] Request for', shape.length, 'points');

    // Validate shape format
    if (shape.some((point) => typeof point.lat !== 'number' || typeof point.lon !== 'number')) {
      return res.status(400).json({ error: 'Invalid shape format: each point must have lat and lon' });
    }

    const response = await fetch('https://valhalla1.openstreetmap.de/elevation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shape }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error('[Elevation] Error from Valhalla:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Valhalla API error: ${response.status}`,
        details: errorText 
      });
    }

    const data = await response.json().catch((parseErr) => {
      console.error('[Elevation] Failed to parse JSON:', parseErr.message);
      throw new Error(`Failed to parse Valhalla response: ${parseErr.message}`);
    });

    console.log('[Elevation] Got', data.elevation?.length, 'elevation points');
    
    res.json(data);
  } catch (error) {
    console.error('[Elevation] Error:', error.message);
    res.status(500).json({ error: error.message });
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

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ travelAgent Backend running on http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Routes file: ${ROUTES_FILE}\n`);
});
