/**
 * Circuit Breaker State Management
 *
 * This service implements the circuit breaker pattern to prevent infinite loops
 * and cascade failures during artifact dependency resolution. It tracks failure
 * rates and automatically opens circuits when thresholds are exceeded.
 */

import { writable, type Writable } from 'svelte/store';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  volumeThreshold: number;
  successThreshold: number;
  monitoringWindow: number;
}

export interface CircuitMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  failureRate: number;
  averageResponseTime: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export interface CircuitBreakerState {
  artifactId: string;
  state: CircuitState;
  stateChangeTime: number;
  config: CircuitBreakerConfig;
  metrics: CircuitMetrics;
  recentRequests: CircuitRequest[];
}

export interface CircuitRequest {
  timestamp: number;
  success: boolean;
  responseTime: number;
  error?: string;
}

export interface CircuitBreakerEvent {
  artifactId: string;
  eventType: 'state_change' | 'request_completed' | 'threshold_exceeded' | 'recovery_attempt';
  timestamp: number;
  data: any;
}

/**
 * Circuit breaker manager that implements the circuit breaker pattern
 * for artifact dependency resolution
 */
export class CircuitBreakerManager {
  private circuits = new Map<string, CircuitBreakerState>();
  private eventStore: Writable<CircuitBreakerEvent[]> = writable([]);
  private cleanupInterval: NodeJS.Timeout | null = null;

  private defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 0.5, // 50% failure rate
    recoveryTimeout: 60000, // 1 minute
    volumeThreshold: 5, // Minimum requests before circuit can open
    successThreshold: 3, // Consecutive successes to close circuit
    monitoringWindow: 300000 // 5 minutes
  };

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Get observable store for circuit breaker events
   */
  get events() {
    return { subscribe: this.eventStore.subscribe };
  }

  /**
   * Check circuit state for an artifact
   */
  checkCircuit(artifactId: string): CircuitState {
    const circuit = this.getOrCreateCircuit(artifactId);
    this.updateCircuitState(circuit);
    return circuit.state;
  }

  /**
   * Record a request attempt and its result
   */
  recordRequest(artifactId: string, success: boolean, responseTime: number, error?: string): void {
    const circuit = this.getOrCreateCircuit(artifactId);
    const request: CircuitRequest = {
      timestamp: Date.now(),
      success,
      responseTime,
      error
    };

    // Add to recent requests
    circuit.recentRequests.push(request);
    this.cleanupOldRequests(circuit);

    // Update metrics
    this.updateMetrics(circuit, request);

    // Update circuit state based on new metrics
    this.updateCircuitState(circuit);

    // Emit event
    this.emitEvent({
      artifactId,
      eventType: 'request_completed',
      timestamp: Date.now(),
      data: { success, responseTime, error, state: circuit.state }
    });

    console.log(`🔄 [Circuit Breaker] Recorded ${success ? 'success' : 'failure'} for ${artifactId}, state: ${circuit.state}`);
  }

  /**
   * Manually open a circuit (emergency brake)
   */
  openCircuit(artifactId: string, reason: string = 'Manual intervention'): void {
    const circuit = this.getOrCreateCircuit(artifactId);
    this.changeCircuitState(circuit, 'OPEN', reason);
  }

  /**
   * Manually close a circuit (reset)
   */
  closeCircuit(artifactId: string): void {
    const circuit = this.getOrCreateCircuit(artifactId);
    this.resetCircuitMetrics(circuit);
    this.changeCircuitState(circuit, 'CLOSED', 'Manual reset');
  }

  /**
   * Reset circuit to initial state
   */
  resetCircuit(artifactId: string): void {
    const circuit = this.getOrCreateCircuit(artifactId);
    this.resetCircuitMetrics(circuit);
    this.changeCircuitState(circuit, 'CLOSED', 'Circuit reset');
  }

  /**
   * Get circuit breaker state for an artifact
   */
  getCircuitState(artifactId: string): CircuitBreakerState {
    return { ...this.getOrCreateCircuit(artifactId) };
  }

  /**
   * Get metrics for an artifact
   */
  getMetrics(artifactId: string): CircuitMetrics {
    const circuit = this.getOrCreateCircuit(artifactId);
    return { ...circuit.metrics };
  }

  /**
   * Get all circuit states
   */
  getAllCircuits(): Record<string, CircuitBreakerState> {
    const circuits: Record<string, CircuitBreakerState> = {};
    for (const [artifactId, circuit] of this.circuits.entries()) {
      circuits[artifactId] = { ...circuit };
    }
    return circuits;
  }

  /**
   * Update configuration for an artifact's circuit
   */
  updateConfig(artifactId: string, config: Partial<CircuitBreakerConfig>): void {
    const circuit = this.getOrCreateCircuit(artifactId);
    circuit.config = { ...circuit.config, ...config };
    console.log(`⚙️ [Circuit Breaker] Updated config for ${artifactId}:`, config);
  }

  /**
   * Get or create circuit for an artifact
   */
  private getOrCreateCircuit(artifactId: string): CircuitBreakerState {
    if (!this.circuits.has(artifactId)) {
      const circuit: CircuitBreakerState = {
        artifactId,
        state: 'CLOSED',
        stateChangeTime: Date.now(),
        config: { ...this.defaultConfig },
        metrics: this.createEmptyMetrics(),
        recentRequests: []
      };
      this.circuits.set(artifactId, circuit);
      console.log(`🆕 [Circuit Breaker] Created new circuit for ${artifactId}`);
    }
    return this.circuits.get(artifactId)!;
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): CircuitMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      failureRate: 0,
      averageResponseTime: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0
    };
  }

  /**
   * Update circuit state based on current metrics
   */
  private updateCircuitState(circuit: CircuitBreakerState): void {
    const now = Date.now();
    const { state, config, metrics } = circuit;

    switch (state) {
      case 'CLOSED':
        if (this.shouldOpenCircuit(circuit)) {
          this.changeCircuitState(circuit, 'OPEN', 'Failure threshold exceeded');
        }
        break;

      case 'OPEN':
        if (now - circuit.stateChangeTime >= config.recoveryTimeout) {
          this.changeCircuitState(circuit, 'HALF_OPEN', 'Recovery timeout elapsed');
        }
        break;

      case 'HALF_OPEN':
        if (metrics.consecutiveSuccesses >= config.successThreshold) {
          this.changeCircuitState(circuit, 'CLOSED', 'Recovery successful');
        } else if (metrics.consecutiveFailures > 0) {
          this.changeCircuitState(circuit, 'OPEN', 'Recovery failed');
        }
        break;
    }
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(circuit: CircuitBreakerState): boolean {
    const { metrics, config } = circuit;

    // Need minimum volume before opening
    if (metrics.totalRequests < config.volumeThreshold) {
      return false;
    }

    // Check failure rate
    return metrics.failureRate >= config.failureThreshold;
  }

  /**
   * Change circuit state and emit event
   */
  private changeCircuitState(circuit: CircuitBreakerState, newState: CircuitState, reason: string): void {
    const oldState = circuit.state;
    circuit.state = newState;
    circuit.stateChangeTime = Date.now();

    // Reset consecutive counters on state change
    if (newState === 'HALF_OPEN') {
      circuit.metrics.consecutiveSuccesses = 0;
      circuit.metrics.consecutiveFailures = 0;
    }

    this.emitEvent({
      artifactId: circuit.artifactId,
      eventType: 'state_change',
      timestamp: Date.now(),
      data: { oldState, newState, reason }
    });

    console.log(`🔄 [Circuit Breaker] ${circuit.artifactId}: ${oldState} → ${newState} (${reason})`);
  }

  /**
   * Update metrics with new request
   */
  private updateMetrics(circuit: CircuitBreakerState, request: CircuitRequest): void {
    const { metrics } = circuit;

    // Update totals
    metrics.totalRequests++;
    if (request.success) {
      metrics.successfulRequests++;
      metrics.consecutiveSuccesses++;
      metrics.consecutiveFailures = 0;
      metrics.lastSuccessTime = request.timestamp;
    } else {
      metrics.failedRequests++;
      metrics.consecutiveFailures++;
      metrics.consecutiveSuccesses = 0;
      metrics.lastFailureTime = request.timestamp;
    }

    // Calculate failure rate
    metrics.failureRate = metrics.failedRequests / metrics.totalRequests;

    // Update average response time
    const totalTime = (metrics.averageResponseTime * (metrics.totalRequests - 1)) + request.responseTime;
    metrics.averageResponseTime = totalTime / metrics.totalRequests;
  }

  /**
   * Clean up old requests outside monitoring window
   */
  private cleanupOldRequests(circuit: CircuitBreakerState): void {
    const cutoff = Date.now() - circuit.config.monitoringWindow;
    circuit.recentRequests = circuit.recentRequests.filter(req => req.timestamp >= cutoff);

    // Recalculate metrics based on recent requests only
    this.recalculateMetrics(circuit);
  }

  /**
   * Recalculate metrics from recent requests
   */
  private recalculateMetrics(circuit: CircuitBreakerState): void {
    const { recentRequests, metrics } = circuit;

    if (recentRequests.length === 0) {
      // Reset to empty state but keep consecutive counters
      const consecutiveSuccesses = metrics.consecutiveSuccesses;
      const consecutiveFailures = metrics.consecutiveFailures;
      const lastSuccessTime = metrics.lastSuccessTime;
      const lastFailureTime = metrics.lastFailureTime;

      circuit.metrics = this.createEmptyMetrics();
      circuit.metrics.consecutiveSuccesses = consecutiveSuccesses;
      circuit.metrics.consecutiveFailures = consecutiveFailures;
      circuit.metrics.lastSuccessTime = lastSuccessTime;
      circuit.metrics.lastFailureTime = lastFailureTime;
      return;
    }

    const successfulRequests = recentRequests.filter(req => req.success).length;
    const totalRequests = recentRequests.length;
    const totalResponseTime = recentRequests.reduce((sum, req) => sum + req.responseTime, 0);

    metrics.totalRequests = totalRequests;
    metrics.successfulRequests = successfulRequests;
    metrics.failedRequests = totalRequests - successfulRequests;
    metrics.failureRate = metrics.failedRequests / totalRequests;
    metrics.averageResponseTime = totalResponseTime / totalRequests;
  }

  /**
   * Reset circuit metrics
   */
  private resetCircuitMetrics(circuit: CircuitBreakerState): void {
    circuit.metrics = this.createEmptyMetrics();
    circuit.recentRequests = [];
  }

  /**
   * Emit circuit breaker event
   */
  private emitEvent(event: CircuitBreakerEvent): void {
    this.eventStore.update(events => {
      events.push(event);
      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      return events;
    });
  }

  /**
   * Start cleanup timer for old circuits
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveCircuits();
    }, 300000); // Clean up every 5 minutes
  }

  /**
   * Clean up circuits that haven't been used recently
   */
  private cleanupInactiveCircuits(): void {
    const cutoff = Date.now() - (30 * 60 * 1000); // 30 minutes
    let cleanedCount = 0;

    for (const [artifactId, circuit] of this.circuits.entries()) {
      const lastActivity = Math.max(
        circuit.stateChangeTime,
        circuit.metrics.lastSuccessTime || 0,
        circuit.metrics.lastFailureTime || 0
      );

      if (lastActivity < cutoff && circuit.state === 'CLOSED' && circuit.metrics.totalRequests === 0) {
        this.circuits.delete(artifactId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 [Circuit Breaker] Cleaned up ${cleanedCount} inactive circuits`);
    }
  }

  /**
   * Get system-wide statistics
   */
  getSystemStats(): {
    totalCircuits: number;
    openCircuits: number;
    halfOpenCircuits: number;
    closedCircuits: number;
    totalRequests: number;
    totalFailures: number;
    overallFailureRate: number;
  } {
    const circuits = Array.from(this.circuits.values());

    const stats = {
      totalCircuits: circuits.length,
      openCircuits: circuits.filter(c => c.state === 'OPEN').length,
      halfOpenCircuits: circuits.filter(c => c.state === 'HALF_OPEN').length,
      closedCircuits: circuits.filter(c => c.state === 'CLOSED').length,
      totalRequests: circuits.reduce((sum, c) => sum + c.metrics.totalRequests, 0),
      totalFailures: circuits.reduce((sum, c) => sum + c.metrics.failedRequests, 0),
      overallFailureRate: 0
    };

    if (stats.totalRequests > 0) {
      stats.overallFailureRate = stats.totalFailures / stats.totalRequests;
    }

    return stats;
  }

  /**
   * Force cleanup of all circuits (useful for testing)
   */
  reset(): void {
    this.circuits.clear();
    this.eventStore.set([]);
    console.log('🔄 [Circuit Breaker] Reset all circuits');
  }

  /**
   * Destroy the circuit breaker manager
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.reset();
    console.log('💀 [Circuit Breaker] Destroyed circuit breaker manager');
  }
}

// Export singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();