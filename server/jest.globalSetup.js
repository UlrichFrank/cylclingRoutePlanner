/**
 * Jest Global Setup
 * Starts Mock Valhalla server before tests run
 */

import { spawn } from 'child_process';
import axios from 'axios';

let mockProcess;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(url);
      return true;
    } catch (error) {
      await sleep(100);
    }
  }
  return false;
}

export default async function globalSetup() {
  console.log('\n🚀 [Jest Global Setup] Starting Mock Valhalla...');

  mockProcess = spawn('node', ['mock-valhalla.js'], {
    stdio: 'ignore',
    detached: true
  });

  // Wait for server to be ready
  const ready = await waitForServer('http://localhost:8003/health');
  if (ready) {
    console.log('✅ Mock Valhalla ready for tests');
  } else {
    console.error('⚠️ Mock Valhalla may not be ready');
  }

  // Store PID globally for cleanup
  global.__MOCK_VALHALLA_PID__ = mockProcess.pid;
}
