/**
 * Integration Tests: ArtifactRenderer Smart Recovery
 * These tests validate the smart recovery integration with existing ArtifactRenderer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ArtifactRenderer Smart Recovery Integration', () => {
  let enhancedArtifactRenderer: any;
  let mockRecoveryOrchestrator: any;
  let mockIntentClassifier: any;
  let mockOriginalRenderer: any;
  let mockErrorDetector: any;

  beforeEach(() => {
    // Mock the original ArtifactRenderer
    mockOriginalRenderer = {
      render: vi.fn(),
      parseXML: vi.fn(),
      extractCode: vi.fn(),
      handleError: vi.fn()
    };

    // Mock recovery services
    mockRecoveryOrchestrator = {
      executeRecoveryWorkflow: vi.fn(),
      categorizeErrorAndDetermineUI: vi.fn(),
      shouldAttemptRecovery: vi.fn()
    };

    mockIntentClassifier = {
      classifyError: vi.fn(),
      shouldShowRecoveryUI: vi.fn(),
      analyzeArtifactContext: vi.fn()
    };

    mockErrorDetector = {
      isRecoverableError: vi.fn(),
      extractErrorContext: vi.fn(),
      categorizeError: vi.fn()
    };

    // This will fail until implementation exists
    // @ts-expect-error - Implementation doesn't exist yet
    enhancedArtifactRenderer = new EnhancedArtifactRenderer({
      originalRenderer: mockOriginalRenderer,
      recoveryOrchestrator: mockRecoveryOrchestrator,
      intentClassifier: mockIntentClassifier,
      errorDetector: mockErrorDetector
    });
  });

  describe('Integration with Existing ArtifactRenderer', () => {
    it('should render successfully without recovery when no errors occur', async () => {
      const artifactXML = `
        <artifact identifier="simple-button" type="text/html">
          <![CDATA[
            export default function Button() {
              return <button>Simple Click</button>;
            }
          ]]>
        </artifact>
      `;

      const messageContent = 'Simple button component';

      // Mock successful original rendering
      mockOriginalRenderer.render.mockResolvedValue({
        success: true,
        renderedContent: '<button>Simple Click</button>',
        renderTimeMs: 80
      });

      const result = await enhancedArtifactRenderer.renderArtifact(artifactXML, messageContent);

      expect(result.success).toBe(true);
      expect(result.recoveryAttempted).toBe(false);
      expect(result.renderedContent).toBe('<button>Simple Click</button>');
      expect(mockOriginalRenderer.render).toHaveBeenCalled();
      expect(mockRecoveryOrchestrator.executeRecoveryWorkflow).not.toHaveBeenCalled();
    });

    it('should detect rendering failure and trigger smart recovery', async () => {
      const artifactXML = `
        <artifact identifier="css-button" type="text/html">
          <![CDATA[
            import styles from "./Button.module.css";
            export default function Button() {
              return <button className={styles.primary}>Click me</button>;
            }
          ]]>
        </artifact>
      `;

      const messageContent = `
        Here's a styled button:

        \`\`\`css
        .primary {
          background-color: blue;
          padding: 10px;
          border-radius: 4px;
        }
        \`\`\`
      `;

      // Mock original rendering failure
      mockOriginalRenderer.render.mockResolvedValue({
        success: false,
        errorMessage: 'Cannot resolve module \'./Button.module.css\'',
        errorType: 'MODULE_RESOLUTION_ERROR'
      });

      // Mock error classification
      mockIntentClassifier.classifyError.mockReturnValue({
        errorType: 'CSS_MODULE_ERROR',
        confidence: 0.92,
        canResolve: true,
        suggestedStrategy: 'CSS_MODULE_CONVERSION'
      });

      mockIntentClassifier.shouldShowRecoveryUI.mockReturnValue(true);

      // Mock successful recovery
      mockRecoveryOrchestrator.executeRecoveryWorkflow.mockResolvedValue({
        success: true,
        completedInStage: 1,
        finalCode: `const styles = {
  primary: {
    backgroundColor: 'blue',
    padding: '10px',
    borderRadius: '4px'
  }
};
export default function Button() {
  return <button className={styles.primary}>Click me</button>;
}`,
        stage1Result: {
          success: true,
          strategyUsed: 'CSS_MODULE_CONVERSION',
          confidence: 0.95
        }
      });

      // Mock successful re-render with fixed code
      mockOriginalRenderer.render.mockResolvedValueOnce({
        success: false,
        errorMessage: 'Module error'
      }).mockResolvedValueOnce({
        success: true,
        renderedContent: '<button style="background-color: blue; padding: 10px;">Click me</button>',
        renderTimeMs: 150
      });

      const result = await enhancedArtifactRenderer.renderArtifact(artifactXML, messageContent);

      expect(result.success).toBe(true);
      expect(result.recoveryAttempted).toBe(true);
      expect(result.recoverySuccessful).toBe(true);
      expect(result.originalError).toContain('Cannot resolve module');
      expect(result.recoveryMethod).toBe('CSS_MODULE_CONVERSION');
      expect(result.renderedContent).toContain('background-color: blue');

      expect(mockOriginalRenderer.render).toHaveBeenCalledTimes(2);
      expect(mockRecoveryOrchestrator.executeRecoveryWorkflow).toHaveBeenCalled();
    });

    it('should preserve original error handling when recovery is not applicable', async () => {
      const artifactXML = `
        <artifact identifier="syntax-error" type="text/html">
          <![CDATA[
            export default function Broken() {
              return <div>Missing closing brace;
            }
          ]]>
        </artifact>
      `;

      const messageContent = 'Broken component';

      // Mock original rendering failure with syntax error
      mockOriginalRenderer.render.mockResolvedValue({
        success: false,
        errorMessage: 'SyntaxError: Unexpected token at line 3',
        errorType: 'SYNTAX_ERROR'
      });

      // Mock error classification as non-recoverable
      mockIntentClassifier.classifyError.mockReturnValue({
        errorType: 'SYNTAX_ERROR',
        confidence: 0.98,
        canResolve: false
      });

      mockIntentClassifier.shouldShowRecoveryUI.mockReturnValue(false);

      const result = await enhancedArtifactRenderer.renderArtifact(artifactXML, messageContent);

      expect(result.success).toBe(false);
      expect(result.recoveryAttempted).toBe(false);
      expect(result.errorMessage).toContain('SyntaxError');
      expect(result.errorType).toBe('SYNTAX_ERROR');

      expect(mockRecoveryOrchestrator.executeRecoveryWorkflow).not.toHaveBeenCalled();
      expect(mockOriginalRenderer.handleError).toHaveBeenCalledWith({
        success: false,
        errorMessage: 'SyntaxError: Unexpected token at line 3',
        errorType: 'SYNTAX_ERROR'
      });
    });
  });

  describe('Smart Recovery Decision Making', () => {
    it('should analyze error context to make recovery decisions', async () => {
      const artifactCode = `import config from "./config.json";
import styles from "./styles.css";
console.log(config.apiUrl);`;

      const messageContent = `
        Configuration and styles:

        \`\`\`json
        { "apiUrl": "https://api.example.com" }
        \`\`\`

        No CSS provided
      `;

      const renderError = 'Multiple module resolution errors';

      mockIntentClassifier.analyzeArtifactContext.mockReturnValue({
        availableBlocks: [
          { type: 'json', content: '{ "apiUrl": "..." }', language: 'json' }
        ],
        hasRelevantJSON: true,
        hasRelevantCSS: false,
        hasImportStatements: true,
        resolvableImports: ['config.json'],
        problematicImports: ['styles.css'],
        complexityScore: 0.6
      });

      mockRecoveryOrchestrator.shouldAttemptRecovery.mockReturnValue({
        shouldAttempt: true,
        confidence: 0.75,
        expectedStrategies: ['JSON_DATA_INLINING', 'IMPORT_REMOVAL'],
        reasoning: 'JSON can be inlined, CSS import can be removed'
      });

      const decision = await enhancedArtifactRenderer.analyzeRecoveryPotential(
        artifactCode,
        renderError,
        messageContent
      );

      expect(decision.shouldAttemptRecovery).toBe(true);
      expect(decision.expectedStrategies).toContain('JSON_DATA_INLINING');
      expect(decision.expectedStrategies).toContain('IMPORT_REMOVAL');
      expect(decision.confidence).toBeGreaterThan(0.7);
    });

    it('should skip recovery for low-confidence scenarios', async () => {
      const artifactCode = 'import mysterious from "./unknown-module";';
      const messageContent = 'No relevant code blocks provided';
      const renderError = 'Cannot resolve mysterious module';

      mockIntentClassifier.analyzeArtifactContext.mockReturnValue({
        availableBlocks: [],
        hasRelevantJSON: false,
        hasRelevantCSS: false,
        hasImportStatements: true,
        resolvableImports: [],
        problematicImports: ['unknown-module'],
        complexityScore: 0.9
      });

      mockRecoveryOrchestrator.shouldAttemptRecovery.mockReturnValue({
        shouldAttempt: false,
        confidence: 0.15,
        reasoning: 'No context available for resolution'
      });

      const decision = await enhancedArtifactRenderer.analyzeRecoveryPotential(
        artifactCode,
        renderError,
        messageContent
      );

      expect(decision.shouldAttemptRecovery).toBe(false);
      expect(decision.confidence).toBeLessThan(0.3);
    });
  });

  describe('Recovery UI Integration', () => {
    it('should provide recovery UI state for successful recovery', async () => {
      const recoveryResult = {
        success: true,
        completedInStage: 2,
        stage1Result: {
          success: false,
          errorMessage: 'Auto-resolution insufficient'
        },
        stage2Result: {
          success: true,
          fixedCode: 'LLM-fixed code',
          confidence: 0.82,
          explanation: 'Applied intelligent code transformation'
        },
        finalCode: 'final transformed code'
      };

      const uiState = enhancedArtifactRenderer.generateRecoveryUIState(recoveryResult);

      expect(uiState.showRecoveryUI).toBe(true);
      expect(uiState.recoveryStage).toBe('completed');
      expect(uiState.currentStage).toBe('llm_fixing');
      expect(uiState.progressPercentage).toBe(100);
      expect(uiState.stageResults).toHaveLength(2);
      expect(uiState.stageResults[1].success).toBe(true);
      expect(uiState.userMessage).toContain('Successfully fixed');
      expect(uiState.explanation).toBe('Applied intelligent code transformation');
    });

    it('should provide recovery UI state for partial success', async () => {
      const recoveryResult = {
        success: true,
        completedInStage: 1,
        stage1Result: {
          success: true,
          strategyUsed: 'IMPORT_REMOVAL',
          confidence: 0.65,
          appliedChanges: ['Removed problematic import']
        },
        finalCode: 'code with imports removed'
      };

      const uiState = enhancedArtifactRenderer.generateRecoveryUIState(recoveryResult);

      expect(uiState.showRecoveryUI).toBe(true);
      expect(uiState.recoveryStage).toBe('completed');
      expect(uiState.currentStage).toBe('auto_resolution');
      expect(uiState.progressPercentage).toBe(100);
      expect(uiState.userMessage).toContain('Auto-resolution successful');
      expect(uiState.appliedChanges).toContain('Removed problematic import');
      expect(uiState.confidenceScore).toBe(0.65);
    });

    it('should provide recovery UI state for failure scenarios', async () => {
      const recoveryResult = {
        success: false,
        completedInStage: 0,
        stage1Result: {
          success: false,
          errorMessage: 'No applicable strategies'
        },
        stage2Result: {
          success: false,
          errorMessage: 'LLM service timeout'
        },
        circuitBreakerBlocked: true
      };

      const uiState = enhancedArtifactRenderer.generateRecoveryUIState(recoveryResult);

      expect(uiState.showRecoveryUI).toBe(true);
      expect(uiState.recoveryStage).toBe('failed');
      expect(uiState.errorMessage).toContain('Recovery attempts exhausted');
      expect(uiState.circuitBreakerActive).toBe(true);
      expect(uiState.canRetry).toBe(false);
      expect(uiState.suggestions).toContain('Manual intervention may be required');
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance metrics across recovery process', async () => {
      const artifactXML = '<artifact>performance test</artifact>';
      const messageContent = 'test content';

      const startTime = Date.now();

      // Mock original render failure
      mockOriginalRenderer.render.mockResolvedValue({
        success: false,
        errorMessage: 'Test error',
        renderTimeMs: 100
      });

      // Mock successful recovery
      mockIntentClassifier.shouldShowRecoveryUI.mockReturnValue(true);
      mockRecoveryOrchestrator.executeRecoveryWorkflow.mockResolvedValue({
        success: true,
        completedInStage: 1,
        finalCode: 'recovered code',
        performance: {
          totalTimeMs: 200,
          stage1TimeMs: 200
        }
      });

      // Mock successful re-render
      mockOriginalRenderer.render.mockResolvedValueOnce({
        success: false
      }).mockResolvedValueOnce({
        success: true,
        renderedContent: 'final render',
        renderTimeMs: 120
      });

      const result = await enhancedArtifactRenderer.renderArtifact(artifactXML, messageContent);

      expect(result.success).toBe(true);
      expect(result.performance).toBeDefined();
      expect(result.performance.originalRenderTimeMs).toBe(100);
      expect(result.performance.recoveryTimeMs).toBe(200);
      expect(result.performance.finalRenderTimeMs).toBe(120);
      expect(result.performance.totalTimeMs).toBeGreaterThan(400);
    });

    it('should handle concurrent recovery requests efficiently', async () => {
      const concurrentRequests = Array.from({ length: 3 }, (_, i) => ({
        xml: `<artifact identifier="concurrent-${i}">test ${i}</artifact>`,
        content: `test content ${i}`
      }));

      // Mock consistent behavior for all requests
      mockOriginalRenderer.render
        .mockResolvedValue({ success: false, errorMessage: 'Test error' })
        .mockResolvedValue({ success: true, renderedContent: 'recovered' });

      mockIntentClassifier.shouldShowRecoveryUI.mockReturnValue(true);
      mockRecoveryOrchestrator.executeRecoveryWorkflow.mockResolvedValue({
        success: true,
        completedInStage: 1,
        finalCode: 'recovered code'
      });

      const results = await Promise.all(
        concurrentRequests.map(req =>
          enhancedArtifactRenderer.renderArtifact(req.xml, req.content)
        )
      );

      expect(results).toHaveLength(3);
      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.recoveryAttempted).toBe(true);
      });

      // Each request should have triggered recovery independently
      expect(mockRecoveryOrchestrator.executeRecoveryWorkflow).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error State Consistency', () => {
    it('should maintain consistent error state across recovery attempts', async () => {
      const artifactId = 'consistent-error';
      const persistentError = 'Persistent module resolution error';

      // Mock consistent failure
      mockOriginalRenderer.render.mockResolvedValue({
        success: false,
        errorMessage: persistentError
      });

      mockIntentClassifier.shouldShowRecoveryUI.mockReturnValue(true);
      mockRecoveryOrchestrator.executeRecoveryWorkflow.mockResolvedValue({
        success: false,
        stage1Result: { success: false, errorMessage: 'Recovery failed' },
        stage2Result: { success: false, errorMessage: 'LLM fix failed' }
      });

      const result1 = await enhancedArtifactRenderer.renderArtifact(
        `<artifact identifier="${artifactId}">code</artifact>`,
        'content'
      );

      const result2 = await enhancedArtifactRenderer.renderArtifact(
        `<artifact identifier="${artifactId}">code</artifact>`,
        'content'
      );

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result1.originalError).toBe(result2.originalError);
      expect(result1.recoveryAttempted).toBe(true);
      expect(result2.recoveryAttempted).toBe(true);
    });

    it('should clear error state after successful recovery', async () => {
      const artifactId = 'error-clearing';

      // First attempt fails, second succeeds
      mockOriginalRenderer.render
        .mockResolvedValueOnce({ success: false, errorMessage: 'Initial error' })
        .mockResolvedValueOnce({ success: false, errorMessage: 'Still failing' })
        .mockResolvedValueOnce({ success: true, renderedContent: 'Success!' });

      mockIntentClassifier.shouldShowRecoveryUI.mockReturnValue(true);
      mockRecoveryOrchestrator.executeRecoveryWorkflow.mockResolvedValue({
        success: true,
        completedInStage: 1,
        finalCode: 'fixed code'
      });

      const result = await enhancedArtifactRenderer.renderArtifact(
        `<artifact identifier="${artifactId}">code</artifact>`,
        'content'
      );

      expect(result.success).toBe(true);
      expect(result.recoverySuccessful).toBe(true);
      expect(result.errorCleared).toBe(true);
      expect(result.renderedContent).toBe('Success!');
    });
  });
});