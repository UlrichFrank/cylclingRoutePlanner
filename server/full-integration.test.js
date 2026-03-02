/**
 * Full Integration Test
 * Tests Backend with Mock Valhalla Service
 * Verifies Route Calculation and Elevation Data
 */

import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const MOCK_VALHALLA_URL = 'http://localhost:8003';

describe('Full Integration - Mock Valhalla', () => {
  
  // Test 1: Mock Valhalla is reachable
  test('Mock Valhalla health check', async () => {
    const response = await axios.get(`${MOCK_VALHALLA_URL}/health`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('OK');
    expect(response.data.version).toBe('8.0.0');
  });

  // Test 2: Backend route API  
  test('Backend /api/route returns route with distance', async () => {
    const locations = [
      { lat: 48.7758, lon: 9.1829 },
      { lat: 48.8961, lon: 9.1899 }
    ];

    const response = await axios.post(`${API_URL}/route`, {
      locations,
      costing: 'bicycle',
      costing_options: { bicycle: {} }
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.trip).toBeDefined();
    expect(response.data.data.trip.legs).toBeDefined();
    expect(response.data.data.trip.legs[0].summary.length).toBeGreaterThan(0);
    expect(response.data.meta.distance).toBeGreaterThan(0);
  });

  // Test 3: Backend elevation API
  test('Backend /api/elevation returns elevation data', async () => {
    // Use polyline from Mock Valhalla (Stuttgart to Ludwigsburg)
    const polyline = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

    const response = await axios.post(`${API_URL}/elevation`, { polyline });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.elevation).toBeDefined();
    expect(Array.isArray(response.data.data.elevation)).toBe(true);
    expect(response.data.data.elevation.length).toBeGreaterThan(0);
    expect(response.data.data.elevation_gain).toBeDefined();
    expect(response.data.data.elevation_loss).toBeDefined();
    expect(response.data.data.min_elevation).toBeDefined();
    expect(response.data.data.max_elevation).toBeDefined();
    expect(response.data.data.sampled_points).toBeGreaterThan(0);
  });

  // Test 4: Complete route + elevation workflow
  test('Complete workflow: Calculate route and get elevation', async () => {
    // Step 1: Calculate route
    const locations = [
      { lat: 48.7758, lon: 9.1829 },
      { lat: 48.8961, lon: 9.1899 }
    ];

    const routeResponse = await axios.post(`${API_URL}/route`, {
      locations,
      costing: 'bicycle'
    });

    expect(routeResponse.data.success).toBe(true);
    const distance = routeResponse.data.data.trip.legs[0].summary.length;
    expect(distance).toBeGreaterThan(0);

    // Step 2: Get elevation - use polyline from route response
    const polyline = routeResponse.data.data.trip.legs[0].shape;
    expect(polyline).toBeDefined();
    expect(typeof polyline).toBe('string');
    
    const elevationResponse = await axios.post(`${API_URL}/elevation`, {
      polyline
    });

    expect(elevationResponse.data.success).toBe(true);
    expect(elevationResponse.data.data.elevation_gain).toBeDefined();
    expect(elevationResponse.data.data.elevation_loss).toBeDefined();
    expect(elevationResponse.data.data.min_elevation).toBeDefined();
    expect(elevationResponse.data.data.max_elevation).toBeDefined();
  });

  // Test 5: Error handling - Invalid locations
  test('Route API returns 400 for invalid locations', async () => {
    try {
      await axios.post(`${API_URL}/route`, {
        locations: [{ lat: 48.7758 }], // Missing lon
        costing: 'bicycle'
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.success).toBe(false);
      expect(error.response.data.code).toBe('INVALID_REQUEST');
    }
  });

  // Test 6: Error handling - Empty polyline
  test('Elevation API returns 400 for empty polyline', async () => {
    try {
      await axios.post(`${API_URL}/elevation`, { polyline: '' });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.success).toBe(false);
      expect(error.response.data.code).toBe('INVALID_REQUEST');
    }
  });

  // Test 7: Backend health check
  test('Backend /health endpoint', async () => {
    const response = await axios.get(`${API_URL.replace('/api', '')}/health`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('OK');
  });

  // Test 8: Response format verification
  test('Route response has correct structure', async () => {
    const response = await axios.post(`${API_URL}/route`, {
      locations: [
        { lat: 48.7758, lon: 9.1829 },
        { lat: 48.8961, lon: 9.1899 }
      ],
      costing: 'bicycle'
    });

    // Verify response structure
    expect(response.data).toHaveProperty('success');
    expect(response.data).toHaveProperty('data');
    expect(response.data).toHaveProperty('meta');
    expect(response.data).toHaveProperty('timestamp');
    
    // Verify meta properties
    expect(response.data.meta).toHaveProperty('distance');
    expect(response.data.meta).toHaveProperty('duration');
    expect(response.data.meta).toHaveProperty('waypoints');
  });

  // Test 9: Elevation response has correct structure
  test('Elevation response has correct structure', async () => {
    const polyline = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    
    const response = await axios.post(`${API_URL}/elevation`, {
      polyline
    });

    // Verify response structure
    expect(response.data).toHaveProperty('success');
    expect(response.data).toHaveProperty('data');
    expect(response.data).toHaveProperty('timestamp');
    
    // Verify elevation data
    const data = response.data.data;
    expect(data).toHaveProperty('elevation');
    expect(data).toHaveProperty('elevation_gain');
    expect(data).toHaveProperty('elevation_loss');
    expect(data).toHaveProperty('min_elevation');
    expect(data).toHaveProperty('max_elevation');
    expect(data).toHaveProperty('avg_elevation');
    expect(data).toHaveProperty('sampled_points');
  });

  // Test 10: Multiple waypoints
  test('Route with 3 waypoints', async () => {
    const locations = [
      { lat: 48.7758, lon: 9.1829 },  // Stuttgart
      { lat: 48.8500, lon: 9.0000 },  // Intermediate
      { lat: 48.8961, lon: 9.1899 }   // Ludwigsburg
    ];

    const response = await axios.post(`${API_URL}/route`, {
      locations,
      costing: 'bicycle'
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.meta.waypoints).toBe(3);
    expect(response.data.data.trip.legs.length).toBeGreaterThan(0);
  });
});
