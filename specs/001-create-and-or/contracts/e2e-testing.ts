/**
 * E2E Testing Service Contract
 * Defines interfaces for end-to-end testing with real LLM endpoints
 */

export interface E2ETestRequest {
  testId: string;
  prompt: string;
  expectedArtifactCount?: number;
  timeout?: number;
  llmProvider: LLMProvider;
}

export interface E2ETestResponse {
  success: boolean;
  testId: string;
  executionTimeMs: number;
  promptSent: string;
  llmResponse: string;
  artifactsDetected: number;
  renderingResults: RenderingResult[];
  errors: TestError[];
}

export interface RenderingResult {
  artifactId: string;
  renderSuccess: boolean;
  renderTimeMs: number;
  errorMessage?: string;
}

export interface TestError {
  stage: TestStage;
  type: TestErrorType;
  message: string;
  timestamp: Date;
}

export interface LLMProvider {
  name: 'openai' | 'claude' | 'gemini';
  apiKey: string;
  endpoint: string;
  model: string;
}

export enum TestStage {
  INTENT_CLASSIFICATION = 'intent_classification',
  PROMPT_ENHANCEMENT = 'prompt_enhancement',
  LLM_REQUEST = 'llm_request',
  ARTIFACT_PARSING = 'artifact_parsing',
  PREVIEW_RENDERING = 'preview_rendering'
}

export enum TestErrorType {
  TIMEOUT = 'timeout',
  API_ERROR = 'api_error',
  PARSING_ERROR = 'parsing_error',
  RENDERING_ERROR = 'rendering_error',
  ASSERTION_FAILED = 'assertion_failed'
}

/**
 * Test suite configuration
 */
export interface E2ETestSuite {
  name: string;
  tests: E2ETestCase[];
  timeout: number;
  retryCount: number;
  parallel: boolean;
}

export interface E2ETestCase {
  id: string;
  name: string;
  description: string;
  prompt: string;
  expectedArtifacts: number;
  assertions: TestAssertion[];
  tags: string[];
}

export interface TestAssertion {
  type: AssertionType;
  target: string;
  expected: any;
  timeout?: number;
}

export enum AssertionType {
  ARTIFACT_COUNT = 'artifact_count',
  ARTIFACT_TYPE = 'artifact_type',
  RENDER_SUCCESS = 'render_success',
  RESPONSE_TIME = 'response_time',
  ERROR_COUNT = 'error_count'
}

/**
 * Service interface for E2E testing
 */
export interface IE2ETestRunner {
  /**
   * Execute a single E2E test
   * @param request - Test execution request
   * @returns Promise resolving to test results
   */
  runTest(request: E2ETestRequest): Promise<E2ETestResponse>;

  /**
   * Execute a complete test suite
   * @param suite - Test suite to execute
   * @returns Promise resolving to suite results
   */
  runSuite(suite: E2ETestSuite): Promise<E2ETestSuiteResult>;

  /**
   * Validate LLM provider configuration
   * @param provider - Provider configuration to validate
   * @returns Whether provider is valid and accessible
   */
  validateProvider(provider: LLMProvider): Promise<boolean>;

  /**
   * Generate test report from results
   * @param results - Test results to format
   * @returns Formatted test report
   */
  generateReport(results: E2ETestSuiteResult): string;
}

export interface E2ETestSuiteResult {
  suiteName: string;
  executionTimeMs: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  testResults: E2ETestResponse[];
  summary: TestSummary;
}

export interface TestSummary {
  overallSuccess: boolean;
  errorBreakdown: Record<TestErrorType, number>;
  performanceMetrics: PerformanceMetrics;
  retryLoopDetected: boolean;
}

export interface PerformanceMetrics {
  avgResponseTime: number;
  avgRenderTime: number;
  slowestTest: string;
  fastestTest: string;
}

/**
 * Predefined test cases for common scenarios
 */
export const STANDARD_TEST_CASES: E2ETestCase[] = [
  {
    id: 'basic-react-component',
    name: 'Basic React Component Generation',
    description: 'Test artifact generation for simple React component',
    prompt: 'Create a React component artifact for a login form',
    expectedArtifacts: 1,
    assertions: [
      { type: AssertionType.ARTIFACT_COUNT, target: 'response', expected: 1 },
      { type: AssertionType.ARTIFACT_TYPE, target: 'artifact[0]', expected: 'react' },
      { type: AssertionType.RENDER_SUCCESS, target: 'preview', expected: true }
    ],
    tags: ['react', 'component', 'basic']
  },
  {
    id: 'tsx-code-block-fallback',
    name: 'TSX Code Block Fallback',
    description: 'Test preview generation from TSX code blocks without formal artifact wrapper',
    prompt: 'Show me a TSX component for displaying user profiles',
    expectedArtifacts: 1,
    assertions: [
      { type: AssertionType.ARTIFACT_COUNT, target: 'response', expected: 1 },
      { type: AssertionType.RENDER_SUCCESS, target: 'preview', expected: true }
    ],
    tags: ['tsx', 'fallback', 'code-block']
  },
  {
    id: 'retry-loop-prevention',
    name: 'Retry Loop Prevention',
    description: 'Test that infinite loading states are prevented',
    prompt: 'Create an artifact preview component that might fail to load',
    expectedArtifacts: 1,
    assertions: [
      { type: AssertionType.RESPONSE_TIME, target: 'render', expected: 35000 }, // Max 35s
      { type: AssertionType.ERROR_COUNT, target: 'retryLoop', expected: 0 }
    ],
    tags: ['retry', 'timeout', 'error-handling']
  }
];

/**
 * Custom error for test execution failures
 */
export class E2ETestExecutionError extends Error {
  constructor(testId: string, stage: TestStage, cause: Error) {
    super(`E2E test ${testId} failed at stage ${stage}: ${cause.message}`);
    this.name = 'E2ETestExecutionError';
  }
}