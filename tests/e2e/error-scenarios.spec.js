/**
 * Error Scenarios E2E Test - Error handling and edge cases
 * Tests various error conditions and recovery mechanisms
 *
 * Requirements from T013:
 * - Test invalid XML responses from LLM
 * - Test network errors and timeouts
 * - Test malformed artifact content
 * - Test Sandpack rendering failures
 * - Test graceful degradation scenarios
 */

import { test, expect } from '@playwright/test';

test.describe('Error Scenarios and Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
  });

  test('should handle invalid XML responses gracefully', async ({ page }) => {
    test.setTimeout(60000);

    // This test will simulate scenarios where LLM returns invalid XML
    // Placeholder - will be implemented with mock responses

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Create a React component');
    await page.keyboard.press('Enter');

    // Wait for response
    const messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 30000 });

    // For now, just verify the chat doesn't crash
    // Real implementation will test XML parsing error handling
    const errorMessage = page.locator('[data-testid="xml-parse-error"]');
    const successMessage = messageContainer.locator('text=artifact');

    // Should either show error gracefully or succeed
    await Promise.race([
      expect(errorMessage).toBeVisible({ timeout: 5000 }),
      expect(successMessage).toBeVisible({ timeout: 5000 })
    ]);

    // Verify chat interface remains functional
    const chatInputAfter = page.locator('[data-testid="chat-input"]');
    await expect(chatInputAfter).toBeEnabled();
  });

  test('should handle network timeouts gracefully', async ({ page }) => {
    test.setTimeout(90000);

    // Simulate network timeout scenarios
    // This will be implemented with network interception

    // Set up network interception to simulate slow/failed requests
    await page.route('**/api/chat', async (route) => {
      // Delay response to simulate timeout
      await new Promise(resolve => setTimeout(resolve, 5000));
      await route.continue();
    });

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Create a simple component');
    await page.keyboard.press('Enter');

    // Should show loading state initially
    const loadingIndicator = page.locator('[data-testid="chat-loading"]');
    await expect(loadingIndicator).toBeVisible();

    // Should eventually either succeed or show timeout error
    await Promise.race([
      expect(page.locator('[data-testid="message-container"]').last()).toBeVisible({ timeout: 30000 }),
      expect(page.locator('[data-testid="network-timeout-error"]')).toBeVisible({ timeout: 35000 })
    ]);

    // Verify loading state is cleared
    await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
  });

  test('should handle malformed artifact content', async ({ page }) => {
    test.setTimeout(60000);

    // Test scenarios where artifact content is malformed or invalid
    // Placeholder for testing artifact content validation

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Create a React component with complex syntax');
    await page.keyboard.press('Enter');

    const messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 30000 });

    // Look for preview button
    const previewButton = messageContainer.locator('[data-testid="preview-artifact-button"]');

    if (await previewButton.isVisible()) {
      await previewButton.click();

      // Should either render successfully or show error gracefully
      await Promise.race([
        expect(page.locator('[data-testid="sandpack-preview"]')).toBeVisible({ timeout: 30000 }),
        expect(page.locator('[data-testid="sandpack-error"]')).toBeVisible({ timeout: 30000 })
      ]);

      // Verify no infinite loading
      const loadingIndicator = page.locator('[data-testid="sandpack-loading"]');
      await expect(loadingIndicator).not.toBeVisible({ timeout: 35000 });
    }
  });

  test('should handle Sandpack rendering failures', async ({ page }) => {
    test.setTimeout(60000);

    // Test Sandpack-specific error scenarios
    // Placeholder for Sandpack error handling tests

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Create a React component that might cause rendering issues');
    await page.keyboard.press('Enter');

    const messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 30000 });

    const previewButton = messageContainer.locator('[data-testid="preview-artifact-button"]');

    if (await previewButton.isVisible()) {
      await previewButton.click();

      // Monitor for Sandpack errors
      const sandpackContainer = page.locator('[data-testid="sandpack-container"]');
      await expect(sandpackContainer).toBeVisible({ timeout: 10000 });

      // Should resolve within timeout or show error
      await Promise.race([
        expect(page.locator('[data-testid="sandpack-preview"]')).toBeVisible({ timeout: 30000 }),
        expect(page.locator('[data-testid="sandpack-error"]')).toBeVisible({ timeout: 30000 }),
        expect(page.locator('[data-testid="sandpack-timeout"]')).toBeVisible({ timeout: 35000 })
      ]);

      // Verify error is displayed gracefully if rendering fails
      const errorState = page.locator('[data-testid="sandpack-error"], [data-testid="sandpack-timeout"]');
      if (await errorState.isVisible()) {
        // Should show helpful error message
        await expect(errorState).toContainText(/error|timeout|failed/i);
      }
    }
  });

  test('should handle graceful degradation scenarios', async ({ page }) => {
    test.setTimeout(60000);

    // Test fallback behaviors when features are unavailable
    // Placeholder for graceful degradation testing

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Create a TypeScript component');
    await page.keyboard.press('Enter');

    const messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 30000 });

    // Should either show full artifact system or fallback to TSX code block
    const artifactButton = messageContainer.locator('[data-testid="preview-artifact-button"]');
    const tsxCodeBlock = messageContainer.locator('pre code.language-tsx, pre code.language-typescript');

    // At least one should be present
    await Promise.race([
      expect(artifactButton).toBeVisible({ timeout: 10000 }),
      expect(tsxCodeBlock).toBeVisible({ timeout: 10000 })
    ]);

    // If TSX fallback is used, verify it shows proper syntax highlighting
    if (await tsxCodeBlock.isVisible()) {
      await expect(tsxCodeBlock).toBeVisible();
      console.log('Graceful degradation: TSX code block fallback used');
    }

    // If artifact button is used, verify it works
    if (await artifactButton.isVisible()) {
      await artifactButton.click();
      await expect(page.locator('[data-testid="sandpack-container"]')).toBeVisible({ timeout: 10000 });
      console.log('Full artifact system: Preview button worked');
    }
  });

  test('should maintain chat functionality during errors', async ({ page }) => {
    test.setTimeout(60000);

    // Ensure chat remains functional even when artifact system fails
    // Placeholder for system resilience testing

    const chatInput = page.locator('[data-testid="chat-input"]');

    // Send multiple messages to test resilience
    await chatInput.fill('First message - simple text');
    await page.keyboard.press('Enter');

    let messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 15000 });

    // Send artifact request
    await chatInput.fill('Create a React component');
    await page.keyboard.press('Enter');

    messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 30000 });

    // Send another regular message
    await chatInput.fill('Third message - after artifact attempt');
    await page.keyboard.press('Enter');

    messageContainer = page.locator('[data-testid="message-container"]').last();
    await expect(messageContainer).toBeVisible({ timeout: 15000 });

    // Verify all three messages are present
    const allMessages = page.locator('[data-testid="message-container"]');
    await expect(allMessages).toHaveCount(3);

    // Verify chat input remains functional
    await expect(chatInput).toBeEnabled();
    await expect(chatInput).toBeEmpty();
  });
});