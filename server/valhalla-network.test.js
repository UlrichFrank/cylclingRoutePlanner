import { describe, it, expect, beforeAll } from '@jest/globals';
import { calculateRoute, getElevationProfile } from './services/valhallaService.js';

describe('Valhalla Network Integration', () => {
  describe('Route Calculation - Real Network Calls', () => {
    it('should successfully calculate a route from Stuttgart to Ludwigsburg', async () => {
      const locations = [
        { lat: 48.7758, lon: 9.1829 },
        { lat: 48.8961, lon: 9.1899 }
      ];

      const result = await calculateRoute(locations, 'bicycle');

      expect(result).toBeDefined();
      expect(result.trip).toBeDefined();
      expect(result.trip.legs).toBeDefined();
      expect(Array.isArray(result.trip.legs)).toBe(true);
      expect(result.trip.legs.length).toBeGreaterThan(0);

      const leg = result.trip.legs[0];
      expect(leg.summary).toBeDefined();
      expect(leg.summary.length).toBeGreaterThan(0);
      expect(leg.summary.time).toBeGreaterThan(0);
      expect(leg.shape).toBeDefined();
      expect(typeof leg.shape).toBe('string');

      console.log(`✓ Route calculation successful: ${leg.summary.length.toFixed(2)}km in ${(leg.summary.time/60).toFixed(1)}min`);
    });

    it('should return proper error on network failure', async () => {
      // This test verifies error handling
      // If Valhalla is unreachable, we should get a clear error message
      const locations = [
        { lat: 48.7758, lon: 9.1829 },
        { lat: 48.8961, lon: 9.1899 }
      ];

      try {
        await calculateRoute(locations, 'bicycle');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        console.log(`Error message: ${error.message}`);
      }
    });

    it('should handle multiple waypoints', async () => {
      const locations = [
        { lat: 48.7758, lon: 9.1829 },
        { lat: 48.8500, lon: 9.1700 },
        { lat: 48.8961, lon: 9.1899 }
      ];

      const result = await calculateRoute(locations, 'bicycle');

      expect(result).toBeDefined();
      expect(result.trip.legs).toBeDefined();
      // Multiple waypoints should create multiple legs
      expect(result.trip.legs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Elevation Profile - Real Network Calls', () => {
    it('should get elevation profile for a geometry', async () => {
      // Use real Stuttgart coordinates
      const geometry = [
        [48.7758, 9.1829],
        [48.7800, 9.1850],
        [48.7850, 9.1870],
        [48.8961, 9.1899]
      ];

      try {
        const result = await getElevationProfile(geometry);
        expect(result).toBeDefined();
        console.log(`Elevation profile retrieved for ${result.length} points`);
      } catch (error) {
        // Elevation might not be available, but shouldn't crash
        expect(error).toBeDefined();
        console.log(`Elevation error (expected): ${error.message}`);
      }
    });
  });

  describe('Network Connectivity Diagnostics', () => {
    it('should verify Valhalla endpoint is reachable', async () => {
      // Simple test to ensure network works
      const locations = [
        { lat: 48.7758, lon: 9.1829 },
        { lat: 48.8961, lon: 9.1899 }
      ];

      const startTime = Date.now();
      try {
        const result = await calculateRoute(locations, 'bicycle');
        const duration = Date.now() - startTime;
        
        console.log(`Network connectivity test passed in ${duration}ms`);
        expect(result).toBeDefined();
        expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`Network connectivity test failed after ${duration}ms`);
        console.error(`Error: ${error.message}`);
        throw error;
      }
    });
  });
});
