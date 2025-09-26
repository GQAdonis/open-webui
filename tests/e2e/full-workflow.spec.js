/**
 * Full Workflow E2E Test - Complete artifact creation flow
 * Tests real LLM endpoints (OpenAI/Claude) for PAS 3.0 XML artifact generation
 *
 * Requirements from T012:
 * - Test complete workflow: intent detection → prompt enhancement → LLM call → artifact parsing → preview
 * - Use actual LLM endpoints with real API keys
 * - Validate PAS 3.0 XML compliance in responses
 * - Test performance requirements (<30s total workflow)
 * - Validate retry loop prevention mechanisms
 */

import { test, expect } from '@playwright/test';

test.describe('Full Artifact Creation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to chat interface
    await page.goto('/');

    // Wait for chat interface to load
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
  });

  test('should complete full workflow with OpenAI endpoint', async ({ page }) => {
    test.setTimeout(120000); // 2 minute timeout for LLM calls

    // Skip if no OpenAI API key
    test.skip(!process.env.OPENAI_API_KEY, 'OpenAI API key not configured');

    const startTime = Date.now();

    // Step 1: Enter artifact creation prompt
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Create a React button component with onClick handler that shows an alert');

    // Step 2: Submit and verify intent detection
    await page.keyboard.press('Enter');

    // Step 3: Wait for LLM response with PAS 3.0 XML
    const messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 60000 });

    // Step 4: Verify PAS 3.0 XML structure in response
    const xmlContent = messageContainer.locator('pre:has-text("<artifact")');
    await expect(xmlContent).toBeVisible({ timeout: 5000 });

    // Step 5: Verify preview button creation
    const previewButton = messageContainer.locator('[data-testid="preview-artifact-button"]');
    await expect(previewButton).toBeVisible({ timeout: 5000 });

    // Step 6: Click preview and verify Sandpack rendering
    await previewButton.click();

    // Step 7: Wait for Sandpack to load (max 30s to prevent infinite loading)
    const sandpackPreview = page.locator('[data-testid="sandpack-preview"]');
    await expect(sandpackPreview).toBeVisible({ timeout: 30000 });

    // Step 8: Verify no infinite loading state
    const loadingIndicator = page.locator('[data-testid="sandpack-loading"]');
    await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });

    // Step 9: Verify interactive component
    const renderedButton = sandpackPreview.locator('button');
    await expect(renderedButton).toBeVisible();
    await renderedButton.click();

    // Step 10: Performance validation
    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(30000); // <30s requirement

    console.log(`Full workflow completed in ${totalTime/1000}s`);
  });

  test('should complete full workflow with Claude endpoint', async ({ page }) => {
    test.setTimeout(120000); // 2 minute timeout for LLM calls

    // Skip if no Claude API key
    test.skip(!process.env.CLAUDE_API_KEY, 'Claude API key not configured');

    const startTime = Date.now();

    // Step 1: Switch to Claude model (if model selector exists)
    const modelSelector = page.locator('[data-testid="model-selector"]');
    if (await modelSelector.isVisible()) {
      await modelSelector.click();
      await page.locator('text=Claude').click();
    }

    // Step 2: Enter artifact creation prompt
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Create a Vue.js counter component with increment/decrement buttons');

    // Step 3: Submit and verify intent detection
    await page.keyboard.press('Enter');

    // Step 4: Wait for LLM response with PAS 3.0 XML
    const messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 60000 });

    // Step 5: Verify PAS 3.0 XML structure in response
    const xmlContent = messageContainer.locator('pre:has-text("<artifact")');
    await expect(xmlContent).toBeVisible({ timeout: 5000 });

    // Step 6: Verify preview button creation
    const previewButton = messageContainer.locator('[data-testid="preview-artifact-button"]');
    await expect(previewButton).toBeVisible({ timeout: 5000 });

    // Step 7: Click preview and verify Sandpack rendering
    await previewButton.click();

    // Step 8: Wait for Sandpack to load (max 30s to prevent infinite loading)
    const sandpackPreview = page.locator('[data-testid="sandpack-preview"]');
    await expect(sandpackPreview).toBeVisible({ timeout: 30000 });

    // Step 9: Verify no infinite loading state
    const loadingIndicator = page.locator('[data-testid="sandpack-loading"]');
    await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });

    // Step 10: Performance validation
    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(30000); // <30s requirement

    console.log(`Full workflow completed in ${totalTime/1000}s`);
  });

  test('should handle retry loop prevention', async ({ page }) => {
    test.setTimeout(60000);

    // Test will be implemented to validate circuit breaker patterns
    // This is a placeholder that will fail until retry prevention is implemented

    // Step 1: Trigger a scenario that could cause infinite loops
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Create a complex React application with multiple components');
    await page.keyboard.press('Enter');

    // Step 2: Monitor for retry loop prevention
    let retryCount = 0;
    const maxRetries = 3;

    page.on('request', (request) => {
      if (request.url().includes('/api/chat') && request.method() === 'POST') {
        retryCount++;
      }
    });

    // Step 3: Wait for response
    const messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 45000 });

    // Step 4: Validate retry count doesn't exceed limit
    expect(retryCount).toBeLessThanOrEqual(maxRetries);

    console.log(`Retry count: ${retryCount}/${maxRetries}`);
  });

  test('should handle timeout scenarios gracefully', async ({ page }) => {
    test.setTimeout(90000);

    // Test timeout handling when LLM takes too long to respond
    // This will be a placeholder until timeout mechanisms are implemented

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Create an extremely complex artifact with many dependencies');
    await page.keyboard.press('Enter');

    // Should either complete within timeout or show timeout error
    const messageContainer = page.locator('[data-testid="message-container"]').last();

    // Wait for either success or timeout error
    await Promise.race([
      expect(messageContainer).toBeVisible({ timeout: 60000 }),
      expect(page.locator('[data-testid="timeout-error"]')).toBeVisible({ timeout: 65000 })
    ]);

    // Verify no infinite loading state
    const loadingIndicator = page.locator('[data-testid="chat-loading"]');
    await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
  });
});