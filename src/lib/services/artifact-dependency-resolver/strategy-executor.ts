/**
 * Strategy Execution Coordinator
 * Orchestrates the complete recovery workflow by coordinating between
 * DependencyResolver, IntentClassifier, CircuitBreaker, and LLMFixService.
 */

import { DependencyResolver, type ResolutionResult } from './dependency-resolver';
import { IntentClassifier, type ErrorClassification, type ArtifactContext } from '../intent-classifier/intent-classifier';
import { CircuitBreaker, type CircuitState } from '../circuit-breaker/circuit-breaker';
import { LLMAutoFixService, type AutoFixResult } from '../llm-autofix-service/llm-fix-service';

export interface RecoveryRequest {
  artifactId: string;
  artifactCode: string;
  errorMessage: string;
  messageContent: string;
  language: string;
  attemptId?: string;
}

export interface RecoveryStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  result?: any;
  error?: string;
}

export interface RecoveryResult {
  success: boolean;
  finalCode?: string;
  strategy: string;
  confidence: number;
  stages: RecoveryStage[];
  processingTimeMs: number;
  circuitState: CircuitState;
  classification?: ErrorClassification;
  context?: ArtifactContext;
  errors: string[];
}

export interface StrategyExecutorConfig {
  enableCircuitBreaker: boolean;
  enableLLMFallback: boolean;
  maxProcessingTimeMs: number;
  confidenceThreshold: number;
}

/**
 * Main Strategy Execution Coordinator
 */
export class StrategyExecutor {
  private dependencyResolver: DependencyResolver;
  private intentClassifier: IntentClassifier;
  private circuitBreaker: CircuitBreaker;
  private llmService: LLMAutoFixService;
  private config: StrategyExecutorConfig;

  constructor(config?: Partial<StrategyExecutorConfig>) {
    this.config = {
      enableCircuitBreaker: true,
      enableLLMFallback: true,
      maxProcessingTimeMs: 30000, // 30 seconds
      confidenceThreshold: 0.7,
      ...config
    };

    this.dependencyResolver = new DependencyResolver();
    this.intentClassifier = new IntentClassifier({
      confidenceThreshold: this.config.confidenceThreshold,
      supportedErrorTypes: [
        'CSS_MODULE_ERROR',
        'IMPORT_ERROR',
        'BUNDLING_ERROR',
        'SYNTAX_ERROR',
        'DEPENDENCY_ERROR'
      ]
    });
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 60000
    });
    this.llmService = new LLMAutoFixService();
  }

  /**
   * Execute complete recovery workflow
   */
  async executeRecovery(request: RecoveryRequest): Promise<RecoveryResult> {
    const startTime = Date.now();
    const stages: RecoveryStage[] = [];

    console.log(`🚀 [Strategy Executor] Starting recovery for artifact: ${request.artifactId}`);

    try {
      // Stage 1: Circuit Breaker Check
      const circuitCheckStage = await this.executeCircuitBreakerCheck(request);
      stages.push(circuitCheckStage);

      if (circuitCheckStage.status === 'failed') {
        return {
          success: false,
          strategy: 'CIRCUIT_BREAKER_BLOCKED',
          confidence: 0,
          stages,
          processingTimeMs: Date.now() - startTime,
          circuitState: 'OPEN',
          errors: ['Circuit breaker is open - too many recent failures']
        };
      }

      // Stage 2: Intent Classification
      const classificationStage = await this.executeIntentClassification(request);
      stages.push(classificationStage);

      if (classificationStage.status === 'failed') {
        return {
          success: false,
          strategy: 'CLASSIFICATION_FAILED',
          confidence: 0,
          stages,
          processingTimeMs: Date.now() - startTime,
          circuitState: this.circuitBreaker.getCircuitState(request.artifactId),
          errors: ['Failed to classify error type']
        };
      }

      const classification = classificationStage.result as ErrorClassification;
      const context = this.intentClassifier.analyzeArtifactContext(request.messageContent, request.artifactId);

      // Stage 3: Auto-Resolution (Dependency Resolver)
      const autoResolutionStage = await this.executeAutoResolution(request, context);
      stages.push(autoResolutionStage);

      if (autoResolutionStage.status === 'completed') {
        const resolution = autoResolutionStage.result as ResolutionResult;
        this.circuitBreaker.recordSuccess(request.artifactId);

        return {
          success: true,
          finalCode: resolution.transformedCode,
          strategy: resolution.strategyUsed,
          confidence: resolution.confidence,
          stages,
          processingTimeMs: Date.now() - startTime,
          circuitState: this.circuitBreaker.getCircuitState(request.artifactId),
          classification,
          context,
          errors: []
        };
      }

      // Stage 4: LLM Fallback (if enabled and auto-resolution failed)
      if (this.config.enableLLMFallback) {
        const llmStage = await this.executeLLMFallback(request);
        stages.push(llmStage);

        if (llmStage.status === 'completed') {
          const llmResult = llmStage.result as AutoFixResult;
          this.circuitBreaker.recordSuccess(request.artifactId);

          return {
            success: true,
            finalCode: llmResult.fixedCode,
            strategy: `LLM_${llmResult.strategy}`,
            confidence: llmResult.confidence,
            stages,
            processingTimeMs: Date.now() - startTime,
            circuitState: this.circuitBreaker.getCircuitState(request.artifactId),
            classification,
            context,
            errors: []
          };
        }
      }

      // All strategies failed
      this.circuitBreaker.recordFailure(request.artifactId, 'All recovery strategies failed');

      return {
        success: false,
        strategy: 'ALL_STRATEGIES_FAILED',
        confidence: 0,
        stages,
        processingTimeMs: Date.now() - startTime,
        circuitState: this.circuitBreaker.getCircuitState(request.artifactId),
        classification,
        context,
        errors: ['All recovery strategies failed to resolve the issue']
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('🔥 [Strategy Executor] Fatal error:', errorMessage);

      this.circuitBreaker.recordFailure(request.artifactId, errorMessage);

      return {
        success: false,
        strategy: 'EXECUTION_ERROR',
        confidence: 0,
        stages,
        processingTimeMs: Date.now() - startTime,
        circuitState: this.circuitBreaker.getCircuitState(request.artifactId),
        errors: [errorMessage]
      };
    }
  }

  /**
   * Execute circuit breaker check stage
   */
  private async executeCircuitBreakerCheck(request: RecoveryRequest): Promise<RecoveryStage> {
    const stage: RecoveryStage = {
      name: 'Circuit Breaker Check',
      status: 'running',
      startTime: Date.now()
    };

    try {
      if (!this.config.enableCircuitBreaker) {
        stage.status = 'skipped';
        stage.endTime = Date.now();
        return stage;
      }

      const canAttempt = this.circuitBreaker.allowRecoveryAttempt(request.artifactId);

      if (canAttempt) {
        stage.status = 'completed';
        stage.result = { allowed: true };
      } else {
        stage.status = 'failed';
        stage.error = 'Circuit breaker is open';
      }

      stage.endTime = Date.now();
      return stage;

    } catch (error) {
      stage.status = 'failed';
      stage.error = error instanceof Error ? error.message : 'Unknown error';
      stage.endTime = Date.now();
      return stage;
    }
  }

  /**
   * Execute intent classification stage
   */
  private async executeIntentClassification(request: RecoveryRequest): Promise<RecoveryStage> {
    const stage: RecoveryStage = {
      name: 'Intent Classification',
      status: 'running',
      startTime: Date.now()
    };

    try {
      const classification = this.intentClassifier.classifyError(request.errorMessage, request.artifactCode);

      if (classification.confidence > 0.1) {
        stage.status = 'completed';
        stage.result = classification;
        console.log(`🎯 [Strategy Executor] Classified as ${classification.errorType} with ${Math.round(classification.confidence * 100)}% confidence`);
      } else {
        stage.status = 'failed';
        stage.error = 'Low classification confidence';
      }

      stage.endTime = Date.now();
      return stage;

    } catch (error) {
      stage.status = 'failed';
      stage.error = error instanceof Error ? error.message : 'Classification error';
      stage.endTime = Date.now();
      return stage;
    }
  }

  /**
   * Execute auto-resolution stage using dependency resolver
   */
  private async executeAutoResolution(request: RecoveryRequest, context: ArtifactContext): Promise<RecoveryStage> {
    const stage: RecoveryStage = {
      name: 'Auto-Resolution',
      status: 'running',
      startTime: Date.now()
    };

    try {
      const resolution = await this.dependencyResolver.resolveDependencies(
        request.messageContent,
        request.artifactCode
      );

      if (resolution.success && resolution.confidence > 0.5) {
        stage.status = 'completed';
        stage.result = resolution;
        console.log(`✅ [Strategy Executor] Auto-resolution succeeded with strategy: ${resolution.strategyUsed}`);
      } else {
        stage.status = 'failed';
        stage.error = resolution.errorMessage || 'Auto-resolution failed';
        console.log(`❌ [Strategy Executor] Auto-resolution failed: ${stage.error}`);
      }

      stage.endTime = Date.now();
      return stage;

    } catch (error) {
      stage.status = 'failed';
      stage.error = error instanceof Error ? error.message : 'Auto-resolution error';
      stage.endTime = Date.now();
      return stage;
    }
  }

  /**
   * Execute LLM fallback stage
   */
  private async executeLLMFallback(request: RecoveryRequest): Promise<RecoveryStage> {
    const stage: RecoveryStage = {
      name: 'LLM Fallback',
      status: 'running',
      startTime: Date.now()
    };

    try {
      const llmRequest = {
        originalCode: request.artifactCode,
        errorMessage: request.errorMessage,
        language: request.language,
        messageContent: request.messageContent
      };

      const llmResult = await this.llmService.attemptAutoFix(llmRequest);

      if (llmResult.success && llmResult.confidence > 0.3) {
        stage.status = 'completed';
        stage.result = llmResult;
        console.log(`🤖 [Strategy Executor] LLM fallback succeeded with strategy: ${llmResult.strategy}`);
      } else {
        stage.status = 'failed';
        stage.error = llmResult.errors?.join(', ') || 'LLM fix failed';
        console.log(`🤖❌ [Strategy Executor] LLM fallback failed: ${stage.error}`);
      }

      stage.endTime = Date.now();
      return stage;

    } catch (error) {
      stage.status = 'failed';
      stage.error = error instanceof Error ? error.message : 'LLM fallback error';
      stage.endTime = Date.now();
      return stage;
    }
  }

  /**
   * Get recovery statistics for an artifact
   */
  getRecoveryStats(artifactId: string) {
    return {
      circuitState: this.circuitBreaker.getCircuitState(artifactId),
      circuitMetrics: this.circuitBreaker.getMetrics(artifactId)
    };
  }

  /**
   * Reset circuit breaker for an artifact (manual override)
   */
  resetCircuitBreaker(artifactId: string): void {
    console.log(`🔄 [Strategy Executor] Manually resetting circuit breaker for ${artifactId}`);
    this.circuitBreaker.resetCircuit(artifactId);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<StrategyExecutorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ [Strategy Executor] Configuration updated:', this.config);
  }
}

// Export default instance with standard configuration
export const defaultStrategyExecutor = new StrategyExecutor();