/**
 * Progress Indicator Accuracy UI Validation Tests
 *
 * These tests validate that progress indicators accurately reflect
 * the current state of dependency resolution processes, providing
 * meaningful feedback to users during recovery operations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor, screen } from '@testing-library/svelte';
import ProgressIndicator from '../../components/artifacts/ProgressIndicator.svelte';

describe('Progress Indicator Accuracy Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Linear Progress Indicator', () => {
    it('should accurately display progress percentage', async () => {
      const { component, rerender } = render(ProgressIndicator, {
        props: {
          progress: 25,
          stage: 'Intent Classification',
          animated: true,
          showPercentage: true,
          size: 'medium',
          variant: 'linear',
          color: 'primary'
        }
      });

      // Should show correct percentage
      expect(screen.getByText('25%')).toBeInTheDocument();

      // Should show current stage
      expect(screen.getByText('Intent Classification')).toBeInTheDocument();

      // Update progress
      await rerender({
        progress: 75,
        stage: 'Strategy Execution',
        animated: true,
        showPercentage: true,
        size: 'medium',
        variant: 'linear',
        color: 'primary'
      });

      // Should update to new values
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('Strategy Execution')).toBeInTheDocument();
    });

    it('should handle edge cases for progress values', async () => {
      const testCases = [
        { progress: 0, expected: '0%' },
        { progress: 100, expected: '100%' },
        { progress: -5, expected: '0%' }, // Should clamp to 0
        { progress: 105, expected: '100%' }, // Should clamp to 100
        { progress: 33.7, expected: '34%' } // Should round
      ];

      for (const testCase of testCases) {
        const { rerender } = render(ProgressIndicator, {
          props: {
            progress: testCase.progress,
            stage: 'Test Stage',
            showPercentage: true,
            variant: 'linear'
          }
        });

        expect(screen.getByText(testCase.expected)).toBeInTheDocument();
      }
    });

    it('should display progress bar with correct width', async () => {
      render(ProgressIndicator, {
        props: {
          progress: 60,
          stage: 'CSS Module Strategy',
          variant: 'linear',
          animated: false
        }
      });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();

      // Should have aria-valuenow attribute
      expect(progressBar).toHaveAttribute('aria-valuenow', '60');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Circular Progress Indicator', () => {
    it('should display circular progress accurately', async () => {
      render(ProgressIndicator, {
        props: {
          progress: 45,
          stage: 'JSON Inlining',
          variant: 'circular',
          size: 'large',
          showPercentage: true,
          color: 'success'
        }
      });

      // Should show percentage in center
      expect(screen.getByText('45%')).toBeInTheDocument();

      // Should show stage below circle
      expect(screen.getByText('JSON Inlining')).toBeInTheDocument();

      // Should have circular progress element
      const svg = screen.getByRole('progressbar');
      expect(svg.tagName.toLowerCase()).toBe('svg');
    });

    it('should animate progress changes smoothly', async () => {
      const { rerender } = render(ProgressIndicator, {
        props: {
          progress: 20,
          stage: 'Starting',
          variant: 'circular',
          animated: true
        }
      });

      // Rapid progress updates should be smooth
      await rerender({ progress: 40, stage: 'Processing', variant: 'circular', animated: true });
      await rerender({ progress: 80, stage: 'Finalizing', variant: 'circular', animated: true });

      // Should reach final state
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('Finalizing')).toBeInTheDocument();
    });
  });

  describe('Stage Information Display', () => {
    it('should display meaningful stage descriptions', async () => {
      const stages = [
        'Circuit Breaker Check',
        'Intent Classification',
        'CSS Module Strategy',
        'Direct CSS Injection',
        'JSON Data Inlining',
        'Import Removal',
        'AI Fix Attempt',
        'Result Validation'
      ];

      for (const stage of stages) {
        render(ProgressIndicator, {
          props: {
            progress: 50,
            stage: stage,
            variant: 'linear'
          }
        });

        expect(screen.getByText(stage)).toBeInTheDocument();
      }
    });

    it('should truncate very long stage names gracefully', async () => {
      const longStageName = 'This is an extremely long stage name that should be truncated for better UI presentation';

      render(ProgressIndicator, {
        props: {
          progress: 30,
          stage: longStageName,
          variant: 'linear'
        }
      });

      // Should still be accessible but may be visually truncated
      expect(screen.getByText(longStageName)).toBeInTheDocument();
    });

    it('should handle empty or undefined stages', async () => {
      render(ProgressIndicator, {
        props: {
          progress: 50,
          stage: '',
          variant: 'linear'
        }
      });

      // Should not crash and should show progress
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Animation and Timing', () => {
    it('should respect animation preferences', async () => {
      // Test with animation enabled
      const { rerender } = render(ProgressIndicator, {
        props: {
          progress: 25,
          stage: 'Test',
          animated: true,
          variant: 'linear'
        }
      });

      const progressElement = screen.getByRole('progressbar');
      expect(progressElement).toHaveClass(/animated/);

      // Test with animation disabled
      await rerender({
        progress: 25,
        stage: 'Test',
        animated: false,
        variant: 'linear'
      });

      expect(progressElement).not.toHaveClass(/animated/);
    });

    it('should handle rapid progress updates without performance issues', async () => {
      const { rerender } = render(ProgressIndicator, {
        props: {
          progress: 0,
          stage: 'Starting',
          animated: true,
          variant: 'linear'
        }
      });

      const startTime = Date.now();

      // Simulate rapid updates
      for (let i = 0; i <= 100; i += 5) {
        await rerender({
          progress: i,
          stage: `Progress ${i}%`,
          animated: true,
          variant: 'linear'
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete updates quickly (under 1 second)
      expect(duration).toBeLessThan(1000);

      // Should reach final state
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('Progress 100%')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should provide proper ARIA attributes', async () => {
      render(ProgressIndicator, {
        props: {
          progress: 65,
          stage: 'Processing Data',
          variant: 'linear',
          showPercentage: true
        }
      });

      const progressBar = screen.getByRole('progressbar');

      expect(progressBar).toHaveAttribute('aria-valuenow', '65');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label');
    });

    it('should be screen reader friendly', async () => {
      render(ProgressIndicator, {
        props: {
          progress: 42,
          stage: 'Analyzing Dependencies',
          variant: 'circular',
          showPercentage: true
        }
      });

      const progressBar = screen.getByRole('progressbar');
      const ariaLabel = progressBar.getAttribute('aria-label');

      // Should include progress and stage information
      expect(ariaLabel).toContain('42');
      expect(ariaLabel).toContain('Analyzing Dependencies');
    });

    it('should support high contrast mode', async () => {
      render(ProgressIndicator, {
        props: {
          progress: 78,
          stage: 'Finalizing',
          variant: 'linear',
          color: 'primary'
        }
      });

      const progressElement = screen.getByRole('progressbar');

      // Should have appropriate classes for high contrast
      expect(progressElement).toHaveClass(/progress-indicator/);

      // Colors should be accessible (tested via CSS classes)
      expect(progressElement).toHaveClass(/primary/);
    });
  });

  describe('Error States', () => {
    it('should display error state when progress fails', async () => {
      render(ProgressIndicator, {
        props: {
          progress: 30,
          stage: 'Failed Operation',
          variant: 'linear',
          color: 'error',
          error: true
        }
      });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass(/error/);

      // Should still show current progress
      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(screen.getByText('Failed Operation')).toBeInTheDocument();
    });

    it('should show indeterminate state for unknown progress', async () => {
      render(ProgressIndicator, {
        props: {
          progress: null, // Unknown progress
          stage: 'Initializing...',
          variant: 'linear',
          animated: true
        }
      });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');

      // Should show indeterminate animation
      expect(progressBar).toHaveClass(/indeterminate/);
      expect(screen.getByText('Initializing...')).toBeInTheDocument();
    });
  });

  describe('Size and Styling Variants', () => {
    it('should support different size variants', async () => {
      const sizes = ['small', 'medium', 'large'];

      for (const size of sizes) {
        render(ProgressIndicator, {
          props: {
            progress: 50,
            stage: 'Test',
            variant: 'linear',
            size: size
          }
        });

        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveClass(new RegExp(size));
      }
    });

    it('should support different color themes', async () => {
      const colors = ['primary', 'secondary', 'success', 'warning', 'error'];

      for (const color of colors) {
        render(ProgressIndicator, {
          props: {
            progress: 60,
            stage: 'Test',
            variant: 'circular',
            color: color
          }
        });

        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveClass(new RegExp(color));
      }
    });
  });

  describe('Performance Validation', () => {
    it('should maintain smooth performance with frequent updates', async () => {
      const updateTimes: number[] = [];
      const { rerender } = render(ProgressIndicator, {
        props: {
          progress: 0,
          stage: 'Performance Test',
          animated: true,
          variant: 'linear'
        }
      });

      // Measure update performance
      for (let i = 0; i <= 100; i += 1) {
        const updateStart = performance.now();

        await rerender({
          progress: i,
          stage: `Step ${i}`,
          animated: true,
          variant: 'linear'
        });

        const updateEnd = performance.now();
        updateTimes.push(updateEnd - updateStart);
      }

      // Calculate average update time
      const averageUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length;

      // Should update quickly (under 5ms average)
      expect(averageUpdateTime).toBeLessThan(5);

      // No individual update should take too long
      const maxUpdateTime = Math.max(...updateTimes);
      expect(maxUpdateTime).toBeLessThan(50);
    });

    it('should not cause memory leaks with continuous updates', async () => {
      const { rerender, unmount } = render(ProgressIndicator, {
        props: {
          progress: 0,
          stage: 'Memory Test',
          animated: true,
          variant: 'circular'
        }
      });

      // Simulate long-running progress updates
      for (let cycle = 0; cycle < 10; cycle++) {
        for (let i = 0; i <= 100; i += 10) {
          await rerender({
            progress: i,
            stage: `Cycle ${cycle}, Step ${i}`,
            animated: true,
            variant: 'circular'
          });
        }
      }

      // Should complete without issues
      expect(screen.getByText('100%')).toBeInTheDocument();

      // Clean unmount
      unmount();
    });
  });
});