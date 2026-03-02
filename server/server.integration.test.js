import request from 'supertest';
import express from 'express';
import { describe, it, expect } from '@jest/globals';
import { calculateRoute, getElevationProfile } from './services/valhallaService.js';
import cors from 'cors';

// Create test app with real routes
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Real route endpoint implementation
app.post('/api/route', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { locations, costing, costing_options } = req.body;
    const result = await calculateRoute(locations, costing, costing_options);
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

describe('Route Calculation API - Input Validation', () => {
  
  it('should return 400 for less than 2 waypoints', async () => {
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

  it('should return 400 for empty locations array', async () => {
    const response = await request(app)
      .post('/api/route')
      .send({
        locations: [],
        costing: 'bicycle'
      });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 for missing locations', async () => {
    const response = await request(app)
      .post('/api/route')
      .send({ costing: 'bicycle' });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 for invalid location format (missing lon)', async () => {
    const response = await request(app)
      .post('/api/route')
      .send({
        locations: [
          { lat: 48.7758 },
          { lat: 48.8961, lon: 9.1899 }
        ],
        costing: 'bicycle'
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('lat');
  });

  it('should return 400 for non-numeric coordinates', async () => {
    const response = await request(app)
      .post('/api/route')
      .send({
        locations: [
          { lat: 'invalid', lon: 9.1829 },
          { lat: 48.8961, lon: 9.1899 }
        ],
        costing: 'bicycle'
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('numeric');
  });
});

describe('Elevation API - Input Validation', () => {
  
  it('should return 400 for empty shape', async () => {
    const response = await request(app)
      .post('/api/elevation')
      .send({ shape: [] });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 for missing shape', async () => {
    const response = await request(app)
      .post('/api/elevation')
      .send({});
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 for invalid point format', async () => {
    const response = await request(app)
      .post('/api/elevation')
      .send({
        shape: [
          { lat: 48.7758, lon: 9.1829 },
          { lat: 'invalid', lon: 9.1899 }
        ]
      });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe('Response Structure - Errors', () => {
  
  it('should have consistent error response structure', async () => {
    const response = await request(app)
      .post('/api/route')
      .send({ locations: [] });
    
    expect(response.body).toHaveProperty('success');
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('code');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should include error code for validation failures', async () => {
    const response = await request(app)
      .post('/api/route')
      .send({
        locations: [{ lat: 48.7758, lon: 9.1829 }]
      });
    
    expect(response.body.code).toBe('INVALID_REQUEST');
  });
});
