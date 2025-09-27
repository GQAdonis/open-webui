/**
 * Contract Tests: CircuitBreakerAPI
 * These tests validate the circuit breaker pattern for preventing infinite loops.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CircuitBreaker,
  type CircuitBreakerAPI,
  type CircuitState
} from '../../services/circuit-breaker/circuit-breaker';

describe('CircuitBreakerAPI Contract Tests', () => {
  let circuitBreaker: CircuitBreakerAPI;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 60000
    });
  });

  describe('Circuit State Management', () => {
    it('should start in CLOSED state', () => {
      const state = circuitBreaker.getCircuitState('test-artifact');
      expect(state).toBe('CLOSED' as CircuitState);
    });

    it('should open circuit after failure threshold', () => {
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure('test-artifact', 'Test failure');
      }
      const state = circuitBreaker.getCircuitState('test-artifact');
      expect(state).toBe('OPEN' as CircuitState);
    });

    it('should prevent recovery attempts when circuit is open', () => {
      // Force circuit open
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure('test-artifact', 'Test failure');
      }

      const canAttempt = circuitBreaker.allowRecoveryAttempt('test-artifact');
      expect(canAttempt).toBe(false);
    });

    it('should allow recovery attempts after successful fix', () => {
      circuitBreaker.recordSuccess('test-artifact');
      const canAttempt = circuitBreaker.allowRecoveryAttempt('test-artifact');
      expect(canAttempt).toBe(true);
    });

    it('should reset circuit state', () => {
      // Create some failure state
      circuitBreaker.recordFailure('test-artifact', 'Test failure');

      circuitBreaker.resetCircuit('test-artifact');

      const state = circuitBreaker.getCircuitState('test-artifact');
      expect(state).toBe('CLOSED' as CircuitState);
    });
  });
});