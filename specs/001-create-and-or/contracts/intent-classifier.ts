/**
 * Intent Classifier Service Contract
 * Analyzes user prompts to determine when artifact enhancement is needed
 */

export interface IntentClassificationRequest {
  prompt: string;
  sessionId?: string;
  timestamp: Date;
}

export interface IntentClassificationResponse {
  shouldEnhance: boolean;
  confidence: number;
  detectedKeywords: string[];
  processingTimeMs: number;
  reasoning?: string; // Debug information
}

export interface IntentClassifierConfig {
  triggerKeywords: string[];
  confidenceThreshold: number;
  timeoutMs: number;
}

/**
 * Service interface for intent classification
 */
export interface IIntentClassifier {
  /**
   * Analyze a user prompt to determine if enhancement is needed
   * @param request - Prompt analysis request
   * @returns Promise resolving to classification result
   * @throws TimeoutError if processing exceeds 5 seconds
   */
  classifyIntent(request: IntentClassificationRequest): Promise<IntentClassificationResponse>;

  /**
   * Update classification configuration
   * @param config - New configuration settings
   */
  updateConfig(config: Partial<IntentClassifierConfig>): void;

  /**
   * Get current configuration
   * @returns Current classifier configuration
   */
  getConfig(): IntentClassifierConfig;
}

/**
 * Default configuration values
 */
export const DEFAULT_INTENT_CONFIG: IntentClassifierConfig = {
  triggerKeywords: ['artifact', 'preview', 'component', 'render'],
  confidenceThreshold: 0.8,
  timeoutMs: 5000
};

/**
 * Custom error for timeout scenarios
 */
export class IntentClassificationTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Intent classification timed out after ${timeoutMs}ms`);
    this.name = 'IntentClassificationTimeoutError';
  }
}