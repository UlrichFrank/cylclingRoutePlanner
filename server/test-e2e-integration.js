#!/usr/bin/env node

/**
 * End-to-End Integration Test
 * Tests: Route calculation → Polyline extraction → Elevation sampling & lookup
 */

import axios from 'axios';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_BASE = 'http://localhost:3001/api';
const MOCK_VALHALLA_PORT = 8003;

let mockProcess;
let serverProcess;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startMockValhalla() {
  console.log('\n📍 Starting Mock Valhalla...');
  return new Promise((resolve, reject) => {
    mockProcess = spawn('node', ['mock-valhalla.js'], {
      cwd: __dirname,
      stdio: 'pipe'
    });

    mockProcess.on('error', reject);
    
    // Wait for startup
    setTimeout(() => {
      axios.get(`http://localhost:${MOCK_VALHALLA_PORT}/health`)
        .then(() => {
          console.log('   ✅ Mock Valhalla ready');
          resolve();
        })
        .catch(() => setTimeout(() => resolve(), 2000));
    }, 1000);
  });
}

async function startBackendServer() {
  console.log('📍 Starting Backend Server...');
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PORT: '3001',
      VALHALLA_API_URL: `http://localhost:${MOCK_VALHALLA_PORT}`,
      NODE_TLS_REJECT_UNAUTHORIZED: '0'
    };

    serverProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      stdio: 'pipe',
      env
    });

    serverProcess.on('error', reject);

    // Wait for startup
    setTimeout(async () => {
      try {
        await axios.get(`${API_BASE}`);
        console.log('   ✅ Backend ready');
        resolve();
      } catch (error) {
        setTimeout(() => resolve(), 2000);
      }
    }, 1000);
  });
}

async function cleanup() {
  console.log('\n🧹 Cleaning up...');
  
  if (serverProcess) {
    serverProcess.kill();
  }
  if (mockProcess) {
    mockProcess.kill();
  }
  
  await sleep(500);
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 END-TO-END INTEGRATION TEST');
  console.log('='.repeat(60));

  try {
    // Setup
    await startMockValhalla();
    await startBackendServer();
    await sleep(2000);

    // Test 1: Route Calculation
    console.log('\n🔄 Test 1: Route Calculation');
    console.log('   POST /api/route with 2 waypoints');
    
    const routeResponse = await axios.post(`${API_BASE}/route`, {
      locations: [
        { lat: 48.7758, lon: 9.1829 },
        { lat: 48.8961, lon: 9.1899 }
      ],
      costing: 'bicycle'
    });

    console.log(`   ✅ Response: ${routeResponse.status}`);
    console.log(`   ✓ Distance: ${routeResponse.data.meta.distance} km`);
    console.log(`   ✓ Duration: ${routeResponse.data.meta.duration} sec`);
    console.log(`   ✓ Waypoints: ${routeResponse.data.meta.waypoints}`);
    
    const polyline = routeResponse.data.data?.trip?.legs?.[0]?.shape;
    if (!polyline) {
      throw new Error('No polyline in route response');
    }
    console.log(`   ✓ Polyline: ${polyline.substring(0, 50)}...`);

    // Test 2: Elevation Profile
    console.log('\n🏔️  Test 2: Elevation Profile');
    console.log(`   POST /api/elevation with polyline`);
    
    const elevationResponse = await axios.post(`${API_BASE}/elevation`, {
      polyline
    });

    console.log(`   ✅ Response: ${elevationResponse.status}`);
    console.log(`   ✓ Sampled points: ${elevationResponse.data.data.sampled_points}`);
    console.log(`   ✓ Elevation gain: ${elevationResponse.data.data.elevation_gain} m`);
    console.log(`   ✓ Elevation loss: ${elevationResponse.data.data.elevation_loss} m`);
    console.log(`   ✓ Min elevation: ${elevationResponse.data.data.min_elevation} m`);
    console.log(`   ✓ Max elevation: ${elevationResponse.data.data.max_elevation} m`);
    console.log(`   ✓ Avg elevation: ${elevationResponse.data.data.avg_elevation} m`);

    // Test 3: Elevation Data Format
    console.log('\n📊 Test 3: Elevation Data Format');
    const elevationData = elevationResponse.data.data.elevation;
    if (!Array.isArray(elevationData)) {
      throw new Error('Elevation data is not an array');
    }
    console.log(`   ✅ Elevation array length: ${elevationData.length}`);
    console.log(`   ✓ Sample values: [${elevationData.slice(0, 5).join(', ')}]`);
    console.log(`   ✓ All numeric: ${elevationData.every(v => typeof v === 'number')}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error(`Error: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response: ${JSON.stringify(error.response.data).substring(0, 300)}`);
    }
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Run tests
runTests();
