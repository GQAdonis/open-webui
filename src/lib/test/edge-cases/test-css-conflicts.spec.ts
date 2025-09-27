/**
 * Multiple CSS Files Conflict Resolution Edge Case Validation Tests
 *
 * These tests validate that the dependency resolution system properly
 * handles scenarios where multiple CSS files are referenced or where
 * CSS content contains conflicting rules, ensuring consistent and
 * predictable resolution outcomes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { defaultStrategyExecutor, type RecoveryRequest } from '../../services/artifact-dependency-resolver/strategy-executor';

describe('Multiple CSS Files Conflict Resolution Edge Case Validation', () => {
  beforeEach(() => {
    // Reset any state
  });

  describe('Multiple CSS Import Conflicts', () => {
    it('should handle multiple CSS module imports with conflicting class names', async () => {
      const request: RecoveryRequest = {
        artifactId: 'multi-css-conflict-test',
        artifactCode: `
          import primaryStyles from "./primary.module.css";
          import secondaryStyles from "./secondary.module.css";
          import utilityStyles from "./utilities.module.css";

          const MultiStyleComponent = ({ variant, size }) => {
            return (
              <div className={\`\${primaryStyles.container} \${secondaryStyles.container} \${utilityStyles.container}\`}>
                <button
                  className={\`\${primaryStyles.button} \${secondaryStyles.button}\`}
                  style={{ fontSize: size }}
                >
                  <span className={utilityStyles.text}>
                    Multi-style button
                  </span>
                </button>
              </div>
            );
          };

          export default MultiStyleComponent;
        `,
        errorMessage: 'Multiple CSS modules not found',
        messageContent: `
          /* Primary styles */
          .container {
            padding: 20px;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
          }

          .button {
            background: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
          }

          .button:hover {
            background: #0056b3;
          }

          /* Secondary styles with conflicts */
          .container {
            margin: 10px;
            background: #f8f9fa;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }

          .button {
            background: #28a745;
            padding: 10px 20px;
            font-weight: bold;
          }

          .button:hover {
            background: #1e7e34;
          }

          /* Utility styles */
          .container {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .text {
            font-family: 'Arial', sans-serif;
            font-size: 14px;
            line-height: 1.5;
          }
        `,
        language: 'javascript',
        attemptId: 'multi-css-conflict-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('CSS_MODULE_CONVERSION');
      expect(result.finalCode).toBeDefined();

      const transformedCode = result.finalCode!;

      // Should create separate style objects for each import
      expect(transformedCode).toContain('const primaryStyles = {');
      expect(transformedCode).toContain('const secondaryStyles = {');
      expect(transformedCode).toContain('const utilityStyles = {');

      // Should preserve all conflicting properties in their respective objects
      // Primary styles
      expect(transformedCode).toMatch(/primaryStyles.*container.*padding.*20px/s);
      expect(transformedCode).toMatch(/primaryStyles.*button.*#007bff/s);

      // Secondary styles
      expect(transformedCode).toMatch(/secondaryStyles.*container.*margin.*10px/s);
      expect(transformedCode).toMatch(/secondaryStyles.*button.*#28a745/s);

      // Utility styles
      expect(transformedCode).toMatch(/utilityStyles.*container.*display.*flex/s);
      expect(transformedCode).toMatch(/utilityStyles.*text/s);

      // Should preserve the component logic with multiple className concatenations
      expect(transformedCode).toContain('primaryStyles.container');
      expect(transformedCode).toContain('secondaryStyles.container');
      expect(transformedCode).toContain('utilityStyles.container');
    });

    it('should handle CSS conflicts with media queries and pseudo-selectors', async () => {
      const request: RecoveryRequest = {
        artifactId: 'media-query-conflict-test',
        artifactCode: `
          import mobileStyles from "./mobile.module.css";
          import desktopStyles from "./desktop.module.css";

          const ResponsiveComponent = () => (
            <div className={\`\${mobileStyles.layout} \${desktopStyles.layout}\`}>
              <header className={\`\${mobileStyles.header} \${desktopStyles.header}\`}>
                <h1 className={mobileStyles.title}>Responsive Title</h1>
              </header>
              <main className={desktopStyles.content}>
                <p>Content goes here</p>
              </main>
            </div>
          );
        `,
        errorMessage: 'CSS modules with media queries not found',
        messageContent: `
          /* Mobile-first styles */
          .layout {
            display: block;
            padding: 10px;
            width: 100%;
          }

          .header {
            background: #f0f0f0;
            padding: 15px;
            text-align: center;
          }

          .title {
            font-size: 24px;
            margin: 0;
            color: #333;
          }

          @media (min-width: 768px) {
            .layout {
              display: grid;
              grid-template-columns: 1fr 3fr;
              gap: 20px;
              padding: 20px;
            }

            .header {
              grid-column: 1 / -1;
              background: linear-gradient(90deg, #667eea, #764ba2);
              color: white;
            }

            .title {
              font-size: 32px;
            }
          }

          /* Desktop-specific styles */
          .layout {
            max-width: 1200px;
            margin: 0 auto;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }

          .header {
            border-bottom: 2px solid #e0e0e0;
            position: sticky;
            top: 0;
            z-index: 100;
          }

          .content {
            padding: 30px;
            font-size: 18px;
            line-height: 1.6;
          }

          @media (max-width: 767px) {
            .content {
              padding: 15px;
              font-size: 16px;
            }
          }
        `,
        language: 'javascript',
        attemptId: 'media-query-conflict-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      const transformedCode = result.finalCode!;

      // Should create separate style objects
      expect(transformedCode).toContain('const mobileStyles = {');
      expect(transformedCode).toContain('const desktopStyles = {');

      // Should preserve base styles from both modules
      expect(transformedCode).toMatch(/mobileStyles.*layout/s);
      expect(transformedCode).toMatch(/desktopStyles.*layout/s);

      // Should handle media queries (may be simplified or preserved as strings)
      expect(transformedCode).toMatch(/@media|min-width|max-width/);

      // Should preserve all class references
      expect(transformedCode).toContain('mobileStyles.header');
      expect(transformedCode).toContain('desktopStyles.header');
      expect(transformedCode).toContain('desktopStyles.content');
    });

    it('should handle deeply nested CSS selectors with conflicts', async () => {
      const request: RecoveryRequest = {
        artifactId: 'nested-selectors-conflict-test',
        artifactCode: `
          import themeStyles from "./theme.module.css";
          import componentStyles from "./component.module.css";

          const NestedComponent = ({ theme }) => (
            <div className={\`\${themeStyles.root} \${componentStyles.root}\`}>
              <nav className={themeStyles.navigation}>
                <ul className={\`\${themeStyles.menu} \${componentStyles.menu}\`}>
                  <li className={themeStyles.menuItem}>
                    <a href="#" className={\`\${themeStyles.link} \${componentStyles.link}\`}>
                      Home
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          );
        `,
        errorMessage: 'Nested CSS modules not found',
        messageContent: `
          /* Theme styles with complex nesting */
          .root {
            font-family: 'Roboto', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
          }

          .root.dark-theme {
            --bg-primary: #1a1a1a;
            --text-primary: #ffffff;
          }

          .root.light-theme {
            --bg-primary: #ffffff;
            --text-primary: #333333;
          }

          .navigation {
            background: var(--nav-bg);
            border-bottom: 1px solid var(--border-color);
          }

          .navigation .menu {
            display: flex;
            list-style: none;
            margin: 0;
            padding: 0;
          }

          .navigation .menu .menu-item {
            position: relative;
          }

          .navigation .menu .menu-item .link {
            display: block;
            padding: 15px 20px;
            text-decoration: none;
            color: inherit;
            transition: background-color 0.2s ease;
          }

          .navigation .menu .menu-item .link:hover {
            background-color: var(--hover-bg);
          }

          .navigation .menu .menu-item .link:active {
            background-color: var(--active-bg);
          }

          /* Component styles with different approach */
          .root {
            box-sizing: border-box;
            min-height: 100vh;
          }

          .menu {
            flex-direction: column;
            width: 250px;
          }

          .menu-item {
            border-bottom: 1px solid #eee;
          }

          .menu-item:last-child {
            border-bottom: none;
          }

          .link {
            font-weight: 500;
            border-left: 3px solid transparent;
          }

          .link:hover {
            border-left-color: #007bff;
            background: linear-gradient(90deg, rgba(0,123,255,0.1), transparent);
          }

          /* Pseudo-element conflicts */
          .link::before {
            content: '→ ';
            opacity: 0;
            transition: opacity 0.2s ease;
          }

          .link:hover::before {
            opacity: 1;
          }
        `,
        language: 'javascript',
        attemptId: 'nested-selectors-conflict-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      const transformedCode = result.finalCode!;

      // Should create separate style objects
      expect(transformedCode).toContain('const themeStyles = {');
      expect(transformedCode).toContain('const componentStyles = {');

      // Should handle CSS custom properties
      expect(transformedCode).toMatch(/--bg-primary|--text-primary|--nav-bg/);

      // Should preserve class names with kebab-case to camelCase conversion
      expect(transformedCode).toContain('menuItem:');

      // Should handle pseudo-selectors and pseudo-elements
      expect(transformedCode).toMatch(/:hover|:active|::before/);

      // Should preserve complex nested relationships
      expect(transformedCode).toMatch(/navigation.*menu/s);
    });
  });

  describe('CSS Specificity and Cascade Conflicts', () => {
    it('should handle conflicting CSS specificity levels', async () => {
      const request: RecoveryRequest = {
        artifactId: 'specificity-conflict-test',
        artifactCode: `
          import globalStyles from "./global.module.css";
          import specificStyles from "./specific.module.css";

          const SpecificityComponent = ({ isHighlight, isDisabled }) => (
            <div className={globalStyles.container}>
              <button
                className={\`
                  \${globalStyles.button}
                  \${specificStyles.button}
                  \${isHighlight ? specificStyles.highlight : ''}
                  \${isDisabled ? specificStyles.disabled : ''}
                \`}
              >
                Specificity Test
              </button>
            </div>
          );
        `,
        errorMessage: 'CSS specificity modules not found',
        messageContent: `
          /* Global styles - low specificity */
          .container {
            padding: 10px;
          }

          .button {
            background: #6c757d;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          }

          /* ID-based styles - high specificity */
          #button {
            background: #007bff;
            padding: 12px 24px;
            font-weight: bold;
          }

          /* Class combinations - medium specificity */
          .container .button {
            background: #28a745;
            margin: 5px;
          }

          .container .button.highlight {
            background: #ffc107;
            box-shadow: 0 0 10px rgba(255, 193, 7, 0.5);
          }

          .container .button.disabled {
            background: #6c757d;
            cursor: not-allowed;
            opacity: 0.5;
          }

          /* Attribute selectors */
          .button[disabled] {
            background: #dc3545;
          }

          /* Pseudo-class combinations */
          .button:not(.disabled):hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }

          .button.highlight:not(.disabled):active {
            transform: translateY(0);
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
          }

          /* Important declarations */
          .button.important {
            background: #17a2b8 !important;
            color: white !important;
          }
        `,
        language: 'javascript',
        attemptId: 'specificity-conflict-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      const transformedCode = result.finalCode!;

      // Should create separate style objects
      expect(transformedCode).toContain('const globalStyles = {');
      expect(transformedCode).toContain('const specificStyles = {');

      // Should preserve all color values from different specificity levels
      expect(transformedCode).toContain('#6c757d');
      expect(transformedCode).toContain('#007bff');
      expect(transformedCode).toContain('#28a745');
      expect(transformedCode).toContain('#ffc107');
      expect(transformedCode).toContain('#dc3545');
      expect(transformedCode).toContain('#17a2b8');

      // Should handle pseudo-classes and combinators
      expect(transformedCode).toMatch(/:hover|:active|:not/);

      // Should preserve complex selectors (may be simplified)
      expect(transformedCode).toMatch(/highlight|disabled/);

      // Should handle !important declarations
      expect(transformedCode).toContain('!important');
    });

    it('should handle CSS cascade conflicts with vendor prefixes', async () => {
      const request: RecoveryRequest = {
        artifactId: 'vendor-prefix-conflict-test',
        artifactCode: `
          import modernStyles from "./modern.module.css";
          import legacyStyles from "./legacy.module.css";

          const VendorPrefixComponent = () => (
            <div className={\`\${modernStyles.container} \${legacyStyles.container}\`}>
              <div className={\`\${modernStyles.flexbox} \${legacyStyles.flexbox}\`}>
                <div className={modernStyles.item}>Item 1</div>
                <div className={legacyStyles.item}>Item 2</div>
              </div>
            </div>
          );
        `,
        errorMessage: 'Vendor prefix CSS modules not found',
        messageContent: `
          /* Modern CSS with standard properties */
          .container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 20px;
          }

          .flexbox {
            display: flex;
            justify-content: center;
            align-items: center;
            flex-wrap: wrap;
          }

          .item {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transform: scale(1);
            transition: transform 0.2s ease;
          }

          .item:hover {
            transform: scale(1.05);
          }

          /* Legacy CSS with vendor prefixes */
          .container {
            display: -webkit-box;
            display: -moz-box;
            display: -ms-flexbox;
            display: flex;
            -webkit-flex-wrap: wrap;
            -ms-flex-wrap: wrap;
            flex-wrap: wrap;
          }

          .flexbox {
            display: -webkit-flex;
            display: -moz-flex;
            display: -ms-flexbox;
            display: flex;
            -webkit-justify-content: center;
            -moz-justify-content: center;
            -ms-flex-pack: center;
            justify-content: center;
            -webkit-align-items: center;
            -moz-align-items: center;
            -ms-flex-align: center;
            align-items: center;
          }

          .item {
            background: -webkit-gradient(linear, left top, right bottom, from(#667eea), to(#764ba2));
            background: -webkit-linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            background: -moz-linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            background: -o-linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

            -webkit-border-radius: 8px;
            -moz-border-radius: 8px;
            border-radius: 8px;

            -webkit-box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            -moz-box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

            -webkit-transform: scale(1);
            -moz-transform: scale(1);
            -ms-transform: scale(1);
            -o-transform: scale(1);
            transform: scale(1);

            -webkit-transition: -webkit-transform 0.2s ease;
            -moz-transition: -moz-transform 0.2s ease;
            -o-transition: -o-transform 0.2s ease;
            transition: transform 0.2s ease;
          }

          .item:hover {
            -webkit-transform: scale(1.05);
            -moz-transform: scale(1.05);
            -ms-transform: scale(1.05);
            -o-transform: scale(1.05);
            transform: scale(1.05);
          }
        `,
        language: 'javascript',
        attemptId: 'vendor-prefix-conflict-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      const transformedCode = result.finalCode!;

      // Should create separate style objects
      expect(transformedCode).toContain('const modernStyles = {');
      expect(transformedCode).toContain('const legacyStyles = {');

      // Should preserve both modern and legacy CSS properties
      expect(transformedCode).toContain('display:');
      expect(transformedCode).toContain('flex');
      expect(transformedCode).toContain('grid');

      // Should handle vendor prefixes
      expect(transformedCode).toMatch(/-webkit-|-moz-|-ms-|-o-/);

      // Should preserve gradients (both modern and legacy)
      expect(transformedCode).toContain('#667eea');
      expect(transformedCode).toContain('#764ba2');
      expect(transformedCode).toMatch(/linear-gradient|gradient\(/);

      // Should handle transforms and transitions
      expect(transformedCode).toContain('scale');
      expect(transformedCode).toContain('transition');
    });
  });

  describe('CSS Custom Properties and Variable Conflicts', () => {
    it('should handle CSS custom property conflicts and fallbacks', async () => {
      const request: RecoveryRequest = {
        artifactId: 'css-variables-conflict-test',
        artifactCode: `
          import themeAStyles from "./theme-a.module.css";
          import themeBStyles from "./theme-b.module.css";

          const ThemeConflictComponent = ({ theme }) => (
            <div className={\`\${themeAStyles.root} \${themeBStyles.root}\`}>
              <header className={\`\${themeAStyles.header} \${themeBStyles.header}\`}>
                <h1 className={themeAStyles.title}>Theme Conflict Test</h1>
              </header>
              <main className={themeBStyles.content}>
                <p className={themeAStyles.text}>Content with conflicting variables</p>
              </main>
            </div>
          );
        `,
        errorMessage: 'CSS variable modules not found',
        messageContent: `
          /* Theme A - Blue theme */
          :root {
            --primary-color: #007bff;
            --secondary-color: #6c757d;
            --background-color: #ffffff;
            --text-color: #212529;
            --border-color: #dee2e6;
            --shadow-color: rgba(0, 0, 0, 0.1);
            --border-radius: 4px;
            --spacing-unit: 8px;
          }

          .root {
            background-color: var(--background-color);
            color: var(--text-color);
            font-family: var(--font-family, 'Arial', sans-serif);
          }

          .header {
            background: var(--primary-color);
            color: var(--background-color);
            padding: calc(var(--spacing-unit) * 2);
            border-bottom: 2px solid var(--border-color);
          }

          .title {
            margin: 0;
            font-size: calc(1rem + var(--spacing-unit) / 2);
          }

          .text {
            color: var(--text-color, #000000);
            line-height: var(--line-height, 1.5);
          }

          /* Theme B - Green theme with conflicts */
          :root {
            --primary-color: #28a745;
            --secondary-color: #17a2b8;
            --accent-color: #ffc107;
            --background-color: #f8f9fa;
            --text-color: #495057;
            --border-color: #ced4da;
            --shadow-color: rgba(0, 0, 0, 0.15);
            --border-radius: 8px;
            --spacing-unit: 12px;
            --font-size-base: 16px;
          }

          .root {
            background: linear-gradient(135deg, var(--background-color), var(--accent-color, #fff));
            min-height: 100vh;
            padding: var(--spacing-unit);
          }

          .header {
            background: var(--primary-color);
            border-radius: var(--border-radius);
            box-shadow: 0 2px 4px var(--shadow-color);
            margin-bottom: calc(var(--spacing-unit) * 2);
          }

          .content {
            background: var(--background-color);
            padding: calc(var(--spacing-unit) * 3);
            border-radius: var(--border-radius);
            border: 1px solid var(--border-color);
          }

          .text {
            font-size: var(--font-size-base, 14px);
            color: var(--secondary-color);
            margin: var(--spacing-unit) 0;
          }

          /* Fallback values for unsupported browsers */
          .root {
            background-color: #f8f9fa; /* Fallback */
            background: var(--background-gradient, #f8f9fa);
          }

          .header {
            background-color: #28a745; /* Fallback */
            background: var(--primary-color, #28a745);
          }
        `,
        language: 'javascript',
        attemptId: 'css-variables-conflict-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      const transformedCode = result.finalCode!;

      // Should create separate style objects
      expect(transformedCode).toContain('const themeAStyles = {');
      expect(transformedCode).toContain('const themeBStyles = {');

      // Should preserve CSS custom properties
      expect(transformedCode).toMatch(/--primary-color|--background-color|--text-color/);

      // Should handle var() functions with fallbacks
      expect(transformedCode).toMatch(/var\([^)]+,[^)]+\)/);

      // Should preserve calc() functions
      expect(transformedCode).toMatch(/calc\([^)]+\)/);

      // Should preserve both conflicting color values
      expect(transformedCode).toContain('#007bff'); // Theme A primary
      expect(transformedCode).toContain('#28a745'); // Theme B primary

      // Should handle gradient backgrounds
      expect(transformedCode).toContain('linear-gradient');
    });

    it('should handle CSS-in-JS style conflicts with CSS modules', async () => {
      const request: RecoveryRequest = {
        artifactId: 'css-in-js-conflict-test',
        artifactCode: `
          import moduleStyles from "./module.module.css";

          const CSSInJSConflictComponent = ({ dynamicColor, isLarge }) => {
            const inlineStyles = {
              container: {
                backgroundColor: dynamicColor || '#ffffff',
                padding: isLarge ? '20px' : '10px',
                border: '1px solid #ccc'
              },
              button: {
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px'
              }
            };

            return (
              <div
                className={moduleStyles.container}
                style={inlineStyles.container}
              >
                <button
                  className={moduleStyles.button}
                  style={inlineStyles.button}
                >
                  Conflicting Styles
                </button>
              </div>
            );
          };
        `,
        errorMessage: 'CSS module not found',
        messageContent: `
          .container {
            background-color: #f8f9fa;
            padding: 15px;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            margin: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }

          .button {
            background-color: #28a745;
            color: #ffffff;
            border: 1px solid #1e7e34;
            border-radius: 6px;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s ease;
          }

          .button:hover {
            background-color: #218838;
          }

          .button:active {
            background-color: #1e7e34;
          }
        `,
        language: 'javascript',
        attemptId: 'css-in-js-conflict-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      const transformedCode = result.finalCode!;

      // Should preserve the CSS module conversion
      expect(transformedCode).toContain('const moduleStyles = {');

      // Should preserve inline style objects
      expect(transformedCode).toContain('inlineStyles');
      expect(transformedCode).toContain('backgroundColor: dynamicColor');

      // Should preserve both CSS module and inline style references
      expect(transformedCode).toContain('className={moduleStyles.container}');
      expect(transformedCode).toContain('style={inlineStyles.container}');

      // Should preserve conflicting style values from both sources
      expect(transformedCode).toContain('#f8f9fa'); // CSS module background
      expect(transformedCode).toContain('#28a745'); // CSS module button
      expect(transformedCode).toContain('#007bff'); // Inline button

      // Should preserve dynamic style logic
      expect(transformedCode).toContain('isLarge ? \'20px\' : \'10px\'');
    });
  });

  describe('Performance Impact of Conflict Resolution', () => {
    it('should maintain performance with large numbers of conflicting CSS rules', async () => {
      // Generate large CSS with many conflicts
      const largeConflictingCSS = Array.from({ length: 500 }, (_, i) => `
        .component-${i} {
          background: #${(i * 1000).toString(16).padStart(6, '0').slice(0, 6)};
          color: #${((i + 1) * 1000).toString(16).padStart(6, '0').slice(0, 6)};
          padding: ${i % 50}px;
          margin: ${i % 30}px;
          border-radius: ${i % 20}px;
          font-size: ${12 + (i % 12)}px;
          z-index: ${i};
        }

        /* Conflicting rule */
        .component-${i} {
          background: #${((i + 500) * 1000).toString(16).padStart(6, '0').slice(0, 6)};
          padding: ${(i + 10) % 50}px;
          font-weight: ${i % 2 === 0 ? 'bold' : 'normal'};
        }
      `).join('\n');

      const request: RecoveryRequest = {
        artifactId: 'performance-conflict-test',
        artifactCode: `
          import styles from "./performance.module.css";
          const PerformanceTest = () => (
            <div>
              {Array.from({length: 100}, (_, i) => (
                <div key={i} className={styles[\`component-\${i}\`]}>
                  Component {i}
                </div>
              ))}
            </div>
          );
        `,
        errorMessage: 'Performance CSS module not found',
        messageContent: largeConflictingCSS,
        language: 'javascript',
        attemptId: 'performance-conflict-test-1'
      };

      const startTime = Date.now();
      const result = await defaultStrategyExecutor.executeRecovery(request);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds

      if (result.success) {
        const transformedCode = result.finalCode!;

        // Should handle all the components without truncation
        expect(transformedCode).toContain('const styles = {');
        expect(transformedCode.length).toBeGreaterThan(1000);

        // Should contain some of the generated components
        expect(transformedCode).toMatch(/component-\d+:/);
      }

      // Should report reasonable processing time
      expect(result.processingTimeMs).toBeLessThan(5000);
    });

    it('should handle memory efficiently with deeply nested conflict resolution', async () => {
      const deeplyNestedCSS = `
        ${Array.from({ length: 20 }, (_, depth) =>
          Array.from({ length: 10 }, (_, i) => `
            ${'.parent '.repeat(depth)}.child-${depth}-${i} {
              color: #${depth.toString(16).padStart(2, '0')}${i.toString(16).padStart(2, '0')}00;
              margin-left: ${depth * 10}px;
              z-index: ${depth * 100 + i};
            }
          `).join('\n')
        ).join('\n')}

        /* Conflicting deeply nested rules */
        ${Array.from({ length: 20 }, (_, depth) =>
          Array.from({ length: 10 }, (_, i) => `
            ${'.container '.repeat(depth)}.item-${depth}-${i} {
              background: #${(depth + 10).toString(16).padStart(2, '0')}${i.toString(16).padStart(2, '0')}ff;
              padding: ${(depth + 5) * 2}px;
            }
          `).join('\n')
        ).join('\n')}
      `;

      const request: RecoveryRequest = {
        artifactId: 'memory-efficiency-test',
        artifactCode: `
          import styles from "./deep.module.css";
          const DeepComponent = () => (
            <div className={styles['child-5-3']}>
              <div className={styles['item-10-7']}>
                Deep nesting test
              </div>
            </div>
          );
        `,
        errorMessage: 'Deep CSS module not found',
        messageContent: deeplyNestedCSS,
        language: 'javascript',
        attemptId: 'memory-efficiency-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result).toBeDefined();
      expect(result.processingTimeMs).toBeLessThan(3000);

      if (result.success) {
        const transformedCode = result.finalCode!;

        // Should successfully process without memory issues
        expect(transformedCode).toContain('const styles = {');
        expect(transformedCode).toMatch(/child-\d+-\d+:|item-\d+-\d+:/);
      }
    });
  });
});