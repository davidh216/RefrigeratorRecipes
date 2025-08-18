import React from 'react'
import { render, screen } from '@testing-library/react'
import { Loading, Skeleton, SkeletonText, SkeletonCard } from '../Loading'

describe('Loading Component', () => {
  describe('Loading', () => {
    describe('Rendering', () => {
      it('should render with default props', () => {
        render(<Loading />)
        
        const loadingElement = screen.getAllByRole('generic')[1]
        expect(loadingElement).toBeInTheDocument()
        expect(loadingElement).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center')
      })

      it('should render with custom text', () => {
        render(<Loading text="Loading..." />)
        
        expect(screen.getByText('Loading...')).toBeInTheDocument()
      })

      it('should render with custom className', () => {
        render(<Loading className="custom-class" />)
        
        const loadingElement = screen.getAllByRole('generic')[1]
        expect(loadingElement).toHaveClass('custom-class')
      })
    })

    describe('Variants', () => {
      it('should render spinner variant by default', () => {
        render(<Loading />)
        
        const spinner = document.querySelector('svg.animate-spin')
        expect(spinner).toBeInTheDocument()
      })

      it('should render dots variant', () => {
        render(<Loading variant="dots" />)
        
        const dots = document.querySelectorAll('.rounded-full.bg-current.animate-pulse')
        expect(dots).toHaveLength(3)
      })

      it('should render pulse variant', () => {
        render(<Loading variant="pulse" />)
        
        const pulse = document.querySelector('.rounded-full.bg-current.animate-pulse')
        expect(pulse).toBeInTheDocument()
      })

      it('should render skeleton variant', () => {
        render(<Loading variant="skeleton" />)
        
        const loadingElement = screen.getAllByRole('generic')[1]
        expect(loadingElement).toBeInTheDocument()
        // Skeleton variant doesn't render a loader, just the container
        expect(document.querySelector('svg')).not.toBeInTheDocument()
      })
    })

    describe('Sizes', () => {
      it.each([
        ['xs', 'w-3 h-3'],
        ['sm', 'w-4 h-4'],
        ['md', 'w-6 h-6'],
        ['lg', 'w-8 h-8'],
        ['xl', 'w-12 h-12'],
      ])('should render %s size correctly', (size, expectedClass) => {
        render(<Loading size={size as any} />)
        
        const spinner = document.querySelector('svg')
        expect(spinner).toHaveClass(expectedClass)
      })

      it('should apply correct text size classes', () => {
        render(<Loading size="lg" text="Loading..." />)
        
        const textElement = screen.getByText('Loading...')
        expect(textElement).toHaveClass('text-lg')
      })
    })

    describe('Overlay and FullScreen', () => {
      it('should render as overlay', () => {
        render(<Loading overlay text="Loading..." />)
        
        const overlay = document.querySelector('.absolute.inset-0.z-10')
        expect(overlay).toBeInTheDocument()
        expect(screen.getByText('Loading...')).toBeInTheDocument()
      })

      it('should render as fullscreen overlay', () => {
        render(<Loading fullScreen text="Loading..." />)
        
        const fullscreen = document.querySelector('.fixed.inset-0.z-overlay')
        expect(fullscreen).toBeInTheDocument()
        expect(screen.getByText('Loading...')).toBeInTheDocument()
      })

      it('should apply backdrop blur to overlay', () => {
        render(<Loading overlay />)
        
        const overlay = document.querySelector('.bg-background\\/80.backdrop-blur-sm')
        expect(overlay).toBeInTheDocument()
      })
    })

    describe('Dots Animation', () => {
      it('should render dots with correct animation delays', () => {
        render(<Loading variant="dots" />)
        
        const dots = document.querySelectorAll('.rounded-full.bg-current.animate-pulse')
        expect(dots).toHaveLength(3)
        
        dots.forEach((dot, index) => {
          expect(dot).toHaveStyle({
            animationDelay: `${index * 0.2}s`,
            animationDuration: '1.4s',
          })
        })
      })

      it('should apply correct dot sizes for different loading sizes', () => {
        const { rerender } = render(<Loading variant="dots" size="xs" />)
        expect(document.querySelector('.w-1.h-1')).toBeInTheDocument()

        rerender(<Loading variant="dots" size="sm" />)
        expect(document.querySelector('.w-1\\.5.h-1\\.5')).toBeInTheDocument()

        rerender(<Loading variant="dots" size="md" />)
        expect(document.querySelector('.w-2.h-2')).toBeInTheDocument()

        rerender(<Loading variant="dots" size="lg" />)
        expect(document.querySelector('.w-3.h-3')).toBeInTheDocument()

        rerender(<Loading variant="dots" size="xl" />)
        expect(document.querySelector('.w-4.h-4')).toBeInTheDocument()
      })
    })
  })

  describe('Skeleton', () => {
    describe('Rendering', () => {
      it('should render with default props', () => {
        render(<Skeleton />)
        
        const skeleton = screen.getAllByRole('generic')[1]
        expect(skeleton).toBeInTheDocument()
        expect(skeleton).toHaveClass('bg-muted', 'rounded-md')
      })

      it('should render with custom width and height', () => {
        render(<Skeleton width={100} height={50} />)
        
        const skeleton = screen.getAllByRole('generic')[1]
        expect(skeleton).toHaveStyle({
          width: '100px',
          height: '50px',
        })
      })

      it('should render with string width and height', () => {
        render(<Skeleton width="50%" height="200px" />)
        
        const skeleton = screen.getAllByRole('generic')[1]
        expect(skeleton).toHaveStyle({
          width: '50%',
          height: '200px',
        })
      })

      it('should render with custom className', () => {
        render(<Skeleton className="custom-skeleton" />)
        
        const skeleton = screen.getAllByRole('generic')[1]
        expect(skeleton).toHaveClass('custom-skeleton')
      })
    })

    describe('Variants', () => {
      it.each([
        ['text', 'rounded-sm'],
        ['circular', 'rounded-full'],
        ['rectangular', 'rounded-md'],
      ])('should render %s variant correctly', (variant, expectedClass) => {
        render(<Skeleton variant={variant as any} />)
        
        const skeleton = screen.getAllByRole('generic')[1]
        expect(skeleton).toHaveClass(expectedClass)
      })
    })

    describe('Animations', () => {
      it.each([
        ['pulse', 'animate-pulse'],
        ['wave', 'animate-pulse'],
        ['none', ''],
      ])('should render %s animation correctly', (animation, expectedClass) => {
        render(<Skeleton animation={animation as any} />)
        
        const skeleton = screen.getAllByRole('generic')[1]
        if (expectedClass) {
          expect(skeleton).toHaveClass(expectedClass)
        } else {
          expect(skeleton).not.toHaveClass('animate-pulse')
        }
      })
    })

    describe('Style Merging', () => {
      it('should merge custom styles with width and height', () => {
        render(
          <Skeleton 
            width={100} 
            height={50} 
            style={{ backgroundColor: 'red' }}
          />
        )
        
        const skeleton = screen.getAllByRole('generic')[1]
        expect(skeleton).toHaveStyle({
          width: '100px',
          height: '50px',
          backgroundColor: 'red',
        })
      })
    })
  })

  describe('SkeletonText', () => {
    it('should render default number of lines', () => {
      render(<SkeletonText />)
      
      const textLines = document.querySelectorAll('.bg-muted.rounded-sm')
      expect(textLines).toHaveLength(3)
    })

    it('should render custom number of lines', () => {
      render(<SkeletonText lines={5} />)
      
      const textLines = document.querySelectorAll('.bg-muted.rounded-sm')
      expect(textLines).toHaveLength(5)
    })

    it('should apply custom className', () => {
      render(<SkeletonText className="custom-text" />)
      
      const container = document.querySelector('.space-y-2.custom-text')
      expect(container).toBeInTheDocument()
    })

    it('should make last line shorter', () => {
      render(<SkeletonText lines={3} />)
      
      const textLines = document.querySelectorAll('.bg-muted.rounded-sm')
      const lastLine = textLines[2]
      expect(lastLine).toHaveStyle({ width: '75%' })
      
      const otherLines = Array.from(textLines).slice(0, 2)
      otherLines.forEach(line => {
        expect(line).toHaveStyle({ width: '100%' })
      })
    })
  })

  describe('SkeletonCard', () => {
    it('should render card structure', () => {
      render(<SkeletonCard />)
      
      const card = document.querySelector('.space-y-4.p-6.border.border-border.rounded-lg')
      expect(card).toBeInTheDocument()
    })

    it('should render avatar skeleton', () => {
      render(<SkeletonCard />)
      
      const avatar = document.querySelector('.bg-muted.rounded-full')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveStyle({
        width: '40px',
        height: '40px',
      })
    })

    it('should render text skeletons', () => {
      render(<SkeletonCard />)
      
      const textLines = document.querySelectorAll('.bg-muted.rounded-sm')
      expect(textLines.length).toBeGreaterThan(0)
    })

    it('should apply custom className', () => {
      render(<SkeletonCard className="custom-card" />)
      
      const card = document.querySelector('.space-y-4.p-6.border.border-border.rounded-lg.custom-card')
      expect(card).toBeInTheDocument()
    })

    it('should render header with avatar and text', () => {
      render(<SkeletonCard />)
      
      const header = document.querySelector('.flex.items-center.space-x-4')
      expect(header).toBeInTheDocument()
      
      const avatar = header?.querySelector('.bg-muted.rounded-full')
      expect(avatar).toBeInTheDocument()
      
      const textContainer = header?.querySelector('.space-y-2.flex-1')
      expect(textContainer).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should forward ref to Loading component', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<Loading ref={ref} />)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should forward ref to Skeleton component', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<Skeleton ref={ref} />)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should pass through HTML attributes', () => {
      render(<Loading data-testid="loading" aria-label="Loading content" />)
      
      const loading = screen.getByTestId('loading')
      expect(loading).toHaveAttribute('aria-label', 'Loading content')
    })

    it('should pass through HTML attributes to Skeleton', () => {
      render(<Skeleton data-testid="skeleton" aria-label="Loading skeleton" />)
      
      const skeleton = screen.getByTestId('skeleton')
      expect(skeleton).toHaveAttribute('aria-label', 'Loading skeleton')
    })
  })

  describe('Edge Cases', () => {
          it('should handle empty text', () => {
        render(<Loading text="" />)
        
        const loadingElement = screen.getAllByRole('generic')[1]
        expect(loadingElement).toBeInTheDocument()
        expect(screen.queryByText('')).not.toBeInTheDocument()
      })

          it('should handle zero width and height', () => {
        render(<Skeleton width={0} height={0} />)
        
        const skeleton = screen.getAllByRole('generic')[1]
        expect(skeleton).toHaveStyle({
          width: '0px',
          height: '0px',
        })
      })

          it('should handle negative width and height', () => {
        render(<Skeleton width={-100} height={-50} />)
        
        const skeleton = screen.getAllByRole('generic')[1]
        expect(skeleton).toHaveStyle({
          width: '-100px',
          height: '-50px',
        })
      })
  })
})
