import React from 'react';
import { cn } from '@/utils';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  centerContent?: boolean;
  as?: React.ElementType;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ 
    className, 
    size = 'lg',
    padding = 'md',
    centerContent = false,
    as: Component = 'div',
    children,
    ...props 
  }, ref) => {
    const baseClasses = 'w-full mx-auto';
    
    const sizeClasses = {
      xs: 'max-w-xs',
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-4xl',
      xl: 'max-w-6xl',
      '2xl': 'max-w-7xl',
      full: 'max-w-full',
    };

    const paddingClasses = {
      none: '',
      sm: 'px-4 sm:px-6',
      md: 'px-4 sm:px-6 lg:px-8',
      lg: 'px-6 sm:px-8 lg:px-12',
      xl: 'px-8 sm:px-12 lg:px-16',
    };

    const centerClasses = centerContent ? 'flex items-center justify-center' : '';

    return (
      <Component
        ref={ref}
        className={cn(
          baseClasses,
          sizeClasses[size],
          paddingClasses[padding],
          centerClasses,
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Container.displayName = 'Container';

export { Container };