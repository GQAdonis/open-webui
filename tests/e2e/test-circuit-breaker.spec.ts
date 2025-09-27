/**
 * E2E Tests: Circuit Breaker Functionality
 * These tests validate the circuit breaker behavior in the user interface
 */

import { test, expect } from '@playwright/test';

test.describe('Circuit Breaker E2E Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
  });

  test('should allow normal operations when circuit breaker is closed', async ({ page }) => {
    const normalMessage = `Create a working component:

\`\`\`jsx
import styles from "./Working.module.css";

export default function WorkingComponent() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>This Should Work</h1>
    </div>
  );
}
\`\`\`

\`\`\`css
.container {
  padding: 20px;
  background: #e8f5e8;
  border-radius: 8px;
}

.title {
  color: #2e7d32;
  text-align: center;
}
\`\`\``;

    await page.fill('[data-testid="chat-input"]', normalMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    // Should show initial error then recovery
    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Circuit breaker should be closed (allow operations)
    await expect(page.locator('[data-testid="circuit-status"]')).toContain('Active');
    await expect(page.locator('[data-testid="auto-fix-button"]')).toBeEnabled();

    await page.click('[data-testid="auto-fix-button"]');
    await page.waitForSelector('[data-testid="recovery-success"]', { timeout: 10000 });

    // Should show successful operation
    await page.waitForSelector('.artifact-preview', { timeout: 5000 });
    await expect(page.locator('.artifact-preview h1')).toContain('This Should Work');

    // Circuit breaker should remain closed after success
    await expect(page.locator('[data-testid="circuit-status"]')).toContain('Active');
    await expect(page.locator('[data-testid="failure-count"]')).toContain('0');
  });

  test('should track failures and open circuit after threshold', async ({ page }) => {
    const failingMessage = `Create a component that will consistently fail:

\`\`\`jsx
import styles from "./AlwaysFails.module.css";

export default function AlwaysFails() {
  return <div className={styles.impossible}>Impossible to fix</div>;
}
\`\`\`

\`\`\`css
.impossible {
  /* This CSS will cause parsing errors */
  color: ;;;
  background: invalid-value;
  font-size: not-a-size;
}
\`\`\``;

    // First failure
    await page.fill('[data-testid="chat-input"]', failingMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    await expect(page.locator('[data-testid="circuit-status"]')).toContain('Active');
    await expect(page.locator('[data-testid="failure-count"]')).toContain('0');

    await page.click('[data-testid="auto-fix-button"]');
    await page.waitForSelector('[data-testid="recovery-failed"]', { timeout: 10000 });

    // Should show first failure
    await expect(page.locator('[data-testid="failure-count"]')).toContain('1');

    // Second failure
    await page.click('[data-testid="clear-chat"]');
    await page.waitForTimeout(1000);

    await page.fill('[data-testid="chat-input"]', failingMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    await page.click('[data-testid="auto-fix-button"]');
    await page.waitForSelector('[data-testid="recovery-failed"]', { timeout: 10000 });

    await expect(page.locator('[data-testid="failure-count"]')).toContain('2');

    // Third failure should open circuit
    await page.click('[data-testid="clear-chat"]');
    await page.waitForTimeout(1000);

    await page.fill('[data-testid="chat-input"]', failingMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    await page.click('[data-testid="auto-fix-button"]');
    await page.waitForSelector('[data-testid="recovery-failed"]', { timeout: 10000 });

    // Fourth attempt should trigger circuit breaker
    await page.click('[data-testid="clear-chat"]');
    await page.waitForTimeout(1000);

    await page.fill('[data-testid="chat-input"]', failingMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Circuit breaker should now be open
    await expect(page.locator('[data-testid="circuit-status"]')).toContain('Open');
    await expect(page.locator('[data-testid="circuit-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="circuit-warning"]')).toContain('Too many recent failures');

    // Recovery buttons should be disabled
    await expect(page.locator('[data-testid="auto-fix-button"]')).toBeDisabled();
    await expect(page.locator('[data-testid="llm-fix-button"]')).toBeDisabled();

    // Should show reset option
    await expect(page.locator('[data-testid="reset-circuit-button"]')).toBeVisible();
  });

  test('should allow manual circuit breaker reset', async ({ page }) => {
    // First, trigger circuit breaker (simulate by going to a state where it's open)
    // This is a simplified test - in real scenario we'd need multiple failures

    // Navigate to a page that shows circuit breaker controls (admin or debug page)
    await page.goto('/?debug=circuit-breaker');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });

    // Simulate circuit breaker open state
    await page.evaluate(() => {
      localStorage.setItem('circuit-breaker-state', JSON.stringify({
        state: 'OPEN',
        failureCount: 5,
        lastFailureTime: Date.now()
      }));
    });

    const failingMessage = `Test circuit reset:

\`\`\`jsx
export default function CircuitTest() {
  return <div>Circuit Breaker Test</div>;
}
\`\`\``;

    await page.fill('[data-testid="chat-input"]', failingMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Should show circuit breaker is open
    await expect(page.locator('[data-testid="circuit-status"]')).toContain('Open');
    await expect(page.locator('[data-testid="auto-fix-button"]')).toBeDisabled();

    // Reset circuit breaker
    await page.click('[data-testid="reset-circuit-button"]');

    // Should show confirmation dialog
    await expect(page.locator('[data-testid="reset-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="reset-warning"]')).toContain('This will reset failure counts');

    await page.click('[data-testid="confirm-reset"]');

    // Circuit should be closed again
    await expect(page.locator('[data-testid="circuit-status"]')).toContain('Closed');
    await expect(page.locator('[data-testid="failure-count"]')).toContain('0');
    await expect(page.locator('[data-testid="auto-fix-button"]')).toBeEnabled();

    // Should be able to attempt recovery again
    await page.click('[data-testid="auto-fix-button"]');
    await expect(page.locator('[data-testid="recovery-progress"]')).toBeVisible();
  });

  test('should show circuit breaker statistics and health metrics', async ({ page }) => {
    // Navigate to debug/admin view with circuit breaker metrics
    await page.goto('/?debug=metrics');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });

    const testMessage = `Create test component for metrics:

\`\`\`jsx
export default function MetricsTest() {
  return <div>Testing circuit breaker metrics</div>;
}
\`\`\``;

    await page.fill('[data-testid="chat-input"]', testMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Should show circuit breaker metrics panel
    await expect(page.locator('[data-testid="circuit-metrics"]')).toBeVisible();

    // Check various metrics
    await expect(page.locator('[data-testid="circuit-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="failure-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="last-failure-time"]')).toBeVisible();

    // Historical data should be available
    await expect(page.locator('[data-testid="failure-history"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-history"]')).toBeVisible();

    // Performance metrics
    await expect(page.locator('[data-testid="avg-response-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="circuit-efficiency"]')).toBeVisible();

    // Attempt recovery to generate metrics
    await page.click('[data-testid="auto-fix-button"]');
    await page.waitForSelector('[data-testid="recovery-success"], [data-testid="recovery-failed"]', { timeout: 10000 });

    // Metrics should update
    const successRate = await page.locator('[data-testid="success-rate"]').textContent();
    expect(successRate).toMatch(/\d+%/);

    const responseTime = await page.locator('[data-testid="avg-response-time"]').textContent();
    expect(responseTime).toMatch(/\d+ms/);
  });

  test('should handle concurrent requests with circuit breaker active', async ({ page }) => {
    const concurrentMessage = `Create component for concurrency test:

\`\`\`jsx
import styles from "./Concurrent.module.css";

export default function ConcurrentTest({ id }) {
  return (
    <div className={styles.container}>
      <h1>Concurrent Test #{id}</h1>
    </div>
  );
}
\`\`\`

\`\`\`css
.container {
  padding: 20px;
  background: #f0f8ff;
  margin: 10px;
}
\`\`\``;

    // Open multiple chat tabs/conversations to test concurrency
    const page2 = await page.context().newPage();
    const page3 = await page.context().newPage();

    await page2.goto('/');
    await page3.goto('/');

    await page2.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
    await page3.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });

    // Send similar messages concurrently
    await Promise.all([
      page.fill('[data-testid="chat-input"]', concurrentMessage.replace('{id}', '1')),
      page2.fill('[data-testid="chat-input"]', concurrentMessage.replace('{id}', '2')),
      page3.fill('[data-testid="chat-input"]', concurrentMessage.replace('{id}', '3'))
    ]);

    await Promise.all([
      page.press('[data-testid="chat-input"]', 'Enter'),
      page2.press('[data-testid="chat-input"]', 'Enter'),
      page3.press('[data-testid="chat-input"]', 'Enter')
    ]);

    // Wait for errors on all pages
    await Promise.all([
      page.waitForSelector('.artifact-error', { timeout: 15000 }),
      page2.waitForSelector('.artifact-error', { timeout: 15000 }),
      page3.waitForSelector('.artifact-error', { timeout: 15000 })
    ]);

    // Recovery UI should appear on all pages
    await Promise.all([
      page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 }),
      page2.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 }),
      page3.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 })
    ]);

    // All should show same circuit state
    await Promise.all([
      expect(page.locator('[data-testid="circuit-status"]')).toContain('Active'),
      expect(page2.locator('[data-testid="circuit-status"]')).toContain('Active'),
      expect(page3.locator('[data-testid="circuit-status"]')).toContain('Active')
    ]);

    // Trigger recovery on all concurrently
    await Promise.all([
      page.click('[data-testid="auto-fix-button"]'),
      page2.click('[data-testid="auto-fix-button"]'),
      page3.click('[data-testid="auto-fix-button"]')
    ]);

    // All should eventually succeed or show consistent behavior
    await Promise.all([
      page.waitForSelector('[data-testid="recovery-success"], [data-testid="recovery-failed"]', { timeout: 15000 }),
      page2.waitForSelector('[data-testid="recovery-success"], [data-testid="recovery-failed"]', { timeout: 15000 }),
      page3.waitForSelector('[data-testid="recovery-success"], [data-testid="recovery-failed"]', { timeout: 15000 })
    ]);

    // Check that circuit breaker state is consistent across all instances
    const status1 = await page.locator('[data-testid="circuit-status"]').textContent();
    const status2 = await page2.locator('[data-testid="circuit-status"]').textContent();
    const status3 = await page3.locator('[data-testid="circuit-status"]').textContent();

    expect(status1).toBe(status2);
    expect(status2).toBe(status3);

    await page2.close();
    await page3.close();
  });

  test('should provide user-friendly explanations for circuit breaker states', async ({ page }) => {
    const explanationMessage = `Create component for explanation test:

\`\`\`jsx
export default function ExplanationTest() {
  return <div>Circuit Breaker Explanation Test</div>;
}
\`\`\``;

    await page.fill('[data-testid="chat-input"]', explanationMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Should show circuit breaker info panel
    await page.click('[data-testid="circuit-info-button"]');
    await expect(page.locator('[data-testid="circuit-info-panel"]')).toBeVisible();

    // Should explain current state
    await expect(page.locator('[data-testid="state-explanation"]')).toBeVisible();
    await expect(page.locator('[data-testid="state-explanation"]')).toContain('preventing system overload');

    // Should show what circuit breaker does
    await expect(page.locator('[data-testid="circuit-purpose"]')).toContain('protects against repeated failures');
    await expect(page.locator('[data-testid="circuit-benefits"]')).toContain('improves system stability');

    // Should show current thresholds
    await expect(page.locator('[data-testid="failure-threshold"]')).toBeVisible();
    await expect(page.locator('[data-testid="reset-timeout"]')).toBeVisible();

    // Should provide helpful actions
    await expect(page.locator('[data-testid="suggested-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="suggested-actions"]')).toContain('Try again later');

    // Test different states
    // Simulate half-open state
    await page.evaluate(() => {
      localStorage.setItem('circuit-breaker-state', JSON.stringify({
        state: 'HALF_OPEN',
        failureCount: 2,
        lastFailureTime: Date.now() - 30000
      }));
    });

    await page.reload();
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });

    await page.fill('[data-testid="chat-input"]', explanationMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 5000 });
    await page.click('[data-testid="circuit-info-button"]');

    // Should explain half-open state
    await expect(page.locator('[data-testid="state-explanation"]')).toContain('testing if service has recovered');
    await expect(page.locator('[data-testid="half-open-warning"]')).toContain('Next attempt will determine');
  });
});