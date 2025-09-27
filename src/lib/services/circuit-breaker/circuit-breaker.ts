/**
 * Circuit Breaker Pattern Implementation
 * Prevents infinite retry loops in artifact recovery by temporarily blocking attempts
 * after repeated failures and allowing recovery after successful attempts.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenTimeoutMs?: number;
}

export interface CircuitMetrics {
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  state: CircuitState;
  openedAt?: number;
}

export interface CircuitBreakerAPI {
  allowRecoveryAttempt(artifactId: string): boolean;
  recordFailure(artifactId: string, error: string): void;
  recordSuccess(artifactId: string): void;
  getCircuitState(artifactId: string): CircuitState;
  resetCircuit(artifactId: string): void;
  getMetrics(artifactId: string): CircuitMetrics;
}

/**
 * Circuit Breaker Implementation for Artifact Recovery
 */
export class CircuitBreaker implements CircuitBreakerAPI {
  private circuits: Map<string, CircuitMetrics> = new Map();
  private config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: config.failureThreshold,
      resetTimeoutMs: config.resetTimeoutMs,
      halfOpenTimeoutMs: config.halfOpenTimeoutMs || config.resetTimeoutMs / 2
    };
  }

  /**
   * Check if recovery attempt is allowed for an artifact
   */
  allowRecoveryAttempt(artifactId: string): boolean {
    const circuit = this.getOrCreateCircuit(artifactId);

    switch (circuit.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        // Check if enough time has passed to try half-open
        if (this.shouldTransitionToHalfOpen(circuit)) {
          this.transitionToHalfOpen(artifactId);
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return true;

      default:
        return false;
    }
  }

  /**
   * Record a failure for an artifact
   */
  recordFailure(artifactId: string, error: string): void {
    const circuit = this.getOrCreateCircuit(artifactId);

    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();

    console.log(`🔴 [Circuit Breaker] Failure recorded for ${artifactId}. Count: ${circuit.failureCount}/${this.config.failureThreshold}`);

    // Transition based on current state and failure count
    switch (circuit.state) {
      case 'CLOSED':
        if (circuit.failureCount >= this.config.failureThreshold) {
          this.transitionToOpen(artifactId);
        }
        break;

      case 'HALF_OPEN':
        // Any failure in half-open state goes back to open
        this.transitionToOpen(artifactId);
        break;

      case 'OPEN':
        // Already open, just update metrics
        break;
    }
  }

  /**
   * Record a success for an artifact
   */
  recordSuccess(artifactId: string): void {
    const circuit = this.getOrCreateCircuit(artifactId);

    circuit.successCount++;
    circuit.lastSuccessTime = Date.now();

    console.log(`🟢 [Circuit Breaker] Success recorded for ${artifactId}`);

    // Success resets the circuit to closed state
    switch (circuit.state) {
      case 'HALF_OPEN':
      case 'OPEN':
        this.transitionToClosed(artifactId);
        break;

      case 'CLOSED':
        // Reset failure count on success
        circuit.failureCount = 0;
        break;
    }
  }

  /**
   * Get current circuit state for an artifact
   */
  getCircuitState(artifactId: string): CircuitState {
    const circuit = this.getOrCreateCircuit(artifactId);

    // Check for automatic state transitions based on time
    if (circuit.state === 'OPEN' && this.shouldTransitionToHalfOpen(circuit)) {
      this.transitionToHalfOpen(artifactId);
    }

    return circuit.state;
  }

  /**
   * Manually reset circuit to closed state
   */
  resetCircuit(artifactId: string): void {
    console.log(`🔄 [Circuit Breaker] Manually resetting circuit for ${artifactId}`);

    const circuit = this.getOrCreateCircuit(artifactId);
    circuit.failureCount = 0;
    circuit.successCount = 0;
    circuit.lastFailureTime = undefined;
    circuit.openedAt = undefined;
    circuit.state = 'CLOSED';

    this.circuits.set(artifactId, circuit);
  }

  /**
   * Get detailed metrics for an artifact's circuit
   */
  getMetrics(artifactId: string): CircuitMetrics {
    return { ...this.getOrCreateCircuit(artifactId) };
  }

  /**
   * Get or create circuit for an artifact
   */
  private getOrCreateCircuit(artifactId: string): CircuitMetrics {
    if (!this.circuits.has(artifactId)) {
      this.circuits.set(artifactId, {
        failureCount: 0,
        successCount: 0,
        state: 'CLOSED'
      });
    }

    return this.circuits.get(artifactId)!;
  }

  /**
   * Check if circuit should transition from OPEN to HALF_OPEN
   */
  private shouldTransitionToHalfOpen(circuit: CircuitMetrics): boolean {
    if (circuit.state !== 'OPEN' || !circuit.openedAt) {
      return false;
    }

    const timeSinceOpened = Date.now() - circuit.openedAt;
    return timeSinceOpened >= this.config.resetTimeoutMs;
  }

  /**
   * Transition circuit to OPEN state
   */
  private transitionToOpen(artifactId: string): void {
    const circuit = this.getOrCreateCircuit(artifactId);
    circuit.state = 'OPEN';
    circuit.openedAt = Date.now();

    console.log(`🚫 [Circuit Breaker] Circuit OPENED for ${artifactId} after ${circuit.failureCount} failures`);

    this.circuits.set(artifactId, circuit);
  }

  /**
   * Transition circuit to HALF_OPEN state
   */
  private transitionToHalfOpen(artifactId: string): void {
    const circuit = this.getOrCreateCircuit(artifactId);
    circuit.state = 'HALF_OPEN';

    console.log(`⚠️ [Circuit Breaker] Circuit HALF-OPEN for ${artifactId} - testing if service recovered`);

    this.circuits.set(artifactId, circuit);
  }

  /**
   * Transition circuit to CLOSED state
   */
  private transitionToClosed(artifactId: string): void {
    const circuit = this.getOrCreateCircuit(artifactId);
    circuit.state = 'CLOSED';
    circuit.failureCount = 0;
    circuit.openedAt = undefined;

    console.log(`✅ [Circuit Breaker] Circuit CLOSED for ${artifactId} - recovery successful`);

    this.circuits.set(artifactId, circuit);
  }

  /**
   * Get all circuit states (for debugging/monitoring)
   */
  getAllCircuits(): Map<string, CircuitMetrics> {
    return new Map(this.circuits);
  }

  /**
   * Clear all circuit states
   */
  clearAllCircuits(): void {
    console.log('🧹 [Circuit Breaker] Clearing all circuit states');
    this.circuits.clear();
  }
}

// Export default instance with reasonable defaults
export const defaultCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeoutMs: 60000, // 1 minute
  halfOpenTimeoutMs: 30000 // 30 seconds
});