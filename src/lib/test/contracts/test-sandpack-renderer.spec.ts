/**
 * Contract Tests: SandpackRenderer retry prevention
 * These tests validate that Sandpack rendering prevents infinite retry loops.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  SandpackRendererAPI,
  RenderRequest,
  RenderResult
} from '../../../components/artifacts/SandpackRenderer.svelte';

describe('SandpackRendererAPI Contract Tests', () => {
  let sandpackRenderer: SandpackRendererAPI;
  const mockOnRenderSuccess = vi.fn();
  const mockOnRenderFailure = vi.fn();
  const mockOnRetryPrevented = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // This will fail until implementation exists
    // @ts-expect-error - Implementation doesn't exist yet
    sandpackRenderer = new SandpackRenderer({
      retryLimit: 3,
      retryTimeoutMs: 1000,
      onRenderSuccess: mockOnRenderSuccess,
      onRenderFailure: mockOnRenderFailure,
      onRetryPrevented: mockOnRetryPrevented
    });
  });

  describe('Retry Prevention Logic', () => {
    it('should track render attempts per artifact', () => {
      const request: RenderRequest = {
        artifactId: 'test-artifact',
        code: 'console.log("hello");',
        language: 'javascript',
        timestamp: new Date()
      };

      sandpackRenderer.trackRenderAttempt(request.artifactId);

      const attempts = sandpackRenderer.getRenderAttempts(request.artifactId);
      expect(attempts).toBe(1);
    });

    it('should prevent rendering after retry limit exceeded', () => {
      const artifactId = 'failing-artifact';

      // Simulate multiple failed attempts
      for (let i = 0; i < 4; i++) {
        sandpackRenderer.trackRenderAttempt(artifactId);
      }

      const canRender = sandpackRenderer.canAttemptRender(artifactId);
      expect(canRender).toBe(false);
      expect(mockOnRetryPrevented).toHaveBeenCalledWith(artifactId, 4);
    });

    it('should reset retry count after successful render', () => {
      const artifactId = 'test-artifact';

      // Track some failed attempts
      sandpackRenderer.trackRenderAttempt(artifactId);
      sandpackRenderer.trackRenderAttempt(artifactId);

      // Simulate successful render
      sandpackRenderer.resetRetryCount(artifactId);

      const attempts = sandpackRenderer.getRenderAttempts(artifactId);
      expect(attempts).toBe(0);
    });

    it('should allow rendering after timeout period expires', async () => {
      const artifactId = 'timeout-test';

      // Exceed retry limit
      for (let i = 0; i < 4; i++) {
        sandpackRenderer.trackRenderAttempt(artifactId);
      }

      expect(sandpackRenderer.canAttemptRender(artifactId)).toBe(false);

      // Mock timeout expiration
      vi.advanceTimersByTime(1100); // 1100ms > 1000ms timeout

      expect(sandpackRenderer.canAttemptRender(artifactId)).toBe(true);
    });
  });

  describe('Integration with Circuit Breaker', () => {
    it('should consult circuit breaker before allowing render attempts', () => {
      const artifactId = 'circuit-test';

      // Mock circuit breaker in open state
      const mockCircuitBreaker = {
        allowRecoveryAttempt: vi.fn().mockReturnValue(false),
        getCircuitState: vi.fn().mockReturnValue('OPEN')
      };

      sandpackRenderer.setCircuitBreaker(mockCircuitBreaker);

      const canRender = sandpackRenderer.canAttemptRender(artifactId);

      expect(canRender).toBe(false);
      expect(mockCircuitBreaker.allowRecoveryAttempt).toHaveBeenCalledWith(artifactId);
    });

    it('should record failures to circuit breaker', () => {
      const artifactId = 'circuit-failure-test';
      const errorMessage = 'Sandpack rendering failed';

      const mockCircuitBreaker = {
        recordFailure: vi.fn(),
        allowRecoveryAttempt: vi.fn().mockReturnValue(true)
      };

      sandpackRenderer.setCircuitBreaker(mockCircuitBreaker);
      sandpackRenderer.recordRenderFailure(artifactId, errorMessage);

      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalledWith(artifactId, errorMessage);
    });

    it('should record successes to circuit breaker', () => {
      const artifactId = 'circuit-success-test';

      const mockCircuitBreaker = {
        recordSuccess: vi.fn()
      };

      sandpackRenderer.setCircuitBreaker(mockCircuitBreaker);
      sandpackRenderer.recordRenderSuccess(artifactId);

      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalledWith(artifactId);
    });
  });

  describe('Render State Management', () => {
    it('should maintain render state per artifact', () => {
      const artifactId = 'state-test';

      sandpackRenderer.setRenderState(artifactId, 'loading');
      expect(sandpackRenderer.getRenderState(artifactId)).toBe('loading');

      sandpackRenderer.setRenderState(artifactId, 'success');
      expect(sandpackRenderer.getRenderState(artifactId)).toBe('success');

      sandpackRenderer.setRenderState(artifactId, 'error');
      expect(sandpackRenderer.getRenderState(artifactId)).toBe('error');
    });

    it('should provide render attempt history', () => {
      const artifactId = 'history-test';

      sandpackRenderer.trackRenderAttempt(artifactId);
      sandpackRenderer.recordRenderFailure(artifactId, 'Error 1');

      sandpackRenderer.trackRenderAttempt(artifactId);
      sandpackRenderer.recordRenderFailure(artifactId, 'Error 2');

      const history = sandpackRenderer.getRenderHistory(artifactId);

      expect(history).toHaveLength(2);
      expect(history[0].success).toBe(false);
      expect(history[0].errorMessage).toBe('Error 1');
      expect(history[1].errorMessage).toBe('Error 2');
    });
  });

  describe('Render Request Processing', () => {
    it('should process valid render requests', async () => {
      const request: RenderRequest = {
        artifactId: 'valid-test',
        code: 'export default function App() { return <div>Hello</div>; }',
        language: 'jsx',
        timestamp: new Date()
      };

      const result: RenderResult = await sandpackRenderer.processRenderRequest(request);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.artifactId).toBe(request.artifactId);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('should reject requests for blocked artifacts', async () => {
      const artifactId = 'blocked-test';
      const request: RenderRequest = {
        artifactId,
        code: 'console.log("test");',
        language: 'javascript',
        timestamp: new Date()
      };

      // Block the artifact
      for (let i = 0; i < 4; i++) {
        sandpackRenderer.trackRenderAttempt(artifactId);
      }

      const result = await sandpackRenderer.processRenderRequest(request);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('retry limit exceeded');
      expect(result.retryPrevented).toBe(true);
    });

    it('should handle render timeouts gracefully', async () => {
      const request: RenderRequest = {
        artifactId: 'timeout-render-test',
        code: 'while(true) {} // infinite loop',
        language: 'javascript',
        timeout: 2000,
        timestamp: new Date()
      };

      const result = await sandpackRenderer.processRenderRequest(request);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('timeout');
      expect(result.renderTimeMs).toBeGreaterThanOrEqual(2000);
    });
  });

  describe('Error Recovery Integration', () => {
    it('should trigger recovery workflow on repeated failures', () => {
      const artifactId = 'recovery-test';
      const mockOnTriggerRecovery = vi.fn();

      sandpackRenderer.onTriggerRecovery = mockOnTriggerRecovery;

      // Simulate repeated failures that should trigger recovery
      for (let i = 0; i < 3; i++) {
        sandpackRenderer.trackRenderAttempt(artifactId);
        sandpackRenderer.recordRenderFailure(artifactId, `Failure ${i + 1}`);
      }

      expect(mockOnTriggerRecovery).toHaveBeenCalledWith(artifactId, {
        failureCount: 3,
        lastError: 'Failure 3',
        shouldShowRecovery: true
      });
    });

    it('should NOT trigger recovery for syntax errors', () => {
      const artifactId = 'syntax-error-test';
      const mockOnTriggerRecovery = vi.fn();

      sandpackRenderer.onTriggerRecovery = mockOnTriggerRecovery;

      sandpackRenderer.recordRenderFailure(artifactId, 'SyntaxError: Unexpected token');

      expect(mockOnTriggerRecovery).not.toHaveBeenCalled();
    });
  });
});