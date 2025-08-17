import React from 'react';
import { cn } from '@/utils';

export interface ListProps extends React.HTMLAttributes<HTMLUListElement | HTMLOListElement> {
  variant?: 'unordered' | 'ordered' | 'unstyled';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  divider?: boolean;
  as?: 'ul' | 'ol';
}

export interface ListItemProps extends React.HTMLAttributes<HTMLLIElement> {
  active?: boolean;
  disabled?: boolean;
  clickable?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const List = React.forwardRef<HTMLUListElement | HTMLOListElement, ListProps>(
  ({ 
    className, 
    variant = 'unordered', 
    spacing = 'md',
    divider = false,
    as,
    children,
    ...props 
  }, ref) => {
    const Component = as || (variant === 'ordered' ? 'ol' : 'ul');
    
    const baseClasses = 'space-y-0';
    
    const variantClasses = {
      unordered: 'list-disc list-inside',
      ordered: 'list-decimal list-inside',
      unstyled: 'list-none',
    };

    const spacingClasses = {
      none: 'space-y-0',
      sm: 'space-y-1',
      md: 'space-y-2',
      lg: 'space-y-3',
    };

    const dividerClasses = divider ? 'divide-y divide-border' : '';

    return (
      <Component
        ref={ref as any}
        className={cn(
          baseClasses,
          variantClasses[variant],
          spacingClasses[spacing],
          dividerClasses,
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

const ListItem = React.forwardRef<HTMLLIElement, ListItemProps>(
  ({ 
    className, 
    active = false,
    disabled = false,
    clickable = false,
    leftIcon,
    rightIcon,
    children,
    ...props 
  }, ref) => {
    const baseClasses = 'flex items-center gap-3 py-2 px-3 transition-colors';
    
    const stateClasses = cn(
      active && 'bg-accent text-accent-foreground',
      disabled && 'opacity-50 cursor-not-allowed',
      clickable && !disabled && 'cursor-pointer hover:bg-accent hover:text-accent-foreground',
      !clickable && 'cursor-default'
    );

    return (
      <li
        ref={ref}
        className={cn(
          baseClasses,
          stateClasses,
          className
        )}
        aria-disabled={disabled}
        {...props}
      >
        {leftIcon && (
          <span className="flex-shrink-0 w-5 h-5 text-muted-foreground">
            {leftIcon}
          </span>
        )}
        <span className="flex-1 min-w-0">
          {children}
        </span>
        {rightIcon && (
          <span className="flex-shrink-0 w-5 h-5 text-muted-foreground">
            {rightIcon}
          </span>
        )}
      </li>
    );
  }
);

List.displayName = 'List';
ListItem.displayName = 'ListItem';

export { List, ListItem };