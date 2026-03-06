/**
 * Simplified test - only bakeries (like the earlier successful test)
 */

import * as turf from '@turf/turf';
import axios from 'axios';

const weilimdorfCoords = [
  { lat: 48.82543, lng: 9.10857 },
  { lat: 48.82556, lng: 9.10881 },
  { lat: 48.82579, lng: 9.10927 },
  { lat: 48.82609, lng: 9.10982 },
  { lat: 48.82643, lng: 9.11051 },
  { lat: 48.82688, lng: 9.11141 },
  { lat: 48.82750, lng: 9.11293 },
  { lat: 48.82831, lng: 9.11504 },
  { lat: 48.82935, lng: 9.11788 },
  { lat: 48.83064, lng: 9.12158 },
  { lat: 48.83226, lng: 9.12643 },
  { lat: 48.83429, lng: 9.13248 },
  { lat: 48.83684, lng: 9.14007 },
  { lat: 48.84008, lng: 9.14963 },
  { lat: 48.84415, lng: 9.16164 },
  { lat: 48.84922, lng: 9.17680 },
  { lat: 48.85547, lng: 9.19551 },
  { lat: 48.86305, lng: 9.21845 },
  { lat: 48.87209, lng: 9.24707 },
  { lat: 48.88267, lng: 9.28234 },
];

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

console.log('=== SIMPLIFIED POI TEST (Bakeries Only) ===\n');

// Create buffer
const lineString = turf.lineString(weilimdorfCoords.map(c => [c.lng, c.lat]));
const bufferPolygon = turf.buffer(lineString, 3, { units: 'kilometers' });
const bufferCoords = bufferPolygon.geometry.coordinates[0];
const polygonStr = bufferCoords
  .map(([lng, lat]) => `${lat} ${lng}`)
  .join(' ');

console.log(`Buffer: ${bufferCoords.length} points\n`);

// Simple bakery query only
const bakeryQuery = `[out:json][timeout:180];(
  node["shop"="bakery"](poly:"${polygonStr}");
  way["shop"="bakery"](poly:"${polygonStr}");
  node["amenity"="bakery"](poly:"${polygonStr}");
  way["amenity"="bakery"](poly:"${polygonStr}");
);
out center;`;

console.log(`Query size: ${bakeryQuery.length} bytes`);
console.log(`First 200 chars: ${bakeryQuery.substring(0, 200)}...\n`);

console.log('Calling Overpass API...\n');

(async () => {
  try {
    const response = await axios.post(OVERPASS_API, bakeryQuery, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });

    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Bakeries found: ${response.data.elements?.length || 0}\n`);

    if (response.data.elements && response.data.elements.length > 0) {
      const bakeries = response.data.elements.map(elem => ({
        name: elem.tags?.name || 'Unknown',
        lat: elem.center?.lat || elem.lat,
        lng: elem.center?.lon || elem.lon,
      }));

      // Check for Trölsch
      const trolsch = bakeries.find(b => b.name.toLowerCase().includes('trölsch'));
      
      console.log('Results:');
      bakeries.slice(0, 10).forEach((b, i) => {
        const mark = b.name.toLowerCase().includes('trölsch') ? '🎯' : '  ';
        console.log(`${mark} ${i+1}. ${b.name.substring(0, 35).padEnd(35)} (${b.lat.toFixed(4)}, ${b.lng.toFixed(4)})`);
      });

      if (bakeries.length > 10) {
        console.log(`\n... and ${bakeries.length - 10} more`);
      }

      if (trolsch) {
        console.log(`\n🎯 TRÖLSCH FOUND at (${trolsch.lat}, ${trolsch.lng})`);
      } else {
        console.log('\n⚠️ Trölsch not found');
      }
    } else {
      console.log('❌ No bakeries found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.status) {
      console.error(`Status: ${error.response.status}`);
    }
  }
})();
