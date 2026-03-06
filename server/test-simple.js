/**
 * Ultra-simple test with minimal Overpass query
 */

import axios from 'axios';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Very simple query that we know works
const simpleQuery = `[timeout:180];
(
  node["shop"="bakery"](51.5,-0.2,51.6,-0.1);
  way["shop"="bakery"](51.5,-0.2,51.6,-0.1);
);
out center;`;

console.log('=== SIMPLE BBOX TEST (London) ===\n');
console.log('Query (London bakeries):');
console.log(simpleQuery);
console.log();

(async () => {
  try {
    const response = await axios.post(OVERPASS_API, simpleQuery, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });

    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Found: ${response.data.elements?.length || 0} elements\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Status:', error.response?.status);
  }
})();
