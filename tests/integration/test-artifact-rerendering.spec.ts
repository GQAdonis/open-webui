/**
 * Integration Tests: Artifact Re-rendering
 * These tests validate the artifact re-rendering workflow after dependency resolution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Artifact Re-rendering Integration', () => {
  let artifactRenderer: any;
  let mockSandpackRenderer: any;
  let mockDependencyResolver: any;
  let mockCircuitBreaker: any;

  beforeEach(() => {
    // Mock dependencies - these will fail until implementations exist
    mockSandpackRenderer = {
      processRenderRequest: vi.fn(),
      canAttemptRender: vi.fn(),
      trackRenderAttempt: vi.fn(),
      recordRenderSuccess: vi.fn(),
      recordRenderFailure: vi.fn()
    };

    mockDependencyResolver = {
      resolveDependencies: vi.fn()
    };

    mockCircuitBreaker = {
      allowRecoveryAttempt: vi.fn(),
      recordSuccess: vi.fn(),
      recordFailure: vi.fn(),
      getCircuitState: vi.fn()
    };

    // This will fail until implementation exists
    // @ts-expect-error - Implementation doesn't exist yet
    artifactRenderer = new ArtifactRenderer({
      sandpackRenderer: mockSandpackRenderer,
      dependencyResolver: mockDependencyResolver,
      circuitBreaker: mockCircuitBreaker
    });
  });

  describe('Successful Dependency Resolution and Re-rendering', () => {
    it('should re-render artifact after successful CSS module resolution', async () => {
      const originalCode = `import styles from "./Button.module.css";
export default function Button() {
  return <button className={styles.primary}>Click me</button>;
}`;

      const messageContent = `
        \`\`\`css
        .primary {
          background-color: blue;
          padding: 10px;
        }
        \`\`\`
      `;

      const resolvedCode = `const styles = {
  primary: {
    backgroundColor: 'blue',
    padding: '10px'
  }
};
export default function Button() {
  return <button className={styles.primary}>Click me</button>;
}`;

      // Mock successful dependency resolution
      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: resolvedCode,
        strategyUsed: 'CSS_MODULE_CONVERSION',
        confidence: 0.92
      });

      // Mock successful re-rendering
      mockSandpackRenderer.canAttemptRender.mockReturnValue(true);
      mockSandpackRenderer.processRenderRequest.mockResolvedValue({
        success: true,
        artifactId: 'button-component',
        renderTimeMs: 150,
        bundleSize: 2048
      });

      const result = await artifactRenderer.renderWithDependencyResolution(
        'button-component',
        originalCode,
        messageContent
      );

      expect(result.success).toBe(true);
      expect(result.dependencyResolution.success).toBe(true);
      expect(result.rendering.success).toBe(true);
      expect(mockDependencyResolver.resolveDependencies).toHaveBeenCalledWith(messageContent, originalCode);
      expect(mockSandpackRenderer.processRenderRequest).toHaveBeenCalled();
    });

    it('should re-render artifact after successful JSON inlining', async () => {
      const originalCode = `import config from "./config.json";
console.log(\`API URL: \${config.apiUrl}\`);`;

      const messageContent = `
        \`\`\`json
        {
          "apiUrl": "https://api.example.com",
          "timeout": 5000
        }
        \`\`\`
      `;

      const resolvedCode = `const config = {
  "apiUrl": "https://api.example.com",
  "timeout": 5000
};
console.log(\`API URL: \${config.apiUrl}\`);`;

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: resolvedCode,
        strategyUsed: 'JSON_DATA_INLINING',
        confidence: 0.95
      });

      mockSandpackRenderer.canAttemptRender.mockReturnValue(true);
      mockSandpackRenderer.processRenderRequest.mockResolvedValue({
        success: true,
        artifactId: 'config-demo',
        renderTimeMs: 80
      });

      const result = await artifactRenderer.renderWithDependencyResolution(
        'config-demo',
        originalCode,
        messageContent
      );

      expect(result.success).toBe(true);
      expect(result.dependencyResolution.strategyUsed).toBe('JSON_DATA_INLINING');
      expect(result.rendering.success).toBe(true);
    });
  });

  describe('Rendering Failure and Recovery', () => {
    it('should handle rendering failure after successful dependency resolution', async () => {
      const resolvedCode = `const styles = { primary: { color: 'blue' } };
export default function Button() {
  return <button className={styles.primary}>Click</button>;
}`;

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: resolvedCode,
        strategyUsed: 'CSS_MODULE_CONVERSION',
        confidence: 0.9
      });

      // Mock rendering failure
      mockSandpackRenderer.canAttemptRender.mockReturnValue(true);
      mockSandpackRenderer.processRenderRequest.mockResolvedValue({
        success: false,
        artifactId: 'button-component',
        errorMessage: 'Bundling failed: Unexpected token',
        renderTimeMs: 200
      });

      const result = await artifactRenderer.renderWithDependencyResolution(
        'button-component',
        'original code',
        'message content'
      );

      expect(result.success).toBe(false);
      expect(result.dependencyResolution.success).toBe(true);
      expect(result.rendering.success).toBe(false);
      expect(result.rendering.errorMessage).toContain('Bundling failed');
    });

    it('should prevent rendering when circuit breaker is open', async () => {
      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(false);
      mockCircuitBreaker.getCircuitState.mockReturnValue('OPEN');

      const result = await artifactRenderer.renderWithDependencyResolution(
        'blocked-artifact',
        'code',
        'content'
      );

      expect(result.success).toBe(false);
      expect(result.circuitBreakerBlocked).toBe(true);
      expect(result.errorMessage).toContain('circuit breaker');
      expect(mockSandpackRenderer.processRenderRequest).not.toHaveBeenCalled();
    });

    it('should handle retry limit exceeded scenarios', async () => {
      mockSandpackRenderer.canAttemptRender.mockReturnValue(false);

      const result = await artifactRenderer.renderWithDependencyResolution(
        'retry-exhausted',
        'code',
        'content'
      );

      expect(result.success).toBe(false);
      expect(result.retryLimitExceeded).toBe(true);
      expect(result.errorMessage).toContain('retry limit');
    });
  });

  describe('Progressive Enhancement Workflow', () => {
    it('should attempt original render first, then dependency resolution on failure', async () => {
      const originalCode = `import styles from "./Button.module.css";
export default function Button() {
  return <button className={styles.primary}>Click</button>;
}`;

      // Mock initial render failure
      mockSandpackRenderer.processRenderRequest
        .mockResolvedValueOnce({
          success: false,
          errorMessage: 'Cannot resolve module ./Button.module.css',
          shouldTriggerRecovery: true
        })
        .mockResolvedValueOnce({
          success: true,
          artifactId: 'button-component',
          renderTimeMs: 180
        });

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: 'resolved code',
        strategyUsed: 'CSS_MODULE_CONVERSION'
      });

      mockSandpackRenderer.canAttemptRender.mockReturnValue(true);

      const result = await artifactRenderer.renderWithProgressiveEnhancement(
        'button-component',
        originalCode,
        'message content'
      );

      expect(result.success).toBe(true);
      expect(result.initialRenderAttempted).toBe(true);
      expect(result.dependencyResolutionTriggered).toBe(true);
      expect(result.finalRenderSuccessful).toBe(true);
      expect(mockSandpackRenderer.processRenderRequest).toHaveBeenCalledTimes(2);
    });

    it('should succeed on first render attempt when no dependencies needed', async () => {
      const simpleCode = `export default function SimpleButton() {
  return <button>Simple Click</button>;
}`;

      mockSandpackRenderer.processRenderRequest.mockResolvedValue({
        success: true,
        artifactId: 'simple-button',
        renderTimeMs: 50
      });

      mockSandpackRenderer.canAttemptRender.mockReturnValue(true);

      const result = await artifactRenderer.renderWithProgressiveEnhancement(
        'simple-button',
        simpleCode,
        'message content'
      );

      expect(result.success).toBe(true);
      expect(result.initialRenderAttempted).toBe(true);
      expect(result.dependencyResolutionTriggered).toBe(false);
      expect(mockSandpackRenderer.processRenderRequest).toHaveBeenCalledTimes(1);
      expect(mockDependencyResolver.resolveDependencies).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Optimization', () => {
    it('should track rendering performance metrics', async () => {
      const startTime = Date.now();

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: 'resolved code',
        processingTimeMs: 120
      });

      mockSandpackRenderer.processRenderRequest.mockResolvedValue({
        success: true,
        renderTimeMs: 80
      });

      mockSandpackRenderer.canAttemptRender.mockReturnValue(true);

      const result = await artifactRenderer.renderWithDependencyResolution(
        'perf-test',
        'code',
        'content'
      );

      expect(result.success).toBe(true);
      expect(result.performance).toBeDefined();
      expect(result.performance.dependencyResolutionMs).toBe(120);
      expect(result.performance.renderingMs).toBe(80);
      expect(result.performance.totalMs).toBeGreaterThan(0);
    });

    it('should handle concurrent rendering requests efficiently', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        artifactRenderer.renderWithDependencyResolution(
          `concurrent-${i}`,
          `code-${i}`,
          `content-${i}`
        )
      );

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: 'resolved',
        strategyUsed: 'IMPORT_REMOVAL'
      });

      mockSandpackRenderer.canAttemptRender.mockReturnValue(true);
      mockSandpackRenderer.processRenderRequest.mockResolvedValue({
        success: true,
        renderTimeMs: 100
      });

      const results = await Promise.all(concurrentRequests);

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.artifactId).toBe(`concurrent-${i}`);
      });
    });

    it('should optimize repeated renders of same artifact', async () => {
      const artifactId = 'repeated-render';
      const code = 'same code';
      const content = 'same content';

      // Mock caching behavior
      let callCount = 0;
      mockDependencyResolver.resolveDependencies.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          success: true,
          transformedCode: 'cached result',
          fromCache: callCount > 1
        });
      });

      mockSandpackRenderer.canAttemptRender.mockReturnValue(true);
      mockSandpackRenderer.processRenderRequest.mockResolvedValue({
        success: true,
        renderTimeMs: 50
      });

      // First render
      const result1 = await artifactRenderer.renderWithDependencyResolution(artifactId, code, content);

      // Second render (should use cache)
      const result2 = await artifactRenderer.renderWithDependencyResolution(artifactId, code, content);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.dependencyResolution.fromCache).toBe(true);
    });
  });

  describe('Error State Management', () => {
    it('should maintain error state consistency across renders', async () => {
      const failingArtifact = 'failing-artifact';

      // Mock consistent failure
      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: false,
        errorMessage: 'Persistent dependency error'
      });

      mockSandpackRenderer.canAttemptRender.mockReturnValue(true);
      mockSandpackRenderer.processRenderRequest.mockResolvedValue({
        success: false,
        errorMessage: 'Persistent render error'
      });

      const result1 = await artifactRenderer.renderWithDependencyResolution(failingArtifact, 'code', 'content');
      const result2 = await artifactRenderer.renderWithDependencyResolution(failingArtifact, 'code', 'content');

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result1.errorMessage).toBe(result2.errorMessage);
    });

    it('should clear error state after successful recovery', async () => {
      const recoveringArtifact = 'recovering-artifact';

      // First attempt fails
      mockDependencyResolver.resolveDependencies
        .mockResolvedValueOnce({
          success: false,
          errorMessage: 'Initial failure'
        })
        .mockResolvedValueOnce({
          success: true,
          transformedCode: 'recovered code'
        });

      mockSandpackRenderer.canAttemptRender.mockReturnValue(true);
      mockSandpackRenderer.processRenderRequest
        .mockResolvedValueOnce({
          success: false,
          errorMessage: 'Initial render failure'
        })
        .mockResolvedValueOnce({
          success: true,
          renderTimeMs: 100
        });

      const failureResult = await artifactRenderer.renderWithDependencyResolution(
        recoveringArtifact, 'code', 'content'
      );

      const successResult = await artifactRenderer.renderWithDependencyResolution(
        recoveringArtifact, 'fixed code', 'content'
      );

      expect(failureResult.success).toBe(false);
      expect(successResult.success).toBe(true);
      expect(successResult.errorCleared).toBe(true);
    });
  });
});