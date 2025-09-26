/**
 * Retry Loop Monitor Service
 * Detects and prevents infinite retry conditions using circuit breaker pattern
 */

export interface RetryAttempt {
	timestamp: Date;
	component: string;
	error?: string;
	duration: number;
}

export interface RetryLoopAlert {
	componentId: string;
	alertType: 'circuit_open' | 'threshold_exceeded' | 'infinite_loop_detected';
	consecutiveFailures: number;
	timeWindow: number;
	recommendation: string;
}

export interface RetryMonitorConfig {
	maxConsecutiveFailures: number;
	circuitOpenDuration: number; // milliseconds
	failureTimeWindow: number; // milliseconds
	maxRetryHistory: number;
	alertThreshold: number;
}

export interface ComponentState {
	componentId: string;
	retryHistory: RetryAttempt[];
	consecutiveFailures: number;
	isCircuitOpen: boolean;
	circuitOpenTime?: Date;
	lastFailureTime?: Date;
	totalRetries: number;
}

export interface IRetryLoopMonitor {
	/**
	 * Record a retry attempt for a component
	 */
	recordRetry(componentId: string, error?: string, duration?: number): void;

	/**
	 * Record a successful operation (resets failure count)
	 */
	recordSuccess(componentId: string): void;

	/**
	 * Check if a component can retry (circuit breaker check)
	 */
	canRetry(componentId: string): boolean;

	/**
	 * Get current state for a component
	 */
	getComponentState(componentId: string): ComponentState | null;

	/**
	 * Reset circuit breaker for a component
	 */
	resetCircuit(componentId: string): void;

	/**
	 * Get all active alerts
	 */
	getActiveAlerts(): RetryLoopAlert[];

	/**
	 * Update monitor configuration
	 */
	updateConfig(config: Partial<RetryMonitorConfig>): void;
}

const DEFAULT_CONFIG: RetryMonitorConfig = {
	maxConsecutiveFailures: 3,
	circuitOpenDuration: 30000, // 30 seconds
	failureTimeWindow: 60000, // 1 minute
	maxRetryHistory: 10,
	alertThreshold: 5
};

export class RetryLoopMonitorService implements IRetryLoopMonitor {
	private config: RetryMonitorConfig;
	private componentStates = new Map<string, ComponentState>();
	private activeAlerts = new Map<string, RetryLoopAlert>();

	constructor(config: Partial<RetryMonitorConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	recordRetry(componentId: string, error?: string, duration: number = 0): void {
		const now = new Date();
		let state = this.componentStates.get(componentId);

		if (!state) {
			state = {
				componentId,
				retryHistory: [],
				consecutiveFailures: 0,
				isCircuitOpen: false,
				totalRetries: 0
			};
			this.componentStates.set(componentId, state);
		}

		// Add retry attempt to history
		const attempt: RetryAttempt = {
			timestamp: now,
			component: componentId,
			error,
			duration
		};

		state.retryHistory.push(attempt);
		state.consecutiveFailures++;
		state.lastFailureTime = now;
		state.totalRetries++;

		// Trim history to max size
		if (state.retryHistory.length > this.config.maxRetryHistory) {
			state.retryHistory = state.retryHistory.slice(-this.config.maxRetryHistory);
		}

		// Check if circuit should open
		if (state.consecutiveFailures >= this.config.maxConsecutiveFailures) {
			this.openCircuit(componentId);
		}

		// Check for infinite loops
		this.detectInfiniteLoop(componentId);

		console.warn(`Retry recorded for ${componentId}:`, {
			consecutiveFailures: state.consecutiveFailures,
			totalRetries: state.totalRetries,
			error,
			duration
		});
	}

	recordSuccess(componentId: string): void {
		const state = this.componentStates.get(componentId);
		if (!state) return;

		// Reset failure counters on success
		state.consecutiveFailures = 0;
		state.isCircuitOpen = false;
		state.circuitOpenTime = undefined;

		// Remove any active alerts for this component
		this.activeAlerts.delete(componentId);

		console.log(`Success recorded for ${componentId}, circuit reset`);
	}

	canRetry(componentId: string): boolean {
		const state = this.componentStates.get(componentId);
		if (!state) return true; // No history means retries are allowed

		// Check if circuit is open
		if (state.isCircuitOpen && state.circuitOpenTime) {
			const timeSinceOpen = Date.now() - state.circuitOpenTime.getTime();

			// Circuit remains open during cooldown period
			if (timeSinceOpen < this.config.circuitOpenDuration) {
				return false;
			}

			// Circuit moves to half-open state after cooldown
			console.log(`Circuit half-open for ${componentId}, allowing test retry`);
		}

		// Check if we're in an infinite loop pattern
		if (this.isInInfiniteLoop(componentId)) {
			return false;
		}

		return true;
	}

	getComponentState(componentId: string): ComponentState | null {
		return this.componentStates.get(componentId) || null;
	}

	resetCircuit(componentId: string): void {
		const state = this.componentStates.get(componentId);
		if (!state) return;

		state.isCircuitOpen = false;
		state.circuitOpenTime = undefined;
		state.consecutiveFailures = 0;
		this.activeAlerts.delete(componentId);

		console.log(`Circuit manually reset for ${componentId}`);
	}

	getActiveAlerts(): RetryLoopAlert[] {
		return Array.from(this.activeAlerts.values());
	}

	updateConfig(config: Partial<RetryMonitorConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Get current configuration
	 */
	getConfig(): RetryMonitorConfig {
		return { ...this.config };
	}

	private openCircuit(componentId: string): void {
		const state = this.componentStates.get(componentId);
		if (!state) return;

		state.isCircuitOpen = true;
		state.circuitOpenTime = new Date();

		// Create alert
		const alert: RetryLoopAlert = {
			componentId,
			alertType: 'circuit_open',
			consecutiveFailures: state.consecutiveFailures,
			timeWindow: this.config.circuitOpenDuration,
			recommendation: `Circuit breaker opened for ${componentId}. Wait ${this.config.circuitOpenDuration / 1000}s before retrying.`
		};

		this.activeAlerts.set(componentId, alert);
		console.error(`Circuit breaker opened for ${componentId}:`, alert);
	}

	private detectInfiniteLoop(componentId: string): void {
		const state = this.componentStates.get(componentId);
		if (!state) return;

		// Check for rapid retries within time window
		const now = Date.now();
		const recentRetries = state.retryHistory.filter(
			attempt => now - attempt.timestamp.getTime() < this.config.failureTimeWindow
		);

		if (recentRetries.length >= this.config.alertThreshold) {
			const alert: RetryLoopAlert = {
				componentId,
				alertType: 'infinite_loop_detected',
				consecutiveFailures: state.consecutiveFailures,
				timeWindow: this.config.failureTimeWindow,
				recommendation: `Possible infinite loop detected for ${componentId}. ${recentRetries.length} retries in ${this.config.failureTimeWindow / 1000}s.`
			};

			this.activeAlerts.set(`${componentId}_loop`, alert);
			console.error(`Infinite loop detected for ${componentId}:`, alert);
		}
	}

	private isInInfiniteLoop(componentId: string): boolean {
		const alert = this.activeAlerts.get(`${componentId}_loop`);
		return alert?.alertType === 'infinite_loop_detected';
	}
}

// Default singleton instance
export const retryLoopMonitor = new RetryLoopMonitorService();