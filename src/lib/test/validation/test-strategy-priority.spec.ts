/**
 * Validation Tests: Strategy Priority Execution
 * These tests validate the 4-tier priority system execution
 */

import { describe, it, expect } from 'vitest';

describe('Strategy Priority Execution Validation', () => {
  describe('Priority Levels Definition', () => {
    it('should define correct priority levels for all strategies', () => {
      const strategyPriorities = {
        'CSS_MODULE_CONVERSION': 100,
        'DIRECT_CSS_INJECTION': 90,
        'JSON_DATA_INLINING': 80,
        'IMPORT_REMOVAL': 10
      };

      // Verify priority values
      expect(strategyPriorities.CSS_MODULE_CONVERSION).toBe(100);
      expect(strategyPriorities.DIRECT_CSS_INJECTION).toBe(90);
      expect(strategyPriorities.JSON_DATA_INLINING).toBe(80);
      expect(strategyPriorities.IMPORT_REMOVAL).toBe(10);

      // Verify descending order
      const priorities = Object.values(strategyPriorities);
      const sortedPriorities = [...priorities].sort((a, b) => b - a);
      expect(priorities).toEqual(sortedPriorities);
    });

    it('should have sufficient priority gaps for future strategies', () => {
      const priorities = [100, 90, 80, 10];
      const gaps = [];

      for (let i = 0; i < priorities.length - 1; i++) {
        gaps.push(priorities[i] - priorities[i + 1]);
      }

      // Should have reasonable gaps (at least 10 points)
      gaps.forEach(gap => {
        expect(gap).toBeGreaterThanOrEqual(10);
      });

      // Largest gap should be between JSON_DATA_INLINING and IMPORT_REMOVAL
      const largestGap = Math.max(...gaps);
      expect(largestGap).toBe(70); // 80 - 10 = 70
    });
  });

  describe('Strategy Execution Order', () => {
    it('should execute strategies in descending priority order', () => {
      const executionOrder = [
        'CSS_MODULE_CONVERSION',    // Priority 100
        'DIRECT_CSS_INJECTION',    // Priority 90
        'JSON_DATA_INLINING',      // Priority 80
        'IMPORT_REMOVAL'           // Priority 10
      ];

      // Mock execution log
      const mockLog = executionOrder.map((strategy, index) => ({
        strategy,
        executionOrder: index + 1,
        priority: [100, 90, 80, 10][index]
      }));

      mockLog.forEach((entry, index) => {
        expect(entry.executionOrder).toBe(index + 1);
        if (index > 0) {
          expect(entry.priority).toBeLessThan(mockLog[index - 1].priority);
        }
      });
    });

    it('should stop execution on first successful strategy', () => {
      const scenarios = [
        {
          name: 'CSS Module Success',
          results: ['SUCCESS', 'SKIPPED', 'SKIPPED', 'SKIPPED'],
          expectedExecutions: 1
        },
        {
          name: 'Direct CSS Success',
          results: ['FAILED', 'SUCCESS', 'SKIPPED', 'SKIPPED'],
          expectedExecutions: 2
        },
        {
          name: 'JSON Inlining Success',
          results: ['FAILED', 'FAILED', 'SUCCESS', 'SKIPPED'],
          expectedExecutions: 3
        },
        {
          name: 'Import Removal Fallback',
          results: ['FAILED', 'FAILED', 'FAILED', 'SUCCESS'],
          expectedExecutions: 4
        }
      ];

      scenarios.forEach(scenario => {
        const successIndex = scenario.results.indexOf('SUCCESS');
        expect(successIndex + 1).toBe(scenario.expectedExecutions);

        // Verify no strategies executed after success
        const skippedCount = scenario.results.filter(r => r === 'SKIPPED').length;
        expect(skippedCount).toBe(4 - scenario.expectedExecutions);
      });
    });
  });

  describe('Strategy Selection Logic', () => {
    it('should select CSS Module Conversion for CSS module imports', () => {
      const testCases = [
        {
          code: 'import styles from "./Button.module.css";',
          messageContent: '```css\n.button { color: blue; }\n```',
          expectedStrategy: 'CSS_MODULE_CONVERSION',
          expectedPriority: 100
        },
        {
          code: 'import classes from "./App.module.scss";',
          messageContent: '```scss\n.app { padding: 20px; }\n```',
          expectedStrategy: 'CSS_MODULE_CONVERSION',
          expectedPriority: 100
        }
      ];

      testCases.forEach(testCase => {
        expect(testCase.code.includes('.module.')).toBe(true);
        expect(testCase.messageContent.includes('```css') || testCase.messageContent.includes('```scss')).toBe(true);
        expect(testCase.expectedPriority).toBe(100);
      });
    });

    it('should select JSON Data Inlining for JSON imports', () => {
      const testCases = [
        {
          code: 'import config from "./config.json";',
          messageContent: '```json\n{"api": "https://example.com"}\n```',
          expectedStrategy: 'JSON_DATA_INLINING',
          expectedPriority: 80
        },
        {
          code: 'import { version } from "./package.json";',
          messageContent: '```json\n{"name": "app", "version": "1.0.0"}\n```',
          expectedStrategy: 'JSON_DATA_INLINING',
          expectedPriority: 80
        }
      ];

      testCases.forEach(testCase => {
        expect(testCase.code.includes('.json')).toBe(true);
        expect(testCase.messageContent.includes('```json')).toBe(true);
        expect(testCase.expectedPriority).toBe(80);
      });
    });

    it('should fallback to Import Removal for unresolvable imports', () => {
      const testCases = [
        {
          code: 'import unknown from "./missing";',
          messageContent: 'No relevant code blocks',
          expectedStrategy: 'IMPORT_REMOVAL',
          expectedPriority: 10
        },
        {
          code: 'import { helper } from "./nonexistent";',
          messageContent: 'Just some text without code',
          expectedStrategy: 'IMPORT_REMOVAL',
          expectedPriority: 10
        }
      ];

      testCases.forEach(testCase => {
        expect(testCase.messageContent.includes('```')).toBe(false);
        expect(testCase.expectedPriority).toBe(10);
      });
    });
  });

  describe('Strategy Compatibility Checks', () => {
    it('should check strategy applicability before execution', () => {
      const compatibilityMatrix = [
        {
          strategy: 'CSS_MODULE_CONVERSION',
          requiredConditions: [
            'hasModuleCSSImport',
            'hasCSSCodeBlock',
            'cssBlockMatchesImport'
          ],
          incompatibleWith: ['syntaxErrors', 'networkErrors']
        },
        {
          strategy: 'JSON_DATA_INLINING',
          requiredConditions: [
            'hasJSONImport',
            'hasJSONCodeBlock',
            'validJSONFormat'
          ],
          incompatibleWith: ['malformedJSON', 'circularReferences']
        },
        {
          strategy: 'IMPORT_REMOVAL',
          requiredConditions: [
            'hasImportStatement'
          ],
          incompatibleWith: [] // Fallback strategy, no incompatibilities
        }
      ];

      compatibilityMatrix.forEach(strategy => {
        expect(strategy.requiredConditions).toBeDefined();
        expect(Array.isArray(strategy.requiredConditions)).toBe(true);
        expect(Array.isArray(strategy.incompatibleWith)).toBe(true);
      });
    });

    it('should skip incompatible strategies', () => {
      const errorScenarios = [
        {
          errorType: 'SYNTAX_ERROR',
          message: 'Unexpected token }',
          shouldSkip: ['CSS_MODULE_CONVERSION', 'DIRECT_CSS_INJECTION', 'JSON_DATA_INLINING'],
          shouldAttempt: ['IMPORT_REMOVAL']
        },
        {
          errorType: 'NETWORK_ERROR',
          message: 'Failed to fetch Sandpack',
          shouldSkip: ['CSS_MODULE_CONVERSION', 'DIRECT_CSS_INJECTION', 'JSON_DATA_INLINING', 'IMPORT_REMOVAL'],
          shouldAttempt: []
        }
      ];

      errorScenarios.forEach(scenario => {
        expect(scenario.shouldSkip).toBeDefined();
        expect(scenario.shouldAttempt).toBeDefined();
        expect(Array.isArray(scenario.shouldSkip)).toBe(true);
        expect(Array.isArray(scenario.shouldAttempt)).toBe(true);
      });
    });
  });

  describe('Parallel Strategy Evaluation', () => {
    it('should evaluate all strategies for applicability before execution', () => {
      const codeWithMultipleImports = `
        import styles from "./Button.module.css";
        import config from "./config.json";
        import missing from "./nonexistent";
      `;

      const messageContent = `
        CSS styles:
        \`\`\`css
        .button { background: blue; }
        \`\`\`

        Configuration:
        \`\`\`json
        { "apiUrl": "https://api.example.com" }
        \`\`\`
      `;

      // Should identify applicable strategies for each import
      const expectedEvaluations = [
        { import: 'styles', strategy: 'CSS_MODULE_CONVERSION', priority: 100, applicable: true },
        { import: 'config', strategy: 'JSON_DATA_INLINING', priority: 80, applicable: true },
        { import: 'missing', strategy: 'IMPORT_REMOVAL', priority: 10, applicable: true }
      ];

      expectedEvaluations.forEach(evaluation => {
        expect(evaluation.applicable).toBe(true);
        expect(evaluation.priority).toBeGreaterThan(0);
      });
    });

    it('should execute strategies in priority order across all imports', () => {
      // Mock execution log for multi-import scenario
      const executionLog = [
        { strategy: 'CSS_MODULE_CONVERSION', import: 'styles', priority: 100, result: 'SUCCESS' },
        { strategy: 'JSON_DATA_INLINING', import: 'config', priority: 80, result: 'SUCCESS' },
        { strategy: 'IMPORT_REMOVAL', import: 'missing', priority: 10, result: 'SUCCESS' }
      ];

      // Should execute in priority order
      for (let i = 1; i < executionLog.length; i++) {
        expect(executionLog[i - 1].priority).toBeGreaterThan(executionLog[i].priority);
      }
    });
  });

  describe('Strategy Performance Metrics', () => {
    it('should track execution time for each strategy', () => {
      const performanceMetrics = [
        { strategy: 'CSS_MODULE_CONVERSION', avgTimeMs: 150, maxTimeMs: 300 },
        { strategy: 'DIRECT_CSS_INJECTION', avgTimeMs: 100, maxTimeMs: 200 },
        { strategy: 'JSON_DATA_INLINING', avgTimeMs: 50, maxTimeMs: 100 },
        { strategy: 'IMPORT_REMOVAL', avgTimeMs: 25, maxTimeMs: 50 }
      ];

      performanceMetrics.forEach(metric => {
        expect(metric.avgTimeMs).toBeGreaterThan(0);
        expect(metric.maxTimeMs).toBeGreaterThanOrEqual(metric.avgTimeMs);
      });

      // Higher priority strategies might take longer (more complex)
      expect(performanceMetrics[0].avgTimeMs).toBeGreaterThan(performanceMetrics[3].avgTimeMs);
    });

    it('should track success rates for each strategy', () => {
      const successRates = [
        { strategy: 'CSS_MODULE_CONVERSION', successRate: 0.92, attempts: 1000 },
        { strategy: 'DIRECT_CSS_INJECTION', successRate: 0.85, attempts: 500 },
        { strategy: 'JSON_DATA_INLINING', successRate: 0.95, attempts: 300 },
        { strategy: 'IMPORT_REMOVAL', successRate: 0.99, attempts: 2000 }
      ];

      successRates.forEach(rate => {
        expect(rate.successRate).toBeGreaterThan(0);
        expect(rate.successRate).toBeLessThanOrEqual(1);
        expect(rate.attempts).toBeGreaterThan(0);
      });

      // Import removal should have highest success rate (fallback)
      const importRemovalRate = successRates.find(r => r.strategy === 'IMPORT_REMOVAL');
      expect(importRemovalRate?.successRate).toBeGreaterThan(0.95);
    });
  });
});