/**
 * Malformed Input Handling Edge Case Validation Tests
 *
 * These tests validate that the dependency resolution system gracefully
 * handles malformed, corrupted, or invalid input data without crashing
 * or producing incorrect results, ensuring system robustness.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { defaultStrategyExecutor, type RecoveryRequest } from '../../services/artifact-dependency-resolver/strategy-executor';

describe('Malformed Input Handling Edge Case Validation', () => {
  beforeEach(() => {
    // Reset any state
  });

  describe('Malformed CSS Content Handling', () => {
    it('should handle completely invalid CSS syntax', async () => {
      const request: RecoveryRequest = {
        artifactId: 'malformed-css-test',
        artifactCode: 'import styles from "./broken.module.css";\nconst App = () => <div className={styles.test}>Test</div>;',
        errorMessage: 'CSS module not found',
        messageContent: `
          .test {
            color: #ff0000
            background: blue;
            padding 10px;
            border-radius: ;
            invalid-property: invalid-value;
            font-size: 16px

          .another-class {
            background: #00ff00;
            /* unclosed comment
            color: red;
          }
        `,
        language: 'javascript',
        attemptId: 'malformed-css-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      // Should handle gracefully, either succeeding with corrected CSS or failing safely
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();

      if (result.success) {
        // If it succeeds, the transformed code should be valid
        expect(result.finalCode).toBeDefined();
        expect(result.finalCode!.length).toBeGreaterThan(0);

        // Should contain some form of styles object
        expect(result.finalCode!).toMatch(/const styles\s*=\s*{/);

        // Should preserve valid properties while handling invalid ones
        expect(result.finalCode!).toContain('#ff0000');
        expect(result.finalCode!).toContain('blue');
      } else {
        // If it fails, should provide meaningful error information
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
        expect(result.strategy).toBeDefined();
      }
    });

    it('should handle CSS with mixed encoding and special characters', async () => {
      const request: RecoveryRequest = {
        artifactId: 'encoding-css-test',
        artifactCode: 'import styles from "./special.module.css";\nconst Component = () => <div className={styles.special}>Content</div>;',
        errorMessage: 'Module resolution failed',
        messageContent: `
          .special {
            content: "Special: äöü €∑®†¥¨ˆøπ"'"";
            font-family: "Arial", 'Times New Roman', sans-serif;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><rect fill="%23ff0000"/></svg>');
            animation-name: slide-in;
          }

          @keyframes slide-in {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(0); }
          }

          /* Unicode comments: ¡™£¢∞§¶•ªº– */
          .unicode-class-ñáéíóú {
            color: #000;
          }
        `,
        language: 'javascript',
        attemptId: 'encoding-css-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      const transformedCode = result.finalCode!;

      // Should handle special characters in content
      expect(transformedCode).toContain('äöü');
      expect(transformedCode).toContain('€∑®†¥');

      // Should handle data URLs
      expect(transformedCode).toContain('data:image/svg+xml');

      // Should handle keyframes (though may be simplified)
      expect(transformedCode).toMatch(/slide.*in|animation/i);

      // Should handle Unicode class names
      expect(transformedCode).toContain('unicode');
    });

    it('should handle CSS with syntax errors and recovery opportunities', async () => {
      const request: RecoveryRequest = {
        artifactId: 'recoverable-css-test',
        artifactCode: 'import styles from "./recoverable.module.css";\nconst Button = () => <button className={styles.btn}>Click</button>;',
        errorMessage: 'CSS parsing failed',
        messageContent: `
          /* Missing closing brace */
          .btn {
            background: #007bff;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
          /* Missing closing brace */

          .btn:hover {
            background: #0056b3;
          }

          /* Extra closing brace */
          .btn:active {
            background: #004085;
          }}

          /* Semicolon instead of colon */
          .btn:disabled {
            background; #6c757d;
            cursor: not-allowed;
          }
        `,
        language: 'javascript',
        attemptId: 'recoverable-css-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      // Should attempt recovery and either succeed or fail gracefully
      expect(result).toBeDefined();

      if (result.success) {
        const transformedCode = result.finalCode!;

        // Should preserve valid CSS properties
        expect(transformedCode).toContain('#007bff');
        expect(transformedCode).toContain('#0056b3');
        expect(transformedCode).toContain('white');
        expect(transformedCode).toContain('10px');
        expect(transformedCode).toContain('20px');

        // Should create valid JavaScript object structure
        expect(transformedCode).toMatch(/btn:\s*{/);
      }
    });
  });

  describe('Malformed JSON Content Handling', () => {
    it('should handle invalid JSON syntax', async () => {
      const request: RecoveryRequest = {
        artifactId: 'malformed-json-test',
        artifactCode: 'import data from "./broken.json";\nconst App = () => <div>{data.title}</div>;',
        errorMessage: 'JSON module not found',
        messageContent: `
          {
            "title": "Test App",
            "version": "1.0.0"
            "description": "Missing comma above",
            "features": [
              "feature1",
              "feature2",
              /* JSON doesn't support comments */
            ],
            "config": {
              "apiUrl": "https://api.example.com"
              "timeout": 5000, // Trailing comma
            },
            "invalid": undefined,
            "another_invalid": function() { return "test"; }
          }
        `,
        language: 'javascript',
        attemptId: 'malformed-json-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result).toBeDefined();

      if (result.success) {
        expect(result.strategy).toBe('JSON_DATA_INLINING');
        const transformedCode = result.finalCode!;

        // Should preserve valid JSON properties
        expect(transformedCode).toContain('"Test App"');
        expect(transformedCode).toContain('"1.0.0"');
        expect(transformedCode).toContain('https://api.example.com');

        // Should handle the array structure
        expect(transformedCode).toContain('features:');
        expect(transformedCode).toContain('feature1');
        expect(transformedCode).toContain('feature2');

        // Should create valid JavaScript object
        expect(transformedCode).toMatch(/const data\s*=\s*{/);
      } else {
        // Should fail gracefully with meaningful errors
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      }
    });

    it('should handle JSON with mixed data types and edge cases', async () => {
      const request: RecoveryRequest = {
        artifactId: 'edge-json-test',
        artifactCode: 'import config from "./edge.json";\nconst Settings = () => <div>Config: {JSON.stringify(config)}</div>;',
        errorMessage: 'Module not found',
        messageContent: `
          {
            "string": "normal string",
            "emptyString": "",
            "number": 42,
            "float": 3.14159,
            "negative": -123,
            "zero": 0,
            "boolean_true": true,
            "boolean_false": false,
            "null_value": null,
            "empty_object": {},
            "empty_array": [],
            "nested": {
              "deep": {
                "deeper": {
                  "value": "found"
                }
              }
            },
            "special_chars": "Line 1\\nLine 2\\tTabbed\\r\\n\"Quoted\"",
            "unicode": "Unicode: ñáéíóú 中文 🚀",
            "large_number": 9007199254740991,
            "array_mixed": [1, "two", true, null, {"nested": "object"}]
          }
        `,
        language: 'javascript',
        attemptId: 'edge-json-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      const transformedCode = result.finalCode!;

      // Should preserve all data types
      expect(transformedCode).toContain('42');
      expect(transformedCode).toContain('3.14159');
      expect(transformedCode).toContain('-123');
      expect(transformedCode).toContain('true');
      expect(transformedCode).toContain('false');
      expect(transformedCode).toContain('null');

      // Should handle empty structures
      expect(transformedCode).toContain('{}');
      expect(transformedCode).toContain('[]');

      // Should preserve nested structures
      expect(transformedCode).toContain('deep:');
      expect(transformedCode).toContain('deeper:');
      expect(transformedCode).toContain('"found"');

      // Should handle special characters
      expect(transformedCode).toContain('\\n');
      expect(transformedCode).toContain('\\t');
      expect(transformedCode).toContain('\\"');

      // Should handle Unicode
      expect(transformedCode).toContain('ñáéíóú');
      expect(transformedCode).toContain('中文');
      expect(transformedCode).toContain('🚀');
    });
  });

  describe('Malformed Code Structure Handling', () => {
    it('should handle incomplete or broken JavaScript syntax', async () => {
      const request: RecoveryRequest = {
        artifactId: 'broken-js-test',
        artifactCode: `
          import styles from "./test.module.css";
          import { useState } from 'react';

          const BrokenComponent = ({ props }) => {
            const [state, setState] = useState(0);

            // Missing return statement
            const handleClick = () => {
              setState(state + 1);

            // Unclosed JSX
            return (
              <div className={styles.container}>
                <h1>Title</h1>
                <button onClick={handleClick}>
                  Count: {state}
                </button>
              // Missing closing div
        `,
        errorMessage: 'CSS module not found',
        messageContent: `
          .container {
            padding: 20px;
            background: #f0f0f0;
            border-radius: 8px;
          }
        `,
        language: 'javascript',
        attemptId: 'broken-js-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      // Should handle the CSS conversion despite broken JavaScript
      if (result.success) {
        expect(result.strategy).toBe('CSS_MODULE_CONVERSION');
        const transformedCode = result.finalCode!;

        // Should attempt to preserve as much valid code as possible
        expect(transformedCode).toContain('const styles = {');
        expect(transformedCode).toContain('padding:');
        expect(transformedCode).toContain('#f0f0f0');

        // Should contain the working parts of the component
        expect(transformedCode).toContain('BrokenComponent');
        expect(transformedCode).toContain('useState');
      }
    });

    it('should handle mixed language constructs and invalid imports', async () => {
      const request: RecoveryRequest = {
        artifactId: 'mixed-syntax-test',
        artifactCode: `
          // Mix of different syntaxes and invalid constructs
          import styles from "./styles.module.css";
          const { invalidDestruct } from undefined;
          import nonExistent from;
          require('old-style-require');

          // PHP-style variable
          $phpVariable = "invalid";

          // Python-style syntax
          def pythonFunction():
              return "invalid"

          const ValidComponent = () => {
            // This part should be preserved
            return <div className={styles.valid}>Valid content</div>;
          };

          // Unclosed function
          function broken() {
            const x = 1;
        `,
        errorMessage: 'Multiple import errors',
        messageContent: `
          .valid {
            color: green;
            font-size: 16px;
          }
        `,
        language: 'javascript',
        attemptId: 'mixed-syntax-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      if (result.success) {
        const transformedCode = result.finalCode!;

        // Should handle the CSS conversion
        expect(transformedCode).toContain('const styles = {');
        expect(transformedCode).toContain('green');

        // Should preserve the valid component
        expect(transformedCode).toContain('ValidComponent');
        expect(transformedCode).toContain('styles.valid');

        // Should remove or handle invalid constructs
        expect(transformedCode).not.toContain('$phpVariable');
        expect(transformedCode).not.toContain('def pythonFunction');
        expect(transformedCode).not.toContain('from undefined');
      }
    });
  });

  describe('Extreme Input Edge Cases', () => {
    it('should handle extremely large CSS content', async () => {
      // Generate large CSS content
      const largeCssRules = Array.from({ length: 1000 }, (_, i) => `
        .class-${i} {
          color: #${i.toString(16).padStart(6, '0').slice(0, 6)};
          background: rgba(${i % 255}, ${(i * 2) % 255}, ${(i * 3) % 255}, 0.5);
          padding: ${i % 50}px;
          margin: ${(i % 30) + 1}px;
          font-size: ${12 + (i % 12)}px;
          border-radius: ${i % 20}px;
        }
      `).join('\n');

      const request: RecoveryRequest = {
        artifactId: 'large-css-test',
        artifactCode: 'import styles from "./large.module.css";\nconst App = () => <div className={styles["class-500"]}>Large CSS Test</div>;',
        errorMessage: 'CSS module not found',
        messageContent: largeCssRules,
        language: 'javascript',
        attemptId: 'large-css-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result).toBeDefined();
      expect(result.processingTimeMs).toBeLessThan(10000); // Should complete within 10 seconds

      if (result.success) {
        const transformedCode = result.finalCode!;

        // Should handle large content without truncation issues
        expect(transformedCode.length).toBeGreaterThan(1000);
        expect(transformedCode).toContain('const styles = {');

        // Should contain some of the generated classes
        expect(transformedCode).toMatch(/class-\d+:/);
      }
    });

    it('should handle empty or whitespace-only content', async () => {
      const testCases = [
        { content: '', name: 'completely empty' },
        { content: '   ', name: 'spaces only' },
        { content: '\n\n\n', name: 'newlines only' },
        { content: '\t\t\t', name: 'tabs only' },
        { content: '  \n\t  \n  ', name: 'mixed whitespace' }
      ];

      for (const testCase of testCases) {
        const request: RecoveryRequest = {
          artifactId: `empty-content-${testCase.name.replace(/\s+/g, '-')}`,
          artifactCode: 'import styles from "./empty.module.css";\nconst App = () => <div>Empty test</div>;',
          errorMessage: 'CSS module not found',
          messageContent: testCase.content,
          language: 'javascript',
          attemptId: `empty-test-${Date.now()}`
        };

        const result = await defaultStrategyExecutor.executeRecovery(request);

        expect(result).toBeDefined();

        // Should handle gracefully - either succeed with minimal styles or fail safely
        if (result.success) {
          expect(result.finalCode).toBeDefined();
          expect(result.finalCode!.length).toBeGreaterThan(0);
        } else {
          expect(result.errors).toBeDefined();
        }
      }
    });

    it('should handle circular references and self-referential content', async () => {
      const request: RecoveryRequest = {
        artifactId: 'circular-ref-test',
        artifactCode: `
          import styles from "./circular.module.css";
          import config from "./config.json";

          const CircularComponent = () => {
            const selfRef = CircularComponent;
            const data = { self: data }; // Circular reference

            return <div className={styles.circular}>{config.self}</div>;
          };
        `,
        errorMessage: 'Module resolution failed',
        messageContent: `
          .circular {
            background: var(--circular-color);
            color: var(--circular-color);
          }

          :root {
            --circular-color: var(--circular-color);
          }
        `,
        language: 'javascript',
        attemptId: 'circular-ref-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result).toBeDefined();

      if (result.success) {
        const transformedCode = result.finalCode!;

        // Should handle CSS variables gracefully
        expect(transformedCode).toContain('circular:');

        // Should preserve the component structure
        expect(transformedCode).toContain('CircularComponent');
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should provide meaningful error messages for unrecoverable input', async () => {
      const request: RecoveryRequest = {
        artifactId: 'unrecoverable-test',
        artifactCode: 'import styles from "./styles.module.css";\nconst App = () => <div>Test</div>;',
        errorMessage: 'CSS module not found',
        messageContent: 'This is not CSS at all! It is just random text that cannot be parsed as CSS or any other structured format.',
        language: 'javascript',
        attemptId: 'unrecoverable-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      // Should fail gracefully with informative errors
      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
        expect(result.errors!.some(error => error.includes('CSS') || error.includes('parse'))).toBe(true);
        expect(result.strategy).toBeDefined();
        expect(result.confidence).toBeLessThan(0.5);
      }
    });

    it('should maintain performance bounds even with problematic input', async () => {
      const request: RecoveryRequest = {
        artifactId: 'performance-stress-test',
        artifactCode: 'import styles from "./stress.module.css";\nconst App = () => <div>Stress test</div>;',
        errorMessage: 'CSS module not found',
        messageContent: `
          /* Deeply nested selectors that could cause exponential parsing time */
          ${Array.from({ length: 50 }, (_, i) => '.level-' + i).join(' ')} {
            color: red;
          }

          /* Many similar rules */
          ${Array.from({ length: 200 }, (_, i) => `
            .rule-${i} {
              color: #${i.toString(16).padStart(6, '0')};
              background: linear-gradient(${i}deg, red, blue);
            }
          `).join('\n')}
        `,
        language: 'javascript',
        attemptId: 'performance-stress-test-1'
      };

      const startTime = Date.now();
      const result = await defaultStrategyExecutor.executeRecovery(request);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time limits
      expect(processingTime).toBeLessThan(5000); // 5 seconds max
      expect(result).toBeDefined();
      expect(result.processingTimeMs).toBeLessThan(5000);
    });
  });
});