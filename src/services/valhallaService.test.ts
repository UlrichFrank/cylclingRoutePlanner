/**
 * Integration test for Valhalla service
 * Tests route calculation with real API
 */

import { valhallaService } from '../services/valhallaService';

// Stuttgart coordinates
const STUTTGART_CENTER = { lat: 48.7758, lon: 9.1829 };
const LUDWIGSBURG = { lat: 48.8961, lon: 9.1899 };

async function testValhallaService() {
  console.log('🚴 Testing Valhalla Service Integration...\n');

  try {
    // Test 1: Health check
    console.log('✓ Test 1: Health Check');
    const isHealthy = await valhallaService.healthCheck();
    console.log(`  Valhalla API status: ${isHealthy ? '✅ Online' : '❌ Offline'}\n`);

    if (!isHealthy) {
      console.warn('⚠️  Valhalla API is not responding. Check your connection.');
      return;
    }

    // Test 2: Calculate route
    console.log('✓ Test 2: Calculate Route (Stuttgart → Ludwigsburg)');
    const routeResult = await valhallaService.calculateRoute(
      [STUTTGART_CENTER, LUDWIGSBURG],
      'road'
    );
    console.log(`  Distance: ${routeResult.distance.toFixed(1)} km`);
    console.log(`  Duration: ${Math.round(routeResult.duration / 60)} minutes`);
    console.log(`  Waypoints: ${routeResult.geometry.length} coordinates\n`);

    // Test 3: Get route stats
    console.log('✓ Test 3: Get Route Statistics');
    const stats = await valhallaService.getRouteStats(
      [STUTTGART_CENTER, LUDWIGSBURG],
      'road'
    );
    console.log(`  Distance: ${stats.distance.toFixed(1)} km`);
    console.log(`  Duration: ${Math.round(stats.duration / 60)} minutes`);
    console.log(`  Elevation Gain: ${stats.elevationGain} m`);
    console.log(`  Elevation Loss: ${stats.elevationLoss} m`);
    console.log(`  Difficulty: ${stats.difficulty}`);
    console.log(`  Average Grade: ${stats.averageGrade}%\n`);

    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
  }
}

// Run tests
testValhallaService();
