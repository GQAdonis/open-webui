/**
 * Dependency Resolution Workflow Orchestrator
 *
 * This service orchestrates the complete dependency resolution workflow,
 * coordinating between the recovery state manager, strategy executor,
 * circuit breaker, and UI components to provide a seamless recovery experience.
 */

import { recoveryStateManager, type RecoverySessionState } from './recovery-state-manager';
import { defaultStrategyExecutor, type RecoveryRequest, type RecoveryResult } from './strategy-executor';
import { circuitBreakerManager } from './circuit-breaker-manager';
import { intentClassifier } from './intent-classifier';
import type { ParsedArtifact } from '../../utils/artifacts/xml-artifact-parser';

export interface WorkflowRequest {
  artifactId: string;
  artifactCode: string;
  errorMessage: string;
  messageContent?: string;
  language: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  userPreferences?: WorkflowUserPreferences;
}

export interface WorkflowUserPreferences {
  autoApplyHighConfidenceFixes?: boolean;
  requireConfirmationThreshold?: number;
  enableCircuitBreaker?: boolean;
  maxProcessingTime?: number;
  preferredStrategies?: string[];
}

export interface WorkflowResult {
  success: boolean;
  sessionId: string;
  artifactId: string;
  recoveryResult?: RecoveryResult;
  processingTimeMs: number;
  stages: WorkflowStage[];
  userInteractionRequired: boolean;
  nextRecommendedAction?: string;
  errors: string[];
}

export interface WorkflowStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  result?: any;
  error?: string;
}

export interface WorkflowMetrics {
  totalWorkflows: number;
  successfulWorkflows: number;
  failedWorkflows: number;
  averageProcessingTime: number;
  circuitBreakerActivations: number;
  userInterventionsRequired: number;
}

/**
 * Main workflow orchestrator that coordinates the entire dependency resolution process
 */
export class DependencyResolutionWorkflowOrchestrator {
  private activeWorkflows = new Map<string, WorkflowSession>();
  private workflowMetrics: WorkflowMetrics = {
    totalWorkflows: 0,
    successfulWorkflows: 0,
    failedWorkflows: 0,
    averageProcessingTime: 0,
    circuitBreakerActivations: 0,
    userInterventionsRequired: 0
  };

  private defaultPreferences: WorkflowUserPreferences = {
    autoApplyHighConfidenceFixes: true,
    requireConfirmationThreshold: 0.8,
    enableCircuitBreaker: true,
    maxProcessingTime: 30000,
    preferredStrategies: []
  };

  /**
   * Execute a complete dependency resolution workflow
   */
  async executeWorkflow(request: WorkflowRequest): Promise<WorkflowResult> {
    const startTime = Date.now();
    const preferences = { ...this.defaultPreferences, ...request.userPreferences };

    console.log(`🚀 [Workflow] Starting dependency resolution for artifact: ${request.artifactId}`);

    // Create workflow session
    const sessionId = recoveryStateManager.startRecoverySession(
      request.artifactId,
      'Workflow Initialization'
    );

    const workflowSession: WorkflowSession = {
      sessionId,
      request,
      preferences,
      stages: this.initializeStages(),
      startTime,
      currentStage: 0
    };

    this.activeWorkflows.set(sessionId, workflowSession);
    this.workflowMetrics.totalWorkflows++;

    try {
      // Execute workflow stages
      const result = await this.executeWorkflowStages(workflowSession);

      // Update metrics
      if (result.success) {
        this.workflowMetrics.successfulWorkflows++;
      } else {
        this.workflowMetrics.failedWorkflows++;
      }

      const processingTime = Date.now() - startTime;
      this.updateAverageProcessingTime(processingTime);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown workflow error';
      console.error(`❌ [Workflow] Workflow failed for ${request.artifactId}:`, errorMessage);

      this.workflowMetrics.failedWorkflows++;
      recoveryStateManager.completeRecoverySession(sessionId, {
        success: false,
        strategy: 'WORKFLOW_ERROR',
        confidence: 0,
        errors: [errorMessage],
        processingTimeMs: Date.now() - startTime,
        stages: workflowSession.stages.map(this.convertToRecoveryStage),
        finalCode: request.artifactCode,
        circuitState: 'UNKNOWN'
      });

      return {
        success: false,
        sessionId,
        artifactId: request.artifactId,
        processingTimeMs: Date.now() - startTime,
        stages: workflowSession.stages,
        userInteractionRequired: false,
        errors: [errorMessage]
      };

    } finally {
      this.activeWorkflows.delete(sessionId);
    }
  }

  /**
   * Execute all workflow stages in sequence
   */
  private async executeWorkflowStages(session: WorkflowSession): Promise<WorkflowResult> {
    const { sessionId, request, preferences, stages } = session;

    try {
      // Stage 1: Prerequisite Check
      await this.executeStage(session, 0, async () => {
        recoveryStateManager.updateRecoverySession(sessionId, {
          currentStage: 'Prerequisite Check',
          progress: 10
        });

        return this.checkPrerequisites(request);
      });

      // Stage 2: Circuit Breaker Check
      await this.executeStage(session, 1, async () => {
        recoveryStateManager.updateRecoverySession(sessionId, {
          currentStage: 'Circuit Breaker Check',
          progress: 20
        });

        if (preferences.enableCircuitBreaker) {
          const circuitState = circuitBreakerManager.checkCircuit(request.artifactId);
          if (circuitState === 'OPEN') {
            this.workflowMetrics.circuitBreakerActivations++;
            throw new Error('Circuit breaker is open - too many recent failures');
          }
        }

        return { circuitState: 'CLOSED' };
      });

      // Stage 3: Intent Classification
      await this.executeStage(session, 2, async () => {
        recoveryStateManager.updateRecoverySession(sessionId, {
          currentStage: 'Intent Classification',
          progress: 30
        });

        const intent = await intentClassifier.classifyIntent({
          artifactCode: request.artifactCode,
          errorMessage: request.errorMessage,
          messageContent: request.messageContent || '',
          language: request.language
        });

        return { intent };
      });

      // Stage 4: Strategy Selection & Execution
      await this.executeStage(session, 3, async () => {
        recoveryStateManager.updateRecoverySession(sessionId, {
          currentStage: 'Strategy Execution',
          progress: 50
        });

        const recoveryRequest: RecoveryRequest = {
          artifactId: request.artifactId,
          artifactCode: request.artifactCode,
          errorMessage: request.errorMessage,
          messageContent: request.messageContent || '',
          language: request.language,
          attemptId: `workflow-${sessionId}-${Date.now()}`
        };

        const recoveryResult = await defaultStrategyExecutor.executeRecovery(recoveryRequest);
        return { recoveryResult };
      });

      // Stage 5: Result Validation
      await this.executeStage(session, 4, async () => {
        recoveryStateManager.updateRecoverySession(sessionId, {
          currentStage: 'Result Validation',
          progress: 80
        });

        const recoveryResult = stages[3].result?.recoveryResult;
        if (!recoveryResult) {
          throw new Error('No recovery result available for validation');
        }

        const validation = await this.validateRecoveryResult(recoveryResult, request);
        return { validation };
      });

      // Stage 6: User Interaction Assessment
      await this.executeStage(session, 5, async () => {
        recoveryStateManager.updateRecoverySession(sessionId, {
          currentStage: 'User Interaction Assessment',
          progress: 90
        });

        const recoveryResult = stages[3].result?.recoveryResult;
        const userInteractionRequired = this.assessUserInteractionRequired(
          recoveryResult,
          preferences
        );

        if (userInteractionRequired) {
          this.workflowMetrics.userInterventionsRequired++;
        }

        return { userInteractionRequired };
      });

      // Stage 7: Workflow Completion
      await this.executeStage(session, 6, async () => {
        recoveryStateManager.updateRecoverySession(sessionId, {
          currentStage: 'Workflow Completion',
          progress: 100
        });

        const recoveryResult = stages[3].result?.recoveryResult;
        const userInteractionRequired = stages[5].result?.userInteractionRequired || false;

        // Complete the recovery session
        if (recoveryResult) {
          recoveryStateManager.completeRecoverySession(sessionId, recoveryResult);
        }

        return {
          success: recoveryResult?.success || false,
          userInteractionRequired,
          nextRecommendedAction: this.getNextRecommendedAction(recoveryResult, userInteractionRequired)
        };
      });

      // Build final result
      const recoveryResult = stages[3].result?.recoveryResult;
      const finalStageResult = stages[6].result;

      return {
        success: finalStageResult?.success || false,
        sessionId,
        artifactId: request.artifactId,
        recoveryResult,
        processingTimeMs: Date.now() - session.startTime,
        stages: session.stages,
        userInteractionRequired: finalStageResult?.userInteractionRequired || false,
        nextRecommendedAction: finalStageResult?.nextRecommendedAction,
        errors: this.collectStageErrors(session.stages)
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown stage error';
      console.error(`❌ [Workflow] Stage execution failed:`, errorMessage);

      // Mark current stage as failed
      if (session.currentStage < session.stages.length) {
        session.stages[session.currentStage].status = 'failed';
        session.stages[session.currentStage].error = errorMessage;
        session.stages[session.currentStage].endTime = Date.now();
      }

      return {
        success: false,
        sessionId,
        artifactId: request.artifactId,
        processingTimeMs: Date.now() - session.startTime,
        stages: session.stages,
        userInteractionRequired: false,
        errors: [errorMessage, ...this.collectStageErrors(session.stages)]
      };
    }
  }

  /**
   * Execute a single workflow stage
   */
  private async executeStage(
    session: WorkflowSession,
    stageIndex: number,
    executor: () => Promise<any>
  ): Promise<void> {
    const stage = session.stages[stageIndex];
    session.currentStage = stageIndex;

    console.log(`🔄 [Workflow] Executing stage: ${stage.name}`);

    stage.status = 'running';
    stage.startTime = Date.now();

    try {
      const result = await executor();
      stage.result = result;
      stage.status = 'completed';
      stage.endTime = Date.now();

      console.log(`✅ [Workflow] Completed stage: ${stage.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown stage error';
      stage.error = errorMessage;
      stage.status = 'failed';
      stage.endTime = Date.now();

      console.error(`❌ [Workflow] Failed stage: ${stage.name} - ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Initialize workflow stages
   */
  private initializeStages(): WorkflowStage[] {
    return [
      { name: 'Prerequisite Check', status: 'pending' },
      { name: 'Circuit Breaker Check', status: 'pending' },
      { name: 'Intent Classification', status: 'pending' },
      { name: 'Strategy Execution', status: 'pending' },
      { name: 'Result Validation', status: 'pending' },
      { name: 'User Interaction Assessment', status: 'pending' },
      { name: 'Workflow Completion', status: 'pending' }
    ];
  }

  /**
   * Check workflow prerequisites
   */
  private async checkPrerequisites(request: WorkflowRequest): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    if (!request.artifactId) issues.push('Missing artifact ID');
    if (!request.artifactCode) issues.push('Missing artifact code');
    if (!request.errorMessage) issues.push('Missing error message');
    if (!request.language) issues.push('Missing language specification');

    // Check for malformed code
    if (request.artifactCode.length > 50000) {
      issues.push('Artifact code is too large (>50KB)');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Validate recovery result
   */
  private async validateRecoveryResult(
    result: RecoveryResult,
    request: WorkflowRequest
  ): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    if (!result.finalCode) {
      issues.push('No final code provided');
    }

    if (result.confidence < 0.3) {
      issues.push('Recovery confidence is very low');
    }

    if (result.finalCode === request.artifactCode) {
      issues.push('Final code is identical to original code');
    }

    // Basic syntax validation
    if (result.finalCode) {
      const braceBalance = (result.finalCode.match(/\{/g) || []).length -
                          (result.finalCode.match(/\}/g) || []).length;
      if (braceBalance !== 0) {
        issues.push('Syntax error: Unbalanced braces in final code');
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Assess if user interaction is required
   */
  private assessUserInteractionRequired(
    result: RecoveryResult | undefined,
    preferences: WorkflowUserPreferences
  ): boolean {
    if (!result || !result.success) {
      return true; // Always require user interaction for failures
    }

    if (!preferences.autoApplyHighConfidenceFixes) {
      return true; // User wants manual confirmation
    }

    if (result.confidence < (preferences.requireConfirmationThreshold || 0.8)) {
      return true; // Low confidence requires confirmation
    }

    return false; // Auto-apply is appropriate
  }

  /**
   * Get next recommended action
   */
  private getNextRecommendedAction(
    result: RecoveryResult | undefined,
    userInteractionRequired: boolean
  ): string {
    if (!result) {
      return 'retry_workflow';
    }

    if (!result.success) {
      if (result.circuitState === 'OPEN') {
        return 'wait_and_retry';
      }
      return 'manual_intervention';
    }

    if (userInteractionRequired) {
      return 'confirm_and_apply';
    }

    return 'auto_apply';
  }

  /**
   * Collect errors from all failed stages
   */
  private collectStageErrors(stages: WorkflowStage[]): string[] {
    return stages
      .filter(stage => stage.error)
      .map(stage => `${stage.name}: ${stage.error}`);
  }

  /**
   * Convert workflow stage to recovery stage format
   */
  private convertToRecoveryStage(stage: WorkflowStage): any {
    return {
      name: stage.name,
      status: stage.status,
      startTime: stage.startTime,
      endTime: stage.endTime,
      processingTimeMs: stage.endTime && stage.startTime ?
        stage.endTime - stage.startTime : 0,
      result: stage.result,
      error: stage.error
    };
  }

  /**
   * Update average processing time metric
   */
  private updateAverageProcessingTime(newTime: number): void {
    const totalWorkflows = this.workflowMetrics.totalWorkflows;
    const currentAverage = this.workflowMetrics.averageProcessingTime;

    this.workflowMetrics.averageProcessingTime =
      ((currentAverage * (totalWorkflows - 1)) + newTime) / totalWorkflows;
  }

  /**
   * Get workflow metrics
   */
  getMetrics(): WorkflowMetrics {
    return { ...this.workflowMetrics };
  }

  /**
   * Get active workflow count
   */
  getActiveWorkflowCount(): number {
    return this.activeWorkflows.size;
  }

  /**
   * Cancel a specific workflow
   */
  cancelWorkflow(sessionId: string): boolean {
    const workflow = this.activeWorkflows.get(sessionId);
    if (workflow) {
      recoveryStateManager.cancelArtifactRecovery(workflow.request.artifactId);
      this.activeWorkflows.delete(sessionId);
      console.log(`❌ [Workflow] Cancelled workflow: ${sessionId}`);
      return true;
    }
    return false;
  }

  /**
   * Cancel all workflows for an artifact
   */
  cancelArtifactWorkflows(artifactId: string): number {
    let cancelledCount = 0;

    for (const [sessionId, workflow] of this.activeWorkflows.entries()) {
      if (workflow.request.artifactId === artifactId) {
        this.activeWorkflows.delete(sessionId);
        cancelledCount++;
      }
    }

    if (cancelledCount > 0) {
      recoveryStateManager.cancelArtifactRecovery(artifactId);
      console.log(`❌ [Workflow] Cancelled ${cancelledCount} workflows for artifact: ${artifactId}`);
    }

    return cancelledCount;
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.workflowMetrics = {
      totalWorkflows: 0,
      successfulWorkflows: 0,
      failedWorkflows: 0,
      averageProcessingTime: 0,
      circuitBreakerActivations: 0,
      userInterventionsRequired: 0
    };
  }
}

/**
 * Internal workflow session tracking
 */
interface WorkflowSession {
  sessionId: string;
  request: WorkflowRequest;
  preferences: WorkflowUserPreferences;
  stages: WorkflowStage[];
  startTime: number;
  currentStage: number;
}

// Export singleton instance
export const workflowOrchestrator = new DependencyResolutionWorkflowOrchestrator();