/**
 * Success Rate Validation Tests
 *
 * These tests validate that the Advanced Artifact Dependency Resolution System
 * achieves the target success rate of >85% for CSS module conversions and
 * maintains high success rates across different types of dependency issues.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { defaultStrategyExecutor, type RecoveryRequest } from '../../services/artifact-dependency-resolver/strategy-executor';

describe('Success Rate Validation', () => {
  beforeEach(() => {
    // Reset any state
  });

  describe('CSS Module Conversion Success Rate', () => {
    it('should achieve >85% success rate for standard CSS module scenarios', async () => {
      const testCases: Array<{
        name: string;
        code: string;
        css: string;
        shouldSucceed: boolean;
      }> = [
        // High success probability cases
        {
          name: 'Simple CSS module',
          code: 'import styles from "./simple.module.css";\nconst App = () => <div className={styles.container}>Test</div>;',
          css: '.container { padding: 20px; background: #f0f0f0; }',
          shouldSucceed: true
        },
        {
          name: 'Multiple class usage',
          code: 'import styles from "./multi.module.css";\nconst App = () => <div className={`${styles.header} ${styles.active}`}>Test</div>;',
          css: '.header { font-size: 2rem; } .active { color: blue; }',
          shouldSucceed: true
        },
        {
          name: 'Camel case conversion',
          code: 'import styles from "./camel.module.css";\nconst App = () => <div className={styles.mainContent}>Test</div>;',
          css: '.main-content { display: flex; justify-content: center; }',
          shouldSucceed: true
        },
        {
          name: 'Pseudo-selectors',
          code: 'import styles from "./pseudo.module.css";\nconst App = () => <button className={styles.button}>Click</button>;',
          css: '.button { background: blue; } .button:hover { background: darkblue; }',
          shouldSucceed: true
        },
        {
          name: 'Media queries',
          code: 'import styles from "./media.module.css";\nconst App = () => <div className={styles.responsive}>Responsive</div>;',
          css: '.responsive { width: 100%; } @media (min-width: 768px) { .responsive { width: 50%; } }',
          shouldSucceed: true
        },
        {
          name: 'Complex gradients',
          code: 'import styles from "./gradient.module.css";\nconst App = () => <div className={styles.gradient}>Gradient</div>;',
          css: '.gradient { background: linear-gradient(45deg, #ff0000, #00ff00, #0000ff); }',
          shouldSucceed: true
        },
        {
          name: 'CSS Grid',
          code: 'import styles from "./grid.module.css";\nconst App = () => <div className={styles.grid}>Grid</div>;',
          css: '.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }',
          shouldSucceed: true
        },
        {
          name: 'Flexbox layout',
          code: 'import styles from "./flex.module.css";\nconst App = () => <div className={styles.flex}>Flex</div>;',
          css: '.flex { display: flex; justify-content: space-between; align-items: center; }',
          shouldSucceed: true
        },
        {
          name: 'Animations',
          code: 'import styles from "./anim.module.css";\nconst App = () => <div className={styles.animated}>Animated</div>;',
          css: '.animated { animation: spin 2s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }',
          shouldSucceed: true
        },
        {
          name: 'CSS variables',
          code: 'import styles from "./vars.module.css";\nconst App = () => <div className={styles.themed}>Themed</div>;',
          css: ':root { --primary: #007bff; } .themed { color: var(--primary); background: var(--primary, blue); }',
          shouldSucceed: true
        },
        {
          name: 'Vendor prefixes',
          code: 'import styles from "./vendor.module.css";\nconst App = () => <div className={styles.prefixed}>Prefixed</div>;',
          css: '.prefixed { -webkit-transform: scale(1.1); -moz-transform: scale(1.1); transform: scale(1.1); }',
          shouldSucceed: true
        },
        {
          name: 'Complex selectors',
          code: 'import styles from "./complex.module.css";\nconst App = () => <div className={styles.parent}><span className={styles.child}>Child</span></div>;',
          css: '.parent { position: relative; } .parent .child { position: absolute; top: 0; left: 0; }',
          shouldSucceed: true
        },
        {
          name: 'Multiple imports',
          code: 'import styles from "./main.module.css";\nimport utils from "./utils.module.css";\nconst App = () => <div className={`${styles.main} ${utils.utility}`}>Test</div>;',
          css: '.main { padding: 20px; } .utility { margin: 10px; }',
          shouldSucceed: true
        },
        {
          name: 'Conditional classes',
          code: 'import styles from "./conditional.module.css";\nconst App = ({ active }) => <div className={active ? styles.active : styles.inactive}>Test</div>;',
          css: '.active { background: green; } .inactive { background: gray; }',
          shouldSucceed: true
        },
        {
          name: 'Dynamic class names',
          code: 'import styles from "./dynamic.module.css";\nconst App = ({ type }) => <div className={styles[`item-${type}`]}>Test</div>;',
          css: '.item-primary { color: blue; } .item-secondary { color: gray; }',
          shouldSucceed: true
        },

        // Medium success probability cases
        {
          name: 'Malformed CSS',
          code: 'import styles from "./malformed.module.css";\nconst App = () => <div className={styles.test}>Test</div>;',
          css: '.test { color: #ff0000 background: blue; padding 10px; }', // Missing semicolon
          shouldSucceed: true // Should still work with error recovery
        },
        {
          name: 'Empty CSS',
          code: 'import styles from "./empty.module.css";\nconst App = () => <div className={styles.test}>Test</div>;',
          css: '/* Empty CSS file */',
          shouldSucceed: true // Should handle gracefully
        },
        {
          name: 'Comments only',
          code: 'import styles from "./comments.module.css";\nconst App = () => <div className={styles.test}>Test</div>;',
          css: '/* This is a comment */ // Another comment',
          shouldSucceed: true
        },

        // Lower success probability cases (but still should work with fallbacks)
        {
          name: 'Invalid selectors',
          code: 'import styles from "./invalid.module.css";\nconst App = () => <div className={styles.test}>Test</div>;',
          css: '..invalid { color: red; } ###also-invalid { background: blue; }',
          shouldSucceed: false // May fail but should have fallback
        },
        {
          name: 'Unsupported features',
          code: 'import styles from "./unsupported.module.css";\nconst App = () => <div className={styles.test}>Test</div>;',
          css: '.test { color: color(display-p3 1 0 0); container-type: inline-size; }',
          shouldSucceed: true // Should handle unknown properties gracefully
        },
        {
          name: 'Very large CSS',
          code: 'import styles from "./large.module.css";\nconst App = () => <div className={styles.test}>Test</div>;',
          css: Array.from({ length: 1000 }, (_, i) => `.class-${i} { color: hsl(${i}, 70%, 50%); }`).join('\n'),
          shouldSucceed: true // Should handle large files
        }
      ];

      const results: Array<{ name: string; success: boolean; time: number }> = [];

      // Execute all test cases
      for (const testCase of testCases) {
        const request: RecoveryRequest = {
          artifactId: `success-rate-${testCase.name.replace(/\s+/g, '-')}`,
          artifactCode: testCase.code,
          errorMessage: 'CSS module not found',
          messageContent: testCase.css,
          language: 'javascript',
          attemptId: `success-rate-test-${Date.now()}`
        };

        const startTime = performance.now();
        const result = await defaultStrategyExecutor.executeRecovery(request);
        const endTime = performance.now();

        results.push({
          name: testCase.name,
          success: result.success,
          time: endTime - startTime
        });

        // Individual test validation
        if (testCase.shouldSucceed) {
          expect(result.success).toBe(true);
          expect(result.strategy).toBe('CSS_MODULE_CONVERSION');
          expect(result.finalCode).toBeDefined();
          expect(result.finalCode!.length).toBeGreaterThan(0);
        }
      }

      // Calculate overall success rate
      const successfulResults = results.filter(r => r.success);
      const successRate = successfulResults.length / results.length;

      console.log('CSS Module Conversion Results:');
      console.log(`Total test cases: ${results.length}`);
      console.log(`Successful: ${successfulResults.length}`);
      console.log(`Success rate: ${(successRate * 100).toFixed(1)}%`);

      // Validate success rate meets target
      expect(successRate).toBeGreaterThan(0.85); // >85% success rate

      // Performance validation - average time should be <1s
      const averageTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
      expect(averageTime).toBeLessThan(1000);

      // No individual case should take more than 2s
      results.forEach(result => {
        expect(result.time).toBeLessThan(2000);
      });
    });

    it('should maintain high success rate under different error conditions', async () => {
      const errorScenarios = [
        {
          name: 'Module not found',
          errorMessage: 'Cannot resolve module "./styles.module.css"',
          expectedSuccess: true
        },
        {
          name: 'Invalid file extension',
          errorMessage: 'Unexpected file extension .css',
          expectedSuccess: true
        },
        {
          name: 'Build error',
          errorMessage: 'Failed to compile CSS module',
          expectedSuccess: true
        },
        {
          name: 'Syntax error in import',
          errorMessage: 'SyntaxError: Unexpected token in import statement',
          expectedSuccess: true
        },
        {
          name: 'Network timeout',
          errorMessage: 'ENOTFOUND: DNS lookup failed',
          expectedSuccess: true
        }
      ];

      const results: boolean[] = [];

      for (const scenario of errorScenarios) {
        const request: RecoveryRequest = {
          artifactId: `error-scenario-${scenario.name.replace(/\s+/g, '-')}`,
          artifactCode: 'import styles from "./test.module.css";\nconst App = () => <div className={styles.test}>Test</div>;',
          errorMessage: scenario.errorMessage,
          messageContent: '.test { background: blue; color: white; padding: 10px; }',
          language: 'javascript',
          attemptId: `error-scenario-test-${Date.now()}`
        };

        const result = await defaultStrategyExecutor.executeRecovery(request);
        results.push(result.success);

        if (scenario.expectedSuccess) {
          expect(result.success).toBe(true);
        }
      }

      const successRate = results.filter(Boolean).length / results.length;
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate for error scenarios
    });
  });

  describe('JSON Data Inlining Success Rate', () => {
    it('should achieve high success rate for JSON import scenarios', async () => {
      const jsonTestCases = [
        {
          name: 'Simple JSON object',
          code: 'import data from "./simple.json";\nconst App = () => <div>{data.title}</div>;',
          json: '{"title": "Hello World", "version": "1.0.0"}',
          shouldSucceed: true
        },
        {
          name: 'Nested JSON structure',
          code: 'import config from "./config.json";\nconst App = () => <div>{config.app.name}</div>;',
          json: '{"app": {"name": "Test App", "version": "1.0"}, "features": ["auth", "payments"]}',
          shouldSucceed: true
        },
        {
          name: 'Array data',
          code: 'import items from "./items.json";\nconst App = () => <ul>{items.map(item => <li key={item.id}>{item.name}</li>)}</ul>;',
          json: '[{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}]',
          shouldSucceed: true
        },
        {
          name: 'Complex data types',
          code: 'import data from "./complex.json";\nconst App = () => <div>{JSON.stringify(data)}</div>;',
          json: '{"string": "text", "number": 42, "boolean": true, "null": null, "array": [1,2,3], "object": {"nested": "value"}}',
          shouldSucceed: true
        },
        {
          name: 'Large JSON file',
          code: 'import data from "./large.json";\nconst App = () => <div>Items: {data.items.length}</div>;',
          json: JSON.stringify({
            items: Array.from({ length: 1000 }, (_, i) => ({
              id: i,
              name: `Item ${i}`,
              description: `Description for item ${i}`
            }))
          }),
          shouldSucceed: true
        },
        {
          name: 'Invalid JSON',
          code: 'import data from "./invalid.json";\nconst App = () => <div>{data.title}</div>;',
          json: '{"title": "Test", "invalid": }', // Invalid JSON
          shouldSucceed: false // Should fail gracefully
        }
      ];

      let successCount = 0;

      for (const testCase of jsonTestCases) {
        const request: RecoveryRequest = {
          artifactId: `json-success-${testCase.name.replace(/\s+/g, '-')}`,
          artifactCode: testCase.code,
          errorMessage: 'JSON module not found',
          messageContent: testCase.json,
          language: 'javascript',
          attemptId: `json-success-test-${Date.now()}`
        };

        const result = await defaultStrategyExecutor.executeRecovery(request);

        if (result.success) {
          successCount++;
          expect(result.strategy).toBe('JSON_DATA_INLINING');
          expect(result.finalCode).toContain('const data = {') || expect(result.finalCode).toContain('const config = {') || expect(result.finalCode).toContain('const items = [');
        }

        if (testCase.shouldSucceed) {
          expect(result.success).toBe(true);
        }
      }

      const successRate = successCount / jsonTestCases.length;
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate for JSON scenarios
    });
  });

  describe('Fallback Strategy Success Rate', () => {
    it('should achieve reasonable success rate with import removal fallback', async () => {
      const fallbackCases = [
        {
          name: 'Simple import removal',
          code: 'import { helper } from "./missing-helper";\nconst App = () => <div>Simple app without helper</div>;',
          content: '', // No content to trigger higher priority strategies
          shouldSucceed: true
        },
        {
          name: 'Multiple import removal',
          code: 'import utils from "./utils";\nimport helpers from "./helpers";\nconst App = () => <div>App without imports</div>;',
          content: '',
          shouldSucceed: true
        },
        {
          name: 'Mixed imports (some valid, some invalid)',
          code: 'import React from "react";\nimport { missing } from "./missing";\nconst App = () => <div>React app</div>;',
          content: '',
          shouldSucceed: true
        },
        {
          name: 'Import with usage in code',
          code: 'import { calculate } from "./missing";\nconst App = () => <div>Result: {calculate(5, 3)}</div>;',
          content: '',
          shouldSucceed: true // Should remove import and handle usage
        }
      ];

      let successCount = 0;

      for (const testCase of fallbackCases) {
        const request: RecoveryRequest = {
          artifactId: `fallback-${testCase.name.replace(/\s+/g, '-')}`,
          artifactCode: testCase.code,
          errorMessage: 'Module not found',
          messageContent: testCase.content,
          language: 'javascript',
          attemptId: `fallback-test-${Date.now()}`
        };

        const result = await defaultStrategyExecutor.executeRecovery(request);

        if (result.success) {
          successCount++;
          expect(result.strategy).toBe('IMPORT_REMOVAL');
          expect(result.finalCode).toBeDefined();
        }

        if (testCase.shouldSucceed) {
          expect(result.success).toBe(true);
        }
      }

      const successRate = successCount / fallbackCases.length;
      expect(successRate).toBeGreaterThan(0.7); // 70% success rate for fallback scenarios
    });
  });

  describe('Overall System Success Rate', () => {
    it('should achieve high overall success rate across all strategy types', async () => {
      const mixedTestCases = [
        // CSS Module cases (high priority)
        { type: 'CSS', code: 'import styles from "./a.module.css";\nconst A = () => <div className={styles.test}>A</div>;', content: '.test { color: red; }' },
        { type: 'CSS', code: 'import styles from "./b.module.css";\nconst B = () => <div className={styles.main}>B</div>;', content: '.main { background: blue; }' },
        { type: 'CSS', code: 'import styles from "./c.module.css";\nconst C = () => <div className={styles.container}>C</div>;', content: '.container { padding: 20px; }' },

        // JSON cases (medium priority)
        { type: 'JSON', code: 'import data from "./data1.json";\nconst D = () => <div>{data.title}</div>;', content: '{"title": "Data 1"}' },
        { type: 'JSON', code: 'import config from "./config1.json";\nconst E = () => <div>{config.name}</div>;', content: '{"name": "Config 1"}' },

        // Direct CSS injection cases
        { type: 'DIRECT_CSS', code: 'import "./direct.css";\nconst F = () => <div className="direct">F</div>;', content: '.direct { font-weight: bold; }' },

        // Import removal cases (lowest priority)
        { type: 'IMPORT_REMOVAL', code: 'import { missing } from "./missing";\nconst G = () => <div>G</div>;', content: '' },
        { type: 'IMPORT_REMOVAL', code: 'import utils from "./utils";\nconst H = () => <div>H</div>;', content: '' }
      ];

      const results: Array<{ type: string; success: boolean; strategy: string }> = [];

      for (const [index, testCase] of mixedTestCases.entries()) {
        const request: RecoveryRequest = {
          artifactId: `mixed-test-${index}`,
          artifactCode: testCase.code,
          errorMessage: 'Module resolution failed',
          messageContent: testCase.content,
          language: 'javascript',
          attemptId: `mixed-test-${index}-${Date.now()}`
        };

        const result = await defaultStrategyExecutor.executeRecovery(request);
        results.push({
          type: testCase.type,
          success: result.success,
          strategy: result.strategy || 'FAILED'
        });
      }

      // Calculate success rates by type
      const cssResults = results.filter(r => r.type === 'CSS');
      const jsonResults = results.filter(r => r.type === 'JSON');
      const directCssResults = results.filter(r => r.type === 'DIRECT_CSS');
      const importRemovalResults = results.filter(r => r.type === 'IMPORT_REMOVAL');

      const cssSuccessRate = cssResults.filter(r => r.success).length / cssResults.length;
      const jsonSuccessRate = jsonResults.filter(r => r.success).length / jsonResults.length;
      const directCssSuccessRate = directCssResults.filter(r => r.success).length / directCssResults.length;
      const importRemovalSuccessRate = importRemovalResults.filter(r => r.success).length / importRemovalResults.length;

      // Overall success rate
      const overallSuccessRate = results.filter(r => r.success).length / results.length;

      console.log('Strategy Success Rates:');
      console.log(`CSS Modules: ${(cssSuccessRate * 100).toFixed(1)}%`);
      console.log(`JSON Inlining: ${(jsonSuccessRate * 100).toFixed(1)}%`);
      console.log(`Direct CSS: ${(directCssSuccessRate * 100).toFixed(1)}%`);
      console.log(`Import Removal: ${(importRemovalSuccessRate * 100).toFixed(1)}%`);
      console.log(`Overall: ${(overallSuccessRate * 100).toFixed(1)}%`);

      // Validate success rates meet targets
      expect(cssSuccessRate).toBeGreaterThan(0.85); // CSS modules should be >85%
      expect(jsonSuccessRate).toBeGreaterThan(0.8);  // JSON should be >80%
      expect(directCssSuccessRate).toBeGreaterThan(0.75); // Direct CSS should be >75%
      expect(importRemovalSuccessRate).toBeGreaterThan(0.7); // Import removal should be >70%
      expect(overallSuccessRate).toBeGreaterThan(0.8); // Overall should be >80%
    });

    it('should maintain success rate under load conditions', async () => {
      const concurrentRequests = Array.from({ length: 20 }, (_, i) => ({
        artifactId: `load-test-${i}`,
        artifactCode: `import styles from "./load-${i}.module.css";\nconst Component${i} = () => <div className={styles.test}>Load Test ${i}</div>;`,
        errorMessage: 'CSS module not found',
        messageContent: `.test { color: hsl(${i * 18}, 70%, 50%); background: rgba(0, 0, 0, 0.1); padding: ${5 + i}px; }`,
        language: 'javascript' as const,
        attemptId: `load-test-${i}-${Date.now()}`
      }));

      const startTime = performance.now();

      // Execute all requests concurrently
      const results = await Promise.allSettled(
        concurrentRequests.map(request => defaultStrategyExecutor.executeRecovery(request))
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Count successful results
      const successfulResults = results.filter(result =>
        result.status === 'fulfilled' && result.value.success
      );

      const successRate = successfulResults.length / results.length;

      console.log('Load Test Results:');
      console.log(`Concurrent requests: ${concurrentRequests.length}`);
      console.log(`Successful: ${successfulResults.length}`);
      console.log(`Success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`Total time: ${totalTime.toFixed(0)}ms`);
      console.log(`Average time per request: ${(totalTime / concurrentRequests.length).toFixed(0)}ms`);

      // Validate performance under load
      expect(successRate).toBeGreaterThan(0.8); // Should maintain >80% success rate
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(totalTime / concurrentRequests.length).toBeLessThan(2000); // Average <2s per request
    });
  });

  describe('Success Rate Consistency', () => {
    it('should maintain consistent success rate across multiple runs', async () => {
      const testCase = {
        artifactCode: 'import styles from "./consistency.module.css";\nconst App = () => <div className={styles.test}>Consistency Test</div>;',
        messageContent: '.test { background: linear-gradient(45deg, #ff6b6b, #4ecdc4); padding: 20px; border-radius: 8px; }'
      };

      const runs = 10;
      const results: boolean[] = [];

      for (let i = 0; i < runs; i++) {
        const request: RecoveryRequest = {
          artifactId: `consistency-test-${i}`,
          artifactCode: testCase.artifactCode,
          errorMessage: 'CSS module not found',
          messageContent: testCase.messageContent,
          language: 'javascript',
          attemptId: `consistency-test-${i}-${Date.now()}`
        };

        const result = await defaultStrategyExecutor.executeRecovery(request);
        results.push(result.success);
      }

      const successRate = results.filter(Boolean).length / results.length;

      // Should be consistent across runs
      expect(successRate).toBe(1.0); // Should succeed in all runs for this simple case

      // Check for any failures
      const failures = results.filter(success => !success).length;
      expect(failures).toBe(0); // No failures expected for consistent input
    });
  });
});