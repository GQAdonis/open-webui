/**
 * E2E Tests: LLM Auto-Fix Workflow
 * These tests validate the complete LLM-powered code fixing workflow
 */

import { test, expect } from '@playwright/test';

test.describe('LLM Auto-Fix Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
  });

  test('should successfully use LLM to fix complex dependency issues', async ({ page }) => {
    const complexMessage = `Create a data dashboard component:

\`\`\`jsx
import { fetchData } from "./api/dataService";
import { Chart } from "./components/Chart";
import { formatCurrency } from "./utils/formatting";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData('/api/metrics').then(setData);
  }, []);

  return (
    <div className="dashboard">
      <h1>Sales Dashboard</h1>
      {data && (
        <div>
          <Chart data={data.sales} />
          <p>Total: {formatCurrency(data.total)}</p>
        </div>
      )}
    </div>
  );
}
\`\`\`

This component needs React hooks and external utilities that aren't available.`;

    await page.fill('[data-testid="chat-input"]', complexMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    // Wait for artifact error due to missing imports
    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await expect(page.locator('.artifact-error')).toContain('useState is not defined');

    // Recovery UI should appear
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Auto-resolution should fail due to complexity
    await page.click('[data-testid="auto-fix-button"]');
    await page.waitForSelector('[data-testid="recovery-failed"]', { timeout: 8000 });

    // LLM fix button should become available
    await expect(page.locator('[data-testid="llm-fix-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="llm-fix-button"]')).toBeEnabled();

    // Click LLM fix
    await page.click('[data-testid="llm-fix-button"]');

    // Show LLM processing stage
    await expect(page.locator('[data-testid="llm-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-stage"]')).toContain('AI Code Analysis');

    // Wait for LLM to process and provide fix
    await page.waitForSelector('[data-testid="llm-result"]', { timeout: 25000 });

    // Verify LLM provided a reasonable fix
    await expect(page.locator('[data-testid="llm-explanation"]')).toBeVisible();
    await expect(page.locator('[data-testid="llm-explanation"]')).toContain('Added missing React imports');

    // Check confidence score
    const confidenceElement = page.locator('[data-testid="confidence-score"]');
    await expect(confidenceElement).toBeVisible();
    const confidenceText = await confidenceElement.textContent();
    const confidence = parseFloat(confidenceText?.match(/(\d+\.?\d*)%/)?.[1] || '0');
    expect(confidence).toBeGreaterThan(70); // Should have reasonable confidence

    // Verify the artifact now renders successfully
    await page.waitForSelector('.artifact-preview', { timeout: 8000 });
    await expect(page.locator('.artifact-preview h1')).toContain('Sales Dashboard');

    // Verify LLM made appropriate substitutions
    const preview = page.locator('.artifact-preview');
    await expect(preview).toBeVisible();
  });

  test('should handle LLM fix for missing utility functions', async ({ page }) => {
    const utilityMessage = `Create a helper component:

\`\`\`jsx
import { validateEmail, formatDate, debounce } from "./utils";

export default function ContactForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const debouncedValidation = debounce((email) => {
    if (!validateEmail(email)) {
      setErrors(prev => ({ ...prev, email: 'Invalid email' }));
    } else {
      setErrors(prev => ({ ...prev, email: null }));
    }
  }, 300);

  return (
    <form>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            debouncedValidation(e.target.value);
          }}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>
      <div>
        <label>Message:</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <button type="submit">Send ({formatDate(new Date())})</button>
    </form>
  );
}
\`\`\``;

    await page.fill('[data-testid="chat-input"]', utilityMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Auto-resolution should fail for missing utilities
    await page.click('[data-testid="auto-fix-button"]');
    await page.waitForSelector('[data-testid="recovery-failed"]', { timeout: 8000 });

    // Use LLM fix
    await page.click('[data-testid="llm-fix-button"]');
    await page.waitForSelector('[data-testid="llm-result"]', { timeout: 25000 });

    // LLM should provide inline implementations
    await expect(page.locator('[data-testid="llm-explanation"]')).toContain('inline implementation');
    await expect(page.locator('[data-testid="changes-applied"]')).toContain('validateEmail');
    await expect(page.locator('[data-testid="changes-applied"]')).toContain('formatDate');
    await expect(page.locator('[data-testid="changes-applied"]')).toContain('debounce');

    // Verify form renders with working functionality
    await page.waitForSelector('.artifact-preview', { timeout: 8000 });
    const form = page.locator('.artifact-preview form');
    await expect(form).toBeVisible();

    // Test form interactions
    const emailInput = page.locator('.artifact-preview input[type="email"]');
    await emailInput.fill('invalid-email');

    // Should show validation error (debounced)
    await page.waitForTimeout(400);
    await expect(page.locator('.artifact-preview .error')).toContain('Invalid email');

    await emailInput.fill('valid@example.com');
    await page.waitForTimeout(400);
    // Error should disappear
    await expect(page.locator('.artifact-preview .error')).not.toBeVisible();
  });

  test('should provide meaningful explanations for LLM fixes', async ({ page }) => {
    const explanationMessage = `Create a component with advanced patterns:

\`\`\`jsx
import { createContext, useContext, useMemo, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { styled } from '@emotion/styled';

const ThemeContext = createContext();

const StyledButton = styled.button\`
  background: \${props => props.theme.primary};
  color: \${props => props.theme.text};
  padding: \${props => props.size === 'large' ? '12px 24px' : '8px 16px'};
\`;

export default observer(function ThemedButton({ size, children }) {
  const theme = useContext(ThemeContext);

  const buttonProps = useMemo(() => ({
    theme,
    size
  }), [theme, size]);

  const handleClick = useCallback(() => {
    console.log('Themed button clicked');
  }, []);

  return (
    <StyledButton {...buttonProps} onClick={handleClick}>
      {children}
    </StyledButton>
  );
});
\`\`\``;

    await page.fill('[data-testid="chat-input"]', explanationMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Skip auto-resolution and go straight to LLM
    await page.click('[data-testid="llm-fix-button"]');
    await page.waitForSelector('[data-testid="llm-result"]', { timeout: 25000 });

    // Verify detailed explanation is provided
    const explanation = page.locator('[data-testid="llm-explanation"]');
    await expect(explanation).toBeVisible();

    const explanationText = await explanation.textContent();
    expect(explanationText).toMatch(/mobx-react-lite|@emotion\/styled|createContext/);

    // Check for specific explanations about transformations
    await expect(page.locator('[data-testid="transformation-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="transformation-details"]')).toContain('Removed external dependencies');

    // Verify reasoning section
    await expect(page.locator('[data-testid="llm-reasoning"]')).toBeVisible();
    await expect(page.locator('[data-testid="llm-reasoning"]')).toContain('simplified the component');

    // Check limitations section
    await expect(page.locator('[data-testid="llm-limitations"]')).toBeVisible();
    const limitations = await page.locator('[data-testid="llm-limitations"]').textContent();
    expect(limitations).toMatch(/styling|theming|observer pattern/);

    // Verify final component renders
    await page.waitForSelector('.artifact-preview', { timeout: 8000 });
    await expect(page.locator('.artifact-preview button')).toBeVisible();
  });

  test('should handle LLM service failures gracefully', async ({ page }) => {
    // Mock LLM service failure by using a component that would trigger it
    const serviceFailureMessage = `Create a component that might cause LLM service issues:

\`\`\`jsx
import { extremelyComplexFunction } from "./impossible-to-resolve";

export default function ServiceTest() {
  return <div>{extremelyComplexFunction()}</div>;
}
\`\`\``;

    await page.fill('[data-testid="chat-input"]', serviceFailureMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Auto-resolution fails
    await page.click('[data-testid="auto-fix-button"]');
    await page.waitForSelector('[data-testid="recovery-failed"]', { timeout: 8000 });

    // Try LLM fix
    await page.click('[data-testid="llm-fix-button"]');

    // Wait for either success or service failure
    await Promise.race([
      page.waitForSelector('[data-testid="llm-result"]', { timeout: 30000 }),
      page.waitForSelector('[data-testid="llm-service-error"]', { timeout: 30000 })
    ]);

    // Check if service error occurred
    const hasServiceError = await page.locator('[data-testid="llm-service-error"]').isVisible();

    if (hasServiceError) {
      // Verify graceful error handling
      await expect(page.locator('[data-testid="service-error-message"]')).toContain('temporarily unavailable');
      await expect(page.locator('[data-testid="retry-later-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="manual-fix-suggestion"]')).toBeVisible();
    } else {
      // If LLM succeeded, verify it provided a reasonable fix
      await expect(page.locator('[data-testid="llm-explanation"]')).toBeVisible();
      await page.waitForSelector('.artifact-preview', { timeout: 5000 });
    }
  });

  test('should support manual intervention after LLM attempts', async ({ page }) => {
    const manualMessage = `Create a component that needs manual review:

\`\`\`jsx
import { unsafeFunction, deprecatedAPI } from "./legacy-code";

export default function LegacyComponent() {
  const result = unsafeFunction(deprecatedAPI.getData());
  return <div dangerouslySetInnerHTML={{ __html: result }} />;
}
\`\`\``;

    await page.fill('[data-testid="chat-input"]', manualMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Try both auto-resolution and LLM fix
    await page.click('[data-testid="auto-fix-button"]');
    await page.waitForSelector('[data-testid="recovery-failed"]', { timeout: 8000 });

    await page.click('[data-testid="llm-fix-button"]');
    await page.waitForSelector('[data-testid="llm-result"]', { timeout: 25000 });

    // LLM should indicate manual review needed
    await expect(page.locator('[data-testid="manual-review-needed"]')).toBeVisible();
    await expect(page.locator('[data-testid="manual-review-reason"]')).toContain('security concerns');

    // Manual intervention options should be available
    await expect(page.locator('[data-testid="view-suggested-fix"]')).toBeVisible();
    await expect(page.locator('[data-testid="copy-fixed-code"]')).toBeVisible();
    await expect(page.locator('[data-testid="manual-edit-button"]')).toBeVisible();

    // Click to view suggested fix
    await page.click('[data-testid="view-suggested-fix"]');
    await expect(page.locator('[data-testid="suggested-code"]')).toBeVisible();

    // Should show safety improvements
    const suggestedCode = await page.locator('[data-testid="suggested-code"]').textContent();
    expect(suggestedCode).toMatch(/safety|sanitize|validate/);

    // Copy button should work
    await page.click('[data-testid="copy-fixed-code"]');
    await expect(page.locator('[data-testid="copy-success"]')).toBeVisible();
  });

  test('should track and display LLM fix performance metrics', async ({ page }) => {
    const performanceMessage = `Create a performance test component:

\`\`\`jsx
import { heavyComputation, asyncDataLoader } from "./performance-utils";

export default function PerformanceTest() {
  const [data, setData] = useState(null);
  const [computed, setComputed] = useState(null);

  useEffect(() => {
    asyncDataLoader().then(setData);
    setComputed(heavyComputation(1000));
  }, []);

  return (
    <div>
      <h1>Performance Test</h1>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      {computed && <p>Result: {computed}</p>}
    </div>
  );
}
\`\`\``;

    const startTime = Date.now();

    await page.fill('[data-testid="chat-input"]', performanceMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 15000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Skip auto-resolution
    await page.click('[data-testid="llm-fix-button"]');
    await page.waitForSelector('[data-testid="llm-result"]', { timeout: 25000 });

    const totalTime = Date.now() - startTime;

    // Verify performance metrics are displayed
    await expect(page.locator('[data-testid="llm-processing-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="confidence-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="token-usage"]')).toBeVisible();

    const processingTime = await page.locator('[data-testid="llm-processing-time"]').textContent();
    const processingMs = parseInt(processingTime?.match(/(\d+)ms/)?.[1] || '0');
    expect(processingMs).toBeGreaterThan(0);
    expect(processingMs).toBeLessThan(20000); // Should be reasonable

    // Verify confidence score is displayed
    const confidence = await page.locator('[data-testid="confidence-score"]').textContent();
    expect(confidence).toMatch(/\d+\.?\d*%/);

    // Total workflow should complete in reasonable time
    expect(totalTime).toBeLessThan(30000);

    // Verify final component renders
    await page.waitForSelector('.artifact-preview', { timeout: 5000 });
    await expect(page.locator('.artifact-preview h1')).toContain('Performance Test');
  });
});