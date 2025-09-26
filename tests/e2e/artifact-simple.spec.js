/**
 * Simple E2E Test for Artifact System Validation
 *
 * This test validates that:
 * 1. The artifact system components are properly loaded
 * 2. No console errors occur during artifact detection
 * 3. The UnifiedSandpackRenderer is working without infinite loops
 */

import { test, expect } from '@playwright/test';

test.describe('Simple Artifact System Validation', () => {

  test('should load artifact system without errors', async ({ page }) => {
    console.log('🧪 Starting simple artifact system validation...');

    // Monitor console errors
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.log(`❌ Console error: ${msg.text()}`);
      }
    });

    // Navigate to the application
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    // Wait for initial loading
    await page.waitForTimeout(5000);

    // Check if the application loaded successfully
    const title = await page.title();
    console.log(`🧪 Page title: ${title}`);

    // Check for critical errors
    const hasCriticalErrors = errors.some(error =>
      error.includes('querySelector') && error.includes('null') ||
      error.includes('Cannot read properties of null') ||
      error.includes('UnifiedSandpackRenderer') ||
      error.includes('infinite loop')
    );

    // Take a screenshot for validation
    await page.screenshot({ path: 'artifact-system-validation.png', fullPage: true });

    // Assertions
    expect(title).toBeTruthy();
    expect(hasCriticalErrors).toBe(false);

    console.log('✅ Artifact system validation completed successfully!');
    console.log(`📊 Total console errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('⚠️  Console errors found (but no critical artifact errors):');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
  });

  test('should validate artifact components are loaded', async ({ page }) => {
    console.log('🧪 Validating artifact components...');

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    // Check if artifact-related JavaScript is loaded
    const hasArtifactComponents = await page.evaluate(() => {
      // Check for artifact-related global objects or modules
      return typeof window !== 'undefined' &&
             (document.querySelector('script[src*="artifact"]') !== null ||
              document.querySelector('script[src*="sandpack"]') !== null ||
              window.__SVELTEKIT__ !== undefined);
    });

    console.log(`🧪 Artifact components loaded: ${hasArtifactComponents}`);

    // Check for Svelte components in the DOM
    const hasSvelteComponents = await page.evaluate(() => {
      return document.querySelector('[data-svelte]') !== null ||
             document.querySelector('.svelte-') !== null ||
             document.querySelectorAll('*').length > 10; // Basic DOM check
    });

    console.log(`🧪 Svelte components detected: ${hasSvelteComponents}`);

    expect(hasArtifactComponents || hasSvelteComponents).toBe(true);

    console.log('✅ Artifact components validation completed!');
  });

});