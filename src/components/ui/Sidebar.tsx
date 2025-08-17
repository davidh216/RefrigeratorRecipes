import React from 'react';
import { cn } from '@/utils';

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'floating' | 'bordered';
  position?: 'left' | 'right';
  width?: 'sm' | 'md' | 'lg' | 'xl';
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface SidebarMenuProps extends React.HTMLAttributes<HTMLElement> {}

export interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLLIElement> {
  icon?: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  href?: string;
  as?: React.ElementType;
  badge?: React.ReactNode;
  collapsed?: boolean;
}

export interface SidebarMenuGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  collapsed?: boolean;
}

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ 
    className, 
    variant = 'default',
    position = 'left',
    width = 'md',
    collapsible = false,
    collapsed = false,
    onCollapsedChange,
    children,
    ...props 
  }, ref) => {
    const [isCollapsed, setIsCollapsed] = React.useState(collapsed);

    React.useEffect(() => {
      setIsCollapsed(collapsed);
    }, [collapsed]);

    const handleToggle = () => {
      const newCollapsed = !isCollapsed;
      setIsCollapsed(newCollapsed);
      onCollapsedChange?.(newCollapsed);
    };

    const baseClasses = 'flex flex-col h-full transition-all duration-200 ease-in-out';
    
    const variantClasses = {
      default: 'bg-background border-r border-border',
      floating: 'bg-background rounded-lg border border-border m-2 shadow-lg',
      bordered: 'bg-background border-2 border-border',
    };

    const widthClasses = {
      sm: isCollapsed ? 'w-16' : 'w-48',
      md: isCollapsed ? 'w-16' : 'w-64',
      lg: isCollapsed ? 'w-16' : 'w-80',
      xl: isCollapsed ? 'w-16' : 'w-96',
    };

    const positionClasses = {
      left: 'border-r',
      right: 'border-l',
    };

    return (
      <aside
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          widthClasses[width],
          position === 'right' && positionClasses.right,
          className
        )}
        data-collapsed={isCollapsed}
        {...props}
      >
        {collapsible && (
          <button
            onClick={handleToggle}
            className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={cn('h-3 w-3 transition-transform', isCollapsed && 'rotate-180')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {React.Children.map(children, child => 
          React.isValidElement(child) && child.type === SidebarContent
            ? React.cloneElement(child as React.ReactElement<any>, { collapsed: isCollapsed })
            : child
        )}
      </aside>
    );
  }
);

const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-3 p-4 border-b border-border', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const SidebarContent = React.forwardRef<HTMLDivElement, SidebarContentProps & { collapsed?: boolean }>(
  ({ className, collapsed = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex-1 overflow-auto p-2', className)}
        {...props}
      >
        {React.Children.map(children, child => 
          React.isValidElement(child) 
            ? React.cloneElement(child as React.ReactElement<any>, { collapsed })
            : child
        )}
      </div>
    );
  }
);

const SidebarFooter = React.forwardRef<HTMLDivElement, SidebarFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('p-4 border-t border-border', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const SidebarMenu = React.forwardRef<HTMLElement, SidebarMenuProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn('space-y-1', className)}
        {...props}
      >
        <ul className="space-y-1">
          {children}
        </ul>
      </nav>
    );
  }
);

const SidebarMenuGroup = React.forwardRef<HTMLDivElement, SidebarMenuGroupProps>(
  ({ className, label, collapsed = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('py-2', className)}
        {...props}
      >
        {label && !collapsed && (
          <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {label}
          </h3>
        )}
        <ul className="space-y-1">
          {React.Children.map(children, child => 
            React.isValidElement(child) 
              ? React.cloneElement(child as React.ReactElement<any>, { collapsed })
              : child
          )}
        </ul>
      </div>
    );
  }
);

const SidebarMenuItem = React.forwardRef<HTMLLIElement, SidebarMenuItemProps>(
  ({ 
    className, 
    icon,
    active = false,
    disabled = false,
    href,
    as: Component,
    badge,
    collapsed = false,
    children,
    ...props 
  }, ref) => {
    let LinkComponent: React.ElementType = 'div';
    if (Component) {
      LinkComponent = Component;
    } else if (href) {
      LinkComponent = 'a';
    }

    const baseClasses = 'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors relative group';
    
    const stateClasses = cn(
      active && 'bg-accent text-accent-foreground',
      disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
      !active && !disabled && 'text-muted-foreground hover:text-foreground hover:bg-accent'
    );

    return (
      <li ref={ref} {...props}>
        <LinkComponent
          href={href}
          className={cn(
            baseClasses,
            stateClasses,
            collapsed && 'justify-center px-2',
            className
          )}
        >
          {icon && (
            <span className="w-5 h-5 flex-shrink-0">
              {icon}
            </span>
          )}
          
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{children}</span>
              {badge && (
                <span className="flex-shrink-0">
                  {badge}
                </span>
              )}
            </>
          )}

          {/* Tooltip for collapsed state */}
          {collapsed && children && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground rounded-md text-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50 whitespace-nowrap">
              {children}
            </div>
          )}
        </LinkComponent>
      </li>
    );
  }
);

Sidebar.displayName = 'Sidebar';
SidebarHeader.displayName = 'SidebarHeader';
SidebarContent.displayName = 'SidebarContent';
SidebarFooter.displayName = 'SidebarFooter';
SidebarMenu.displayName = 'SidebarMenu';
SidebarMenuGroup.displayName = 'SidebarMenuGroup';
SidebarMenuItem.displayName = 'SidebarMenuItem';

export { 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarFooter,
  SidebarMenu,
  SidebarMenuGroup,
  SidebarMenuItem 
};