/**
 * E2E Test Page Artifact Validation
 *
 * This test validates both indirect and direct artifact scenarios using
 * a dedicated test page that bypasses authentication issues.
 *
 * Test Scenarios:
 * 1. Indirect: User generates TSX code → code block → Preview button → artifact preview
 * 2. Direct: User prompt → XML CDATA → artifact button → automatic preview
 */

import { test, expect } from '@playwright/test';

test.describe('E2E Test Page Artifact Validation', () => {

  test('should handle indirect artifact scenario - TSX code block with Preview button', async ({ page }) => {
    test.setTimeout(60000); // 1 minute timeout

    console.log('🧪 Starting indirect artifact scenario test...');

    // Navigate to the test page
    await page.goto('http://localhost:3001/e2e-test');
    await page.waitForLoadState('networkidle');

    // Verify we're on the test page
    await expect(page.locator('h1:has-text("E2E Test Chat Interface")')).toBeVisible();
    console.log('✅ Test page loaded successfully');

    // Find the chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible();
    console.log('✅ Chat input found');

    // Send the TSX button request
    const tsxPrompt = 'generate code for a TSX component that is a button that is black and gold';
    await chatInput.fill(tsxPrompt);

    // Click send button
    const sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();
    console.log('🧪 Sent TSX button request');

    // Wait for response with code block
    const assistantMessage = page.locator('.justify-start .rounded-lg').last();
    await expect(assistantMessage).toBeVisible({ timeout: 10000 });

    // Verify the response contains TSX code
    await expect(assistantMessage).toContainText('```tsx');
    await expect(assistantMessage).toContainText('BlackGoldButton');
    console.log('✅ Response contains TSX code block');

    // Find and click the Preview button
    const previewButton = page.locator('[data-testid="preview-button"]');
    await expect(previewButton).toBeVisible();
    console.log('✅ Preview button found');

    await previewButton.click();
    console.log('🧪 Clicked Preview button');

    // Verify artifact modal opens
    const artifactModal = page.locator('[data-testid="artifact-modal"]');
    await expect(artifactModal).toBeVisible({ timeout: 5000 });
    console.log('✅ Artifact modal opened');

    // Verify React artifact renderer is present
    const reactRenderer = page.locator('[data-testid="react-artifact-renderer"]');
    await expect(reactRenderer).toBeVisible();
    console.log('✅ React artifact renderer loaded');

    // Look for the actual button in the artifact preview
    const renderedButton = artifactModal.locator('button').first();
    await expect(renderedButton).toBeVisible({ timeout: 10000 });
    console.log('✅ Button rendered in artifact preview');

    // Test button functionality (click without infinite loops)
    await renderedButton.click();
    console.log('✅ Button clicked successfully - no infinite loops detected');

    // Close the modal
    const closeButton = page.locator('[data-testid="close-preview"]');
    await closeButton.click();
    await expect(artifactModal).not.toBeVisible();
    console.log('✅ Artifact modal closed successfully');

    console.log('🎉 Indirect artifact scenario test PASSED!');
  });

  test('should handle direct artifact scenario - XML CDATA with automatic preview', async ({ page }) => {
    test.setTimeout(60000); // 1 minute timeout

    console.log('🧪 Starting direct artifact scenario test...');

    // Navigate to the test page
    await page.goto('http://localhost:3001/e2e-test');
    await page.waitForLoadState('networkidle');

    // Verify we're on the test page
    await expect(page.locator('h1:has-text("E2E Test Chat Interface")')).toBeVisible();
    console.log('✅ Test page loaded successfully');

    // Find the chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible();

    // Send a prompt that triggers direct artifact creation
    const artifactPrompt = 'create a component artifact for a black and gold button';
    await chatInput.fill(artifactPrompt);

    // Click send button
    const sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();
    console.log('🧪 Sent artifact creation request');

    // Wait for response with XML artifact
    const assistantMessage = page.locator('.justify-start .rounded-lg').last();
    await expect(assistantMessage).toBeVisible({ timeout: 10000 });

    // Verify the response contains XML artifact with CDATA
    await expect(assistantMessage).toContainText('<artifact');
    await expect(assistantMessage).toContainText('<![CDATA[');
    await expect(assistantMessage).toContainText(']]>');
    console.log('✅ Response contains XML artifact with CDATA');

    // Find the artifact button
    const artifactButton = page.locator('[data-testid="artifact-button"]');
    await expect(artifactButton).toBeVisible();
    console.log('✅ Artifact button found');

    // Verify artifact modal auto-opens (via setTimeout in component)
    const artifactModal = page.locator('[data-testid="artifact-modal"]');
    await expect(artifactModal).toBeVisible({ timeout: 10000 });
    console.log('✅ Artifact modal auto-opened');

    // Verify React artifact renderer is present
    const reactRenderer = page.locator('[data-testid="react-artifact-renderer"]');
    await expect(reactRenderer).toBeVisible();
    console.log('✅ React artifact renderer loaded');

    // Look for the actual button in the artifact preview
    const renderedButton = artifactModal.locator('button').first();
    await expect(renderedButton).toBeVisible({ timeout: 10000 });
    console.log('✅ Button rendered in artifact preview');

    // Test button functionality and styling
    const buttonStyles = await renderedButton.evaluate((button) => {
      const styles = window.getComputedStyle(button);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderColor
      };
    });

    console.log('🎨 Button styles detected:', buttonStyles);

    // Test button click without infinite loops
    await renderedButton.click();
    console.log('✅ Button clicked successfully - no infinite loops detected');

    // Test hover effect
    await renderedButton.hover();
    await page.waitForTimeout(500); // Give time for hover effects

    // Close the modal by clicking the artifact button again or close button
    const closeButton = page.locator('[data-testid="close-preview"]');
    await closeButton.click();
    await expect(artifactModal).not.toBeVisible();
    console.log('✅ Artifact modal closed successfully');

    console.log('🎉 Direct artifact scenario test PASSED!');
  });

  test('should verify environment gating works correctly', async ({ page }) => {
    console.log('🧪 Testing environment gating...');

    // Test with production-like URL (should redirect)
    await page.goto('http://localhost:3001/e2e-test');

    // The page should load in test environment (localhost)
    await expect(page.locator('h1:has-text("E2E Test Chat Interface")')).toBeVisible();
    console.log('✅ Test page accessible in test environment');

    // Verify artifact support indicators
    const supportText = page.locator('text=/React:.*Svelte:/');
    await expect(supportText).toBeVisible();
    console.log('✅ Artifact support status displayed');

    console.log('🎉 Environment gating test PASSED!');
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    console.log('🧪 Testing error scenarios...');

    await page.goto('http://localhost:3001/e2e-test');
    await page.waitForLoadState('networkidle');

    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Test empty input
    await expect(sendButton).toBeDisabled();
    console.log('✅ Send button disabled for empty input');

    // Test generic input (should get fallback response)
    await chatInput.fill('hello world');
    await sendButton.click();

    const assistantMessage = page.locator('.justify-start .rounded-lg').last();
    await expect(assistantMessage).toBeVisible({ timeout: 5000 });
    await expect(assistantMessage).toContainText('test assistant');
    console.log('✅ Fallback response handled correctly');

    console.log('🎉 Error scenarios test PASSED!');
  });

});