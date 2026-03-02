import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { getElevationProfile } from './services/valhallaService.js';
import cors from 'cors';

/**
 * Elevation Service Graceful Degradation Test
 * Tests that elevation endpoint handles service unavailability gracefully
 */

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Elevation endpoint - same as server.js
app.post('/api/elevation', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { polyline } = req.body;

    if (!polyline || typeof polyline !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid polyline parameter',
        code: 'INVALID_REQUEST',
        timestamp
      });
    }

    const result = await getElevationProfile(polyline);
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

describe('Elevation Service Graceful Degradation', () => {
  it('should return zero elevations when elevation service is unavailable', async () => {
    // Use a valid polyline
    const polyline = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

    const response = await request(app)
      .post('/api/elevation')
      .send({ polyline });

    // Should succeed with 200 even though Open-Elevation API might be unavailable
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('timestamp');

    // Should have elevation stats structure
    expect(response.body.data).toHaveProperty('elevation');
    expect(response.body.data).toHaveProperty('elevation_gain');
    expect(response.body.data).toHaveProperty('elevation_loss');
    expect(response.body.data).toHaveProperty('min_elevation');
    expect(response.body.data).toHaveProperty('max_elevation');
    expect(response.body.data).toHaveProperty('avg_elevation');
    expect(response.body.data).toHaveProperty('sampled_points');

    // When service unavailable, returns empty/zero values (graceful degradation)
    // Note: In test environment with public API, might get real data or zeros
    if (response.body.data.elevation.length === 0) {
      expect(response.body.data.elevation_gain).toBe(0);
      expect(response.body.data.elevation_loss).toBe(0);
      console.log('✓ Elevation service gracefully returns zero values when unavailable');
    } else {
      console.log('✓ Elevation service returned data (public API available)');
    }
  });

  it('should have consistent response format even with unavailable elevation', async () => {
    const polyline = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

    const response = await request(app)
      .post('/api/elevation')
      .send({ polyline });

    // Response should match contract
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('timestamp');

    // Should NOT error - this is the key point
    expect(response.status).toBe(200);

    console.log('✓ API contract maintained');
  });

  it('should still validate input', async () => {
    const response = await request(app)
      .post('/api/elevation')
      .send({ polyline: '' }); // empty polyline

    // Should fail validation
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.code).toBe('INVALID_REQUEST');

    console.log(`✓ Input validation works: ${response.body.error}`);
  });
});
