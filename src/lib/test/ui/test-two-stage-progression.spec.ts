/**
 * Two-Stage Process Progression UI Validation Tests
 *
 * These tests validate that the enhanced error recovery UI properly
 * progresses through the two-stage recovery process:
 * Stage 1: Auto-resolution (4-tier strategy system)
 * Stage 2: AI Fix (LLM-powered code fixing)
 *
 * Ensures proper UI state transitions, user feedback, and coordination.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import EnhancedErrorRecovery from '../../components/artifacts/EnhancedErrorRecovery.svelte';

// Mock the recovery services
vi.mock('../../services/artifact-dependency-resolver/strategy-executor', () => ({
  defaultStrategyExecutor: {
    executeRecovery: vi.fn()
  }
}));

vi.mock('../../services/llm-autofix-service/llm-fix-service', () => ({
  llmAutoFixService: {
    attemptAutoFix: vi.fn()
  }
}));

describe('Two-Stage Process Progression UI Validation', () => {
  const mockProps = {
    artifactId: 'test-artifact',
    artifactCode: 'import styles from "./Button.module.css";\nconst Button = () => <button>Click</button>;',
    errorMessage: 'Cannot resolve module "./Button.module.css"',
    messageContent: '.button { background: blue; }',
    language: 'javascript',
    autoStart: false,
    showAdvancedOptions: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Stage 1: Auto-Resolution Phase', () => {
    it('should display auto-resolution phase indicators', async () => {
      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      // Start recovery
      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      await waitFor(() => {
        // Should show stage 1 indicators
        expect(screen.getByText(/Auto-Resolution/i)).toBeInTheDocument();

        // Should show progress indicator
        const progressElements = screen.getAllByRole('progressbar');
        expect(progressElements.length).toBeGreaterThan(0);
      });
    });

    it('should progress through auto-resolution strategies with feedback', async () => {
      // Mock successful auto-resolution
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');
      vi.mocked(defaultStrategyExecutor.executeRecovery).mockResolvedValue({
        success: true,
        strategy: 'CSS_MODULE_CONVERSION',
        confidence: 0.9,
        finalCode: 'const styles = { button: { background: "blue" } };',
        processingTimeMs: 1500,
        stages: [
          { name: 'Circuit Breaker Check', status: 'completed', processingTimeMs: 50 },
          { name: 'Intent Classification', status: 'completed', processingTimeMs: 200 },
          { name: 'CSS Module Strategy', status: 'completed', processingTimeMs: 1250 }
        ],
        errors: [],
        circuitState: 'CLOSED'
      });

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Wait for auto-resolution to complete
      await waitFor(() => {
        expect(screen.getByText(/Success/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should show strategy used
      expect(screen.getByText(/CSS Module Conversion/i)).toBeInTheDocument();

      // Should show confidence score
      expect(screen.getByText(/90%/i)).toBeInTheDocument();

      // Should offer to apply fix
      expect(screen.getByText(/Apply Fix/i)).toBeInTheDocument();
    });

    it('should transition to stage 2 when auto-resolution fails', async () => {
      // Mock failed auto-resolution
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');
      vi.mocked(defaultStrategyExecutor.executeRecovery).mockResolvedValue({
        success: false,
        strategy: 'ALL_STRATEGIES_FAILED',
        confidence: 0.1,
        finalCode: '',
        processingTimeMs: 3000,
        stages: [
          { name: 'Circuit Breaker Check', status: 'completed', processingTimeMs: 50 },
          { name: 'Intent Classification', status: 'completed', processingTimeMs: 200 },
          { name: 'CSS Module Strategy', status: 'failed', processingTimeMs: 800 },
          { name: 'JSON Inlining Strategy', status: 'failed', processingTimeMs: 700 },
          { name: 'Import Removal Strategy', status: 'failed', processingTimeMs: 1250 }
        ],
        errors: ['No applicable strategies found'],
        circuitState: 'CLOSED'
      });

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Wait for auto-resolution to fail
      await waitFor(() => {
        expect(screen.getByText(/Auto-resolution failed/i)).toBeInTheDocument();
      }, { timeout: 4000 });

      // Should automatically transition to AI Fix stage
      await waitFor(() => {
        expect(screen.getByText(/AI Fix/i)).toBeInTheDocument();
      });

      // Should show stage transition indicator
      expect(screen.getByText(/Falling back to AI-powered fixing/i)).toBeInTheDocument();
    });
  });

  describe('Stage 2: AI Fix Phase', () => {
    it('should display AI fix phase indicators after auto-resolution failure', async () => {
      // Mock failed auto-resolution followed by AI fix attempt
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');
      const { llmAutoFixService } = await import('../../services/llm-autofix-service/llm-fix-service');

      vi.mocked(defaultStrategyExecutor.executeRecovery).mockResolvedValue({
        success: false,
        strategy: 'ALL_STRATEGIES_FAILED',
        confidence: 0.1,
        finalCode: '',
        processingTimeMs: 2000,
        stages: [],
        errors: ['Auto-resolution strategies failed'],
        circuitState: 'CLOSED'
      });

      vi.mocked(llmAutoFixService.attemptAutoFix).mockResolvedValue({
        success: true,
        fixedCode: 'const Button = () => React.createElement("button", { style: { background: "blue" } }, "Click");',
        explanation: 'Converted CSS module import to inline styles',
        strategy: 'css-module-fix',
        confidence: 0.85
      });

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Wait for transition to AI fix phase
      await waitFor(() => {
        expect(screen.getByText(/AI Fix/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should show AI fix progress
      expect(screen.getByText(/AI-powered fixing/i)).toBeInTheDocument();

      // Wait for AI fix completion
      await waitFor(() => {
        expect(screen.getByText(/AI fix succeeded/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should show AI fix results
      expect(screen.getByText(/85%/i)).toBeInTheDocument(); // Confidence
      expect(screen.getByText(/css-module-fix/i)).toBeInTheDocument(); // Strategy
    });

    it('should handle AI fix failures gracefully', async () => {
      // Mock both auto-resolution and AI fix failing
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');
      const { llmAutoFixService } = await import('../../services/llm-autofix-service/llm-fix-service');

      vi.mocked(defaultStrategyExecutor.executeRecovery).mockResolvedValue({
        success: false,
        strategy: 'ALL_STRATEGIES_FAILED',
        confidence: 0.1,
        finalCode: '',
        processingTimeMs: 2000,
        stages: [],
        errors: ['Auto-resolution failed'],
        circuitState: 'CLOSED'
      });

      vi.mocked(llmAutoFixService.attemptAutoFix).mockResolvedValue({
        success: false,
        strategy: 'all-failed',
        confidence: 0,
        errors: ['LLM service unavailable', 'No applicable fix strategies']
      });

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Wait for both stages to fail
      await waitFor(() => {
        expect(screen.getByText(/Both auto-resolution and AI fix failed/i)).toBeInTheDocument();
      }, { timeout: 6000 });

      // Should show manual intervention suggestion
      expect(screen.getByText(/Manual intervention required/i)).toBeInTheDocument();

      // Should offer retry option
      expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
    });
  });

  describe('Stage Transition Logic', () => {
    it('should only proceed to stage 2 if stage 1 fails completely', async () => {
      // Mock partial success in stage 1 (low confidence but success)
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      vi.mocked(defaultStrategyExecutor.executeRecovery).mockResolvedValue({
        success: true,
        strategy: 'IMPORT_REMOVAL',
        confidence: 0.4, // Low confidence but successful
        finalCode: 'const Button = () => <button>Click</button>; // import removed',
        processingTimeMs: 2500,
        stages: [],
        errors: [],
        circuitState: 'CLOSED'
      });

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/Success/i)).toBeInTheDocument();
      });

      // Should NOT transition to AI fix stage since stage 1 succeeded
      expect(screen.queryByText(/AI Fix/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Falling back/i)).not.toBeInTheDocument();

      // Should show low confidence warning
      expect(screen.getByText(/40%/i)).toBeInTheDocument();

      // Should still offer to apply the fix despite low confidence
      expect(screen.getByText(/Apply Fix/i)).toBeInTheDocument();
    });

    it('should provide clear stage progression feedback', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      // Mock stage-by-stage progression
      let callCount = 0;
      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(async () => {
        callCount++;

        // Simulate progressive execution with stage updates
        if (callCount === 1) {
          return {
            success: false,
            strategy: 'IN_PROGRESS',
            confidence: 0,
            finalCode: '',
            processingTimeMs: 500,
            stages: [
              { name: 'Circuit Breaker Check', status: 'completed', processingTimeMs: 50 },
              { name: 'Intent Classification', status: 'running', processingTimeMs: 0 }
            ],
            errors: [],
            circuitState: 'CLOSED'
          };
        }

        return {
          success: false,
          strategy: 'ALL_STRATEGIES_FAILED',
          confidence: 0.1,
          finalCode: '',
          processingTimeMs: 3000,
          stages: [
            { name: 'Circuit Breaker Check', status: 'completed', processingTimeMs: 50 },
            { name: 'Intent Classification', status: 'completed', processingTimeMs: 200 },
            { name: 'CSS Module Strategy', status: 'failed', processingTimeMs: 800 },
            { name: 'JSON Inlining Strategy', status: 'failed', processingTimeMs: 700 },
            { name: 'Import Removal Strategy', status: 'failed', processingTimeMs: 1250 }
          ],
          errors: ['All strategies exhausted'],
          circuitState: 'CLOSED'
        };
      });

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Should show initial stage
      await waitFor(() => {
        expect(screen.getByText(/Auto-Resolution/i)).toBeInTheDocument();
      });

      // Should show progression through stages
      await waitFor(() => {
        expect(screen.getByText(/Intent Classification/i)).toBeInTheDocument();
      });

      // Should eventually show stage transition
      await waitFor(() => {
        expect(screen.getByText(/AI Fix/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('User Interaction During Stages', () => {
    it('should allow cancellation during any stage', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      // Mock long-running process
      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: false,
          strategy: 'TIMEOUT',
          confidence: 0,
          finalCode: '',
          processingTimeMs: 10000,
          stages: [],
          errors: ['Process timeout'],
          circuitState: 'CLOSED'
        }), 10000))
      );

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Wait for processing to start
      await waitFor(() => {
        expect(screen.getByText(/Processing/i)).toBeInTheDocument();
      });

      // Should show cancel option
      const cancelButton = screen.getByText(/Cancel/i);
      expect(cancelButton).toBeInTheDocument();

      // Cancel the process
      await fireEvent.click(cancelButton);

      // Should return to initial state
      await waitFor(() => {
        expect(screen.queryByText(/Processing/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Start Recovery/i)).toBeInTheDocument();
      });
    });

    it('should provide detailed progress information', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      vi.mocked(defaultStrategyExecutor.executeRecovery).mockResolvedValue({
        success: true,
        strategy: 'CSS_MODULE_CONVERSION',
        confidence: 0.92,
        finalCode: 'const styles = { button: { background: "blue" } };',
        processingTimeMs: 1800,
        stages: [
          { name: 'Circuit Breaker Check', status: 'completed', processingTimeMs: 45 },
          { name: 'Intent Classification', status: 'completed', processingTimeMs: 180 },
          { name: 'CSS Module Strategy', status: 'completed', processingTimeMs: 1575 }
        ],
        errors: [],
        circuitState: 'CLOSED'
      });

      const { component } = render(EnhancedErrorRecovery, { props: { ...mockProps, showAdvancedOptions: true } });

      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/Success/i)).toBeInTheDocument();
      });

      // Should show detailed metrics with advanced options
      expect(screen.getByText(/Processing Time/i)).toBeInTheDocument();
      expect(screen.getByText(/1.8s/i)).toBeInTheDocument(); // Processing time
      expect(screen.getByText(/Confidence/i)).toBeInTheDocument();
      expect(screen.getByText(/92%/i)).toBeInTheDocument();
      expect(screen.getByText(/Stages Completed/i)).toBeInTheDocument();
      expect(screen.getByText(/3/)).toBeInTheDocument(); // Stage count
    });
  });

  describe('Error Recovery Integration', () => {
    it('should integrate with circuit breaker to prevent infinite loops', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      // Mock circuit breaker blocking
      vi.mocked(defaultStrategyExecutor.executeRecovery).mockResolvedValue({
        success: false,
        strategy: 'CIRCUIT_BREAKER_BLOCKED',
        confidence: 0,
        finalCode: '',
        processingTimeMs: 100,
        stages: [
          { name: 'Circuit Breaker Check', status: 'failed', processingTimeMs: 100 }
        ],
        errors: ['Circuit breaker is open - too many recent failures'],
        circuitState: 'OPEN'
      });

      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/Circuit breaker/i)).toBeInTheDocument();
      });

      // Should show circuit breaker message
      expect(screen.getByText(/too many recent failures/i)).toBeInTheDocument();

      // Should offer reset option
      expect(screen.getByText(/Reset & Retry/i)).toBeInTheDocument();
    });

    it('should maintain state consistency during stage transitions', async () => {
      const { component } = render(EnhancedErrorRecovery, { props: mockProps });

      // Trigger multiple rapid state changes
      const startButton = screen.getByText('Start Recovery');

      // Click multiple times rapidly
      await fireEvent.click(startButton);
      await fireEvent.click(startButton);
      await fireEvent.click(startButton);

      // Should only have one active recovery process
      const processingElements = screen.queryAllByText(/Processing/i);
      expect(processingElements.length).toBeLessThanOrEqual(1);

      // Should not show conflicting UI states
      expect(screen.queryByText(/Start Recovery/i)).not.toBeInTheDocument();
    });
  });
});