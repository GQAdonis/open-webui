/**
 * Global teardown for Playwright tests
 * Cleanup after all tests complete
 */

async function globalTeardown(config) {
  console.log('🧹 Starting global test teardown...');

  // Add any cleanup logic here if needed
  // For now, just log completion
  console.log('✅ Global test teardown completed');
}

module.exports = globalTeardown;