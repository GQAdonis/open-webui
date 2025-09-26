/**
 * Intent Classifier Types
 * Type definitions for intent classification and prompt analysis
 */

// Core contract types - copied from specs to ensure Docker build compatibility
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

/**
 * Extended types for internal implementation
 */

export interface IntentAnalysisContext {
	sessionId?: string;
	userId?: string;
	previousPrompts: string[];
	conversationContext: ConversationContext;
}

export interface ConversationContext {
	hasArtifacts: boolean;
	lastArtifactType?: string;
	artifactCount: number;
	recentKeywords: string[];
}

export interface ClassificationResult {
	intent: UserIntent;
	confidence: number;
	metadata: ClassificationMetadata;
}

export interface ClassificationMetadata {
	detectedPatterns: string[];
	contextSignals: ContextSignal[];
	processingSteps: string[];
	debugInfo?: Record<string, any>;
}

export interface ContextSignal {
	type: 'keyword' | 'pattern' | 'context' | 'history';
	value: string;
	weight: number;
	source: string;
}

export enum UserIntent {
	CREATE_ARTIFACT = 'create_artifact',
	MODIFY_ARTIFACT = 'modify_artifact',
	PREVIEW_ARTIFACT = 'preview_artifact',
	GENERAL_QUESTION = 'general_question',
	CODE_HELP = 'code_help',
	UNCLEAR = 'unclear'
}

export enum ConfidenceLevel {
	VERY_LOW = 'very_low',    // 0.0 - 0.2
	LOW = 'low',              // 0.2 - 0.4
	MEDIUM = 'medium',        // 0.4 - 0.6
	HIGH = 'high',            // 0.6 - 0.8
	VERY_HIGH = 'very_high'   // 0.8 - 1.0
}

export interface KeywordConfig {
	primary: string[];     // High confidence keywords
	secondary: string[];   // Medium confidence keywords
	contextual: string[];  // Context-dependent keywords
	negative: string[];    // Keywords that reduce confidence
}

export interface IntentClassifierMetrics {
	totalClassifications: number;
	averageProcessingTime: number;
	accuracyRate: number;
	timeoutCount: number;
	confidenceDistribution: Record<ConfidenceLevel, number>;
}

export interface ClassificationHistory {
	timestamp: Date;
	prompt: string;
	result: ClassificationResult;
	processingTime: number;
	wasCorrect?: boolean; // Feedback from user or system
}

/**
 * Enhanced configuration with advanced options
 */
export interface ExtendedIntentConfig extends IntentClassifierConfig {
	keywordConfig: KeywordConfig;
	enableContextAnalysis: boolean;
	enableLearning: boolean;
	maxHistorySize: number;
	debugMode: boolean;
}

/**
 * Events emitted by the intent classifier
 */
export interface IntentClassifierEvents {
	'classification_complete': {
		request: IntentClassificationRequest;
		response: IntentClassificationResponse;
		processingTime: number;
	};
	'classification_timeout': {
		request: IntentClassificationRequest;
		timeoutMs: number;
	};
	'config_updated': {
		oldConfig: IntentClassifierConfig;
		newConfig: IntentClassifierConfig;
	};
	'error': {
		error: Error;
		request: IntentClassificationRequest;
	};
}

/**
 * Factory function return type
 */
export interface IntentClassifierFactory {
	create(config?: Partial<ExtendedIntentConfig>): IIntentClassifier;
	createWithHistory(history: ClassificationHistory[]): IIntentClassifier;
	getMetrics(): IntentClassifierMetrics;
}

/**
 * Utility type for classification pipeline steps
 */
export type ClassificationStep =
	| 'tokenize'
	| 'normalize'
	| 'extract_keywords'
	| 'analyze_context'
	| 'calculate_confidence'
	| 'apply_rules'
	| 'generate_response';

export interface PipelineStepResult {
	step: ClassificationStep;
	duration: number;
	data: any;
	error?: string;
}

/**
 * Type guards for intent classification
 */
export function isIntentClassificationRequest(obj: any): obj is IntentClassificationRequest {
	return obj &&
		typeof obj.prompt === 'string' &&
		obj.timestamp instanceof Date;
}

export function isIntentClassificationResponse(obj: any): obj is IntentClassificationResponse {
	return obj &&
		typeof obj.shouldEnhance === 'boolean' &&
		typeof obj.confidence === 'number' &&
		Array.isArray(obj.detectedKeywords) &&
		typeof obj.processingTimeMs === 'number';
}

/**
 * Default keyword configuration
 */
export const DEFAULT_KEYWORD_CONFIG: KeywordConfig = {
	primary: ['artifact', 'preview', 'create', 'generate'],
	secondary: ['component', 'render', 'build', 'make'],
	contextual: ['show', 'display', 'demo', 'example'],
	negative: ['don\'t', 'not', 'without', 'skip']
};

/**
 * Default extended configuration
 */
export const DEFAULT_EXTENDED_CONFIG: ExtendedIntentConfig = {
	...DEFAULT_INTENT_CONFIG,
	keywordConfig: DEFAULT_KEYWORD_CONFIG,
	enableContextAnalysis: true,
	enableLearning: false,
	maxHistorySize: 100,
	debugMode: false
};