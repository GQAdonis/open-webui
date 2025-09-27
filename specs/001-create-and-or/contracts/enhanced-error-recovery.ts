/**
 * Contract: Enhanced Error Recovery UI Component
 *
 * Two-stage recovery process (Auto-resolution → AI Fix) with
 * progress indicators and detailed result feedback.
 */

// Types
export interface EnhancedErrorRecovery {
  artifactId: string;
  currentStage: RecoveryStage;
  autoResolutionResult?: ResolutionResult;
  llmFixResult?: LLMFixResult;
  isProcessing: boolean;
  userCanReset: boolean;
}

export interface LLMFixService {
  apiEndpoint: string;
  apiKey: string;
  currentRequest?: FixRequest;
  retryCount: number;
  maxRetries: number;
  confidenceThreshold: number;
}

export interface FixRequest {
  errorType: string;
  failingCode: string;
  errorMessage: string;
  context: string;
  timestamp: Date;
}

export interface LLMFixResult {
  success: boolean;
  fixedCode: string;
  confidence: number; // 0-1
  explanation: string;
  validationErrors: string[];
  processingTimeMs: number;
}

export interface CircuitBreaker {
  artifactId: string;
  state: CircuitState;
  failureCount: number;
  failureThreshold: number;
  lastFailureTime: Date;
  resetTimeoutMs: number;
}

export enum RecoveryStage {
  HIDDEN = 'hidden',
  AUTO_RESOLUTION = 'auto_resolution',
  LLM_FIXING = 'llm_fixing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

// Component API Contract
export interface EnhancedErrorRecoveryAPI {
  /**
   * Initialize error recovery component for specific artifact
   * @param artifactId - ID of the failing artifact
   * @param errorMessage - Original error message
   * @param messageContent - Full message content for context
   */
  initialize(
    artifactId: string,
    errorMessage: string,
    messageContent: string
  ): void;

  /**
   * Start automatic dependency resolution (Stage 1)
   * @returns Promise resolving to auto-resolution result
   */
  startAutoResolution(): Promise<ResolutionResult>;

  /**
   * Start LLM-powered code fixing (Stage 2)
   * @param autoResolutionResult - Result from Stage 1 (if any)
   * @returns Promise resolving to LLM fix result
   */
  startLLMFix(autoResolutionResult?: ResolutionResult): Promise<LLMFixResult>;

  /**
   * Reset recovery state to allow user retry
   */
  resetRecoveryState(): void;

  /**
   * Check if error recovery should be shown for error type
   * @param errorMessage - Error message to analyze
   * @returns Whether recovery UI should be displayed
   */
  shouldShowRecovery(errorMessage: string): boolean;

  /**
   * Update progress indicator for current stage
   * @param stage - Current recovery stage
   * @param progress - Progress percentage (0-100)
   */
  updateProgress(stage: RecoveryStage, progress: number): void;

  /**
   * Display results of recovery attempt
   * @param result - Recovery result with details
   * @param strategyInfo - Information about strategies used
   */
  displayResults(
    result: ResolutionResult | LLMFixResult,
    strategyInfo: string[]
  ): void;
}

// LLM Fix Service API Contract
export interface LLMFixServiceAPI {
  /**
   * Generate context-aware prompt for code fixing
   * @param errorType - Type of error encountered
   * @param failingCode - Code that failed to render
   * @param errorMessage - Original error message
   * @param context - Additional context from message
   * @returns Generated prompt for LLM
   */
  generateFixPrompt(
    errorType: string,
    failingCode: string,
    errorMessage: string,
    context: string
  ): string;

  /**
   * Send fix request to LLM API
   * @param request - Fix request with code and context
   * @returns Promise resolving to LLM response
   */
  sendFixRequest(request: FixRequest): Promise<string>;

  /**
   * Validate fixed code for basic syntax correctness
   * @param fixedCode - Code returned by LLM
   * @param originalLanguage - Programming language of code
   * @returns Validation result with any syntax errors
   */
  validateFixedCode(
    fixedCode: string,
    originalLanguage: string
  ): {
    isValid: boolean;
    syntaxErrors: string[];
  };

  /**
   * Calculate confidence score for fix quality
   * @param fixedCode - Code returned by LLM
   * @param originalCode - Original failing code
   * @param errorMessage - Original error message
   * @returns Confidence score (0-1)
   */
  calculateConfidenceScore(
    fixedCode: string,
    originalCode: string,
    errorMessage: string
  ): number;

  /**
   * Handle API failures gracefully
   * @param error - API error details
   * @returns User-friendly error message
   */
  handleAPIFailure(error: any): string;
}

// Circuit Breaker API Contract
export interface CircuitBreakerAPI {
  /**
   * Record successful recovery attempt
   * @param artifactId - ID of recovered artifact
   */
  recordSuccess(artifactId: string): void;

  /**
   * Record failed recovery attempt
   * @param artifactId - ID of failed artifact
   * @param errorMessage - Failure details
   */
  recordFailure(artifactId: string, errorMessage: string): void;

  /**
   * Check if circuit breaker allows recovery attempt
   * @param artifactId - ID of artifact to check
   * @returns Whether recovery should be attempted
   */
  allowRecoveryAttempt(artifactId: string): boolean;

  /**
   * Get current circuit breaker state
   * @param artifactId - ID of artifact to check
   * @returns Current circuit state
   */
  getCircuitState(artifactId: string): CircuitState;

  /**
   * Reset circuit breaker for artifact
   * @param artifactId - ID of artifact to reset
   */
  resetCircuit(artifactId: string): void;
}

// UI State Management Contract
export interface ErrorRecoveryUIState {
  // Stage 1: Auto-resolution
  autoResolutionButtonState: ButtonState;
  autoResolutionProgress: number;
  autoResolutionResults?: {
    strategiesAttempted: string[];
    successful: boolean;
    errorDetails?: string;
  };

  // Stage 2: LLM fixing
  llmFixButtonState: ButtonState;
  llmFixProgress: number;
  llmFixResults?: {
    confidence: number;
    explanation: string;
    successful: boolean;
    errorDetails?: string;
  };

  // Overall state
  currentStage: RecoveryStage;
  showResultDetails: boolean;
  userCanReset: boolean;
  errorMessage: string;
}

export interface ButtonState {
  text: string;
  disabled: boolean;
  loading: boolean;
  variant: 'primary' | 'secondary' | 'success' | 'danger';
}

// Test Contract Requirements
export interface ErrorRecoveryTests {
  /**
   * Test conditional display for appropriate error conditions
   * Expected: Component shows only for bundling/dependency errors
   */
  testConditionalDisplay(): void;

  /**
   * Test two-stage process progression
   * Expected: Auto-resolution → AI Fix stages work correctly
   */
  testTwoStageProgression(): void;

  /**
   * Test progress indicators
   * Expected: Progress bars accurately reflect current stage
   */
  testProgressIndicators(): void;

  /**
   * Test button state management
   * Expected: Buttons show correct states (processing, success, failed)
   */
  testButtonStateManagement(): void;

  /**
   * Test result display with strategy information
   * Expected: Results show meaningful information about attempts
   */
  testResultDisplay(): void;

  /**
   * Test reset functionality
   * Expected: Reset clears state and allows retry
   */
  testResetFunctionality(): void;

  /**
   * Test LLM API failure handling
   * Expected: Graceful handling with meaningful error messages
   */
  testLLMAPIFailureHandling(): void;

  /**
   * Test circuit breaker integration
   * Expected: Prevents infinite retry loops
   */
  testCircuitBreakerIntegration(): void;
}

// Error Recovery Validation Test Cases
export const ERROR_RECOVERY_TEST_CASES = {
  CSS_MODULE_ERROR: {
    errorMessage: "Cannot resolve module './Button.module.css'",
    shouldShowRecovery: true,
    expectedStage: RecoveryStage.AUTO_RESOLUTION,
    expectAutoResolutionSuccess: true
  },

  IMPORT_ERROR: {
    errorMessage: "Module not found: Can't resolve './utils'",
    shouldShowRecovery: true,
    expectedStage: RecoveryStage.AUTO_RESOLUTION,
    expectAutoResolutionSuccess: false,
    expectLLMFixAttempt: true
  },

  SYNTAX_ERROR: {
    errorMessage: "Unexpected token '}' at line 10",
    shouldShowRecovery: false,
    reason: "Syntax errors not recoverable by dependency resolution"
  },

  BUNDLING_ERROR: {
    errorMessage: "Failed to resolve dependencies for bundling",
    shouldShowRecovery: true,
    expectedStage: RecoveryStage.AUTO_RESOLUTION,
    expectAutoResolutionSuccess: true
  },

  NETWORK_ERROR: {
    errorMessage: "Network error loading Sandpack",
    shouldShowRecovery: false,
    reason: "Network errors require different recovery approach"
  }
} as const;

// Component Props Contract
export interface EnhancedErrorRecoveryProps {
  artifactId: string;
  errorMessage: string;
  messageContent: string;
  onRecoverySuccess: (fixedCode: string) => void;
  onRecoveryFailure: (error: string) => void;
  onReset: () => void;
}

// Component Events Contract
export interface ErrorRecoveryEvents {
  'recovery:started': { stage: RecoveryStage; artifactId: string };
  'recovery:progress': { stage: RecoveryStage; progress: number };
  'recovery:completed': { stage: RecoveryStage; success: boolean; result: any };
  'recovery:failed': { stage: RecoveryStage; error: string };
  'recovery:reset': { artifactId: string };
  'circuit:opened': { artifactId: string; reason: string };
  'circuit:closed': { artifactId: string };
}