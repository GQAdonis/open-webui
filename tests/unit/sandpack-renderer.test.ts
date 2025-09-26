/**
 * Sandpack Renderer Contract Test
 * CRITICAL: This test MUST FAIL before implementation exists
 * Focus: Retry loop prevention and timeout handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  ISandpackRenderer,
  SandpackRenderRequest,
  SandpackRenderResponse,
  RendererState,
  RendererStatus,
  RendererErrorType,
  SandpackOptions
} from '../../specs/001-create-and-or/contracts/sandpack-renderer';
import type { ParsedArtifact } from '../../specs/001-create-and-or/contracts/artifact-parser';

// Import the service that doesn't exist yet - this will cause the test to fail initially
import { SandpackRendererService } from '../../src/lib/services/sandpack-renderer';

describe('SandpackRenderer Contract', () => {
  let renderer: ISandpackRenderer;
  const mockArtifact: ParsedArtifact = {
    id: 'test-artifact',
    type: 'react' as any,
    title: 'Test Component',
    code: 'import React from "react"; export default () => <div>Test</div>;',
    dependencies: [{ name: 'react', version: '^19.0.0', source: 'npm', isRequired: true }],
    metadata: { language: 'typescript' },
    isValid: true,
    rawXml: '<artifact></artifact>'
  };

  beforeEach(() => {
    // This will fail until the service is implemented
    renderer = new SandpackRendererService();
  });

  describe('Contract Compliance', () => {
    it('should implement ISandpackRenderer interface', () => {
      expect(renderer).toBeDefined();
      expect(typeof renderer.render).toBe('function');
      expect(typeof renderer.getState).toBe('function');
      expect(typeof renderer.retry).toBe('function');
      expect(typeof renderer.clear).toBe('function');
      expect(typeof renderer.canRetry).toBe('function');
    });
  });

  describe('Rendering', () => {
    it('should render React artifacts successfully', async () => {
      const request: SandpackRenderRequest = {
        artifact: mockArtifact,
        containerId: 'test-container-1'
      };

      const response: SandpackRenderResponse = await renderer.render(request);

      expect(response.success).toBe(true);
      expect(response.renderTimeMs).toBeGreaterThan(0);
      expect(response.renderTimeMs).toBeLessThan(30000); // Must be < 30s timeout
      expect(response.retryCount).toBe(0);
      expect(response.errorMessage).toBeUndefined();
    });

    it('should render Svelte artifacts successfully', async () => {
      const svelteArtifact: ParsedArtifact = {
        ...mockArtifact,
        id: 'svelte-test',
        type: 'svelte' as any,
        code: '<script>let count = 0;</script><div>{count}</div>'
      };

      const request: SandpackRenderRequest = {
        artifact: svelteArtifact,
        containerId: 'test-container-2'
      };

      const response = await renderer.render(request);

      expect(response.success).toBe(true);
    });

    it('should apply custom options', async () => {
      const options: SandpackOptions = {
        theme: 'dark',
        showNavigator: false,
        showTabs: true,
        autorun: true,
        timeout: 10000
      };

      const request: SandpackRenderRequest = {
        artifact: mockArtifact,
        containerId: 'test-container-3',
        options
      };

      const response = await renderer.render(request);

      expect(response.success).toBe(true);
      expect(response.renderTimeMs).toBeLessThan(10000); // Custom timeout applied
    });

    it('should handle multiple concurrent renders', async () => {
      const requests: SandpackRenderRequest[] = [
        { artifact: { ...mockArtifact, id: 'test-1' }, containerId: 'container-1' },
        { artifact: { ...mockArtifact, id: 'test-2' }, containerId: 'container-2' },
        { artifact: { ...mockArtifact, id: 'test-3' }, containerId: 'container-3' }
      ];

      const responses = await Promise.all(
        requests.map(request => renderer.render(request))
      );

      responses.forEach(response => {
        expect(response.success).toBe(true);
      });
    });
  });

  describe('Critical: Infinite Loading Prevention', () => {
    it('should timeout after 30 seconds by default', async () => {
      // Mock a scenario that would cause infinite loading
      const problematicArtifact: ParsedArtifact = {
        ...mockArtifact,
        id: 'timeout-test',
        code: '// This code should trigger timeout handling',
        dependencies: [
          { name: 'nonexistent-package', version: '1.0.0', source: 'npm', isRequired: true }
        ]
      };

      const request: SandpackRenderRequest = {
        artifact: problematicArtifact,
        containerId: 'timeout-container',
        options: { timeout: 1000 } // 1 second timeout for testing
      };

      const startTime = Date.now();
      const response = await renderer.render(request);
      const endTime = Date.now();

      // Should timeout rather than hang indefinitely
      expect(endTime - startTime).toBeLessThan(5000); // Should fail fast
      expect(response.success).toBe(false);
      expect(response.errorMessage).toContain('timeout');
    });

    it('should prevent infinite retry loops', async () => {
      const failingArtifact: ParsedArtifact = {
        ...mockArtifact,
        id: 'failing-artifact',
        code: 'invalid syntax that will cause errors'
      };

      const request: SandpackRenderRequest = {
        artifact: failingArtifact,
        containerId: 'failing-container'
      };

      // First render should fail
      const response1 = await renderer.render(request);
      expect(response1.success).toBe(false);

      // Multiple retries should be limited
      const response2 = await renderer.retry('failing-artifact');
      const response3 = await renderer.retry('failing-artifact');
      const response4 = await renderer.retry('failing-artifact');

      expect(response4.retryCount).toBeLessThanOrEqual(3); // Max retry limit
      expect(await renderer.canRetry('failing-artifact')).toBe(false); // Should prevent further retries
    });

    it('should implement circuit breaker pattern', async () => {
      const problematic = { ...mockArtifact, id: 'circuit-test' };

      // Simulate multiple failures to trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        await renderer.render({
          artifact: { ...problematic, id: `circuit-test-${i}` },
          containerId: `container-${i}`,
          options: { timeout: 100 } // Very short timeout to force failures
        });
      }

      // Circuit breaker should now be open
      const response = await renderer.render({
        artifact: { ...problematic, id: 'circuit-test-final' },
        containerId: 'final-container'
      });

      expect(response.success).toBe(false);
      expect(response.renderTimeMs).toBeLessThan(100); // Should fail fast due to circuit breaker
    });
  });

  describe('State Management', () => {
    it('should track renderer state correctly', async () => {
      const request: SandpackRenderRequest = {
        artifact: mockArtifact,
        containerId: 'state-test-container'
      };

      // Initial state should be null or idle
      let state = renderer.getState(mockArtifact.id);
      expect(state?.status).toBeOneOf([undefined, 'idle']);

      // Start rendering
      const renderPromise = renderer.render(request);

      // State should show loading
      state = renderer.getState(mockArtifact.id);
      expect(state?.status).toBeOneOf(['initializing', 'loading']);
      expect(state?.artifactId).toBe(mockArtifact.id);

      // Wait for completion
      const response = await renderPromise;

      // Final state should reflect completion
      state = renderer.getState(mockArtifact.id);
      expect(state?.status).toBe(response.success ? 'loaded' : 'failed');
    });

    it('should handle state for multiple artifacts', async () => {
      const artifact1 = { ...mockArtifact, id: 'state-test-1' };
      const artifact2 = { ...mockArtifact, id: 'state-test-2' };

      await renderer.render({ artifact: artifact1, containerId: 'container-1' });
      await renderer.render({ artifact: artifact2, containerId: 'container-2' });

      const state1 = renderer.getState('state-test-1');
      const state2 = renderer.getState('state-test-2');

      expect(state1?.artifactId).toBe('state-test-1');
      expect(state2?.artifactId).toBe('state-test-2');
      expect(state1?.status).toBeDefined();
      expect(state2?.status).toBeDefined();
    });

    it('should clear state when requested', () => {
      const artifactId = 'clear-test';

      // Render first to create state
      renderer.render({
        artifact: { ...mockArtifact, id: artifactId },
        containerId: 'clear-container'
      });

      // Verify state exists
      expect(renderer.getState(artifactId)).not.toBeNull();

      // Clear state
      renderer.clear(artifactId);

      // Verify state is cleared
      expect(renderer.getState(artifactId)).toBeNull();
    });
  });

  describe('Retry Logic', () => {
    it('should allow retry for failed renders', async () => {
      const failingArtifact: ParsedArtifact = {
        ...mockArtifact,
        id: 'retry-test',
        code: 'initially failing code'
      };

      const request: SandpackRenderRequest = {
        artifact: failingArtifact,
        containerId: 'retry-container'
      };

      // First render fails
      const response1 = await renderer.render(request);
      expect(response1.success).toBe(false);

      // Should be able to retry
      expect(renderer.canRetry('retry-test')).toBe(true);

      // Retry should increment retry count
      const response2 = await renderer.retry('retry-test');
      expect(response2.retryCount).toBeGreaterThan(response1.retryCount);
    });

    it('should prevent retry when limit exceeded', async () => {
      const artifactId = 'retry-limit-test';

      // Simulate multiple failed retries
      for (let i = 0; i < 4; i++) {
        await renderer.render({
          artifact: { ...mockArtifact, id: artifactId },
          containerId: 'retry-limit-container',
          options: { timeout: 1 } // Force timeout
        });
      }

      // Should no longer allow retries
      expect(renderer.canRetry(artifactId)).toBe(false);
    });

    it('should reset retry count on successful render', async () => {
      const artifactId = 'retry-reset-test';

      // First render fails
      await renderer.render({
        artifact: { ...mockArtifact, id: artifactId },
        containerId: 'retry-reset-container',
        options: { timeout: 1 }
      });

      // Retry once
      await renderer.retry(artifactId);

      // Successful render should reset retry count
      const successResponse = await renderer.render({
        artifact: { ...mockArtifact, id: artifactId },
        containerId: 'retry-reset-container'
      });

      if (successResponse.success) {
        expect(successResponse.retryCount).toBe(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle compilation errors gracefully', async () => {
      const invalidCode: ParsedArtifact = {
        ...mockArtifact,
        id: 'compilation-error-test',
        code: 'invalid javascript syntax {'
      };

      const request: SandpackRenderRequest = {
        artifact: invalidCode,
        containerId: 'compilation-error-container'
      };

      const response = await renderer.render(request);

      expect(response.success).toBe(false);
      expect(response.errorMessage).toBeDefined();

      const state = renderer.getState('compilation-error-test');
      expect(state?.lastError?.type).toBe('COMPILATION_ERROR' as RendererErrorType);
    });

    it('should handle dependency errors', async () => {
      const badDeps: ParsedArtifact = {
        ...mockArtifact,
        id: 'dependency-error-test',
        dependencies: [
          { name: 'nonexistent-package-xyz', version: '999.0.0', source: 'npm', isRequired: true }
        ]
      };

      const request: SandpackRenderRequest = {
        artifact: badDeps,
        containerId: 'dependency-error-container'
      };

      const response = await renderer.render(request);

      expect(response.success).toBe(false);
      expect(response.errorMessage).toBeDefined();

      const state = renderer.getState('dependency-error-test');
      expect(state?.lastError?.type).toBe('DEPENDENCY_ERROR' as RendererErrorType);
    });

    it('should handle network errors', async () => {
      // This test would require mocking network conditions
      // For now, we just verify the error type exists
      expect(RendererErrorType.NETWORK_ERROR).toBe('network_error');
    });
  });

  describe('Performance', () => {
    it('should render simple components quickly', async () => {
      const simpleArtifact: ParsedArtifact = {
        ...mockArtifact,
        id: 'performance-test',
        code: 'export default () => <div>Simple</div>;',
        dependencies: []
      };

      const startTime = Date.now();
      const response = await renderer.render({
        artifact: simpleArtifact,
        containerId: 'performance-container'
      });
      const endTime = Date.now();

      expect(response.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should be fast for simple components
      expect(response.renderTimeMs).toBeLessThan(5000);
    });

    it('should handle memory cleanup', () => {
      const artifacts = Array.from({ length: 10 }, (_, i) => ({
        ...mockArtifact,
        id: `memory-test-${i}`
      }));

      // Render multiple artifacts
      const renderPromises = artifacts.map(artifact =>
        renderer.render({ artifact, containerId: `memory-container-${artifact.id}` })
      );

      // Clear them all
      artifacts.forEach(artifact => renderer.clear(artifact.id));

      // States should be cleared
      artifacts.forEach(artifact => {
        expect(renderer.getState(artifact.id)).toBeNull();
      });
    });
  });
});