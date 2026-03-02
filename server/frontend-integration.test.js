import request from 'supertest';
import express from 'express';
import { describe, it, expect } from '@jest/globals';
import { calculateRoute, getElevationProfile } from './services/valhallaService.js';
import cors from 'cors';

/**
 * Frontend-Backend Integration Test
 * Tests the complete API contract between frontend and backend
 * Similar to server.js but with full error handling
 */

// Create test app matching server.js structure
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Route endpoint - exactly as in server.js
app.post('/api/route', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { locations, costing, costing_options } = req.body;
    
    // Validate input
    if (!Array.isArray(locations) || locations.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 locations required',
        code: 'INVALID_REQUEST',
        timestamp
      });
    }

    const result = await calculateRoute(locations, costing || 'bicycle', costing_options);
    
    // Return response matching frontend expectations
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
    const statusCode = error.statusCode || 500;
    const code = error.code || 'UNKNOWN_ERROR';
    return res.status(statusCode).json({
      success: false,
      error: error.message,
      code,
      timestamp
    });
  }
});

// Elevation endpoint
app.post('/api/elevation', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { shape } = req.body;
    const result = await getElevationProfile(shape);
    return res.status(200).json({
      success: true,
      data: result,
      timestamp
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const code = error.code || 'UNKNOWN_ERROR';
    return res.status(statusCode).json({
      success: false,
      error: error.message,
      code,
      timestamp
    });
  }
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

describe('Frontend-Backend API Integration', () => {
  describe('POST /api/route - Route Calculation API', () => {
    it('should return properly formatted success response for valid route request', async () => {
      const response = await request(app)
        .post('/api/route')
        .send({
          locations: [
            { lat: 48.7758, lon: 9.1829 },
            { lat: 48.8961, lon: 9.1899 }
          ],
          costing: 'bicycle'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body).toHaveProperty('timestamp');

      // Verify data structure that frontend expects
      expect(response.body.data).toHaveProperty('trip');
      expect(response.body.data.trip).toHaveProperty('legs');
      expect(Array.isArray(response.body.data.trip.legs)).toBe(true);
      expect(response.body.data.trip.legs.length).toBeGreaterThan(0);

      // Verify first leg has required fields for frontend
      const leg = response.body.data.trip.legs[0];
      expect(leg).toHaveProperty('shape'); // Polyline geometry
      expect(leg).toHaveProperty('summary');
      expect(leg.summary).toHaveProperty('length');
      expect(leg.summary).toHaveProperty('time');

      console.log(`✓ Route API contract verified: ${response.body.meta.distance.toFixed(2)}km`);
    });

    it('should return error response when locations are missing', async () => {
      const response = await request(app)
        .post('/api/route')
        .send({
          costing: 'bicycle'
          // Missing locations
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code', 'INVALID_REQUEST');
      expect(response.body).toHaveProperty('timestamp');

      console.log(`✓ Error response contract verified: ${response.body.error}`);
    });

    it('should return error when only one location provided', async () => {
      const response = await request(app)
        .post('/api/route')
        .send({
          locations: [{ lat: 48.7758, lon: 9.1829 }],
          costing: 'bicycle'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_REQUEST');
    });

    it('should handle network errors with proper error response', async () => {
      // This should trigger Valhalla timeout or network error
      // Use extremely far apart coordinates that Valhalla might reject
      const response = await request(app)
        .post('/api/route')
        .send({
          locations: [
            { lat: -90, lon: -180 },  // South Pole area
            { lat: 90, lon: 180 }     // North Pole area
          ],
          costing: 'bicycle'
        });

      // Should be 400-503, with structured error response
      expect([400, 500, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('timestamp');

      console.log(`✓ Error response code: ${response.body.code}, message: ${response.body.error}`);
    });

    it('should handle response.data wrapper correctly', async () => {
      // Frontend expects: response_data.data to contain the trip
      const response = await request(app)
        .post('/api/route')
        .send({
          locations: [
            { lat: 48.7758, lon: 9.1829 },
            { lat: 48.8961, lon: 9.1899 }
          ],
          costing: 'bicycle'
        });

      // Frontend code: const data = response_data.data || response_data
      const responseData = response.body;
      const data = responseData.data || responseData;

      // This should work with frontend's fallback logic
      expect(data).toHaveProperty('trip');
      expect(data.trip).toHaveProperty('legs');
      console.log('✓ Response wrapper structure compatible with frontend');
    });
  });

  describe('GET /health - Health Check API', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Elevation API - Not Fully Implemented', () => {
    it('should handle elevation request structure', async () => {
      const response = await request(app)
        .post('/api/elevation')
        .send({
          shape: [
            { lat: 48.7758, lon: 9.1829 },
            { lat: 48.7800, lon: 9.1850 },
            { lat: 48.8961, lon: 9.1899 }
          ]
        });

      // Should have proper response structure even if elevation fails
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('timestamp');

      if (!response.body.success) {
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('code');
        console.log(`Elevation note: ${response.body.error}`);
      }
    });
  });

  describe('Response Format Consistency', () => {
    it('should have consistent error format across endpoints', async () => {
      // Test /api/route with missing fields
      const routeError = await request(app)
        .post('/api/route')
        .send({});

      // Test /api/elevation with missing fields
      const elevationError = await request(app)
        .post('/api/elevation')
        .send({});

      // Both should have same error response structure
      expect(routeError.body).toHaveProperty('success', false);
      expect(routeError.body).toHaveProperty('error');
      expect(routeError.body).toHaveProperty('code');
      expect(routeError.body).toHaveProperty('timestamp');

      expect(elevationError.body).toHaveProperty('success', false);
      expect(elevationError.body).toHaveProperty('error');
      expect(elevationError.body).toHaveProperty('code');
      expect(elevationError.body).toHaveProperty('timestamp');

      console.log('✓ Error format consistency verified');
    });
  });
});
