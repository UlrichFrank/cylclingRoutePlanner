/**
 * Jest Global Teardown
 * Stops Mock Valhalla after tests finish
 */

import { execSync } from 'child_process';

export default async function globalTeardown() {
  if (global.__MOCK_VALHALLA_PID__) {
    console.log('\n🧹 [Jest Global Teardown] Stopping Mock Valhalla...');
    try {
      // Kill process group (to get all children)
      execSync(`kill -9 ${global.__MOCK_VALHALLA_PID__} 2>/dev/null || true`);
      console.log('✅ Mock Valhalla stopped');
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
}
