/**
 * Debug: Show raw Overpass response
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

console.log('=== RAW RESPONSE DEBUG ===\n');

const lineString = turf.lineString(weilimdorfCoords.map(c => [c.lng, c.lat]));
const bufferPolygon = turf.buffer(lineString, 3, { units: 'kilometers' });
const bufferCoords = bufferPolygon.geometry.coordinates[0];
const polygonStr = bufferCoords
  .map(([lng, lat]) => `${lat} ${lng}`)
  .join(' ');

const bakeryQuery = `[timeout:180];(
  node["shop"="bakery"](poly:"${polygonStr}");
  way["shop"="bakery"](poly:"${polygonStr}");
  node["amenity"="bakery"](poly:"${polygonStr}");
  way["amenity"="bakery"](poly:"${polygonStr}");
);
out center;`;

console.log('Sending query...\n');

(async () => {
  try {
    const response = await axios.post(OVERPASS_API, bakeryQuery, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });

    console.log(`Status: ${response.status}\n`);
    console.log('RAW RESPONSE DATA:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
})();
