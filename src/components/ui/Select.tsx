import React from 'react';
import { cn } from '@/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  placeholder?: string;
  selectSize?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outline';
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    options = [],
    placeholder,
    selectSize = 'md',
    variant = 'default',
    id,
    ...props 
  }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    const baseClasses = 'flex w-full rounded-md border border-input bg-background text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer';
    
    const variantClasses = {
      default: '',
      filled: 'bg-muted border-transparent',
      outline: 'border-2',
    };

    const sizeClasses = {
      sm: 'h-8 px-3 py-1 text-sm',
      md: 'h-10 px-3 py-2',
      lg: 'h-12 px-4 py-3 text-base',
    };

    const errorClasses = hasError ? 'border-destructive focus-visible:ring-destructive' : '';

    const selectElement = (
      <div className="relative">
        <select
          className={cn(
            baseClasses,
            variantClasses[variant],
            sizeClasses[selectSize],
            errorClasses,
            'pr-10', // Space for chevron icon
            className
          )}
          ref={ref}
          id={selectId}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options && Array.isArray(options) && options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {/* Chevron down icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="h-5 w-5 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    );

    if (!label && !error && !helperText) {
      return selectElement;
    }

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={selectId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 block mb-2"
          >
            {label}
          </label>
        )}
        {selectElement}
        {error && (
          <p id={`${selectId}-error`} className="text-sm text-destructive mt-2">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${selectId}-helper`} className="text-sm text-muted-foreground mt-2">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';