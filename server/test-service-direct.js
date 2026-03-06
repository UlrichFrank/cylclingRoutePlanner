/**
 * Direct test of the actual TypeScript service code
 * Imports and calls searchPOIsNearRoute directly
 */

import { searchPOIsNearRoute } from '../src/services/overpassService.js';

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

console.log('=== TESTING ACTUAL searchPOIsNearRoute FUNCTION ===\n');
console.log(`Route: ${weilimdorfCoords.length} coordinates`);
console.log(`Start: Weilimdorf (48.825, 9.109)`);
console.log(`End: (48.883, 9.282)\n`);

console.log('Calling searchPOIsNearRoute...\n');

(async () => {
  try {
    const result = await searchPOIsNearRoute(weilimdorfCoords);
    
    console.log('RESULT:');
    console.log(`  POIs found: ${result.pois.length}`);
    console.log(`  Debug polygon: ${result.debugPolygon ? result.debugPolygon.substring(0, 100) + '...' : 'null'}`);
    
    if (result.pois.length > 0) {
      console.log(`\nFirst 5 POIs:`);
      result.pois.slice(0, 5).forEach((poi, i) => {
        console.log(`  ${i+1}. ${poi.name} (${poi.type})`);
      });
      
      const bakeries = result.pois.filter(p => p.type === 'bakery');
      console.log(`\nBakeries found: ${bakeries.length}`);
      
      const trolsch = result.pois.find(p => p.name.toLowerCase().includes('trölsch'));
      if (trolsch) {
        console.log(`🎯 TRÖLSCH FOUND: ${trolsch.name}`);
      }
    } else {
      console.log('\n❌ No POIs found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
