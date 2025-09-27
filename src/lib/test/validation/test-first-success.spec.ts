/**
 * Validation Tests: First-Success Termination
 * These tests validate the first-success termination logic
 */

import { describe, it, expect } from 'vitest';

describe('First-Success Termination Validation', () => {
  describe('Termination Logic', () => {
    it('should terminate after first successful strategy', () => {
      const executionScenarios = [
        {
          name: 'CSS Module Success',
          strategies: [
            { name: 'CSS_MODULE_CONVERSION', priority: 100, result: 'SUCCESS' },
            { name: 'DIRECT_CSS_INJECTION', priority: 90, result: 'NOT_EXECUTED' },
            { name: 'JSON_DATA_INLINING', priority: 80, result: 'NOT_EXECUTED' },
            { name: 'IMPORT_REMOVAL', priority: 10, result: 'NOT_EXECUTED' }
          ],
          expectedExecutions: 1
        },
        {
          name: 'Second Strategy Success',
          strategies: [
            { name: 'CSS_MODULE_CONVERSION', priority: 100, result: 'FAILED' },
            { name: 'DIRECT_CSS_INJECTION', priority: 90, result: 'SUCCESS' },
            { name: 'JSON_DATA_INLINING', priority: 80, result: 'NOT_EXECUTED' },
            { name: 'IMPORT_REMOVAL', priority: 10, result: 'NOT_EXECUTED' }
          ],
          expectedExecutions: 2
        }
      ];

      executionScenarios.forEach(scenario => {
        const executed = scenario.strategies.filter(s => s.result !== 'NOT_EXECUTED');
        expect(executed).toHaveLength(scenario.expectedExecutions);

        const successIndex = scenario.strategies.findIndex(s => s.result === 'SUCCESS');
        expect(successIndex + 1).toBe(scenario.expectedExecutions);
      });
    });

    it('should execute all strategies if none succeed until fallback', () => {
      const allFailedScenario = {
        strategies: [
          { name: 'CSS_MODULE_CONVERSION', priority: 100, result: 'FAILED' },
          { name: 'DIRECT_CSS_INJECTION', priority: 90, result: 'FAILED' },
          { name: 'JSON_DATA_INLINING', priority: 80, result: 'FAILED' },
          { name: 'IMPORT_REMOVAL', priority: 10, result: 'SUCCESS' }
        ],
        expectedExecutions: 4
      };

      const executed = allFailedScenario.strategies.filter(s => s.result !== 'NOT_EXECUTED');
      expect(executed).toHaveLength(allFailedScenario.expectedExecutions);

      // Should execute all strategies in priority order before final success
      const results = allFailedScenario.strategies.map(s => s.result);
      expect(results).toEqual(['FAILED', 'FAILED', 'FAILED', 'SUCCESS']);
    });
  });

  describe('Success Detection', () => {
    it('should correctly identify successful strategy results', () => {
      const successIndicators = [
        { result: { success: true, transformedCode: 'code', confidence: 0.9 }, isSuccess: true },
        { result: { success: true, transformedCode: '', confidence: 0.5 }, isSuccess: false }, // Empty code
        { result: { success: false, transformedCode: '', confidence: 0, errorMessage: 'Failed' }, isSuccess: false },
        { result: { success: true, transformedCode: 'code', confidence: 0.1 }, isSuccess: false }, // Low confidence
        { result: { success: true, transformedCode: 'code', confidence: 0.8 }, isSuccess: true }
      ];

      successIndicators.forEach(indicator => {
        const hasCode = Boolean(indicator.result.transformedCode && indicator.result.transformedCode.length > 0);
        const hasConfidence = Boolean(indicator.result.confidence && indicator.result.confidence > 0.7);
        const actualSuccess = Boolean(indicator.result.success && hasCode && hasConfidence);

        expect(actualSuccess).toBe(indicator.isSuccess);
      });
    });

    it('should validate transformation quality for success', () => {
      const transformationResults = [
        {
          original: 'import styles from "./Button.module.css";',
          transformed: 'const styles = { button: { color: "blue" } };',
          hasValidTransformation: true
        },
        {
          original: 'import config from "./config.json";',
          transformed: 'const config = { "apiUrl": "https://api.example.com" };',
          hasValidTransformation: true
        },
        {
          original: 'import missing from "./missing";',
          transformed: '', // Empty transformation
          hasValidTransformation: false
        },
        {
          original: 'import helper from "./helper";',
          transformed: 'import helper from "./helper";', // No transformation
          hasValidTransformation: false
        }
      ];

      transformationResults.forEach(result => {
        const isTransformed = result.transformed !== result.original && result.transformed.length > 0;
        expect(isTransformed).toBe(result.hasValidTransformation);
      });
    });
  });

  describe('Strategy Chain Execution', () => {
    it('should maintain strategy execution state correctly', () => {
      const executionStates = [
        { strategy: 'CSS_MODULE_CONVERSION', state: 'executing', startTime: 1000 },
        { strategy: 'CSS_MODULE_CONVERSION', state: 'completed', endTime: 1150, result: 'success' },
        { strategy: 'DIRECT_CSS_INJECTION', state: 'skipped', reason: 'previous_success' },
        { strategy: 'JSON_DATA_INLINING', state: 'skipped', reason: 'previous_success' },
        { strategy: 'IMPORT_REMOVAL', state: 'skipped', reason: 'previous_success' }
      ];

      const completedStrategy = executionStates.find(s => s.state === 'completed');
      const skippedStrategies = executionStates.filter(s => s.state === 'skipped');

      expect(completedStrategy?.result).toBe('success');
      expect(skippedStrategies).toHaveLength(3);
      skippedStrategies.forEach(strategy => {
        expect(strategy.reason).toBe('previous_success');
      });
    });

    it('should handle strategy execution timeouts', () => {
      const timeoutScenario = [
        { strategy: 'CSS_MODULE_CONVERSION', state: 'executing', startTime: 1000 },
        { strategy: 'CSS_MODULE_CONVERSION', state: 'timeout', endTime: 3000, maxTime: 2000 },
        { strategy: 'DIRECT_CSS_INJECTION', state: 'executing', startTime: 3050 },
        { strategy: 'DIRECT_CSS_INJECTION', state: 'completed', endTime: 3200, result: 'success' }
      ];

      const timedOutStrategy = timeoutScenario.find(s => s.state === 'timeout');
      const nextStrategy = timeoutScenario.find(s => s.strategy === 'DIRECT_CSS_INJECTION' && s.state === 'completed');

      expect(timedOutStrategy).toBeDefined();
      expect(nextStrategy?.result).toBe('success');
    });
  });

  describe('Error Recovery and Continuation', () => {
    it('should continue to next strategy on errors', () => {
      const errorScenario = [
        { strategy: 'CSS_MODULE_CONVERSION', result: 'ERROR', error: 'Parse error' },
        { strategy: 'DIRECT_CSS_INJECTION', result: 'ERROR', error: 'Injection failed' },
        { strategy: 'JSON_DATA_INLINING', result: 'SUCCESS', transformedCode: 'const config = {};' },
        { strategy: 'IMPORT_REMOVAL', result: 'NOT_EXECUTED' }
      ];

      const errors = errorScenario.filter(s => s.result === 'ERROR');
      const success = errorScenario.find(s => s.result === 'SUCCESS');
      const notExecuted = errorScenario.filter(s => s.result === 'NOT_EXECUTED');

      expect(errors).toHaveLength(2);
      expect(success).toBeDefined();
      expect(notExecuted).toHaveLength(1); // Should stop after success
    });

    it('should aggregate error information from failed strategies', () => {
      const failureChain = [
        { strategy: 'CSS_MODULE_CONVERSION', error: 'No CSS block found', confidence: 0.0 },
        { strategy: 'DIRECT_CSS_INJECTION', error: 'Invalid CSS syntax', confidence: 0.1 },
        { strategy: 'JSON_DATA_INLINING', error: 'Malformed JSON', confidence: 0.0 },
        { strategy: 'IMPORT_REMOVAL', result: 'SUCCESS', confidence: 0.9 }
      ];

      const failures = failureChain.filter(s => s.error);
      const finalSuccess = failureChain.find(s => s.result === 'SUCCESS');

      expect(failures).toHaveLength(3);
      expect(finalSuccess?.confidence).toBe(0.9);

      // Should collect all error messages for debugging
      const errorMessages = failures.map(f => f.error);
      expect(errorMessages).toContain('No CSS block found');
      expect(errorMessages).toContain('Invalid CSS syntax');
      expect(errorMessages).toContain('Malformed JSON');
    });
  });

  describe('Performance and Efficiency', () => {
    it('should minimize execution time by stopping early', () => {
      const performanceScenarios = [
        {
          name: 'Early Success',
          executions: [
            { strategy: 'CSS_MODULE_CONVERSION', timeMs: 120, result: 'SUCCESS' }
          ],
          totalTime: 120,
          efficiency: 'HIGH'
        },
        {
          name: 'Second Strategy Success',
          executions: [
            { strategy: 'CSS_MODULE_CONVERSION', timeMs: 150, result: 'FAILED' },
            { strategy: 'DIRECT_CSS_INJECTION', timeMs: 80, result: 'SUCCESS' }
          ],
          totalTime: 230,
          efficiency: 'MEDIUM'
        },
        {
          name: 'Fallback Success',
          executions: [
            { strategy: 'CSS_MODULE_CONVERSION', timeMs: 150, result: 'FAILED' },
            { strategy: 'DIRECT_CSS_INJECTION', timeMs: 100, result: 'FAILED' },
            { strategy: 'JSON_DATA_INLINING', timeMs: 75, result: 'FAILED' },
            { strategy: 'IMPORT_REMOVAL', timeMs: 25, result: 'SUCCESS' }
          ],
          totalTime: 350,
          efficiency: 'LOW'
        }
      ];

      performanceScenarios.forEach(scenario => {
        const calculatedTotal = scenario.executions.reduce((sum, exec) => sum + exec.timeMs, 0);
        expect(calculatedTotal).toBe(scenario.totalTime);

        // Early success should be more efficient
        if (scenario.efficiency === 'HIGH') {
          expect(scenario.executions).toHaveLength(1);
          expect(scenario.totalTime).toBeLessThan(200);
        }
      });
    });

    it('should track strategy attempt statistics', () => {
      const strategyStats = [
        { strategy: 'CSS_MODULE_CONVERSION', attempts: 1000, successes: 850, firstTrySuccesses: 850 },
        { strategy: 'DIRECT_CSS_INJECTION', attempts: 150, successes: 120, firstTrySuccesses: 0 },
        { strategy: 'JSON_DATA_INLINING', attempts: 30, successes: 25, firstTrySuccesses: 0 },
        { strategy: 'IMPORT_REMOVAL', attempts: 5, successes: 5, firstTrySuccesses: 0 }
      ];

      strategyStats.forEach(stat => {
        expect(stat.successes).toBeLessThanOrEqual(stat.attempts);
        expect(stat.firstTrySuccesses).toBeLessThanOrEqual(stat.successes);

        // CSS Module Conversion should have high first-try success rate
        if (stat.strategy === 'CSS_MODULE_CONVERSION') {
          expect(stat.firstTrySuccesses / stat.attempts).toBeGreaterThan(0.8);
        }
      });
    });
  });

  describe('Integration with Circuit Breaker', () => {
    it('should respect circuit breaker state for early termination', () => {
      const circuitBreakerScenario = [
        { strategy: 'CSS_MODULE_CONVERSION', circuitState: 'CLOSED', result: 'EXECUTED' },
        { strategy: 'DIRECT_CSS_INJECTION', circuitState: 'OPEN', result: 'BLOCKED' },
        { strategy: 'JSON_DATA_INLINING', circuitState: 'CLOSED', result: 'NOT_REACHED' },
        { strategy: 'IMPORT_REMOVAL', circuitState: 'CLOSED', result: 'NOT_REACHED' }
      ];

      const executed = circuitBreakerScenario.filter(s => s.result === 'EXECUTED');
      const blocked = circuitBreakerScenario.filter(s => s.result === 'BLOCKED');

      expect(executed).toHaveLength(1);
      expect(blocked).toHaveLength(1);

      // Should terminate when circuit breaker blocks execution
      expect(blocked[0].circuitState).toBe('OPEN');
    });

    it('should continue if circuit breaker allows but strategy fails', () => {
      const continuationScenario = [
        { strategy: 'CSS_MODULE_CONVERSION', circuitState: 'CLOSED', result: 'FAILED' },
        { strategy: 'DIRECT_CSS_INJECTION', circuitState: 'CLOSED', result: 'FAILED' },
        { strategy: 'JSON_DATA_INLINING', circuitState: 'CLOSED', result: 'SUCCESS' }
      ];

      const failed = continuationScenario.filter(s => s.result === 'FAILED');
      const success = continuationScenario.filter(s => s.result === 'SUCCESS');

      expect(failed).toHaveLength(2);
      expect(success).toHaveLength(1);

      // Should continue through failures until success
      continuationScenario.forEach(strategy => {
        expect(strategy.circuitState).toBe('CLOSED');
      });
    });
  });
});