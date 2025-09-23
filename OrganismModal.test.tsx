import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrganismModal from './OrganismModal';

// Mock functions for testing
const mockOnClose = jest.fn();
const mockOnConfirm = jest.fn();
const mockOnCancel = jest.fn();

// Mock props
const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  title: 'Test Modal',
  children: <div data-testid="modal-content">Test Content</div>,
  onConfirm: mockOnConfirm,
  onCancel: mockOnCancel,
  confirmText: 'Confirm',
  cancelText: 'Cancel',
};

describe('OrganismModal', () => {
  // Clean up after each test
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders properly when isOpen is true', () => {
      render(<OrganismModal {...defaultProps} />);
      
      // Check if modal is visible
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeVisible();
    });

    it('does not render when isOpen is false', () => {
      render(<OrganismModal {...defaultProps} isOpen={false} />);
      
      // Modal should not be in the document
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays the correct modal title', () => {
      render(<OrganismModal {...defaultProps} />);
      
      // Check if title is displayed
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeVisible();
    });

    it('displays the correct children elements', () => {
      render(<OrganismModal {...defaultProps} />);
      
      // Check if children content is displayed
      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders the expected footer buttons with default text', () => {
      render(<OrganismModal {...defaultProps} />);
      
      // Check if buttons are rendered with correct text
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });

    it('renders footer buttons with custom text', () => {
      render(
        <OrganismModal
          {...defaultProps}
          confirmText="Save Changes"
          cancelText="Discard"
        />
      );
      
      // Check if buttons are rendered with custom text
      expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
    });

    it('renders modal with custom className when provided', () => {
      render(<OrganismModal {...defaultProps} className="custom-modal-class" />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('custom-modal-class');
    });
  });

  describe('Interactions', () => {
    it('calls onClose when close button is clicked', () => {
      render(<OrganismModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when escape key is pressed', () => {
      render(<OrganismModal {...defaultProps} />);
      
      fireEvent.keyDown(screen.getByRole('dialog'), {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        charCode: 27,
      });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking on backdrop/overlay', () => {
      render(<OrganismModal {...defaultProps} />);
      
      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.click(backdrop);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking inside modal content', () => {
      render(<OrganismModal {...defaultProps} />);
      
      const modalContent = screen.getByTestId('modal-content');
      fireEvent.click(modalContent);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('calls onCancel when Cancel button is clicked', () => {
      render(<OrganismModal {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm when Confirm button is clicked', () => {
      render(<OrganismModal {...defaultProps} />);
      
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      fireEvent.click(confirmButton);
      
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<OrganismModal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('role', 'dialog');
    });

    it('has proper aria-labelledby when title is provided', () => {
      render(<OrganismModal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      const title = screen.getByText('Test Modal');
      
      expect(title).toHaveAttribute('id');
      expect(modal).toHaveAttribute('aria-labelledby', title.id);
    });

    it('focuses the modal when opened', () => {
      const { rerender } = render(<OrganismModal {...defaultProps} isOpen={false} />);
      
      // Open the modal
      rerender(<OrganismModal {...defaultProps} isOpen={true} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveFocus();
    });

    it('traps focus within the modal', () => {
      render(<OrganismModal {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      const closeButton = screen.getByRole('button', { name: /close/i });
      
      // Focus should cycle through interactive elements
      cancelButton.focus();
      fireEvent.keyDown(cancelButton, { key: 'Tab', code: 'Tab', shiftKey: false });
      expect(confirmButton).toHaveFocus();
      
      fireEvent.keyDown(confirmButton, { key: 'Tab', code: 'Tab', shiftKey: false });
      expect(closeButton).toHaveFocus();
      
      // Should wrap back to first element
      fireEvent.keyDown(closeButton, { key: 'Tab', code: 'Tab', shiftKey: false });
      expect(cancelButton).toHaveFocus();
    });
  });

  describe('Props and Edge Cases', () => {
    it('handles missing onClose gracefully', () => {
      const propsWithoutOnClose = { ...defaultProps };
      delete propsWithoutOnClose.onClose;
      
      expect(() => {
        render(<OrganismModal {...propsWithoutOnClose} />);
      }).not.toThrow();
    });

    it('handles missing footer button handlers gracefully', () => {
      const propsWithoutHandlers = { ...defaultProps };
      delete propsWithoutHandlers.onConfirm;
      delete propsWithoutHandlers.onCancel;
      
      expect(() => {
        render(<OrganismModal {...propsWithoutHandlers} />);
      }).not.toThrow();
    });

    it('renders without footer when no footer props are provided', () => {
      const propsWithoutFooter = {
        isOpen: true,
        onClose: mockOnClose,
        title: 'Test Modal',
        children: <div>Test Content</div>,
      };
      
      render(<OrganismModal {...propsWithoutFooter} />);
      
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
    });

    it('handles empty title', () => {
      render(<OrganismModal {...defaultProps} title="" />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });

    it('handles null/undefined children', () => {
      expect(() => {
        render(<OrganismModal {...defaultProps} children={null} />);
      }).not.toThrow();
      
      expect(() => {
        render(<OrganismModal {...defaultProps} children={undefined} />);
      }).not.toThrow();
    });
  });

  describe('Loading and Disabled States', () => {
    it('disables buttons when loading prop is true', () => {
      render(<OrganismModal {...defaultProps} loading={true} />);
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      
      expect(cancelButton).toBeDisabled();
      expect(confirmButton).toBeDisabled();
    });

    it('shows loading indicator when loading', () => {
      render(<OrganismModal {...defaultProps} loading={true} />);
      
      expect(screen.getByTestId('modal-loading-indicator')).toBeInTheDocument();
    });

    it('disables confirm button when confirmDisabled is true', () => {
      render(<OrganismModal {...defaultProps} confirmDisabled={true} />);
      
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toBeDisabled();
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).not.toBeDisabled();
    });
  });

  describe('Size and Styling Variants', () => {
    it('applies correct size classes', () => {
      const sizes = ['sm', 'md', 'lg', 'xl'];
      
      sizes.forEach(size => {
        const { unmount } = render(<OrganismModal {...defaultProps} size={size} />);
        
        const modal = screen.getByRole('dialog');
        expect(modal).toHaveClass(`modal-${size}`);
        
        unmount();
      });
    });

    it('applies default size when size prop is not provided', () => {
      render(<OrganismModal {...defaultProps} />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('modal-md'); // Assuming 'md' is default
    });
  });
});
