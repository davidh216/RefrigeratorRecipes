import React from 'react';
import { cn } from '@/utils';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  active?: boolean;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  active?: boolean;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ 
    className, 
    items = [],
    defaultValue,
    value,
    onValueChange,
    variant = 'default',
    size = 'md',
    orientation = 'horizontal',
    ...props 
  }, ref) => {
    const [activeTab, setActiveTab] = React.useState(value || defaultValue || (items.length > 0 ? items[0]?.id : '') || '');

    React.useEffect(() => {
      if (value !== undefined) {
        setActiveTab(value);
      }
    }, [value]);

    const handleTabChange = (newValue: string) => {
      if (value === undefined) {
        setActiveTab(newValue);
      }
      onValueChange?.(newValue);
    };

    const baseClasses = 'w-full';
    const orientationClasses = orientation === 'vertical' ? 'flex gap-4' : '';

    return (
      <div
        ref={ref}
        className={cn(baseClasses, orientationClasses, className)}
        {...props}
      >
        <TabsList variant={variant} size={size} orientation={orientation}>
          {items && Array.isArray(items) && items.map((item) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              active={activeTab === item.id}
              disabled={item.disabled}
              variant={variant}
              size={size}
              icon={item.icon}
              badge={item.badge}
              onClick={() => handleTabChange(item.id)}
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {items && Array.isArray(items) && items.map((item) => (
          <TabsContent
            key={item.id}
            value={item.id}
            active={activeTab === item.id}
          >
            {item.content}
          </TabsContent>
        ))}
      </div>
    );
  }
);

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ 
    className, 
    variant = 'default',
    size = 'md',
    orientation = 'horizontal',
    children,
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center';
    
    const variantClasses = {
      default: 'rounded-md bg-muted p-1',
      pills: 'gap-2',
      underline: 'border-b border-border',
    };

    const orientationClasses = {
      horizontal: orientation === 'horizontal' ? 'flex-row' : '',
      vertical: orientation === 'vertical' ? 'flex-col h-fit' : '',
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          orientationClasses[orientation],
          className
        )}
        role="tablist"
        aria-orientation={orientation}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ 
    className, 
    value,
    active = false,
    variant = 'default',
    size = 'md',
    icon,
    badge,
    children,
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    
    const variantClasses = {
      default: active 
        ? 'bg-background text-foreground shadow-sm' 
        : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
      pills: active
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      underline: active
        ? 'border-b-2 border-primary text-foreground'
        : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        role="tab"
        aria-selected={active}
        aria-controls={`tabpanel-${value}`}
        id={`tab-${value}`}
        {...props}
      >
        {icon && (
          <span className="w-4 h-4 flex-shrink-0">
            {icon}
          </span>
        )}
        {children}
        {badge && (
          <span className="ml-1">
            {badge}
          </span>
        )}
      </button>
    );
  }
);

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, active = false, children, ...props }, ref) => {
    const baseClasses = 'mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

    if (!active) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(baseClasses, className)}
        role="tabpanel"
        aria-labelledby={`tab-${value}`}
        id={`tabpanel-${value}`}
        tabIndex={0}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';
TabsList.displayName = 'TabsList';
TabsTrigger.displayName = 'TabsTrigger';
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };