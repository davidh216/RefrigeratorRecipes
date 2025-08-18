import React, { useId } from 'react';
import { cn } from '@/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outline';
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type = 'text', 
    label, 
    error, 
    helperText, 
    leftIcon, 
    rightIcon, 
    variant = 'default',
    inputSize = 'md',
    id,
    ...props 
  }, ref) => {
    const generatedId = useId();
    const inputId = id || `input-${generatedId}`;
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

    const iconSizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    };

    const inputElement = (
      <div className="relative">
        {leftIcon && (
          <div className={cn(
            'absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground',
            iconSizeClasses[inputSize]
          )}>
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            baseClasses,
            variantClasses[variant],
            sizeClasses[inputSize],
            errorClasses,
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          ref={ref}
          id={inputId}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          suppressHydrationWarning={true}
          {...props}
        />
        {rightIcon && (
          <div className={cn(
            'absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground',
            iconSizeClasses[inputSize]
          )}>
            {rightIcon}
          </div>
        )}
      </div>
    );

    if (!label && !error && !helperText) {
      return inputElement;
    }

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 block mb-2"
          >
            {label}
          </label>
        )}
        {inputElement}
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-destructive mt-2">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-sm text-muted-foreground mt-2">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';