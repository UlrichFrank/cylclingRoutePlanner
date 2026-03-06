/**
 * Test: Can Overpass find bakeries in Weilimdorf (Stuttgart)?
 * Looking for "Bäckerei Trölsch" at Löwenmarkt
 */

import axios from 'axios';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Weilimdorf, Stuttgart bounds (approximately)
const bbox = {
  south: 48.78,
  west: 9.08,
  north: 48.82,
  east: 9.12,
};

// Test 1: Simple bbox query for bakeries 
const query1 = `[out:json][timeout:180];
(
  node["shop"="bakery"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["shop"="bakery"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  node["amenity"="bakery"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["amenity"="bakery"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out center;`;

console.log('Testing Overpass API for bakeries in Weilimdorf...');
console.log('BBox:', bbox);
console.log('');

try {
  const response = await axios.post(OVERPASS_API, query1, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });
  
  console.log('✅ Response Status:', response.status);
  console.log('Elements found:', response.data.elements?.length || 0);
  console.log('');
  
  if (response.data.elements && response.data.elements.length > 0) {
    console.log('Found bakeries:');
    response.data.elements.forEach((el, i) => {
      if (el.tags?.name) {
        const lat = el.center?.lat || el.lat;
        const lng = el.center?.lon || el.lon;
        console.log(`  ${i+1}. ${el.tags.name} (${lat?.toFixed(4)}, ${lng?.toFixed(4)})`);
        if (el.tags['addr:street']) {
          console.log(`     Address: ${el.tags['addr:street']}`);
        }
      }
    });
    
    // Check if Trölsch exists
    const troelsch = response.data.elements.find(el => 
      el.tags?.name?.toLowerCase().includes('trölsch') ||
      el.tags?.name?.toLowerCase().includes('troelsch')
    );
    
    if (troelsch) {
      console.log('');
      console.log('🎯 Found Trölsch!');
      console.log('  Name:', troelsch.tags.name);
      console.log('  Address:', troelsch.tags['addr:full'] || troelsch.tags['addr:street']);
    } else {
      console.log('');
      console.log('❌ Trölsch not found in Overpass results');
    }
  } else {
    console.log('❌ No bakeries found in bbox');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.response?.status) {
    console.error('Status:', error.response.status);
  }
}
