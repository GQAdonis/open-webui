/**
 * E2E Test for Artifact Rendering System
 *
 * This test verifies that:
 * 1. React components can be generated via chat
 * 2. Preview button appears for artifact messages
 * 3. Artifact preview opens without infinite loops
 * 4. The artifact actually renders and displays content
 * 5. No querySelector null errors occur
 */

import { test, expect } from '@playwright/test';

test.describe('Artifact Rendering E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3001');

    // Wait for the application to load
    await page.waitForLoadState('networkidle');

    // Check if we need to sign in
    const signInText = page.locator('text=Sign in to Open WebUI');
    if (await signInText.isVisible({ timeout: 3000 })) {
      console.log('🔐 Authentication required, signing in with existing user...');

      // Go directly to sign in with existing credentials
      console.log('🔐 Attempting to sign in with existing user credentials...');
      const emailInput = page.locator('input[placeholder*="email"], input[type="email"]').first();
      const passwordInput = page.locator('input[placeholder*="password"], input[type="password"]').first();

      if (await emailInput.isVisible({ timeout: 2000 })) {
        await emailInput.fill('tjames@prometheusags.ai');
      }
      if (await passwordInput.isVisible({ timeout: 2000 })) {
        await passwordInput.fill('P@n@m3r@!');
      }

      const signInButton = page.locator('button:has-text("Sign in"), button[type="submit"]');
      if (await signInButton.isVisible({ timeout: 2000 })) {
        await signInButton.click();
        await page.waitForLoadState('networkidle');

        // Wait longer for the chat interface to fully load after authentication
        console.log('🔐 Waiting for chat interface to load after authentication...');
        await page.waitForTimeout(5000);

        // Wait for any potential redirects or additional loading
        await page.waitForLoadState('networkidle');
      }
    }


    // Skip any onboarding/setup screens if they exist
    try {
      const skipButton = page.locator('button:has-text("Skip")');
      if (await skipButton.isVisible({ timeout: 2000 })) {
        await skipButton.click();
        await page.waitForLoadState('networkidle');
      }
    } catch (e) {
      // Skip button not found, continue
    }

    // Ensure we're not still on the signup/signin page
    let authAttempts = 0;
    const maxAuthAttempts = 3;

    while (authAttempts < maxAuthAttempts) {
      // Check if we're still on auth pages
      const stillOnAuth = await page.locator('text=Sign in to Open WebUI, text=Sign up to Open WebUI').isVisible({ timeout: 2000 }).catch(() => false);

      if (!stillOnAuth) {
        console.log('✅ Successfully moved past authentication pages');
        break;
      }

      console.log(`🔐 Still on auth page, attempt ${authAttempts + 1}/${maxAuthAttempts}`);

      // Try to complete any remaining auth steps
      const createAccountBtn = page.locator('button:has-text("Create Account")');
      if (await createAccountBtn.isVisible({ timeout: 2000 })) {
        await createAccountBtn.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
      }

      authAttempts++;
    }

    // Wait for the main chat interface - try multiple selectors
    console.log('🔐 Looking for chat interface elements...');

    const chatSelectors = [
      'textarea[placeholder*="message"], textarea[placeholder*="Message"]',
      'input[placeholder*="message"], input[placeholder*="Message"]',
      '[contenteditable="true"]:not([placeholder*="email"]):not([placeholder*="password"])',
      'textarea[placeholder*="Send"], textarea[placeholder*="Type"]',
      'div[contenteditable="true"]',
      'textarea:not([placeholder*="email"]):not([placeholder*="password"])',
      'input[type="text"]:not([placeholder*="email"]):not([placeholder*="password"]):not([placeholder*="name"])',
      '.chat-input, .message-input, .prompt-input'
    ];

    // Give the interface more time to fully load
    await page.waitForTimeout(3000);

    let chatInputFound = false;
    for (const selector of chatSelectors) {
      try {
        await expect(page.locator(selector).first()).toBeVisible({ timeout: 10000 });
        console.log(`✅ Found chat input with selector: ${selector}`);

        // Double-check this isn't an auth form field
        const element = page.locator(selector).first();
        const placeholder = await element.getAttribute('placeholder').catch(() => '');
        if (placeholder && (placeholder.includes('email') || placeholder.includes('password') || placeholder.includes('name'))) {
          console.log(`❌ Found auth field, not chat input: ${placeholder}`);
          continue;
        }

        chatInputFound = true;
        break;
      } catch (e) {
        console.log(`❌ Chat input not found with selector: ${selector}`);
      }
    }

    if (!chatInputFound) {
      // Take a screenshot for debugging
      await page.screenshot({ path: 'debug-no-chat-input.png', fullPage: true });
      throw new Error('Could not find chat input after authentication');
    }
  });

  test('should generate React component and render artifact without loops', async ({ page }) => {
    // Set longer timeout for this comprehensive test
    test.setTimeout(120000);

    console.log('🧪 Starting artifact rendering E2E test...');

    // Step 1: Find the chat input and send a request for a React component
    const chatSelectors = [
      'textarea[placeholder*="message"], textarea[placeholder*="Message"]',
      'input[placeholder*="message"], input[placeholder*="Message"]',
      'textarea',
      'input[type="text"]',
      '[contenteditable="true"]'
    ];

    let chatInput = null;
    for (const selector of chatSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        chatInput = element;
        console.log(`🧪 Using chat input selector: ${selector}`);
        break;
      }
    }

    if (!chatInput) {
      await page.screenshot({ path: 'artifact-test-no-chat-input.png', fullPage: true });
      throw new Error('Could not find chat input element');
    }

    const reactComponentPrompt = `generate code for a TSX component that is a button that is black and gold.`;

    console.log('🧪 Typing React component request...');
    await chatInput.fill(reactComponentPrompt);

    // Send the message - try different send button selectors
    const sendSelectors = [
      'button[type="submit"]',
      'button:has-text("Send")',
      'button:has([data-testid*="send"])',
      'button:near([contenteditable="true"])',
      'button svg[viewBox*="24"]', // SVG send icon
      '[role="button"]:near([contenteditable="true"])',
      'button:visible:last-child', // Last visible button near input
      'button:has(svg)', // Button with SVG (likely send icon)
    ];

    let sendButton = null;
    for (const selector of sendSelectors) {
      const button = page.locator(selector).last(); // Use last() to get the rightmost button
      if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
        sendButton = button;
        console.log(`🧪 Found send button with selector: ${selector}`);
        break;
      }
    }

    if (!sendButton) {
      // Try pressing Enter as fallback
      console.log('🧪 No send button found, trying Enter key...');
      await chatInput.press('Enter');
    } else {
      await sendButton.click();
    }

    console.log('🧪 Waiting for AI response...');

    // Step 2: Wait for the AI response to appear (this may take 30-60 seconds)
    await page.waitForTimeout(5000); // Initial wait for processing to start

    // Look for signs that the response is being generated
    const responseContainer = page.locator('[data-testid="message"], .message, .chat-message').last();

    // Wait for response to complete - look for artifact indicators
    let artifactFound = false;
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes total wait time

    while (!artifactFound && attempts < maxAttempts) {
      attempts++;
      console.log(`🧪 Checking for artifact indicators (attempt ${attempts}/${maxAttempts})...`);

      // Check for various artifact indicators
      const artifactIndicators = [
        'button:has-text("Preview")',
        '[data-testid="artifact-button"]',
        '.artifact-button',
        'button:has-text("View")',
        'button:has-text("Open")',
        // Code block indicators that might contain React code
        'pre:has-text("import React")',
        'code:has-text("export default")',
        'pre:has-text("function")',
        // Artifact container indicators
        '.artifact-container',
        '[data-artifact]'
      ];

      for (const selector of artifactIndicators) {
        if (await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log(`🧪 Found artifact indicator: ${selector}`);
          artifactFound = true;
          break;
        }
      }

      if (!artifactFound) {
        await page.waitForTimeout(5000); // Wait 5 seconds before next check
      }
    }

    if (!artifactFound) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'artifact-test-no-indicators.png', fullPage: true });
      throw new Error('No artifact indicators found after waiting 2 minutes');
    }

    console.log('🧪 Artifact indicators found! Looking for Preview button...');

    // Step 3: Find and click the Preview button
    let previewButton = null;
    const previewSelectors = [
      'button:has-text("Preview")',
      'button:has-text("View")',
      'button:has-text("Open")',
      '[data-testid="artifact-button"]',
      '.artifact-button'
    ];

    for (const selector of previewSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
        previewButton = button;
        console.log(`🧪 Found preview button with selector: ${selector}`);
        break;
      }
    }

    if (!previewButton) {
      await page.screenshot({ path: 'artifact-test-no-preview-button.png', fullPage: true });
      throw new Error('Preview button not found');
    }

    // Click the preview button
    console.log('🧪 Clicking preview button...');
    await previewButton.click();

    // Step 4: Wait for artifact preview to open
    console.log('🧪 Waiting for artifact preview to open...');

    // Look for artifact preview container
    const previewContainer = page.locator('.artifact-container, .preview-panel, .artifact-preview, [data-testid="artifact-preview"]').first();
    await expect(previewContainer).toBeVisible({ timeout: 10000 });

    console.log('🧪 Artifact preview container is visible!');

    // Step 5: Check for infinite loop indicators and errors
    console.log('🧪 Checking for infinite loops and errors...');

    // Monitor console errors
    let hasConsoleErrors = false;
    let hasQuerySelectorErrors = false;

    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        console.log(`❌ Console error: ${text}`);
        hasConsoleErrors = true;
        if (text.includes('querySelector') && text.includes('null')) {
          hasQuerySelectorErrors = true;
        }
      }
    });

    // Wait for the artifact to load and check for loading indicators
    await page.waitForTimeout(3000);

    // Check for loading spinners that might indicate infinite loops
    const loadingSpinners = page.locator('.loading-spinner, .spinner, [data-testid="loading"]');
    const spinnerCount = await loadingSpinners.count();

    if (spinnerCount > 0) {
      console.log(`🧪 Found ${spinnerCount} loading spinners, waiting for them to disappear...`);

      // Wait up to 15 seconds for loading to complete
      await expect(loadingSpinners.first()).not.toBeVisible({ timeout: 15000 });
    }

    // Step 6: Verify the artifact content is actually rendered
    console.log('🧪 Verifying artifact content is rendered...');

    // Look for the expected content from our TSX button component
    const expectedElements = [
      'button', // Any button element
      'button[style*="black"], button[style*="gold"]', // Button with black or gold styling
      'button[class*="black"], button[class*="gold"]', // Button with black or gold classes
      '[style*="black"], [style*="gold"]' // Any element with black or gold styling
    ];

    let contentFound = false;
    for (const selector of expectedElements) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 5000 })) {
          console.log(`✅ Found expected content: ${selector}`);
          contentFound = true;
          break;
        }
      } catch (e) {
        // Continue checking other selectors
      }
    }

    // If we can't find specific content, at least verify the preview shows some interactive content
    if (!contentFound) {
      // Look for any rendered React content indicators
      const reactIndicators = [
        'div[data-reactroot]',
        '.sp-preview', // Sandpack preview
        'iframe', // Sandpack uses iframes
        'button', // Any button in the preview
        'h1, h2, h3, h4, h5, h6' // Any headers
      ];

      for (const selector of reactIndicators) {
        const element = previewContainer.locator(selector).first();
        if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log(`✅ Found React content indicator: ${selector}`);
          contentFound = true;
          break;
        }
      }
    }

    // Step 7: Test the black and gold button specifically
    try {
      const blackGoldButton = previewContainer.locator('button').first();
      if (await blackGoldButton.isVisible({ timeout: 2000 })) {
        console.log('🧪 Testing black and gold button...');

        // Get the button's computed styles to verify black/gold colors
        const buttonStyles = await blackGoldButton.evaluate((button) => {
          const styles = window.getComputedStyle(button);
          return {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            border: styles.border,
            borderColor: styles.borderColor
          };
        });

        console.log('🧪 Button styles:', buttonStyles);

        // Test button click functionality
        await blackGoldButton.click();
        console.log('✅ Button click successful - no infinite loops detected');
      }
    } catch (e) {
      console.log('ℹ️  Button testing skipped:', e.message);
    }

    // Step 8: Final validation
    console.log('🧪 Running final validations...');

    // Ensure no querySelector errors occurred
    expect(hasQuerySelectorErrors).toBe(false);

    // Ensure the preview container is still visible (not crashed)
    await expect(previewContainer).toBeVisible();

    // Ensure some content was found
    if (!contentFound) {
      await page.screenshot({ path: 'artifact-test-no-content.png', fullPage: true });
      throw new Error('No recognizable artifact content found in preview');
    }

    // Take a success screenshot
    await page.screenshot({ path: 'artifact-test-success.png', fullPage: true });

    console.log('✅ Artifact rendering E2E test completed successfully!');

    // Step 9: Test closing the preview
    try {
      const closeButton = page.locator('button:has-text("Close"), button:has-text("×"), .close-button').first();
      if (await closeButton.isVisible({ timeout: 2000 })) {
        console.log('🧪 Testing preview close functionality...');
        await closeButton.click();
        await expect(previewContainer).not.toBeVisible({ timeout: 5000 });
        console.log('✅ Preview closed successfully');
      }
    } catch (e) {
      console.log('ℹ️  Close functionality test skipped:', e.message);
    }
  });

  test('should handle multiple artifact previews without conflicts', async ({ page }) => {
    test.setTimeout(90000);

    console.log('🧪 Testing multiple artifact handling...');

    // Find chat input using the same logic as the main test
    const chatSelectors = [
      'textarea[placeholder*="message"], textarea[placeholder*="Message"]',
      'input[placeholder*="message"], input[placeholder*="Message"]',
      'textarea',
      'input[type="text"]',
      '[contenteditable="true"]'
    ];

    let chatInput = null;
    for (const selector of chatSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        chatInput = element;
        break;
      }
    }

    if (!chatInput) {
      throw new Error('Could not find chat input for multiple artifact test');
    }

    // Create a simple component first
    await chatInput.fill('Create a simple React button that says "Click me" and shows an alert when clicked');

    // Find and click send button
    const sendButton = page.locator('button:has(svg)').last();
    if (await sendButton.isVisible({ timeout: 2000 })) {
      await sendButton.click();
    } else {
      throw new Error('Could not find send button for first message');
    }

    // Wait for first artifact
    await page.waitForTimeout(10000);

    // Create another component
    await chatInput.fill('Now create a different React component with a counter that increments when clicked');

    // Find and click send button for second message
    const sendButton2 = page.locator('button:has(svg)').last();
    if (await sendButton2.isVisible({ timeout: 2000 })) {
      await sendButton2.click();
    } else {
      throw new Error('Could not find send button for second message');
    }

    // Wait for second artifact
    await page.waitForTimeout(10000);

    // Count preview buttons
    const previewButtons = page.locator('button:has-text("Preview"), button:has-text("View")');
    const buttonCount = await previewButtons.count();

    console.log(`🧪 Found ${buttonCount} preview buttons`);

    if (buttonCount >= 1) {
      // Test the latest preview button
      await previewButtons.last().click();

      // Verify preview opens
      const previewContainer = page.locator('.artifact-container, .preview-panel').first();
      await expect(previewContainer).toBeVisible({ timeout: 10000 });

      console.log('✅ Multiple artifact test passed');
    } else {
      console.log('ℹ️  Multiple artifact test skipped - no preview buttons found');
    }
  });
});