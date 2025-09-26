/**
 * E2E Testing Types
 * Extended type definitions for end-to-end testing framework
 */

// Re-export contract types
export {
	type E2ETestRequest,
	type E2ETestResponse,
	type E2ETestSuite,
	type E2ETestSuiteResult,
	type LLMProvider,
	type RenderingResult,
	type TestError,
	type TestSummary,
	type PerformanceMetrics,
	type E2ETestCase,
	type TestAssertion,
	TestStage,
	TestErrorType,
	AssertionType,
	type IE2ETestRunner,
	STANDARD_TEST_CASES,
	E2ETestExecutionError
} from '../../specs/001-create-and-or/contracts/e2e-testing';

/**
 * Extended testing types
 */

export interface TestEnvironment {
	name: string;
	baseUrl: string;
	apiEndpoints: ApiEndpointConfig[];
	browserConfig: BrowserConfig;
	timeouts: TimeoutConfig;
	credentials: TestCredentials;
}

export interface ApiEndpointConfig {
	name: string;
	url: string;
	headers?: Record<string, string>;
	auth?: AuthConfig;
	rateLimit?: RateLimitConfig;
}

export interface AuthConfig {
	type: 'bearer' | 'basic' | 'api-key';
	token?: string;
	username?: string;
	password?: string;
	apiKey?: string;
}

export interface RateLimitConfig {
	requestsPerMinute: number;
	burstLimit: number;
	backoffStrategy: 'linear' | 'exponential';
}

export interface BrowserConfig {
	headless: boolean;
	viewport: { width: number; height: number };
	userAgent?: string;
	locale?: string;
	timezone?: string;
	recordVideo: boolean;
	recordHar: boolean;
}

export interface TimeoutConfig {
	navigation: number;
	element: number;
	network: number;
	test: number;
	suite: number;
}

export interface TestCredentials {
	openaiApiKey?: string;
	claudeApiKey?: string;
	geminiApiKey?: string;
	testUserCredentials?: UserCredentials[];
}

export interface UserCredentials {
	username: string;
	password: string;
	role: string;
	permissions: string[];
}

/**
 * Test execution and reporting types
 */
export interface TestExecution {
	id: string;
	suiteId: string;
	testId: string;
	status: ExecutionStatus;
	startTime: Date;
	endTime?: Date;
	duration?: number;
	environment: string;
	browser: string;
	retryCount: number;
	artifacts: TestArtifact[];
	metadata: ExecutionMetadata;
}

export enum ExecutionStatus {
	PENDING = 'pending',
	RUNNING = 'running',
	PASSED = 'passed',
	FAILED = 'failed',
	SKIPPED = 'skipped',
	TIMEOUT = 'timeout',
	CANCELLED = 'cancelled'
}

export interface TestArtifact {
	type: ArtifactType;
	name: string;
	path: string;
	size: number;
	createdAt: Date;
}

export enum ArtifactType {
	SCREENSHOT = 'screenshot',
	VIDEO = 'video',
	HAR_FILE = 'har_file',
	TRACE = 'trace',
	LOG = 'log',
	REPORT = 'report'
}

export interface ExecutionMetadata {
	gitCommit?: string;
	branch?: string;
	buildNumber?: string;
	executedBy: string;
	tags: string[];
	customFields: Record<string, any>;
}

/**
 * Advanced test case types
 */
export interface AdvancedTestCase extends E2ETestCase {
	setup?: TestStep[];
	teardown?: TestStep[];
	preconditions: Precondition[];
	dataProviders: DataProvider[];
	parallelizable: boolean;
	priority: TestPriority;
	unstable: boolean;
	flaky: boolean;
	categories: TestCategory[];
}

export interface TestStep {
	name: string;
	action: StepAction;
	parameters: Record<string, any>;
	timeout?: number;
	retryable: boolean;
	optional: boolean;
}

export enum StepAction {
	NAVIGATE = 'navigate',
	CLICK = 'click',
	TYPE = 'type',
	WAIT = 'wait',
	ASSERT = 'assert',
	SCREENSHOT = 'screenshot',
	CUSTOM = 'custom'
}

export interface Precondition {
	type: PreconditionType;
	description: string;
	validator: (context: TestContext) => Promise<boolean>;
}

export enum PreconditionType {
	ENVIRONMENT = 'environment',
	DATA = 'data',
	SERVICE = 'service',
	AUTHENTICATION = 'authentication',
	FEATURE_FLAG = 'feature_flag'
}

export interface DataProvider {
	name: string;
	type: DataProviderType;
	source: string;
	parameters: Record<string, any>;
}

export enum DataProviderType {
	JSON_FILE = 'json_file',
	CSV_FILE = 'csv_file',
	API_ENDPOINT = 'api_endpoint',
	DATABASE = 'database',
	GENERATOR = 'generator'
}

export enum TestPriority {
	CRITICAL = 'critical',
	HIGH = 'high',
	MEDIUM = 'medium',
	LOW = 'low'
}

export enum TestCategory {
	SMOKE = 'smoke',
	REGRESSION = 'regression',
	INTEGRATION = 'integration',
	PERFORMANCE = 'performance',
	SECURITY = 'security',
	ACCESSIBILITY = 'accessibility'
}

/**
 * Test context and state management
 */
export interface TestContext {
	executionId: string;
	testCase: AdvancedTestCase;
	environment: TestEnvironment;
	session: TestSession;
	variables: Map<string, any>;
	artifacts: TestArtifact[];
	startTime: Date;
}

export interface TestSession {
	id: string;
	userId?: string;
	browser: string;
	viewport: { width: number; height: number };
	cookies: Cookie[];
	localStorage: Record<string, string>;
	sessionStorage: Record<string, string>;
}

export interface Cookie {
	name: string;
	value: string;
	domain: string;
	path: string;
	expires?: Date;
	httpOnly: boolean;
	secure: boolean;
}

/**
 * LLM integration types
 */
export interface LLMTestConfig {
	providers: LLMProvider[];
	defaultProvider: string;
	timeouts: LLMTimeoutConfig;
	retryPolicy: LLMRetryPolicy;
	validation: LLMValidationConfig;
}

export interface LLMTimeoutConfig {
	connection: number;
	response: number;
	totalRequest: number;
}

export interface LLMRetryPolicy {
	maxAttempts: number;
	backoffMultiplier: number;
	initialDelay: number;
	maxDelay: number;
	retryableErrors: string[];
}

export interface LLMValidationConfig {
	validateResponse: boolean;
	requireArtifacts: boolean;
	maxResponseLength: number;
	allowedLanguages: string[];
	securityCheck: boolean;
}

export interface LLMTestResult {
	provider: string;
	model: string;
	prompt: string;
	response: string;
	responseTime: number;
	tokensUsed?: number;
	cost?: number;
	artifactsFound: number;
	validationPassed: boolean;
	errors: LLMError[];
}

export interface LLMError {
	type: LLMErrorType;
	code?: string;
	message: string;
	details?: Record<string, any>;
}

export enum LLMErrorType {
	AUTHENTICATION = 'authentication',
	RATE_LIMIT = 'rate_limit',
	QUOTA_EXCEEDED = 'quota_exceeded',
	MODEL_UNAVAILABLE = 'model_unavailable',
	INVALID_REQUEST = 'invalid_request',
	TIMEOUT = 'timeout',
	NETWORK = 'network',
	PARSING = 'parsing'
}

/**
 * Reporting and analytics types
 */
export interface TestReport {
	id: string;
	name: string;
	createdAt: Date;
	summary: TestReportSummary;
	suiteResults: E2ETestSuiteResult[];
	trends: TestTrends;
	insights: TestInsights;
	recommendations: string[];
}

export interface TestReportSummary {
	totalTests: number;
	passedTests: number;
	failedTests: number;
	skippedTests: number;
	executionTime: number;
	successRate: number;
	averageTestTime: number;
	flakiness: FlakinessReport;
}

export interface FlakinessReport {
	flakyTests: string[];
	stabilityScore: number;
	improvedTests: string[];
	regressionTests: string[];
}

export interface TestTrends {
	successRateTrend: TrendData[];
	executionTimeTrend: TrendData[];
	flakinessTrend: TrendData[];
	errorTypeTrend: Record<TestErrorType, TrendData[]>;
}

export interface TrendData {
	timestamp: Date;
	value: number;
	change?: number;
}

export interface TestInsights {
	slowestTests: TestPerformanceInsight[];
	mostFailedTests: TestFailureInsight[];
	errorPatterns: ErrorPattern[];
	performanceRegression: PerformanceRegression[];
}

export interface TestPerformanceInsight {
	testId: string;
	averageTime: number;
	percentile95: number;
	trend: 'improving' | 'degrading' | 'stable';
}

export interface TestFailureInsight {
	testId: string;
	failureCount: number;
	failureRate: number;
	commonErrors: string[];
}

export interface ErrorPattern {
	pattern: string;
	frequency: number;
	affectedTests: string[];
	suggestedFix?: string;
}

export interface PerformanceRegression {
	testId: string;
	currentTime: number;
	baselineTime: number;
	regression: number; // percentage
	severity: 'minor' | 'major' | 'critical';
}

/**
 * Service and factory interfaces
 */
export interface E2ETestFramework {
	runner: IE2ETestRunner;
	scheduler: TestScheduler;
	reporter: TestReporter;
	analytics: TestAnalytics;
}

export interface TestScheduler {
	schedule(suite: E2ETestSuite, when: Date): string;
	scheduleRecurring(suite: E2ETestSuite, cron: string): string;
	cancel(scheduleId: string): boolean;
	getSchedules(): ScheduledTest[];
}

export interface ScheduledTest {
	id: string;
	suiteId: string;
	nextRun: Date;
	lastRun?: Date;
	status: ScheduleStatus;
	cron?: string;
}

export enum ScheduleStatus {
	ACTIVE = 'active',
	PAUSED = 'paused',
	DISABLED = 'disabled',
	EXPIRED = 'expired'
}

export interface TestReporter {
	generateReport(results: E2ETestSuiteResult[]): TestReport;
	exportReport(report: TestReport, format: ReportFormat): string;
	publishReport(report: TestReport, destination: string): Promise<void>;
}

export enum ReportFormat {
	HTML = 'html',
	PDF = 'pdf',
	JSON = 'json',
	XML = 'xml',
	JUNIT = 'junit'
}

export interface TestAnalytics {
	analyzeTrends(results: E2ETestSuiteResult[]): TestTrends;
	detectFlakiness(results: E2ETestSuiteResult[]): FlakinessReport;
	generateInsights(results: E2ETestSuiteResult[]): TestInsights;
	predictFailures(testId: string): FailurePrediction;
}

export interface FailurePrediction {
	testId: string;
	failureProbability: number;
	riskFactors: string[];
	confidence: number;
	recommendedActions: string[];
}

/**
 * Default configurations
 */
export const DEFAULT_TEST_ENVIRONMENT: TestEnvironment = {
	name: 'development',
	baseUrl: 'http://localhost:8080',
	apiEndpoints: [],
	browserConfig: {
		headless: true,
		viewport: { width: 1280, height: 720 },
		recordVideo: false,
		recordHar: false
	},
	timeouts: {
		navigation: 30000,
		element: 10000,
		network: 30000,
		test: 60000,
		suite: 300000
	},
	credentials: {}
};

export const DEFAULT_LLM_CONFIG: LLMTestConfig = {
	providers: [],
	defaultProvider: 'openai',
	timeouts: {
		connection: 10000,
		response: 30000,
		totalRequest: 60000
	},
	retryPolicy: {
		maxAttempts: 3,
		backoffMultiplier: 2,
		initialDelay: 1000,
		maxDelay: 10000,
		retryableErrors: ['timeout', 'network', 'rate_limit']
	},
	validation: {
		validateResponse: true,
		requireArtifacts: false,
		maxResponseLength: 100000,
		allowedLanguages: ['javascript', 'typescript', 'html', 'css'],
		securityCheck: true
	}
};