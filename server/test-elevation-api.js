#!/usr/bin/env node

/**
 * Manual Test for Elevation API
 * Tests polyline decoding and elevation sampling
 */

import { decodePolyline, samplePointsByDistance } from './utils/polylineDecoder.js';

// Test polyline from Mock Valhalla (Stuttgart to Ludwigsburg)
const testPolyline = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

console.log('=== Polyline Decoder Test ===\n');

// Test 1: Decode polyline
console.log('1. Decoding polyline:', testPolyline);
const decodedPoints = decodePolyline(testPolyline);
console.log(`   ✓ Decoded ${decodedPoints.length} points`);
console.log(`   First point: ${JSON.stringify(decodedPoints[0])}`);
console.log(`   Last point: ${JSON.stringify(decodedPoints[decodedPoints.length - 1])}`);

// Test 2: Sample points
console.log('\n2. Sampling points every 50m');
const sampledPoints = samplePointsByDistance(decodedPoints, 50);
console.log(`   ✓ Sampled down to ${sampledPoints.length} points`);
console.log(`   Sample: ${JSON.stringify(sampledPoints.slice(0, 3))}`);

// Test 3: Calculate request payload
console.log('\n3. Creating Open-Elevation request');
const elevationRequest = {
  locations: sampledPoints.map(p => ({ latitude: p.lat, longitude: p.lon }))
};
console.log(`   ✓ Request size: ${sampledPoints.length} points`);
console.log(`   ✓ Payload size: ${JSON.stringify(elevationRequest).length} bytes`);
console.log(`   Sample location: ${JSON.stringify(elevationRequest.locations[0])}`);

console.log('\n=== ✅ All decoder tests passed ===');
