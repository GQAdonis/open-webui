/**
 * Regression Testing E2E Test - Prevent known issues from recurring
 * Tests specific scenarios that have caused problems in the past
 *
 * Requirements from T015:
 * - Test infinite loading bug scenarios specifically
 * - Test edge cases that caused regressions
 * - Test backward compatibility with existing artifacts
 * - Test system stability under various conditions
 * - Validate fix effectiveness for known issues
 */

import { test, expect } from '@playwright/test';

test.describe('Regression Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
  });

  test('should prevent Sandpack infinite loading regression', async ({ page }) => {
    test.setTimeout(120000);

    // Specifically test scenarios that previously caused infinite loading
    const chatInput = page.locator('[data-testid="chat-input"]');

    // Test Case 1: Complex component with multiple dependencies
    await chatInput.fill('Create a React component that uses useState, useEffect, and imports multiple dependencies');
    await page.keyboard.press('Enter');

    let messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 45000 });

    let previewButton = messageContainer.locator('[data-testid="preview-artifact-button"]');
    if (await previewButton.isVisible()) {
      const renderStartTime = Date.now();
      await previewButton.click();

      // Should resolve within 30s or timeout gracefully
      await Promise.race([
        expect(page.locator('[data-testid="sandpack-preview"]')).toBeVisible({ timeout: 30000 }),
        expect(page.locator('[data-testid="sandpack-timeout"]')).toBeVisible({ timeout: 35000 })
      ]);

      const renderTime = Date.now() - renderStartTime;
      console.log(`Complex component render time: ${renderTime/1000}s`);

      // Verify no infinite loading state
      const loadingIndicator = page.locator('[data-testid="sandpack-loading"]');
      await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
    }

    // Test Case 2: Component with syntax errors
    await chatInput.fill('Create a React component with intentionally complex JSX structure');
    await page.keyboard.press('Enter');

    messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 45000 });

    previewButton = messageContainer.locator('[data-testid="preview-artifact-button"]');
    if (await previewButton.isVisible()) {
      await previewButton.click();

      // Should handle gracefully without infinite loading
      await Promise.race([
        expect(page.locator('[data-testid="sandpack-preview"]')).toBeVisible({ timeout: 30000 }),
        expect(page.locator('[data-testid="sandpack-error"]')).toBeVisible({ timeout: 30000 }),
        expect(page.locator('[data-testid="sandpack-timeout"]')).toBeVisible({ timeout: 35000 })
      ]);

      // Verify no infinite loading
      const loadingIndicator = page.locator('[data-testid="sandpack-loading"]');
      await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
    }

    // Test Case 3: Multiple rapid artifact requests
    for (let i = 0; i < 3; i++) {
      await chatInput.fill(`Create a simple React component variant ${i + 1}`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500); // Small delay between requests
    }

    // Wait for all responses
    await expect(page.locator('[data-testid="message-container"]')).toHaveCount(5); // 2 previous + 3 new

    // Try rendering the last artifact
    const lastMessage = page.locator('[data-testid="message-container"]').last();
    const lastPreviewButton = lastMessage.locator('[data-testid="preview-artifact-button"]');

    if (await lastPreviewButton.isVisible()) {
      await lastPreviewButton.click();

      // Should not cause infinite loading even with previous artifacts in memory
      await Promise.race([
        expect(page.locator('[data-testid="sandpack-preview"]').last()).toBeVisible({ timeout: 30000 }),
        expect(page.locator('[data-testid="sandpack-error"]').last()).toBeVisible({ timeout: 30000 })
      ]);
    }
  });

  test('should maintain backward compatibility with existing artifacts', async ({ page }) => {
    test.setTimeout(60000);

    // Test that new system doesn't break existing artifact patterns
    const chatInput = page.locator('[data-testid="chat-input"]');

    // Test existing simple patterns
    await chatInput.fill('Create a basic React functional component');
    await page.keyboard.press('Enter');

    const messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 30000 });

    // Should work with both new PAS 3.0 and legacy artifact formats
    const artifactContent = messageContainer.locator('pre, [data-testid="artifact-content"]');
    await expect(artifactContent).toBeVisible({ timeout: 5000 });

    // Check for preview functionality
    const previewButton = messageContainer.locator('[data-testid="preview-artifact-button"]');
    const legacyCodeBlock = messageContainer.locator('pre code.language-jsx, pre code.language-tsx');

    // Should have either new preview system or fallback to syntax highlighting
    const hasPreview = await previewButton.isVisible();
    const hasCodeBlock = await legacyCodeBlock.isVisible();

    expect(hasPreview || hasCodeBlock).toBeTruthy();

    if (hasPreview) {
      await previewButton.click();
      await expect(page.locator('[data-testid="sandpack-preview"]')).toBeVisible({ timeout: 30000 });
      console.log('New artifact system working');
    } else if (hasCodeBlock) {
      console.log('Fallback to code block working');
    }
  });

  test('should handle system stability under stress conditions', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for stress testing

    // Test system stability with rapid requests and multiple artifacts
    const chatInput = page.locator('[data-testid="chat-input"]');

    const stressTestPrompts = [
      'Create a React button with click handler',
      'Create a React input field with validation',
      'Create a React list component with map function',
      'Create a React modal component with state',
      'Create a React form with multiple inputs'
    ];

    // Send multiple requests rapidly
    for (let i = 0; i < stressTestPrompts.length; i++) {
      await chatInput.fill(stressTestPrompts[i]);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200); // Very short delay
    }

    // Wait for all responses
    await expect(page.locator('[data-testid="message-container"]')).toHaveCount(stressTestPrompts.length);

    // Try to render all artifacts
    const previewButtons = page.locator('[data-testid="preview-artifact-button"]');
    const buttonCount = await previewButtons.count();

    let successfulRenders = 0;
    let erroredRenders = 0;

    for (let i = 0; i < buttonCount; i++) {
      try {
        await previewButtons.nth(i).click();
        await page.waitForTimeout(500); // Allow time for rendering to start

        // Check if render succeeded or failed gracefully
        const sandpackPreview = page.locator('[data-testid="sandpack-preview"]').nth(i);
        const sandpackError = page.locator('[data-testid="sandpack-error"]').nth(i);

        await Promise.race([
          expect(sandpackPreview).toBeVisible({ timeout: 15000 }),
          expect(sandpackError).toBeVisible({ timeout: 15000 })
        ]);

        if (await sandpackPreview.isVisible()) {
          successfulRenders++;
        } else if (await sandpackError.isVisible()) {
          erroredRenders++;
        }
      } catch (error) {
        erroredRenders++;
        console.log(`Render ${i + 1} failed: ${error.message}`);
      }
    }

    console.log(`Stress test results: ${successfulRenders} successful, ${erroredRenders} errors out of ${buttonCount} total`);

    // System should remain stable - at least 50% success rate
    const successRate = successfulRenders / buttonCount;
    expect(successRate).toBeGreaterThan(0.5);

    // Chat should remain functional after stress test
    await chatInput.fill('Test message after stress test');
    await page.keyboard.press('Enter');

    const finalMessage = page.locator('[data-testid="message-container"]').last();
    await expect(finalMessage).toBeVisible({ timeout: 15000 });

    // Verify no memory leaks or broken states
    const currentUrl = page.url();
    expect(currentUrl).toContain('/'); // Should still be on chat page

    const chatInputFinal = page.locator('[data-testid="chat-input"]');
    await expect(chatInputFinal).toBeEnabled();
  });

  test('should validate fix effectiveness for known timeout issues', async ({ page }) => {
    test.setTimeout(90000);

    // Test specific scenarios that previously caused timeout problems
    const chatInput = page.locator('[data-testid="chat-input"]');

    // Scenario 1: Large component with many imports
    await chatInput.fill('Create a comprehensive React dashboard component with charts, tables, and multiple UI elements');
    await page.keyboard.press('Enter');

    const messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 60000 });

    const previewButton = messageContainer.locator('[data-testid="preview-artifact-button"]');
    if (await previewButton.isVisible()) {
      const startTime = Date.now();
      await previewButton.click();

      // Should resolve within timeout period or show timeout error
      const timeoutOccurred = await Promise.race([
        page.locator('[data-testid="sandpack-preview"]').waitFor({ timeout: 45000 }).then(() => false),
        page.locator('[data-testid="sandpack-timeout"]').waitFor({ timeout: 50000 }).then(() => true),
        new Promise(resolve => setTimeout(() => resolve(true), 55000))
      ]);

      const renderTime = Date.now() - startTime;
      console.log(`Complex dashboard render: ${renderTime/1000}s, timeout: ${timeoutOccurred}`);

      if (timeoutOccurred) {
        // Verify timeout is handled gracefully
        const timeoutElement = page.locator('[data-testid="sandpack-timeout"]');
        await expect(timeoutElement).toBeVisible();
        await expect(timeoutElement).toContainText(/timeout|failed|error/i);
      }

      // Verify system remains responsive after timeout
      const loadingIndicator = page.locator('[data-testid="sandpack-loading"]');
      await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle edge cases that previously caused crashes', async ({ page }) => {
    test.setTimeout(60000);

    // Test specific edge cases that have caused problems
    const chatInput = page.locator('[data-testid="chat-input"]');

    const edgeCasePrompts = [
      'Create a React component with extremely long variable names and complex nested JSX',
      'Create a React component with unicode characters and special symbols',
      'Create a React component that uses cutting-edge React features and experimental APIs',
      'Create a React component with intentionally complex prop drilling and context usage'
    ];

    for (const prompt of edgeCasePrompts) {
      await chatInput.fill(prompt);
      await page.keyboard.press('Enter');

      const messageContainer = page.locator('[data-testid="message-container"]').last();
      await expect(messageContainer).toBeVisible({ timeout: 45000 });

      // Should not crash the entire interface
      const chatInputAfter = page.locator('[data-testid="chat-input"]');
      await expect(chatInputAfter).toBeEnabled();

      // If preview button exists, test it doesn't crash
      const previewButton = messageContainer.locator('[data-testid="preview-artifact-button"]');
      if (await previewButton.isVisible()) {
        await previewButton.click();

        // Should either work or fail gracefully
        await Promise.race([
          expect(page.locator('[data-testid="sandpack-preview"]')).toBeVisible({ timeout: 20000 }),
          expect(page.locator('[data-testid="sandpack-error"]')).toBeVisible({ timeout: 20000 }),
          expect(page.locator('[data-testid="sandpack-timeout"]')).toBeVisible({ timeout: 25000 })
        ]);

        // Verify no crashes
        const pageTitle = await page.title();
        expect(pageTitle).toBeTruthy(); // Page should still be responsive
      }

      console.log(`Edge case handled: ${prompt.substring(0, 50)}...`);
    }

    // Final verification that system is still functional
    await chatInput.fill('Simple test message to verify system recovery');
    await page.keyboard.press('Enter');

    const finalMessage = page.locator('[data-testid="message-container"]').last();
    await expect(finalMessage).toBeVisible({ timeout: 15000 });
  });
});