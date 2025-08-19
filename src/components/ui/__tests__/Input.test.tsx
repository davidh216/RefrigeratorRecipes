import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render input with default props', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should render input with custom type', () => {
      render(<Input type="email" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should render input with placeholder', () => {
      render(<Input placeholder="Enter your name" />);
      
      const input = screen.getByPlaceholderText('Enter your name');
      expect(input).toBeInTheDocument();
    });

    it('should render input with value', () => {
      render(<Input value="test value" onChange={() => {}} />);
      
      const input = screen.getByDisplayValue('test value');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Label and Helper Text', () => {
    it('should render input with label', () => {
      render(<Input label="Email Address" />);
      
      const label = screen.getByText('Email Address');
      const input = screen.getByRole('textbox');
      
      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute('for', input.id);
    });

    it('should render input with helper text', () => {
      render(<Input helperText="We'll never share your email" />);
      
      const helperText = screen.getByText("We'll never share your email");
      expect(helperText).toBeInTheDocument();
      expect(helperText).toHaveClass('text-muted-foreground');
    });

    it('should not render helper text when error is present', () => {
      render(<Input helperText="Helper text" error="Error message" />);
      
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should render both label and helper text', () => {
      render(
        <Input 
          label="Email" 
          helperText="Enter your email address" 
        />
      );
      
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should render input with error message', () => {
      render(<Input error="This field is required" />);
      
      const errorMessage = screen.getByText('This field is required');
      const input = screen.getByRole('textbox');
      
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass('text-destructive');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should apply error styling to input', () => {
      render(<Input error="Error message" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-destructive');
    });

    it('should associate error message with input via aria-describedby', () => {
      render(<Input error="Error message" />);
      
      const input = screen.getByRole('textbox');
      const errorMessage = screen.getByText('Error message');
      
      expect(input).toHaveAttribute('aria-describedby', errorMessage.id);
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(<Input variant="default" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should render filled variant', () => {
      render(<Input variant="filled" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('bg-muted', 'border-transparent');
    });

    it('should render outline variant', () => {
      render(<Input variant="outline" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-2');
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      render(<Input inputSize="sm" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('h-8', 'px-3', 'py-1', 'text-sm');
    });

    it('should render medium size (default)', () => {
      render(<Input inputSize="md" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('h-10', 'px-3', 'py-2');
    });

    it('should render large size', () => {
      render(<Input inputSize="lg" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('h-12', 'px-4', 'py-3', 'text-base');
    });
  });

  describe('Icons', () => {
    const TestIcon = () => <span data-testid="test-icon">🔍</span>;

    it('should render input with left icon', () => {
      render(<Input leftIcon={<TestIcon />} />);
      
      const icon = screen.getByTestId('test-icon');
      const input = screen.getByRole('textbox');
      
      expect(icon).toBeInTheDocument();
      expect(input).toHaveClass('pl-10');
    });

    it('should render input with right icon', () => {
      render(<Input rightIcon={<TestIcon />} />);
      
      const icon = screen.getByTestId('test-icon');
      const input = screen.getByRole('textbox');
      
      expect(icon).toBeInTheDocument();
      expect(input).toHaveClass('pr-10');
    });

    it('should render input with both left and right icons', () => {
      render(
        <Input 
          leftIcon={<TestIcon />} 
          rightIcon={<TestIcon />} 
        />
      );
      
      const icons = screen.getAllByTestId('test-icon');
      const input = screen.getByRole('textbox');
      
      expect(icons).toHaveLength(2);
      expect(input).toHaveClass('pl-10', 'pr-10');
    });

    it('should position icons correctly', () => {
      render(<Input leftIcon={<TestIcon />} />);
      
      const iconContainer = screen.getByTestId('test-icon').closest('div');
      expect(iconContainer).toHaveClass('absolute', 'left-3', 'top-1/2');
    });
  });

  describe('Disabled State', () => {
    it('should render disabled input', () => {
      render(<Input disabled />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });

    it('should disable label when input is disabled', () => {
      render(<Input label="Email" disabled />);
      
      const label = screen.getByText('Email');
      expect(label).toHaveClass('peer-disabled:cursor-not-allowed', 'peer-disabled:opacity-70');
    });
  });

  describe('User Interactions', () => {
    it('should handle onChange event', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<Input onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('should handle onFocus event', async () => {
      const handleFocus = jest.fn();
      const user = userEvent.setup();
      
      render(<Input onFocus={handleFocus} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      
      expect(handleFocus).toHaveBeenCalled();
    });

    it('should handle onBlur event', async () => {
      const handleBlur = jest.fn();
      const user = userEvent.setup();
      
      render(<Input onBlur={handleBlur} />);
      
      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();
      
      expect(handleBlur).toHaveBeenCalled();
    });

    it('should handle keyboard events', async () => {
      const handleKeyDown = jest.fn();
      const user = userEvent.setup();
      
      render(<Input onKeyDown={handleKeyDown} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'a');
      
      expect(handleKeyDown).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Input label="Email" error="Invalid email" />);
      
      const input = screen.getByRole('textbox');
      const errorMessage = screen.getByText('Invalid email');
      
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', errorMessage.id);
    });

    it('should have proper ARIA attributes with helper text', () => {
      render(<Input label="Email" helperText="Enter your email" />);
      
      const input = screen.getByRole('textbox');
      const helperText = screen.getByText('Enter your email');
      
      expect(input).toHaveAttribute('aria-describedby', helperText.id);
    });

    it('should have proper label association', () => {
      render(<Input label="Email Address" />);
      
      const label = screen.getByText('Email Address');
      const input = screen.getByRole('textbox');
      
      expect(label).toHaveAttribute('for', input.id);
    });

    it('should generate unique IDs when not provided', () => {
      const { container } = render(
        <div>
          <Input label="First" />
          <Input label="Second" />
        </div>
      );
      
      const inputs = container.querySelectorAll('input');
      expect(inputs[0].id).not.toBe(inputs[1].id);
    });

    it('should use provided ID when available', () => {
      render(<Input id="custom-id" label="Email" />);
      
      const input = screen.getByRole('textbox');
      const label = screen.getByText('Email');
      
      expect(input).toHaveAttribute('id', 'custom-id');
      expect(label).toHaveAttribute('for', 'custom-id');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = jest.fn();
      render(<Input ref={ref} />);
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty label', () => {
      render(<Input label="" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should handle empty error message', () => {
      render(<Input error="" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should handle empty helper text', () => {
      render(<Input helperText="" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should handle null/undefined props gracefully', () => {
      render(<Input label={null} error={undefined} helperText={null} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should handle all HTML input attributes', () => {
      render(
        <Input 
          required
          minLength={3}
          maxLength={10}
          pattern="[A-Za-z]+"
          autoComplete="email"
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('minLength', '3');
      expect(input).toHaveAttribute('maxLength', '10');
      expect(input).toHaveAttribute('pattern', '[A-Za-z]+');
      expect(input).toHaveAttribute('autoComplete', 'email');
    });
  });

  describe('Styling and Classes', () => {
    it('should apply custom className', () => {
      render(<Input className="custom-class" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });

    it('should have proper base classes', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(
        'flex',
        'w-full',
        'rounded-md',
        'border',
        'border-input',
        'bg-background',
        'text-sm'
      );
    });

    it('should have proper focus styles', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-ring',
        'focus-visible:ring-offset-2'
      );
    });
  });
});
