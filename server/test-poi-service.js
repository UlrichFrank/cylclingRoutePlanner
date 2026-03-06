/**
 * Direct test of the POI search service integration
 * Simulates what happens when a user calculates a route
 */

import * as turf from '@turf/turf';
import axios from 'axios';

// Stuttgart Weilimdorf test route (same as before)
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

console.log('=== POI SERVICE TEST ===\n');
console.log(`Route: ${weilimdorfCoords.length} coordinates`);
console.log(`Start: ${weilimdorfCoords[0].lat}, ${weilimdorfCoords[0].lng}`);
console.log(`End: ${weilimdorfCoords[weilimdorfCoords.length - 1].lat}, ${weilimdorfCoords[weilimdorfCoords.length - 1].lng}\n`);

// Step 1: Create buffer polygon (simulating buildPolygonFromRoute)
console.log('STEP 1: Creating 3km buffer polygon...');
const lineString = turf.lineString(weilimdorfCoords.map(c => [c.lng, c.lat]));
const bufferPolygon = turf.buffer(lineString, 3, { units: 'kilometers' });
const bufferCoords = bufferPolygon.geometry.coordinates[0];
const polygonStr = bufferCoords
  .map(([lng, lat]) => `${lat} ${lng}`)
  .join(' ');

console.log(`✅ Buffer created: ${bufferCoords.length} points, ${polygonStr.length} chars\n`);

// Step 2: Build Overpass query
console.log('STEP 2: Building Overpass polygon query...');
const overpassQuery = `[timeout:180];(
  node["amenity"="restaurant"](poly:"${polygonStr}");
  way["amenity"="restaurant"](poly:"${polygonStr}");
  node["amenity"="cafe"](poly:"${polygonStr}");
  way["amenity"="cafe"](poly:"${polygonStr}");
  node["shop"="bakery"](poly:"${polygonStr}");
  way["shop"="bakery"](poly:"${polygonStr}");
  node["amenity"="bakery"](poly:"${polygonStr}");
  way["amenity"="bakery"](poly:"${polygonStr}");
  node["tourism"="attraction"](poly:"${polygonStr}");
  way["tourism"="attraction"](poly:"${polygonStr}");
);
out center;`;

console.log(`✅ Query built: ${overpassQuery.length} chars\n`);

// Step 3: Call Overpass API
console.log('STEP 3: Calling Overpass API...');
console.log(`URL: ${OVERPASS_API}`);

(async () => {
  try {
    console.log('Sending POST request...\n');
    const response = await axios.post(OVERPASS_API, overpassQuery, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });

    console.log(`✅ Response received!\n`);
    console.log(`Status: ${response.status}`);
    console.log(`Elements found: ${response.data.elements?.length || 0}\n`);

    if (!response.data.elements || response.data.elements.length === 0) {
      console.log('⚠️ WARNING: No POIs found in buffer zone');
      process.exit(0);
    }

    // Categorize results
    const categories = {};
    const allPOIs = [];

    response.data.elements.forEach(elem => {
      if (!elem.tags?.name) return;

      const lat = elem.center?.lat || elem.lat;
      const lng = elem.center?.lon || elem.lon;

      const poi = {
        name: elem.tags.name,
        lat,
        lng,
        tags: elem.tags
      };

      allPOIs.push(poi);

      // Categorize
      if (elem.tags.amenity === 'restaurant' || elem.tags.shop === 'restaurant') {
        categories.restaurant = (categories.restaurant || 0) + 1;
      } else if (elem.tags.amenity === 'cafe' || elem.tags.shop === 'cafe') {
        categories.cafe = (categories.cafe || 0) + 1;
      } else if (elem.tags.amenity === 'bakery' || elem.tags.shop === 'bakery') {
        categories.bakery = (categories.bakery || 0) + 1;
      } else if (elem.tags.tourism === 'attraction') {
        categories.attraction = (categories.attraction || 0) + 1;
      }
    });

    console.log('RESULTS BY CATEGORY:');
    console.log('-------------------');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`${cat.padEnd(15)} : ${count}`);
    });
    console.log(`${'TOTAL'.padEnd(15)} : ${allPOIs.length}`);

    // Check for Trölsch
    console.log('\nLooking for Trölsch...');
    const trolsch = allPOIs.find(poi => poi.name.toLowerCase().includes('trölsch'));
    if (trolsch) {
      console.log(`✅ FOUND: ${trolsch.name}`);
      console.log(`   Location: ${trolsch.lat}, ${trolsch.lng}`);
    } else {
      console.log('⚠️ Trölsch not found in results');
    }

    // Show first 5
    console.log('\nFirst 5 POIs:');
    console.log('-----------');
    allPOIs.slice(0, 5).forEach((poi, idx) => {
      console.log(`${idx + 1}. ${poi.name.substring(0, 40).padEnd(40)} (${poi.lat.toFixed(4)}, ${poi.lng.toFixed(4)})`);
    });

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.response?.status) {
      console.error(`HTTP Status: ${error.response.status}`);
      console.error('Response:', error.response.data?.toString().substring(0, 500));
    }
    process.exit(1);
  }
})();
