/**
 * Test script to verify turf-based buffer polygon implementation
 * Tests that the new buildPolygonFromRoute works correctly
 */

import * as turf from '@turf/turf';
import axios from 'axios';

// These are test coordinates from Stuttgart Weilimdorf route (5km route)
const weilimdorfTestCoords = [
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

console.log('Testing turf-based buffer polygon...\n');
console.log(`Input coordinates: ${weilimdorfTestCoords.length} points`);
console.log(`First point: ${weilimdorfTestCoords[0].lat}, ${weilimdorfTestCoords[0].lng}`);
console.log(`Last point: ${weilimdorfTestCoords[weilimdorfTestCoords.length - 1].lat}, ${weilimdorfTestCoords[weilimdorfTestCoords.length - 1].lng}`);

function buildPolygonFromRoute(coords, bufferKm = 3) {
  if (coords.length < 2) {
    console.warn('[POI] Route has too few coordinates for polygon');
    return null;
  }

  try {
    // Create LineString for Turf (uses [lng, lat] format)
    const lineString = turf.lineString(coords.map(c => [c.lng, c.lat]));
    
    console.log(`\n[POI] Creating ${bufferKm}km buffer around ${coords.length} route points...`);
    
    // Create buffer polygon around the line
    const bufferPolygon = turf.buffer(lineString, bufferKm, { units: 'kilometers' });
    
    if (!bufferPolygon || !bufferPolygon.geometry || !bufferPolygon.geometry.coordinates) {
      console.error('[POI] Failed to create buffer polygon or extract coordinates');
      return null;
    }

    // Extract outer ring coordinates from buffer polygon
    const bufferCoords = bufferPolygon.geometry.coordinates[0];
    
    if (!bufferCoords || bufferCoords.length === 0) {
      console.error('[POI] Buffer polygon has no coordinates');
      return null;
    }

    console.log(`[POI] Buffer polygon: ${bufferCoords.length} points`);

    // Convert to Overpass poly: format: "lat1 lng1 lat2 lng2 ..."
    // Important: Overpass expects lat FIRST, then lng
    const polygonStr = bufferCoords
      .map(([lng, lat]) => `${lat} ${lng}`)
      .join(' ');

    console.log(`[POI] Polygon string length: ${polygonStr.length} chars`);
    return polygonStr;
  } catch (error) {
    console.error('[POI] Error building buffer polygon:', error instanceof Error ? error.message : error);
    return null;
  }
}

// Test the function
const polygon = buildPolygonFromRoute(weilimdorfTestCoords);

if (polygon) {
  console.log('\n✅ Buffer polygon created successfully!');
  console.log(`\nPolygon (first 200 chars): ${polygon.substring(0, 200)}...`);
  
  // Sample Overpass query with this polygon
  const overpassQuery = `[timeout:180];(
  node["shop"="bakery"](poly:"${polygon}");
  way["shop"="bakery"](poly:"${polygon}");
  node["amenity"="bakery"](poly:"${polygon}");
  way["amenity"="bakery"](poly:"${polygon}");
);
out center;`;

  console.log(`\nOverpass query length: ${overpassQuery.length} chars`);
  console.log('\nSample Overpass query (first 300 chars):');
  console.log(overpassQuery.substring(0, 300) + '...');

  const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
  
  console.log('\n\nNow testing actual Overpass API query...');
  console.log('Querying for bakeries around Weilimdorf route...\n');

  try {
    const response = await axios.post(OVERPASS_API, overpassQuery, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });

    console.log(`✅ Overpass API Response Status: ${response.status}`);
    console.log(`Found ${response.data.elements?.length || 0} elements`);

    if (response.data.elements && response.data.elements.length > 0) {
      console.log('\nFirst 3 results:');
      response.data.elements.slice(0, 3).forEach((elem, idx) => {
        const lat = elem.center?.lat || elem.lat;
        const lng = elem.center?.lon || elem.lon;
        console.log(`${idx + 1}. ${elem.tags?.name || 'Unknown'} (${lat}, ${lng})`);
      });

      // Check if Trölsch is in results
      const trolsch = response.data.elements.find(elem => 
        elem.tags?.name && elem.tags.name.toLowerCase().includes('trölsch')
      );
      
      if (trolsch) {
        console.log(`\n✅ SUCCESS: Found Bäckerei Trölsch at (${trolsch.center?.lat || trolsch.lat}, ${trolsch.center?.lon || trolsch.lon})`);
      } else {
        console.log(`\n⚠️  Trölsch not found in results, but ${response.data.elements.length} other bakeries were found`);
      }
    } else {
      console.log('⚠️  No elements found in Overpass response');
    }
  } catch (error) {
    console.error('❌ Overpass API Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
  }
} else {
  console.log('❌ Failed to create buffer polygon');
}
