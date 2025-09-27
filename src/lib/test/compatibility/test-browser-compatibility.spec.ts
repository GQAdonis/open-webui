/**
 * Browser Compatibility Validation Tests
 *
 * These tests validate that the Advanced Artifact Dependency Resolution System
 * works correctly across Chrome, Firefox, and Safari browsers, ensuring
 * consistent behavior and performance across different browser environments.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defaultStrategyExecutor, type RecoveryRequest } from '../../services/artifact-dependency-resolver/strategy-executor';
import { performanceOptimizer } from '../../services/artifact-dependency-resolver/performance-optimizer';
import { memoryManager } from '../../utils/artifacts/memory-manager';

// Mock different browser environments
const mockBrowserEnvironments = {
  chrome: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    performance: {
      memory: {
        usedJSHeapSize: 50 * 1024 * 1024,
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 2048 * 1024 * 1024
      },
      now: () => Date.now()
    },
    features: {
      webWorkers: true,
      serviceWorkers: true,
      streams: true,
      modules: true,
      asyncAwait: true,
      promises: true,
      fetch: true
    }
  },

  firefox: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    performance: {
      // Firefox doesn't expose memory API in standard builds
      memory: undefined,
      now: () => Date.now()
    },
    features: {
      webWorkers: true,
      serviceWorkers: true,
      streams: true,
      modules: true,
      asyncAwait: true,
      promises: true,
      fetch: true
    }
  },

  safari: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    performance: {
      memory: undefined, // Safari doesn't expose memory API
      now: () => Date.now()
    },
    features: {
      webWorkers: true,
      serviceWorkers: true,
      streams: false, // Limited streams support in older Safari
      modules: true,
      asyncAwait: true,
      promises: true,
      fetch: true
    }
  }
};

describe('Browser Compatibility Validation', () => {
  let originalNavigator: any;
  let originalPerformance: any;

  beforeEach(() => {
    originalNavigator = global.navigator;
    originalPerformance = global.performance;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.navigator = originalNavigator;
    global.performance = originalPerformance;
  });

  describe('Chrome Browser Compatibility', () => {
    beforeEach(() => {
      mockBrowserEnvironment('chrome');
    });

    it('should execute dependency resolution with full Chrome features', async () => {
      const request: RecoveryRequest = {
        artifactId: 'chrome-compatibility-test',
        artifactCode: `
          import styles from "./chrome-test.module.css";
          const ChromeTestComponent = () => (
            <div className={styles.container}>
              <h1 className={styles.title}>Chrome Compatibility Test</h1>
            </div>
          );
        `,
        errorMessage: 'CSS module not found',
        messageContent: `
          .container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            padding: 20px;
          }

          .title {
            font-size: clamp(1.5rem, 4vw, 3rem);
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
        `,
        language: 'javascript',
        attemptId: 'chrome-compatibility-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('CSS_MODULE_CONVERSION');
      expect(result.finalCode).toBeDefined();

      const transformedCode = result.finalCode!;

      // Should handle modern CSS features
      expect(transformedCode).toContain('display: \'grid\'');
      expect(transformedCode).toContain('grid-template-columns');
      expect(transformedCode).toContain('clamp(1.5rem, 4vw, 3rem)');
      expect(transformedCode).toContain('linear-gradient');
      expect(transformedCode).toContain('-webkit-background-clip');

      // Should utilize Chrome's performance API
      expect(result.processingTimeMs).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    it('should leverage Chrome performance optimization features', async () => {
      const config = performanceOptimizer.getConfig();

      // Chrome should enable all performance features
      expect(config.enableCaching).toBe(true);
      expect(config.enableParallelProcessing).toBe(true);
      expect(config.maxParallelWorkers).toBeGreaterThan(1);

      // Memory management should use Chrome's memory API
      const memoryInfo = memoryManager.getMetrics();
      expect(memoryInfo.currentUsageMB).toBeGreaterThan(0);
    });

    it('should handle Chrome-specific CSS features correctly', async () => {
      const request: RecoveryRequest = {
        artifactId: 'chrome-css-features-test',
        artifactCode: `
          import styles from "./chrome-css.module.css";
          const Component = () => <div className={styles.modern}>Modern CSS</div>;
        `,
        errorMessage: 'CSS module not found',
        messageContent: `
          .modern {
            display: flex;
            backdrop-filter: blur(10px);
            container-type: inline-size;
            scroll-snap-type: x mandatory;
            overscroll-behavior: contain;
            text-size-adjust: none;
          }

          @container (min-width: 400px) {
            .modern {
              padding: 2rem;
            }
          }

          @supports (backdrop-filter: blur(10px)) {
            .modern {
              background: rgba(255, 255, 255, 0.1);
            }
          }
        `,
        language: 'javascript',
        attemptId: 'chrome-css-features-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;
      expect(transformedCode).toContain('backdrop-filter');
      expect(transformedCode).toContain('container-type');
      expect(transformedCode).toContain('@container');
      expect(transformedCode).toContain('@supports');
    });
  });

  describe('Firefox Browser Compatibility', () => {
    beforeEach(() => {
      mockBrowserEnvironment('firefox');
    });

    it('should execute dependency resolution without memory API', async () => {
      const request: RecoveryRequest = {
        artifactId: 'firefox-compatibility-test',
        artifactCode: `
          import styles from "./firefox-test.module.css";
          const FirefoxTestComponent = () => (
            <div className={styles.container}>
              <h1 className={styles.title}>Firefox Compatibility Test</h1>
            </div>
          );
        `,
        errorMessage: 'CSS module not found',
        messageContent: `
          .container {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .title {
            font-size: 2rem;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
          }
        `,
        language: 'javascript',
        attemptId: 'firefox-compatibility-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('CSS_MODULE_CONVERSION');
      expect(result.finalCode).toBeDefined();

      // Should handle the lack of memory API gracefully
      const transformedCode = result.finalCode!;
      expect(transformedCode).toContain('display: \'flex\'');
      expect(transformedCode).toContain('flex-direction');
      expect(transformedCode).toContain('background-clip');
    });

    it('should adapt performance optimization for Firefox limitations', async () => {
      // Memory manager should work without performance.memory
      const metrics = memoryManager.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.memoryPressureLevel).toBeDefined();

      // Performance optimizer should adapt to Firefox
      const config = performanceOptimizer.getConfig();
      expect(config.enableCaching).toBe(true); // Should still work
    });

    it('should handle Firefox-specific CSS behaviors', async () => {
      const request: RecoveryRequest = {
        artifactId: 'firefox-css-test',
        artifactCode: `
          import styles from "./firefox-css.module.css";
          const Component = () => <div className={styles.firefox}>Firefox CSS</div>;
        `,
        errorMessage: 'CSS module not found',
        messageContent: `
          .firefox {
            /* Firefox has good CSS Grid support */
            display: grid;
            grid-template-areas: "header" "content" "footer";

            /* Firefox supports these well */
            scrollbar-width: thin;
            scrollbar-color: #666 #f0f0f0;

            /* Firefox has good flexbox support */
            display: flex;
            flex-wrap: wrap;
          }

          /* Firefox supports container queries but differently */
          @supports (container-type: inline-size) {
            .firefox {
              container-type: inline-size;
            }
          }
        `,
        language: 'javascript',
        attemptId: 'firefox-css-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;
      expect(transformedCode).toContain('grid-template-areas');
      expect(transformedCode).toContain('scrollbar-width');
      expect(transformedCode).toContain('scrollbar-color');
    });
  });

  describe('Safari Browser Compatibility', () => {
    beforeEach(() => {
      mockBrowserEnvironment('safari');
    });

    it('should execute dependency resolution with Safari limitations', async () => {
      const request: RecoveryRequest = {
        artifactId: 'safari-compatibility-test',
        artifactCode: `
          import styles from "./safari-test.module.css";
          const SafariTestComponent = () => (
            <div className={styles.container}>
              <h1 className={styles.title}>Safari Compatibility Test</h1>
            </div>
          );
        `,
        errorMessage: 'CSS module not found',
        messageContent: `
          .container {
            display: -webkit-flex;
            display: flex;
            -webkit-flex-direction: column;
            flex-direction: column;
          }

          .title {
            font-size: 2rem;
            background: -webkit-linear-gradient(45deg, #ff6b6b, #4ecdc4);
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
        `,
        language: 'javascript',
        attemptId: 'safari-compatibility-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('CSS_MODULE_CONVERSION');
      expect(result.finalCode).toBeDefined();

      const transformedCode = result.finalCode!;
      expect(transformedCode).toContain('-webkit-flex');
      expect(transformedCode).toContain('-webkit-linear-gradient');
      expect(transformedCode).toContain('-webkit-background-clip');
      expect(transformedCode).toContain('-webkit-text-fill-color');
    });

    it('should handle Safari CSS vendor prefixes correctly', async () => {
      const request: RecoveryRequest = {
        artifactId: 'safari-vendor-prefixes-test',
        artifactCode: `
          import styles from "./safari-prefixes.module.css";
          const Component = () => <div className={styles.safari}>Safari Prefixes</div>;
        `,
        errorMessage: 'CSS module not found',
        messageContent: `
          .safari {
            /* Safari needs -webkit- prefixes for many features */
            -webkit-appearance: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;

            /* Transforms need prefixes in older Safari */
            -webkit-transform: translateZ(0);
            transform: translateZ(0);

            /* Animations need prefixes */
            -webkit-animation: slideIn 0.3s ease;
            animation: slideIn 0.3s ease;
          }

          @-webkit-keyframes slideIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `,
        language: 'javascript',
        attemptId: 'safari-vendor-prefixes-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;
      expect(transformedCode).toContain('-webkit-appearance');
      expect(transformedCode).toContain('-webkit-user-select');
      expect(transformedCode).toContain('-webkit-animation');
      expect(transformedCode).toContain('@-webkit-keyframes');
    });

    it('should adapt to Safari memory constraints', async () => {
      // Safari has more restrictive memory limits
      const metrics = memoryManager.getMetrics();
      expect(metrics).toBeDefined();

      // Should work without performance.memory API
      expect(metrics.currentUsageMB).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cross-Browser Feature Detection', () => {
    it('should detect and adapt to browser capabilities', async () => {
      const capabilities = detectBrowserCapabilities();

      expect(capabilities).toHaveProperty('webWorkers');
      expect(capabilities).toHaveProperty('serviceWorkers');
      expect(capabilities).toHaveProperty('streams');
      expect(capabilities).toHaveProperty('modules');
      expect(capabilities).toHaveProperty('memoryAPI');
    });

    it('should handle feature polyfills appropriately', async () => {
      // Test with limited browser environment
      mockBrowserEnvironment('safari');

      const request: RecoveryRequest = {
        artifactId: 'polyfill-test',
        artifactCode: `
          import styles from "./polyfill.module.css";
          const Component = () => <div className={styles.modern}>Polyfill Test</div>;
        `,
        errorMessage: 'CSS module not found',
        messageContent: `
          .modern {
            /* Features that might need polyfills */
            display: grid;
            gap: 1rem;
            aspect-ratio: 16/9;
            container-type: inline-size;
          }
        `,
        language: 'javascript',
        attemptId: 'polyfill-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      // Should handle modern features gracefully
      const transformedCode = result.finalCode!;
      expect(transformedCode).toContain('display: \'grid\'');
    });
  });

  describe('Performance across Browsers', () => {
    it('should maintain performance targets across all browsers', async () => {
      const browsers = ['chrome', 'firefox', 'safari'];
      const results: Record<string, number> = {};

      for (const browser of browsers) {
        mockBrowserEnvironment(browser);

        const request: RecoveryRequest = {
          artifactId: `performance-${browser}-test`,
          artifactCode: `
            import styles from "./perf-test.module.css";
            const Component = () => <div className={styles.test}>Performance Test</div>;
          `,
          errorMessage: 'CSS module not found',
          messageContent: `
            .test {
              background: linear-gradient(45deg, #ff0000, #00ff00, #0000ff);
              transform: rotate(45deg) scale(1.2);
              filter: blur(2px) brightness(1.5);
              animation: spin 2s linear infinite;
            }

            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `,
          language: 'javascript',
          attemptId: `performance-${browser}-test-1`
        };

        const startTime = performance.now();
        const result = await defaultStrategyExecutor.executeRecovery(request);
        const endTime = performance.now();

        expect(result.success).toBe(true);
        results[browser] = endTime - startTime;

        // Should meet performance target (<1s)
        expect(endTime - startTime).toBeLessThan(1000);
      }

      // Performance should be relatively consistent across browsers
      const times = Object.values(results);
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const variation = (maxTime - minTime) / minTime;

      // Variation should be less than 100% (2x difference)
      expect(variation).toBeLessThan(1.0);
    });
  });

  describe('Error Handling across Browsers', () => {
    it('should provide consistent error handling across browsers', async () => {
      const browsers = ['chrome', 'firefox', 'safari'];

      for (const browser of browsers) {
        mockBrowserEnvironment(browser);

        const request: RecoveryRequest = {
          artifactId: `error-${browser}-test`,
          artifactCode: `
            import styles from "./broken.module.css";
            const Component = () => <div className={styles.broken}>Error Test</div>;
          `,
          errorMessage: 'CSS module not found',
          messageContent: `
            /* Intentionally broken CSS */
            .broken {
              invalid-property: invalid-value;
              color: #invalid;
              background: url('missing-image.jpg');
            }
          `,
          language: 'javascript',
          attemptId: `error-${browser}-test-1`
        };

        const result = await defaultStrategyExecutor.executeRecovery(request);

        // Should handle errors consistently
        expect(result).toBeDefined();
        expect(result.processingTimeMs).toBeDefined();

        if (!result.success) {
          expect(result.errors).toBeDefined();
          expect(result.errors!.length).toBeGreaterThan(0);
        }
      }
    });
  });

  // Helper functions
  function mockBrowserEnvironment(browser: keyof typeof mockBrowserEnvironments): void {
    const env = mockBrowserEnvironments[browser];

    // Mock navigator
    global.navigator = {
      userAgent: env.userAgent,
      ...global.navigator
    } as Navigator;

    // Mock performance
    global.performance = {
      ...env.performance,
      ...global.performance
    } as Performance;

    // Mock feature availability
    (global as any).browserFeatures = env.features;
  }

  function detectBrowserCapabilities(): Record<string, boolean> {
    return {
      webWorkers: typeof Worker !== 'undefined',
      serviceWorkers: 'serviceWorker' in navigator,
      streams: typeof ReadableStream !== 'undefined',
      modules: 'noModule' in HTMLScriptElement.prototype,
      memoryAPI: typeof performance !== 'undefined' && !!performance.memory,
      fetch: typeof fetch !== 'undefined',
      promises: typeof Promise !== 'undefined',
      asyncAwait: true, // Assume modern environment
      css: {
        grid: CSS.supports('display', 'grid'),
        flexbox: CSS.supports('display', 'flex'),
        customProperties: CSS.supports('--custom', 'value'),
        containerQueries: CSS.supports('container-type', 'inline-size')
      }
    };
  }
});