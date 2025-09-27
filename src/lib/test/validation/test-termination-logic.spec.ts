/**
 * First-Success Termination Logic Validation Tests
 *
 * These tests validate that the dependency resolution system properly
 * terminates execution after the first successful strategy, preventing
 * unnecessary processing and ensuring optimal performance.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defaultStrategyExecutor, type RecoveryRequest, type RecoveryResult } from '../../services/artifact-dependency-resolver/strategy-executor';
import { strategyValidator } from '../../services/artifact-dependency-resolver/strategy-validator';

describe('First-Success Termination Logic Validation', () => {
  beforeEach(() => {
    // Reset any state
    vi.clearAllMocks();
  });

  describe('Single Strategy Success', () => {
    it('should terminate immediately after first successful strategy', async () => {
      const request: RecoveryRequest = {
        artifactId: 'single-success-test',
        artifactCode: 'import styles from "./Button.module.css";\nconst Button = () => <button className={styles.primary}>Click</button>;',
        errorMessage: 'Cannot resolve module "./Button.module.css"',
        messageContent: '.primary { background: blue; color: white; padding: 10px; }',
        language: 'javascript',
        attemptId: 'single-success-test-1'
      };

      const startTime = Date.now();
      const result = await defaultStrategyExecutor.executeRecovery(request);
      const executionTime = Date.now() - startTime;

      // Should succeed with CSS module strategy
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('CSS_MODULE_CONVERSION');

      // Should complete quickly (not trying multiple strategies)
      expect(executionTime).toBeLessThan(2000);

      // Verify only one strategy was executed by checking stages
      if (result.stages) {
        const strategyStages = result.stages.filter(stage =>
          stage.name.includes('Strategy') && stage.status === 'completed'
        );
        expect(strategyStages.length).toBe(1);
      }
    });

    it('should not execute lower priority strategies after success', async () => {
      const request: RecoveryRequest = {
        artifactId: 'no-lower-priority-test',
        artifactCode: 'import config from "./config.json";\nconsole.log(config.apiUrl);',
        errorMessage: 'Cannot resolve module "./config.json"',
        messageContent: '{"apiUrl": "https://example.com", "timeout": 5000}',
        language: 'javascript',
        attemptId: 'no-lower-priority-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      // Should succeed with JSON inlining
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('JSON_DATA_INLINING');

      // Verify that import removal (lower priority) was not executed
      if (result.stages) {
        const importRemovalStages = result.stages.filter(stage =>
          stage.name.includes('IMPORT_REMOVAL')
        );
        expect(importRemovalStages.length).toBe(0);
      }
    });
  });

  describe('Multiple Strategy Potential', () => {
    it('should choose highest priority strategy and terminate', async () => {
      const request: RecoveryRequest = {
        artifactId: 'multiple-strategy-test',
        artifactCode: `
          import styles from "./Button.module.css";
          import config from "./config.json";
          import { utils } from "./utils";

          const Button = () => (
            <button className={styles.primary} onClick={() => console.log(config.apiUrl)}>
              {utils.formatText('Click me')}
            </button>
          );
        `,
        errorMessage: 'Cannot resolve multiple modules',
        messageContent: `
          .primary { background: blue; color: white; }
          {"apiUrl": "https://example.com"}
        `,
        language: 'javascript',
        attemptId: 'multiple-strategy-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      // Should succeed with highest priority strategy (CSS Module)
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('CSS_MODULE_CONVERSION');

      // Should not execute JSON or import removal strategies
      if (result.stages) {
        const executedStrategies = result.stages
          .filter(stage => stage.name.includes('Strategy') && stage.status === 'completed')
          .map(stage => stage.name);

        expect(executedStrategies.length).toBe(1);
        expect(executedStrategies[0]).toContain('CSS');
      }
    });

    it('should terminate even if multiple errors could be resolved', async () => {
      const request: RecoveryRequest = {
        artifactId: 'multi-error-termination-test',
        artifactCode: `
          import styles from "./styles.module.css";
          import data from "./data.json";

          const Component = () => {
            return (
              <div className={styles.container}>
                <p>{data.message}</p>
              </div>
            );
          };
        `,
        errorMessage: 'Multiple module resolution failures',
        messageContent: `
          .container { padding: 20px; background: #f5f5f5; }
          {"message": "Hello World", "theme": "light"}
        `,
        language: 'javascript',
        attemptId: 'multi-error-termination-test-1'
      };

      const startTime = Date.now();
      const result = await defaultStrategyExecutor.executeRecovery(request);
      const executionTime = Date.now() - startTime;

      // Should terminate after first success
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('CSS_MODULE_CONVERSION');

      // Should complete quickly (not processing all possible fixes)
      expect(executionTime).toBeLessThan(3000);
    });
  });

  describe('Strategy Execution Monitoring', () => {
    it('should track execution stages and verify termination', async () => {
      const request: RecoveryRequest = {
        artifactId: 'execution-monitoring-test',
        artifactCode: 'import styles from "./test.module.css";\nconst Test = () => <div className={styles.test}>Test</div>;',
        errorMessage: 'Module not found',
        messageContent: '.test { color: green; }',
        language: 'javascript',
        attemptId: 'execution-monitoring-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      expect(result.stages).toBeDefined();
      expect(Array.isArray(result.stages)).toBe(true);

      // Verify stage progression
      const stages = result.stages!;

      // Should have circuit breaker check
      expect(stages.some(s => s.name === 'Circuit Breaker Check')).toBe(true);

      // Should have intent classification
      expect(stages.some(s => s.name === 'Intent Classification')).toBe(true);

      // Should have strategy execution
      const strategyStages = stages.filter(s => s.name.includes('Strategy'));
      expect(strategyStages.length).toBeGreaterThan(0);

      // Should NOT have multiple completed strategy stages
      const completedStrategyStages = strategyStages.filter(s => s.status === 'completed');
      expect(completedStrategyStages.length).toBe(1);
    });

    it('should provide detailed execution metrics for termination analysis', async () => {
      const request: RecoveryRequest = {
        artifactId: 'metrics-analysis-test',
        artifactCode: 'import config from "./app-config.json";\nconst app = { apiUrl: config.apiUrl };',
        errorMessage: 'Config module not found',
        messageContent: '{"apiUrl": "https://api.test.com", "version": "1.0"}',
        language: 'javascript',
        attemptId: 'metrics-analysis-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);

      // Should have terminated after JSON strategy
      expect(result.strategy).toBe('JSON_DATA_INLINING');

      // Processing time should be reasonable for single strategy
      expect(result.processingTimeMs).toBeLessThan(5000);
    });
  });

  describe('Failure Chain Termination', () => {
    it('should continue to next strategy if current one fails', async () => {
      const request: RecoveryRequest = {
        artifactId: 'failure-chain-test',
        artifactCode: 'import { missing } from "./non-existent-module";\nconst App = () => <div>Test</div>;',
        errorMessage: 'Cannot resolve module "./non-existent-module"',
        messageContent: '', // No CSS or JSON data to make higher strategies work
        language: 'javascript',
        attemptId: 'failure-chain-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      // Should eventually succeed with import removal (fallback)
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('IMPORT_REMOVAL');

      // Should have tried strategies in order until one succeeded
      if (result.stages) {
        const strategyStages = result.stages.filter(s => s.name.includes('Strategy'));

        // Should have multiple stages (tried and failed some, succeeded with one)
        expect(strategyStages.length).toBeGreaterThan(1);

        // But only one should be completed (the successful one)
        const completedStages = strategyStages.filter(s => s.status === 'completed');
        expect(completedStages.length).toBe(1);
      }
    });

    it('should terminate after all strategies fail', async () => {
      const request: RecoveryRequest = {
        artifactId: 'all-fail-termination-test',
        artifactCode: 'const broken = {{{ invalid syntax',
        errorMessage: 'Syntax error: invalid code structure',
        messageContent: '',
        language: 'javascript',
        attemptId: 'all-fail-termination-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      // Should fail but terminate properly
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Should have attempted strategies but terminated after failures
      if (result.stages) {
        const stages = result.stages;
        expect(stages.length).toBeGreaterThan(0);

        // Should not have any completed strategy stages
        const completedStrategyStages = stages.filter(s =>
          s.name.includes('Strategy') && s.status === 'completed'
        );
        expect(completedStrategyStages.length).toBe(0);
      }
    });
  });

  describe('Performance Impact of Termination', () => {
    it('should demonstrate performance benefit of early termination', async () => {
      // Test that early termination is significantly faster than processing all strategies
      const earlySuccessRequest: RecoveryRequest = {
        artifactId: 'early-success-perf-test',
        artifactCode: 'import styles from "./perf.module.css";\nconst Perf = () => <div className={styles.fast}>Fast</div>;',
        errorMessage: 'Module resolution failed',
        messageContent: '.fast { color: blue; }',
        language: 'javascript',
        attemptId: 'early-success-perf-test-1'
      };

      const lateSuccessRequest: RecoveryRequest = {
        artifactId: 'late-success-perf-test',
        artifactCode: 'import { utils } from "./missing-utils";\nconst Slow = () => <div>Slow</div>;',
        errorMessage: 'Module resolution failed',
        messageContent: '', // Forces fallback to import removal
        language: 'javascript',
        attemptId: 'late-success-perf-test-1'
      };

      const earlyStart = Date.now();
      const earlyResult = await defaultStrategyExecutor.executeRecovery(earlySuccessRequest);
      const earlyTime = Date.now() - earlyStart;

      const lateStart = Date.now();
      const lateResult = await defaultStrategyExecutor.executeRecovery(lateSuccessRequest);
      const lateTime = Date.now() - lateStart;

      // Both should succeed
      expect(earlyResult.success).toBe(true);
      expect(lateResult.success).toBe(true);

      // Early termination should be faster
      expect(earlyTime).toBeLessThan(lateTime);

      // Early success should use high-priority strategy
      expect(earlyResult.strategy).toBe('CSS_MODULE_CONVERSION');

      // Late success should use low-priority strategy
      expect(lateResult.strategy).toBe('IMPORT_REMOVAL');

      console.log(`Early termination: ${earlyTime}ms, Late termination: ${lateTime}ms`);
    });

    it('should maintain reasonable processing time limits', async () => {
      const request: RecoveryRequest = {
        artifactId: 'time-limit-test',
        artifactCode: `
          import styles from "./complex.module.css";
          import config from "./complex-config.json";
          import { utils } from "./complex-utils";

          const Complex = () => (
            <div className={styles.container}>
              <p>{config.message}</p>
              <span>{utils.format('test')}</span>
            </div>
          );
        `,
        errorMessage: 'Complex module resolution failures',
        messageContent: '.container { background: red; }',
        language: 'javascript',
        attemptId: 'time-limit-test-1'
      };

      const startTime = Date.now();
      const result = await defaultStrategyExecutor.executeRecovery(request);
      const executionTime = Date.now() - startTime;

      // Should succeed with first applicable strategy
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('CSS_MODULE_CONVERSION');

      // Should complete within reasonable time (early termination)
      expect(executionTime).toBeLessThan(3000);
    });
  });

  describe('Strategy Validator Integration', () => {
    it('should validate termination logic through strategy validator', async () => {
      const validationResult = await strategyValidator.validateStrategyPriorityExecution();

      expect(validationResult).toBeDefined();
      expect(validationResult.success).toBe(true);
      expect(validationResult.firstSuccessTermination).toBe(true);

      // Should have correct execution order
      expect(validationResult.executionOrder.length).toBeGreaterThan(0);
      expect(validationResult.expectedOrder.length).toBeGreaterThan(0);

      // Should not have errors related to termination
      const terminationErrors = validationResult.errors.filter(error =>
        error.includes('continued execution') || error.includes('termination')
      );
      expect(terminationErrors.length).toBe(0);
    });
  });
});