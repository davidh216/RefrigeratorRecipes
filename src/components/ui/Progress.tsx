import React from 'react';
import { cn } from '@/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value = 0,
    max = 100,
    variant = 'default',
    size = 'md',
    showLabel = false,
    animated = true,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const baseClasses = 'relative w-full overflow-hidden rounded-full bg-muted';
    
    const sizeClasses = {
      sm: 'h-1.5',
      md: 'h-2',
      lg: 'h-3',
    };

    const variantClasses = {
      default: 'bg-primary',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500',
    };

    const animationClasses = animated ? 'transition-all duration-300 ease-out' : '';

    return (
      <div className="w-full">
        <div
          ref={ref}
          className={cn(baseClasses, sizeClasses[size], className)}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          {...props}
        >
          <div
            className={cn(
              'h-full transition-all duration-300 ease-out',
              variantClasses[variant],
              animationClasses
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {showLabel && (
          <div className="mt-1 text-xs text-muted-foreground text-center">
            {Math.round(percentage)}%
          </div>
        )}
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };
