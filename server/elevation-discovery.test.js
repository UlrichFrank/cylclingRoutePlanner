import { describe, it, expect } from '@jest/globals';

/**
 * Valhalla Elevation API Investigation Test
 * Determines the correct way to get elevation data from Valhalla
 */

describe('Valhalla Elevation API Discovery', () => {
  it('should determine elevation endpoint availability', async () => {
    // Test 1: Direct elevation endpoint
    console.log('\n[Test 1] Testing POST /elevation...');
    try {
      const elevResponse = await fetch('https://valhalla1.openstreetmap.de/elevation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shape: [
            { lat: 48.7758, lon: 9.1829 },
            { lat: 48.8961, lon: 9.1899 }
          ]
        })
      });
      
      const text = await elevResponse.text();
      console.log(`  Status: ${elevResponse.status}`);
      if (elevResponse.status !== 404) {
        console.log('  ✓ Elevation endpoint available');
      } else {
        console.log('  ✗ Elevation endpoint returns 404');
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }

    // Test 2: Check if elevation is in route response
    console.log('\n[Test 2] Testing if elevation in route response...');
    try {
      const routeResponse = await fetch('https://valhalla1.openstreetmap.de/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: [
            { lat: 48.7758, lon: 9.1829 },
            { lat: 48.8961, lon: 9.1899 }
          ],
          costing: 'bicycle'
        })
      });

      const routeData = await routeResponse.json();
      const leg = routeData.trip?.legs?.[0];
      
      console.log(`  Route status: ${routeResponse.status}`);
      console.log(`  Has elevation in leg: ${!!leg?.elevation}`);
      console.log(`  Available in leg: ${leg ? Object.keys(leg).join(', ') : 'N/A'}`);
      
      if (leg?.elevation) {
        console.log(`  ✓ Elevation data available (${leg.elevation.length} points)`);
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }

    // Test 3: Try elevation with shape polyline
    console.log('\n[Test 3] Testing elevation with different shape parameter formats...');
    const testShapes = [
      {
        name: 'Shape as array of objects',
        shape: [{ lat: 48.7758, lon: 9.1829 }, { lat: 48.8961, lon: 9.1899 }]
      }
    ];

    for (const testShape of testShapes) {
      try {
        console.log(`  Testing: ${testShape.name}`);
        const response = await fetch('https://valhalla1.openstreetmap.de/elevation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shape: testShape.shape })
        });
        
        if (response.status === 404) {
          console.log(`    ✗ 404 Not Found`);
        } else if (response.ok) {
          console.log(`    ✓ Success! Status ${response.status}`);
          const data = await response.json();
          console.log(`    Response keys: ${Object.keys(data).join(', ')}`);
        } else {
          console.log(`    Status ${response.status}`);
        }
      } catch (e) {
        console.log(`    Error: ${e.message}`);
      }
    }
  });
});
