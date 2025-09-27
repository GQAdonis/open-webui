/**
 * Intent Classifier for Artifact Error Detection
 * Analyzes error messages and artifact code to classify error types
 * and determine appropriate resolution strategies.
 */

export type ErrorType =
  | 'CSS_MODULE_ERROR'
  | 'IMPORT_ERROR'
  | 'BUNDLING_ERROR'
  | 'SYNTAX_ERROR'
  | 'DEPENDENCY_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export type ResolutionStrategy =
  | 'CSS_MODULE_CONVERSION'
  | 'DIRECT_CSS_INJECTION'
  | 'JSON_DATA_INLINING'
  | 'IMPORT_REMOVAL'
  | 'LLM_FIX'
  | undefined;

export interface ErrorClassification {
  errorType: ErrorType;
  confidence: number;
  canResolve: boolean;
  suggestedStrategy?: ResolutionStrategy;
  reasoning?: string;
}

export interface CodeBlock {
  type: string;
  content: string;
  language: string;
}

export interface ArtifactContext {
  availableBlocks: CodeBlock[];
  hasRelevantCSS: boolean;
  hasImportStatements: boolean;
  hasRelevantJSON: boolean;
  targetArtifactName: string;
}

export interface IntentClassifierConfig {
  confidenceThreshold: number;
  supportedErrorTypes: ErrorType[];
}

export interface IntentClassifierAPI {
  classifyError(errorMessage: string, artifactCode: string): ErrorClassification;
  analyzeArtifactContext(messageContent: string, artifactName: string): ArtifactContext;
  calculateResolutionConfidence(classification: ErrorClassification, context: ArtifactContext): number;
  shouldShowRecoveryUI(classification: ErrorClassification): boolean;
}

/**
 * Intent Classifier Implementation
 */
export class IntentClassifier implements IntentClassifierAPI {
  private config: IntentClassifierConfig;
  private errorPatterns: Map<ErrorType, RegExp[]> = new Map();
  private strategyMapping: Map<ErrorType, ResolutionStrategy> = new Map();

  constructor(config: IntentClassifierConfig) {
    this.config = config;
    this.initializePatterns();
    this.initializeStrategyMapping();
  }

  /**
   * Classify error message and code to determine error type and resolution strategy
   */
  classifyError(errorMessage: string, artifactCode: string): ErrorClassification {
    const errorLower = errorMessage.toLowerCase();
    const codeLower = artifactCode.toLowerCase();

    // Define priority order for error types (most specific first)
    const priorityOrder: ErrorType[] = [
      'CSS_MODULE_ERROR',
      'BUNDLING_ERROR',
      'SYNTAX_ERROR',
      'NETWORK_ERROR',
      'DEPENDENCY_ERROR',
      'IMPORT_ERROR' // Most general, check last
    ];

    // Check each error type against patterns in priority order
    for (const errorType of priorityOrder) {
      const patterns = this.errorPatterns.get(errorType);
      if (!patterns) continue;

      for (const pattern of patterns) {
        if (pattern.test(errorMessage) || pattern.test(artifactCode)) {
          const confidence = this.calculateErrorConfidence(errorType, errorMessage, artifactCode);
          const canResolve = this.isResolvable(errorType);
          const suggestedStrategy = canResolve ? this.strategyMapping.get(errorType) : undefined;

          return {
            errorType,
            confidence,
            canResolve,
            suggestedStrategy,
            reasoning: this.getReasoningForClassification(errorType, errorMessage)
          };
        }
      }
    }

    // Default to unknown error
    return {
      errorType: 'UNKNOWN_ERROR',
      confidence: 0.1,
      canResolve: false,
      reasoning: 'Error type not recognized by classifier'
    };
  }

  /**
   * Analyze message content to extract artifact context
   */
  analyzeArtifactContext(messageContent: string, artifactName: string): ArtifactContext {
    const availableBlocks = this.extractCodeBlocks(messageContent);

    return {
      availableBlocks,
      hasRelevantCSS: availableBlocks.some(block =>
        block.type === 'css' || block.type === 'scss' || block.type === 'sass'
      ),
      hasImportStatements: messageContent.includes('import ') || availableBlocks.some(block =>
        block.content.includes('import ')
      ),
      hasRelevantJSON: availableBlocks.some(block => block.type === 'json'),
      targetArtifactName: artifactName
    };
  }

  /**
   * Calculate confidence for resolution based on error classification and context
   */
  calculateResolutionConfidence(classification: ErrorClassification, context: ArtifactContext): number {
    if (!classification.canResolve) {
      return 0;
    }

    let confidence = classification.confidence;

    // Adjust confidence based on available resources
    switch (classification.errorType) {
      case 'CSS_MODULE_ERROR':
        if (context.hasRelevantCSS) {
          confidence += 0.2;
        } else {
          confidence -= 0.4;
        }
        break;

      case 'IMPORT_ERROR':
        if (classification.suggestedStrategy === 'JSON_DATA_INLINING' && context.hasRelevantJSON) {
          confidence += 0.15;
        } else if (classification.suggestedStrategy === 'JSON_DATA_INLINING' && !context.hasRelevantJSON) {
          confidence -= 0.3;
        }
        break;

      case 'BUNDLING_ERROR':
        // Bundling errors can usually be resolved by import removal
        confidence += 0.1;
        break;

      case 'DEPENDENCY_ERROR':
        // Depends on what's available in context
        if (context.availableBlocks.length > 1) {
          confidence += 0.1;
        }
        break;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Determine if recovery UI should be shown based on classification
   */
  shouldShowRecoveryUI(classification: ErrorClassification): boolean {
    return (
      classification.canResolve &&
      classification.confidence >= this.config.confidenceThreshold
    );
  }

  /**
   * Initialize error detection patterns
   */
  private initializePatterns(): void {
    this.errorPatterns.set('CSS_MODULE_ERROR', [
      /cannot resolve module.*\.module\.css/i,
      /module not found.*\.module\.css/i,
      /failed to resolve.*\.module\.css/i,
      /\.module\.css.*not found/i
    ]);

    this.errorPatterns.set('IMPORT_ERROR', [
      /cannot resolve module/i,
      /module not found/i,
      /failed to resolve/i,
      /import.*from.*not found/i,
      /can't resolve.*\.json/i
    ]);

    this.errorPatterns.set('BUNDLING_ERROR', [
      /failed to resolve dependencies for bundling/i,
      /bundling.*error/i,
      /dependency resolution failed/i,
      /circular dependency/i
    ]);

    this.errorPatterns.set('SYNTAX_ERROR', [
      /syntax error/i,
      /unexpected token/i,
      /parse error/i,
      /invalid syntax/i,
      /malformed/i
    ]);

    this.errorPatterns.set('DEPENDENCY_ERROR', [
      /dependency.*not found/i,
      /missing dependency/i,
      /external dependency/i,
      /package.*not installed/i
    ]);

    this.errorPatterns.set('NETWORK_ERROR', [
      /network error/i,
      /fetch failed/i,
      /timeout/i,
      /connection/i,
      /loading.*sandpack/i
    ]);
  }

  /**
   * Initialize strategy mapping
   */
  private initializeStrategyMapping(): void {
    this.strategyMapping.set('CSS_MODULE_ERROR', 'CSS_MODULE_CONVERSION');
    this.strategyMapping.set('IMPORT_ERROR', 'JSON_DATA_INLINING'); // Will be refined based on import type
    this.strategyMapping.set('BUNDLING_ERROR', 'IMPORT_REMOVAL');
    this.strategyMapping.set('DEPENDENCY_ERROR', 'IMPORT_REMOVAL');
    // SYNTAX_ERROR and NETWORK_ERROR are not resolvable by our strategies
  }

  /**
   * Check if an error type is resolvable by our strategies
   */
  private isResolvable(errorType: ErrorType): boolean {
    return [
      'CSS_MODULE_ERROR',
      'IMPORT_ERROR',
      'BUNDLING_ERROR',
      'DEPENDENCY_ERROR'
    ].includes(errorType);
  }

  /**
   * Calculate confidence score for a specific error type classification
   */
  private calculateErrorConfidence(errorType: ErrorType, errorMessage: string, artifactCode: string): number {
    let confidence = 0.5; // Base confidence

    const errorLower = errorMessage.toLowerCase();
    const codeLower = artifactCode.toLowerCase();

    switch (errorType) {
      case 'CSS_MODULE_ERROR':
        if (errorLower.includes('module.css')) confidence += 0.3;
        if (codeLower.includes('module.css')) confidence += 0.2;
        if (errorLower.includes('cannot resolve')) confidence += 0.1;
        break;

      case 'IMPORT_ERROR':
        if (errorLower.includes('import')) confidence += 0.2;
        if (errorLower.includes('cannot resolve')) confidence += 0.2;
        if (codeLower.includes('.json')) confidence += 0.15;
        if (errorLower.includes('.json')) confidence += 0.15;
        break;

      case 'BUNDLING_ERROR':
        if (errorLower.includes('bundling')) confidence += 0.3;
        if (errorLower.includes('dependencies')) confidence += 0.2;
        break;

      case 'SYNTAX_ERROR':
        if (errorLower.includes('syntax')) confidence += 0.3;
        if (errorLower.includes('unexpected token')) confidence += 0.2;
        if (errorLower.includes('parse')) confidence += 0.2;
        break;

      case 'NETWORK_ERROR':
        if (errorLower.includes('network')) confidence += 0.4;
        if (errorLower.includes('fetch')) confidence += 0.2;
        if (errorLower.includes('timeout')) confidence += 0.2;
        break;

      default:
        confidence = 0.1;
    }

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * Get human-readable reasoning for classification
   */
  private getReasoningForClassification(errorType: ErrorType, errorMessage: string): string {
    switch (errorType) {
      case 'CSS_MODULE_ERROR':
        return 'Detected CSS module import that cannot be resolved';
      case 'IMPORT_ERROR':
        return 'Import statement references unavailable module';
      case 'BUNDLING_ERROR':
        return 'Bundling process failed due to dependency issues';
      case 'SYNTAX_ERROR':
        return 'Code contains syntax errors that prevent compilation';
      case 'NETWORK_ERROR':
        return 'Network-related error in sandbox environment';
      case 'DEPENDENCY_ERROR':
        return 'External dependency is not available';
      default:
        return 'Error type could not be classified';
    }
  }

  /**
   * Extract code blocks from message content
   */
  private extractCodeBlocks(messageContent: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(messageContent)) !== null) {
      const language = match[1] || 'text';
      const content = match[2].trim();

      if (content.length > 0) {
        blocks.push({
          type: this.normalizeLanguageType(language),
          content,
          language
        });
      }
    }

    return blocks;
  }

  /**
   * Normalize language type for consistency
   */
  private normalizeLanguageType(language: string): string {
    const normalized = language.toLowerCase();
    if (['jsx', 'tsx'].includes(normalized)) return 'jsx';
    if (['css', 'scss', 'sass'].includes(normalized)) return 'css';
    if (['js', 'javascript'].includes(normalized)) return 'javascript';
    if (['ts', 'typescript'].includes(normalized)) return 'typescript';
    if (['json'].includes(normalized)) return 'json';
    return normalized;
  }

  /**
   * Refine import error strategy based on the specific import type
   */
  private refineImportStrategy(errorMessage: string, artifactCode: string): ResolutionStrategy {
    if (errorMessage.toLowerCase().includes('.json') || artifactCode.toLowerCase().includes('.json')) {
      return 'JSON_DATA_INLINING';
    }
    if (errorMessage.toLowerCase().includes('.css') || artifactCode.toLowerCase().includes('.css')) {
      return 'CSS_MODULE_CONVERSION';
    }
    return 'IMPORT_REMOVAL';
  }
}