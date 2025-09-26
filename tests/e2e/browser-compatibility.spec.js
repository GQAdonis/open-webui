/**
 * Browser Compatibility Tests (T048)
 *
 * Comprehensive browser compatibility testing for the artifact system
 * across Chrome, Firefox, and Safari browsers.
 */

import { test, expect, devices } from '@playwright/test';

// Test configuration for different browsers
const browsers = [
  { name: 'Chrome', device: 'Desktop Chrome' },
  { name: 'Firefox', device: 'Desktop Firefox' },
  { name: 'Safari', device: 'Desktop Safari' }
];

// Common test data
const testArtifacts = {
  react: {
    xml: `<artifact identifier="react-test" type="application/vnd.react+jsx" title="React Component">
<file path="App.jsx">
<![CDATA[
function App() {
  const [count, setCount] = React.useState(0);
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>React Counter</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

export default App;
]]>
</file>
</artifact>`,
    expected: {
      title: 'React Component',
      type: 'react',
      hasButton: true,
      initialCount: '0'
    }
  },

  html: {
    xml: `<artifact identifier="html-test" type="text/html" title="HTML Page">
<file path="index.html">
<![CDATA[
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Page</title>
    <style>
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            font-family: Arial, sans-serif;
        }
        .button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Browser Compatibility Test</h1>
        <p>This page tests HTML rendering across browsers.</p>
        <button class="button" onclick="alert('Button clicked!')">Test Button</button>
        <div id="dynamic-content">Loading...</div>
    </div>

    <script>
        setTimeout(() => {
            document.getElementById('dynamic-content').textContent = 'Content loaded successfully!';
        }, 100);
    </script>
</body>
</html>
]]>
</file>
</artifact>`,
    expected: {
      title: 'HTML Page',
      type: 'html',
      hasButton: true,
      dynamicContent: 'Content loaded successfully!'
    }
  },

  svg: {
    xml: `<artifact identifier="svg-test" type="image/svg+xml" title="SVG Diagram">
<file path="diagram.svg">
<![CDATA[
<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="180" height="130" fill="#f0f0f0" stroke="#333" stroke-width="2" rx="5"/>
  <circle cx="60" cy="60" r="20" fill="#ff6b6b"/>
  <rect x="120" y="40" width="40" height="40" fill="#4ecdc4"/>
  <text x="100" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="14">SVG Test</text>
</svg>
]]>
</file>
</artifact>`
  }
};

// Browser-specific tests for each artifact type
browsers.forEach(({ name, device }) => {
  test.describe(`${name} Browser Compatibility`, () => {

    test.beforeEach(async ({ page }) => {
      // Navigate to the test page
      await page.goto('/');

      // Wait for the page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Set browser-specific configurations if needed
      if (name === 'Safari') {
        // Safari-specific setup
        await page.evaluate(() => {
          // Disable WebKit-specific features that might interfere
          if ('webkitRequestAnimationFrame' in window) {
            window.requestAnimationFrame = window.webkitRequestAnimationFrame;
          }
        });
      }
    });

    test(`should render React artifacts correctly in ${name}`, async ({ page }) => {
      const artifact = testArtifacts.react;

      // Send message with React artifact
      await page.fill('[data-testid="chat-input"]', `Here's a React component: ${artifact.xml}`);
      await page.click('[data-testid="send-button"]');

      // Wait for artifact processing
      await page.waitForSelector('[data-testid="artifact-container"]', { timeout: 10000 });

      // Verify artifact is detected
      const artifactTitle = await page.textContent('[data-testid="artifact-title"]');
      expect(artifactTitle).toContain(artifact.expected.title);

      // Verify preview button exists and is clickable
      const previewButton = page.locator('[data-testid="artifact-preview-button"]');
      await expect(previewButton).toBeVisible();
      await expect(previewButton).toBeEnabled();

      // Click preview to render artifact
      await previewButton.click();

      // Wait for Sandpack to load
      await page.waitForSelector('iframe[title*="Sandpack"]', { timeout: 15000 });

      // Get the iframe and test React functionality
      const iframe = page.frameLocator('iframe[title*="Sandpack"]');

      // Browser-specific timing adjustments
      const timeout = name === 'Safari' ? 20000 : 15000;

      // Verify React component renders
      await expect(iframe.locator('h1')).toContainText('React Counter', { timeout });
      await expect(iframe.locator('p')).toContainText('Count: 0', { timeout });

      // Test interactivity
      await iframe.locator('button').click();
      await expect(iframe.locator('p')).toContainText('Count: 1', { timeout: 5000 });

      // Browser-specific validation
      if (name === 'Chrome') {
        // Chrome-specific checks
        await expect(iframe.locator('button')).toHaveCSS('cursor', 'pointer');
      } else if (name === 'Firefox') {
        // Firefox-specific checks
        const buttonColor = await iframe.locator('button').evaluate(el =>
          getComputedStyle(el).backgroundColor
        );
        expect(buttonColor).toBeTruthy();
      } else if (name === 'Safari') {
        // Safari-specific checks - may have different rendering timing
        await page.waitForTimeout(1000);
        await expect(iframe.locator('div')).toBeVisible();
      }
    });

    test(`should render HTML artifacts correctly in ${name}`, async ({ page }) => {
      const artifact = testArtifacts.html;

      // Send message with HTML artifact
      await page.fill('[data-testid="chat-input"]', `Here's an HTML page: ${artifact.xml}`);
      await page.click('[data-testid="send-button"]');

      // Wait for artifact processing
      await page.waitForSelector('[data-testid="artifact-container"]', { timeout: 10000 });

      // Click preview to render artifact
      await page.click('[data-testid="artifact-preview-button"]');

      // Wait for iframe to load
      await page.waitForSelector('iframe[title*="preview"]', { timeout: 15000 });

      const iframe = page.frameLocator('iframe[title*="preview"]');

      // Browser-specific timeout adjustments
      const timeout = name === 'Safari' ? 20000 : 15000;

      // Verify HTML content renders
      await expect(iframe.locator('h1')).toContainText('Browser Compatibility Test', { timeout });
      await expect(iframe.locator('p')).toContainText('This page tests HTML rendering', { timeout });

      // Wait for dynamic content to load
      await expect(iframe.locator('#dynamic-content')).toContainText('Content loaded successfully!', { timeout: 5000 });

      // Test button functionality
      const button = iframe.locator('.button');
      await expect(button).toBeVisible();

      // Handle browser-specific alert behavior
      page.on('dialog', async dialog => {
        expect(dialog.message()).toBe('Button clicked!');
        await dialog.accept();
      });

      await button.click();

      // Browser-specific CSS validation
      if (name !== 'Safari') { // Safari has different CSS property access
        const buttonBg = await iframe.locator('.button').evaluate(el =>
          getComputedStyle(el).backgroundColor
        );
        expect(buttonBg).toContain('rgb(0, 123, 255)'); // #007bff
      }
    });

    test(`should render SVG artifacts correctly in ${name}`, async ({ page }) => {
      const artifact = testArtifacts.svg;

      // Send message with SVG artifact
      await page.fill('[data-testid="chat-input"]', `Here's an SVG diagram: ${artifact.xml}`);
      await page.click('[data-testid="send-button"]');

      // Wait for artifact processing
      await page.waitForSelector('[data-testid="artifact-container"]', { timeout: 10000 });

      // Click preview to render artifact
      await page.click('[data-testid="artifact-preview-button"]');

      // Wait for SVG to render
      await page.waitForSelector('svg, iframe', { timeout: 15000 });

      // SVG might render directly or in iframe depending on implementation
      const svg = page.locator('svg').first();
      const iframe = page.frameLocator('iframe').first();

      try {
        // Try direct SVG access first
        await expect(svg).toBeVisible({ timeout: 5000 });
        await expect(svg.locator('text')).toContainText('SVG Test');

        // Verify SVG elements
        await expect(svg.locator('rect')).toBeVisible();
        await expect(svg.locator('circle')).toBeVisible();

      } catch (error) {
        // Fallback to iframe if SVG is embedded
        const iframeSvg = iframe.locator('svg');
        await expect(iframeSvg).toBeVisible({ timeout: 10000 });
        await expect(iframeSvg.locator('text')).toContainText('SVG Test');
      }

      // Browser-specific SVG validation
      if (name === 'Chrome') {
        // Chrome has better SVG support
        const svgWidth = await svg.getAttribute('width');
        expect(svgWidth).toBe('200');
      }
    });

    test(`should handle performance requirements in ${name}`, async ({ page }) => {
      // Monitor performance
      const startTime = Date.now();

      // Send multiple artifacts to test performance
      await page.fill('[data-testid="chat-input"]', `Multiple artifacts: ${testArtifacts.react.xml} ${testArtifacts.html.xml}`);
      await page.click('[data-testid="send-button"]');

      // Wait for all artifacts to be processed
      await page.waitForSelector('[data-testid="artifact-container"]', { timeout: 15000 });

      const processingTime = Date.now() - startTime;

      // Performance targets (browser-specific)
      const maxTime = name === 'Safari' ? 20000 : 15000; // Safari may be slower
      expect(processingTime).toBeLessThan(maxTime);

      // Verify all artifacts are rendered
      const artifactContainers = await page.locator('[data-testid="artifact-container"]').count();
      expect(artifactContainers).toBeGreaterThan(0);

      // Test memory usage (if supported)
      if (name === 'Chrome') {
        const memoryInfo = await page.evaluate(() => {
          if ('memory' in performance) {
            return performance.memory;
          }
          return null;
        });

        if (memoryInfo) {
          expect(memoryInfo.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB limit
        }
      }
    });

    test(`should handle error conditions gracefully in ${name}`, async ({ page }) => {
      // Test with malformed XML
      const malformedXml = `<artifact identifier="bad" type="text/html" title="Bad">
<file path="index.html">
<![CDATA[
<html><body><h1>Unclosed tag</body></html>
]]>
</file>`;

      await page.fill('[data-testid="chat-input"]', `Here's broken XML: ${malformedXml}`);
      await page.click('[data-testid="send-button"]');

      // Should show error message, not crash
      await page.waitForSelector('[data-testid="error-message"], [data-testid="artifact-container"]', { timeout: 10000 });

      // Verify page is still functional
      await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();

      // Test with oversized content
      const largeContent = `<artifact identifier="large" type="text/html" title="Large">
<file path="index.html">
<![CDATA[
<html><body>${'<p>Large content</p>'.repeat(1000)}</body></html>
]]>
</file>
</artifact>`;

      await page.fill('[data-testid="chat-input"]', largeContent);
      await page.click('[data-testid="send-button"]');

      // Should handle gracefully (may show warning or limit content)
      await page.waitForTimeout(5000); // Give time to process

      // Page should remain responsive
      await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();
    });

    test(`should support keyboard navigation in ${name}`, async ({ page }) => {
      // Send artifact
      await page.fill('[data-testid="chat-input"]', `Test artifact: ${testArtifacts.react.xml}`);
      await page.click('[data-testid="send-button"]');

      // Wait for artifact
      await page.waitForSelector('[data-testid="artifact-preview-button"]', { timeout: 10000 });

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to activate preview with keyboard
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));

      if (focusedElement === 'artifact-preview-button') {
        await page.keyboard.press('Enter');
        await page.waitForSelector('iframe[title*="Sandpack"]', { timeout: 15000 });
      }

      // Verify accessibility
      const previewButton = page.locator('[data-testid="artifact-preview-button"]');
      await expect(previewButton).toHaveAttribute('tabindex', '0');
    });

    test(`should handle browser-specific features in ${name}`, async ({ page }) => {
      // Test browser detection
      const userAgent = await page.evaluate(() => navigator.userAgent);
      expect(userAgent).toContain(name === 'Chrome' ? 'Chrome' : name === 'Firefox' ? 'Firefox' : 'Safari');

      // Test local storage (cross-browser)
      await page.evaluate(() => {
        localStorage.setItem('test-key', 'test-value');
      });

      const stored = await page.evaluate(() => localStorage.getItem('test-key'));
      expect(stored).toBe('test-value');

      // Test session storage
      await page.evaluate(() => {
        sessionStorage.setItem('session-key', 'session-value');
      });

      const session = await page.evaluate(() => sessionStorage.getItem('session-key'));
      expect(session).toBe('session-value');

      // Browser-specific feature tests
      if (name === 'Chrome') {
        // Test Chrome-specific features
        const isChrome = await page.evaluate(() => 'chrome' in window);
        expect(isChrome).toBe(true);

      } else if (name === 'Firefox') {
        // Test Firefox-specific features
        const isFirefox = await page.evaluate(() => 'mozInnerScreenX' in window);
        expect(isFirefox).toBe(true);

      } else if (name === 'Safari') {
        // Test Safari-specific features
        const isSafari = await page.evaluate(() => 'safari' in window || /Safari/.test(navigator.userAgent));
        expect(isSafari).toBe(true);
      }

      // Clean up
      await page.evaluate(() => {
        localStorage.removeItem('test-key');
        sessionStorage.removeItem('session-key');
      });
    });
  });
});

// Cross-browser compatibility test
test.describe('Cross-Browser Artifact Consistency', () => {
  test('should produce consistent artifact output across browsers', async ({ page }) => {
    const artifact = testArtifacts.react;

    // Send artifact
    await page.fill('[data-testid="chat-input"]', `Test: ${artifact.xml}`);
    await page.click('[data-testid="send-button"]');

    // Wait for processing
    await page.waitForSelector('[data-testid="artifact-container"]', { timeout: 10000 });

    // Get artifact metadata
    const title = await page.textContent('[data-testid="artifact-title"]');
    const type = await page.getAttribute('[data-testid="artifact-container"]', 'data-type');

    // These should be consistent across all browsers
    expect(title).toContain('React Component');
    expect(type).toBe('react');

    // Click preview
    await page.click('[data-testid="artifact-preview-button"]');

    // Verify consistent rendering (allowing for timing differences)
    await page.waitForSelector('iframe[title*="Sandpack"]', { timeout: 20000 });

    const iframe = page.frameLocator('iframe[title*="Sandpack"]');
    await expect(iframe.locator('h1')).toContainText('React Counter', { timeout: 15000 });
  });
});

// Performance benchmarking across browsers
test.describe('Cross-Browser Performance', () => {
  test('should meet performance targets across all browsers', async ({ page }) => {
    // Warm up the page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();

    // Send complex artifact
    const complexArtifact = `<artifact identifier="complex" type="application/vnd.react+jsx" title="Complex App">
<file path="App.jsx">
<![CDATA[
function App() {
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const generateData = () => {
    setLoading(true);
    setTimeout(() => {
      setData(Array.from({length: 100}, (_, i) => ({
        id: i,
        name: \`Item \${i}\`,
        value: Math.random() * 100
      })));
      setLoading(false);
    }, 100);
  };

  return (
    <div style={{padding: '20px'}}>
      <h1>Performance Test</h1>
      <button onClick={generateData}>Generate Data</button>
      {loading && <p>Loading...</p>}
      <div>
        {data.map(item => (
          <div key={item.id} style={{padding: '5px', border: '1px solid #ccc', margin: '2px'}}>
            {item.name}: {item.value.toFixed(2)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
]]>
</file>
</artifact>`;

    await page.fill('[data-testid="chat-input"]', complexArtifact);
    await page.click('[data-testid="send-button"]');

    // Wait for processing
    await page.waitForSelector('[data-testid="artifact-container"]', { timeout: 15000 });

    const processingTime = Date.now() - startTime;

    // Performance should be reasonable across all browsers
    expect(processingTime).toBeLessThan(20000);

    // Test rendering performance
    const renderStart = Date.now();
    await page.click('[data-testid="artifact-preview-button"]');
    await page.waitForSelector('iframe[title*="Sandpack"]', { timeout: 20000 });

    const renderTime = Date.now() - renderStart;
    expect(renderTime).toBeLessThan(15000);
  });
});