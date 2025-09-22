/**
 * Performance and Stress Tests for Artifact System
 *
 * These tests ensure the artifact system performs well under load and
 * various stress conditions that could occur in production.
 */

import { test, expect, type Page } from '@playwright/test';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  artifactDetection: 100, // ms - Time to detect artifact in streaming
  previewOpen: 500, // ms - Time to open preview panel
  memoryLeakThreshold: 50, // MB - Maximum memory increase
  largArtifactProcess: 2000, // ms - Time to process large artifact
  rapidUpdates: 1000, // ms - Time to handle 100 rapid updates
};

// Helper functions
async function measurePerformance<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;
  return { result, duration };
}

async function simulateSlowNetwork(page: Page, delay: number) {
  await page.route('**/api/**', async route => {
    await new Promise(resolve => setTimeout(resolve, delay));
    await route.continue();
  });
}

async function generateLargeArtifact(size: number): Promise<string> {
  const codeTemplate = 'console.log("This is line ${i} of a large artifact");';
  const lines: string[] = [];

  for (let i = 0; i < size; i++) {
    lines.push(codeTemplate.replace('${i}', i.toString()));
  }

  return `<artifact identifier="large-artifact-${Date.now()}" type="application/javascript">
${lines.join('\n')}
</artifact>`;
}

async function setupPerformanceMonitoring(page: Page) {
  // Set up performance monitoring
  await page.addInitScript(() => {
    (window as any).performanceMetrics = {
      artifacts: [],
      memoryUsage: [],
      startTime: performance.now()
    };

    // Monitor artifact events
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (type.includes('artifact')) {
        (window as any).performanceMetrics.artifacts.push({
          type,
          timestamp: performance.now()
        });
      }
      return originalAddEventListener.call(this, type, listener, options);
    };

    // Monitor memory usage
    setInterval(() => {
      if ((performance as any).memory) {
        (window as any).performanceMetrics.memoryUsage.push({
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          timestamp: performance.now()
        });
      }
    }, 1000);
  });
}

test.describe('Artifact Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupPerformanceMonitoring(page);
    await page.goto('/');
  });

  test.describe('Streaming Performance', () => {
    test('should detect artifacts quickly during streaming', async ({ page }) => {
      const chatInput = page.locator('textarea').first();
      await chatInput.fill('Create a React component');

      // Mock streaming response
      await page.route('**/api/chat/completions', async route => {
        const chunks = [
          "I'll create a React component:\n\n",
          "<artifact identifier=\"perf-test-",
          Date.now().toString(),
          "\" type=\"application/vnd.react+tsx\">",
          "function Component() { return <div>Test</div>; }",
          "</artifact>"
        ];

        let responseText = '';
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            for (const chunk of chunks) {
              responseText += chunk;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: responseText })}\n\n`));
              await new Promise(resolve => setTimeout(resolve, 50)); // Simulate streaming delay
            }
            controller.close();
          }
        });

        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: 'data: {"content": "Creating a React counter component:\\n\\n<artifact identifier=\\"react-counter\\" type=\\"application/vnd.react+tsx\\" title=\\"Counter Component\\">\\nimport React, { useState } from \'react\';\\n\\nexport default function Counter() {\\n  const [count, setCount] = useState(0);\\n  return <div><h1>{count}</h1><button onClick={() => setCount(c => c + 1)}>+</button></div>;\\n}\\n</artifact>"}\n\n'
        });
      });

      // Measure artifact detection time
      const { duration } = await measurePerformance(async () => {
        await page.keyboard.press('Enter');

        // Wait for artifact detection
        await page.waitForSelector('.artifact-button, [data-testid="artifact-button"]', {
          timeout: 10000
        });
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.artifactDetection);
    });

    test('should handle rapid streaming updates efficiently', async ({ page }) => {
      const chatInput = page.locator('textarea').first();
      await chatInput.fill('Create multiple components');

      // Mock rapid streaming with multiple artifacts
      await page.route('**/api/chat/completions', async route => {
        const artifacts = Array.from({ length: 10 }, (_, i) =>
          `<artifact identifier="rapid-${i}" type="text/html"><div>Component ${i}</div></artifact>`
        );

        let responseText = '';
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            for (const artifact of artifacts) {
              responseText += artifact + '\n\n';
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: responseText })}\n\n`));
              await new Promise(resolve => setTimeout(resolve, 10)); // Rapid updates
            }
            controller.close();
          }
        });

        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: 'data: {"content": "Creating a React counter component:\\n\\n<artifact identifier=\\"react-counter\\" type=\\"application/vnd.react+tsx\\" title=\\"Counter Component\\">\\nimport React, { useState } from \'react\';\\n\\nexport default function Counter() {\\n  const [count, setCount] = useState(0);\\n  return <div><h1>{count}</h1><button onClick={() => setCount(c => c + 1)}>+</button></div>;\\n}\\n</artifact>"}\n\n'
        });
      });

      const { duration } = await measurePerformance(async () => {
        await page.keyboard.press('Enter');

        // Wait for all artifacts to be processed
        await page.waitForFunction(() => {
          const buttons = document.querySelectorAll('.artifact-button');
          return buttons.length >= 1; // At least one artifact detected
        }, { timeout: 15000 });
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.rapidUpdates);
    });
  });

  test.describe('Large Artifact Handling', () => {
    test('should process large artifacts efficiently', async ({ page }) => {
      const largeArtifact = await generateLargeArtifact(1000); // 1000 lines of code

      await page.route('**/api/chat/completions', async route => {
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
          body: `Here's a large code file:\n\n${largeArtifact}`
        });
      });

      const chatInput = page.locator('textarea').first();
      await chatInput.fill('Generate a large code file');

      const { duration } = await measurePerformance(async () => {
        await page.keyboard.press('Enter');

        await page.waitForSelector('.artifact-button', {
          timeout: 10000
        });

        // Click to open preview
        await page.locator('.artifact-button').click();

        // Wait for preview to fully load
        await page.waitForSelector('.preview-panel', {
          timeout: 5000
        });
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.largArtifactProcess);
    });

    test('should handle very large streaming artifacts', async ({ page }) => {
      const chatInput = page.locator('textarea').first();
      await chatInput.fill('Create a large React application');

      // Mock very large streaming artifact
      await page.route('**/api/chat/completions', async route => {
        const largeCode = Array.from({ length: 5000 }, (_, i) =>
          `  const component${i} = () => <div>Component {${i}}</div>;`
        ).join('\n');

        const largeArtifact = `<artifact identifier="very-large" type="application/vnd.react+tsx">
import React from 'react';

${largeCode}

export default function App() {
  return <div>Large Application</div>;
}
</artifact>`;

        // Stream in chunks
        const chunks = largeArtifact.match(/.{1,100}/g) || [];
        let responseText = '';
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            for (const chunk of chunks) {
              responseText += chunk;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: responseText })}\n\n`));
              await new Promise(resolve => setTimeout(resolve, 5)); // Fast streaming
            }
            controller.close();
          }
        });

        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: 'data: {"content": "Creating a React counter component:\\n\\n<artifact identifier=\\"react-counter\\" type=\\"application/vnd.react+tsx\\" title=\\"Counter Component\\">\\nimport React, { useState } from \'react\';\\n\\nexport default function Counter() {\\n  const [count, setCount] = useState(0);\\n  return <div><h1>{count}</h1><button onClick={() => setCount(c => c + 1)}>+</button></div>;\\n}\\n</artifact>"}\n\n'
        });
      });

      const startTime = performance.now();
      await page.keyboard.press('Enter');

      // Wait for processing to complete
      await page.waitForSelector('.artifact-button', { timeout: 30000 });

      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  test.describe('Memory Management', () => {
    test('should not leak memory during long artifact sessions', async ({ page }) => {
      // Record initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize
        } : null;
      });

      if (!initialMemory) {
        test.skip(!initialMemory, 'Memory monitoring not available in this browser');
        return;
      }

      const chatInput = page.locator('textarea').first();

      // Create and destroy many artifacts
      for (let i = 0; i < 50; i++) {
        await page.route(`**/api/chat/completions`, async route => {
          const artifact = `<artifact identifier="memory-test-${i}" type="text/html">
<div>Memory test ${i}: ${'x'.repeat(1000)}</div>
</artifact>`;

          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
            body: `Artifact ${i}:\n\n${artifact}`
          });
        });

        await chatInput.fill(`Create artifact ${i}`);
        await page.keyboard.press('Enter');

        // Wait for artifact to be processed
        await page.waitForSelector('.artifact-button', { timeout: 5000 });

        // Trigger garbage collection if available
        if (i % 10 === 0) {
          await page.evaluate(() => {
            if ((window as any).gc) {
              (window as any).gc();
            }
          });
        }
      }

      // Check final memory usage
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize
        } : null;
      });

      if (finalMemory && initialMemory) {
        const memoryIncrease = (finalMemory.used - initialMemory.used) / 1024 / 1024; // MB
        expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryLeakThreshold);
      }
    });

    test('should handle concurrent artifact processing', async ({ page }) => {
      // Open multiple tabs/contexts to simulate concurrent usage
      const contexts = await Promise.all([
        page.context().newPage(),
        page.context().newPage(),
        page.context().newPage()
      ]);

      try {
        // Setup each context
        await Promise.all(contexts.map(async (contextPage, index) => {
          await contextPage.goto('/');

          await contextPage.route('**/api/chat/completions', async route => {
            const artifact = `<artifact identifier="concurrent-${index}" type="text/html">
<div>Concurrent test ${index}</div>
</artifact>`;

            await route.fulfill({
              status: 200,
              headers: { 'Content-Type': 'text/plain' },
              body: artifact
            });
          });
        }));

        // Send requests simultaneously
        const startTime = performance.now();

        await Promise.all(contexts.map(async (contextPage, index) => {
          const chatInput = contextPage.locator('textarea').first();
          await chatInput.fill(`Concurrent test ${index}`);
          await contextPage.keyboard.press('Enter');
          return contextPage.waitForSelector('.artifact-button', { timeout: 10000 });
        }));

        const duration = performance.now() - startTime;

        // Should handle concurrent requests efficiently
        expect(duration).toBeLessThan(5000); // 5 seconds for 3 concurrent requests

      } finally {
        // Cleanup
        await Promise.all(contexts.map(context => context.close()));
      }
    });
  });

  test.describe('Network Conditions', () => {
    test('should perform well under slow network conditions', async ({ page }) => {
      // Simulate slow network (500ms delay)
      await simulateSlowNetwork(page, 500);

      const chatInput = page.locator('textarea').first();
      await chatInput.fill('Create a component with slow network');

      await page.route('**/api/chat/completions', async route => {
        // Additional delay for streaming
        await new Promise(resolve => setTimeout(resolve, 200));

        const artifact = `<artifact identifier="slow-network" type="text/html">
<div>Slow network test</div>
</artifact>`;

        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
          body: artifact
        });
      });

      const { duration } = await measurePerformance(async () => {
        await page.keyboard.press('Enter');
        await page.waitForSelector('.artifact-button', { timeout: 15000 });
      });

      // Should still be responsive even with slow network
      expect(duration).toBeLessThan(10000); // 10 seconds max
    });

    test('should recover gracefully from network interruptions', async ({ page }) => {
      const chatInput = page.locator('textarea').first();
      await chatInput.fill('Test network interruption');

      let requestCount = 0;
      await page.route('**/api/chat/completions', async route => {
        requestCount++;

        if (requestCount === 1) {
          // First request fails
          await route.abort('failed');
        } else {
          // Second request succeeds
          const artifact = `<artifact identifier="recovery-test" type="text/html">
<div>Recovery test successful</div>
</artifact>`;

          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
            body: artifact
          });
        }
      });

      await page.keyboard.press('Enter');

      // Wait for error handling, then retry
      await page.waitForTimeout(2000);

      // Retry the request
      await chatInput.fill('Retry after network error');
      await page.keyboard.press('Enter');

      // Should recover and process successfully
      await page.waitForSelector('.artifact-button', { timeout: 10000 });

      expect(requestCount).toBe(2); // Should have retried
    });
  });

  test.describe('Stress Testing', () => {
    test('should handle maximum artifact size limits', async ({ page }) => {
      // Test with very large artifact (near size limits)
      const maxSizeArtifact = await generateLargeArtifact(10000); // 10k lines

      await page.route('**/api/chat/completions', async route => {
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
          body: `Maximum size test:\n\n${maxSizeArtifact}`
        });
      });

      const chatInput = page.locator('textarea').first();
      await chatInput.fill('Create maximum size artifact');

      // Should handle large artifacts without crashing
      await page.keyboard.press('Enter');

      await page.waitForSelector('.artifact-button', { timeout: 30000 });

      // Verify the page is still responsive
      await expect(chatInput).toBeEnabled();
    });

    test('should maintain performance with many artifacts in history', async ({ page }) => {
      const chatInput = page.locator('textarea').first();

      // Create many artifacts in conversation history
      for (let i = 0; i < 20; i++) {
        await page.route(`**/api/chat/completions`, async route => {
          const artifact = `<artifact identifier="history-${i}" type="text/html">
<div>Historical artifact ${i}</div>
</artifact>`;

          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
            body: artifact
          });
        });

        await chatInput.fill(`Create historical artifact ${i}`);
        await page.keyboard.press('Enter');

        // Wait for artifact to be processed
        await page.waitForSelector('.artifact-button', { timeout: 5000 });
      }

      // Test performance with full history
      await page.route('**/api/chat/completions', async route => {
        const artifact = `<artifact identifier="final-test" type="text/html">
<div>Final performance test</div>
</artifact>`;

        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
          body: artifact
        });
      });

      const { duration } = await measurePerformance(async () => {
        await chatInput.fill('Final performance test');
        await page.keyboard.press('Enter');
        await page.waitForSelector('.artifact-button', { timeout: 10000 });
      });

      // Should still be fast even with many artifacts in history
      expect(duration).toBeLessThan(2000);
    });
  });
});