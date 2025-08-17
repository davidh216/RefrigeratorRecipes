import React from 'react';
import { cn } from '@/utils';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  orientation?: 'horizontal' | 'vertical';
  radioSize?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary';
  className?: string;
}

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  description?: string;
  radioSize?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary';
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ 
    className, 
    label, 
    description,
    radioSize = 'md',
    variant = 'default',
    id,
    ...props 
  }, ref) => {
    const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

    const baseClasses = 'peer h-4 w-4 shrink-0 rounded-full border border-primary text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
    
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    };

    const variantClasses = {
      default: 'border-input',
      primary: 'border-primary',
    };

    const radioElement = (
      <div className="relative">
        <input
          type="radio"
          className={cn(
            baseClasses,
            sizeClasses[radioSize],
            variantClasses[variant],
            'sr-only', // Hide the default radio
            className
          )}
          ref={ref}
          id={radioId}
          {...props}
        />
        {/* Custom radio appearance */}
        <div 
          className={cn(
            'flex items-center justify-center rounded-full border transition-colors',
            sizeClasses[radioSize],
            variantClasses[variant],
            'peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50'
          )}
        >
          {/* Radio dot */}
          <div
            className={cn(
              'rounded-full bg-primary opacity-0 peer-checked:opacity-100 transition-opacity',
              radioSize === 'sm' ? 'h-1.5 w-1.5' : radioSize === 'lg' ? 'h-2.5 w-2.5' : 'h-2 w-2'
            )}
          />
        </div>
      </div>
    );

    if (!label && !description) {
      return radioElement;
    }

    return (
      <div className="flex items-start space-x-3">
        {radioElement}
        <div className="flex-1 min-w-0">
          {label && (
            <label 
              htmlFor={radioId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Radio.displayName = 'Radio';

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  defaultValue,
  onChange,
  label,
  error,
  orientation = 'vertical',
  radioSize = 'md',
  variant = 'default',
  className,
}) => {
  const [selectedValue, setSelectedValue] = React.useState(value || defaultValue || '');

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleChange = (newValue: string) => {
    if (value === undefined) {
      setSelectedValue(newValue);
    }
    onChange?.(newValue);
  };

  const groupId = `radio-group-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <fieldset>
          <legend className="text-sm font-medium leading-none mb-3">
            {label}
          </legend>
          <div 
            className={cn(
              'space-y-3',
              orientation === 'horizontal' && 'flex flex-wrap gap-6 space-y-0'
            )}
            role="radiogroup"
            aria-invalid={hasError}
            aria-describedby={hasError ? `${groupId}-error` : undefined}
          >
            {options.map((option) => (
              <Radio
                key={option.value}
                name={name}
                value={option.value}
                label={option.label}
                description={option.description}
                disabled={option.disabled}
                radioSize={radioSize}
                variant={variant}
                checked={selectedValue === option.value}
                onChange={() => handleChange(option.value)}
              />
            ))}
          </div>
        </fieldset>
      )}
      
      {!label && (
        <div 
          className={cn(
            'space-y-3',
            orientation === 'horizontal' && 'flex flex-wrap gap-6 space-y-0'
          )}
          role="radiogroup"
          aria-invalid={hasError}
          aria-describedby={hasError ? `${groupId}-error` : undefined}
        >
          {options.map((option) => (
            <Radio
              key={option.value}
              name={name}
              value={option.value}
              label={option.label}
              description={option.description}
              disabled={option.disabled}
              radioSize={radioSize}
              variant={variant}
              checked={selectedValue === option.value}
              onChange={() => handleChange(option.value)}
            />
          ))}
        </div>
      )}
      
      {error && (
        <p id={`${groupId}-error`} className="text-sm text-destructive mt-3">
          {error}
        </p>
      )}
    </div>
  );
};