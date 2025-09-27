/**
 * Circular Dependency Scenario Handling Edge Case Validation Tests
 *
 * These tests validate that the dependency resolution system properly
 * detects, handles, and resolves circular dependency scenarios without
 * falling into infinite loops or producing incorrect transformations,
 * ensuring system stability and reliability.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defaultStrategyExecutor, type RecoveryRequest } from '../../services/artifact-dependency-resolver/strategy-executor';

describe('Circular Dependency Scenario Handling Edge Case Validation', () => {
  beforeEach(() => {
    // Reset any state and clear mocks
    vi.clearAllMocks();
  });

  describe('Direct Circular Dependencies', () => {
    it('should detect and handle direct CSS import circular references', async () => {
      const request: RecoveryRequest = {
        artifactId: 'direct-circular-css-test',
        artifactCode: `
          import styles from "./a.module.css";
          import otherStyles from "./b.module.css";

          const CircularComponent = () => (
            <div className={styles.containerA}>
              <div className={otherStyles.containerB}>
                <span className={styles.textA}>Text A</span>
                <span className={otherStyles.textB}>Text B</span>
              </div>
            </div>
          );

          export default CircularComponent;
        `,
        errorMessage: 'Circular CSS dependencies detected',
        messageContent: `
          /* File a.module.css content */
          @import "./b.module.css";

          .container-a {
            background: #f0f0f0;
            padding: 20px;
          }

          .text-a {
            color: #333;
            font-size: 16px;
          }

          /* File b.module.css content (would import a.module.css) */
          @import "./a.module.css";

          .container-b {
            background: #ffffff;
            border: 1px solid #ddd;
            margin: 10px;
          }

          .text-b {
            color: #666;
            font-weight: bold;
          }

          /* Additional rules that reference both files */
          .combined-style {
            background: var(--color-from-a);
            border: var(--border-from-b);
          }
        `,
        language: 'javascript',
        attemptId: 'direct-circular-css-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('CSS_MODULE_CONVERSION');

      const transformedCode = result.finalCode!;

      // Should successfully break the circular dependency and create separate style objects
      expect(transformedCode).toContain('const styles = {');
      expect(transformedCode).toContain('const otherStyles = {');

      // Should preserve all class names with proper camelCase conversion
      expect(transformedCode).toContain('containerA:');
      expect(transformedCode).toContain('containerB:');
      expect(transformedCode).toContain('textA:');
      expect(transformedCode).toContain('textB:');

      // Should preserve all CSS properties
      expect(transformedCode).toContain('#f0f0f0');
      expect(transformedCode).toContain('#ffffff');
      expect(transformedCode).toContain('#333');
      expect(transformedCode).toContain('#666');

      // Should handle the component references correctly
      expect(transformedCode).toContain('styles.containerA');
      expect(transformedCode).toContain('otherStyles.containerB');

      // Should not create infinite loops or duplicate content
      const stylesMatches = (transformedCode.match(/const styles = {/g) || []).length;
      const otherStylesMatches = (transformedCode.match(/const otherStyles = {/g) || []).length;
      expect(stylesMatches).toBe(1);
      expect(otherStylesMatches).toBe(1);
    });

    it('should handle circular JSON import references', async () => {
      const request: RecoveryRequest = {
        artifactId: 'circular-json-test',
        artifactCode: `
          import configA from "./config-a.json";
          import configB from "./config-b.json";

          const CircularJsonComponent = () => {
            const mergedConfig = {
              ...configA,
              ...configB,
              combined: {
                nameA: configA.name,
                nameB: configB.name,
                referenceA: configA.references.configB,
                referenceB: configB.references.configA
              }
            };

            return (
              <div>
                <h1>{mergedConfig.combined.nameA}</h1>
                <h2>{mergedConfig.combined.nameB}</h2>
                <p>Ref A: {JSON.stringify(mergedConfig.combined.referenceA)}</p>
                <p>Ref B: {JSON.stringify(mergedConfig.combined.referenceB)}</p>
              </div>
            );
          };
        `,
        errorMessage: 'Circular JSON dependencies detected',
        messageContent: `
          {
            "name": "Config A",
            "version": "1.0.0",
            "settings": {
              "theme": "dark",
              "language": "en"
            },
            "references": {
              "configB": {
                "name": "Config B",
                "version": "2.0.0",
                "settings": {
                  "theme": "light",
                  "language": "es"
                },
                "references": {
                  "configA": {
                    "name": "Config A",
                    "note": "This creates a circular reference"
                  }
                }
              }
            },
            "features": ["feature-a1", "feature-a2"],
            "dependencies": {
              "external": ["lib1", "lib2"],
              "internal": ["config-b"]
            }
          }
        `,
        language: 'javascript',
        attemptId: 'circular-json-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('JSON_DATA_INLINING');

      const transformedCode = result.finalCode!;

      // Should create separate config objects
      expect(transformedCode).toContain('const configA = {');
      expect(transformedCode).toContain('const configB = {');

      // Should preserve the data structure without infinite recursion
      expect(transformedCode).toContain('"Config A"');
      expect(transformedCode).toContain('"Config B"');
      expect(transformedCode).toContain('"1.0.0"');
      expect(transformedCode).toContain('"2.0.0"');

      // Should handle the nested references appropriately
      expect(transformedCode).toContain('references:');
      expect(transformedCode).toContain('configB:');
      expect(transformedCode).toContain('configA:');

      // Should preserve the component logic
      expect(transformedCode).toContain('mergedConfig');
      expect(transformedCode).toContain('configA.name');
      expect(transformedCode).toContain('configB.name');
    });

    it('should detect circular dependencies in complex import chains', async () => {
      const request: RecoveryRequest = {
        artifactId: 'complex-circular-test',
        artifactCode: `
          import stylesA from "./chain-a.module.css";
          import stylesB from "./chain-b.module.css";
          import stylesC from "./chain-c.module.css";
          import dataA from "./data-a.json";
          import dataB from "./data-b.json";

          const ComplexCircularComponent = () => (
            <div className={stylesA.root}>
              <header className={stylesB.header}>
                <h1 className={stylesC.title}>{dataA.app.name}</h1>
                <nav className={stylesA.navigation}>
                  {dataB.menuItems.map(item => (
                    <a key={item.id} href={item.url} className={stylesB.navLink}>
                      {item.label}
                    </a>
                  ))}
                </nav>
              </header>
              <main className={stylesC.content}>
                <section className={stylesA.section}>
                  <p>Version: {dataA.version}</p>
                  <p>Theme: {dataB.theme.name}</p>
                </section>
              </main>
            </div>
          );
        `,
        errorMessage: 'Complex circular dependency chain detected',
        messageContent: `
          /* Chain A CSS - imports B */
          @import "./chain-b.module.css";

          .root {
            min-height: 100vh;
            background: var(--bg-primary);
            color: var(--text-primary);
          }

          .navigation {
            display: flex;
            gap: 20px;
            padding: 10px 0;
          }

          .section {
            padding: 20px;
            margin: 10px 0;
            background: var(--section-bg);
          }

          /* Chain B CSS - imports C */
          @import "./chain-c.module.css";

          .header {
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            padding: 20px;
            border-bottom: 2px solid var(--border);
          }

          .nav-link {
            color: var(--link-color);
            text-decoration: none;
            padding: 10px 15px;
            border-radius: 4px;
            transition: background-color 0.2s ease;
          }

          .nav-link:hover {
            background-color: var(--link-hover-bg);
          }

          /* Chain C CSS - imports A (completes circle) */
          @import "./chain-a.module.css";

          .title {
            font-size: 2.5rem;
            font-weight: bold;
            margin: 0;
            color: var(--title-color);
          }

          .content {
            flex: 1;
            padding: 30px;
            background: var(--content-bg);
          }

          /* Data A JSON */
          {
            "app": {
              "name": "Circular Dependency Test App",
              "version": "1.0.0"
            },
            "version": "1.0.0",
            "references": {
              "dataB": "./data-b.json"
            },
            "theme": {
              "colors": {
                "primary": "#007bff",
                "secondary": "#6c757d"
              }
            }
          }

          /* Data B JSON - references A */
          {
            "menuItems": [
              {"id": 1, "label": "Home", "url": "/"},
              {"id": 2, "label": "About", "url": "/about"},
              {"id": 3, "label": "Contact", "url": "/contact"}
            ],
            "theme": {
              "name": "Default Theme",
              "colors": {
                "background": "#ffffff",
                "text": "#333333"
              }
            },
            "references": {
              "dataA": "./data-a.json"
            }
          }
        `,
        language: 'javascript',
        attemptId: 'complex-circular-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should handle both CSS and JSON transformations
      expect(transformedCode).toContain('const stylesA = {');
      expect(transformedCode).toContain('const stylesB = {');
      expect(transformedCode).toContain('const stylesC = {');
      expect(transformedCode).toContain('const dataA = {');
      expect(transformedCode).toContain('const dataB = {');

      // Should preserve all class names
      expect(transformedCode).toContain('root:');
      expect(transformedCode).toContain('header:');
      expect(transformedCode).toContain('title:');
      expect(transformedCode).toContain('navigation:');
      expect(transformedCode).toContain('navLink:');

      // Should preserve JSON data
      expect(transformedCode).toContain('"Circular Dependency Test App"');
      expect(transformedCode).toContain('menuItems:');

      // Should maintain component functionality
      expect(transformedCode).toContain('dataA.app.name');
      expect(transformedCode).toContain('dataB.menuItems.map');
    });
  });

  describe('Indirect Circular Dependencies', () => {
    it('should handle self-referential CSS custom properties', async () => {
      const request: RecoveryRequest = {
        artifactId: 'self-referential-css-test',
        artifactCode: `
          import styles from "./self-ref.module.css";

          const SelfReferentialComponent = ({ theme = 'light' }) => (
            <div className={styles.container} data-theme={theme}>
              <div className={styles.card}>
                <h2 className={styles.title}>Self-Referential Styles</h2>
                <p className={styles.text}>This component uses self-referential CSS variables.</p>
                <button className={styles.button}>Action Button</button>
              </div>
            </div>
          );
        `,
        errorMessage: 'Self-referential CSS detected',
        messageContent: `
          :root {
            --primary-color: var(--primary-color, #007bff);
            --secondary-color: var(--primary-color);
            --text-color: var(--base-text, var(--text-color, #333));
            --background: var(--bg-light, var(--background, #fff));
            --shadow: var(--base-shadow, 0 2px 4px var(--shadow-color, rgba(0,0,0,0.1)));
            --border-radius: var(--radius-default, var(--border-radius, 4px));
          }

          [data-theme="dark"] {
            --primary-color: var(--primary-dark, var(--primary-color, #0056b3));
            --text-color: var(--text-dark, var(--text-color, #fff));
            --background: var(--bg-dark, var(--background, #333));
            --shadow-color: var(--shadow-dark, var(--shadow-color, rgba(255,255,255,0.1)));
          }

          .container {
            background: var(--background);
            color: var(--text-color);
            min-height: 100vh;
            padding: var(--spacing, 20px);
            font-family: var(--font-family, 'Arial', sans-serif);
          }

          .card {
            background: var(--card-bg, var(--background));
            border: 1px solid var(--border-color, var(--primary-color));
            border-radius: var(--border-radius);
            padding: var(--card-padding, calc(var(--spacing, 20px) * 1.5));
            box-shadow: var(--shadow);
            max-width: var(--card-width, 600px);
            margin: 0 auto;
          }

          .title {
            color: var(--title-color, var(--primary-color));
            font-size: var(--title-size, calc(var(--base-font-size, 16px) * 1.5));
            margin-bottom: var(--title-margin, var(--spacing, 20px));
            font-weight: var(--title-weight, 600);
          }

          .text {
            color: var(--text-color);
            line-height: var(--line-height, 1.6);
            margin-bottom: var(--text-margin, var(--spacing, 20px));
            font-size: var(--text-size, var(--base-font-size, 16px));
          }

          .button {
            background: var(--primary-color);
            color: var(--button-text, var(--background));
            border: none;
            border-radius: var(--border-radius);
            padding: var(--button-padding, calc(var(--spacing, 20px) / 2) var(--spacing, 20px));
            font-size: var(--button-font-size, var(--base-font-size, 16px));
            cursor: pointer;
            transition: var(--transition, all 0.2s ease);
            box-shadow: var(--button-shadow, var(--shadow));
          }

          .button:hover {
            background: var(--button-hover, var(--secondary-color, var(--primary-color)));
            transform: var(--button-hover-transform, translateY(-1px));
            box-shadow: var(--button-hover-shadow, var(--shadow));
          }

          .button:active {
            transform: var(--button-active-transform, translateY(0));
            box-shadow: var(--button-active-shadow, none);
          }
        `,
        language: 'javascript',
        attemptId: 'self-referential-css-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('CSS_MODULE_CONVERSION');

      const transformedCode = result.finalCode!;

      // Should handle self-referential CSS variables without infinite loops
      expect(transformedCode).toContain('const styles = {');
      expect(transformedCode).toContain('container:');
      expect(transformedCode).toContain('card:');
      expect(transformedCode).toContain('title:');
      expect(transformedCode).toContain('text:');
      expect(transformedCode).toContain('button:');

      // Should preserve fallback values from var() functions
      expect(transformedCode).toMatch(/var\([^)]+,[^)]+\)/);

      // Should preserve color values
      expect(transformedCode).toContain('#007bff');
      expect(transformedCode).toContain('#0056b3');
      expect(transformedCode).toContain('#333');
      expect(transformedCode).toContain('#fff');

      // Should preserve component structure
      expect(transformedCode).toContain('SelfReferentialComponent');
      expect(transformedCode).toContain('data-theme={theme}');
    });

    it('should handle JSON with recursive object references', async () => {
      const request: RecoveryRequest = {
        artifactId: 'recursive-json-test',
        artifactCode: `
          import treeData from "./recursive-tree.json";

          const RecursiveTreeComponent = () => {
            const renderNode = (node, depth = 0) => (
              <div
                key={node.id}
                style={{ marginLeft: depth * 20, marginBottom: 10 }}
              >
                <div>
                  <strong>{node.name}</strong> ({node.type})
                </div>
                {node.description && <p>{node.description}</p>}
                {node.metadata && (
                  <div>
                    <small>Created: {node.metadata.created}</small>
                    {node.metadata.parent && (
                      <small> | Parent: {node.metadata.parent.name}</small>
                    )}
                  </div>
                )}
                {node.children && node.children.length > 0 && (
                  <div>
                    {node.children.map(child => renderNode(child, depth + 1))}
                  </div>
                )}
              </div>
            );

            return (
              <div>
                <h1>Recursive Tree Structure</h1>
                <div>Total Nodes: {treeData.stats.totalNodes}</div>
                <div>Max Depth: {treeData.stats.maxDepth}</div>
                <div className="tree-container">
                  {renderNode(treeData.root)}
                </div>
              </div>
            );
          };
        `,
        errorMessage: 'Recursive JSON structure detected',
        messageContent: `
          {
            "stats": {
              "totalNodes": 7,
              "maxDepth": 3,
              "created": "2024-01-01T00:00:00Z"
            },
            "root": {
              "id": "root",
              "name": "Root Node",
              "type": "folder",
              "description": "The root of the tree structure",
              "metadata": {
                "created": "2024-01-01T00:00:00Z",
                "modified": "2024-01-01T00:00:00Z",
                "parent": null
              },
              "children": [
                {
                  "id": "child1",
                  "name": "Child Node 1",
                  "type": "folder",
                  "description": "First child node",
                  "metadata": {
                    "created": "2024-01-01T01:00:00Z",
                    "parent": {
                      "id": "root",
                      "name": "Root Node",
                      "reference": "circular"
                    }
                  },
                  "children": [
                    {
                      "id": "grandchild1",
                      "name": "Grandchild 1",
                      "type": "file",
                      "description": "First grandchild",
                      "size": 1024,
                      "metadata": {
                        "created": "2024-01-01T02:00:00Z",
                        "parent": {
                          "id": "child1",
                          "name": "Child Node 1",
                          "parent": {
                            "id": "root",
                            "name": "Root Node"
                          }
                        }
                      }
                    },
                    {
                      "id": "grandchild2",
                      "name": "Grandchild 2",
                      "type": "file",
                      "description": "Second grandchild",
                      "size": 2048,
                      "metadata": {
                        "created": "2024-01-01T02:30:00Z",
                        "parent": {
                          "id": "child1",
                          "name": "Child Node 1"
                        }
                      }
                    }
                  ]
                },
                {
                  "id": "child2",
                  "name": "Child Node 2",
                  "type": "folder",
                  "description": "Second child node",
                  "metadata": {
                    "created": "2024-01-01T01:30:00Z",
                    "parent": {
                      "id": "root",
                      "name": "Root Node"
                    }
                  },
                  "children": [
                    {
                      "id": "grandchild3",
                      "name": "Grandchild 3",
                      "type": "file",
                      "description": "Third grandchild with circular reference",
                      "size": 4096,
                      "metadata": {
                        "created": "2024-01-01T03:00:00Z",
                        "parent": {
                          "id": "child2",
                          "name": "Child Node 2",
                          "parent": {
                            "id": "root",
                            "name": "Root Node",
                            "children": "circular_reference_to_root"
                          }
                        }
                      },
                      "references": {
                        "sibling": {
                          "id": "grandchild1",
                          "name": "Grandchild 1"
                        },
                        "root": {
                          "id": "root",
                          "name": "Root Node"
                        }
                      }
                    }
                  ]
                }
              ]
            }
          }
        `,
        language: 'javascript',
        attemptId: 'recursive-json-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('JSON_DATA_INLINING');

      const transformedCode = result.finalCode!;

      // Should handle recursive JSON without infinite loops
      expect(transformedCode).toContain('const treeData = {');

      // Should preserve the tree structure
      expect(transformedCode).toContain('stats:');
      expect(transformedCode).toContain('totalNodes: 7');
      expect(transformedCode).toContain('maxDepth: 3');

      // Should preserve node data
      expect(transformedCode).toContain('"Root Node"');
      expect(transformedCode).toContain('"Child Node 1"');
      expect(transformedCode).toContain('"Child Node 2"');
      expect(transformedCode).toContain('"Grandchild 1"');
      expect(transformedCode).toContain('"Grandchild 2"');
      expect(transformedCode).toContain('"Grandchild 3"');

      // Should preserve metadata and references
      expect(transformedCode).toContain('metadata:');
      expect(transformedCode).toContain('parent:');
      expect(transformedCode).toContain('children:');

      // Should preserve component logic
      expect(transformedCode).toContain('RecursiveTreeComponent');
      expect(transformedCode).toContain('renderNode');
      expect(transformedCode).toContain('treeData.stats.totalNodes');
      expect(transformedCode).toContain('treeData.root');
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should activate circuit breaker for detected infinite dependency loops', async () => {
      // Mock a scenario that would create infinite recursion
      const request: RecoveryRequest = {
        artifactId: 'infinite-loop-test',
        artifactCode: `
          import styles from "./infinite.module.css";
          const InfiniteComponent = () => <div className={styles.infinite}>Infinite Loop Test</div>;
        `,
        errorMessage: 'Infinite dependency loop detected',
        messageContent: Array.from({ length: 100 }, (_, i) => `
          .infinite-${i} {
            background: var(--color-${(i + 1) % 100});
            color: var(--text-${(i + 1) % 100});
          }
          :root {
            --color-${i}: var(--derived-${i});
            --derived-${i}: var(--color-${(i + 1) % 100});
            --text-${i}: var(--text-derived-${i});
            --text-derived-${i}: var(--text-${(i + 1) % 100});
          }
        `).join('\n') + `
          .infinite {
            background: var(--color-0);
            color: var(--text-0);
            padding: 20px;
          }
        `,
        language: 'javascript',
        attemptId: 'infinite-loop-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result).toBeDefined();
      expect(result.processingTimeMs).toBeLessThan(5000); // Should not run indefinitely

      if (result.success) {
        // If it succeeds, it should have broken the circular dependencies
        const transformedCode = result.finalCode!;
        expect(transformedCode).toContain('const styles = {');
        expect(transformedCode).toContain('infinite:');
      } else {
        // If it fails, it should provide meaningful error information
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
        expect(result.strategy).toBeDefined();
        expect(result.circuitState).toBeDefined();
      }
    });

    it('should handle timeout scenarios in circular dependency resolution', async () => {
      const request: RecoveryRequest = {
        artifactId: 'timeout-circular-test',
        artifactCode: `
          import styles from "./timeout-circular.module.css";
          const TimeoutComponent = () => <div className={styles.test}>Timeout Test</div>;
        `,
        errorMessage: 'Complex circular dependency causing timeout',
        messageContent: `
          ${Array.from({ length: 50 }, (_, i) =>
            Array.from({ length: 20 }, (_, j) => `
              .class-${i}-${j} {
                background: var(--bg-${(i + 1) % 50}-${(j + 1) % 20});
                color: var(--color-${(i + j) % 100});
                border: 1px solid var(--border-${(i * j) % 50});
              }
              :root {
                --bg-${i}-${j}: var(--base-bg-${(i + 1) % 50}-${(j + 1) % 20});
                --base-bg-${i}-${j}: var(--bg-${(i + 2) % 50}-${(j + 2) % 20});
              }
            `).join('\n')
          ).join('\n')}

          .test {
            background: var(--bg-0-0);
            color: var(--color-0);
            padding: 20px;
            border: 1px solid var(--border-0);
          }
        `,
        language: 'javascript',
        attemptId: 'timeout-circular-test-1'
      };

      const startTime = Date.now();
      const result = await defaultStrategyExecutor.executeRecovery(request);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(8000); // Should timeout or complete within reasonable time

      // Should either succeed with simplified CSS or fail gracefully
      if (result.success) {
        expect(result.finalCode).toContain('const styles = {');
        expect(result.finalCode).toContain('test:');
      } else {
        expect(result.errors).toBeDefined();
        expect(result.processingTimeMs).toBeLessThan(8000);
      }
    });
  });

  describe('Performance Impact of Circular Dependency Detection', () => {
    it('should maintain performance when detecting circular dependencies', async () => {
      const request: RecoveryRequest = {
        artifactId: 'performance-circular-test',
        artifactCode: `
          import styles from "./performance-circular.module.css";
          const PerformanceComponent = () => (
            <div>
              {Array.from({ length: 100 }, (_, i) => (
                <div key={i} className={styles[\`item-\${i}\`]}>
                  Item {i}
                </div>
              ))}
            </div>
          );
        `,
        errorMessage: 'Performance test with potential circular dependencies',
        messageContent: `
          ${Array.from({ length: 200 }, (_, i) => `
            .item-${i} {
              background: hsl(${i * 1.8}, 70%, 50%);
              color: ${i % 2 === 0 ? 'white' : 'black'};
              padding: ${5 + (i % 20)}px;
              margin: ${2 + (i % 10)}px;
              border-radius: ${i % 15}px;
              transform: rotate(${(i % 360) - 180}deg);
              transition: all ${200 + (i % 300)}ms ease;
            }

            .item-${i}:hover {
              transform: rotate(${((i % 360) - 180) * 1.1}deg) scale(1.05);
              box-shadow: 0 ${2 + (i % 8)}px ${4 + (i % 12)}px hsla(${i * 1.8}, 70%, 20%, 0.3);
            }

            .item-${i}:active {
              transform: rotate(${((i % 360) - 180) * 0.9}deg) scale(0.95);
            }
          `).join('\n')}

          /* Add some potential circular references */
          :root {
            ${Array.from({ length: 50 }, (_, i) => `
              --color-${i}: var(--base-color-${i}, hsl(${i * 7.2}, 60%, 50%));
              --base-color-${i}: var(--derived-color-${(i + 1) % 50});
              --derived-color-${i}: var(--color-${(i + 2) % 50});
            `).join('\n')}
          }
        `,
        language: 'javascript',
        attemptId: 'performance-circular-test-1'
      };

      const startTime = performance.now();
      const result = await defaultStrategyExecutor.executeRecovery(request);
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(3000); // Should complete quickly despite complexity

      if (result.success) {
        const transformedCode = result.finalCode!;

        // Should handle all items without performance degradation
        expect(transformedCode).toContain('const styles = {');
        expect(transformedCode).toMatch(/item-\d+:/);

        // Should preserve color values
        expect(transformedCode).toMatch(/hsl\(\d+(?:\.\d+)?,\s*\d+%,\s*\d+%\)/);

        // Should maintain component structure
        expect(transformedCode).toContain('PerformanceComponent');
      }

      // Processing time should be reasonable
      expect(result.processingTimeMs).toBeLessThan(3000);
    });

    it('should handle multiple potential circular dependency files concurrently', async () => {
      const promises = Array.from({ length: 3 }, (_, i) => {
        const request: RecoveryRequest = {
          artifactId: `concurrent-circular-test-${i}`,
          artifactCode: `
            import styles${i} from "./concurrent-${i}.module.css";
            const Component${i} = () => <div className={styles${i}.test}>Concurrent ${i}</div>;
          `,
          errorMessage: `Concurrent circular test ${i}`,
          messageContent: `
            ${Array.from({ length: 30 }, (_, j) => `
              .test-${j} {
                background: var(--bg-${(j + i) % 30});
                color: var(--text-${(j + i * 2) % 30});
              }
              :root {
                --bg-${j}: var(--base-${(j + 1) % 30});
                --base-${j}: var(--bg-${(j + 2) % 30});
                --text-${j}: var(--text-base-${(j + 1) % 30});
                --text-base-${j}: var(--text-${(j + 2) % 30});
              }
            `).join('\n')}
            .test {
              background: var(--bg-0);
              color: var(--text-0);
              padding: ${10 + i * 5}px;
            }
          `,
          language: 'javascript',
          attemptId: `concurrent-circular-test-${i}-1`
        };

        return defaultStrategyExecutor.executeRecovery(request);
      });

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(5000); // All should complete within 5 seconds

      results.forEach((result, i) => {
        expect(result).toBeDefined();
        if (result.success) {
          expect(result.finalCode).toContain(`const styles${i} = {`);
          expect(result.finalCode).toContain(`Component${i}`);
        }
        expect(result.processingTimeMs).toBeLessThan(3000);
      });
    });
  });
});