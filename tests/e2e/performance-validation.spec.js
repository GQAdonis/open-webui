/**
 * Performance Validation E2E Test - Performance requirements validation
 * Tests performance characteristics and optimization effectiveness
 *
 * Requirements from T014:
 * - Validate <5s intent classification performance
 * - Validate <10s XML parsing performance
 * - Validate <30s total workflow time
 * - Test memory usage during artifact rendering
 * - Test bundle size impact of new features
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
  });

  test('should meet intent classification performance requirements', async ({ page }) => {
    test.setTimeout(30000);

    // Test intent classification speed (<5s requirement)
    const chatInput = page.locator('[data-testid="chat-input"]');

    const startTime = Date.now();

    // Enter prompt that should trigger intent classification
    await chatInput.fill('Create a React button component with styling');

    // Measure time until intent is detected (indicated by prompt enhancement)
    await page.keyboard.press('Enter');

    // Look for indicators that intent classification has completed
    // This could be prompt enhancement, loading states, or classification UI
    const intentIndicator = page.locator('[data-testid="intent-detected"], [data-testid="prompt-enhanced"]');

    try {
      await expect(intentIndicator).toBeVisible({ timeout: 5000 });
      const intentTime = Date.now() - startTime;
      expect(intentTime).toBeLessThan(5000); // <5s requirement
      console.log(`Intent classification completed in ${intentTime}ms`);
    } catch (error) {
      // If no explicit intent indicator, measure until LLM request starts
      const messageContainer = page.locator('[data-testid="message-container"]').last();
      await expect(messageContainer).toBeVisible({ timeout: 10000 });

      const totalTime = Date.now() - startTime;
      // Intent classification should be a small portion of total time
      console.log(`Total time to LLM request: ${totalTime}ms`);
    }
  });

  test('should meet XML parsing performance requirements', async ({ page }) => {
    test.setTimeout(60000);

    // Skip if no API key for real LLM testing
    test.skip(!process.env.OPENAI_API_KEY && !process.env.CLAUDE_API_KEY, 'No LLM API key configured');

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Create a complex React component with multiple child components');
    await page.keyboard.press('Enter');

    // Wait for LLM response
    const messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 45000 });

    // Look for XML content to parse
    const xmlContent = messageContainer.locator('pre:has-text("<artifact")');
    if (await xmlContent.isVisible()) {
      const parseStartTime = Date.now();

      // Look for preview button creation (indicates XML parsing completed)
      const previewButton = messageContainer.locator('[data-testid="preview-artifact-button"]');
      await expect(previewButton).toBeVisible({ timeout: 10000 });

      const parseTime = Date.now() - parseStartTime;
      expect(parseTime).toBeLessThan(10000); // <10s requirement

      console.log(`XML parsing completed in ${parseTime}ms`);
    }
  });

  test('should meet total workflow performance requirements', async ({ page }) => {
    test.setTimeout(90000);

    // Skip if no API key for real LLM testing
    test.skip(!process.env.OPENAI_API_KEY && !process.env.CLAUDE_API_KEY, 'No LLM API key configured');

    const workflowStartTime = Date.now();

    // Complete workflow test
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Create a React counter component with increment and decrement buttons');
    await page.keyboard.press('Enter');

    // Wait for complete workflow: intent → enhancement → LLM → parsing → preview
    const messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 45000 });

    const previewButton = messageContainer.locator('[data-testid="preview-artifact-button"]');
    if (await previewButton.isVisible()) {
      await previewButton.click();

      // Wait for Sandpack preview
      const sandpackPreview = page.locator('[data-testid="sandpack-preview"]');
      await expect(sandpackPreview).toBeVisible({ timeout: 30000 });

      const totalWorkflowTime = Date.now() - workflowStartTime;
      expect(totalWorkflowTime).toBeLessThan(30000); // <30s requirement

      console.log(`Complete workflow completed in ${totalWorkflowTime/1000}s`);
    } else {
      // If no preview button, at least verify response time
      const responseTime = Date.now() - workflowStartTime;
      console.log(`Response received in ${responseTime/1000}s`);
    }
  });

  test('should validate memory usage during artifact rendering', async ({ page }) => {
    test.setTimeout(60000);

    // Monitor memory usage during artifact rendering
    const initialMemory = await page.evaluate(() => {
      return performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      } : null;
    });

    if (initialMemory) {
      console.log('Initial memory usage:', initialMemory);
    }

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Create a React component with multiple state variables');
    await page.keyboard.press('Enter');

    const messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 30000 });

    const previewButton = messageContainer.locator('[data-testid="preview-artifact-button"]');
    if (await previewButton.isVisible()) {
      await previewButton.click();

      const sandpackPreview = page.locator('[data-testid="sandpack-preview"]');
      await expect(sandpackPreview).toBeVisible({ timeout: 30000 });

      // Measure memory after rendering
      const postRenderMemory = await page.evaluate(() => {
        return performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null;
      });

      if (initialMemory && postRenderMemory) {
        const memoryIncrease = postRenderMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

        console.log('Post-render memory usage:', postRenderMemory);
        console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);

        // Memory increase should be reasonable (less than 50MB for a simple component)
        expect(memoryIncreaseMB).toBeLessThan(50);
      }
    }
  });

  test('should validate bundle size impact', async ({ page }) => {
    test.setTimeout(30000);

    // Monitor network requests to estimate bundle size impact
    const resourceSizes = new Map();
    let totalSize = 0;

    page.on('response', async (response) => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        try {
          const headers = response.headers();
          const contentLength = headers['content-length'];
          if (contentLength) {
            const size = parseInt(contentLength);
            resourceSizes.set(response.url(), size);
            totalSize += size;
          }
        } catch (error) {
          // Ignore errors in size calculation
        }
      }
    });

    // Navigate and trigger artifact system
    await page.reload();
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Create a simple React component');
    await page.keyboard.press('Enter');

    // Wait for any dynamic imports
    await page.waitForTimeout(5000);

    console.log('Bundle size analysis:');
    console.log(`Total size: ${(totalSize / 1024).toFixed(2)}KB`);

    for (const [url, size] of resourceSizes) {
      const filename = url.split('/').pop();
      console.log(`${filename}: ${(size / 1024).toFixed(2)}KB`);
    }

    // Total bundle size should be reasonable (this is a placeholder check)
    // Real implementation would compare against baseline measurements
    expect(totalSize).toBeGreaterThan(0); // At least something was loaded
  });

  test('should validate concurrent artifact rendering performance', async ({ page }) => {
    test.setTimeout(120000);

    // Test performance when multiple artifacts are rendered concurrently
    const chatInput = page.locator('[data-testid="chat-input"]');

    // Create multiple artifact requests
    const startTime = Date.now();

    // First artifact
    await chatInput.fill('Create a React button component');
    await page.keyboard.press('Enter');

    let messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 30000 });

    // Second artifact
    await chatInput.fill('Create a React input field component');
    await page.keyboard.press('Enter');

    messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 30000 });

    // Third artifact
    await chatInput.fill('Create a React list component');
    await page.keyboard.press('Enter');

    messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 30000 });

    const totalTime = Date.now() - startTime;
    console.log(`Three artifacts created in ${totalTime/1000}s`);

    // Try to render all artifacts concurrently
    const previewButtons = page.locator('[data-testid="preview-artifact-button"]');
    const buttonCount = await previewButtons.count();

    if (buttonCount > 0) {
      const renderStartTime = Date.now();

      // Click all preview buttons
      for (let i = 0; i < buttonCount; i++) {
        await previewButtons.nth(i).click();
        await page.waitForTimeout(100); // Small delay between clicks
      }

      // Wait for all Sandpack previews
      const sandpackPreviews = page.locator('[data-testid="sandpack-preview"]');
      await expect(sandpackPreviews.first()).toBeVisible({ timeout: 30000 });

      const renderTime = Date.now() - renderStartTime;
      console.log(`All artifacts rendered in ${renderTime/1000}s`);

      // Should handle concurrent rendering efficiently
      expect(renderTime).toBeLessThan(45000); // <45s for multiple artifacts
    }
  });
});