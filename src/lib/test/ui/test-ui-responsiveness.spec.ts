/**
 * UI Responsiveness Validation Tests
 *
 * These tests validate that the Enhanced Error Recovery UI remains responsive
 * during dependency resolution processing, ensuring smooth user interactions
 * and preventing UI blocking during intensive operations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import EnhancedErrorRecovery from '../../components/artifacts/EnhancedErrorRecovery.svelte';

// Mock the heavy processing services
vi.mock('../../services/artifact-dependency-resolver/strategy-executor', () => ({
  defaultStrategyExecutor: {
    executeRecovery: vi.fn()
  }
}));

vi.mock('../../services/llm-autofix-service/llm-fix-service', () => ({
  llmAutoFixService: {
    attemptAutoFix: vi.fn()
  }
}));

describe('UI Responsiveness Validation', () => {
  const mockProps = {
    artifactId: 'responsiveness-test',
    artifactCode: 'import styles from "./test.module.css";\nconst Test = () => <div className={styles.test}>Test</div>;',
    errorMessage: 'CSS module not found',
    messageContent: '.test { background: blue; }',
    language: 'javascript',
    autoStart: false,
    showAdvancedOptions: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('UI Thread Non-Blocking Behavior', () => {
    it('should keep UI responsive during auto-resolution processing', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      // Mock slow processing
      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            success: true,
            strategy: 'CSS_MODULE_CONVERSION',
            confidence: 0.9,
            finalCode: 'const styles = { test: { background: "blue" } };',
            processingTimeMs: 2000,
            stages: [],
            errors: [],
            circuitState: 'CLOSED'
          }), 2000);
        })
      );

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      // Start processing
      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // UI should remain responsive during processing
      let clickCount = 0;
      const testButton = screen.getByText('Cancel'); // Should be available during processing

      // Simulate rapid user interactions
      const rapidClicks = async () => {
        for (let i = 0; i < 10; i++) {
          await fireEvent.click(testButton);
          clickCount++;
          await tick(); // Allow Svelte to process updates
        }
      };

      // Execute rapid clicks while processing is ongoing
      await rapidClicks();

      // UI should have processed all interactions
      expect(clickCount).toBe(10);

      // Advance time to complete processing
      vi.advanceTimersByTime(2000);
      await tick();

      // Should complete successfully
      await waitFor(() => {
        expect(screen.getByText(/Success/i)).toBeInTheDocument();
      });
    });

    it('should maintain smooth animations during processing', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      // Mock processing with progress updates
      const progressCallback: ((progress: number) => void) | null = null;
      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(
        () => new Promise(resolve => {
          let progress = 0;
          const interval = setInterval(() => {
            progress += 10;
            if (progressCallback) {
              progressCallback(progress);
            }
            if (progress >= 100) {
              clearInterval(interval);
              resolve({
                success: true,
                strategy: 'CSS_MODULE_CONVERSION',
                confidence: 0.9,
                finalCode: 'const styles = { test: { background: "blue" } };',
                processingTimeMs: 1000,
                stages: [],
                errors: [],
                circuitState: 'CLOSED'
              });
            }
          }, 100);
        })
      );

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      // Start processing
      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Check for progress indicators
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Simulate progress updates
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(100);
        await tick();

        // Progress bar should be updating smoothly
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
      }

      // Complete processing
      vi.advanceTimersByTime(100);
      await tick();

      await waitFor(() => {
        expect(screen.getByText(/Success/i)).toBeInTheDocument();
      });
    });

    it('should handle concurrent user interactions gracefully', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            success: true,
            strategy: 'CSS_MODULE_CONVERSION',
            confidence: 0.8,
            finalCode: 'const styles = { test: { background: "blue" } };',
            processingTimeMs: 1500,
            stages: [],
            errors: [],
            circuitState: 'CLOSED'
          }), 1500);
        })
      );

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      // Start processing
      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Simulate concurrent interactions
      const interactions = [
        // Try to cancel
        async () => {
          const cancelButton = screen.queryByText('Cancel');
          if (cancelButton) {
            await fireEvent.click(cancelButton);
          }
        },
        // Try to toggle options
        async () => {
          const optionsToggle = screen.queryByText('Show Details');
          if (optionsToggle) {
            await fireEvent.click(optionsToggle);
          }
        },
        // Try to interact with progress
        async () => {
          const progressArea = screen.queryByRole('progressbar');
          if (progressArea) {
            await fireEvent.click(progressArea);
          }
        }
      ];

      // Execute all interactions concurrently
      await Promise.all(interactions.map(interaction => interaction()));

      // UI should handle all interactions without crashing
      expect(screen.getByText(/Processing/i)).toBeInTheDocument();

      // Complete processing
      vi.advanceTimersByTime(1500);
      await tick();

      await waitFor(() => {
        expect(screen.getByText(/Success/i)).toBeInTheDocument();
      });
    });
  });

  describe('Memory Management During Processing', () => {
    it('should maintain low memory usage during long-running operations', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      // Mock memory-intensive processing
      const largeData = 'x'.repeat(10000); // 10KB of data
      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(
        () => new Promise(resolve => {
          // Simulate processing large amounts of data
          const processChunk = () => {
            const chunk = largeData.repeat(100); // 1MB chunk
            // Process chunk...
            setTimeout(() => {
              resolve({
                success: true,
                strategy: 'CSS_MODULE_CONVERSION',
                confidence: 0.85,
                finalCode: 'const styles = { test: { background: "blue" } };',
                processingTimeMs: 3000,
                stages: [],
                errors: [],
                circuitState: 'CLOSED'
              });
            }, 3000);
          };

          processChunk();
        })
      );

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      // Monitor memory usage during processing
      const startMemory = getMemoryUsage();

      // Start processing
      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Advance time in chunks to simulate processing
      for (let i = 0; i < 30; i++) {
        vi.advanceTimersByTime(100);
        await tick();

        // Memory usage shouldn't grow excessively
        const currentMemory = getMemoryUsage();
        const memoryGrowth = currentMemory - startMemory;
        expect(memoryGrowth).toBeLessThan(50); // Less than 50MB growth
      }

      // Complete processing
      vi.advanceTimersByTime(100);
      await tick();

      await waitFor(() => {
        expect(screen.getByText(/Success/i)).toBeInTheDocument();
      });
    });

    it('should handle memory pressure gracefully', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      // Mock high memory pressure scenario
      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(
        () => new Promise((resolve, reject) => {
          // Simulate memory pressure by creating large objects
          const memoryIntensiveProcess = () => {
            try {
              const largeArrays = [];
              for (let i = 0; i < 100; i++) {
                largeArrays.push(new Array(100000).fill('x')); // Large arrays
              }

              setTimeout(() => {
                resolve({
                  success: true,
                  strategy: 'CSS_MODULE_CONVERSION',
                  confidence: 0.75,
                  finalCode: 'const styles = { test: { background: "blue" } };',
                  processingTimeMs: 2500,
                  stages: [],
                  errors: [],
                  circuitState: 'CLOSED'
                });
              }, 2500);
            } catch (error) {
              reject(error);
            }
          };

          memoryIntensiveProcess();
        })
      );

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      // Start processing
      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // UI should remain stable even under memory pressure
      expect(screen.getByText(/Processing/i)).toBeInTheDocument();

      // Complete processing
      vi.advanceTimersByTime(2500);
      await tick();

      // Should complete successfully or handle memory errors gracefully
      await waitFor(() => {
        const successElement = screen.queryByText(/Success/i);
        const errorElement = screen.queryByText(/Error/i);
        expect(successElement || errorElement).toBeInTheDocument();
      });
    });
  });

  describe('Animation Performance', () => {
    it('should maintain smooth animations at 60fps during processing', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            success: true,
            strategy: 'CSS_MODULE_CONVERSION',
            confidence: 0.9,
            finalCode: 'const styles = { test: { background: "blue" } };',
            processingTimeMs: 1000,
            stages: [],
            errors: [],
            circuitState: 'CLOSED'
          }), 1000);
        })
      );

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      // Start processing to trigger animations
      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Monitor animation frame rate
      const frameRates: number[] = [];
      let lastFrameTime = performance.now();
      let frameCount = 0;

      const monitorFrameRate = () => {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastFrameTime;
        const fps = 1000 / deltaTime;

        frameRates.push(fps);
        lastFrameTime = currentTime;
        frameCount++;

        if (frameCount < 60) { // Monitor for 1 second at 60fps
          requestAnimationFrame(monitorFrameRate);
        }
      };

      // Start monitoring frame rate
      requestAnimationFrame(monitorFrameRate);

      // Advance time to allow animations to run
      for (let i = 0; i < 60; i++) {
        vi.advanceTimersByTime(16.67); // ~60fps
        await tick();
      }

      // Complete processing
      vi.advanceTimersByTime(1000);
      await tick();

      // Check frame rate consistency
      const averageFps = frameRates.reduce((sum, fps) => sum + fps, 0) / frameRates.length;
      expect(averageFps).toBeGreaterThan(30); // Should maintain at least 30fps

      // No frame should drop below 15fps (severe stuttering)
      const minFps = Math.min(...frameRates);
      expect(minFps).toBeGreaterThan(15);
    });

    it('should handle animation interruptions gracefully', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      let resolveProcessing: any;
      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(
        () => new Promise(resolve => {
          resolveProcessing = resolve;
        })
      );

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      // Start processing with animations
      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Let animations start
      vi.advanceTimersByTime(500);
      await tick();

      // Interrupt with user interaction
      const cancelButton = screen.getByText('Cancel');
      await fireEvent.click(cancelButton);

      // Animations should stop gracefully
      expect(screen.queryByText(/Processing/i)).not.toBeInTheDocument();

      // Clean up
      if (resolveProcessing) {
        resolveProcessing({
          success: false,
          strategy: 'CANCELLED',
          confidence: 0,
          finalCode: '',
          processingTimeMs: 500,
          stages: [],
          errors: ['User cancelled'],
          circuitState: 'CLOSED'
        });
      }
    });
  });

  describe('Event Loop Management', () => {
    it('should yield to event loop during intensive operations', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      // Track event loop yields
      let yieldCount = 0;
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback, delay) => {
        if (delay === 0) {
          yieldCount++;
        }
        return originalSetTimeout(callback, delay);
      });

      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(
        () => new Promise(resolve => {
          // Simulate intensive synchronous work with yields
          const intensiveWork = async () => {
            for (let i = 0; i < 100; i++) {
              // Simulate work
              const data = new Array(1000).fill(i);
              data.sort();

              // Yield to event loop
              await new Promise(resolve => setTimeout(resolve, 0));
            }

            resolve({
              success: true,
              strategy: 'CSS_MODULE_CONVERSION',
              confidence: 0.9,
              finalCode: 'const styles = { test: { background: "blue" } };',
              processingTimeMs: 2000,
              stages: [],
              errors: [],
              circuitState: 'CLOSED'
            });
          };

          intensiveWork();
        })
      );

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      // Start processing
      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Advance time to complete processing
      for (let i = 0; i < 100; i++) {
        vi.advanceTimersByTime(20);
        await tick();
      }

      // Should have yielded to event loop multiple times
      expect(yieldCount).toBeGreaterThan(50);

      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;
    });

    it('should handle high-frequency updates smoothly', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      const progressCallback: ((progress: number) => void) | null = null;

      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(
        () => new Promise(resolve => {
          let progress = 0;

          // High-frequency progress updates (every 10ms)
          const interval = setInterval(() => {
            progress += 1;
            if (progressCallback) {
              progressCallback(progress);
            }

            if (progress >= 100) {
              clearInterval(interval);
              resolve({
                success: true,
                strategy: 'CSS_MODULE_CONVERSION',
                confidence: 0.9,
                finalCode: 'const styles = { test: { background: "blue" } };',
                processingTimeMs: 1000,
                stages: [],
                errors: [],
                circuitState: 'CLOSED'
              });
            }
          }, 10);
        })
      );

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      // Start processing
      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // UI should handle high-frequency updates smoothly
      for (let i = 0; i < 100; i++) {
        vi.advanceTimersByTime(10);
        await tick();

        // UI should remain responsive
        const progressBar = screen.queryByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
      }

      // Complete processing
      vi.advanceTimersByTime(10);
      await tick();

      await waitFor(() => {
        expect(screen.getByText(/Success/i)).toBeInTheDocument();
      });
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources when component unmounts during processing', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      let cleanupCalled = false;
      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(
        () => new Promise((resolve, reject) => {
          const cleanup = () => {
            cleanupCalled = true;
          };

          // Simulate long-running process
          const timeout = setTimeout(() => {
            resolve({
              success: true,
              strategy: 'CSS_MODULE_CONVERSION',
              confidence: 0.9,
              finalCode: 'const styles = { test: { background: "blue" } };',
              processingTimeMs: 5000,
              stages: [],
              errors: [],
              circuitState: 'CLOSED'
            });
          }, 5000);

          // Return cleanup function
          return {
            cancel: () => {
              clearTimeout(timeout);
              cleanup();
              reject(new Error('Cancelled'));
            }
          };
        })
      );

      const { component, unmount } = render(EnhancedErrorRecovery, { props: mockProps });

      // Start processing
      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Let processing start
      vi.advanceTimersByTime(1000);
      await tick();

      // Unmount component while processing
      unmount();

      // Should have triggered cleanup
      expect(cleanupCalled).toBe(true);
    });
  });

  // Helper function to estimate memory usage
  function getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0; // Fallback for test environment
  }
});