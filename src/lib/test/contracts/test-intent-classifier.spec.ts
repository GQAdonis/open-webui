/**
 * Contract Tests: IntentClassifier
 * These tests validate the intent classification system for artifact error detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  IntentClassifier,
  type IntentClassifierAPI,
  type ErrorClassification,
  type ArtifactContext
} from '../../services/intent-classifier/intent-classifier';

describe('IntentClassifierAPI Contract Tests', () => {
  let intentClassifier: IntentClassifierAPI;

  beforeEach(() => {
    intentClassifier = new IntentClassifier({
      confidenceThreshold: 0.7,
      supportedErrorTypes: [
        'CSS_MODULE_ERROR',
        'IMPORT_ERROR',
        'BUNDLING_ERROR',
        'SYNTAX_ERROR',
        'DEPENDENCY_ERROR'
      ]
    });
  });

  describe('classifyError', () => {
    it('should classify CSS module import errors correctly', () => {
      const errorMessage = 'Cannot resolve module \'./Button.module.css\'';
      const artifactCode = 'import styles from "./Button.module.css";';

      const classification = intentClassifier.classifyError(errorMessage, artifactCode);

      expect(classification.errorType).toBe('CSS_MODULE_ERROR');
      expect(classification.confidence).toBeGreaterThan(0.8);
      expect(classification.canResolve).toBe(true);
      expect(classification.suggestedStrategy).toBe('CSS_MODULE_CONVERSION');
    });

    it('should classify JSON import errors correctly', () => {
      const errorMessage = 'Module not found: Can\'t resolve \'./config.json\'';
      const artifactCode = 'import config from "./config.json";';

      const classification = intentClassifier.classifyError(errorMessage, artifactCode);

      expect(classification.errorType).toBe('IMPORT_ERROR');
      expect(classification.confidence).toBeGreaterThan(0.7);
      expect(classification.canResolve).toBe(true);
      expect(classification.suggestedStrategy).toBe('JSON_DATA_INLINING');
    });

    it('should classify bundling dependency errors', () => {
      const errorMessage = 'Failed to resolve dependencies for bundling';
      const artifactCode = 'import { Component } from "./utils";';

      const classification = intentClassifier.classifyError(errorMessage, artifactCode);

      expect(classification.errorType).toBe('BUNDLING_ERROR');
      expect(classification.canResolve).toBe(true);
      expect(classification.suggestedStrategy).toBe('IMPORT_REMOVAL');
    });

    it('should reject syntax errors as unresolvable', () => {
      const errorMessage = 'Unexpected token \'}\' at line 10';
      const artifactCode = 'function test() { return }; // missing value';

      const classification = intentClassifier.classifyError(errorMessage, artifactCode);

      expect(classification.errorType).toBe('SYNTAX_ERROR');
      expect(classification.canResolve).toBe(false);
      expect(classification.suggestedStrategy).toBeUndefined();
    });

    it('should handle network/runtime errors as unresolvable', () => {
      const errorMessage = 'Network error loading Sandpack';
      const artifactCode = 'console.log("hello");';

      const classification = intentClassifier.classifyError(errorMessage, artifactCode);

      expect(classification.errorType).toBe('NETWORK_ERROR');
      expect(classification.canResolve).toBe(false);
    });
  });

  describe('analyzeArtifactContext', () => {
    it('should analyze message content for available code blocks', () => {
      const messageContent = `
        Here's a component with CSS:

        \`\`\`jsx
        import styles from "./Button.module.css";
        export default function Button() {
          return <button className={styles.primary}>Click</button>;
        }
        \`\`\`

        \`\`\`css
        .primary {
          background-color: blue;
          padding: 10px;
        }
        \`\`\`
      `;

      const context: ArtifactContext = intentClassifier.analyzeArtifactContext(
        messageContent,
        'Button component'
      );

      expect(context.availableBlocks).toHaveLength(2);
      expect(context.availableBlocks[0].type).toBe('jsx');
      expect(context.availableBlocks[1].type).toBe('css');
      expect(context.hasRelevantCSS).toBe(true);
      expect(context.hasImportStatements).toBe(true);
    });

    it('should detect JSON data availability', () => {
      const messageContent = `
        Configuration file:
        \`\`\`json
        { "apiUrl": "https://api.example.com", "timeout": 5000 }
        \`\`\`

        Component using it:
        \`\`\`jsx
        import config from "./config.json";
        \`\`\`
      `;

      const context = intentClassifier.analyzeArtifactContext(messageContent, 'Config');

      expect(context.hasRelevantJSON).toBe(true);
      expect(context.availableBlocks.some(block => block.type === 'json')).toBe(true);
    });
  });

  describe('calculateResolutionConfidence', () => {
    it('should calculate high confidence for CSS module errors with available CSS', () => {
      const classification: ErrorClassification = {
        errorType: 'CSS_MODULE_ERROR',
        confidence: 0.9,
        canResolve: true,
        suggestedStrategy: 'CSS_MODULE_CONVERSION'
      };

      const context: ArtifactContext = {
        availableBlocks: [
          { type: 'css', content: '.primary { color: blue; }', language: 'css' }
        ],
        hasRelevantCSS: true,
        hasImportStatements: true,
        hasRelevantJSON: false,
        targetArtifactName: 'Button'
      };

      const confidence = intentClassifier.calculateResolutionConfidence(classification, context);

      expect(confidence).toBeGreaterThan(0.85);
    });

    it('should calculate lower confidence when resources are missing', () => {
      const classification: ErrorClassification = {
        errorType: 'CSS_MODULE_ERROR',
        confidence: 0.8,
        canResolve: true,
        suggestedStrategy: 'CSS_MODULE_CONVERSION'
      };

      const context: ArtifactContext = {
        availableBlocks: [],
        hasRelevantCSS: false,
        hasImportStatements: true,
        hasRelevantJSON: false,
        targetArtifactName: 'Button'
      };

      const confidence = intentClassifier.calculateResolutionConfidence(classification, context);

      expect(confidence).toBeLessThan(0.5);
    });
  });

  describe('shouldShowRecoveryUI', () => {
    it('should show recovery UI for resolvable errors with sufficient confidence', () => {
      const classification: ErrorClassification = {
        errorType: 'CSS_MODULE_ERROR',
        confidence: 0.85,
        canResolve: true,
        suggestedStrategy: 'CSS_MODULE_CONVERSION'
      };

      const shouldShow = intentClassifier.shouldShowRecoveryUI(classification);
      expect(shouldShow).toBe(true);
    });

    it('should NOT show recovery UI for syntax errors', () => {
      const classification: ErrorClassification = {
        errorType: 'SYNTAX_ERROR',
        confidence: 0.95,
        canResolve: false
      };

      const shouldShow = intentClassifier.shouldShowRecoveryUI(classification);
      expect(shouldShow).toBe(false);
    });

    it('should NOT show recovery UI for low confidence errors', () => {
      const classification: ErrorClassification = {
        errorType: 'IMPORT_ERROR',
        confidence: 0.4,
        canResolve: true,
        suggestedStrategy: 'IMPORT_REMOVAL'
      };

      const shouldShow = intentClassifier.shouldShowRecoveryUI(classification);
      expect(shouldShow).toBe(false);
    });
  });
});