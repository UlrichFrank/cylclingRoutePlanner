/**
 * Mock Valhalla Server
 * For testing when Docker Valhalla is not ready
 * Returns realistic test data matching Valhalla's API format
 */

import express from 'express';

const app = express();
app.use(express.json({ limit: '50mb' }));

// Mock route response (Stuttgart to Ludwigsburg)
const MOCK_ROUTE = {
  trip: {
    locations: [
      { lat: 48.7758, lon: 9.1829, type: 'break' },
      { lat: 48.8961, lon: 9.1899, type: 'break' }
    ],
    legs: [
      {
        summary: {
          length: 15.709,
          time: 3357.744,
          cost: 1234.5
        },
        maneuvers: [
          {
            type: 1,
            instruction: 'Bike northeast on test route',
            verbal_transition_alert_instruction: 'Bike northeast',
            street_names: ['Test Road'],
            time: 3357.744,
            length: 15.709,
            begin_shape_index: 0,
            end_shape_index: 100
          }
        ],
        // Compressed polyline for Stuttgart to Ludwigsburg
        shape: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        elevation: [240, 245, 250, 248, 240, 235, 238, 245, 252, 250]
      }
    ]
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    version: '8.0.0',
    status: 'OK',
    note: 'Mock Valhalla Server'
  });
});

// Route endpoint
app.post('/route', (req, res) => {
  const { locations, costing } = req.body;

  // Minimal validation
  if (!locations || locations.length < 2) {
    return res.status(400).json({
      error: 'At least 2 locations required'
    });
  }

  // Return mock response
  res.json(MOCK_ROUTE);
});

// Elevation endpoint
app.post('/elevation', (req, res) => {
  const { shape } = req.body;

  if (!shape || !Array.isArray(shape)) {
    return res.status(400).json({
      error: 'Shape array required'
    });
  }

  // Generate mock elevation data matching shape length
  const elevation = shape.map((_, i) => 240 + Math.sin(i / 10) * 15);

  res.json({
    elevation,
    shape: shape.map(p => [p.lat, p.lon])
  });
});

const PORT = process.env.MOCK_VALHALLA_PORT || 8003;
app.listen(PORT, () => {
  console.log(`[Mock Valhalla] Listening on http://localhost:${PORT}`);
  console.log('[Mock Valhalla] Use for testing only. Production: Use Docker Valhalla');
});
