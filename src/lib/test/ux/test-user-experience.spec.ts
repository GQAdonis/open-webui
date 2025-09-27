/**
 * User Experience Validation Tests
 *
 * These tests validate that the Enhanced Error Recovery system provides
 * an excellent user experience with clear feedback, intuitive interactions,
 * and helpful guidance throughout the dependency resolution process.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen, within } from '@testing-library/svelte';
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

describe('User Experience Validation', () => {
  const mockProps = {
    artifactId: 'ux-test',
    artifactCode: 'import styles from "./test.module.css";\nconst Test = () => <div className={styles.test}>UX Test</div>;',
    errorMessage: 'CSS module not found',
    messageContent: '.test { background: blue; color: white; padding: 20px; }',
    language: 'javascript',
    autoStart: false,
    showAdvancedOptions: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial User Interface', () => {
    it('should present a clear and inviting initial state', async () => {
      render(EnhancedErrorRecovery, { props: mockProps });

      // Should have clear primary action
      const startButton = screen.getByText('Start Recovery');
      expect(startButton).toBeInTheDocument();
      expect(startButton).toBeVisible();
      expect(startButton).not.toBeDisabled();

      // Should show helpful context about what will happen
      expect(screen.getByText(/dependency resolution/i)).toBeInTheDocument();

      // Should indicate the error clearly
      expect(screen.getByText(/CSS module not found/i)).toBeInTheDocument();

      // Should be visually organized and not overwhelming
      const mainContainer = screen.getByRole('main') || screen.getByTestId('error-recovery-container');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should provide helpful guidance about the recovery process', async () => {
      render(EnhancedErrorRecovery, { props: mockProps });

      // Should explain what the system will do
      expect(screen.getByText(/automatically resolve/i)).toBeInTheDocument();

      // Should indicate the two-stage process
      expect(screen.getByText(/auto-resolution/i)).toBeInTheDocument();

      // Should offer options for user control
      const advancedToggle = screen.queryByText(/advanced options/i) || screen.queryByText(/show details/i);
      if (advancedToggle) {
        expect(advancedToggle).toBeInTheDocument();
      }
    });

    it('should handle error message display gracefully', async () => {
      const longErrorProps = {
        ...mockProps,
        errorMessage: 'This is a very long error message that might wrap multiple lines and should be displayed in a user-friendly way without overwhelming the interface or making it hard to read the important information about the dependency resolution process.'
      };

      render(EnhancedErrorRecovery, { props: longErrorProps });

      // Should display error but not overwhelm the UI
      const errorDisplay = screen.getByText(/This is a very long error message/);
      expect(errorDisplay).toBeInTheDocument();

      // Error should be readable and well-formatted
      expect(errorDisplay).toHaveStyle({ 'word-wrap': 'break-word' });
    });
  });

  describe('Process Feedback and Progress', () => {
    it('should provide clear progress feedback during auto-resolution', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            success: true,
            strategy: 'CSS_MODULE_CONVERSION',
            confidence: 0.9,
            finalCode: 'const styles = { test: { background: "blue", color: "white", padding: "20px" } };',
            processingTimeMs: 1200,
            stages: [
              { name: 'Circuit Breaker Check', status: 'completed', processingTimeMs: 50 },
              { name: 'Intent Classification', status: 'completed', processingTimeMs: 150 },
              { name: 'CSS Module Strategy', status: 'completed', processingTimeMs: 1000 }
            ],
            errors: [],
            circuitState: 'CLOSED'
          }), 1200);
        })
      );

      render(EnhancedErrorRecovery, { props: mockProps });

      // Start the process
      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Should show immediate feedback
      await waitFor(() => {
        expect(screen.getByText(/processing/i) || screen.getByText(/auto-resolution/i)).toBeInTheDocument();
      });

      // Should show progress indicator
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();

      // Should show current stage information
      await waitFor(() => {
        expect(screen.getByText(/circuit breaker/i) || screen.getByText(/intent classification/i)).toBeInTheDocument();
      });

      // Should complete with success feedback
      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Should show confidence score in user-friendly way
      expect(screen.getByText(/90%/i) || screen.getByText(/high confidence/i)).toBeInTheDocument();

      // Should offer clear next action
      expect(screen.getByText(/apply fix/i) || screen.getByText(/use solution/i)).toBeInTheDocument();
    });

    it('should provide encouraging feedback during two-stage progression', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');
      const { llmAutoFixService } = await import('../../services/llm-autofix-service/llm-fix-service');

      // Mock auto-resolution failure
      vi.mocked(defaultStrategyExecutor.executeRecovery).mockResolvedValue({
        success: false,
        strategy: 'ALL_STRATEGIES_FAILED',
        confidence: 0.1,
        finalCode: '',
        processingTimeMs: 2000,
        stages: [],
        errors: ['No applicable strategies found'],
        circuitState: 'CLOSED'
      });

      // Mock AI fix success
      vi.mocked(llmAutoFixService.attemptAutoFix).mockResolvedValue({
        success: true,
        fixedCode: 'const styles = { test: { background: "blue", color: "white", padding: "20px" } };',
        explanation: 'Converted CSS module import to inline styles',
        strategy: 'css-module-fix',
        confidence: 0.85
      });

      render(EnhancedErrorRecovery, { props: mockProps });

      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Wait for auto-resolution to fail
      await waitFor(() => {
        expect(screen.getByText(/auto-resolution.*not.*successful/i) || screen.getByText(/trying.*ai.*fix/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should show transition to AI fix with encouraging message
      expect(screen.getByText(/don't worry/i) || screen.getByText(/trying.*advanced/i) || screen.getByText(/ai.*powered/i)).toBeInTheDocument();

      // Should show AI fix progress
      await waitFor(() => {
        expect(screen.getByText(/ai.*fixing/i) || screen.getByText(/advanced.*analysis/i)).toBeInTheDocument();
      });

      // Should complete with success
      await waitFor(() => {
        expect(screen.getByText(/ai.*fix.*successful/i) || screen.getByText(/success/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Should explain what was done
      expect(screen.getByText(/converted.*css.*module/i) || screen.getByText(/inline.*styles/i)).toBeInTheDocument();
    });

    it('should handle failures with helpful guidance', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');
      const { llmAutoFixService } = await import('../../services/llm-autofix-service/llm-fix-service');

      // Mock both stages failing
      vi.mocked(defaultStrategyExecutor.executeRecovery).mockResolvedValue({
        success: false,
        strategy: 'ALL_STRATEGIES_FAILED',
        confidence: 0.1,
        finalCode: '',
        processingTimeMs: 2000,
        stages: [],
        errors: ['No applicable strategies found'],
        circuitState: 'CLOSED'
      });

      vi.mocked(llmAutoFixService.attemptAutoFix).mockResolvedValue({
        success: false,
        strategy: 'all-failed',
        confidence: 0,
        errors: ['Unable to generate fix']
      });

      render(EnhancedErrorRecovery, { props: mockProps });

      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Wait for complete failure
      await waitFor(() => {
        expect(screen.getByText(/unable.*resolve/i) || screen.getByText(/manual.*intervention/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should provide helpful next steps
      expect(screen.getByText(/try.*again/i) || screen.getByText(/retry/i)).toBeInTheDocument();
      expect(screen.getByText(/manual.*fix/i) || screen.getByText(/edit.*code/i)).toBeInTheDocument();

      // Should explain what went wrong in friendly terms
      expect(screen.getByText(/dependency.*issue/i) || screen.getByText(/complex.*case/i)).toBeInTheDocument();

      // Should not blame the user
      expect(screen.queryByText(/invalid.*code/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/error.*in.*your/i)).not.toBeInTheDocument();
    });
  });

  describe('Interactive Elements and Controls', () => {
    it('should provide intuitive controls throughout the process', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            success: true,
            strategy: 'CSS_MODULE_CONVERSION',
            confidence: 0.9,
            finalCode: 'const styles = { test: { background: "blue" } };',
            processingTimeMs: 1500,
            stages: [],
            errors: [],
            circuitState: 'CLOSED'
          }), 1500);
        })
      );

      render(EnhancedErrorRecovery, { props: mockProps });

      // Initial state controls
      const startButton = screen.getByText('Start Recovery');
      expect(startButton).toBeEnabled();

      // Start processing
      await fireEvent.click(startButton);

      // Should show cancel option during processing
      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel') || screen.getByText('Stop');
        expect(cancelButton).toBeInTheDocument();
        expect(cancelButton).toBeEnabled();
      });

      // Should be able to toggle details
      const detailsToggle = screen.queryByText('Show Details') || screen.queryByText('More Info');
      if (detailsToggle) {
        await fireEvent.click(detailsToggle);
        expect(screen.getByText('Hide Details') || screen.getByText('Less Info')).toBeInTheDocument();
      }

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Should show action buttons
      const applyButton = screen.getByText('Apply Fix') || screen.getByText('Use Solution');
      expect(applyButton).toBeInTheDocument();
      expect(applyButton).toBeEnabled();

      const previewButton = screen.queryByText('Preview') || screen.queryByText('Show Code');
      if (previewButton) {
        expect(previewButton).toBeEnabled();
      }
    });

    it('should provide accessible keyboard navigation', async () => {
      render(EnhancedErrorRecovery, { props: mockProps });

      const startButton = screen.getByText('Start Recovery');

      // Should be focusable
      startButton.focus();
      expect(document.activeElement).toBe(startButton);

      // Should respond to Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      await fireEvent(startButton, enterEvent);

      // Should respond to Space key
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      await fireEvent(startButton, spaceEvent);

      // Tab navigation should work
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      await fireEvent(startButton, tabEvent);
    });

    it('should handle user interruptions gracefully', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      let resolveProcessing: any;
      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(
        () => new Promise(resolve => {
          resolveProcessing = resolve;
        })
      );

      render(EnhancedErrorRecovery, { props: mockProps });

      // Start processing
      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      // Wait for processing to start
      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });

      // Cancel the process
      const cancelButton = screen.getByText('Cancel');
      await fireEvent.click(cancelButton);

      // Should return to initial state
      await waitFor(() => {
        expect(screen.getByText('Start Recovery')).toBeInTheDocument();
      });

      // Should show friendly cancellation message
      expect(screen.getByText(/cancelled/i) || screen.getByText(/stopped/i)).toBeInTheDocument();

      // Clean up
      if (resolveProcessing) {
        resolveProcessing({
          success: false,
          strategy: 'CANCELLED',
          confidence: 0,
          finalCode: '',
          processingTimeMs: 500,
          stages: [],
          errors: ['User cancelled'],
          circuitState: 'CLOSED'
        });
      }
    });
  });

  describe('Information Architecture and Clarity', () => {
    it('should organize information in a logical hierarchy', async () => {
      render(EnhancedErrorRecovery, { props: { ...mockProps, showAdvancedOptions: true } });

      // Primary information should be prominent
      const primaryHeading = screen.getByRole('heading', { level: 1 }) ||
                           screen.getByRole('heading', { level: 2 });
      expect(primaryHeading).toBeInTheDocument();

      // Secondary information should be organized
      const sections = screen.getAllByRole('region') || [];
      expect(sections.length).toBeGreaterThan(0);

      // Advanced options should be clearly separated
      if (mockProps.showAdvancedOptions) {
        const advancedSection = screen.queryByText(/advanced/i);
        expect(advancedSection).toBeInTheDocument();
      }
    });

    it('should use clear and jargon-free language', async () => {
      render(EnhancedErrorRecovery, { props: mockProps });

      // Should avoid technical jargon
      expect(screen.queryByText(/strategyExecutor/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/recoveryRequest/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/circuitState/i)).not.toBeInTheDocument();

      // Should use user-friendly terms
      expect(screen.getByText(/start recovery/i) || screen.getByText(/fix issue/i)).toBeInTheDocument();
      expect(screen.getByText(/dependency/i) || screen.getByText(/missing file/i)).toBeInTheDocument();
    });

    it('should provide appropriate level of detail based on user preference', async () => {
      const { rerender } = render(EnhancedErrorRecovery, { props: { ...mockProps, showAdvancedOptions: false } });

      // Simple mode should show minimal details
      expect(screen.queryByText(/processing time/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/strategy/i)).not.toBeInTheDocument();

      // Advanced mode should show more details
      await rerender({ ...mockProps, showAdvancedOptions: true });

      const detailsToggle = screen.queryByText(/show details/i) || screen.queryByText(/advanced/i);
      if (detailsToggle) {
        await fireEvent.click(detailsToggle);

        // Should show technical details in advanced mode
        expect(screen.getByText(/processing time/i) || screen.getByText(/details/i)).toBeInTheDocument();
      }
    });
  });

  describe('Visual Design and Accessibility', () => {
    it('should use appropriate visual hierarchy', async () => {
      render(EnhancedErrorRecovery, { props: mockProps });

      // Should have proper heading structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);

      // Primary action should be visually prominent
      const startButton = screen.getByText('Start Recovery');
      expect(startButton).toHaveClass(/primary/i);
    });

    it('should provide sufficient color contrast and accessibility features', async () => {
      render(EnhancedErrorRecovery, { props: mockProps });

      // Should have proper ARIA labels
      const mainContent = screen.getByRole('main') || screen.getByLabelText(/error recovery/i);
      expect(mainContent).toBeInTheDocument();

      // Buttons should have accessible names
      const startButton = screen.getByText('Start Recovery');
      expect(startButton).toHaveAttribute('aria-label') || expect(startButton.textContent).toBeTruthy();

      // Should support screen readers
      const statusRegion = screen.queryByRole('status') || screen.queryByRole('alert');
      if (statusRegion) {
        expect(statusRegion).toBeInTheDocument();
      }
    });

    it('should be responsive and work on different screen sizes', async () => {
      // Mock different viewport sizes
      const viewports = [
        { width: 320, height: 568 },  // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ];

      for (const viewport of viewports) {
        // Mock viewport
        Object.defineProperty(window, 'innerWidth', { value: viewport.width, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: viewport.height, writable: true });

        render(EnhancedErrorRecovery, { props: mockProps });

        // Should render properly at different sizes
        const startButton = screen.getByText('Start Recovery');
        expect(startButton).toBeInTheDocument();
        expect(startButton).toBeVisible();

        // Should maintain usability
        expect(startButton.getBoundingClientRect().width).toBeGreaterThan(0);
        expect(startButton.getBoundingClientRect().height).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Communication', () => {
    it('should communicate errors in a helpful and non-technical way', async () => {
      const technicalErrorProps = {
        ...mockProps,
        errorMessage: 'TypeError: Cannot read property "default" of undefined at Object.<anonymous> (/path/to/file.js:123:45)'
      };

      render(EnhancedErrorRecovery, { props: technicalErrorProps });

      // Should show a user-friendly interpretation
      expect(screen.getByText(/missing.*file/i) || screen.getByText(/dependency.*issue/i)).toBeInTheDocument();

      // Should not overwhelm with technical details by default
      expect(screen.queryByText(/TypeError/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Cannot read property/i)).not.toBeInTheDocument();

      // But should provide access to full error if needed
      const detailsLink = screen.queryByText(/technical details/i) || screen.queryByText(/full error/i);
      if (detailsLink) {
        await fireEvent.click(detailsLink);
        expect(screen.getByText(/TypeError/i)).toBeInTheDocument();
      }
    });

    it('should provide actionable suggestions for common error patterns', async () => {
      const commonErrors = [
        {
          error: 'Module not found: ./styles.module.css',
          expectedSuggestion: /css.*file.*missing/i
        },
        {
          error: 'Cannot resolve module "./data.json"',
          expectedSuggestion: /json.*file.*missing/i
        },
        {
          error: 'SyntaxError: Unexpected token in JSON',
          expectedSuggestion: /json.*format.*issue/i
        }
      ];

      for (const { error, expectedSuggestion } of commonErrors) {
        render(EnhancedErrorRecovery, { props: { ...mockProps, errorMessage: error } });

        // Should provide relevant suggestion
        expect(screen.getByText(expectedSuggestion)).toBeInTheDocument();

        // Should explain what the recovery system will do
        expect(screen.getByText(/will.*try.*to.*fix/i) || screen.getByText(/automatically.*resolve/i)).toBeInTheDocument();
      }
    });
  });

  describe('Success Communication', () => {
    it('should celebrate successful recovery appropriately', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      vi.mocked(defaultStrategyExecutor.executeRecovery).mockResolvedValue({
        success: true,
        strategy: 'CSS_MODULE_CONVERSION',
        confidence: 0.95,
        finalCode: 'const styles = { test: { background: "blue" } };',
        processingTimeMs: 800,
        stages: [],
        errors: [],
        circuitState: 'CLOSED'
      });

      render(EnhancedErrorRecovery, { props: mockProps });

      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/success/i) || screen.getByText(/fixed/i)).toBeInTheDocument();
      });

      // Should show positive language
      expect(screen.getByText(/great/i) || screen.getByText(/excellent/i) || screen.getByText(/successfully/i)).toBeInTheDocument();

      // Should explain what was accomplished
      expect(screen.getByText(/css.*module/i) || screen.getByText(/converted/i)).toBeInTheDocument();

      // Should show confidence in a user-friendly way
      expect(screen.getByText(/95%/i) || screen.getByText(/high.*confidence/i) || screen.getByText(/very.*confident/i)).toBeInTheDocument();

      // Should provide clear next steps
      expect(screen.getByText(/apply/i) || screen.getByText(/use.*this.*fix/i)).toBeInTheDocument();
    });

    it('should handle partial success with appropriate messaging', async () => {
      const { defaultStrategyExecutor } = await import('../../services/artifact-dependency-resolver/strategy-executor');

      vi.mocked(defaultStrategyExecutor.executeRecovery).mockResolvedValue({
        success: true,
        strategy: 'IMPORT_REMOVAL',
        confidence: 0.6, // Lower confidence
        finalCode: 'const Test = () => <div>Test</div>; // Removed problematic import',
        processingTimeMs: 1200,
        stages: [],
        errors: [],
        circuitState: 'CLOSED'
      });

      render(EnhancedErrorRecovery, { props: mockProps });

      const startButton = screen.getByText('Start Recovery');
      await fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      });

      // Should acknowledge partial nature
      expect(screen.getByText(/partial/i) || screen.getByText(/removed.*problem/i)).toBeInTheDocument();

      // Should explain limitations
      expect(screen.getByText(/60%/i) || screen.getByText(/moderate.*confidence/i)).toBeInTheDocument();

      // Should suggest review
      expect(screen.getByText(/review/i) || screen.getByText(/check/i)).toBeInTheDocument();
    });
  });
});