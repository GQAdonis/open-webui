/**
 * Global setup for Playwright tests
 * Ensures the application is ready for testing
 */

async function globalSetup(config) {
  console.log('🔧 Starting global test setup...');

  // Wait for the application to be available
  const { request } = await import('@playwright/test');
  const requestContext = await request.newContext();

  const maxRetries = 30;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      console.log(`🔍 Checking if application is ready... (attempt ${retries + 1}/${maxRetries})`);

      const response = await requestContext.get('http://localhost:3001/', {
        timeout: 5000
      });

      if (response.ok()) {
        console.log('✅ Application is ready for testing!');
        await requestContext.dispose();
        return;
      }

      throw new Error(`HTTP ${response.status()}`);
    } catch (error) {
      retries++;
      console.log(`⚠️  Application not ready: ${error.message}`);

      if (retries >= maxRetries) {
        console.error('❌ Application failed to start within timeout period');
        await requestContext.dispose();
        throw new Error('Application not available after 30 attempts');
      }

      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  await requestContext.dispose();
}

module.exports = globalSetup;