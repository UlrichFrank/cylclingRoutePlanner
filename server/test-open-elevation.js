#!/usr/bin/env node

/**
 * Test Open-Elevation API Integration
 * Tests real elevation data retrieval
 */

import axios from 'axios';
import { decodePolyline, samplePointsByDistance } from './utils/polylineDecoder.js';

// Test polyline from Mock Valhalla
const testPolyline = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

console.log('=== Open-Elevation API Test ===\n');

// Step 1: Decode polyline
console.log('1. Decoding polyline...');
const decodedPoints = decodePolyline(testPolyline);
console.log(`   ✓ Decoded ${decodedPoints.length} points`);

// Step 2: Sample points
console.log('\n2. Sampling points every 50m...');
const sampledPoints = samplePointsByDistance(decodedPoints, 50);
console.log(`   ✓ Sampled ${sampledPoints.length} points`);

// Step 3: Request elevation
console.log('\n3. Requesting elevation from Open-Elevation API...');
try {
  const response = await axios.post('https://api.open-elevation.com/api/v1/lookup', {
    locations: sampledPoints.map(p => ({ latitude: p.lat, longitude: p.lon }))
  });

  console.log(`   ✓ Response received (${response.data.results.length} results)`);
  console.log(`   Sample elevation: ${response.data.results[0]}`);
  
  // Verify response format
  if (Array.isArray(response.data.results) && response.data.results.length > 0) {
    const firstResult = response.data.results[0];
    console.log(`   Result format: ${JSON.stringify(firstResult)}`);
    
    if (firstResult.elevation !== undefined && firstResult.elevation !== null) {
      console.log('\n=== ✅ Open-Elevation API integration works! ===');
    } else {
      console.log('\n=== ⚠️ No elevation data in response ===');
    }
  }
} catch (error) {
  console.error(`\n❌ Error: ${error.message}`);
  if (error.response) {
    console.error(`   Status: ${error.response.status}`);
    console.error(`   Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
  }
}
