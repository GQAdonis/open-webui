/**
 * Button State Management UI Validation Tests
 *
 * These tests validate that recovery buttons properly manage their states
 * during different phases of the dependency resolution process,
 * providing appropriate visual feedback and interaction behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import RecoveryButton from '../../components/artifacts/RecoveryButton.svelte';

describe('Button State Management Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Button States', () => {
    it('should display primary button state correctly', async () => {
      const { component } = render(RecoveryButton, {
        props: {
          variant: 'primary',
          size: 'medium',
          disabled: false,
          loading: false
        }
      });

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
      expect(button).toHaveClass(/primary/);
      expect(button).toHaveClass(/medium/);
    });

    it('should display secondary button state correctly', async () => {
      render(RecoveryButton, {
        props: {
          variant: 'secondary',
          size: 'small',
          disabled: false,
          loading: false
        }
      });

      const button = screen.getByRole('button');
      expect(button).toHaveClass(/secondary/);
      expect(button).toHaveClass(/small/);
    });

    it('should display success button state correctly', async () => {
      render(RecoveryButton, {
        props: {
          variant: 'success',
          size: 'large',
          success: true
        }
      });

      const button = screen.getByRole('button');
      expect(button).toHaveClass(/success/);
      expect(button).toHaveClass(/large/);

      // Should show success indicator
      const successIcon = screen.getByLabelText(/success/i);
      expect(successIcon).toBeInTheDocument();
    });

    it('should display danger button state correctly', async () => {
      render(RecoveryButton, {
        props: {
          variant: 'danger',
          size: 'medium',
          disabled: false
        }
      });

      const button = screen.getByRole('button');
      expect(button).toHaveClass(/danger/);
    });
  });

  describe('Loading States', () => {
    it('should show loading state with spinner', async () => {
      render(RecoveryButton, {
        props: {
          variant: 'primary',
          loading: true,
          loadingText: 'Processing...'
        }
      });

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText('Processing...')).toBeInTheDocument();

      // Should show loading spinner
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should maintain loading state until explicitly changed', async () => {
      const { rerender } = render(RecoveryButton, {
        props: {
          variant: 'primary',
          loading: true,
          loadingText: 'Auto-resolving...'
        }
      });

      // Should be in loading state
      expect(screen.getByText('Auto-resolving...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();

      // Update loading text
      await rerender({
        variant: 'primary',
        loading: true,
        loadingText: 'AI Fix in progress...'
      });

      expect(screen.getByText('AI Fix in progress...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();

      // Stop loading
      await rerender({
        variant: 'primary',
        loading: false
      });

      expect(screen.queryByText('AI Fix in progress...')).not.toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('should prevent clicks during loading', async () => {
      const clickHandler = vi.fn();

      render(RecoveryButton, {
        props: {
          variant: 'primary',
          loading: true,
          loadingText: 'Please wait...'
        }
      });

      const button = screen.getByRole('button');
      button.addEventListener('click', clickHandler);

      await fireEvent.click(button);

      // Click should not be processed
      expect(clickHandler).not.toHaveBeenCalled();
    });
  });

  describe('Disabled States', () => {
    it('should properly disable button and prevent interaction', async () => {
      const clickHandler = vi.fn();

      render(RecoveryButton, {
        props: {
          variant: 'primary',
          disabled: true
        }
      });

      const button = screen.getByRole('button');
      button.addEventListener('click', clickHandler);

      expect(button).toBeDisabled();

      await fireEvent.click(button);
      expect(clickHandler).not.toHaveBeenCalled();
    });

    it('should show appropriate visual styling for disabled state', async () => {
      render(RecoveryButton, {
        props: {
          variant: 'secondary',
          disabled: true
        }
      });

      const button = screen.getByRole('button');
      expect(button).toHaveClass(/disabled/);
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should handle conditional disabling based on props', async () => {
      const { rerender } = render(RecoveryButton, {
        props: {
          variant: 'primary',
          disabled: false
        }
      });

      let button = screen.getByRole('button');
      expect(button).not.toBeDisabled();

      // Disable based on condition
      await rerender({
        variant: 'primary',
        disabled: true
      });

      button = screen.getByRole('button');
      expect(button).toBeDisabled();

      // Re-enable
      await rerender({
        variant: 'primary',
        disabled: false
      });

      button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
  });

  describe('Success States', () => {
    it('should display success state with appropriate styling', async () => {
      render(RecoveryButton, {
        props: {
          variant: 'success',
          success: true
        }
      });

      const button = screen.getByRole('button');
      expect(button).toHaveClass(/success/);

      // Should show success icon
      const successIcon = screen.getByLabelText(/success/i);
      expect(successIcon).toBeInTheDocument();
    });

    it('should allow clicks in success state', async () => {
      const clickHandler = vi.fn();

      render(RecoveryButton, {
        props: {
          variant: 'success',
          success: true
        }
      });

      const button = screen.getByRole('button');
      button.addEventListener('click', clickHandler);

      await fireEvent.click(button);
      expect(clickHandler).toHaveBeenCalled();
    });

    it('should transition to success state smoothly', async () => {
      const { rerender } = render(RecoveryButton, {
        props: {
          variant: 'primary',
          loading: true,
          loadingText: 'Processing...'
        }
      });

      // Start in loading state
      expect(screen.getByText('Processing...')).toBeInTheDocument();

      // Transition to success
      await rerender({
        variant: 'success',
        loading: false,
        success: true
      });

      expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/success/i)).toBeInTheDocument();
    });
  });

  describe('Interactive States', () => {
    it('should handle hover states correctly', async () => {
      render(RecoveryButton, {
        props: {
          variant: 'primary',
          size: 'medium'
        }
      });

      const button = screen.getByRole('button');

      await fireEvent.mouseEnter(button);
      expect(button).toHaveClass(/hover/);

      await fireEvent.mouseLeave(button);
      expect(button).not.toHaveClass(/hover/);
    });

    it('should handle focus states correctly', async () => {
      render(RecoveryButton, {
        props: {
          variant: 'primary'
        }
      });

      const button = screen.getByRole('button');

      await fireEvent.focus(button);
      expect(button).toHaveClass(/focus/);

      await fireEvent.blur(button);
      expect(button).not.toHaveClass(/focus/);
    });

    it('should provide keyboard accessibility', async () => {
      const clickHandler = vi.fn();

      render(RecoveryButton, {
        props: {
          variant: 'primary'
        }
      });

      const button = screen.getByRole('button');
      button.addEventListener('click', clickHandler);

      // Should be focusable
      button.focus();
      expect(document.activeElement).toBe(button);

      // Should respond to Enter key
      await fireEvent.keyDown(button, { key: 'Enter' });
      expect(clickHandler).toHaveBeenCalledTimes(1);

      // Should respond to Space key
      await fireEvent.keyDown(button, { key: ' ' });
      expect(clickHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Size Variants', () => {
    it('should apply correct size classes', async () => {
      const sizes = ['small', 'medium', 'large'];

      for (const size of sizes) {
        render(RecoveryButton, {
          props: {
            variant: 'primary',
            size: size
          }
        });

        const button = screen.getByRole('button');
        expect(button).toHaveClass(new RegExp(size));
      }
    });

    it('should maintain size consistency across state changes', async () => {
      const { rerender } = render(RecoveryButton, {
        props: {
          variant: 'primary',
          size: 'large',
          loading: false
        }
      });

      const button = screen.getByRole('button');
      expect(button).toHaveClass(/large/);

      // Change to loading state
      await rerender({
        variant: 'primary',
        size: 'large',
        loading: true,
        loadingText: 'Loading...'
      });

      expect(button).toHaveClass(/large/);

      // Change to success state
      await rerender({
        variant: 'success',
        size: 'large',
        loading: false,
        success: true
      });

      expect(button).toHaveClass(/large/);
    });
  });

  describe('Content Management', () => {
    it('should display slot content correctly', async () => {
      render(RecoveryButton, {
        props: {
          variant: 'primary'
        }
      });

      // Default slot content should be rendered
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle dynamic content changes', async () => {
      const { rerender } = render(RecoveryButton, {
        props: {
          variant: 'primary',
          loading: false
        }
      });

      // Change to loading with text
      await rerender({
        variant: 'primary',
        loading: true,
        loadingText: 'Auto-resolving dependencies...'
      });

      expect(screen.getByText('Auto-resolving dependencies...')).toBeInTheDocument();

      // Change loading text
      await rerender({
        variant: 'primary',
        loading: true,
        loadingText: 'Applying AI fix...'
      });

      expect(screen.getByText('Applying AI fix...')).toBeInTheDocument();
      expect(screen.queryByText('Auto-resolving dependencies...')).not.toBeInTheDocument();
    });

    it('should handle empty or undefined text gracefully', async () => {
      render(RecoveryButton, {
        props: {
          variant: 'primary',
          loading: true,
          loadingText: ''
        }
      });

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();

      // Should still show loading spinner even without text
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    it('should emit click events correctly', async () => {
      const clickHandler = vi.fn();

      render(RecoveryButton, {
        props: {
          variant: 'primary'
        }
      });

      const button = screen.getByRole('button');
      button.addEventListener('click', clickHandler);

      await fireEvent.click(button);
      expect(clickHandler).toHaveBeenCalledTimes(1);

      await fireEvent.click(button);
      expect(clickHandler).toHaveBeenCalledTimes(2);
    });

    it('should prevent double-click during loading', async () => {
      const clickHandler = vi.fn();

      const { rerender } = render(RecoveryButton, {
        props: {
          variant: 'primary',
          loading: false
        }
      });

      const button = screen.getByRole('button');
      button.addEventListener('click', clickHandler);

      // Click while not loading
      await fireEvent.click(button);
      expect(clickHandler).toHaveBeenCalledTimes(1);

      // Set to loading state
      await rerender({
        variant: 'primary',
        loading: true
      });

      // Attempt to click while loading
      await fireEvent.click(button);
      expect(clickHandler).toHaveBeenCalledTimes(1); // Should not increment
    });

    it('should handle rapid state transitions correctly', async () => {
      const { rerender } = render(RecoveryButton, {
        props: {
          variant: 'primary',
          loading: false,
          disabled: false,
          success: false
        }
      });

      const button = screen.getByRole('button');

      // Rapid state changes
      await rerender({ variant: 'primary', loading: true, disabled: false, success: false });
      await rerender({ variant: 'primary', loading: false, disabled: true, success: false });
      await rerender({ variant: 'success', loading: false, disabled: false, success: true });

      // Should end up in success state
      expect(button).toHaveClass(/success/);
      expect(button).not.toBeDisabled();
      expect(screen.getByLabelText(/success/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should provide proper ARIA attributes', async () => {
      render(RecoveryButton, {
        props: {
          variant: 'primary',
          loading: true,
          loadingText: 'Processing recovery...'
        }
      });

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should support screen reader announcements', async () => {
      const { rerender } = render(RecoveryButton, {
        props: {
          variant: 'primary',
          loading: false
        }
      });

      // Transition to loading
      await rerender({
        variant: 'primary',
        loading: true,
        loadingText: 'Recovery in progress'
      });

      expect(screen.getByText('Recovery in progress')).toBeInTheDocument();

      // Transition to success
      await rerender({
        variant: 'success',
        loading: false,
        success: true
      });

      const successIcon = screen.getByLabelText(/success/i);
      expect(successIcon).toBeInTheDocument();
    });

    it('should maintain focus management during state changes', async () => {
      const { rerender } = render(RecoveryButton, {
        props: {
          variant: 'primary',
          loading: false
        }
      });

      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);

      // State change should maintain focus
      await rerender({
        variant: 'primary',
        loading: true,
        loadingText: 'Loading...'
      });

      expect(document.activeElement).toBe(button);
    });
  });
});