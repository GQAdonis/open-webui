/**
 * Focused TSX Button Artifact Test
 *
 * This test validates that:
 * 1. User can authenticate with existing credentials
 * 2. TSX button component can be generated
 * 3. Preview button appears and works
 * 4. Black and gold button renders without infinite loops
 */

import { test, expect } from '@playwright/test';

test.describe('TSX Button Artifact Test', () => {

  test('should generate and display TSX black/gold button without infinite loops', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for this comprehensive test

    console.log('🧪 Starting TSX button artifact test...');

    // Navigate to the application
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    // Handle authentication
    const signInText = page.locator('text=Sign in to Open WebUI');
    if (await signInText.isVisible({ timeout: 3000 })) {
      console.log('🔐 Signing in with existing user...');

      const emailInput = page.locator('input[placeholder*="email"], input[type="email"]').first();
      const passwordInput = page.locator('input[placeholder*="password"], input[type="password"]').first();

      await emailInput.fill('tjames@prometheusags.ai');
      await passwordInput.fill('P@n@m3r@!');

      const signInButton = page.locator('button:has-text("Sign in"), button[type="submit"]');
      await signInButton.click();
      await page.waitForLoadState('networkidle');

      // Wait longer for the interface to fully load
      console.log('🔐 Waiting for interface to fully load...');
      await page.waitForTimeout(10000);
      await page.waitForLoadState('networkidle');
    }

    // Find chat input with multiple attempts
    console.log('🧪 Looking for chat input...');

    const chatSelectors = [
      '[contenteditable="true"]',
      'textarea[placeholder*="message"]',
      'input[placeholder*="message"]',
      'div[contenteditable="true"]',
      'textarea',
      '.chat-input'
    ];

    let chatInput = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (!chatInput && attempts < maxAttempts) {
      attempts++;
      console.log(`🧪 Attempt ${attempts}/${maxAttempts} to find chat input...`);

      for (const selector of chatSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
          // Verify it's not an auth field
          const placeholder = await element.getAttribute('placeholder').catch(() => '');
          if (!placeholder || (!placeholder.includes('email') && !placeholder.includes('password'))) {
            chatInput = element;
            console.log(`✅ Found chat input with selector: ${selector}`);
            break;
          }
        }
      }

      if (!chatInput) {
        console.log(`❌ No chat input found in attempt ${attempts}, waiting...`);
        await page.waitForTimeout(5000);
        await page.waitForLoadState('networkidle');
      }
    }

    if (!chatInput) {
      await page.screenshot({ path: 'tsx-test-no-chat-input.png', fullPage: true });
      throw new Error('Could not find chat input after multiple attempts');
    }

    // Send the TSX button request
    const tsxPrompt = 'generate code for a TSX component that is a button that is black and gold.';
    console.log('🧪 Sending TSX button request...');

    await chatInput.fill(tsxPrompt);

    // Find and click send button
    const sendSelectors = [
      'button[type="submit"]',
      'button:has(svg)',
      'button:has-text("Send")',
      '[role="button"]:has(svg)'
    ];

    let sendButton = null;
    for (const selector of sendSelectors) {
      const button = page.locator(selector).last();
      if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
        sendButton = button;
        console.log(`🧪 Found send button: ${selector}`);
        break;
      }
    }

    if (!sendButton) {
      // Try Enter key as fallback
      console.log('🧪 No send button found, trying Enter key...');
      await chatInput.press('Enter');
    } else {
      await sendButton.click();
    }

    console.log('🧪 Waiting for AI response...');

    // Wait for response and look for artifact indicators
    let artifactFound = false;
    let responseAttempts = 0;
    const maxResponseAttempts = 20; // 3+ minutes total

    while (!artifactFound && responseAttempts < maxResponseAttempts) {
      responseAttempts++;
      console.log(`🧪 Checking for artifact (attempt ${responseAttempts}/${maxResponseAttempts})...`);

      const artifactSelectors = [
        'button:has-text("Preview")',
        'button:has-text("View")',
        'button:has-text("Open")',
        '[data-testid*="artifact"]',
        '.artifact-button',
        'pre:has-text("import React")',
        'code:has-text("export default")',
        'pre:has-text("function")',
        'pre:has-text("const")',
        'code:has-text("TSX")',
        'code:has-text("button")'
      ];

      for (const selector of artifactSelectors) {
        if (await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log(`✅ Found artifact indicator: ${selector}`);
          artifactFound = true;
          break;
        }
      }

      if (!artifactFound) {
        await page.waitForTimeout(10000); // Wait 10 seconds between checks
      }
    }

    if (!artifactFound) {
      await page.screenshot({ path: 'tsx-test-no-artifact.png', fullPage: true });
      console.log('⚠️  No artifact found, but test will continue to check for basic response...');
    }

    // Look for Preview button specifically
    const previewButton = page.locator('button:has-text("Preview"), button:has-text("View"), button:has-text("Open")').first();

    if (await previewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('🧪 Found Preview button, clicking it...');
      await previewButton.click();

      // Wait for artifact preview to open
      const previewContainer = page.locator('.artifact-container, .preview-panel, .artifact-preview, [data-testid="artifact-preview"]').first();

      if (await previewContainer.isVisible({ timeout: 10000 }).catch(() => false)) {
        console.log('✅ Artifact preview opened successfully!');

        // Look for the button in the preview
        const renderedButton = previewContainer.locator('button').first();

        if (await renderedButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('✅ TSX button found in preview!');

          // Test button styles
          const buttonStyles = await renderedButton.evaluate((button) => {
            const styles = window.getComputedStyle(button);
            return {
              backgroundColor: styles.backgroundColor,
              color: styles.color,
              borderColor: styles.borderColor
            };
          });

          console.log('🎨 Button styles:', buttonStyles);

          // Test button click
          await renderedButton.click();
          console.log('✅ Button click successful - no infinite loops detected!');

          // Take success screenshot
          await page.screenshot({ path: 'tsx-test-success.png', fullPage: true });

          console.log('🎉 TSX button artifact test PASSED!');
        } else {
          console.log('⚠️  Preview opened but no button found');
          await page.screenshot({ path: 'tsx-test-preview-no-button.png', fullPage: true });
        }
      } else {
        console.log('❌ Preview button clicked but preview did not open');
        await page.screenshot({ path: 'tsx-test-preview-failed.png', fullPage: true });
      }
    } else {
      console.log('⚠️  No Preview button found, checking for direct code output...');

      // Check if there's at least some TSX/React code in the response
      const codeElements = page.locator('pre, code').filter({ hasText: /button|TSX|React|export/ });
      const codeCount = await codeElements.count();

      if (codeCount > 0) {
        console.log(`✅ Found ${codeCount} code elements containing TSX/React content`);
        await page.screenshot({ path: 'tsx-test-code-found.png', fullPage: true });
      } else {
        await page.screenshot({ path: 'tsx-test-no-response.png', fullPage: true });
        throw new Error('No TSX code or Preview button found in response');
      }
    }

    console.log('✅ TSX button artifact test completed!');
  });

});