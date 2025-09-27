/**
 * Contract Tests: DependencyResolverAPI
 *
 * These tests validate the API contract for the Advanced Artifact Dependency Resolution System.
 * They must FAIL before implementation and pass after implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DependencyResolver,
  type DependencyResolverAPI,
  type ResolutionResult,
  type CodeBlock,
  type ResolutionContext,
  type ChangeType
} from '../../services/artifact-dependency-resolver/dependency-resolver';

describe('DependencyResolverAPI Contract Tests', () => {
  let dependencyResolver: DependencyResolverAPI;

  beforeEach(() => {
    dependencyResolver = new DependencyResolver();
  });

  describe('resolveDependencies', () => {
    it('should resolve CSS module imports with Priority 100 strategy', async () => {
      const messageContent = `
        Here's a React button component:

        \`\`\`jsx
        import styles from "./Button.module.css";
        export default function Button() {
          return <button className={styles.primary}>Click me</button>;
        }
        \`\`\`

        \`\`\`css
        .primary {
          background-color: blue;
          font-size: 16px;
        }
        \`\`\`
      `;

      const artifactCode = `import styles from "./Button.module.css";
export default function Button() {
  return <button className={styles.primary}>Click me</button>;
}`;

      const result: ResolutionResult = await dependencyResolver.resolveDependencies(
        messageContent,
        artifactCode
      );

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe('CSS_MODULE_CONVERSION');
      expect(result.transformedCode).toContain('const styles = {');
      expect(result.transformedCode).toContain('backgroundColor: \'blue\'');
      expect(result.transformedCode).toContain('fontSize: \'16px\'');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.appliedChanges).toHaveLength(1);
      expect(result.appliedChanges[0].type).toBe('CSS_MODULE_IMPORT_REPLACEMENT' as ChangeType);
    });

    it('should handle JSON import inlining with Priority 80 strategy', async () => {
      const messageContent = `
        \`\`\`jsx
        import config from "./config.json";
        console.log(config.apiUrl);
        \`\`\`

        \`\`\`json
        { "apiUrl": "https://api.example.com", "timeout": 5000 }
        \`\`\`
      `;

      const artifactCode = `import config from "./config.json";
console.log(config.apiUrl);`;

      const result = await dependencyResolver.resolveDependencies(messageContent, artifactCode);

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe('JSON_DATA_INLINING');
      expect(result.transformedCode).toContain('const config = {');
      expect(result.transformedCode).toContain('"apiUrl": "https://api.example.com"');
      expect(result.appliedChanges[0].type).toBe('JSON_DATA_INLINE' as ChangeType);
    });

    it('should fallback to import removal with Priority 10 strategy', async () => {
      const messageContent = `
        \`\`\`jsx
        import unknown from "./missing.js";
        export default function Component() {
          return <div>Hello World</div>;
        }
        \`\`\`
      `;

      const artifactCode = `import unknown from "./missing.js";
export default function Component() {
  return <div>Hello World</div>;
}`;

      const result = await dependencyResolver.resolveDependencies(messageContent, artifactCode);

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe('IMPORT_REMOVAL');
      expect(result.transformedCode).not.toContain('import unknown from');
      expect(result.appliedChanges[0].type).toBe('IMPORT_REMOVAL' as ChangeType);
    });

    it('should fail gracefully with meaningful error for unresolvable code', async () => {
      const messageContent = 'Invalid content with no code blocks';
      const artifactCode = 'syntax error {{{';

      const result = await dependencyResolver.resolveDependencies(messageContent, artifactCode);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('Unable to resolve');
      expect(result.transformedCode).toBe('');
      expect(result.appliedChanges).toHaveLength(0);
    });
  });

  describe('extractCodeBlocks', () => {
    it('should extract code blocks with correct metadata', () => {
      const messageContent = `
        Here's some CSS:
        \`\`\`css
        .button { color: red; }
        \`\`\`

        And some JavaScript:
        \`\`\`javascript
        console.log('hello');
        \`\`\`
      `;

      const blocks: CodeBlock[] = dependencyResolver.extractCodeBlocks(messageContent);

      expect(blocks).toHaveLength(2);
      expect(blocks[0].type).toBe('css');
      expect(blocks[0].content).toContain('.button { color: red; }');
      expect(blocks[0].language).toBe('css');
      expect(blocks[1].type).toBe('javascript');
      expect(blocks[1].content).toContain('console.log(\'hello\');');
    });

    it('should handle empty message content gracefully', () => {
      const blocks = dependencyResolver.extractCodeBlocks('');
      expect(blocks).toHaveLength(0);
    });
  });

  describe('applyCSSModuleConversion', () => {
    it('should convert CSS module imports to inline styles', () => {
      const code = `import styles from "./Button.module.css";
export default function Button() {
  return <button className={styles.primary}>Click</button>;
}`;

      const context: ResolutionContext = {
        messageContent: `
          \`\`\`css
          .primary { background-color: blue; font-size: 16px; }
          \`\`\`
        `,
        availableBlocks: [{
          type: 'css',
          content: '.primary { background-color: blue; font-size: 16px; }',
          language: 'css'
        }],
        targetArtifact: 'Button'
      };

      const result = dependencyResolver.applyCSSModuleConversion(code, context);

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('const styles = {');
      expect(result.transformedCode).toContain('backgroundColor: \'blue\'');
      expect(result.transformedCode).toContain('fontSize: \'16px\'');
    });
  });

  describe('convertCSSPropertiesToCamelCase', () => {
    it('should convert kebab-case CSS properties to camelCase', () => {
      const cssText = 'background-color: red; border-radius: 4px; font-size: 14px;';
      const result = dependencyResolver.convertCSSPropertiesToCamelCase(cssText);

      expect(result).toContain('backgroundColor: \'red\'');
      expect(result).toContain('borderRadius: \'4px\'');
      expect(result).toContain('fontSize: \'14px\'');
    });

    it('should handle already camelCase properties', () => {
      const cssText = 'fontSize: 14px; backgroundColor: red;';
      const result = dependencyResolver.convertCSSPropertiesToCamelCase(cssText);

      expect(result).toContain('fontSize: \'14px\'');
      expect(result).toContain('backgroundColor: \'red\'');
    });
  });

  describe('validateResolutionResult', () => {
    it('should validate successful resolution results', () => {
      const result: ResolutionResult = {
        success: true,
        transformedCode: 'const styles = { primary: { color: "red" } };',
        appliedChanges: [],
        confidence: 0.9,
        strategyUsed: 'CSS_MODULE_CONVERSION'
      };

      const validation = dependencyResolver.validateResolutionResult(result);

      expect(validation.isValid).toBe(true);
      expect(validation.syntaxErrors).toHaveLength(0);
    });

    it('should detect syntax errors in transformed code', () => {
      const result: ResolutionResult = {
        success: true,
        transformedCode: 'const styles = { primary: { color: "red" }; // missing brace',
        appliedChanges: [],
        confidence: 0.9,
        strategyUsed: 'CSS_MODULE_CONVERSION'
      };

      const validation = dependencyResolver.validateResolutionResult(result);

      expect(validation.isValid).toBe(false);
      expect(validation.syntaxErrors.length).toBeGreaterThan(0);
    });
  });
});