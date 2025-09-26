/**
 * End-to-End Artifact Workflow Orchestrator
 *
 * This service coordinates the complete artifact workflow from intent classification
 * through prompt enhancement, detection, parsing, and rendering. It provides a
 * unified interface for artifact processing and handles error recovery.
 */

import { intentClassifier } from './intent-classifier';
import { promptEnhancer } from './prompt-enhancer';
import { retryLoopMonitor } from './retry-loop-monitor';
import { performanceMonitor } from './performance-monitor';
import { detectArtifactsUnified } from '$lib/artifacts/detectArtifacts';
import { parseArtifactsFromContent } from '$lib/utils/artifacts/xml-artifact-parser';

import type { IntentClassificationRequest } from '$lib/types/intent-classifier';
import type { PromptEnhancementRequest } from '$lib/types/enhanced-artifacts';
import type { ComponentState } from '$lib/types/retry-monitoring';
import type { PerformanceMetrics } from './performance-monitor';

export interface WorkflowRequest {
  prompt: string;
  sessionId: string;
  messageId?: string;
  chatHistory?: any[];
  userPreferences?: {
    autoEnhance?: boolean;
    preferredFramework?: string;
    enableArtifacts?: boolean;
  };
}

export interface WorkflowResult {
  // Input processing
  originalPrompt: string;
  classifiedIntent: any | null;
  enhancedPrompt: string | null;
  wasPromptEnhanced: boolean;

  // Artifact detection and processing
  detectedArtifacts: any[];
  artifactCount: number;
  processingTimeMs: number;

  // Workflow metadata
  workflowId: string;
  sessionId: string;
  errors: WorkflowError[];
  performance: {
    intentClassificationMs: number;
    promptEnhancementMs: number;
    artifactDetectionMs: number;
    totalWorkflowMs: number;
  };

  // Performance monitoring integration
  performanceMetrics?: PerformanceMetrics;
}

export interface WorkflowError {
  stage: 'intent_classification' | 'prompt_enhancement' | 'artifact_detection' | 'artifact_parsing';
  error: string;
  timestamp: number;
  recoverable: boolean;
}

export interface WorkflowOptions {
  skipIntentClassification?: boolean;
  skipPromptEnhancement?: boolean;
  forceArtifactDetection?: boolean;
  timeoutMs?: number;
}

class ArtifactWorkflowOrchestrator {
  private activeWorkflows = new Map<string, WorkflowResult>();
  private workflowTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Execute the complete artifact workflow
   */
  async executeWorkflow(
    request: WorkflowRequest,
    options: WorkflowOptions = {}
  ): Promise<WorkflowResult> {
    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log('🔄 [ArtifactWorkflow] Starting workflow:', workflowId);

    // Start performance monitoring
    performanceMonitor.startMonitoring(workflowId);

    const result: WorkflowResult = {
      originalPrompt: request.prompt,
      classifiedIntent: null,
      enhancedPrompt: null,
      wasPromptEnhanced: false,
      detectedArtifacts: [],
      artifactCount: 0,
      processingTimeMs: 0,
      workflowId,
      sessionId: request.sessionId,
      errors: [],
      performance: {
        intentClassificationMs: 0,
        promptEnhancementMs: 0,
        artifactDetectionMs: 0,
        totalWorkflowMs: 0
      }
    };

    // Store active workflow
    this.activeWorkflows.set(workflowId, result);

    // Set timeout for workflow with performance monitoring
    const workflowTimeout = options.timeoutMs || 60000; // Default 60 seconds
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeout = setTimeout(() => {
        performanceMonitor.stopMonitoring(workflowId);
        this.handleWorkflowTimeout(workflowId);
        reject(new Error(`Workflow timed out after ${workflowTimeout}ms`));
      }, workflowTimeout);
      this.workflowTimeouts.set(workflowId, timeout);
    });

    try {
      // Create timeout promise for the entire workflow
      const workflowPromise = this.executeWorkflowStages(request, result, options);

      // Race between workflow completion and timeout
      await Promise.race([workflowPromise, timeoutPromise]);

      // Complete workflow
      result.performance.totalWorkflowMs = Date.now() - startTime;
      result.processingTimeMs = result.performance.totalWorkflowMs;

      // Stop performance monitoring and get final metrics
      result.performanceMetrics = performanceMonitor.stopMonitoring(workflowId);

      console.log('✅ [ArtifactWorkflow] Workflow completed:', {
        workflowId,
        totalTime: result.performance.totalWorkflowMs,
        artifactCount: result.artifactCount,
        wasEnhanced: result.wasPromptEnhanced,
        errors: result.errors.length,
        performanceMetrics: result.performanceMetrics
      });

    } catch (error) {
      console.error('🔴 [ArtifactWorkflow] Workflow failed:', workflowId, error);

      // Stop performance monitoring on error
      performanceMonitor.stopMonitoring(workflowId);

      result.errors.push({
        stage: 'artifact_detection',
        error: error.message,
        timestamp: Date.now(),
        recoverable: false
      });
    } finally {
      // Cleanup
      this.cleanupWorkflow(workflowId);
    }

    return result;
  }

  /**
   * Execute workflow stages with performance monitoring
   */
  private async executeWorkflowStages(
    request: WorkflowRequest,
    result: WorkflowResult,
    options: WorkflowOptions
  ): Promise<void> {
    // Stage 1: Intent Classification
    if (!options.skipIntentClassification) {
      await this.executeIntentClassification(request, result);
    }

    // Stage 2: Prompt Enhancement (if intent suggests enhancement)
    if (!options.skipPromptEnhancement && this.shouldEnhancePrompt(result)) {
      await this.executePromptEnhancement(request, result);
    }

    // Stage 3: Artifact Detection and Processing
    await this.executeArtifactDetection(request, result, options);
  }

  /**
   * Execute intent classification stage
   */
  private async executeIntentClassification(
    request: WorkflowRequest,
    result: WorkflowResult
  ): Promise<void> {
    const operationId = performanceMonitor.startOperation(result.workflowId, 'intentClassification');

    try {
      console.log('🎯 [ArtifactWorkflow] Executing intent classification');

      const intentRequest: IntentClassificationRequest = {
        prompt: request.prompt,
        sessionId: request.sessionId,
        timestamp: new Date()
      };

      // Wrap with timeout promise
      const classificationPromise = intentClassifier.classifyIntent(intentRequest);
      result.classifiedIntent = await performanceMonitor.createTimeoutPromise(
        classificationPromise,
        'intentClassification',
        'Intent Classification'
      );

      result.performance.intentClassificationMs = performanceMonitor.endOperation(
        operationId,
        result.workflowId,
        'intentClassification',
        true
      );

      console.log('🎯 [ArtifactWorkflow] Intent classification completed:', {
        shouldEnhance: result.classifiedIntent.shouldEnhance,
        confidence: result.classifiedIntent.confidence,
        timeMs: result.performance.intentClassificationMs
      });

    } catch (error) {
      console.warn('🎯 [ArtifactWorkflow] Intent classification failed:', error);

      performanceMonitor.endOperation(
        operationId,
        result.workflowId,
        'intentClassification',
        false
      );

      result.errors.push({
        stage: 'intent_classification',
        error: error.message,
        timestamp: Date.now(),
        recoverable: true
      });
    }
  }

  /**
   * Execute prompt enhancement stage
   */
  private async executePromptEnhancement(
    request: WorkflowRequest,
    result: WorkflowResult
  ): Promise<void> {
    const operationId = performanceMonitor.startOperation(result.workflowId, 'promptEnhancement');

    try {
      console.log('🚀 [ArtifactWorkflow] Executing prompt enhancement');

      const enhancementRequest: PromptEnhancementRequest = {
        originalPrompt: request.prompt,
        context: {
          chatHistory: request.chatHistory || [],
          sessionId: request.sessionId,
          userIntent: 'create_artifact',
          detectedKeywords: result.classifiedIntent?.detectedKeywords || []
        },
        enhancementType: 'artifact_creation',
        targetFramework: result.classifiedIntent?.suggestedFramework || 'react'
      };

      // Wrap with timeout promise
      const enhancementPromise = promptEnhancer.enhancePrompt(enhancementRequest);
      const enhancementResult = await performanceMonitor.createTimeoutPromise(
        enhancementPromise,
        'promptEnhancement',
        'Prompt Enhancement'
      );

      if (enhancementResult.wasEnhanced) {
        result.enhancedPrompt = enhancementResult.enhancedPrompt;
        result.wasPromptEnhanced = true;
      }

      result.performance.promptEnhancementMs = performanceMonitor.endOperation(
        operationId,
        result.workflowId,
        'promptEnhancement',
        true
      );

      console.log('🚀 [ArtifactWorkflow] Prompt enhancement completed:', {
        wasEnhanced: result.wasPromptEnhanced,
        confidence: enhancementResult.confidence,
        timeMs: result.performance.promptEnhancementMs
      });

    } catch (error) {
      console.warn('🚀 [ArtifactWorkflow] Prompt enhancement failed:', error);

      performanceMonitor.endOperation(
        operationId,
        result.workflowId,
        'promptEnhancement',
        false
      );

      result.errors.push({
        stage: 'prompt_enhancement',
        error: error.message,
        timestamp: Date.now(),
        recoverable: true
      });
    }
  }

  /**
   * Execute artifact detection and processing stage
   */
  private async executeArtifactDetection(
    request: WorkflowRequest,
    result: WorkflowResult,
    options: WorkflowOptions
  ): Promise<void> {
    const operationId = performanceMonitor.startOperation(result.workflowId, 'artifactDetection');

    try {
      console.log('🔍 [ArtifactWorkflow] Executing artifact detection');

      // Use enhanced prompt if available, otherwise original
      const promptToAnalyze = result.enhancedPrompt || request.prompt;

      // Wrap with timeout promise
      const detectionPromise = detectArtifactsUnified(promptToAnalyze, request.sessionId);
      const detectionResult = await performanceMonitor.createTimeoutPromise(
        detectionPromise,
        'artifactDetection',
        'Artifact Detection'
      );

      result.detectedArtifacts = detectionResult.artifacts;
      result.artifactCount = detectionResult.artifacts.length;
      result.performance.artifactDetectionMs = performanceMonitor.endOperation(
        operationId,
        result.workflowId,
        'artifactDetection',
        true
      );

      console.log('🔍 [ArtifactWorkflow] Artifact detection completed:', {
        artifactCount: result.artifactCount,
        legacyCount: detectionResult.detectionMetadata.legacyCount,
        pas3Count: detectionResult.detectionMetadata.pas3Count,
        timeMs: result.performance.artifactDetectionMs
      });

      // If no artifacts found but intent suggests enhancement, try fallback detection
      if (result.artifactCount === 0 && options.forceArtifactDetection) {
        await this.executeFallbackDetection(promptToAnalyze, result);
      }

    } catch (error) {
      console.warn('🔍 [ArtifactWorkflow] Artifact detection failed:', error);

      performanceMonitor.endOperation(
        operationId,
        result.workflowId,
        'artifactDetection',
        false
      );

      result.errors.push({
        stage: 'artifact_detection',
        error: error.message,
        timestamp: Date.now(),
        recoverable: true
      });
    }
  }

  /**
   * Execute fallback detection for edge cases
   */
  private async executeFallbackDetection(prompt: string, result: WorkflowResult): Promise<void> {
    try {
      console.log('🔍 [ArtifactWorkflow] Executing fallback detection');

      // Try PAS 3.0 XML parsing directly
      const xmlResult = parseArtifactsFromContent(prompt);

      if (xmlResult.hasArtifacts) {
        // Convert PAS 3.0 artifacts to unified format
        result.detectedArtifacts = xmlResult.artifacts.map(artifact => ({
          type: this.mapPas3TypeToLegacy(artifact.type),
          title: artifact.title,
          entryCode: artifact.files[0]?.content || '',
          dependencies: artifact.dependencies.reduce((acc, dep) => {
            acc[dep.name] = dep.version;
            return acc;
          }, {} as Record<string, string>)
        }));

        result.artifactCount = result.detectedArtifacts.length;
        console.log('🔍 [ArtifactWorkflow] Fallback detection found artifacts:', result.artifactCount);
      }

    } catch (error) {
      console.warn('🔍 [ArtifactWorkflow] Fallback detection failed:', error);
    }
  }

  /**
   * Map PAS 3.0 artifact types to legacy types
   */
  private mapPas3TypeToLegacy(pas3Type: string): string {
    const mapping: Record<string, string> = {
      'application/vnd.react+jsx': 'react',
      'application/vnd.react+tsx': 'react',
      'application/vnd.svelte': 'svelte',
      'text/html': 'html',
      'image/svg+xml': 'svg',
      'application/vnd.mermaid': 'mermaid'
    };

    return mapping[pas3Type] || 'html';
  }

  /**
   * Determine if prompt should be enhanced based on intent classification
   */
  private shouldEnhancePrompt(result: WorkflowResult): boolean {
    return result.classifiedIntent?.shouldEnhance === true &&
           result.classifiedIntent?.confidence > 0.7;
  }

  /**
   * Handle workflow timeout
   */
  private handleWorkflowTimeout(workflowId: string): void {
    console.warn('⏰ [ArtifactWorkflow] Workflow timeout:', workflowId);

    const result = this.activeWorkflows.get(workflowId);
    if (result) {
      result.errors.push({
        stage: 'artifact_detection',
        error: 'Workflow timed out',
        timestamp: Date.now(),
        recoverable: false
      });
    }

    this.cleanupWorkflow(workflowId);
  }

  /**
   * Clean up workflow resources
   */
  private cleanupWorkflow(workflowId: string): void {
    this.activeWorkflows.delete(workflowId);

    const timeout = this.workflowTimeouts.get(workflowId);
    if (timeout) {
      clearTimeout(timeout);
      this.workflowTimeouts.delete(workflowId);
    }
  }

  /**
   * Get active workflow count
   */
  getActiveWorkflowCount(): number {
    return this.activeWorkflows.size;
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): WorkflowResult | null {
    return this.activeWorkflows.get(workflowId) || null;
  }

  /**
   * Cancel workflow
   */
  cancelWorkflow(workflowId: string): boolean {
    if (this.activeWorkflows.has(workflowId)) {
      this.cleanupWorkflow(workflowId);
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const artifactWorkflow = new ArtifactWorkflowOrchestrator();