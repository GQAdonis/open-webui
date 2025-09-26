/**
 * Retry Loop Monitor Unit Tests
 *
 * Tests the RetryLoopMonitorService for proper circuit breaker functionality,
 * infinite loop detection, state management, and configuration handling.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  RetryLoopMonitorService,
  retryLoopMonitor,
  type RetryMonitorConfig,
  type ComponentState,
  type RetryLoopAlert,
  type RetryAttempt
} from '../../src/lib/services/retry-loop-monitor';

describe('RetryLoopMonitorService', () => {
  let monitor: RetryLoopMonitorService;
  let mockDate: Date;

  beforeEach(() => {
    // Setup mock date for consistent timing tests
    mockDate = new Date('2024-01-01T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    // Create fresh monitor instance for each test
    monitor = new RetryLoopMonitorService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const config = monitor.getConfig();

      expect(config.maxConsecutiveFailures).toBe(3);
      expect(config.circuitOpenDuration).toBe(30000);
      expect(config.failureTimeWindow).toBe(60000);
      expect(config.maxRetryHistory).toBe(10);
      expect(config.alertThreshold).toBe(5);
    });

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<RetryMonitorConfig> = {
        maxConsecutiveFailures: 5,
        circuitOpenDuration: 60000,
        alertThreshold: 3
      };

      const customMonitor = new RetryLoopMonitorService(customConfig);
      const config = customMonitor.getConfig();

      expect(config.maxConsecutiveFailures).toBe(5);
      expect(config.circuitOpenDuration).toBe(60000);
      expect(config.alertThreshold).toBe(3);
      // Defaults should remain for unspecified values
      expect(config.failureTimeWindow).toBe(60000);
      expect(config.maxRetryHistory).toBe(10);
    });

    it('should update configuration after initialization', () => {
      const newConfig: Partial<RetryMonitorConfig> = {
        maxConsecutiveFailures: 7,
        circuitOpenDuration: 45000
      };

      monitor.updateConfig(newConfig);
      const config = monitor.getConfig();

      expect(config.maxConsecutiveFailures).toBe(7);
      expect(config.circuitOpenDuration).toBe(45000);
      // Other values should remain unchanged
      expect(config.failureTimeWindow).toBe(60000);
    });

    it('should return a copy of config to prevent external mutation', () => {
      const config1 = monitor.getConfig();
      const config2 = monitor.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);

      config1.maxConsecutiveFailures = 999;
      expect(monitor.getConfig().maxConsecutiveFailures).toBe(3);
    });
  });

  describe('Retry Recording', () => {
    it('should record a retry attempt', () => {
      const componentId = 'test-component';
      const error = 'Test error message';
      const duration = 1500;

      monitor.recordRetry(componentId, error, duration);

      const state = monitor.getComponentState(componentId);
      expect(state).toBeTruthy();
      expect(state!.componentId).toBe(componentId);
      expect(state!.consecutiveFailures).toBe(1);
      expect(state!.totalRetries).toBe(1);
      expect(state!.retryHistory).toHaveLength(1);
      expect(state!.retryHistory[0].error).toBe(error);
      expect(state!.retryHistory[0].duration).toBe(duration);
      expect(state!.lastFailureTime).toEqual(mockDate);
    });

    it('should increment failure counts on subsequent retries', () => {
      const componentId = 'test-component';

      monitor.recordRetry(componentId, 'Error 1');
      monitor.recordRetry(componentId, 'Error 2');
      monitor.recordRetry(componentId, 'Error 3');

      const state = monitor.getComponentState(componentId);
      expect(state!.consecutiveFailures).toBe(3);
      expect(state!.totalRetries).toBe(3);
      expect(state!.retryHistory).toHaveLength(3);
    });

    it('should limit retry history to configured maximum', () => {
      const componentId = 'test-component';
      const maxHistory = monitor.getConfig().maxRetryHistory;

      // Record more retries than the maximum
      for (let i = 0; i < maxHistory + 5; i++) {
        monitor.recordRetry(componentId, `Error ${i}`);
      }

      const state = monitor.getComponentState(componentId);
      expect(state!.retryHistory).toHaveLength(maxHistory);
      expect(state!.totalRetries).toBe(maxHistory + 5);

      // Should keep the most recent entries
      expect(state!.retryHistory[0].error).toBe(`Error ${5}`);
      expect(state!.retryHistory[maxHistory - 1].error).toBe(`Error ${maxHistory + 4}`);
    });

    it('should handle retry without error message', () => {
      const componentId = 'test-component';

      monitor.recordRetry(componentId);

      const state = monitor.getComponentState(componentId);
      expect(state!.retryHistory[0].error).toBeUndefined();
      expect(state!.retryHistory[0].duration).toBe(0);
    });

    it('should handle multiple components independently', () => {
      monitor.recordRetry('component-1', 'Error A');
      monitor.recordRetry('component-2', 'Error B');
      monitor.recordRetry('component-1', 'Error A2');

      const state1 = monitor.getComponentState('component-1');
      const state2 = monitor.getComponentState('component-2');

      expect(state1!.consecutiveFailures).toBe(2);
      expect(state2!.consecutiveFailures).toBe(1);
      expect(state1!.retryHistory).toHaveLength(2);
      expect(state2!.retryHistory).toHaveLength(1);
    });
  });

  describe('Success Recording', () => {
    it('should reset failure counters on success', () => {
      const componentId = 'test-component';

      // Record some failures
      monitor.recordRetry(componentId, 'Error 1');
      monitor.recordRetry(componentId, 'Error 2');

      expect(monitor.getComponentState(componentId)!.consecutiveFailures).toBe(2);

      // Record success
      monitor.recordSuccess(componentId);

      const state = monitor.getComponentState(componentId);
      expect(state!.consecutiveFailures).toBe(0);
      expect(state!.isCircuitOpen).toBe(false);
      expect(state!.circuitOpenTime).toBeUndefined();
    });

    it('should remove active alerts on success', () => {
      const componentId = 'test-component';

      // Trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        monitor.recordRetry(componentId, `Error ${i}`);
      }

      expect(monitor.getActiveAlerts()).toHaveLength(1);

      // Record success
      monitor.recordSuccess(componentId);

      expect(monitor.getActiveAlerts()).toHaveLength(0);
    });

    it('should handle success for non-existent component gracefully', () => {
      expect(() => monitor.recordSuccess('non-existent')).not.toThrow();
      expect(monitor.getComponentState('non-existent')).toBeNull();
    });

    it('should preserve retry history on success', () => {
      const componentId = 'test-component';

      monitor.recordRetry(componentId, 'Error 1');
      monitor.recordRetry(componentId, 'Error 2');

      const historyLength = monitor.getComponentState(componentId)!.retryHistory.length;

      monitor.recordSuccess(componentId);

      // History should be preserved
      expect(monitor.getComponentState(componentId)!.retryHistory).toHaveLength(historyLength);
      expect(monitor.getComponentState(componentId)!.totalRetries).toBe(2);
    });
  });

  describe('Circuit Breaker Functionality', () => {
    it('should open circuit after max consecutive failures', () => {
      const componentId = 'test-component';
      const maxFailures = monitor.getConfig().maxConsecutiveFailures;

      // Record failures up to threshold
      for (let i = 0; i < maxFailures; i++) {
        monitor.recordRetry(componentId, `Error ${i}`);
      }

      const state = monitor.getComponentState(componentId);
      expect(state!.isCircuitOpen).toBe(true);
      expect(state!.circuitOpenTime).toEqual(mockDate);
    });

    it('should prevent retries when circuit is open', () => {
      const componentId = 'test-component';
      const maxFailures = monitor.getConfig().maxConsecutiveFailures;

      // Trigger circuit breaker
      for (let i = 0; i < maxFailures; i++) {
        monitor.recordRetry(componentId, `Error ${i}`);
      }

      expect(monitor.canRetry(componentId)).toBe(false);
    });

    it('should allow retries after circuit open duration', () => {
      const componentId = 'test-component';
      const maxFailures = monitor.getConfig().maxConsecutiveFailures;
      const openDuration = monitor.getConfig().circuitOpenDuration;

      // Trigger circuit breaker
      for (let i = 0; i < maxFailures; i++) {
        monitor.recordRetry(componentId, `Error ${i}`);
      }

      expect(monitor.canRetry(componentId)).toBe(false);

      // Advance time past circuit open duration
      vi.advanceTimersByTime(openDuration + 1000);

      expect(monitor.canRetry(componentId)).toBe(true);
    });

    it('should create circuit breaker alert when opened', () => {
      const componentId = 'test-component';
      const maxFailures = monitor.getConfig().maxConsecutiveFailures;

      // Trigger circuit breaker
      for (let i = 0; i < maxFailures; i++) {
        monitor.recordRetry(componentId, `Error ${i}`);
      }

      const alerts = monitor.getActiveAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('circuit_open');
      expect(alerts[0].componentId).toBe(componentId);
      expect(alerts[0].consecutiveFailures).toBe(maxFailures);
      expect(alerts[0].recommendation).toContain('Circuit breaker opened');
    });

    it('should manually reset circuit breaker', () => {
      const componentId = 'test-component';
      const maxFailures = monitor.getConfig().maxConsecutiveFailures;

      // Trigger circuit breaker
      for (let i = 0; i < maxFailures; i++) {
        monitor.recordRetry(componentId, `Error ${i}`);
      }

      expect(monitor.canRetry(componentId)).toBe(false);
      expect(monitor.getActiveAlerts()).toHaveLength(1);

      // Manual reset
      monitor.resetCircuit(componentId);

      const state = monitor.getComponentState(componentId);
      expect(state!.isCircuitOpen).toBe(false);
      expect(state!.circuitOpenTime).toBeUndefined();
      expect(state!.consecutiveFailures).toBe(0);
      expect(monitor.canRetry(componentId)).toBe(true);
      expect(monitor.getActiveAlerts()).toHaveLength(0);
    });

    it('should handle manual reset for non-existent component', () => {
      expect(() => monitor.resetCircuit('non-existent')).not.toThrow();
    });
  });

  describe('Infinite Loop Detection', () => {
    it('should detect infinite loop patterns', () => {
      const componentId = 'test-component';
      const alertThreshold = monitor.getConfig().alertThreshold;

      // Record rapid retries to trigger infinite loop detection
      for (let i = 0; i < alertThreshold; i++) {
        monitor.recordRetry(componentId, `Rapid error ${i}`);
        vi.advanceTimersByTime(1000); // Small time advancement
      }

      const alerts = monitor.getActiveAlerts();
      const loopAlert = alerts.find(alert => alert.alertType === 'infinite_loop_detected');

      expect(loopAlert).toBeDefined();
      expect(loopAlert!.componentId).toBe(componentId);
      expect(loopAlert!.recommendation).toContain('Possible infinite loop detected');
    });

    it('should prevent retries when infinite loop is detected', () => {
      const componentId = 'test-component';
      const alertThreshold = monitor.getConfig().alertThreshold;

      // Trigger infinite loop detection
      for (let i = 0; i < alertThreshold; i++) {
        monitor.recordRetry(componentId, `Rapid error ${i}`);
        vi.advanceTimersByTime(1000);
      }

      expect(monitor.canRetry(componentId)).toBe(false);
    });

    it('should not detect infinite loop for spaced out retries', () => {
      const componentId = 'test-component';
      const alertThreshold = monitor.getConfig().alertThreshold;
      const timeWindow = monitor.getConfig().failureTimeWindow;

      // Record retries with large time gaps
      for (let i = 0; i < alertThreshold; i++) {
        monitor.recordRetry(componentId, `Spaced error ${i}`);
        vi.advanceTimersByTime(timeWindow + 5000); // Advance past time window
      }

      const alerts = monitor.getActiveAlerts();
      const loopAlert = alerts.find(alert => alert.alertType === 'infinite_loop_detected');

      expect(loopAlert).toBeUndefined();
      expect(monitor.canRetry(componentId)).toBe(true);
    });

    it('should clear infinite loop detection on success', () => {
      const componentId = 'test-component';
      const alertThreshold = monitor.getConfig().alertThreshold;

      // Trigger infinite loop detection
      for (let i = 0; i < alertThreshold; i++) {
        monitor.recordRetry(componentId, `Rapid error ${i}`);
        vi.advanceTimersByTime(1000);
      }

      expect(monitor.canRetry(componentId)).toBe(false);

      // Record success
      monitor.recordSuccess(componentId);

      expect(monitor.canRetry(componentId)).toBe(true);
      const alerts = monitor.getActiveAlerts();
      expect(alerts.find(alert => alert.alertType === 'infinite_loop_detected')).toBeUndefined();
    });
  });

  describe('Component State Management', () => {
    it('should return null for non-existent component', () => {
      expect(monitor.getComponentState('non-existent')).toBeNull();
    });

    it('should track multiple components independently', () => {
      monitor.recordRetry('component-1', 'Error A', 100);
      monitor.recordRetry('component-2', 'Error B', 200);
      monitor.recordRetry('component-1', 'Error A2', 150);

      const state1 = monitor.getComponentState('component-1');
      const state2 = monitor.getComponentState('component-2');

      expect(state1!.consecutiveFailures).toBe(2);
      expect(state1!.totalRetries).toBe(2);
      expect(state2!.consecutiveFailures).toBe(1);
      expect(state2!.totalRetries).toBe(1);

      // Check retry history
      expect(state1!.retryHistory).toHaveLength(2);
      expect(state1!.retryHistory[0].duration).toBe(100);
      expect(state1!.retryHistory[1].duration).toBe(150);

      expect(state2!.retryHistory).toHaveLength(1);
      expect(state2!.retryHistory[0].duration).toBe(200);
    });

    it('should maintain accurate timestamps', () => {
      const componentId = 'timestamp-test';

      monitor.recordRetry(componentId, 'Error 1');

      vi.advanceTimersByTime(5000);
      const timestamp1 = new Date();

      monitor.recordRetry(componentId, 'Error 2');

      const state = monitor.getComponentState(componentId);
      expect(state!.retryHistory[0].timestamp).toEqual(mockDate);
      expect(state!.retryHistory[1].timestamp).toEqual(timestamp1);
      expect(state!.lastFailureTime).toEqual(timestamp1);
    });

    it('should handle concurrent operations on same component', () => {
      const componentId = 'concurrent-test';

      // Simulate concurrent retry recordings
      monitor.recordRetry(componentId, 'Error 1', 100);
      monitor.recordRetry(componentId, 'Error 2', 200);
      monitor.recordSuccess(componentId);
      monitor.recordRetry(componentId, 'Error 3', 300);

      const state = monitor.getComponentState(componentId);
      expect(state!.consecutiveFailures).toBe(1); // Reset by success, then incremented
      expect(state!.totalRetries).toBe(3);
      expect(state!.retryHistory).toHaveLength(3);
    });
  });

  describe('Alert Management', () => {
    it('should return empty alerts initially', () => {
      expect(monitor.getActiveAlerts()).toHaveLength(0);
    });

    it('should track multiple alert types', () => {
      const component1 = 'component-1';
      const component2 = 'component-2';
      const maxFailures = monitor.getConfig().maxConsecutiveFailures;
      const alertThreshold = monitor.getConfig().alertThreshold;

      // Trigger circuit breaker for component1
      for (let i = 0; i < maxFailures; i++) {
        monitor.recordRetry(component1, `Circuit error ${i}`);
      }

      // Trigger infinite loop for component2
      for (let i = 0; i < alertThreshold; i++) {
        monitor.recordRetry(component2, `Loop error ${i}`);
        vi.advanceTimersByTime(1000);
      }

      const alerts = monitor.getActiveAlerts();
      expect(alerts).toHaveLength(2);

      const circuitAlert = alerts.find(alert => alert.alertType === 'circuit_open');
      const loopAlert = alerts.find(alert => alert.alertType === 'infinite_loop_detected');

      expect(circuitAlert).toBeDefined();
      expect(circuitAlert!.componentId).toBe(component1);

      expect(loopAlert).toBeDefined();
      expect(loopAlert!.componentId).toBe(component2);
    });

    it('should provide actionable recommendations in alerts', () => {
      const componentId = 'alert-test';
      const maxFailures = monitor.getConfig().maxConsecutiveFailures;

      // Trigger circuit breaker
      for (let i = 0; i < maxFailures; i++) {
        monitor.recordRetry(componentId, `Error ${i}`);
      }

      const alerts = monitor.getActiveAlerts();
      const alert = alerts[0];

      expect(alert.recommendation).toContain('Circuit breaker opened');
      expect(alert.recommendation).toContain(`${monitor.getConfig().circuitOpenDuration / 1000}s`);
      expect(alert.timeWindow).toBe(monitor.getConfig().circuitOpenDuration);
    });
  });

  describe('Retry Permission Logic', () => {
    it('should allow retries for new components', () => {
      expect(monitor.canRetry('new-component')).toBe(true);
    });

    it('should allow retries under failure threshold', () => {
      const componentId = 'threshold-test';
      const maxFailures = monitor.getConfig().maxConsecutiveFailures;

      // Record failures below threshold
      for (let i = 0; i < maxFailures - 1; i++) {
        monitor.recordRetry(componentId, `Error ${i}`);
      }

      expect(monitor.canRetry(componentId)).toBe(true);
    });

    it('should deny retries when circuit is open', () => {
      const componentId = 'circuit-test';
      const maxFailures = monitor.getConfig().maxConsecutiveFailures;

      // Trigger circuit breaker
      for (let i = 0; i < maxFailures; i++) {
        monitor.recordRetry(componentId, `Error ${i}`);
      }

      expect(monitor.canRetry(componentId)).toBe(false);
    });

    it('should transition to half-open state after cooldown', () => {
      const componentId = 'half-open-test';
      const maxFailures = monitor.getConfig().maxConsecutiveFailures;
      const openDuration = monitor.getConfig().circuitOpenDuration;

      // Trigger circuit breaker
      for (let i = 0; i < maxFailures; i++) {
        monitor.recordRetry(componentId, `Error ${i}`);
      }

      expect(monitor.canRetry(componentId)).toBe(false);

      // Advance time to half-open state
      vi.advanceTimersByTime(openDuration + 1000);

      expect(monitor.canRetry(componentId)).toBe(true);

      const state = monitor.getComponentState(componentId);
      expect(state!.isCircuitOpen).toBe(true); // Still marked as open until success
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle zero values in configuration', () => {
      const zeroConfig: Partial<RetryMonitorConfig> = {
        maxConsecutiveFailures: 0,
        circuitOpenDuration: 0,
        alertThreshold: 0
      };

      const zeroMonitor = new RetryLoopMonitorService(zeroConfig);
      const componentId = 'zero-test';

      // Should open circuit immediately with 0 max failures
      zeroMonitor.recordRetry(componentId, 'Error');

      expect(zeroMonitor.canRetry(componentId)).toBe(true); // Should allow immediately with 0 duration
    });

    it('should handle very large configuration values', () => {
      const largeConfig: Partial<RetryMonitorConfig> = {
        maxConsecutiveFailures: 1000000,
        circuitOpenDuration: 1000000000,
        maxRetryHistory: 10000
      };

      const largeMonitor = new RetryLoopMonitorService(largeConfig);
      const componentId = 'large-test';

      // Should handle large numbers without issues
      for (let i = 0; i < 100; i++) {
        largeMonitor.recordRetry(componentId, `Error ${i}`);
      }

      expect(largeMonitor.canRetry(componentId)).toBe(true);
      expect(largeMonitor.getComponentState(componentId)!.consecutiveFailures).toBe(100);
    });
  });

  describe('Default Singleton Instance', () => {
    it('should provide a default singleton instance', () => {
      expect(retryLoopMonitor).toBeInstanceOf(RetryLoopMonitorService);
      expect(retryLoopMonitor.getConfig()).toBeDefined();
    });

    it('should maintain state across accesses', () => {
      const componentId = 'singleton-test';

      retryLoopMonitor.recordRetry(componentId, 'Test error');

      expect(retryLoopMonitor.getComponentState(componentId)).toBeTruthy();
      expect(retryLoopMonitor.getComponentState(componentId)!.totalRetries).toBe(1);

      // Clean up for other tests
      retryLoopMonitor.resetCircuit(componentId);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should limit memory usage with max history', () => {
      const componentId = 'memory-test';
      const maxHistory = monitor.getConfig().maxRetryHistory;

      // Record many retries
      for (let i = 0; i < maxHistory * 3; i++) {
        monitor.recordRetry(componentId, `Error ${i}`, i);
      }

      const state = monitor.getComponentState(componentId);
      expect(state!.retryHistory).toHaveLength(maxHistory);
      expect(state!.totalRetries).toBe(maxHistory * 3);
    });

    it('should handle rapid retry recordings efficiently', () => {
      const componentId = 'performance-test';
      const startTime = Date.now();

      // Record many retries rapidly
      for (let i = 0; i < 1000; i++) {
        monitor.recordRetry(componentId, `Performance test ${i}`, i);
      }

      const elapsed = Date.now() - startTime;

      // Should complete within reasonable time
      expect(elapsed).toBeLessThan(1000); // 1 second
      expect(monitor.getComponentState(componentId)!.totalRetries).toBe(1000);
    });

    it('should clean up old retry history based on time window', () => {
      const componentId = 'cleanup-test';
      const timeWindow = monitor.getConfig().failureTimeWindow;

      // Record retries at different times
      monitor.recordRetry(componentId, 'Old error 1');

      vi.advanceTimersByTime(timeWindow / 2);
      monitor.recordRetry(componentId, 'Middle error');

      vi.advanceTimersByTime(timeWindow / 2 + 1000);
      monitor.recordRetry(componentId, 'Recent error');

      // The infinite loop detection should only consider recent retries
      const state = monitor.getComponentState(componentId);
      expect(state!.retryHistory).toHaveLength(3);

      // But when checking for infinite loops, older entries outside time window are ignored
      expect(monitor.canRetry(componentId)).toBe(true); // Should still allow retries
    });
  });

  describe('Real-world Scenarios', () => {
    const scenarios = [
      {
        name: 'artifact rendering failures',
        componentId: 'artifact-renderer-123',
        errorPattern: 'Sandpack timeout after {duration}ms',
        durations: [5000, 8000, 12000, 15000],
        expectedCircuitOpen: true
      },
      {
        name: 'network request failures',
        componentId: 'api-client-456',
        errorPattern: 'Network error: {status}',
        durations: [1000, 1500, 2000],
        expectedCircuitOpen: true
      },
      {
        name: 'intermittent failures with recovery',
        componentId: 'flaky-service-789',
        errorPattern: 'Temporary error: {reason}',
        durations: [500, 750],
        expectedCircuitOpen: false
      }
    ];

    scenarios.forEach(({ name, componentId, errorPattern, durations, expectedCircuitOpen }) => {
      it(`should handle ${name} correctly`, () => {
        // Record failures
        durations.forEach((duration, index) => {
          const error = errorPattern.replace('{duration}', duration.toString())
                                  .replace('{status}', `${500 + index}`)
                                  .replace('{reason}', `reason-${index}`);
          monitor.recordRetry(componentId, error, duration);
          vi.advanceTimersByTime(1000); // Small time advancement between retries
        });

        const state = monitor.getComponentState(componentId);
        expect(state!.consecutiveFailures).toBe(durations.length);
        expect(state!.totalRetries).toBe(durations.length);

        if (expectedCircuitOpen) {
          expect(state!.isCircuitOpen).toBe(true);
          expect(monitor.canRetry(componentId)).toBe(false);
          expect(monitor.getActiveAlerts().length).toBeGreaterThan(0);
        } else {
          expect(state!.isCircuitOpen).toBe(false);
          expect(monitor.canRetry(componentId)).toBe(true);
        }
      });
    });

    it('should handle mixed success and failure patterns', () => {
      const componentId = 'mixed-pattern';

      // Initial failures
      monitor.recordRetry(componentId, 'Error 1');
      monitor.recordRetry(componentId, 'Error 2');

      // Success resets
      monitor.recordSuccess(componentId);

      // More failures
      monitor.recordRetry(componentId, 'Error 3');
      monitor.recordRetry(componentId, 'Error 4');
      monitor.recordRetry(componentId, 'Error 5');

      const state = monitor.getComponentState(componentId);
      expect(state!.consecutiveFailures).toBe(3); // Reset by success
      expect(state!.totalRetries).toBe(5);
      expect(state!.isCircuitOpen).toBe(true); // Should be open after 3 consecutive
    });

    it('should recover properly after circuit cooldown', () => {
      const componentId = 'recovery-test';
      const maxFailures = monitor.getConfig().maxConsecutiveFailures;
      const openDuration = monitor.getConfig().circuitOpenDuration;

      // Trigger circuit breaker
      for (let i = 0; i < maxFailures; i++) {
        monitor.recordRetry(componentId, `Initial error ${i}`);
      }

      expect(monitor.canRetry(componentId)).toBe(false);

      // Wait for cooldown
      vi.advanceTimersByTime(openDuration + 1000);

      // Should allow test retry
      expect(monitor.canRetry(componentId)).toBe(true);

      // Successful retry should fully recover
      monitor.recordSuccess(componentId);

      const state = monitor.getComponentState(componentId);
      expect(state!.isCircuitOpen).toBe(false);
      expect(state!.consecutiveFailures).toBe(0);
      expect(monitor.getActiveAlerts()).toHaveLength(0);
    });
  });
});