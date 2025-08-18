import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../Button'

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render button with default props', () => {
      render(<Button>Click me</Button>)
      
      const button = screen.getByRole('button', { name: 'Click me' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground')
      expect(button).toHaveClass('h-10', 'px-4', 'py-2')
    })

    it('should render button with custom variant', () => {
      render(<Button variant="destructive">Delete</Button>)
      
      const button = screen.getByRole('button', { name: 'Delete' })
      expect(button).toHaveClass('bg-destructive', 'text-destructive-foreground')
    })

    it('should render button with custom size', () => {
      render(<Button size="lg">Large Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Large Button' })
      expect(button).toHaveClass('h-11', 'px-8')
    })

    it('should render button with custom className', () => {
      render(<Button className="custom-class">Custom Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Custom Button' })
      expect(button).toHaveClass('custom-class')
    })

    it('should render disabled button', () => {
      render(<Button disabled>Disabled Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Disabled Button' })
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
    })

    it('should render loading button', () => {
      render(<Button loading>Loading Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Loading Button' })
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
      
      // Check for loading spinner
      const spinner = button.querySelector('svg.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should render button with left icon', () => {
      const leftIcon = <span data-testid="left-icon">←</span>
      render(<Button leftIcon={leftIcon}>Button with Left Icon</Button>)
      
      const button = screen.getByRole('button', { name: '← Button with Left Icon' })
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    })

    it('should render button with right icon', () => {
      const rightIcon = <span data-testid="right-icon">→</span>
      render(<Button rightIcon={rightIcon}>Button with Right Icon</Button>)
      
      const button = screen.getByRole('button', { name: 'Button with Right Icon →' })
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })

    it('should not render icons when loading', () => {
      const leftIcon = <span data-testid="left-icon">←</span>
      const rightIcon = <span data-testid="right-icon">→</span>
      render(
        <Button loading leftIcon={leftIcon} rightIcon={rightIcon}>
          Loading Button
        </Button>
      )
      
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument()
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument()
    })
  })

  describe('Variants', () => {
    it.each([
      ['default', 'bg-primary text-primary-foreground'],
      ['primary', 'bg-primary text-primary-foreground'],
      ['secondary', 'bg-secondary text-secondary-foreground'],
      ['outline', 'border border-input bg-background'],
      ['ghost', 'hover:bg-accent hover:text-accent-foreground'],
      ['destructive', 'bg-destructive text-destructive-foreground'],
    ])('should render %s variant correctly', (variant, expectedClasses) => {
      render(<Button variant={variant as any}>Test Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Test Button' })
      expectedClasses.split(' ').forEach(className => {
        expect(button).toHaveClass(className)
      })
    })
  })

  describe('Sizes', () => {
    it.each([
      ['xs', 'h-7 px-2 text-xs'],
      ['sm', 'h-8 px-3 text-sm'],
      ['md', 'h-10 px-4 py-2'],
      ['lg', 'h-11 px-8'],
      ['xl', 'h-12 px-10 text-base'],
    ])('should render %s size correctly', (size, expectedClasses) => {
      render(<Button size={size as any}>Test Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Test Button' })
      expectedClasses.split(' ').forEach(className => {
        expect(button).toHaveClass(className)
      })
    })
  })

  describe('Interactions', () => {
    it('should handle click events', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Clickable Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Clickable Button' })
      fireEvent.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not handle click events when disabled', () => {
      const handleClick = jest.fn()
      render(<Button disabled onClick={handleClick}>Disabled Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Disabled Button' })
      fireEvent.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should not handle click events when loading', () => {
      const handleClick = jest.fn()
      render(<Button loading onClick={handleClick}>Loading Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Loading Button' })
      fireEvent.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should handle keyboard events', () => {
      const handleKeyDown = jest.fn()
      render(<Button onKeyDown={handleKeyDown}>Keyboard Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Keyboard Button' })
      fireEvent.keyDown(button, { key: 'Enter' })
      
      expect(handleKeyDown).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes when disabled', () => {
      render(<Button disabled>Disabled Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Disabled Button' })
      expect(button).toHaveAttribute('disabled')
    })

    it('should have proper ARIA attributes when loading', () => {
      render(<Button loading>Loading Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Loading Button' })
      expect(button).toHaveAttribute('disabled')
    })

    it('should pass through other HTML button attributes', () => {
      render(
        <Button 
          type="submit" 
          form="test-form" 
          name="test-button"
          value="test-value"
        >
          Submit Button
        </Button>
      )
      
      const button = screen.getByRole('button', { name: 'Submit Button' })
      expect(button).toHaveAttribute('type', 'submit')
      expect(button).toHaveAttribute('form', 'test-form')
      expect(button).toHaveAttribute('name', 'test-button')
      expect(button).toHaveAttribute('value', 'test-value')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Button />)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('')
    })

    it('should handle null children', () => {
      render(<Button>{null}</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('')
    })

    it('should handle undefined children', () => {
      render(<Button>{undefined}</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('')
    })

    it('should handle complex children', () => {
      render(
        <Button>
          <span>Text</span>
          <strong>Bold</strong>
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('TextBold')
    })
  })
})
