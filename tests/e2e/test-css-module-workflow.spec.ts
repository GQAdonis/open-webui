/**
 * E2E Tests: CSS Module Resolution Workflow
 * These tests validate the complete CSS module workflow from user perspective
 */

import { test, expect } from '@playwright/test';

test.describe('CSS Module Resolution E2E Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Open WebUI
    await page.goto('/');

    // Wait for the app to load
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
  });

  test('should successfully resolve CSS module import in chat artifact', async ({ page }) => {
    // Type a message with CSS module component
    const userMessage = `Create a styled button component:

\`\`\`jsx
import styles from "./Button.module.css";

export default function StyledButton({ children }) {
  return (
    <button className={styles.primary}>
      {children}
    </button>
  );
}
\`\`\`

\`\`\`css
.primary {
  background-color: #007bff;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.primary:hover {
  background-color: #0056b3;
}
\`\`\``;

    // Send the message
    await page.fill('[data-testid="chat-input"]', userMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    // Wait for AI response
    await page.waitForSelector('.artifact-container', { timeout: 30000 });

    // Initially, the artifact should fail to render due to CSS module import
    await expect(page.locator('.artifact-error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.artifact-error')).toContain('Cannot resolve module');

    // The recovery UI should appear
    await expect(page.locator('[data-testid="recovery-ui"]')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('[data-testid="recovery-stage"]')).toContain('Auto-resolution');

    // Click the auto-fix button
    await page.click('[data-testid="auto-fix-button"]');

    // Wait for auto-resolution to complete
    await expect(page.locator('[data-testid="recovery-progress"]')).toBeVisible();
    await page.waitForSelector('[data-testid="recovery-success"]', { timeout: 10000 });

    // Verify the artifact now renders successfully
    await expect(page.locator('.artifact-preview')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.artifact-preview button')).toBeVisible();

    // Verify the button has the correct styles
    const buttonElement = page.locator('.artifact-preview button');
    await expect(buttonElement).toHaveCSS('background-color', 'rgb(0, 123, 255)');
    await expect(buttonElement).toHaveCSS('padding', '12px 24px');
    await expect(buttonElement).toHaveCSS('border-radius', '6px');

    // Verify recovery success message
    await expect(page.locator('[data-testid="recovery-message"]')).toContain('CSS module import successfully converted');
    await expect(page.locator('[data-testid="strategy-used"]')).toContain('CSS_MODULE_CONVERSION');
  });

  test('should handle complex CSS with multiple selectors and pseudo-classes', async ({ page }) => {
    const complexMessage = `Create a complex card component:

\`\`\`jsx
import styles from "./Card.module.css";

export default function Card({ title, content, featured }) {
  return (
    <div className={\`\${styles.card} \${featured ? styles.featured : ''}\`}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.content}>{content}</p>
      <button className={styles.button}>Read More</button>
    </div>
  );
}
\`\`\`

\`\`\`css
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin: 16px;
  transition: transform 0.2s ease-in-out;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.featured {
  border: 2px solid #ffd700;
  background: linear-gradient(135deg, #fff9e6, #ffffff);
}

.title {
  color: #333;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.content {
  color: #666;
  line-height: 1.5;
  margin-bottom: 16px;
}

.button {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.button:hover {
  background: #0056b3;
}

.button:active {
  transform: scale(0.98);
}
\`\`\``;

    await page.fill('[data-testid="chat-input"]', complexMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    // Wait for artifact creation and initial failure
    await page.waitForSelector('.artifact-error', { timeout: 15000 });

    // Auto-recovery should trigger
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });
    await page.click('[data-testid="auto-fix-button"]');

    // Wait for successful resolution
    await page.waitForSelector('[data-testid="recovery-success"]', { timeout: 15000 });
    await page.waitForSelector('.artifact-preview', { timeout: 5000 });

    // Verify complex styles are applied correctly
    const cardElement = page.locator('.artifact-preview .card').first();
    await expect(cardElement).toHaveCSS('border-radius', '8px');
    await expect(cardElement).toHaveCSS('padding', '20px');

    const titleElement = page.locator('.artifact-preview .title').first();
    await expect(titleElement).toHaveCSS('font-size', '20px'); // 1.25rem
    await expect(titleElement).toHaveCSS('font-weight', '600');

    const buttonElement = page.locator('.artifact-preview .button').first();
    await expect(buttonElement).toHaveCSS('background-color', 'rgb(0, 123, 255)');

    // Test hover effects (if supported by browser)
    await buttonElement.hover();
    await expect(buttonElement).toHaveCSS('background-color', 'rgb(0, 86, 179)');
  });

  test('should gracefully handle CSS module errors when CSS is missing', async ({ page }) => {
    const messageWithoutCSS = `Create a button with missing CSS:

\`\`\`jsx
import styles from "./MissingButton.module.css";

export default function MissingButton() {
  return <button className={styles.primary}>No CSS Available</button>;
}
\`\`\`

No CSS code block provided here.`;

    await page.fill('[data-testid="chat-input"]', messageWithoutCSS);
    await page.press('[data-testid="chat-input"]', 'Enter');

    // Wait for artifact error
    await page.waitForSelector('.artifact-error', { timeout: 15000 });

    // Recovery UI should appear but indicate limited options
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });
    await page.click('[data-testid="auto-fix-button"]');

    // Auto-resolution should try but provide fallback
    await page.waitForSelector('[data-testid="recovery-partial"]', { timeout: 10000 });

    // Should show warning about missing CSS
    await expect(page.locator('[data-testid="recovery-warning"]')).toContain('CSS styles not found');
    await expect(page.locator('[data-testid="fallback-applied"]')).toContain('Empty styles object created');

    // Artifact should render with fallback styles
    await page.waitForSelector('.artifact-preview', { timeout: 5000 });
    const buttonElement = page.locator('.artifact-preview button');
    await expect(buttonElement).toBeVisible();
    await expect(buttonElement).toContain('No CSS Available');
  });

  test('should allow manual retry after failed auto-resolution', async ({ page }) => {
    const problematicMessage = `Complex component with issues:

\`\`\`jsx
import styles from "./Problematic.module.css";

export default function Problematic() {
  return (
    <div className={styles.container}>
      <span className={styles.nonexistent}>This class doesn't exist</span>
    </div>
  );
}
\`\`\`

\`\`\`css
.container {
  padding: 20px;
}
/* .nonexistent class is missing */
\`\`\``;

    await page.fill('[data-testid="chat-input"]', problematicMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Auto-resolution might partially succeed
    await page.click('[data-testid="auto-fix-button"]');
    await page.waitForSelector('[data-testid="recovery-partial"]', { timeout: 10000 });

    // User should be able to retry or proceed to LLM fix
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="llm-fix-button"]')).toBeVisible();

    // Try LLM fix
    await page.click('[data-testid="llm-fix-button"]');
    await page.waitForSelector('[data-testid="llm-progress"]', { timeout: 5000 });

    // LLM should attempt to fix the missing class issue
    await page.waitForSelector('[data-testid="llm-result"]', { timeout: 20000 });

    // Check if either succeeded or provided helpful explanation
    const hasSuccess = await page.locator('[data-testid="recovery-success"]').isVisible();
    const hasExplanation = await page.locator('[data-testid="llm-explanation"]').isVisible();

    expect(hasSuccess || hasExplanation).toBeTruthy();

    if (hasSuccess) {
      await page.waitForSelector('.artifact-preview', { timeout: 5000 });
      await expect(page.locator('.artifact-preview')).toBeVisible();
    }
  });

  test('should respect circuit breaker limits for repeated failures', async ({ page }) => {
    const failingMessage = `Consistently failing component:

\`\`\`jsx
import styles from "./AlwaysFails.module.css";
export default function AlwaysFails() {
  return <div className={styles.impossible}>This will always fail</div>;
}
\`\`\`

\`\`\`css
/* Malformed CSS that will always cause issues */
.impossible {
  color: invalid-color-value;
  background: ;;;
}
\`\`\``;

    // Attempt multiple times to trigger circuit breaker
    for (let i = 0; i < 4; i++) {
      await page.fill('[data-testid="chat-input"]', failingMessage);
      await page.press('[data-testid="chat-input"]', 'Enter');

      await page.waitForSelector('.artifact-error', { timeout: 10000 });

      if (i < 3) {
        // First few attempts should show recovery UI
        await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });
        await page.click('[data-testid="auto-fix-button"]');
        await page.waitForSelector('[data-testid="recovery-failed"]', { timeout: 10000 });
      } else {
        // After multiple failures, circuit breaker should activate
        await expect(page.locator('[data-testid="circuit-breaker-active"]')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('[data-testid="recovery-blocked"]')).toContain('Too many recent failures');
        await expect(page.locator('[data-testid="auto-fix-button"]')).toBeDisabled();
      }

      // Clear the chat before next attempt
      if (i < 3) {
        await page.click('[data-testid="clear-chat"]');
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should provide performance feedback for recovery operations', async ({ page }) => {
    const performanceMessage = `Performance test component:

\`\`\`jsx
import styles from "./Performance.module.css";

export default function Performance() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Performance Test</h1>
    </div>
  );
}
\`\`\`

\`\`\`css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
}

.title {
  font-size: 2rem;
  color: white;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}
\`\`\``;

    const startTime = Date.now();

    await page.fill('[data-testid="chat-input"]', performanceMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    await page.click('[data-testid="auto-fix-button"]');
    await page.waitForSelector('[data-testid="recovery-success"]', { timeout: 10000 });

    const totalTime = Date.now() - startTime;

    // Verify performance metrics are displayed
    await expect(page.locator('[data-testid="recovery-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="strategy-performance"]')).toBeVisible();

    // Recovery should complete within reasonable time (< 5 seconds)
    expect(totalTime).toBeLessThan(5000);

    // Verify final artifact renders successfully
    await page.waitForSelector('.artifact-preview', { timeout: 5000 });
    const containerElement = page.locator('.artifact-preview .container').first();
    await expect(containerElement).toHaveCSS('display', 'flex');
    await expect(containerElement).toHaveCSS('min-height', '100vh');
  });
});