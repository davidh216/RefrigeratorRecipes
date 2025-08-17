import React from 'react';
import { cn } from '@/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled' | 'outline';
  textareaSize?: 'sm' | 'md' | 'lg';
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText,
    variant = 'default',
    textareaSize = 'md',
    resize = 'vertical',
    id,
    ...props 
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    const baseClasses = 'flex min-h-[80px] w-full rounded-md border border-input bg-background text-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
    
    const variantClasses = {
      default: '',
      filled: 'bg-muted border-transparent',
      outline: 'border-2',
    };

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm min-h-[60px]',
      md: 'px-3 py-2 min-h-[80px]',
      lg: 'px-4 py-3 text-base min-h-[100px]',
    };

    const resizeClasses = {
      none: 'resize-none',
      both: 'resize',
      horizontal: 'resize-x',
      vertical: 'resize-y',
    };

    const errorClasses = hasError ? 'border-destructive focus-visible:ring-destructive' : '';

    const textareaElement = (
      <textarea
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[textareaSize],
          resizeClasses[resize],
          errorClasses,
          className
        )}
        ref={ref}
        id={textareaId}
        aria-invalid={hasError}
        aria-describedby={
          hasError ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
        }
        {...props}
      />
    );

    if (!label && !error && !helperText) {
      return textareaElement;
    }

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={textareaId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 block mb-2"
          >
            {label}
          </label>
        )}
        {textareaElement}
        {error && (
          <p id={`${textareaId}-error`} className="text-sm text-destructive mt-2">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${textareaId}-helper`} className="text-sm text-muted-foreground mt-2">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';