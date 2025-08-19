import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '../Card';

describe('Card', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render card with default props', () => {
      render(<Card>Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'text-card-foreground', 'shadow-sm');
    });

    it('should render card with custom className', () => {
      render(<Card className="custom-class">Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      expect(card).toHaveClass('custom-class');
    });

    it('should render card with children content', () => {
      render(
        <Card>
          <div>Child content</div>
          <span>More content</span>
        </Card>
      );
      
      expect(screen.getByText('Child content')).toBeInTheDocument();
      expect(screen.getByText('More content')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(<Card variant="default">Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      expect(card).toHaveClass('border-border');
    });

    it('should render outlined variant', () => {
      render(<Card variant="outlined">Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      expect(card).toHaveClass('border-2', 'border-border');
    });

    it('should render elevated variant', () => {
      render(<Card variant="elevated">Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      expect(card).toHaveClass('border-border', 'shadow-lg');
    });

    it('should render ghost variant', () => {
      render(<Card variant="ghost">Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      expect(card).toHaveClass('border-transparent', 'shadow-none');
    });
  });

  describe('Padding Options', () => {
    it('should render with no padding', () => {
      render(<Card padding="none">Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      expect(card).not.toHaveClass('p-3', 'p-6', 'p-8', 'p-10');
    });

    it('should render with small padding', () => {
      render(<Card padding="sm">Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      expect(card).toHaveClass('p-3');
    });

    it('should render with medium padding (default)', () => {
      render(<Card padding="md">Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      expect(card).toHaveClass('p-6');
    });

    it('should render with large padding', () => {
      render(<Card padding="lg">Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      expect(card).toHaveClass('p-8');
    });

    it('should render with extra large padding', () => {
      render(<Card padding="xl">Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      expect(card).toHaveClass('p-10');
    });
  });

  describe('Hover State', () => {
    it('should not have hover classes by default', () => {
      render(<Card>Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      expect(card).not.toHaveClass('hover:shadow-md', 'hover:shadow-primary/5', 'hover:border-primary/20', 'cursor-pointer');
    });

    it('should have hover classes when hover prop is true', () => {
      render(<Card hover>Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      expect(card).toHaveClass('hover:shadow-md', 'hover:shadow-primary/5', 'hover:border-primary/20', 'cursor-pointer');
    });

    it('should handle hover interaction', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(<Card hover onClick={handleClick}>Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      await user.click(card!);
      
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to card element', () => {
      const ref = jest.fn();
      render(<Card ref={ref}>Card content</Card>);
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<Card>Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      expect(card).toBeInTheDocument();
    });

    it('should pass through HTML attributes', () => {
      render(<Card data-testid="card" aria-label="Test card">Card content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('aria-label', 'Test card');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Card>{null}</Card>);
      
      const card = document.querySelector('.rounded-lg.border.bg-card');
      expect(card).toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(<Card>{undefined}</Card>);
      
      const card = document.querySelector('.rounded-lg.border.bg-card');
      expect(card).toBeInTheDocument();
    });

    it('should handle null/undefined props gracefully', () => {
      render(<Card variant={null} padding={undefined} hover={null}>Card content</Card>);
      
      const card = screen.getByText('Card content').closest('div');
      expect(card).toBeInTheDocument();
    });
  });
});

describe('CardHeader', () => {
  describe('Basic Rendering', () => {
    it('should render card header with default props', () => {
      render(<CardHeader>Header content</CardHeader>);
      
      const header = screen.getByText('Header content').closest('div');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5');
    });

    it('should render card header with custom className', () => {
      render(<CardHeader className="custom-header">Header content</CardHeader>);
      
      const header = screen.getByText('Header content').closest('div');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('Padding Options', () => {
    it('should render with no padding', () => {
      render(<CardHeader padding="none">Header content</CardHeader>);
      
      const header = screen.getByText('Header content').closest('div');
      expect(header).not.toHaveClass('p-3', 'p-6', 'p-8');
    });

    it('should render with small padding', () => {
      render(<CardHeader padding="sm">Header content</CardHeader>);
      
      const header = screen.getByText('Header content').closest('div');
      expect(header).toHaveClass('p-3');
    });

    it('should render with medium padding', () => {
      render(<CardHeader padding="md">Header content</CardHeader>);
      
      const header = screen.getByText('Header content').closest('div');
      expect(header).toHaveClass('p-6');
    });

    it('should render with large padding', () => {
      render(<CardHeader padding="lg">Header content</CardHeader>);
      
      const header = screen.getByText('Header content').closest('div');
      expect(header).toHaveClass('p-8');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to header element', () => {
      const ref = jest.fn();
      render(<CardHeader ref={ref}>Header content</CardHeader>);
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    });
  });
});

describe('CardTitle', () => {
  describe('Basic Rendering', () => {
    it('should render card title with default props', () => {
      render(<CardTitle>Card Title</CardTitle>);
      
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Card Title');
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    it('should render card title with custom className', () => {
      render(<CardTitle className="custom-title">Card Title</CardTitle>);
      
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading semantics', () => {
      render(<CardTitle>Card Title</CardTitle>);
      
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toBeInTheDocument();
    });

    it('should pass through HTML attributes', () => {
      render(<CardTitle id="title" aria-label="Test title">Card Title</CardTitle>);
      
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveAttribute('id', 'title');
      expect(title).toHaveAttribute('aria-label', 'Test title');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to title element', () => {
      const ref = jest.fn();
      render(<CardTitle ref={ref}>Card Title</CardTitle>);
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLHeadingElement));
    });
  });
});

describe('CardDescription', () => {
  describe('Basic Rendering', () => {
    it('should render card description with default props', () => {
      render(<CardDescription>Card description</CardDescription>);
      
      const description = screen.getByText('Card description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('should render card description with custom className', () => {
      render(<CardDescription className="custom-description">Card description</CardDescription>);
      
      const description = screen.getByText('Card description');
      expect(description).toHaveClass('custom-description');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to description element', () => {
      const ref = jest.fn();
      render(<CardDescription ref={ref}>Card description</CardDescription>);
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLParagraphElement));
    });
  });
});

describe('CardContent', () => {
  describe('Basic Rendering', () => {
    it('should render card content with default props', () => {
      render(<CardContent>Content</CardContent>);
      
      const content = screen.getByText('Content').closest('div');
      expect(content).toBeInTheDocument();
    });

    it('should render card content with custom className', () => {
      render(<CardContent className="custom-content">Content</CardContent>);
      
      const content = screen.getByText('Content').closest('div');
      expect(content).toHaveClass('custom-content');
    });
  });

  describe('Padding Options', () => {
    it('should render with no padding', () => {
      render(<CardContent padding="none">Content</CardContent>);
      
      const content = screen.getByText('Content').closest('div');
      expect(content).not.toHaveClass('p-3', 'p-6', 'p-8');
    });

    it('should render with small padding', () => {
      render(<CardContent padding="sm">Content</CardContent>);
      
      const content = screen.getByText('Content').closest('div');
      expect(content).toHaveClass('p-3');
    });

    it('should render with medium padding', () => {
      render(<CardContent padding="md">Content</CardContent>);
      
      const content = screen.getByText('Content').closest('div');
      expect(content).toHaveClass('p-6');
    });

    it('should render with large padding', () => {
      render(<CardContent padding="lg">Content</CardContent>);
      
      const content = screen.getByText('Content').closest('div');
      expect(content).toHaveClass('p-8');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to content element', () => {
      const ref = jest.fn();
      render(<CardContent ref={ref}>Content</CardContent>);
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    });
  });
});

describe('CardFooter', () => {
  describe('Basic Rendering', () => {
    it('should render card footer with default props', () => {
      render(<CardFooter>Footer content</CardFooter>);
      
      const footer = screen.getByText('Footer content').closest('div');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('flex', 'items-center');
    });

    it('should render card footer with custom className', () => {
      render(<CardFooter className="custom-footer">Footer content</CardFooter>);
      
      const footer = screen.getByText('Footer content').closest('div');
      expect(footer).toHaveClass('custom-footer');
    });
  });

  describe('Padding Options', () => {
    it('should render with no padding', () => {
      render(<CardFooter padding="none">Footer content</CardFooter>);
      
      const footer = screen.getByText('Footer content').closest('div');
      expect(footer).not.toHaveClass('p-3', 'p-6', 'p-8');
    });

    it('should render with small padding', () => {
      render(<CardFooter padding="sm">Footer content</CardFooter>);
      
      const footer = screen.getByText('Footer content').closest('div');
      expect(footer).toHaveClass('p-3');
    });

    it('should render with medium padding', () => {
      render(<CardFooter padding="md">Footer content</CardFooter>);
      
      const footer = screen.getByText('Footer content').closest('div');
      expect(footer).toHaveClass('p-6');
    });

    it('should render with large padding', () => {
      render(<CardFooter padding="lg">Footer content</CardFooter>);
      
      const footer = screen.getByText('Footer content').closest('div');
      expect(footer).toHaveClass('p-8');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to footer element', () => {
      const ref = jest.fn();
      render(<CardFooter ref={ref}>Footer content</CardFooter>);
      
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    });
  });
});

describe('Card Component Integration', () => {
  it('should render complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Recipe Title</CardTitle>
          <CardDescription>A delicious recipe description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Recipe instructions go here...</p>
        </CardContent>
        <CardFooter>
          <button>Save Recipe</button>
          <button>Share</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Recipe Title');
    expect(screen.getByText('A delicious recipe description')).toBeInTheDocument();
    expect(screen.getByText('Recipe instructions go here...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Recipe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
  });

  it('should handle complex nested content', () => {
    render(
      <Card variant="elevated" padding="lg" hover>
        <CardHeader padding="md">
          <CardTitle>Complex Card</CardTitle>
          <CardDescription>With nested content</CardDescription>
        </CardHeader>
        <CardContent padding="sm">
          <div>
            <h4>Subsection</h4>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter padding="md">
          <span>Footer text</span>
        </CardFooter>
      </Card>
    );

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Complex Card');
    expect(screen.getByText('With nested content')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Subsection');
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Footer text')).toBeInTheDocument();
  });
});