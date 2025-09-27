/**
 * Integration Tests: Circuit Breaker Integration
 * These tests validate the circuit breaker integration across the system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Circuit Breaker Integration Tests', () => {
  let systemOrchestrator: any;
  let mockCircuitBreaker: any;
  let mockDependencyResolver: any;
  let mockSandpackRenderer: any;
  let mockLLMFixService: any;

  beforeEach(() => {
    // Mock circuit breaker
    mockCircuitBreaker = {
      allowRecoveryAttempt: vi.fn(),
      recordFailure: vi.fn(),
      recordSuccess: vi.fn(),
      resetCircuit: vi.fn(),
      getCircuitState: vi.fn(),
      getFailureCount: vi.fn(),
      isCircuitOpen: vi.fn()
    };

    // Mock other services
    mockDependencyResolver = {
      resolveDependencies: vi.fn()
    };

    mockSandpackRenderer = {
      processRenderRequest: vi.fn(),
      canAttemptRender: vi.fn(),
      setCircuitBreaker: vi.fn()
    };

    mockLLMFixService = {
      sendFixRequest: vi.fn(),
      setCircuitBreaker: vi.fn()
    };

    // This will fail until implementation exists
    // @ts-expect-error - Implementation doesn't exist yet
    systemOrchestrator = new SystemOrchestrator({
      circuitBreaker: mockCircuitBreaker,
      dependencyResolver: mockDependencyResolver,
      sandpackRenderer: mockSandpackRenderer,
      llmFixService: mockLLMFixService
    });
  });

  describe('Circuit Breaker State Management', () => {
    it('should allow operations when circuit is closed', async () => {
      const artifactId = 'test-artifact';

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);
      mockCircuitBreaker.getCircuitState.mockReturnValue('CLOSED');
      mockCircuitBreaker.isCircuitOpen.mockReturnValue(false);

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: 'resolved code'
      });

      const result = await systemOrchestrator.attemptRecovery(artifactId, 'code', 'content');

      expect(result.allowed).toBe(true);
      expect(mockCircuitBreaker.allowRecoveryAttempt).toHaveBeenCalledWith(artifactId);
      expect(mockDependencyResolver.resolveDependencies).toHaveBeenCalled();
    });

    it('should block operations when circuit is open', async () => {
      const artifactId = 'blocked-artifact';

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(false);
      mockCircuitBreaker.getCircuitState.mockReturnValue('OPEN');
      mockCircuitBreaker.isCircuitOpen.mockReturnValue(true);
      mockCircuitBreaker.getFailureCount.mockReturnValue(5);

      const result = await systemOrchestrator.attemptRecovery(artifactId, 'code', 'content');

      expect(result.allowed).toBe(false);
      expect(result.circuitState).toBe('OPEN');
      expect(result.failureCount).toBe(5);
      expect(mockDependencyResolver.resolveDependencies).not.toHaveBeenCalled();
    });

    it('should transition from half-open to closed on successful operation', async () => {
      const artifactId = 'recovery-artifact';

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);
      mockCircuitBreaker.getCircuitState
        .mockReturnValueOnce('HALF_OPEN')
        .mockReturnValueOnce('CLOSED');

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: 'success'
      });

      const result = await systemOrchestrator.attemptRecovery(artifactId, 'code', 'content');

      expect(result.allowed).toBe(true);
      expect(result.success).toBe(true);
      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalledWith(artifactId);
    });

    it('should transition from half-open to open on failed operation', async () => {
      const artifactId = 'failing-artifact';

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);
      mockCircuitBreaker.getCircuitState
        .mockReturnValueOnce('HALF_OPEN')
        .mockReturnValueOnce('OPEN');

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: false,
        errorMessage: 'Resolution failed'
      });

      const result = await systemOrchestrator.attemptRecovery(artifactId, 'code', 'content');

      expect(result.allowed).toBe(true);
      expect(result.success).toBe(false);
      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalledWith(artifactId, 'Resolution failed');
    });
  });

  describe('Service Integration with Circuit Breaker', () => {
    it('should integrate circuit breaker with dependency resolver', async () => {
      const artifactId = 'resolver-test';

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);

      // Simulate dependency resolver consulting circuit breaker
      mockDependencyResolver.resolveDependencies.mockImplementation(async () => {
        const allowed = mockCircuitBreaker.allowRecoveryAttempt(artifactId);
        if (!allowed) {
          return { success: false, errorMessage: 'Circuit breaker blocked' };
        }
        return { success: true, transformedCode: 'resolved' };
      });

      const result = await systemOrchestrator.resolveDependenciesWithCircuitBreaker(
        artifactId, 'code', 'content'
      );

      expect(result.success).toBe(true);
      expect(mockCircuitBreaker.allowRecoveryAttempt).toHaveBeenCalled();
    });

    it('should integrate circuit breaker with Sandpack renderer', async () => {
      const artifactId = 'render-test';

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);
      mockSandpackRenderer.canAttemptRender.mockReturnValue(true);
      mockSandpackRenderer.processRenderRequest.mockResolvedValue({
        success: true,
        renderTimeMs: 100
      });

      // Simulate renderer checking circuit breaker
      mockSandpackRenderer.processRenderRequest.mockImplementation(async (request) => {
        const allowed = mockCircuitBreaker.allowRecoveryAttempt(request.artifactId);
        if (!allowed) {
          return { success: false, errorMessage: 'Render blocked by circuit breaker' };
        }
        return { success: true, renderTimeMs: 100 };
      });

      const result = await systemOrchestrator.renderWithCircuitBreaker(artifactId, 'code');

      expect(result.success).toBe(true);
      expect(mockSandpackRenderer.processRenderRequest).toHaveBeenCalled();
    });

    it('should integrate circuit breaker with LLM fix service', async () => {
      const artifactId = 'llm-test';

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);
      mockLLMFixService.sendFixRequest.mockResolvedValue({
        success: true,
        fixedCode: 'fixed code',
        confidence: 0.9
      });

      // Simulate LLM service checking circuit breaker
      mockLLMFixService.sendFixRequest.mockImplementation(async (request) => {
        const allowed = mockCircuitBreaker.allowRecoveryAttempt(artifactId);
        if (!allowed) {
          return { success: false, errorMessage: 'LLM fix blocked by circuit breaker' };
        }
        return { success: true, fixedCode: 'fixed', confidence: 0.9 };
      });

      const result = await systemOrchestrator.requestLLMFixWithCircuitBreaker(artifactId, {
        errorType: 'CSS_MODULE_ERROR',
        failingCode: 'import styles from "./missing.css";',
        errorMessage: 'Module not found'
      });

      expect(result.success).toBe(true);
      expect(mockLLMFixService.sendFixRequest).toHaveBeenCalled();
    });
  });

  describe('Failure Tracking and Recovery', () => {
    it('should track consecutive failures and open circuit', async () => {
      const artifactId = 'failure-tracking';
      const maxFailures = 3;

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);
      mockCircuitBreaker.getCircuitState.mockReturnValue('CLOSED');

      // Mock consecutive failures
      for (let i = 0; i < maxFailures; i++) {
        mockDependencyResolver.resolveDependencies.mockResolvedValueOnce({
          success: false,
          errorMessage: `Failure ${i + 1}`
        });

        await systemOrchestrator.attemptRecovery(artifactId, 'code', 'content');
      }

      // After max failures, circuit should open
      mockCircuitBreaker.getCircuitState.mockReturnValue('OPEN');
      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(false);

      const finalResult = await systemOrchestrator.attemptRecovery(artifactId, 'code', 'content');

      expect(finalResult.allowed).toBe(false);
      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalledTimes(maxFailures);
    });

    it('should reset circuit on manual intervention', async () => {
      const artifactId = 'manual-reset';

      mockCircuitBreaker.getCircuitState.mockReturnValue('OPEN');
      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(false);

      // Manual reset
      await systemOrchestrator.resetCircuitBreaker(artifactId);

      expect(mockCircuitBreaker.resetCircuit).toHaveBeenCalledWith(artifactId);

      // After reset, should allow attempts
      mockCircuitBreaker.getCircuitState.mockReturnValue('CLOSED');
      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);

      const result = await systemOrchestrator.attemptRecovery(artifactId, 'code', 'content');

      expect(result.allowed).toBe(true);
    });

    it('should handle timeout-based circuit recovery', async () => {
      const artifactId = 'timeout-recovery';

      // Circuit is initially open
      mockCircuitBreaker.getCircuitState.mockReturnValue('OPEN');
      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(false);

      const blockedResult = await systemOrchestrator.attemptRecovery(artifactId, 'code', 'content');
      expect(blockedResult.allowed).toBe(false);

      // Simulate timeout expiration
      mockCircuitBreaker.getCircuitState.mockReturnValue('HALF_OPEN');
      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);

      // Next successful attempt should close circuit
      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: 'recovered'
      });

      const recoveredResult = await systemOrchestrator.attemptRecovery(artifactId, 'code', 'content');

      expect(recoveredResult.allowed).toBe(true);
      expect(recoveredResult.success).toBe(true);
      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalledWith(artifactId);
    });
  });

  describe('Multi-Service Failure Scenarios', () => {
    it('should handle cascade failures across services', async () => {
      const artifactId = 'cascade-failure';

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);

      // Dependency resolver fails
      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: false,
        errorMessage: 'Dependency resolution failed'
      });

      // Renderer also fails
      mockSandpackRenderer.processRenderRequest.mockResolvedValue({
        success: false,
        errorMessage: 'Render failed'
      });

      // LLM service fails too
      mockLLMFixService.sendFixRequest.mockResolvedValue({
        success: false,
        errorMessage: 'LLM service unavailable'
      });

      const result = await systemOrchestrator.attemptFullRecovery(artifactId, 'code', 'content');

      expect(result.success).toBe(false);
      expect(result.cascadeFailures).toHaveLength(3);
      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalledTimes(3);
    });

    it('should prevent cascade when circuit opens early', async () => {
      const artifactId = 'early-circuit-open';

      // First service fails and opens circuit
      mockCircuitBreaker.allowRecoveryAttempt
        .mockReturnValueOnce(true)   // First attempt allowed
        .mockReturnValueOnce(false); // Subsequent attempts blocked

      mockCircuitBreaker.getCircuitState
        .mockReturnValueOnce('CLOSED')
        .mockReturnValueOnce('OPEN');

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: false,
        errorMessage: 'Critical failure'
      });

      const result = await systemOrchestrator.attemptFullRecovery(artifactId, 'code', 'content');

      expect(result.success).toBe(false);
      expect(result.circuitOpenedEarly).toBe(true);
      expect(result.servicesSkipped).toContain('sandpackRenderer');
      expect(result.servicesSkipped).toContain('llmFixService');
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track circuit breaker performance metrics', async () => {
      const artifactId = 'metrics-test';

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);
      mockCircuitBreaker.getCircuitState.mockReturnValue('CLOSED');

      const startTime = Date.now();

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: 'resolved',
        processingTimeMs: 150
      });

      const result = await systemOrchestrator.attemptRecovery(artifactId, 'code', 'content');

      expect(result.metrics).toBeDefined();
      expect(result.metrics.circuitCheckTimeMs).toBeGreaterThan(0);
      expect(result.metrics.totalTimeMs).toBeGreaterThan(0);
      expect(result.metrics.circuitState).toBe('CLOSED');
    });

    it('should provide circuit breaker statistics', async () => {
      mockCircuitBreaker.getFailureCount.mockReturnValue(2);
      mockCircuitBreaker.getCircuitState.mockReturnValue('CLOSED');

      const stats = await systemOrchestrator.getCircuitBreakerStats('stats-artifact');

      expect(stats).toBeDefined();
      expect(stats.failureCount).toBe(2);
      expect(stats.circuitState).toBe('CLOSED');
      expect(stats.artifactId).toBe('stats-artifact');
    });

    it('should handle concurrent circuit breaker operations', async () => {
      const artifactIds = ['concurrent-1', 'concurrent-2', 'concurrent-3'];

      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);
      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: true,
        transformedCode: 'resolved'
      });

      const concurrentOperations = artifactIds.map(id =>
        systemOrchestrator.attemptRecovery(id, 'code', 'content')
      );

      const results = await Promise.all(concurrentOperations);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.artifactId).toBe(artifactIds[index]);
      });

      // Each artifact should have been checked independently
      expect(mockCircuitBreaker.allowRecoveryAttempt).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Recovery Integration', () => {
    it('should integrate circuit breaker with two-stage recovery UI', async () => {
      const artifactId = 'ui-integration';

      // Stage 1: Auto-resolution (circuit closed)
      mockCircuitBreaker.allowRecoveryAttempt.mockReturnValue(true);
      mockCircuitBreaker.getCircuitState.mockReturnValue('CLOSED');

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: false,
        errorMessage: 'Auto-resolution failed'
      });

      const stage1Result = await systemOrchestrator.stageOneRecovery(artifactId, 'code', 'content');

      expect(stage1Result.success).toBe(false);
      expect(stage1Result.circuitState).toBe('CLOSED');

      // Stage 2: LLM Fix (circuit still allows)
      mockLLMFixService.sendFixRequest.mockResolvedValue({
        success: true,
        fixedCode: 'fixed by LLM',
        confidence: 0.8
      });

      const stage2Result = await systemOrchestrator.stageTwoRecovery(
        artifactId,
        stage1Result,
        'message content'
      );

      expect(stage2Result.success).toBe(true);
      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalledWith(artifactId);
    });

    it('should block LLM stage when circuit opens after auto-resolution failure', async () => {
      const artifactId = 'blocked-llm';

      // Auto-resolution fails and opens circuit
      mockCircuitBreaker.allowRecoveryAttempt
        .mockReturnValueOnce(true)   // Auto-resolution allowed
        .mockReturnValueOnce(false); // LLM stage blocked

      mockCircuitBreaker.getCircuitState
        .mockReturnValueOnce('CLOSED')
        .mockReturnValueOnce('OPEN');

      mockDependencyResolver.resolveDependencies.mockResolvedValue({
        success: false,
        errorMessage: 'Critical auto-resolution failure'
      });

      const stage1Result = await systemOrchestrator.stageOneRecovery(artifactId, 'code', 'content');
      const stage2Result = await systemOrchestrator.stageTwoRecovery(artifactId, stage1Result, 'content');

      expect(stage1Result.success).toBe(false);
      expect(stage2Result.allowed).toBe(false);
      expect(stage2Result.blockedByCircuitBreaker).toBe(true);
      expect(mockLLMFixService.sendFixRequest).not.toHaveBeenCalled();
    });
  });
});