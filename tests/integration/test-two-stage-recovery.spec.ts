/**
 * Integration Tests: Two-Stage Recovery Process
 * These tests validate the complete two-stage recovery workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Two-Stage Recovery Process Integration', () => {
  let recoveryOrchestrator: any;
  let mockDependencyResolver: any;
  let mockLLMFixService: any;
  let mockCircuitBreaker: any;
  let mockProgressTracker: any;

  beforeEach(() => {
    // Mock services
    mockDependencyResolver = {
      resolveDependencies: vi.fn()
    };

    mockLLMFixService = {
      sendFixRequest: vi.fn(),
      validateFixedCode: vi.fn(),
      calculateConfidenceScore: vi.fn()
    };

    mockCircuitBreaker = {
      allowRecoveryAttempt: vi.fn(),
      recordSuccess: vi.fn(),
      recordFailure: vi.fn(),
      getCircuitState: vi.fn()
    };

    mockProgressTracker = {
      updateProgress: vi.fn(),
      setStage: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn()
    };

    // This will fail until implementation exists
    // @ts-expect-error - Implementation doesn't exist yet
    recoveryOrchestrator = new RecoveryOrchestrator({
      dependencyResolver: mockDependencyResolver,
      llmFixService: mockLLMFixService,
      circuitBreaker: mockCircuitBreaker,
      progressTracker: mockProgressTracker
    });
  });

  describe('Complete Two-Stage Success Flow', () => {
    it('should succeed in Stage 1 (auto-resolution) and skip Stage 2', async () => {
      const artifactId = 'stage1-success';
      const originalCode = `import styles from "./Button.module.css";
export default function Button() {
  return <button className={styles.primary}>Click</button>;
}`;
      const messageContent = `
        \`\`\`css
        .primary { background-color: blue; padding: 10px; }
        \`\`\`
      `;

      // Mock successful auto-resolution
      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);
      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: `const styles = { primary: { backgroundColor: 'blue', padding: '10px' } };
export default function Button() {
  return <button className={styles.primary}>Click</button>;
}`,
        strategyUsed: 'CSS_MODULE_CONVERSION',
        confidence: 0.95,
        processingTimeMs: 120
      });

      const result = await recoveryOrchestrator.executeRecoveryWorkflow(
        artifactId,
        originalCode,
        messageContent,
        'Cannot resolve module ./Button.module.css'
      );

      expect(result.success).toBe(true);
      expect(result.completedInStage).toBe(1);
      expect(result.stage1Result.success).toBe(true);
      expect(result.stage2Result).toBeUndefined(); // Stage 2 not executed
      expect(result.finalCode).toContain('const styles = {');

      expect(mockProgressTracker.setStage).toHaveBeenCalledWith('auto_resolution');
      expect(mockProgressTracker.markCompleted).toHaveBeenCalledWith('stage1');
      expect(mockLLMFixService.sendFixRequest).not.toHaveBeenCalled();
    });

    it('should fail Stage 1 and succeed in Stage 2 (LLM fix)', async () => {
      const artifactId = 'stage2-success';
      const originalCode = `import helper from "./complex-helper";
export default function Complex() {
  return <div>{helper.process()}</div>;
}`;
      const messageContent = 'Complex component without helper implementation';

      // Mock Stage 1 failure
      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);
      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: false,
        errorMessage: 'Cannot resolve complex dependencies',
        confidence: 0.1,
        strategyUsed: 'IMPORT_REMOVAL'
      });

      // Mock Stage 2 success
      mockLLMFixService.sendFixRequest.mockResolvedValue({
        success: true,
        fixedCode: `// Replaced missing helper with inline implementation
export default function Complex() {
  const helper = { process: () => 'processed data' };
  return <div>{helper.process()}</div>;
}`,
        confidence: 0.87,
        explanation: 'Replaced missing helper import with inline implementation',
        processingTimeMs: 1500
      });

      mockLLMFixService.validateFixedCode.mockReturnValue({
        isValid: true,
        syntaxErrors: []
      });

      const result = await recoveryOrchestrator.executeRecoveryWorkflow(
        artifactId,
        originalCode,
        messageContent,
        'Module not found: helper'
      );

      expect(result.success).toBe(true);
      expect(result.completedInStage).toBe(2);
      expect(result.stage1Result.success).toBe(false);
      expect(result.stage2Result.success).toBe(true);
      expect(result.finalCode).toContain('const helper = {');

      expect(mockProgressTracker.setStage).toHaveBeenCalledWith('auto_resolution');
      expect(mockProgressTracker.setStage).toHaveBeenCalledWith('llm_fixing');
      expect(mockProgressTracker.markCompleted).toHaveBeenCalledWith('stage2');
    });

    it('should handle both stages failing gracefully', async () => {
      const artifactId = 'both-stages-fail';
      const originalCode = 'import broken from "./nonexistent";';
      const messageContent = 'No relevant code blocks';

      // Mock Stage 1 failure
      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);
      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: false,
        errorMessage: 'No resolution strategies applicable',
        confidence: 0.0
      });

      // Mock Stage 2 failure
      mockLLMFixService.sendFixRequest.mockResolvedValue({
        success: false,
        errorMessage: 'LLM service unavailable',
        confidence: 0.0,
        explanation: 'Unable to generate fix due to insufficient context'
      });

      const result = await recoveryOrchestrator.executeRecoveryWorkflow(
        artifactId,
        originalCode,
        messageContent,
        'Import error'
      );

      expect(result.success).toBe(false);
      expect(result.completedInStage).toBe(0);
      expect(result.stage1Result.success).toBe(false);
      expect(result.stage2Result.success).toBe(false);
      expect(result.finalCode).toBe(''); // No transformation

      expect(mockProgressTracker.markFailed).toHaveBeenCalledWith('complete_workflow');
    });
  });

  describe('Progress Tracking Integration', () => {
    it('should track progress through both stages with updates', async () => {
      const artifactId = 'progress-tracking';

      // Mock Stage 1 partial progress then failure
      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);
      mockDependencyResolver.resolveDependencies.mockImplementation(async () => {
        // Simulate progress updates during processing
        await new Promise(resolve => setTimeout(resolve, 100));
        mockProgressTracker.updateProgress('auto_resolution', 50);
        await new Promise(resolve => setTimeout(resolve, 100));
        mockProgressTracker.updateProgress('auto_resolution', 100);

        return {
          success: false,
          errorMessage: 'Complex case needs LLM',
          confidence: 0.3
        };
      });

      // Mock Stage 2 with progress
      mockLLMFixService.sendFixRequest.mockImplementation(async () => {
        mockProgressTracker.updateProgress('llm_fixing', 25);
        await new Promise(resolve => setTimeout(resolve, 150));
        mockProgressTracker.updateProgress('llm_fixing', 75);
        await new Promise(resolve => setTimeout(resolve, 100));
        mockProgressTracker.updateProgress('llm_fixing', 100);

        return {
          success: true,
          fixedCode: 'fixed code',
          confidence: 0.85
        };
      });

      mockLLMFixService.validateFixedCode.mockReturnValue({
        isValid: true,
        syntaxErrors: []
      });

      const result = await recoveryOrchestrator.executeRecoveryWorkflow(
        artifactId,
        'original code',
        'message content',
        'error message'
      );

      expect(result.success).toBe(true);
      expect(mockProgressTracker.setStage).toHaveBeenCalledWith('auto_resolution');
      expect(mockProgressTracker.setStage).toHaveBeenCalledWith('llm_fixing');
      expect(mockProgressTracker.updateProgress).toHaveBeenCalledWith('auto_resolution', 50);
      expect(mockProgressTracker.updateProgress).toHaveBeenCalledWith('auto_resolution', 100);
      expect(mockProgressTracker.updateProgress).toHaveBeenCalledWith('llm_fixing', 25);
      expect(mockProgressTracker.updateProgress).toHaveBeenCalledWith('llm_fixing', 75);
      expect(mockProgressTracker.updateProgress).toHaveBeenCalledWith('llm_fixing', 100);
    });

    it('should handle progress tracking failures gracefully', async () => {
      const artifactId = 'progress-error';

      // Mock progress tracker throwing errors
      mockProgressTracker.setStage.mockImplementation(() => {
        throw new Error('Progress tracking failed');
      });

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);
      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: 'resolved code',
        confidence: 0.9
      });

      // Recovery should still work despite progress tracking errors
      const result = await recoveryOrchestrator.executeRecoveryWorkflow(
        artifactId,
        'code',
        'content',
        'error'
      );

      expect(result.success).toBe(true);
      expect(result.progressTrackingErrors).toBeDefined();
      expect(result.progressTrackingErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Circuit Breaker Integration in Two-Stage Flow', () => {
    it('should respect circuit breaker in Stage 1', async () => {
      const artifactId = 'circuit-stage1';

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(false);
      mockCircuitBreaker.getCircuitState.mockReturnValue('OPEN');

      const result = await recoveryOrchestrator.executeRecoveryWorkflow(
        artifactId,
        'code',
        'content',
        'error'
      );

      expect(result.success).toBe(false);
      expect(result.circuitBreakerBlocked).toBe(true);
      expect(result.blockedAtStage).toBe(1);
      expect(mockDependencyResolver.resolveDependencies).not.toHaveBeenCalled();
      expect(mockLLMFixService.sendFixRequest).not.toHaveBeenCalled();
    });

    it('should check circuit breaker before Stage 2', async () => {
      const artifactId = 'circuit-stage2';

      // Stage 1 allowed and fails
      mockCircuitBreaker.allowRecoveryAttempt
        .mockReturnValueOnce(true)   // Stage 1 allowed
        .mockReturnValueOnce(false); // Stage 2 blocked

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: false,
        errorMessage: 'Auto-resolution failed'
      });

      const result = await recoveryOrchestrator.executeRecoveryWorkflow(
        artifactId,
        'code',
        'content',
        'error'
      );

      expect(result.success).toBe(false);
      expect(result.stage1Result.success).toBe(false);
      expect(result.circuitBreakerBlocked).toBe(true);
      expect(result.blockedAtStage).toBe(2);
      expect(mockLLMFixService.sendFixRequest).not.toHaveBeenCalled();
    });

    it('should record failures appropriately for circuit breaker', async () => {
      const artifactId = 'circuit-failures';

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);

      // Both stages fail
      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: false,
        errorMessage: 'Stage 1 failed'
      });

      mockLLMFixService.sendFixRequest.mockResolvedValue({
        success: false,
        errorMessage: 'Stage 2 failed'
      });

      const result = await recoveryOrchestrator.executeRecoveryWorkflow(
        artifactId,
        'code',
        'content',
        'error'
      );

      expect(result.success).toBe(false);
      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalledWith(artifactId, 'Stage 1 failed');
      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalledWith(artifactId, 'Stage 2 failed');
      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Context and User Feedback', () => {
    it('should provide detailed error context for UI display', async () => {
      const artifactId = 'error-context';
      const errorMessage = 'Cannot resolve module \'./Button.module.css\'';

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);

      // Stage 1 fails with detailed context
      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: false,
        errorMessage: 'CSS block not found in message content',
        confidence: 0.1,
        strategyUsed: 'CSS_MODULE_CONVERSION',
        availableStrategies: ['CSS_MODULE_CONVERSION', 'IMPORT_REMOVAL'],
        contextAnalysis: {
          hasRelevantCSS: false,
          hasImportStatements: true,
          errorType: 'CSS_MODULE_ERROR'
        }
      });

      // Stage 2 provides LLM explanation
      mockLLMFixService.sendFixRequest.mockResolvedValue({
        success: true,
        fixedCode: 'const styles = {};',
        confidence: 0.6,
        explanation: 'Created empty styles object as CSS content was not available',
        reasoning: 'Fallback approach to prevent import errors',
        limitations: ['Styles will not have visual effect', 'Manual CSS addition recommended']
      });

      mockLLMFixService.validateFixedCode.mockReturnValue({
        isValid: true,
        syntaxErrors: []
      });

      const result = await recoveryOrchestrator.executeRecoveryWorkflow(
        artifactId,
        'code',
        'content',
        errorMessage
      );

      expect(result.success).toBe(true);
      expect(result.userFeedback).toBeDefined();
      expect(result.userFeedback.stage1Context).toBeDefined();
      expect(result.userFeedback.stage2Explanation).toBeDefined();
      expect(result.userFeedback.limitations).toContain('Styles will not have visual effect');
      expect(result.userFeedback.recommendations).toContain('Manual CSS addition recommended');
    });

    it('should categorize different error types for appropriate UI responses', async () => {
      const errorScenarios = [
        {
          errorMessage: 'SyntaxError: Unexpected token',
          expectedCategory: 'SYNTAX_ERROR',
          shouldShowRecovery: false
        },
        {
          errorMessage: 'Cannot resolve module \'./styles.css\'',
          expectedCategory: 'CSS_MODULE_ERROR',
          shouldShowRecovery: true
        },
        {
          errorMessage: 'Network error loading dependencies',
          expectedCategory: 'NETWORK_ERROR',
          shouldShowRecovery: false
        },
        {
          errorMessage: 'Module not found: ./config.json',
          expectedCategory: 'JSON_IMPORT_ERROR',
          shouldShowRecovery: true
        }
      ];

      for (const scenario of errorScenarios) {
        mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);

        const result = await recoveryOrchestrator.categorizeErrorAndDetermineUI(
          'test-artifact',
          scenario.errorMessage,
          'test code'
        );

        expect(result.errorCategory).toBe(scenario.expectedCategory);
        expect(result.shouldShowRecoveryUI).toBe(scenario.shouldShowRecovery);
      }
    });
  });

  describe('Performance and Optimization', () => {
    it('should optimize two-stage execution for performance', async () => {
      const artifactId = 'performance-test';
      const startTime = Date.now();

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);

      // Mock quick Stage 1 success
      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: 'resolved quickly',
        confidence: 0.95,
        processingTimeMs: 50
      });

      const result = await recoveryOrchestrator.executeRecoveryWorkflow(
        artifactId,
        'code',
        'content',
        'error'
      );

      const totalTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.completedInStage).toBe(1); // Early termination
      expect(result.performance.totalTimeMs).toBeLessThan(200); // Fast execution
      expect(totalTime).toBeLessThan(500); // Overall fast
      expect(mockLLMFixService.sendFixRequest).not.toHaveBeenCalled(); // Stage 2 skipped
    });

    it('should handle timeout scenarios in both stages', async () => {
      const artifactId = 'timeout-test';

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);

      // Mock Stage 1 timeout
      mockDependencyResolver.resolveDependencies.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: false,
              errorMessage: 'Stage 1 timeout',
              timeout: true
            });
          }, 2500); // Longer than expected timeout
        });
      });

      // Mock Stage 2 success
      mockLLMFixService.sendFixRequest.mockResolvedValue({
        success: true,
        fixedCode: 'timeout recovery',
        confidence: 0.8
      });

      mockLLMFixService.validateFixedCode.mockReturnValue({
        isValid: true,
        syntaxErrors: []
      });

      const result = await recoveryOrchestrator.executeRecoveryWorkflow(
        artifactId,
        'code',
        'content',
        'error',
        { stage1Timeout: 2000, stage2Timeout: 3000 }
      );

      expect(result.success).toBe(true); // Recovered in Stage 2
      expect(result.stage1Result.timeout).toBe(true);
      expect(result.stage2Result.success).toBe(true);
    });
  });
});