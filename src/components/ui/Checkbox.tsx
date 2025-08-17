import React from 'react';
import { cn } from '@/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  description?: string;
  error?: string;
  checkboxSize?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary';
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ 
    className, 
    label, 
    description, 
    error,
    checkboxSize = 'md',
    variant = 'default',
    id,
    ...props 
  }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    const baseClasses = 'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground';
    
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    };

    const variantClasses = {
      default: 'border-input',
      primary: 'border-primary',
    };

    const errorClasses = hasError ? 'border-destructive' : '';

    const checkboxElement = (
      <div className="relative">
        <input
          type="checkbox"
          className={cn(
            baseClasses,
            sizeClasses[checkboxSize],
            variantClasses[variant],
            errorClasses,
            'sr-only', // Hide the default checkbox
            className
          )}
          ref={ref}
          id={checkboxId}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${checkboxId}-error` : description ? `${checkboxId}-description` : undefined
          }
          {...props}
        />
        {/* Custom checkbox appearance */}
        <div 
          className={cn(
            'flex items-center justify-center rounded-sm border transition-colors',
            sizeClasses[checkboxSize],
            variantClasses[variant],
            errorClasses,
            'peer-checked:bg-primary peer-checked:border-primary peer-checked:text-primary-foreground',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50'
          )}
        >
          {/* Checkmark icon */}
          <svg
            className={cn(
              'opacity-0 peer-checked:opacity-100 transition-opacity',
              checkboxSize === 'sm' ? 'h-2 w-2' : checkboxSize === 'lg' ? 'h-3 w-3' : 'h-2.5 w-2.5'
            )}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20,6 9,17 4,12" />
          </svg>
        </div>
      </div>
    );

    if (!label && !description && !error) {
      return checkboxElement;
    }

    return (
      <div className="flex items-start space-x-3">
        {checkboxElement}
        <div className="flex-1 min-w-0">
          {label && (
            <label 
              htmlFor={checkboxId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p id={`${checkboxId}-description`} className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
          )}
          {error && (
            <p id={`${checkboxId}-error`} className="text-sm text-destructive mt-1">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';