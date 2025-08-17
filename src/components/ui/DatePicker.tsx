import React from 'react';
import { cn } from '@/utils';

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  datePickerSize?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outline';
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText,
    datePickerSize = 'md',
    variant = 'default',
    id,
    ...props 
  }, ref) => {
    const datePickerId = id || `datepicker-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    const baseClasses = 'flex w-full rounded-md border border-input bg-background text-sm ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
    
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

    const datePickerElement = (
      <div className="relative">
        <input
          type="date"
          className={cn(
            baseClasses,
            variantClasses[variant],
            sizeClasses[datePickerSize],
            errorClasses,
            'pr-10', // Space for calendar icon
            className
          )}
          ref={ref}
          id={datePickerId}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${datePickerId}-error` : helperText ? `${datePickerId}-helper` : undefined
          }
          {...props}
        />
        {/* Calendar icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="h-5 w-5 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>
    );

    if (!label && !error && !helperText) {
      return datePickerElement;
    }

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={datePickerId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 block mb-2"
          >
            {label}
          </label>
        )}
        {datePickerElement}
        {error && (
          <p id={`${datePickerId}-error`} className="text-sm text-destructive mt-2">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${datePickerId}-helper`} className="text-sm text-muted-foreground mt-2">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';