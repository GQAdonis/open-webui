/**
 * Results Display UI Validation Tests
 *
 * These tests validate that recovery results are displayed accurately
 * and comprehensively, showing users the outcome of dependency resolution
 * attempts with appropriate detail and actionable information.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import RecoveryResults from '../../components/artifacts/RecoveryResults.svelte';

describe('Results Display Validation', () => {
  const mockSuccessResult = {
    success: true,
    strategy: 'CSS_MODULE_CONVERSION',
    confidence: 0.92,
    finalCode: 'const styles = { button: { background: "blue", color: "white" } };',
    processingTimeMs: 1500,
    stages: [
      { name: 'Circuit Breaker Check', status: 'completed', processingTimeMs: 50 },
      { name: 'Intent Classification', status: 'completed', processingTimeMs: 200 },
      { name: 'CSS Module Strategy', status: 'completed', processingTimeMs: 1250 }
    ],
    errors: [],
    circuitState: 'CLOSED'
  };

  const mockFailureResult = {
    success: false,
    strategy: 'ALL_STRATEGIES_FAILED',
    confidence: 0.1,
    finalCode: '',
    processingTimeMs: 3500,
    stages: [
      { name: 'Circuit Breaker Check', status: 'completed', processingTimeMs: 50 },
      { name: 'Intent Classification', status: 'completed', processingTimeMs: 200 },
      { name: 'CSS Module Strategy', status: 'failed', processingTimeMs: 800 },
      { name: 'Direct CSS Injection', status: 'failed', processingTimeMs: 700 },
      { name: 'JSON Inlining Strategy', status: 'failed', processingTimeMs: 900 },
      { name: 'Import Removal Strategy', status: 'failed', processingTimeMs: 850 }
    ],
    errors: ['No CSS content found in message', 'No JSON data available', 'Import removal failed'],
    circuitState: 'CLOSED'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success Results Display', () => {
    it('should display successful recovery results comprehensively', async () => {
      render(RecoveryResults, {
        props: {
          result: mockSuccessResult,
          showDiagnostics: true,
          showPerformanceMetrics: true,
          compact: false
        }
      });

      // Should show success indicator
      expect(screen.getByText(/Success/i)).toBeInTheDocument();

      // Should show strategy used
      expect(screen.getByText(/CSS Module Conversion/i)).toBeInTheDocument();

      // Should show confidence score
      expect(screen.getByText(/92%/i)).toBeInTheDocument();

      // Should show processing time
      expect(screen.getByText(/1.5s/i)).toBeInTheDocument();

      // Should show stages completed
      expect(screen.getByText(/3/)).toBeInTheDocument();

      // Should show apply button
      expect(screen.getByText(/Apply Fix/i)).toBeInTheDocument();
    });

    it('should display strategy-specific information', async () => {
      const cssResult = {
        ...mockSuccessResult,
        strategy: 'CSS_MODULE_CONVERSION',
        explanation: 'Converted CSS module imports to inline styles while preserving functionality'
      };

      render(RecoveryResults, {
        props: {
          result: cssResult,
          showDiagnostics: true
        }
      });

      expect(screen.getByText(/CSS Module Conversion/i)).toBeInTheDocument();
      expect(screen.getByText(/Converted CSS module imports/i)).toBeInTheDocument();
    });

    it('should show code preview for successful fixes', async () => {
      render(RecoveryResults, {
        props: {
          result: mockSuccessResult,
          showDiagnostics: true
        }
      });

      // Should show code preview
      expect(screen.getByText(/const styles/)).toBeInTheDocument();
      expect(screen.getByText(/background: "blue"/)).toBeInTheDocument();

      // Should have copy button
      expect(screen.getByLabelText(/Copy code/i)).toBeInTheDocument();
    });

    it('should display confidence levels with appropriate styling', async () => {
      const confidenceLevels = [
        { confidence: 0.95, expectedClass: 'high-confidence', expectedText: '95%' },
        { confidence: 0.75, expectedClass: 'medium-confidence', expectedText: '75%' },
        { confidence: 0.45, expectedClass: 'low-confidence', expectedText: '45%' }
      ];

      for (const { confidence, expectedClass, expectedText } of confidenceLevels) {
        render(RecoveryResults, {
          props: {
            result: { ...mockSuccessResult, confidence }
          }
        });

        const confidenceElement = screen.getByText(expectedText);
        expect(confidenceElement).toBeInTheDocument();
        expect(confidenceElement).toHaveClass(new RegExp(expectedClass));
      }
    });
  });

  describe('Failure Results Display', () => {
    it('should display failure results with detailed error information', async () => {
      render(RecoveryResults, {
        props: {
          result: mockFailureResult,
          showDiagnostics: true,
          showPerformanceMetrics: true
        }
      });

      // Should show failure indicator
      expect(screen.getByText(/Failed/i)).toBeInTheDocument();

      // Should show that all strategies failed
      expect(screen.getByText(/All Strategies Failed/i)).toBeInTheDocument();

      // Should show error details
      expect(screen.getByText(/No CSS content found/i)).toBeInTheDocument();
      expect(screen.getByText(/No JSON data available/i)).toBeInTheDocument();
      expect(screen.getByText(/Import removal failed/i)).toBeInTheDocument();

      // Should show processing time (even for failures)
      expect(screen.getByText(/3.5s/i)).toBeInTheDocument();

      // Should show retry options
      expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
    });

    it('should show attempted strategies and their outcomes', async () => {
      render(RecoveryResults, {
        props: {
          result: mockFailureResult,
          showDiagnostics: true
        }
      });

      // Should show all attempted strategies
      expect(screen.getByText(/CSS Module Strategy/i)).toBeInTheDocument();
      expect(screen.getByText(/Direct CSS Injection/i)).toBeInTheDocument();
      expect(screen.getByText(/JSON Inlining Strategy/i)).toBeInTheDocument();
      expect(screen.getByText(/Import Removal Strategy/i)).toBeInTheDocument();

      // Should show failure status for each
      const failedElements = screen.getAllByText(/failed/i);
      expect(failedElements.length).toBeGreaterThan(0);
    });

    it('should provide actionable next steps for failures', async () => {
      render(RecoveryResults, {
        props: {
          result: mockFailureResult,
          showDiagnostics: true
        }
      });

      // Should suggest next actions
      expect(screen.getByText(/Try Again/i)).toBeInTheDocument();
      expect(screen.getByText(/Show Error Details/i)).toBeInTheDocument();

      // Should offer manual intervention option
      expect(screen.getByText(/Manual Fix/i)).toBeInTheDocument();
    });
  });

  describe('Performance Metrics Display', () => {
    it('should show detailed performance breakdown when enabled', async () => {
      render(RecoveryResults, {
        props: {
          result: mockSuccessResult,
          showPerformanceMetrics: true,
          showDiagnostics: true
        }
      });

      // Should show total processing time
      expect(screen.getByText(/Processing Time/i)).toBeInTheDocument();
      expect(screen.getByText(/1.5s/i)).toBeInTheDocument();

      // Should show stage breakdown
      expect(screen.getByText(/Circuit Breaker Check/i)).toBeInTheDocument();
      expect(screen.getByText(/50ms/i)).toBeInTheDocument();
      expect(screen.getByText(/Intent Classification/i)).toBeInTheDocument();
      expect(screen.getByText(/200ms/i)).toBeInTheDocument();
    });

    it('should highlight performance bottlenecks', async () => {
      const slowResult = {
        ...mockSuccessResult,
        processingTimeMs: 8000,
        stages: [
          { name: 'Circuit Breaker Check', status: 'completed', processingTimeMs: 50 },
          { name: 'Intent Classification', status: 'completed', processingTimeMs: 7800 }, // Slow stage
          { name: 'CSS Module Strategy', status: 'completed', processingTimeMs: 150 }
        ]
      };

      render(RecoveryResults, {
        props: {
          result: slowResult,
          showPerformanceMetrics: true
        }
      });

      // Should highlight slow processing time
      expect(screen.getByText(/8.0s/i)).toBeInTheDocument();

      // Should highlight slow stage
      const slowStage = screen.getByText(/7.8s/i);
      expect(slowStage).toBeInTheDocument();
      expect(slowStage).toHaveClass(/slow/);
    });

    it('should show performance comparison indicators', async () => {
      const fastResult = {
        ...mockSuccessResult,
        processingTimeMs: 500 // Very fast
      };

      render(RecoveryResults, {
        props: {
          result: fastResult,
          showPerformanceMetrics: true
        }
      });

      expect(screen.getByText(/0.5s/i)).toBeInTheDocument();

      // Should show fast performance indicator
      const performanceIndicator = screen.getByText(/Fast/i);
      expect(performanceIndicator).toBeInTheDocument();
      expect(performanceIndicator).toHaveClass(/fast-performance/);
    });
  });

  describe('Diagnostic Information Display', () => {
    it('should show detailed diagnostics when enabled', async () => {
      render(RecoveryResults, {
        props: {
          result: mockSuccessResult,
          showDiagnostics: true
        }
      });

      // Should show circuit state
      expect(screen.getByText(/Circuit State/i)).toBeInTheDocument();
      expect(screen.getByText(/CLOSED/i)).toBeInTheDocument();

      // Should show stage details
      expect(screen.getByText(/Stages Completed/i)).toBeInTheDocument();
      expect(screen.getByText(/3\/3/i)).toBeInTheDocument();
    });

    it('should hide diagnostics when disabled', async () => {
      render(RecoveryResults, {
        props: {
          result: mockSuccessResult,
          showDiagnostics: false
        }
      });

      // Should not show detailed diagnostics
      expect(screen.queryByText(/Circuit State/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Stages Completed/i)).not.toBeInTheDocument();
    });

    it('should show circuit breaker state warnings', async () => {
      const circuitOpenResult = {
        ...mockFailureResult,
        circuitState: 'OPEN'
      };

      render(RecoveryResults, {
        props: {
          result: circuitOpenResult,
          showDiagnostics: true
        }
      });

      expect(screen.getByText(/OPEN/i)).toBeInTheDocument();
      expect(screen.getByText(/too many recent failures/i)).toBeInTheDocument();
      expect(screen.getByText(/Reset Circuit/i)).toBeInTheDocument();
    });
  });

  describe('Compact vs Detailed Display', () => {
    it('should show compact view when requested', async () => {
      render(RecoveryResults, {
        props: {
          result: mockSuccessResult,
          compact: true
        }
      });

      // Should show essential information
      expect(screen.getByText(/Success/i)).toBeInTheDocument();
      expect(screen.getByText(/CSS Module Conversion/i)).toBeInTheDocument();
      expect(screen.getByText(/92%/i)).toBeInTheDocument();

      // Should NOT show detailed diagnostics
      expect(screen.queryByText(/Circuit State/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Processing Time/i)).not.toBeInTheDocument();
    });

    it('should show detailed view when not compact', async () => {
      render(RecoveryResults, {
        props: {
          result: mockSuccessResult,
          compact: false,
          showDiagnostics: true
        }
      });

      // Should show all available information
      expect(screen.getByText(/Success/i)).toBeInTheDocument();
      expect(screen.getByText(/CSS Module Conversion/i)).toBeInTheDocument();
      expect(screen.getByText(/92%/i)).toBeInTheDocument();
      expect(screen.getByText(/Circuit State/i)).toBeInTheDocument();
      expect(screen.getByText(/Processing Time/i)).toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    it('should handle apply code action', async () => {
      const applyHandler = vi.fn();

      render(RecoveryResults, {
        props: {
          result: mockSuccessResult
        }
      });

      const component = screen.getByTestId('recovery-results');
      component.addEventListener('apply_code', applyHandler);

      const applyButton = screen.getByText(/Apply Fix/i);
      await fireEvent.click(applyButton);

      expect(applyHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            code: mockSuccessResult.finalCode,
            strategy: mockSuccessResult.strategy
          })
        })
      );
    });

    it('should handle details toggle', async () => {
      const toggleHandler = vi.fn();

      render(RecoveryResults, {
        props: {
          result: mockSuccessResult,
          showDiagnostics: false
        }
      });

      const component = screen.getByTestId('recovery-results');
      component.addEventListener('toggle_details', toggleHandler);

      const detailsButton = screen.getByText(/Show Details/i);
      await fireEvent.click(detailsButton);

      expect(toggleHandler).toHaveBeenCalled();
    });

    it('should copy code to clipboard', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined)
        }
      });

      render(RecoveryResults, {
        props: {
          result: mockSuccessResult,
          showDiagnostics: true
        }
      });

      const copyButton = screen.getByLabelText(/Copy code/i);
      await fireEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockSuccessResult.finalCode);
    });
  });

  describe('Error Handling in Display', () => {
    it('should handle malformed results gracefully', async () => {
      const malformedResult = {
        success: true,
        strategy: null,
        confidence: undefined,
        finalCode: undefined,
        stages: null
      };

      expect(() => {
        render(RecoveryResults, {
          props: {
            result: malformedResult
          }
        });
      }).not.toThrow();

      // Should show some basic information
      expect(screen.getByText(/Success/i)).toBeInTheDocument();
    });

    it('should handle missing result data', async () => {
      expect(() => {
        render(RecoveryResults, {
          props: {
            result: null
          }
        });
      }).not.toThrow();

      // Should show placeholder or empty state
      expect(screen.getByText(/No results available/i)).toBeInTheDocument();
    });

    it('should handle extremely long error messages', async () => {
      const longErrorResult = {
        ...mockFailureResult,
        errors: [
          'This is an extremely long error message that should be handled gracefully by the UI component without breaking the layout or causing performance issues. '.repeat(10)
        ]
      };

      render(RecoveryResults, {
        props: {
          result: longErrorResult,
          showDiagnostics: true
        }
      });

      // Should display but potentially truncate long errors
      expect(screen.getByText(/This is an extremely long/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should provide proper ARIA attributes', async () => {
      render(RecoveryResults, {
        props: {
          result: mockSuccessResult,
          showDiagnostics: true
        }
      });

      // Should have appropriate roles
      const resultsContainer = screen.getByRole('region');
      expect(resultsContainer).toHaveAttribute('aria-label');

      // Success indicator should be accessible
      const successIndicator = screen.getByRole('status');
      expect(successIndicator).toBeInTheDocument();
    });

    it('should support screen reader navigation', async () => {
      render(RecoveryResults, {
        props: {
          result: mockSuccessResult,
          showDiagnostics: true
        }
      });

      // Should have proper heading structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);

      // Should have descriptive button labels
      const applyButton = screen.getByText(/Apply Fix/i);
      expect(applyButton).toHaveAttribute('aria-label');
    });

    it('should announce state changes to screen readers', async () => {
      const { rerender } = render(RecoveryResults, {
        props: {
          result: mockSuccessResult
        }
      });

      // Should have initial announcement
      expect(screen.getByRole('status')).toBeInTheDocument();

      // Change to failure result
      await rerender({
        result: mockFailureResult
      });

      // Should announce the change
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});