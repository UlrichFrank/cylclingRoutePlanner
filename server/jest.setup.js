// Jest setup file - runs before all tests
// Ensure SSL environment variable is set for corporate proxy compatibility
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('[Jest Setup] Setting NODE_TLS_REJECT_UNAUTHORIZED=0 for test environment');
}
