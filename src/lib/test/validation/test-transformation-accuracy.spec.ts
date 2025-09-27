/**
 * Code Transformation Accuracy Validation Tests
 *
 * These tests validate that the dependency resolution strategies
 * accurately transform code while preserving functionality,
 * ensuring that CSS modules, JSON imports, and other transformations
 * maintain the original intent and visual/behavioral output.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { defaultStrategyExecutor, type RecoveryRequest } from '../../services/artifact-dependency-resolver/strategy-executor';

describe('Code Transformation Accuracy Validation', () => {
  beforeEach(() => {
    // Reset any state
  });

  describe('CSS Module Transformation Accuracy', () => {
    it('should preserve CSS styles and class names in transformation', async () => {
      const request: RecoveryRequest = {
        artifactId: 'css-accuracy-test',
        artifactCode: `
          import styles from "./Button.module.css";

          const Button = ({ children, variant = 'primary' }) => {
            return (
              <button
                className={\`\${styles.button} \${styles[variant]}\`}
                onClick={() => console.log('Button clicked')}
              >
                {children}
              </button>
            );
          };

          export default Button;
        `,
        errorMessage: 'Cannot resolve module "./Button.module.css"',
        messageContent: `
          .button {
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .primary {
            background-color: #007bff;
            color: white;
          }

          .primary:hover {
            background-color: #0056b3;
          }

          .secondary {
            background-color: #6c757d;
            color: white;
          }
        `,
        language: 'javascript',
        attemptId: 'css-accuracy-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('CSS_MODULE_CONVERSION');
      expect(result.finalCode).toBeDefined();

      const transformedCode = result.finalCode!;

      // Should not contain original import
      expect(transformedCode).not.toContain('import styles from "./Button.module.css"');

      // Should contain converted styles object
      expect(transformedCode).toContain('const styles = {');

      // Should preserve all CSS class names
      expect(transformedCode).toContain('button:');
      expect(transformedCode).toContain('primary:');
      expect(transformedCode).toContain('secondary:');

      // Should preserve camelCase conversion
      expect(transformedCode).toContain('backgroundColor:');
      expect(transformedCode).toContain('borderRadius:');

      // Should preserve component structure
      expect(transformedCode).toContain('const Button = ');
      expect(transformedCode).toContain('children, variant = \'primary\'');
      expect(transformedCode).toContain('export default Button');

      // Should preserve dynamic class assignment logic
      expect(transformedCode).toContain('styles.button');
      expect(transformedCode).toContain('styles[variant]');
    });

    it('should handle complex CSS selectors and pseudo-classes', async () => {
      const request: RecoveryRequest = {
        artifactId: 'complex-css-test',
        artifactCode: `
          import styles from "./Card.module.css";

          const Card = ({ title, content, isActive }) => (
            <div className={\`\${styles.card} \${isActive ? styles.active : ''}\`}>
              <h3 className={styles.cardTitle}>{title}</h3>
              <p className={styles.cardContent}>{content}</p>
              <div className={styles.cardFooter}>
                <button className={styles.actionButton}>Action</button>
              </div>
            </div>
          );
        `,
        errorMessage: 'CSS module not found',
        messageContent: `
          .card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 16px;
            margin-bottom: 16px;
          }

          .card:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          }

          .card.active {
            border-left: 4px solid #007bff;
          }

          .card-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
          }

          .card-content {
            font-size: 14px;
            line-height: 1.5;
            color: #666;
            margin-bottom: 12px;
          }

          .card-footer {
            border-top: 1px solid #eee;
            padding-top: 12px;
          }

          .action-button {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          }

          .action-button:hover {
            background: #0056b3;
          }
        `,
        language: 'javascript',
        attemptId: 'complex-css-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      const transformedCode = result.finalCode!;

      // Should handle kebab-case to camelCase conversion
      expect(transformedCode).toContain('cardTitle:');
      expect(transformedCode).toContain('cardContent:');
      expect(transformedCode).toContain('cardFooter:');
      expect(transformedCode).toContain('actionButton:');

      // Should preserve CSS property transformations
      expect(transformedCode).toContain('boxShadow:');
      expect(transformedCode).toContain('borderRadius:');
      expect(transformedCode).toContain('fontSize:');
      expect(transformedCode).toContain('fontWeight:');
      expect(transformedCode).toContain('lineHeight:');
      expect(transformedCode).toContain('borderTop:');
      expect(transformedCode).toContain('paddingTop:');

      // Should preserve hover states
      expect(transformedCode).toContain(':hover');
    });

    it('should maintain CSS measurement units and color formats', async () => {
      const request: RecoveryRequest = {
        artifactId: 'css-units-test',
        artifactCode: 'import styles from "./Layout.module.css";\nconst Layout = () => <div className={styles.container}>Content</div>;',
        errorMessage: 'Module not found',
        messageContent: `
          .container {
            width: 100vw;
            height: 100vh;
            max-width: 1200px;
            padding: 2rem 1.5rem;
            margin: 0 auto;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
            border: 2px solid #e0e0e0;
          }
        `,
        language: 'javascript',
        attemptId: 'css-units-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      const transformedCode = result.finalCode!;

      // Should preserve various CSS units
      expect(transformedCode).toContain('100vw');
      expect(transformedCode).toContain('100vh');
      expect(transformedCode).toContain('1200px');
      expect(transformedCode).toContain('2rem');
      expect(transformedCode).toContain('1.5rem');

      // Should preserve complex CSS functions
      expect(transformedCode).toContain('linear-gradient');
      expect(transformedCode).toContain('rgba(0, 0, 0, 0.1)');

      // Should preserve hex colors
      expect(transformedCode).toContain('#667eea');
      expect(transformedCode).toContain('#764ba2');
      expect(transformedCode).toContain('#e0e0e0');
    });
  });

  describe('JSON Import Transformation Accuracy', () => {
    it('should accurately inline JSON data while preserving structure', async () => {
      const request: RecoveryRequest = {
        artifactId: 'json-accuracy-test',
        artifactCode: `
          import config from "./app-config.json";

          const App = () => {
            const apiUrl = config.apiUrl;
            const timeout = config.timeout;
            const features = config.features;

            return (
              <div>
                <h1>{config.app.name}</h1>
                <p>Version: {config.app.version}</p>
                <p>API: {apiUrl}</p>
                <p>Timeout: {timeout}ms</p>
                <ul>
                  {features.map(feature => (
                    <li key={feature.id}>{feature.name}: {feature.enabled ? 'On' : 'Off'}</li>
                  ))}
                </ul>
              </div>
            );
          };
        `,
        errorMessage: 'Cannot resolve module "./app-config.json"',
        messageContent: `
          {
            "apiUrl": "https://api.example.com/v1",
            "timeout": 5000,
            "app": {
              "name": "Test Application",
              "version": "1.2.3"
            },
            "features": [
              { "id": "auth", "name": "Authentication", "enabled": true },
              { "id": "analytics", "name": "Analytics", "enabled": false },
              { "id": "notifications", "name": "Push Notifications", "enabled": true }
            ]
          }
        `,
        language: 'javascript',
        attemptId: 'json-accuracy-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('JSON_DATA_INLINING');
      expect(result.finalCode).toBeDefined();

      const transformedCode = result.finalCode!;

      // Should not contain original import
      expect(transformedCode).not.toContain('import config from "./app-config.json"');

      // Should contain inlined config object
      expect(transformedCode).toContain('const config = {');

      // Should preserve all JSON data accurately
      expect(transformedCode).toContain('"https://api.example.com/v1"');
      expect(transformedCode).toContain('5000');
      expect(transformedCode).toContain('"Test Application"');
      expect(transformedCode).toContain('"1.2.3"');
      expect(transformedCode).toContain('"Authentication"');
      expect(transformedCode).toContain('"Analytics"');
      expect(transformedCode).toContain('"Push Notifications"');

      // Should preserve nested structure
      expect(transformedCode).toContain('app: {');
      expect(transformedCode).toContain('features: [');

      // Should preserve boolean values
      expect(transformedCode).toContain('enabled: true');
      expect(transformedCode).toContain('enabled: false');

      // Should preserve component logic
      expect(transformedCode).toContain('config.apiUrl');
      expect(transformedCode).toContain('config.timeout');
      expect(transformedCode).toContain('config.app.name');
      expect(transformedCode).toContain('config.app.version');
    });

    it('should handle complex JSON structures with arrays and nested objects', async () => {
      const request: RecoveryRequest = {
        artifactId: 'complex-json-test',
        artifactCode: `
          import data from "./complex-data.json";

          const Dashboard = () => (
            <div>
              {data.sections.map(section => (
                <div key={section.id}>
                  <h2>{section.title}</h2>
                  {section.widgets.map(widget => (
                    <div key={widget.id} style={{ ...widget.style }}>
                      <h3>{widget.title}</h3>
                      <p>{widget.description}</p>
                      {widget.data && widget.data.values.map(value => (
                        <span key={value.key}>{value.label}: {value.amount}</span>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        `,
        errorMessage: 'JSON module resolution failed',
        messageContent: `
          {
            "sections": [
              {
                "id": "overview",
                "title": "Overview",
                "widgets": [
                  {
                    "id": "stats",
                    "title": "Statistics",
                    "description": "Key metrics",
                    "style": {
                      "backgroundColor": "#f8f9fa",
                      "padding": "16px",
                      "borderRadius": "8px"
                    },
                    "data": {
                      "values": [
                        { "key": "users", "label": "Users", "amount": 1250 },
                        { "key": "revenue", "label": "Revenue", "amount": 45000 }
                      ]
                    }
                  }
                ]
              },
              {
                "id": "analytics",
                "title": "Analytics",
                "widgets": [
                  {
                    "id": "chart",
                    "title": "Performance Chart",
                    "description": "Monthly performance data",
                    "style": {
                      "height": "300px",
                      "marginBottom": "20px"
                    }
                  }
                ]
              }
            ]
          }
        `,
        language: 'javascript',
        attemptId: 'complex-json-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      const transformedCode = result.finalCode!;

      // Should preserve deep nesting
      expect(transformedCode).toContain('sections: [');
      expect(transformedCode).toContain('widgets: [');
      expect(transformedCode).toContain('data: {');
      expect(transformedCode).toContain('values: [');

      // Should preserve style objects
      expect(transformedCode).toContain('style: {');
      expect(transformedCode).toContain('backgroundColor:');
      expect(transformedCode).toContain('borderRadius:');
      expect(transformedCode).toContain('marginBottom:');

      // Should preserve all array items
      expect(transformedCode).toContain('"overview"');
      expect(transformedCode).toContain('"analytics"');
      expect(transformedCode).toContain('"stats"');
      expect(transformedCode).toContain('"chart"');

      // Should preserve numeric values
      expect(transformedCode).toContain('1250');
      expect(transformedCode).toContain('45000');
    });
  });

  describe('Import Removal Transformation Accuracy', () => {
    it('should remove imports while preserving component functionality', async () => {
      const request: RecoveryRequest = {
        artifactId: 'import-removal-test',
        artifactCode: `
          import { utils } from "./missing-utils";
          import { helpers } from "./missing-helpers";

          const Component = ({ data }) => {
            const formattedData = utils.format(data);
            const processedData = helpers.process(formattedData);

            return (
              <div>
                <h1>Data Display</h1>
                <p>Original: {data}</p>
                <p>Formatted: {formattedData}</p>
                <p>Processed: {processedData}</p>
              </div>
            );
          };

          export default Component;
        `,
        errorMessage: 'Cannot resolve missing modules',
        messageContent: '', // No CSS or JSON to trigger higher priority strategies
        language: 'javascript',
        attemptId: 'import-removal-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('IMPORT_REMOVAL');
      expect(result.finalCode).toBeDefined();

      const transformedCode = result.finalCode!;

      // Should remove problematic imports
      expect(transformedCode).not.toContain('import { utils } from "./missing-utils"');
      expect(transformedCode).not.toContain('import { helpers } from "./missing-helpers"');

      // Should preserve component structure
      expect(transformedCode).toContain('const Component = ({ data }) => {');
      expect(transformedCode).toContain('export default Component');

      // Should preserve JSX structure
      expect(transformedCode).toContain('<div>');
      expect(transformedCode).toContain('<h1>Data Display</h1>');
      expect(transformedCode).toContain('<p>Original: {data}</p>');

      // Should handle missing function calls gracefully
      // (Implementation should either comment out or provide fallbacks)
      expect(transformedCode).not.toContain('utils.format(data)');
      expect(transformedCode).not.toContain('helpers.process(formattedData)');
    });

    it('should preserve working imports while removing problematic ones', async () => {
      const request: RecoveryRequest = {
        artifactId: 'selective-import-removal-test',
        artifactCode: `
          import React from 'react';
          import { useState } from 'react';
          import { problematicUtil } from './missing-module';

          const Counter = () => {
            const [count, setCount] = useState(0);
            const enhanced = problematicUtil.enhance(count);

            return (
              <div>
                <p>Count: {count}</p>
                <p>Enhanced: {enhanced}</p>
                <button onClick={() => setCount(count + 1)}>Increment</button>
              </div>
            );
          };

          export default Counter;
        `,
        errorMessage: 'Cannot resolve ./missing-module',
        messageContent: '',
        language: 'javascript',
        attemptId: 'selective-import-removal-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      const transformedCode = result.finalCode!;

      // Should preserve React imports
      expect(transformedCode).toContain('import React from \'react\'');
      expect(transformedCode).toContain('import { useState } from \'react\'');

      // Should remove problematic import
      expect(transformedCode).not.toContain('import { problematicUtil } from \'./missing-module\'');

      // Should preserve React functionality
      expect(transformedCode).toContain('useState(0)');
      expect(transformedCode).toContain('setCount(count + 1)');

      // Should handle the removed utility gracefully
      expect(transformedCode).not.toContain('problematicUtil.enhance(count)');
    });
  });

  describe('Transformation Validation Accuracy', () => {
    it('should validate that transformations produce syntactically correct code', async () => {
      const testCases = [
        {
          name: 'CSS Module with complex selectors',
          code: 'import styles from "./complex.module.css";\nconst App = () => <div className={styles.complexClass}>Test</div>;',
          content: '.complex-class { background: linear-gradient(45deg, #ff0000, #00ff00); }',
          expectedStrategy: 'CSS_MODULE_CONVERSION'
        },
        {
          name: 'JSON with nested arrays',
          code: 'import data from "./nested.json";\nconst List = () => data.items.map(item => <div key={item.id}>{item.name}</div>);',
          content: '{"items": [{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}]}',
          expectedStrategy: 'JSON_DATA_INLINING'
        },
        {
          name: 'Mixed imports requiring removal',
          code: 'import { missing } from "./missing";\nconst Simple = () => <div>Simple component</div>;',
          content: '',
          expectedStrategy: 'IMPORT_REMOVAL'
        }
      ];

      for (const testCase of testCases) {
        const request: RecoveryRequest = {
          artifactId: `validation-${testCase.name.replace(/\s+/g, '-').toLowerCase()}`,
          artifactCode: testCase.code,
          errorMessage: 'Module resolution failed',
          messageContent: testCase.content,
          language: 'javascript',
          attemptId: `validation-test-${Date.now()}`
        };

        const result = await defaultStrategyExecutor.executeRecovery(request);

        expect(result.success).toBe(true);
        expect(result.strategy).toBe(testCase.expectedStrategy);
        expect(result.finalCode).toBeDefined();

        const transformedCode = result.finalCode!;

        // Basic syntax validation
        expect(transformedCode.length).toBeGreaterThan(0);

        // Should not contain obvious syntax errors
        expect(transformedCode).not.toContain('import from');
        expect(transformedCode).not.toContain('{ }');
        expect(transformedCode).not.toContain('const  = ');

        // Should maintain proper bracing
        const openBraces = (transformedCode.match(/\{/g) || []).length;
        const closeBraces = (transformedCode.match(/\}/g) || []).length;
        expect(openBraces).toBe(closeBraces);

        // Should maintain proper parentheses
        const openParens = (transformedCode.match(/\(/g) || []).length;
        const closeParens = (transformedCode.match(/\)/g) || []).length;
        expect(openParens).toBe(closeParens);
      }
    });

    it('should preserve original code semantics after transformation', async () => {
      const request: RecoveryRequest = {
        artifactId: 'semantics-preservation-test',
        artifactCode: `
          import styles from "./semantic.module.css";

          const SemanticComponent = ({ isActive, children, onClick }) => {
            const className = isActive ? styles.activeButton : styles.inactiveButton;

            return (
              <button
                className={className}
                onClick={onClick}
                disabled={!isActive}
              >
                {children}
              </button>
            );
          };

          export default SemanticComponent;
        `,
        errorMessage: 'CSS module not found',
        messageContent: `
          .active-button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
          }

          .inactive-button {
            background: #6c757d;
            color: #adb5bd;
            border: none;
            padding: 10px 20px;
            cursor: not-allowed;
          }
        `,
        language: 'javascript',
        attemptId: 'semantics-preservation-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      const transformedCode = result.finalCode!;

      // Should preserve component name and structure
      expect(transformedCode).toContain('const SemanticComponent = ({ isActive, children, onClick }) => {');

      // Should preserve conditional logic
      expect(transformedCode).toContain('isActive ? styles.activeButton : styles.inactiveButton');

      // Should preserve all props and attributes
      expect(transformedCode).toContain('onClick={onClick}');
      expect(transformedCode).toContain('disabled={!isActive}');
      expect(transformedCode).toContain('{children}');

      // Should preserve export
      expect(transformedCode).toContain('export default SemanticComponent');

      // Should convert styles appropriately
      expect(transformedCode).toContain('activeButton:');
      expect(transformedCode).toContain('inactiveButton:');
      expect(transformedCode).toContain('background:');
      expect(transformedCode).toContain('#007bff');
      expect(transformedCode).toContain('#6c757d');
    });
  });
});