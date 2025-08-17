import React from 'react';
import { cn } from '@/utils';

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'bordered' | 'floating';
  position?: 'static' | 'sticky' | 'fixed';
  height?: 'sm' | 'md' | 'lg';
  blur?: boolean;
}

export interface NavbarBrandProps extends React.HTMLAttributes<HTMLDivElement> {
  href?: string;
  as?: React.ElementType;
}

export interface NavbarContentProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'center' | 'end' | 'between';
}

export interface NavbarItemProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  disabled?: boolean;
  as?: React.ElementType;
  href?: string;
}

export interface NavbarMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen?: boolean;
  onToggle?: () => void;
}

export interface NavbarMenuToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isOpen?: boolean;
  onToggle?: () => void;
}

const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  ({ 
    className, 
    variant = 'default',
    position = 'static',
    height = 'md',
    blur = false,
    children,
    ...props 
  }, ref) => {
    const baseClasses = 'flex w-full items-center justify-between px-4 transition-colors duration-200';
    
    const variantClasses = {
      default: 'bg-background/95 border-b border-border',
      bordered: 'bg-background border-b-2 border-primary',
      floating: 'bg-background/80 rounded-lg border border-border mx-4 mt-4 shadow-lg',
    };

    const positionClasses = {
      static: 'relative',
      sticky: 'sticky top-0 z-40',
      fixed: 'fixed top-0 left-0 right-0 z-40',
    };

    const heightClasses = {
      sm: 'h-12',
      md: 'h-16',
      lg: 'h-20',
    };

    const blurClasses = blur ? 'backdrop-blur-sm' : '';

    return (
      <nav
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          positionClasses[position],
          heightClasses[height],
          blurClasses,
          className
        )}
        {...props}
      >
        {children}
      </nav>
    );
  }
);

const NavbarBrand = React.forwardRef<HTMLDivElement, NavbarBrandProps>(
  ({ className, children, as: Component = 'div', href, ...props }, ref) => {
    const baseClasses = 'flex items-center gap-2 font-bold text-xl text-foreground';
    
    if (href && Component === 'div') {
      Component = 'a';
    }

    return (
      <Component
        ref={ref}
        className={cn(baseClasses, className)}
        href={href}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

const NavbarContent = React.forwardRef<HTMLDivElement, NavbarContentProps>(
  ({ className, justify = 'start', children, ...props }, ref) => {
    const baseClasses = 'flex items-center gap-4';
    
    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          justifyClasses[justify],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const NavbarItem = React.forwardRef<HTMLDivElement, NavbarItemProps>(
  ({ 
    className, 
    active = false,
    disabled = false,
    as: Component = 'div',
    href,
    children,
    ...props 
  }, ref) => {
    const baseClasses = 'relative flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-md';
    
    const stateClasses = cn(
      active && 'text-primary bg-primary/10',
      disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
      !active && !disabled && 'text-muted-foreground hover:text-foreground hover:bg-accent'
    );

    if (href && Component === 'div') {
      Component = 'a';
    }

    return (
      <Component
        ref={ref}
        className={cn(
          baseClasses,
          stateClasses,
          className
        )}
        href={href}
        {...props}
      >
        {children}
        {active && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />
        )}
      </Component>
    );
  }
);

const NavbarMenuToggle = React.forwardRef<HTMLButtonElement, NavbarMenuToggleProps>(
  ({ className, isOpen = false, onToggle, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary md:hidden';

    return (
      <button
        ref={ref}
        className={cn(baseClasses, className)}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label="Toggle navigation menu"
        {...props}
      >
        {isOpen ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )}
      </button>
    );
  }
);

const NavbarMenu = React.forwardRef<HTMLDivElement, NavbarMenuProps>(
  ({ className, isOpen = false, children, ...props }, ref) => {
    const baseClasses = 'absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg py-2 md:hidden';
    
    if (!isOpen) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(baseClasses, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Navbar.displayName = 'Navbar';
NavbarBrand.displayName = 'NavbarBrand';
NavbarContent.displayName = 'NavbarContent';
NavbarItem.displayName = 'NavbarItem';
NavbarMenuToggle.displayName = 'NavbarMenuToggle';
NavbarMenu.displayName = 'NavbarMenu';

export { 
  Navbar, 
  NavbarBrand, 
  NavbarContent, 
  NavbarItem, 
  NavbarMenuToggle, 
  NavbarMenu 
};