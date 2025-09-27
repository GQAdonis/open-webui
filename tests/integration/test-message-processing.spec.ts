/**
 * Integration Tests: Message Content Processing
 * These tests validate the end-to-end message processing workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Message Content Processing Integration', () => {
  let messageProcessor: any;
  let mockDependencyResolver: any;
  let mockIntentClassifier: any;

  beforeEach(() => {
    // Mock dependencies - these will fail until implementations exist
    mockDependencyResolver = {
      resolveDependencies: vi.fn(),
      extractCodeBlocks: vi.fn()
    };

    mockIntentClassifier = {
      classifyError: vi.fn(),
      analyzeArtifactContext: vi.fn(),
      shouldShowRecoveryUI: vi.fn()
    };

    // This will fail until implementation exists
    // @ts-expect-error - Implementation doesn't exist yet
    messageProcessor = new MessageProcessor({
      dependencyResolver: mockDependencyResolver,
      intentClassifier: mockIntentClassifier
    });
  });

  describe('Full Message Processing Workflow', () => {
    it('should process message with CSS module and successful resolution', async () => {
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
          padding: 10px;
          border-radius: 4px;
        }
        \`\`\`
      `;

      const artifactCode = `import styles from "./Button.module.css";
export default function Button() {
  return <button className={styles.primary}>Click me</button>;
}`;

      // Mock successful dependency resolution
      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: `const styles = {
  primary: {
    backgroundColor: 'blue',
    padding: '10px',
    borderRadius: '4px'
  }
};
export default function Button() {
  return <button className={styles.primary}>Click me</button>;
}`,
        strategyUsed: 'CSS_MODULE_CONVERSION',
        confidence: 0.95,
        appliedChanges: [
          {
            type: 'CSS_MODULE_IMPORT_REPLACEMENT',
            originalText: 'import styles from "./Button.module.css";',
            newText: 'const styles = { primary: { backgroundColor: \'blue\', padding: \'10px\', borderRadius: \'4px\' } };',
            description: 'Converted CSS module import to inline styles'
          }
        ]
      });

      const result = await messageProcessor.processMessage(messageContent, artifactCode);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('const styles = {');
      expect(result.transformedCode).toContain('backgroundColor: \'blue\'');
      expect(result.strategyUsed).toBe('CSS_MODULE_CONVERSION');
      expect(mockDependencyResolver.resolveDependencies).toHaveBeenCalledWith(messageContent, artifactCode);
    });

    it('should process message with JSON import and successful resolution', async () => {
      const messageContent = `
        Configuration setup:

        \`\`\`jsx
        import config from "./config.json";
        console.log(config.apiUrl);
        \`\`\`

        \`\`\`json
        {
          "apiUrl": "https://api.example.com",
          "timeout": 5000,
          "retries": 3
        }
        \`\`\`
      `;

      const artifactCode = `import config from "./config.json";
console.log(config.apiUrl);`;

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: `const config = {
  "apiUrl": "https://api.example.com",
  "timeout": 5000,
  "retries": 3
};
console.log(config.apiUrl);`,
        strategyUsed: 'JSON_DATA_INLINING',
        confidence: 0.92
      });

      const result = await messageProcessor.processMessage(messageContent, artifactCode);

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('const config = {');
      expect(result.transformedCode).toContain('"apiUrl": "https://api.example.com"');
      expect(result.strategyUsed).toBe('JSON_DATA_INLINING');
    });

    it('should handle mixed import types in single message', async () => {
      const messageContent = `
        Component with multiple imports:

        \`\`\`jsx
        import styles from "./Component.module.css";
        import config from "./config.json";
        import { helper } from "./missing-helper";

        export default function Component() {
          return <div className={styles.container}>{config.title}</div>;
        }
        \`\`\`

        \`\`\`css
        .container {
          padding: 20px;
          background-color: #f0f0f0;
        }
        \`\`\`

        \`\`\`json
        {
          "title": "My Component",
          "version": "1.0.0"
        }
        \`\`\`
      `;

      const artifactCode = `import styles from "./Component.module.css";
import config from "./config.json";
import { helper } from "./missing-helper";

export default function Component() {
  return <div className={styles.container}>{config.title}</div>;
}`;

      // Mock partial success - CSS and JSON work, helper import fails
      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: `const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f0f0f0'
  }
};
const config = {
  "title": "My Component",
  "version": "1.0.0"
};
// import { helper } from "./missing-helper"; // Removed - not resolvable

export default function Component() {
  return <div className={styles.container}>{config.title}</div>;
}`,
        strategyUsed: 'MULTIPLE_STRATEGIES',
        confidence: 0.85,
        appliedChanges: [
          { type: 'CSS_MODULE_CONVERSION', description: 'Converted CSS module' },
          { type: 'JSON_DATA_INLINING', description: 'Inlined JSON data' },
          { type: 'IMPORT_REMOVAL', description: 'Removed unresolvable import' }
        ]
      });

      const result = await messageProcessor.processMessage(messageContent, artifactCode);

      expect(result.success).toBe(true);
      expect(result.transformedCode).toContain('const styles = {');
      expect(result.transformedCode).toContain('const config = {');
      expect(result.transformedCode).toContain('// Removed - not resolvable');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle processing errors gracefully', async () => {
      const messageContent = 'Invalid message content';
      const artifactCode = 'syntax error {{{';

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: false,
        errorMessage: 'Unable to parse code due to syntax errors',
        transformedCode: '',
        confidence: 0.0
      });

      const result = await messageProcessor.processMessage(messageContent, artifactCode);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('syntax errors');
      expect(result.transformedCode).toBe('');
    });

    it('should classify errors and determine UI visibility', async () => {
      const errorMessage = 'Cannot resolve module \'./Button.module.css\'';
      const artifactCode = 'import styles from "./Button.module.css";';

      mockIntentClassifier.classifyError.mockReturnValue({
        errorType: 'CSS_MODULE_ERROR',
        confidence: 0.9,
        canResolve: true,
        suggestedStrategy: 'CSS_MODULE_CONVERSION'
      });

      mockIntentClassifier.shouldShowRecoveryUI.mockReturnValue(true);

      const classification = await messageProcessor.classifyAndDetermineRecovery(
        errorMessage,
        artifactCode,
        'message content'
      );

      expect(classification.shouldShowRecovery).toBe(true);
      expect(classification.errorType).toBe('CSS_MODULE_ERROR');
      expect(classification.suggestedStrategy).toBe('CSS_MODULE_CONVERSION');
      expect(mockIntentClassifier.classifyError).toHaveBeenCalledWith(errorMessage, artifactCode);
    });
  });

  describe('Performance Integration', () => {
    it('should process large messages within acceptable time limits', async () => {
      // Generate large message content
      let largeContent = 'Large component with many imports:\n\n```jsx\n';
      for (let i = 0; i < 100; i++) {
        largeContent += `import module${i} from "./module${i}";\n`;
      }
      largeContent += 'export default function LargeComponent() { return <div>Large</div>; }\n```';

      const startTime = Date.now();

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: 'export default function LargeComponent() { return <div>Large</div>; }',
        strategyUsed: 'IMPORT_REMOVAL',
        confidence: 0.8,
        processingTimeMs: 500
      });

      const result = await messageProcessor.processMessage(largeContent, 'large code');
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle timeout scenarios gracefully', async () => {
      const messageContent = 'Complex processing scenario';
      const artifactCode = 'complex code';

      // Mock timeout scenario
      mockDependencyResolver.resolveDependencies.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: false,
              errorMessage: 'Processing timeout exceeded',
              timeout: true
            });
          }, 3000); // 3 second timeout
        });
      });

      const result = await messageProcessor.processMessage(messageContent, artifactCode, { timeout: 2000 });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('timeout');
    });
  });

  describe('Code Block Extraction Integration', () => {
    it('should extract and categorize code blocks correctly', () => {
      const messageContent = `
        Multi-language example:

        \`\`\`jsx
        import React from 'react';
        export default function App() {
          return <div>Hello</div>;
        }
        \`\`\`

        \`\`\`css
        .app {
          padding: 20px;
          background: white;
        }
        \`\`\`

        \`\`\`json
        {
          "name": "test-app",
          "version": "1.0.0"
        }
        \`\`\`

        \`\`\`typescript
        interface Props {
          title: string;
          count: number;
        }
        \`\`\`
      `;

      mockDependencyResolver.extractCodeBlocks.mockReturnValue([
        { type: 'jsx', content: 'import React from \'react\';...', language: 'jsx' },
        { type: 'css', content: '.app { padding: 20px; ...', language: 'css' },
        { type: 'json', content: '{ "name": "test-app", ...', language: 'json' },
        { type: 'typescript', content: 'interface Props { ...', language: 'typescript' }
      ]);

      const blocks = messageProcessor.extractCodeBlocks(messageContent);

      expect(blocks).toHaveLength(4);
      expect(blocks.find(b => b.type === 'jsx')).toBeDefined();
      expect(blocks.find(b => b.type === 'css')).toBeDefined();
      expect(blocks.find(b => b.type === 'json')).toBeDefined();
      expect(blocks.find(b => b.type === 'typescript')).toBeDefined();
    });

    it('should handle malformed code blocks gracefully', () => {
      const malformedContent = `
        Malformed examples:

        \`\`\`jsx
        // Missing closing backticks
        import React from 'react';

        \`\`\`css
        .incomplete {
          color: red
        // Missing closing backticks and brace

        \`\`\`
        // No language specified
        const x = 5;
        \`\`\`
      `;

      mockDependencyResolver.extractCodeBlocks.mockReturnValue([
        { type: 'jsx', content: 'import React from \'react\';', language: 'jsx', malformed: true },
        { type: 'css', content: '.incomplete { color: red', language: 'css', malformed: true },
        { type: 'unknown', content: 'const x = 5;', language: '', malformed: false }
      ]);

      const blocks = messageProcessor.extractCodeBlocks(malformedContent);

      expect(blocks).toHaveLength(3);
      expect(blocks.filter(b => b.malformed).length).toBeGreaterThan(0);
    });
  });

  describe('Context Analysis Integration', () => {
    it('should analyze artifact context for optimal strategy selection', () => {
      const messageContent = `
        Component with matching CSS:

        \`\`\`jsx
        import styles from "./Button.module.css";
        export default function Button({ variant }) {
          return <button className={styles[variant]}>Click</button>;
        }
        \`\`\`

        \`\`\`css
        .primary {
          background-color: blue;
        }
        .secondary {
          background-color: gray;
        }
        \`\`\`
      `;

      mockIntentClassifier.analyzeArtifactContext.mockReturnValue({
        availableBlocks: [
          { type: 'jsx', content: '...', language: 'jsx' },
          { type: 'css', content: '...', language: 'css' }
        ],
        hasRelevantCSS: true,
        hasImportStatements: true,
        hasRelevantJSON: false,
        targetArtifactName: 'Button',
        matchingCSSClasses: ['primary', 'secondary'],
        confidence: 0.95
      });

      const context = messageProcessor.analyzeContext(messageContent, 'Button component');

      expect(context.hasRelevantCSS).toBe(true);
      expect(context.confidence).toBeGreaterThan(0.9);
      expect(context.matchingCSSClasses).toContain('primary');
      expect(context.matchingCSSClasses).toContain('secondary');
    });

    it('should handle context analysis for multiple artifact types', () => {
      const mixedContent = `
        Full-stack component:

        \`\`\`tsx
        import styles from "./Dashboard.module.scss";
        import config from "./api-config.json";
        import { ApiClient } from "./api-client";
        \`\`\`

        \`\`\`scss
        .dashboard {
          display: grid;
          gap: 1rem;
        }
        \`\`\`

        \`\`\`json
        {
          "endpoints": {
            "users": "/api/users",
            "posts": "/api/posts"
          }
        }
        \`\`\`
      `;

      mockIntentClassifier.analyzeArtifactContext.mockReturnValue({
        availableBlocks: [
          { type: 'tsx', content: '...', language: 'tsx' },
          { type: 'scss', content: '...', language: 'scss' },
          { type: 'json', content: '...', language: 'json' }
        ],
        hasRelevantCSS: true,
        hasRelevantJSON: true,
        hasImportStatements: true,
        hasUnresolvableImports: true,
        complexityScore: 0.7
      });

      const context = messageProcessor.analyzeContext(mixedContent, 'Dashboard');

      expect(context.hasRelevantCSS).toBe(true);
      expect(context.hasRelevantJSON).toBe(true);
      expect(context.hasUnresolvableImports).toBe(true);
      expect(context.complexityScore).toBe(0.7);
    });
  });
});