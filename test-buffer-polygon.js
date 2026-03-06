/**
 * Test: Create a buffer polygon around a route and query with Overpass poly: syntax
 * This tests if poly: syntax works with realistic route geometries
 */

import axios from 'axios';
import * as turf from '@turf/turf';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Sample route: Weilimdorf (Stuttgart) - from test results
// This is a simplified version - using key points from Weilimdorf area
const routeCoordinates = [
  [9.08, 48.80],   // Start: Weilimdorf west
  [9.09, 48.80],
  [9.10, 48.81],
  [9.11, 48.81],   // Via Löwenmarkt area
  [9.1135, 48.8134], // Near Trölsch bakery
  [9.12, 48.82],   // End: Weilimdorf east
];

console.log('🗺️  Testing Buffer Polygon with Overpass poly: syntax');
console.log('Route coordinates:', routeCoordinates.length, 'points');
console.log('');

// Create a LineString from coordinates
// Note: turf uses [lng, lat] order, not [lat, lng]
const routeLine = turf.lineString(routeCoordinates);

console.log('📐 Creating 3km buffer around route...');
// Buffer creates a polygon around the line (3km = 3 kilometers)
const bufferPolygon = turf.buffer(routeLine, 3, { units: 'kilometers' });

console.log('✅ Buffer polygon created');

// Extract coordinates from the buffer polygon
// Result is a Polygon with outer ring
const bufferCoords = bufferPolygon.geometry.coordinates[0]; // Outer ring

console.log(`Buffer has ${bufferCoords.length} points`);
console.log('');

// Convert to Overpass poly: format
// Overpass expects: "lat1 lng1 lat2 lng2 ..." (note: lat FIRST, then lng)
const polygonString = bufferCoords
  .map(([lng, lat]) => `${lat} ${lng}`) // Swap to lat lng order
  .join(' ');

console.log('📝 Polygon string for Overpass:');
console.log(`"${polygonString.substring(0, 100)}..."`);
console.log(`Total length: ${polygonString.length} chars`);
console.log('');

// Build Overpass query using poly: syntax
const query = `[out:json][timeout:180];
(
  node["shop"="bakery"](poly:"${polygonString}");
  way["shop"="bakery"](poly:"${polygonString}");
  node["amenity"="bakery"](poly:"${polygonString}");
  way["amenity"="bakery"](poly:"${polygonString}");
);
out center;`;

console.log('🔍 Querying Overpass API with buffer polygon...');
console.log('');

try {
  const response = await axios.post(OVERPASS_API, query, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 20000,
  });

  console.log('✅ Response Status:', response.status);
  console.log('Elements found:', response.data.elements?.length || 0);
  console.log('');

  if (response.data.elements && response.data.elements.length > 0) {
    console.log('Found bakeries in buffer:');
    response.data.elements.forEach((el, i) => {
      if (el.tags?.name) {
        const lat = el.center?.lat || el.lat;
        const lng = el.center?.lon || el.lon;
        console.log(`  ${i + 1}. ${el.tags.name} (${lat?.toFixed(4)}, ${lng?.toFixed(4)})`);
        if (el.tags['addr:street']) {
          console.log(`     Street: ${el.tags['addr:street']}`);
        }
      }
    });

    // Check for Trölsch
    const troelsch = response.data.elements.find(el =>
      el.tags?.name?.toLowerCase().includes('trölsch')
    );

    if (troelsch) {
      console.log('');
      console.log('🎯 SUCCESS: Found Trölsch with poly: syntax!');
      console.log('  This proves poly: syntax WORKS with buffer polygons');
    }
  } else {
    console.log('❌ No bakeries found in buffer');
    console.log('This might indicate:');
    console.log('  - poly: syntax issue');
    console.log('  - Buffer is too small');
    console.log('  - Query string formatting problem');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.response?.status) {
    console.error('Status:', error.response.status);
    if (error.response?.data) {
      console.error('Response:', error.response.data.substring(0, 200));
    }
  }
}

console.log('');
console.log('📊 Buffer polygon visualization:');
console.log('Buffer points:', bufferCoords.slice(0, 5).map(([lng, lat]) => `[${lat.toFixed(4)}, ${lng.toFixed(4)}]`).join(', '));
console.log('...');
