import React from 'react';
import { cn } from '@/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLNavElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  size?: 'sm' | 'md' | 'lg';
}

export interface BreadcrumbItemProps extends React.HTMLAttributes<HTMLLIElement> {
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
  as?: React.ElementType;
}

const Breadcrumbs = React.forwardRef<HTMLElement, BreadcrumbsProps>(
  ({ 
    className, 
    items,
    separator,
    maxItems,
    size = 'md',
    ...props 
  }, ref) => {
    const baseClasses = 'flex items-center space-x-1';
    
    const sizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    };

    // Handle max items with ellipsis
    const processedItems = React.useMemo(() => {
      if (!maxItems || items.length <= maxItems) {
        return items;
      }

      const firstItem = items[0];
      const lastItems = items.slice(-(maxItems - 2));
      
      return [
        firstItem,
        { label: '...', href: undefined, current: false },
        ...lastItems
      ];
    }, [items, maxItems]);

    const defaultSeparator = (
      <svg className="h-4 w-4 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
      </svg>
    );

    return (
      <nav
        ref={ref}
        className={cn(baseClasses, sizeClasses[size], className)}
        aria-label="Breadcrumb"
        {...props}
      >
        <ol className="flex items-center space-x-1">
          {processedItems.map((item, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem
                href={item.href}
                icon={item.icon}
                current={item.current}
              >
                {item.label}
              </BreadcrumbItem>
              
              {index < processedItems.length - 1 && (
                <li className="flex items-center">
                  {separator || defaultSeparator}
                </li>
              )}
            </React.Fragment>
          ))}
        </ol>
      </nav>
    );
  }
);

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ 
    className, 
    children,
    href,
    icon,
    current = false,
    as: Component,
    ...props 
  }, ref) => {
    const baseClasses = 'flex items-center gap-1';
    
    // Determine the component to use
    let LinkComponent: React.ElementType = 'span';
    if (Component) {
      LinkComponent = Component;
    } else if (href && !current) {
      LinkComponent = 'a';
    }

    const linkClasses = cn(
      'transition-colors',
      current 
        ? 'text-foreground font-medium cursor-default' 
        : href 
          ? 'text-muted-foreground hover:text-foreground cursor-pointer'
          : 'text-muted-foreground cursor-default'
    );

    return (
      <li
        ref={ref}
        className={cn(baseClasses, className)}
        {...props}
      >
        <LinkComponent
          href={!current ? href : undefined}
          className={linkClasses}
          aria-current={current ? 'page' : undefined}
        >
          {icon && (
            <span className="w-4 h-4 flex-shrink-0">
              {icon}
            </span>
          )}
          {children}
        </LinkComponent>
      </li>
    );
  }
);

Breadcrumbs.displayName = 'Breadcrumbs';
BreadcrumbItem.displayName = 'BreadcrumbItem';

export { Breadcrumbs, BreadcrumbItem };