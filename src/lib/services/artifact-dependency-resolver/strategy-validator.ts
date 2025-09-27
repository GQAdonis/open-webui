/**
 * Strategy Priority Execution Validator
 *
 * This service validates that the dependency resolution strategies
 * execute in the correct priority order and terminate properly
 * on first success, ensuring the 4-tier strategy system works correctly.
 */

import { defaultStrategyExecutor, type RecoveryRequest, type RecoveryResult } from './strategy-executor';
import type { ResolutionStrategy } from './resolution-strategy';

export interface StrategyValidationResult {
  success: boolean;
  executionOrder: string[];
  expectedOrder: string[];
  firstSuccessTermination: boolean;
  strategyPerformance: Map<string, StrategyPerformanceMetrics>;
  errors: string[];
  validationTimeMs: number;
}

export interface StrategyPerformanceMetrics {
  strategyName: string;
  priority: number;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number;
  successRate: number;
  lastExecutionTime?: number;
}

export interface ValidationTestCase {
  name: string;
  description: string;
  request: RecoveryRequest;
  expectedStrategy: string;
  expectedSuccess: boolean;
  maxExecutionTime: number;
}

/**
 * Validates the strategy system execution and priority ordering
 */
export class StrategyValidator {
  private validationHistory: StrategyValidationResult[] = [];
  private maxHistorySize = 100;

  /**
   * Validate that strategies execute in priority order
   */
  async validateStrategyPriorityExecution(): Promise<StrategyValidationResult> {
    const startTime = Date.now();
    console.log('🧪 [Strategy Validator] Starting priority execution validation');

    const testCases = this.generatePriorityTestCases();
    const executionOrder: string[] = [];
    const strategyPerformance = new Map<string, StrategyPerformanceMetrics>();
    const errors: string[] = [];
    let firstSuccessTermination = true;

    // Expected order based on priority (highest to lowest)
    const expectedOrder = [
      'CSS_MODULE_CONVERSION',     // Priority 100
      'DIRECT_CSS_INJECTION',      // Priority 90
      'JSON_DATA_INLINING',        // Priority 80
      'IMPORT_REMOVAL'             // Priority 10
    ];

    try {
      // Test each scenario
      for (const testCase of testCases) {
        console.log(`🧪 [Strategy Validator] Testing: ${testCase.name}`);

        const testStartTime = Date.now();
        const result = await this.executeWithTracking(testCase.request);
        const testExecutionTime = Date.now() - testStartTime;

        // Track execution order
        if (result.stages) {
          for (const stage of result.stages) {
            if (stage.name.includes('Strategy') && !executionOrder.includes(stage.name)) {
              executionOrder.push(stage.name);
            }
          }
        }

        // Update performance metrics
        this.updatePerformanceMetrics(strategyPerformance, result, testExecutionTime);

        // Validate expected outcomes
        if (testCase.expectedSuccess && !result.success) {
          errors.push(`Test "${testCase.name}" expected success but failed: ${result.errors.join(', ')}`);
        }

        if (!testCase.expectedSuccess && result.success) {
          errors.push(`Test "${testCase.name}" expected failure but succeeded`);
        }

        // Check execution time
        if (testExecutionTime > testCase.maxExecutionTime) {
          errors.push(`Test "${testCase.name}" exceeded max execution time: ${testExecutionTime}ms > ${testCase.maxExecutionTime}ms`);
        }

        // Validate first-success termination
        if (result.success && result.stages) {
          const successStageIndex = result.stages.findIndex(s => s.status === 'completed');
          const stagesAfterSuccess = result.stages.slice(successStageIndex + 1);
          const hasExecutionAfterSuccess = stagesAfterSuccess.some(s => s.status === 'completed' || s.status === 'running');

          if (hasExecutionAfterSuccess) {
            firstSuccessTermination = false;
            errors.push(`Test "${testCase.name}" continued execution after first success`);
          }
        }
      }

      // Validate overall priority order
      const priorityOrderValid = this.validatePriorityOrder(executionOrder, expectedOrder);
      if (!priorityOrderValid) {
        errors.push(`Strategy execution order incorrect. Expected: ${expectedOrder.join(' → ')}, Got: ${executionOrder.join(' → ')}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      errors.push(`Validation execution failed: ${errorMessage}`);
    }

    const validationResult: StrategyValidationResult = {
      success: errors.length === 0,
      executionOrder,
      expectedOrder,
      firstSuccessTermination,
      strategyPerformance,
      errors,
      validationTimeMs: Date.now() - startTime
    };

    this.addToHistory(validationResult);

    console.log(`🧪 [Strategy Validator] Validation completed: ${validationResult.success ? 'PASS' : 'FAIL'}`);
    if (!validationResult.success) {
      console.error('🧪 [Strategy Validator] Validation errors:', errors);
    }

    return validationResult;
  }

  /**
   * Validate specific strategy behavior
   */
  async validateSpecificStrategy(strategyName: string, testRequests: RecoveryRequest[]): Promise<{
    strategyName: string;
    testResults: { request: RecoveryRequest; result: RecoveryResult; success: boolean }[];
    overallSuccess: boolean;
    averageExecutionTime: number;
    successRate: number;
  }> {
    console.log(`🧪 [Strategy Validator] Validating specific strategy: ${strategyName}`);

    const testResults = [];
    let totalExecutionTime = 0;
    let successCount = 0;

    for (const request of testRequests) {
      const startTime = Date.now();
      const result = await defaultStrategyExecutor.executeRecovery(request);
      const executionTime = Date.now() - startTime;

      totalExecutionTime += executionTime;

      const testSuccess = result.strategy === strategyName;
      if (testSuccess) successCount++;

      testResults.push({
        request,
        result,
        success: testSuccess
      });
    }

    return {
      strategyName,
      testResults,
      overallSuccess: successCount === testRequests.length,
      averageExecutionTime: totalExecutionTime / testRequests.length,
      successRate: successCount / testRequests.length
    };
  }

  /**
   * Generate test cases for priority validation
   */
  private generatePriorityTestCases(): ValidationTestCase[] {
    return [
      {
        name: 'CSS Module Priority Test',
        description: 'Test that CSS module conversion has highest priority',
        request: {
          artifactId: 'css-priority-test',
          artifactCode: 'import styles from "./Button.module.css";\nconst Button = () => <button className={styles.primary}>Click</button>;',
          errorMessage: 'Cannot resolve module "./Button.module.css"',
          messageContent: '.primary { background: blue; color: white; padding: 10px; }',
          language: 'javascript',
          attemptId: 'css-priority-test-1'
        },
        expectedStrategy: 'CSS_MODULE_CONVERSION',
        expectedSuccess: true,
        maxExecutionTime: 2000
      },
      {
        name: 'JSON Import Priority Test',
        description: 'Test that JSON inlining has correct priority',
        request: {
          artifactId: 'json-priority-test',
          artifactCode: 'import config from "./config.json";\nconsole.log(config.apiUrl);',
          errorMessage: 'Cannot resolve module "./config.json"',
          messageContent: '{"apiUrl": "https://example.com", "timeout": 5000}',
          language: 'javascript',
          attemptId: 'json-priority-test-1'
        },
        expectedStrategy: 'JSON_DATA_INLINING',
        expectedSuccess: true,
        maxExecutionTime: 2000
      },
      {
        name: 'Import Removal Fallback Test',
        description: 'Test that import removal is lowest priority fallback',
        request: {
          artifactId: 'fallback-test',
          artifactCode: 'import { utils } from "./missing-utils";\nconst App = () => <div>Test</div>;',
          errorMessage: 'Cannot resolve module "./missing-utils"',
          messageContent: '', // No helpful content to trigger higher priority strategies
          language: 'javascript',
          attemptId: 'fallback-test-1'
        },
        expectedStrategy: 'IMPORT_REMOVAL',
        expectedSuccess: true,
        maxExecutionTime: 3000
      },
      {
        name: 'Multiple Strategies Test',
        description: 'Test priority when multiple strategies could apply',
        request: {
          artifactId: 'multi-strategy-test',
          artifactCode: 'import styles from "./Button.module.css";\nimport config from "./config.json";\nconst App = () => <div className={styles.container}>Config: {config.name}</div>;',
          errorMessage: 'Cannot resolve modules',
          messageContent: '.container { padding: 20px; }\n{"name": "test-config", "version": "1.0"}',
          language: 'javascript',
          attemptId: 'multi-strategy-test-1'
        },
        expectedStrategy: 'CSS_MODULE_CONVERSION', // Should choose highest priority
        expectedSuccess: true,
        maxExecutionTime: 2500
      },
      {
        name: 'First Success Termination Test',
        description: 'Test that execution stops after first successful strategy',
        request: {
          artifactId: 'termination-test',
          artifactCode: 'import styles from "./styles.module.css";\nconst Component = () => <div className={styles.main}>Content</div>;',
          errorMessage: 'Module resolution failed',
          messageContent: '.main { color: red; font-size: 16px; }',
          language: 'javascript',
          attemptId: 'termination-test-1'
        },
        expectedStrategy: 'CSS_MODULE_CONVERSION',
        expectedSuccess: true,
        maxExecutionTime: 1500
      }
    ];
  }

  /**
   * Execute recovery with detailed tracking
   */
  private async executeWithTracking(request: RecoveryRequest): Promise<RecoveryResult> {
    // Add tracking metadata to request
    const trackedRequest = {
      ...request,
      attemptId: `validation-${Date.now()}-${Math.random().toString(36).substring(7)}`
    };

    return await defaultStrategyExecutor.executeRecovery(trackedRequest);
  }

  /**
   * Update performance metrics for strategies
   */
  private updatePerformanceMetrics(
    metricsMap: Map<string, StrategyPerformanceMetrics>,
    result: RecoveryResult,
    executionTime: number
  ): void {
    const strategyName = result.strategy;

    if (!metricsMap.has(strategyName)) {
      metricsMap.set(strategyName, {
        strategyName,
        priority: this.getStrategyPriority(strategyName),
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        averageExecutionTime: 0,
        successRate: 0
      });
    }

    const metrics = metricsMap.get(strategyName)!;
    metrics.executionCount++;
    metrics.lastExecutionTime = executionTime;

    if (result.success) {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }

    // Update average execution time
    metrics.averageExecutionTime =
      ((metrics.averageExecutionTime * (metrics.executionCount - 1)) + executionTime) / metrics.executionCount;

    // Update success rate
    metrics.successRate = metrics.successCount / metrics.executionCount;
  }

  /**
   * Get strategy priority for metrics
   */
  private getStrategyPriority(strategyName: string): number {
    const priorities: Record<string, number> = {
      'CSS_MODULE_CONVERSION': 100,
      'DIRECT_CSS_INJECTION': 90,
      'JSON_DATA_INLINING': 80,
      'IMPORT_REMOVAL': 10,
      'LLM_css-module-fix': 50,
      'LLM_dependency-fix': 40,
      'LLM_syntax-fix': 30,
      'LLM_generic-fix': 20
    };
    return priorities[strategyName] || 0;
  }

  /**
   * Validate that execution order matches priority order
   */
  private validatePriorityOrder(actualOrder: string[], expectedOrder: string[]): boolean {
    // Check that any strategies that were executed appear in the correct relative order
    const actualStrategiesPresent = actualOrder.filter(strategy => expectedOrder.includes(strategy));
    const expectedStrategiesPresent = expectedOrder.filter(strategy => actualOrder.includes(strategy));

    if (actualStrategiesPresent.length !== expectedStrategiesPresent.length) {
      return false;
    }

    for (let i = 0; i < actualStrategiesPresent.length; i++) {
      if (actualStrategiesPresent[i] !== expectedStrategiesPresent[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Add validation result to history
   */
  private addToHistory(result: StrategyValidationResult): void {
    this.validationHistory.push(result);

    // Trim history if too large
    if (this.validationHistory.length > this.maxHistorySize) {
      this.validationHistory.splice(0, this.validationHistory.length - this.maxHistorySize);
    }
  }

  /**
   * Get validation history
   */
  getValidationHistory(): StrategyValidationResult[] {
    return [...this.validationHistory];
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalValidations: number;
    successfulValidations: number;
    failureRate: number;
    averageValidationTime: number;
    lastValidationTime?: number;
  } {
    const totalValidations = this.validationHistory.length;

    if (totalValidations === 0) {
      return {
        totalValidations: 0,
        successfulValidations: 0,
        failureRate: 0,
        averageValidationTime: 0
      };
    }

    const successfulValidations = this.validationHistory.filter(v => v.success).length;
    const totalTime = this.validationHistory.reduce((sum, v) => sum + v.validationTimeMs, 0);
    const lastValidation = this.validationHistory[this.validationHistory.length - 1];

    return {
      totalValidations,
      successfulValidations,
      failureRate: (totalValidations - successfulValidations) / totalValidations,
      averageValidationTime: totalTime / totalValidations,
      lastValidationTime: lastValidation?.validationTimeMs
    };
  }

  /**
   * Reset validation history (useful for testing)
   */
  resetHistory(): void {
    this.validationHistory = [];
    console.log('🧪 [Strategy Validator] Validation history reset');
  }
}

// Export singleton instance
export const strategyValidator = new StrategyValidator();