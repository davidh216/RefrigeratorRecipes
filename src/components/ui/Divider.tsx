import React from 'react';
import { cn } from '@/utils';

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed' | 'dotted';
  size?: 'sm' | 'md' | 'lg';
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  labelPosition?: 'left' | 'center' | 'right';
  as?: React.ElementType;
}

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ 
    className, 
    orientation = 'horizontal',
    variant = 'solid',
    size = 'md',
    spacing = 'md',
    label,
    labelPosition = 'center',
    as: Component = 'div',
    ...props 
  }, ref) => {
    const baseClasses = 'flex items-center';
    
    const orientationClasses = {
      horizontal: 'w-full',
      vertical: 'h-full flex-col',
    };

    const spacingClasses = {
      none: orientation === 'horizontal' ? 'my-0' : 'mx-0',
      sm: orientation === 'horizontal' ? 'my-2' : 'mx-2',
      md: orientation === 'horizontal' ? 'my-4' : 'mx-4',
      lg: orientation === 'horizontal' ? 'my-6' : 'mx-6',
      xl: orientation === 'horizontal' ? 'my-8' : 'mx-8',
    };

    const lineClasses = {
      solid: 'border-solid',
      dashed: 'border-dashed',
      dotted: 'border-dotted',
    };

    const sizeClasses = {
      sm: orientation === 'horizontal' ? 'border-t' : 'border-l',
      md: orientation === 'horizontal' ? 'border-t-2' : 'border-l-2',
      lg: orientation === 'horizontal' ? 'border-t-4' : 'border-l-4',
    };

    const borderColor = 'border-border';

    // Without label - simple divider
    if (!label) {
      return (
        <Component
          ref={ref}
          className={cn(
            'shrink-0',
            orientation === 'horizontal' ? 'w-full h-px' : 'w-px h-full',
            sizeClasses[size],
            lineClasses[variant],
            borderColor,
            spacingClasses[spacing],
            className
          )}
          role="separator"
          aria-orientation={orientation}
          {...props}
        />
      );
    }

    // With label
    if (orientation === 'vertical') {
      return (
        <Component
          ref={ref}
          className={cn(
            baseClasses,
            orientationClasses[orientation],
            spacingClasses[spacing],
            className
          )}
          role="separator"
          aria-orientation={orientation}
          {...props}
        >
          {labelPosition !== 'right' && (
            <div
              className={cn(
                'flex-1',
                sizeClasses[size],
                lineClasses[variant],
                borderColor
              )}
            />
          )}
          
          <span className="px-2 text-sm text-muted-foreground bg-background">
            {label}
          </span>
          
          {labelPosition !== 'left' && (
            <div
              className={cn(
                'flex-1',
                sizeClasses[size],
                lineClasses[variant],
                borderColor
              )}
            />
          )}
        </Component>
      );
    }

    // Horizontal with label
    return (
      <Component
        ref={ref}
        className={cn(
          baseClasses,
          orientationClasses[orientation],
          spacingClasses[spacing],
          className
        )}
        role="separator"
        aria-orientation={orientation}
        {...props}
      >
        {labelPosition !== 'right' && (
          <div
            className={cn(
              'flex-1',
              sizeClasses[size],
              lineClasses[variant],
              borderColor
            )}
          />
        )}
        
        <span className="px-4 text-sm text-muted-foreground bg-background whitespace-nowrap">
          {label}
        </span>
        
        {labelPosition !== 'left' && (
          <div
            className={cn(
              'flex-1',
              sizeClasses[size],
              lineClasses[variant],
              borderColor
            )}
          />
        )}
      </Component>
    );
  }
);

Divider.displayName = 'Divider';

export { Divider };