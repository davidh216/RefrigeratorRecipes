import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  Modal, 
  ModalHeader, 
  ModalTitle, 
  ModalDescription, 
  ModalBody, 
  ModalFooter 
} from '../Modal';

// Mock createPortal to render in the same container for testing
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

describe('Modal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset body overflow
    document.body.style.overflow = '';
  });

  afterEach(() => {
    // Clean up body overflow
    document.body.style.overflow = '';
  });

  describe('Basic Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );

      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );

      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('should render with default props', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should render with custom className', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} className="custom-modal">
          <div>Modal content</div>
        </Modal>
      );

      const modalContent = screen.getByText('Modal content').closest('div');
      expect(modalContent?.parentElement).toHaveClass('custom-modal');
    });
  });

  describe('Size Variants', () => {
    it('should render with small size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="sm">
          <div>Modal content</div>
        </Modal>
      );

      const modalContent = screen.getByText('Modal content').closest('div');
      expect(modalContent?.parentElement).toHaveClass('max-w-md');
    });

    it('should render with medium size (default)', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="md">
          <div>Modal content</div>
        </Modal>
      );

      const modalContent = screen.getByText('Modal content').closest('div');
      expect(modalContent?.parentElement).toHaveClass('max-w-lg');
    });

    it('should render with large size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="lg">
          <div>Modal content</div>
        </Modal>
      );

      const modalContent = screen.getByText('Modal content').closest('div');
      expect(modalContent?.parentElement).toHaveClass('max-w-2xl');
    });

    it('should render with extra large size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="xl">
          <div>Modal content</div>
        </Modal>
      );

      const modalContent = screen.getByText('Modal content').closest('div');
      expect(modalContent?.parentElement).toHaveClass('max-w-4xl');
    });

    it('should render with full size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="full">
          <div>Modal content</div>
        </Modal>
      );

      const modalContent = screen.getByText('Modal content').closest('div');
      expect(modalContent?.parentElement).toHaveClass('max-w-full', 'mx-4');
    });
  });

  describe('Close Button', () => {
    it('should show close button by default', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should not show close button when showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} showCloseButton={false}>
          <div>Modal content</div>
        </Modal>
      );

      expect(screen.queryByRole('button', { name: /close modal/i })).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Overlay Click', () => {
    it('should close modal when overlay is clicked by default', async () => {
      const user = userEvent.setup();
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );

      const overlay = screen.getByRole('dialog').querySelector('.absolute.inset-0');
      await user.click(overlay!);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close modal when closeOnOverlayClick is false', async () => {
      const user = userEvent.setup();
      render(
        <Modal isOpen={true} onClose={mockOnClose} closeOnOverlayClick={false}>
          <div>Modal content</div>
        </Modal>
      );

      const overlay = screen.getByRole('dialog').querySelector('.absolute.inset-0');
      await user.click(overlay!);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not close modal when clicking on modal content', async () => {
      const user = userEvent.setup();
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );

      const modalContent = screen.getByText('Modal content');
      await user.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Escape Key', () => {
    it('should close modal when escape key is pressed by default', async () => {
      const user = userEvent.setup();
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close modal when closeOnEscape is false', async () => {
      const user = userEvent.setup();
      render(
        <Modal isOpen={true} onClose={mockOnClose} closeOnEscape={false}>
          <div>Modal content</div>
        </Modal>
      );

      await user.keyboard('{Escape}');

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not close modal when escape is pressed and modal is closed', async () => {
      const user = userEvent.setup();
      render(
        <Modal isOpen={false} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );

      await user.keyboard('{Escape}');

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Lock', () => {
    it('should lock body scroll when modal is open', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when modal is closed', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <Modal isOpen={false} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Focus Management', () => {
    it('should focus first focusable element when modal opens', async () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <button>First button</button>
          <button>Second button</button>
        </Modal>
      );

      await waitFor(() => {
        expect(screen.getByText('First button')).toHaveFocus();
      });
    });

    it('should handle tab key navigation', async () => {
      const user = userEvent.setup();
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <button>First button</button>
          <button>Second button</button>
        </Modal>
      );

      await waitFor(() => {
        expect(screen.getByText('First button')).toHaveFocus();
      });

      await user.tab();
      expect(screen.getByText('Second button')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('First button')).toHaveFocus();
    });

    it('should handle shift+tab key navigation', async () => {
      const user = userEvent.setup();
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <button>First button</button>
          <button>Second button</button>
        </Modal>
      );

      await waitFor(() => {
        expect(screen.getByText('First button')).toHaveFocus();
      });

      await user.tab({ shift: true });
      expect(screen.getByText('Second button')).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should have proper close button accessibility', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal');
    });
  });

  describe('Edge Cases', () => {
    it('should handle SSR mounting', () => {
      // Simulate SSR environment where document is not available
      const originalDocument = global.document;
      delete (global as any).document;

      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      );

      // Restore document
      global.document = originalDocument;
    });

    it('should handle null children', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          {null}
        </Modal>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          {undefined}
        </Modal>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });
  });
});

describe('ModalHeader', () => {
  describe('Basic Rendering', () => {
    it('should render modal header with default props', () => {
      render(<ModalHeader>Header content</ModalHeader>);
      
      const header = screen.getByText('Header content').closest('div');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6', 'border-b', 'border-border');
    });

    it('should render modal header with custom className', () => {
      render(<ModalHeader className="custom-header">Header content</ModalHeader>);
      
      const header = screen.getByText('Header content').closest('div');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to header element', () => {
      const ref = jest.fn();
      render(<ModalHeader ref={ref}>Header content</ModalHeader>);
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    });
  });
});

describe('ModalTitle', () => {
  describe('Basic Rendering', () => {
    it('should render modal title with default props', () => {
      render(<ModalTitle>Modal Title</ModalTitle>);
      
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Modal Title');
      expect(title).toHaveClass('text-lg', 'font-semibold', 'leading-none', 'tracking-tight');
      expect(title).toHaveAttribute('id', 'modal-title');
    });

    it('should render modal title with custom className', () => {
      render(<ModalTitle className="custom-title">Modal Title</ModalTitle>);
      
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading semantics', () => {
      render(<ModalTitle>Modal Title</ModalTitle>);
      
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toBeInTheDocument();
    });

    it('should pass through HTML attributes', () => {
      render(<ModalTitle id="title" aria-label="Test title">Modal Title</ModalTitle>);
      
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toHaveAttribute('id', 'title');
      expect(title).toHaveAttribute('aria-label', 'Test title');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to title element', () => {
      const ref = jest.fn();
      render(<ModalTitle ref={ref}>Modal Title</ModalTitle>);
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLHeadingElement));
    });
  });
});

describe('ModalDescription', () => {
  describe('Basic Rendering', () => {
    it('should render modal description with default props', () => {
      render(<ModalDescription>Modal description</ModalDescription>);
      
      const description = screen.getByText('Modal description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('should render modal description with custom className', () => {
      render(<ModalDescription className="custom-description">Modal description</ModalDescription>);
      
      const description = screen.getByText('Modal description');
      expect(description).toHaveClass('custom-description');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to description element', () => {
      const ref = jest.fn();
      render(<ModalDescription ref={ref}>Modal description</ModalDescription>);
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLParagraphElement));
    });
  });
});

describe('ModalBody', () => {
  describe('Basic Rendering', () => {
    it('should render modal body with default props', () => {
      render(<ModalBody>Body content</ModalBody>);
      
      const body = screen.getByText('Body content').closest('div');
      expect(body).toBeInTheDocument();
      expect(body).toHaveClass('flex-1', 'overflow-auto', 'p-6');
    });

    it('should render modal body with custom className', () => {
      render(<ModalBody className="custom-body">Body content</ModalBody>);
      
      const body = screen.getByText('Body content').closest('div');
      expect(body).toHaveClass('custom-body');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to body element', () => {
      const ref = jest.fn();
      render(<ModalBody ref={ref}>Body content</ModalBody>);
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    });
  });
});

describe('ModalFooter', () => {
  describe('Basic Rendering', () => {
    it('should render modal footer with default props', () => {
      render(<ModalFooter>Footer content</ModalFooter>);
      
      const footer = screen.getByText('Footer content').closest('div');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('flex', 'items-center', 'justify-end', 'space-x-2', 'p-6', 'border-t', 'border-border');
    });

    it('should render modal footer with custom className', () => {
      render(<ModalFooter className="custom-footer">Footer content</ModalFooter>);
      
      const footer = screen.getByText('Footer content').closest('div');
      expect(footer).toHaveClass('custom-footer');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to footer element', () => {
      const ref = jest.fn();
      render(<ModalFooter ref={ref}>Footer content</ModalFooter>);
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    });
  });
});

describe('Modal Component Integration', () => {
  it('should render complete modal structure', () => {
    const mockOnClose = jest.fn();
    
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <ModalHeader>
          <ModalTitle>Recipe Details</ModalTitle>
          <ModalDescription>View and edit recipe information</ModalDescription>
        </ModalHeader>
        <ModalBody>
          <p>Recipe content goes here...</p>
        </ModalBody>
        <ModalFooter>
          <button>Cancel</button>
          <button>Save</button>
        </ModalFooter>
      </Modal>
    );

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Recipe Details');
    expect(screen.getByText('View and edit recipe information')).toBeInTheDocument();
    expect(screen.getByText('Recipe content goes here...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('should handle complex modal interactions', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    
    render(
      <Modal isOpen={true} onClose={mockOnClose} closeOnOverlayClick={true} closeOnEscape={true}>
        <ModalHeader>
          <ModalTitle>Complex Modal</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <input type="text" placeholder="Enter text" />
          <textarea placeholder="Enter description" />
        </ModalBody>
        <ModalFooter>
          <button>Cancel</button>
          <button>Submit</button>
        </ModalFooter>
      </Modal>
    );

    // Test focus management
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter text')).toHaveFocus();
    });

    // Test tab navigation
    await user.tab();
    expect(screen.getByPlaceholderText('Enter description')).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveFocus();

    // Test escape key
    await user.keyboard('{Escape}');
    expect(mockOnClose).toHaveBeenCalled();
  });
});