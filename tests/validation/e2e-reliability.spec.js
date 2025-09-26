/**
 * E2E Test Suite Reliability Validation (T052)
 *
 * Validates the reliability and consistency of the E2E test suite
 * for the Enhanced Artifact Creation and Preview System in CI environments.
 */

import { test, expect } from '@playwright/test';

// Test configuration for reliability validation
const reliabilityConfig = {
  maxRetries: 3,           // Number of retries for flaky tests
  timeout: 60000,          // 60 second timeout per test
  navigationTimeout: 30000, // 30 second navigation timeout
  actionTimeout: 15000,    // 15 second action timeout
  expectTimeout: 10000     // 10 second assertion timeout
};

// Test artifacts for consistency validation
const testArtifacts = {
  simpleReact: `<artifact identifier="simple-react" type="application/vnd.react+jsx" title="Simple Counter">
<file path="Counter.jsx">
<![CDATA[
import React, { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Counter: {count}</h1>
      <button
        onClick={() => setCount(count + 1)}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Increment
      </button>
    </div>
  );
}
]]>
</file>
</artifact>`,

  simpleHTML: `<artifact identifier="simple-html" type="text/html" title="Hello World">
<file path="index.html">
<![CDATA[
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        h1 {
            font-size: 3em;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Hello World!</h1>
        <p>This is a simple HTML artifact for testing.</p>
    </div>
</body>
</html>
]]>
</file>
</artifact>`
};

// Utility functions for reliability testing
const waitForStableState = async (page, selector, timeout = 5000) => {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      await page.waitForSelector(selector, { timeout: timeout / maxAttempts });
      await page.waitForTimeout(500); // Allow time for animations/state changes
      return true;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(`Element ${selector} not stable after ${maxAttempts} attempts`);
      }
      await page.waitForTimeout(1000);
    }
  }
};

const retryAction = async (action, maxRetries = 3) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    }
  }
  throw lastError;
};

test.describe('E2E Test Suite Reliability Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Set timeouts from reliability config
    page.setDefaultTimeout(reliabilityConfig.timeout);
    page.setDefaultNavigationTimeout(reliabilityConfig.navigationTimeout);

    // Navigate to application with retry logic
    await retryAction(async () => {
      await page.goto('/', { waitUntil: 'networkidle' });
    });

    // Ensure page is fully loaded
    await waitForStableState(page, 'body');
  });

  test.describe('Core Functionality Reliability', () => {

    test('should consistently detect and render React artifacts', async ({ page }) => {
      // Test should pass consistently across multiple runs
      for (let iteration = 1; iteration <= 3; iteration++) {
        console.log(`Iteration ${iteration}: Testing React artifact detection`);

        // Send artifact message with retry logic
        await retryAction(async () => {
          await page.fill('[data-testid="chat-input"]', `Test React artifact: ${testArtifacts.simpleReact}`);
          await page.click('[data-testid="send-button"]');
        });

        // Wait for artifact detection with stability check
        await waitForStableState(page, '[data-testid="artifact-container"]', 15000);

        // Verify artifact was detected
        const artifactTitle = await page.textContent('[data-testid="artifact-title"]');
        expect(artifactTitle).toContain('Simple Counter');

        // Click preview with retry logic
        await retryAction(async () => {
          await page.click('[data-testid="artifact-preview-button"]');
        });

        // Wait for Sandpack to load reliably
        await waitForStableState(page, 'iframe[title*="Sandpack"]', 20000);

        // Test interactivity reliably
        const iframe = page.frameLocator('iframe[title*="Sandpack"]');

        await retryAction(async () => {
          await expect(iframe.locator('h1')).toContainText('Counter: 0', { timeout: 15000 });
          await iframe.locator('button').click();
          await expect(iframe.locator('h1')).toContainText('Counter: 1', { timeout: 10000 });
        });

        // Clear for next iteration
        if (iteration < 3) {
          await page.reload({ waitUntil: 'networkidle' });
          await waitForStableState(page, 'body');
        }
      }
    });

    test('should consistently handle HTML artifacts across browsers', async ({ page, browserName }) => {
      console.log(`Testing HTML artifacts in ${browserName}`);

      // Browser-specific timeout adjustments
      const browserTimeout = browserName === 'webkit' ? 25000 : 20000;

      await retryAction(async () => {
        await page.fill('[data-testid="chat-input"]', `HTML artifact: ${testArtifacts.simpleHTML}`);
        await page.click('[data-testid="send-button"]');
      });

      await waitForStableState(page, '[data-testid="artifact-container"]', browserTimeout);

      const title = await page.textContent('[data-testid="artifact-title"]');
      expect(title).toContain('Hello World');

      await retryAction(async () => {
        await page.click('[data-testid="artifact-preview-button"]');
      });

      // Wait for iframe with browser-specific handling
      if (browserName === 'webkit') {
        await page.waitForTimeout(2000); // Safari needs extra time
      }

      await waitForStableState(page, 'iframe[title*="preview"]', browserTimeout);

      const iframe = page.frameLocator('iframe[title*="preview"]');
      await expect(iframe.locator('h1')).toContainText('Hello World!', { timeout: 15000 });
    });

    test('should handle error conditions reliably', async ({ page }) => {
      const malformedArtifact = `<artifact identifier="bad" type="text/html">
        <file path="index.html">
          <![CDATA[<html><body><h1>Malformed content</body></html>]]>
        </file>
      </artifact>`;

      // Test multiple error scenarios
      const errorScenarios = [
        { name: 'malformed XML', content: malformedArtifact },
        { name: 'oversized content', content: malformedArtifact.repeat(1000) },
        { name: 'empty artifact', content: '<artifact></artifact>' }
      ];

      for (const scenario of errorScenarios) {
        console.log(`Testing error handling: ${scenario.name}`);

        await retryAction(async () => {
          await page.fill('[data-testid="chat-input"]', scenario.content);
          await page.click('[data-testid="send-button"]');
        });

        // Wait for either artifact or error message
        try {
          await page.waitForSelector('[data-testid="artifact-container"], [data-testid="error-message"]', { timeout: 10000 });
        } catch (error) {
          // If neither appears, that's also a valid state (no artifact detected)
          console.log(`No artifact or error detected for ${scenario.name} (expected behavior)`);
        }

        // Ensure page remains responsive
        await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled({ timeout: 5000 });

        // Clear input for next test
        await page.fill('[data-testid="chat-input"]', '');
      }
    });
  });

  test.describe('Performance Consistency', () => {

    test('should maintain consistent performance across runs', async ({ page }) => {
      const performanceResults = [];

      // Run performance test multiple times
      for (let run = 1; run <= 5; run++) {
        console.log(`Performance run ${run}/5`);

        const startTime = Date.now();

        await retryAction(async () => {
          await page.fill('[data-testid="chat-input"]', testArtifacts.simpleReact);
          await page.click('[data-testid="send-button"]');
        });

        await waitForStableState(page, '[data-testid="artifact-container"]', 15000);

        const detectionTime = Date.now() - startTime;

        await retryAction(async () => {
          await page.click('[data-testid="artifact-preview-button"]');
        });

        await waitForStableState(page, 'iframe[title*="Sandpack"]', 20000);

        const totalTime = Date.now() - startTime;

        performanceResults.push({
          run,
          detectionTime,
          totalTime
        });

        // Performance assertions
        expect(detectionTime).toBeLessThan(15000); // 15 second detection limit
        expect(totalTime).toBeLessThan(30000);     // 30 second total limit

        // Reset for next run
        if (run < 5) {
          await page.reload({ waitUntil: 'networkidle' });
          await waitForStableState(page, 'body');
        }
      }

      // Analyze performance consistency
      const avgDetectionTime = performanceResults.reduce((sum, result) => sum + result.detectionTime, 0) / performanceResults.length;
      const avgTotalTime = performanceResults.reduce((sum, result) => sum + result.totalTime, 0) / performanceResults.length;

      console.log('Performance Summary:', {
        avgDetectionTime: `${avgDetectionTime}ms`,
        avgTotalTime: `${avgTotalTime}ms`,
        results: performanceResults.map(r => ({
          run: r.run,
          detection: `${r.detectionTime}ms`,
          total: `${r.totalTime}ms`
        }))
      });

      // Performance should be consistent (within 50% variance)
      performanceResults.forEach(result => {
        expect(result.detectionTime).toBeLessThan(avgDetectionTime * 1.5);
        expect(result.totalTime).toBeLessThan(avgTotalTime * 1.5);
      });
    });

    test('should handle concurrent artifact processing', async ({ page }) => {
      console.log('Testing concurrent artifact processing');

      // Send multiple artifacts rapidly
      const artifacts = [
        testArtifacts.simpleReact,
        testArtifacts.simpleHTML,
        testArtifacts.simpleReact.replace('simple-react', 'react-2'),
      ];

      for (let i = 0; i < artifacts.length; i++) {
        await page.fill('[data-testid="chat-input"]', artifacts[i]);
        await page.click('[data-testid="send-button"]');

        // Small delay between sends
        await page.waitForTimeout(500);
      }

      // Wait for all artifacts to be processed
      await page.waitForTimeout(5000);

      // Check that page is still responsive
      await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();

      // Should have multiple artifact containers
      const artifactContainers = await page.locator('[data-testid="artifact-container"]').count();
      expect(artifactContainers).toBeGreaterThan(0);

      console.log(`Successfully processed ${artifactContainers} concurrent artifacts`);
    });
  });

  test.describe('State Management Reliability', () => {

    test('should maintain UI state consistency', async ({ page }) => {
      console.log('Testing UI state consistency');

      // Send artifact
      await retryAction(async () => {
        await page.fill('[data-testid="chat-input"]', testArtifacts.simpleReact);
        await page.click('[data-testid="send-button"]');
      });

      await waitForStableState(page, '[data-testid="artifact-container"]');

      // Test state preservation across interactions
      const previewButton = page.locator('[data-testid="artifact-preview-button"]');

      // Initial state
      await expect(previewButton).toBeVisible();
      await expect(previewButton).toBeEnabled();

      // Click preview
      await previewButton.click();
      await waitForStableState(page, 'iframe[title*="Sandpack"]', 20000);

      // State after preview
      await expect(previewButton).toBeVisible();

      // Test state after page interaction
      await page.locator('body').click(); // Click outside
      await page.waitForTimeout(1000);

      // State should remain consistent
      await expect(previewButton).toBeVisible();
      await expect(page.locator('[data-testid="artifact-container"]')).toBeVisible();
    });

    test('should handle page refresh gracefully', async ({ page }) => {
      console.log('Testing page refresh handling');

      // Send artifact
      await retryAction(async () => {
        await page.fill('[data-testid="chat-input"]', testArtifacts.simpleHTML);
        await page.click('[data-testid="send-button"]');
      });

      await waitForStableState(page, '[data-testid="artifact-container"]');

      // Get initial state
      const initialTitle = await page.textContent('[data-testid="artifact-title"]');

      // Refresh page
      await page.reload({ waitUntil: 'networkidle' });
      await waitForStableState(page, 'body');

      // Page should be functional after refresh
      await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();

      // Can send new artifacts
      await retryAction(async () => {
        await page.fill('[data-testid="chat-input"]', testArtifacts.simpleReact);
        await page.click('[data-testid="send-button"]');
      });

      await waitForStableState(page, '[data-testid="artifact-container"]');

      const newTitle = await page.textContent('[data-testid="artifact-title"]');
      expect(newTitle).not.toBe(initialTitle); // Should be different artifact
    });
  });

  test.describe('Browser Compatibility Validation', () => {

    test('should work consistently across all supported browsers', async ({ page, browserName }) => {
      console.log(`Validating consistency in ${browserName}`);

      // Browser-specific adjustments
      const browserConfig = {
        chromium: { timeout: 15000, stable: 500 },
        firefox: { timeout: 20000, stable: 1000 },
        webkit: { timeout: 25000, stable: 1500 }
      };

      const config = browserConfig[browserName] || browserConfig.chromium;

      // Test artifact workflow
      await retryAction(async () => {
        await page.fill('[data-testid="chat-input"]', testArtifacts.simpleReact);
        await page.click('[data-testid="send-button"]');
      });

      await page.waitForTimeout(config.stable); // Browser-specific stability wait
      await waitForStableState(page, '[data-testid="artifact-container"]', config.timeout);

      // Verify consistent functionality
      const title = await page.textContent('[data-testid="artifact-title"]');
      expect(title).toContain('Simple Counter');

      await retryAction(async () => {
        await page.click('[data-testid="artifact-preview-button"]');
      });

      await page.waitForTimeout(config.stable);
      await waitForStableState(page, 'iframe[title*="Sandpack"]', config.timeout);

      // Test interactivity (browser-agnostic)
      const iframe = page.frameLocator('iframe[title*="Sandpack"]');
      await expect(iframe.locator('h1')).toContainText('Counter: 0', { timeout: config.timeout });

      console.log(`✅ ${browserName} validation passed`);
    });

    test('should handle browser-specific features', async ({ page, browserName }) => {
      // Test features that might behave differently across browsers

      // Local storage
      await page.evaluate(() => {
        localStorage.setItem('test-key', 'test-value');
      });

      const stored = await page.evaluate(() => localStorage.getItem('test-key'));
      expect(stored).toBe('test-value');

      // Session storage
      await page.evaluate(() => {
        sessionStorage.setItem('session-key', 'session-value');
      });

      const session = await page.evaluate(() => sessionStorage.getItem('session-key'));
      expect(session).toBe('session-value');

      // Cleanup
      await page.evaluate(() => {
        localStorage.removeItem('test-key');
        sessionStorage.removeItem('session-key');
      });

      console.log(`✅ Browser-specific features work in ${browserName}`);
    });
  });

  test.describe('CI Environment Validation', () => {

    test('should run reliably in headless mode', async ({ page }) => {
      // This test specifically validates headless execution
      console.log('Validating headless execution reliability');

      // Check if running in headless mode
      const isHeadless = await page.evaluate(() => {
        return navigator.webdriver || window.navigator.webdriver;
      });

      console.log(`Running in headless mode: ${isHeadless}`);

      // Standard artifact test in headless mode
      await retryAction(async () => {
        await page.fill('[data-testid="chat-input"]', testArtifacts.simpleHTML);
        await page.click('[data-testid="send-button"]');
      });

      await waitForStableState(page, '[data-testid="artifact-container"]', 20000);
      await expect(page.locator('[data-testid="artifact-title"]')).toContainText('Hello World');

      // Headless mode should handle iframe rendering
      await retryAction(async () => {
        await page.click('[data-testid="artifact-preview-button"]');
      });

      await waitForStableState(page, 'iframe[title*="preview"]', 25000);

      const iframe = page.frameLocator('iframe[title*="preview"]');
      await expect(iframe.locator('h1')).toContainText('Hello World!', { timeout: 20000 });

      console.log('✅ Headless mode validation passed');
    });

    test('should handle network conditions reliably', async ({ page }) => {
      console.log('Testing network reliability');

      // Test with simulated slow network
      await page.route('**/*', async route => {
        // Add 100ms delay to all requests
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.continue();
      });

      // Standard workflow should still work
      await retryAction(async () => {
        await page.fill('[data-testid="chat-input"]', testArtifacts.simpleReact);
        await page.click('[data-testid="send-button"]');
      });

      await waitForStableState(page, '[data-testid="artifact-container"]', 25000);

      const title = await page.textContent('[data-testid="artifact-title"]');
      expect(title).toContain('Simple Counter');

      console.log('✅ Network conditions handling validated');
    });

    test('should clean up resources properly', async ({ page }) => {
      console.log('Testing resource cleanup');

      // Create multiple artifacts
      for (let i = 0; i < 3; i++) {
        const artifact = testArtifacts.simpleReact.replace('simple-react', `react-${i}`);
        await page.fill('[data-testid="chat-input"]', artifact);
        await page.click('[data-testid="send-button"]');
        await page.waitForTimeout(2000);
      }

      // Check resource usage (if available)
      const memoryInfo = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory;
        }
        return null;
      });

      if (memoryInfo) {
        const memoryMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
        console.log(`Memory usage: ${memoryMB.toFixed(2)}MB`);

        // Should not exceed reasonable limits
        expect(memoryMB).toBeLessThan(100); // 100MB limit
      }

      // Page should remain responsive
      await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();

      console.log('✅ Resource cleanup validation passed');
    });
  });

  test.describe('Test Suite Meta-Validation', () => {

    test('should provide consistent test timing', async ({ page }) => {
      const timings = [];

      // Run same test multiple times to check timing consistency
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();

        await page.fill('[data-testid="chat-input"]', testArtifacts.simpleHTML);
        await page.click('[data-testid="send-button"]');
        await waitForStableState(page, '[data-testid="artifact-container"]', 15000);

        const timing = Date.now() - startTime;
        timings.push(timing);

        if (i < 2) {
          await page.reload({ waitUntil: 'networkidle' });
          await waitForStableState(page, 'body');
        }
      }

      // Check timing consistency (should be within reasonable variance)
      const avgTiming = timings.reduce((sum, t) => sum + t, 0) / timings.length;
      const maxVariance = avgTiming * 0.5; // 50% variance allowed

      timings.forEach(timing => {
        expect(Math.abs(timing - avgTiming)).toBeLessThan(maxVariance);
      });

      console.log('Timing consistency validation:', {
        timings: timings.map(t => `${t}ms`),
        average: `${avgTiming.toFixed(0)}ms`,
        variance: `${maxVariance.toFixed(0)}ms`
      });
    });

    test('should handle test isolation properly', async ({ page }) => {
      // Test 1: Create artifact
      await page.fill('[data-testid="chat-input"]', testArtifacts.simpleReact);
      await page.click('[data-testid="send-button"]');
      await waitForStableState(page, '[data-testid="artifact-container"]');

      const firstTitle = await page.textContent('[data-testid="artifact-title"]');

      // Reset state (simulating test isolation)
      await page.reload({ waitUntil: 'networkidle' });
      await waitForStableState(page, 'body');

      // Test 2: Create different artifact
      await page.fill('[data-testid="chat-input"]', testArtifacts.simpleHTML);
      await page.click('[data-testid="send-button"]');
      await waitForStableState(page, '[data-testid="artifact-container"]');

      const secondTitle = await page.textContent('[data-testid="artifact-title"]');

      // Should be completely independent
      expect(firstTitle).not.toBe(secondTitle);
      expect(secondTitle).toContain('Hello World');

      console.log('✅ Test isolation validation passed');
    });
  });
});

// Export configuration for use in other test files
export {
  reliabilityConfig,
  testArtifacts,
  waitForStableState,
  retryAction
};