/**
 * E2E Tests: Multi-Block Dependency Resolution
 * These tests validate resolution of artifacts with multiple code blocks and dependencies
 */

import { test, expect } from '@playwright/test';

test.describe('Multi-Block Dependency Resolution E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
  });

  test('should resolve multiple CSS and JSON dependencies in single artifact', async ({ page }) => {
    const multiBlockMessage = `Create a complete dashboard with configuration:

\`\`\`jsx
import styles from "./Dashboard.module.css";
import config from "./config.json";
import { Chart } from "./Chart";

export default function Dashboard() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{config.appName}</h1>
      </header>
      <main className={styles.content}>
        <div className={styles.metrics}>
          <div className={styles.card}>
            <h3>API Endpoint</h3>
            <p>{config.apiUrl}</p>
          </div>
          <div className={styles.card}>
            <h3>Version</h3>
            <p>{config.version}</p>
          </div>
        </div>
        <Chart data={config.chartData} />
      </main>
    </div>
  );
}
\`\`\`

\`\`\`css
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 20px;
  text-align: center;
}

.title {
  color: white;
  font-size: 2.5rem;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.content {
  padding: 40px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.card {
  background: rgba(255, 255, 255, 0.95);
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}

.card:hover {
  transform: translateY(-5px);
}

.card h3 {
  color: #333;
  margin-top: 0;
  font-size: 1.2rem;
}

.card p {
  color: #666;
  font-size: 1.1rem;
  margin-bottom: 0;
}
\`\`\`

\`\`\`json
{
  "appName": "Analytics Dashboard",
  "version": "2.1.0",
  "apiUrl": "https://api.analytics.example.com/v2",
  "refreshInterval": 30000,
  "chartData": [
    { "month": "Jan", "users": 1200, "revenue": 45000 },
    { "month": "Feb", "users": 1350, "revenue": 52000 },
    { "month": "Mar", "users": 1180, "revenue": 48000 },
    { "month": "Apr", "users": 1420, "revenue": 58000 },
    { "month": "May", "users": 1650, "revenue": 67000 }
  ],
  "theme": {
    "primary": "#667eea",
    "secondary": "#764ba2",
    "accent": "#f093fb"
  }
}
\`\`\`

\`\`\`jsx
// Chart component implementation
function Chart({ data }) {
  const maxRevenue = Math.max(...data.map(item => item.revenue));

  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      padding: '30px',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Revenue Chart</h2>
      <div style={{ display: 'flex', alignItems: 'end', gap: '10px', height: '200px' }}>
        {data.map((item, index) => (
          <div key={index} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flex: 1
          }}>
            <div style={{
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              width: '100%',
              height: \`\${(item.revenue / maxRevenue) * 160}px\`,
              borderRadius: '4px 4px 0 0',
              marginBottom: '10px'
            }} />
            <span style={{ fontSize: '12px', color: '#666' }}>{item.month}</span>
            <span style={{ fontSize: '10px', color: '#999' }}>\${item.revenue/1000}k</span>
          </div>
        ))}
      </div>
    </div>
  );
}
\`\`\``;

    await page.fill('[data-testid="chat-input"]', multiBlockMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    // Wait for initial render failure due to multiple import issues
    await page.waitForSelector('.artifact-error', { timeout: 20000 });
    await expect(page.locator('.artifact-error')).toContain('Cannot resolve module');

    // Recovery UI should appear
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Should show analysis of multiple dependencies
    await expect(page.locator('[data-testid="dependency-analysis"]')).toBeVisible();
    await expect(page.locator('[data-testid="resolvable-count"]')).toContain('2'); // CSS and JSON
    await expect(page.locator('[data-testid="problematic-count"]')).toContain('1'); // Chart import

    // Start auto-resolution
    await page.click('[data-testid="auto-fix-button"]');

    // Should show multi-strategy execution
    await expect(page.locator('[data-testid="strategy-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-strategy"]')).toContain('CSS Module Conversion');

    // Wait for strategy progression
    await page.waitForSelector('[data-testid="strategy-complete"]:has-text("CSS_MODULE_CONVERSION")', { timeout: 8000 });
    await page.waitForSelector('[data-testid="strategy-complete"]:has-text("JSON_DATA_INLINING")', { timeout: 8000 });
    await page.waitForSelector('[data-testid="strategy-complete"]:has-text("IMPORT_REMOVAL")', { timeout: 8000 });

    // Should show successful multi-block resolution
    await page.waitForSelector('[data-testid="recovery-success"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="strategies-applied"]')).toContain('3 strategies');

    // Verify final artifact renders with all dependencies resolved
    await page.waitForSelector('.artifact-preview', { timeout: 8000 });

    // Check that all content is present
    await expect(page.locator('.artifact-preview h1')).toContain('Analytics Dashboard');
    await expect(page.locator('.artifact-preview .card')).toHaveCount(2);
    await expect(page.locator('.artifact-preview h2')).toContain('Revenue Chart');

    // Verify CSS styles are applied
    const container = page.locator('.artifact-preview .container').first();
    await expect(container).toHaveCSS('min-height', '100vh');
    await expect(container).toHaveCSS('background', /linear-gradient/);

    // Verify JSON data is displayed
    await expect(page.locator('.artifact-preview .card p')).toContain('https://api.analytics.example.com/v2');
    await expect(page.locator('.artifact-preview .card p')).toContain('2.1.0');

    // Verify chart renders with data
    const chartBars = page.locator('.artifact-preview [style*="background: linear-gradient"]');
    await expect(chartBars).toHaveCount(5); // 5 months of data
  });

  test('should handle partial resolution when some dependencies cannot be resolved', async ({ page }) => {
    const partialMessage = `Create a component with mixed resolvable/unresolvable dependencies:

\`\`\`jsx
import styles from "./Available.module.css";
import config from "./available-config.json";
import { MissingComponent } from "./nonexistent";
import { anotherMissing } from "./also-missing";

export default function PartialTest() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{config.title}</h1>
      <MissingComponent data={config.data} />
      <p className={styles.description}>
        {anotherMissing(config.description)}
      </p>
    </div>
  );
}
\`\`\`

\`\`\`css
.container {
  padding: 40px;
  background: #f8f9fa;
  border-radius: 8px;
}

.title {
  color: #2c3e50;
  font-size: 2rem;
  margin-bottom: 20px;
}

.description {
  color: #666;
  font-size: 1.1rem;
  line-height: 1.6;
}
\`\`\`

\`\`\`json
{
  "title": "Partial Resolution Test",
  "description": "This component has some resolvable and some unresolvable dependencies.",
  "data": ["item1", "item2", "item3"]
}
\`\`\``;

    await page.fill('[data-testid="chat-input"]', partialMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 20000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Should show mixed dependency analysis
    await expect(page.locator('[data-testid="resolvable-count"]')).toContain('2'); // CSS and JSON
    await expect(page.locator('[data-testid="problematic-count"]')).toContain('2'); // Two missing imports

    await page.click('[data-testid="auto-fix-button"]');

    // Should show partial success
    await page.waitForSelector('[data-testid="recovery-partial"]', { timeout: 12000 });
    await expect(page.locator('[data-testid="partial-success-message"]')).toContain('2 of 4 dependencies resolved');

    // Should list what was resolved and what wasn't
    await expect(page.locator('[data-testid="resolved-dependencies"]')).toContain('Available.module.css');
    await expect(page.locator('[data-testid="resolved-dependencies"]')).toContain('available-config.json');
    await expect(page.locator('[data-testid="unresolved-dependencies"]')).toContain('nonexistent');
    await expect(page.locator('[data-testid="unresolved-dependencies"]')).toContain('also-missing');

    // Should offer LLM fix for remaining issues
    await expect(page.locator('[data-testid="llm-fix-remaining"]')).toBeVisible();
    await expect(page.locator('[data-testid="llm-fix-remaining"]')).toBeEnabled();

    // Try LLM fix for remaining issues
    await page.click('[data-testid="llm-fix-remaining"]');
    await page.waitForSelector('[data-testid="llm-result"]', { timeout: 20000 });

    // Should show complete resolution or reasonable fallbacks
    const hasCompleteSuccess = await page.locator('[data-testid="recovery-success"]').isVisible({ timeout: 5000 });

    if (hasCompleteSuccess) {
      await page.waitForSelector('.artifact-preview', { timeout: 8000 });
      await expect(page.locator('.artifact-preview h1')).toContain('Partial Resolution Test');
    } else {
      // Should at least render with resolved parts
      await expect(page.locator('[data-testid="partial-render-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="partial-render-warning"]')).toContain('Some functionality may be limited');
    }
  });

  test('should optimize multi-block resolution performance', async ({ page }) => {
    const performanceMessage = `Create a large component with many dependencies:

\`\`\`jsx
import styles1 from "./styles1.module.css";
import styles2 from "./styles2.module.css";
import config1 from "./config1.json";
import config2 from "./config2.json";
import config3 from "./config3.json";

export default function LargeComponent() {
  return (
    <div className={styles1.container}>
      <header className={styles1.header}>
        <h1>{config1.title}</h1>
      </header>
      <main className={styles2.content}>
        <section className={styles2.section1}>
          <p>{config2.description}</p>
        </section>
        <section className={styles2.section2}>
          <ul>
            {config3.items.map((item, idx) => (
              <li key={idx} className={styles1.listItem}>{item}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
\`\`\``;

    // Add multiple CSS and JSON blocks
    const cssBlock1 = `
\`\`\`css
.container { padding: 20px; background: #fff; }
.header { border-bottom: 1px solid #ddd; padding-bottom: 15px; }
.listItem { padding: 8px; border-radius: 4px; margin: 4px 0; }
\`\`\``;

    const cssBlock2 = `
\`\`\`css
.content { margin-top: 20px; }
.section1 { margin-bottom: 30px; }
.section2 { background: #f5f5f5; padding: 20px; border-radius: 6px; }
\`\`\``;

    const jsonBlocks = `
\`\`\`json
{ "title": "Performance Test Component" }
\`\`\`

\`\`\`json
{ "description": "This component tests multi-block resolution performance with many dependencies." }
\`\`\`

\`\`\`json
{
  "items": [
    "Item 1", "Item 2", "Item 3", "Item 4", "Item 5",
    "Item 6", "Item 7", "Item 8", "Item 9", "Item 10"
  ]
}
\`\`\``;

    const fullMessage = performanceMessage + cssBlock1 + cssBlock2 + jsonBlocks;

    const startTime = Date.now();

    await page.fill('[data-testid="chat-input"]', fullMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 20000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Should show efficient dependency analysis
    await expect(page.locator('[data-testid="resolvable-count"]')).toContain('5'); // 2 CSS + 3 JSON
    await expect(page.locator('[data-testid="analysis-time"]')).toBeVisible();

    await page.click('[data-testid="auto-fix-button"]');

    // Should process all dependencies efficiently
    await page.waitForSelector('[data-testid="recovery-success"]', { timeout: 15000 });

    const totalTime = Date.now() - startTime;

    // Verify performance metrics
    await expect(page.locator('[data-testid="processing-time"]')).toBeVisible();
    const processingTime = await page.locator('[data-testid="processing-time"]').textContent();
    const processingMs = parseInt(processingTime?.match(/(\d+)ms/)?.[1] || '0');

    // Should complete within reasonable time even with many dependencies
    expect(totalTime).toBeLessThan(10000); // 10 seconds max
    expect(processingMs).toBeLessThan(5000); // 5 seconds processing max

    // Verify all content rendered correctly
    await page.waitForSelector('.artifact-preview', { timeout: 8000 });
    await expect(page.locator('.artifact-preview h1')).toContain('Performance Test Component');
    await expect(page.locator('.artifact-preview li')).toHaveCount(10);

    // Verify performance indicators show good metrics
    await expect(page.locator('[data-testid="dependencies-resolved"]')).toContain('5 of 5');
    await expect(page.locator('[data-testid="resolution-efficiency"]')).toContain('100%');
  });

  test('should handle complex nested dependencies with circular references', async ({ page }) => {
    const circularMessage = `Create a component structure with potential circular dependencies:

\`\`\`jsx
import componentStyles from "./ComponentStyles.module.css";
import sharedConfig from "./shared-config.json";
import { NestedComponent } from "./NestedComponent";

export default function MainComponent() {
  return (
    <div className={componentStyles.main}>
      <h1 className={componentStyles.title}>{sharedConfig.mainTitle}</h1>
      <NestedComponent
        config={sharedConfig.nested}
        styles={componentStyles}
      />
    </div>
  );
}
\`\`\`

\`\`\`jsx
// NestedComponent that would have circular dependency
import parentStyles from "./ComponentStyles.module.css";
import parentConfig from "./shared-config.json";

function NestedComponent({ config, styles }) {
  return (
    <div className={parentStyles.nested}>
      <p className={styles.text}>{config.description}</p>
      <span className={parentStyles.label}>{parentConfig.label}</span>
    </div>
  );
}
\`\`\`

\`\`\`css
.main {
  padding: 30px;
  background: linear-gradient(45deg, #e3f2fd, #f3e5f5);
}

.title {
  color: #1976d2;
  font-size: 2rem;
  margin-bottom: 20px;
}

.nested {
  background: rgba(255, 255, 255, 0.8);
  padding: 20px;
  border-radius: 8px;
  margin-top: 15px;
}

.text {
  color: #333;
  line-height: 1.6;
}

.label {
  font-weight: bold;
  color: #7b1fa2;
}
\`\`\`

\`\`\`json
{
  "mainTitle": "Circular Dependency Test",
  "label": "Nested Label",
  "nested": {
    "description": "This is a nested component that shares resources with its parent."
  }
}
\`\`\``;

    await page.fill('[data-testid="chat-input"]', circularMessage);
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('.artifact-error', { timeout: 20000 });
    await page.waitForSelector('[data-testid="recovery-ui"]', { timeout: 3000 });

    // Should detect and handle circular dependency patterns
    await expect(page.locator('[data-testid="circular-dependency-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="dependency-analysis"]')).toContain('circular references detected');

    await page.click('[data-testid="auto-fix-button"]');

    // Should resolve by inlining and deduplicating dependencies
    await page.waitForSelector('[data-testid="circular-resolution"]', { timeout: 12000 });
    await expect(page.locator('[data-testid="deduplication-applied"]')).toBeVisible();

    // Should show successful resolution despite complexity
    await page.waitForSelector('[data-testid="recovery-success"]', { timeout: 8000 });
    await expect(page.locator('[data-testid="resolution-strategy"]')).toContain('dependency deduplication');

    // Verify final component renders correctly
    await page.waitForSelector('.artifact-preview', { timeout: 8000 });
    await expect(page.locator('.artifact-preview h1')).toContain('Circular Dependency Test');
    await expect(page.locator('.artifact-preview .nested')).toBeVisible();
    await expect(page.locator('.artifact-preview .text')).toContain('nested component');
    await expect(page.locator('.artifact-preview .label')).toContain('Nested Label');

    // Verify styles applied correctly
    const mainDiv = page.locator('.artifact-preview .main').first();
    await expect(mainDiv).toHaveCSS('padding', '30px');

    const nestedDiv = page.locator('.artifact-preview .nested').first();
    await expect(nestedDiv).toHaveCSS('border-radius', '8px');
  });
});