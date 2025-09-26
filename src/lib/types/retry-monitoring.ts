/**
 * Retry Monitoring Types
 * Type definitions for retry loop detection and circuit breaker patterns
 */

// Re-export service types for consistency
export {
	type RetryAttempt,
	type RetryLoopAlert,
	type RetryMonitorConfig,
	type ComponentState,
	type IRetryLoopMonitor
} from '../services/retry-loop-monitor';

/**
 * Extended monitoring types
 */

export interface RetryPattern {
	id: string;
	componentId: string;
	pattern: RetryPatternType;
	detectedAt: Date;
	frequency: number;
	severity: AlertSeverity;
	description: string;
}

export enum RetryPatternType {
	RAPID_FIRE = 'rapid_fire',           // Many retries in short time
	PERIODIC = 'periodic',               // Regular retry intervals
	EXPONENTIAL = 'exponential',         // Exponential backoff pattern
	CONSTANT = 'constant',               // Fixed interval retries
	CHAOTIC = 'chaotic',                 // Irregular pattern
	INFINITE_LOOP = 'infinite_loop'      // Detected infinite loop
}

export enum AlertSeverity {
	INFO = 'info',
	WARNING = 'warning',
	ERROR = 'error',
	CRITICAL = 'critical'
}

export interface CircuitBreakerState {
	componentId: string;
	state: CircuitState;
	failureCount: number;
	successCount: number;
	lastFailureTime?: Date;
	lastSuccessTime?: Date;
	nextAttemptTime?: Date;
	stateChangedAt: Date;
	config: CircuitBreakerConfig;
}

export enum CircuitState {
	CLOSED = 'closed',       // Normal operation
	OPEN = 'open',          // Circuit breaker activated
	HALF_OPEN = 'half_open' // Testing recovery
}

export interface CircuitBreakerConfig {
	failureThreshold: number;    // Failures before opening
	successThreshold: number;    // Successes to close from half-open
	timeout: number;            // Time to wait before half-open (ms)
	monitoringWindow: number;   // Time window for failure counting (ms)
}

export interface RetryMetrics {
	componentId: string;
	totalRetries: number;
	successfulRetries: number;
	failedRetries: number;
	averageRetryTime: number;
	longestRetrySequence: number;
	retrySuccessRate: number;
	lastRetryTime?: Date;
	patterns: RetryPattern[];
}

export interface MonitoringSession {
	id: string;
	startTime: Date;
	endTime?: Date;
	componentsMonitored: string[];
	alertsGenerated: number;
	patternsDetected: number;
	circuitBreakersTriggered: number;
	totalRetries: number;
	isActive: boolean;
}

export interface HealthCheckResult {
	componentId: string;
	isHealthy: boolean;
	lastCheck: Date;
	responseTime: number;
	consecutiveFailures: number;
	healthScore: number; // 0-100
	issues: HealthIssue[];
}

export interface HealthIssue {
	type: HealthIssueType;
	severity: AlertSeverity;
	message: string;
	detectedAt: Date;
	autoFixable: boolean;
}

export enum HealthIssueType {
	HIGH_FAILURE_RATE = 'high_failure_rate',
	SLOW_RESPONSE = 'slow_response',
	MEMORY_LEAK = 'memory_leak',
	RESOURCE_EXHAUSTION = 'resource_exhaustion',
	CIRCUIT_OPEN = 'circuit_open',
	INFINITE_LOOP = 'infinite_loop'
}

/**
 * Event monitoring types
 */
export interface RetryEvent {
	id: string;
	componentId: string;
	eventType: RetryEventType;
	timestamp: Date;
	metadata: RetryEventMetadata;
}

export enum RetryEventType {
	RETRY_ATTEMPTED = 'retry_attempted',
	RETRY_SUCCEEDED = 'retry_succeeded',
	RETRY_FAILED = 'retry_failed',
	CIRCUIT_OPENED = 'circuit_opened',
	CIRCUIT_CLOSED = 'circuit_closed',
	CIRCUIT_HALF_OPENED = 'circuit_half_opened',
	PATTERN_DETECTED = 'pattern_detected',
	ALERT_RAISED = 'alert_raised',
	HEALTH_CHECK_FAILED = 'health_check_failed'
}

export interface RetryEventMetadata {
	duration?: number;
	error?: string;
	attempt?: number;
	previousState?: CircuitState;
	newState?: CircuitState;
	pattern?: RetryPatternType;
	alertLevel?: AlertSeverity;
	[key: string]: any;
}

/**
 * Dashboard and reporting types
 */
export interface MonitoringDashboard {
	activeComponents: ComponentSummary[];
	recentAlerts: RetryLoopAlert[];
	systemHealth: SystemHealthSummary;
	patterns: PatternSummary[];
	performance: PerformanceMetrics;
}

export interface ComponentSummary {
	componentId: string;
	status: ComponentStatus;
	retryCount: number;
	lastActivity: Date;
	healthScore: number;
	alertLevel: AlertSeverity;
}

export enum ComponentStatus {
	HEALTHY = 'healthy',
	WARNING = 'warning',
	ERROR = 'error',
	CIRCUIT_OPEN = 'circuit_open',
	UNKNOWN = 'unknown'
}

export interface SystemHealthSummary {
	overallHealth: number; // 0-100
	totalComponents: number;
	healthyComponents: number;
	warningComponents: number;
	errorComponents: number;
	circuitOpenComponents: number;
}

export interface PatternSummary {
	pattern: RetryPatternType;
	count: number;
	affectedComponents: string[];
	firstSeen: Date;
	lastSeen: Date;
	severity: AlertSeverity;
}

export interface PerformanceMetrics {
	averageRetryTime: number;
	totalRetries: number;
	retrySuccessRate: number;
	circuitBreakerEffectiveness: number;
	falsePositiveRate: number;
	systemUptime: number;
}

/**
 * Configuration and policy types
 */
export interface MonitoringPolicy {
	name: string;
	description: string;
	rules: MonitoringRule[];
	actions: MonitoringAction[];
	isEnabled: boolean;
	priority: number;
}

export interface MonitoringRule {
	id: string;
	condition: RuleCondition;
	threshold: number;
	timeWindow: number; // milliseconds
	severity: AlertSeverity;
}

export interface RuleCondition {
	type: ConditionType;
	field: string;
	operator: ComparisonOperator;
	value: any;
}

export enum ConditionType {
	RETRY_COUNT = 'retry_count',
	FAILURE_RATE = 'failure_rate',
	RESPONSE_TIME = 'response_time',
	ERROR_PATTERN = 'error_pattern',
	CIRCUIT_STATE = 'circuit_state'
}

export enum ComparisonOperator {
	EQUALS = 'equals',
	NOT_EQUALS = 'not_equals',
	GREATER_THAN = 'greater_than',
	LESS_THAN = 'less_than',
	GREATER_EQUAL = 'greater_equal',
	LESS_EQUAL = 'less_equal',
	CONTAINS = 'contains',
	MATCHES = 'matches'
}

export interface MonitoringAction {
	type: ActionType;
	config: ActionConfig;
	isEnabled: boolean;
}

export enum ActionType {
	LOG_EVENT = 'log_event',
	SEND_ALERT = 'send_alert',
	OPEN_CIRCUIT = 'open_circuit',
	RESTART_COMPONENT = 'restart_component',
	THROTTLE_REQUESTS = 'throttle_requests',
	SEND_NOTIFICATION = 'send_notification'
}

export interface ActionConfig {
	[key: string]: any;
}

/**
 * Service interfaces
 */
export interface RetryMonitoringService {
	monitor: IRetryLoopMonitor;
	startSession(): MonitoringSession;
	endSession(sessionId: string): void;
	getMetrics(componentId?: string): RetryMetrics | RetryMetrics[];
	getDashboard(): MonitoringDashboard;
	addPolicy(policy: MonitoringPolicy): void;
	removePolicy(policyName: string): void;
	exportData(format: 'json' | 'csv'): string;
}

export interface AlertManager {
	raiseAlert(alert: RetryLoopAlert): void;
	resolveAlert(alertId: string): void;
	getActiveAlerts(): RetryLoopAlert[];
	subscribeToAlerts(callback: (alert: RetryLoopAlert) => void): void;
	unsubscribe(callback: (alert: RetryLoopAlert) => void): void;
}

/**
 * Type guards and validators
 */
export function isValidCircuitState(state: string): state is CircuitState {
	return Object.values(CircuitState).includes(state as CircuitState);
}

export function isRetryEvent(obj: any): obj is RetryEvent {
	return obj &&
		typeof obj.id === 'string' &&
		typeof obj.componentId === 'string' &&
		Object.values(RetryEventType).includes(obj.eventType) &&
		obj.timestamp instanceof Date;
}

export function isHealthy(component: ComponentSummary): boolean {
	return component.status === ComponentStatus.HEALTHY &&
		component.healthScore > 80;
}

/**
 * Default configurations
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
	failureThreshold: 5,
	successThreshold: 3,
	timeout: 30000, // 30 seconds
	monitoringWindow: 60000 // 1 minute
};

export const DEFAULT_MONITORING_POLICY: MonitoringPolicy = {
	name: 'Default Retry Monitoring',
	description: 'Basic retry loop detection and circuit breaker policy',
	rules: [
		{
			id: 'high-retry-count',
			condition: {
				type: ConditionType.RETRY_COUNT,
				field: 'consecutiveFailures',
				operator: ComparisonOperator.GREATER_THAN,
				value: 3
			},
			threshold: 3,
			timeWindow: 60000,
			severity: AlertSeverity.WARNING
		}
	],
	actions: [
		{
			type: ActionType.LOG_EVENT,
			config: { level: 'warn' },
			isEnabled: true
		},
		{
			type: ActionType.OPEN_CIRCUIT,
			config: { timeout: 30000 },
			isEnabled: true
		}
	],
	isEnabled: true,
	priority: 1
};