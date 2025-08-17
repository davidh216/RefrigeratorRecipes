import React from 'react';
import { cn } from '@/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  rounded?: boolean;
  dot?: boolean;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'sm', 
    rounded = false,
    dot = false,
    children,
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
    
    const variantClasses = {
      default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
      primary: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
      secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
      success: 'border-transparent bg-green-500 text-white hover:bg-green-600',
      warning: 'border-transparent bg-yellow-500 text-white hover:bg-yellow-600',
      error: 'border-transparent bg-red-500 text-white hover:bg-red-600',
      info: 'border-transparent bg-blue-500 text-white hover:bg-blue-600',
      outline: 'text-foreground border-input hover:bg-accent hover:text-accent-foreground',
    };

    const sizeClasses = {
      xs: 'px-1.5 py-0.5 text-xs',
      sm: 'px-2.5 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-sm',
    };

    const roundedClasses = rounded ? 'rounded-full' : '';
    const dotClasses = dot ? 'w-2 h-2 p-0 rounded-full' : '';

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          roundedClasses,
          dotClasses,
          className
        )}
        {...props}
      >
        {!dot && children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';