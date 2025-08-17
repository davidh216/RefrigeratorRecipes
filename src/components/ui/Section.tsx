import React from 'react';
import { cn } from '@/utils';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'muted';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fullHeight?: boolean;
  centerContent?: boolean;
  as?: React.ElementType;
}

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  centerText?: boolean;
}

export interface SectionTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export interface SectionSubtitleProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: 'sm' | 'md' | 'lg';
}

export interface SectionContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface SectionFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  centerContent?: boolean;
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ 
    className, 
    variant = 'default',
    padding = 'lg',
    spacing = 'md',
    fullHeight = false,
    centerContent = false,
    as: Component = 'section',
    children,
    ...props 
  }, ref) => {
    const baseClasses = 'w-full';
    
    const variantClasses = {
      default: 'bg-background text-foreground',
      primary: 'bg-primary text-primary-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
      muted: 'bg-muted text-muted-foreground',
    };

    const paddingClasses = {
      none: '',
      sm: 'py-8 px-4 sm:px-6',
      md: 'py-12 px-4 sm:px-6 lg:px-8',
      lg: 'py-16 px-4 sm:px-6 lg:px-8',
      xl: 'py-20 px-6 sm:px-8 lg:px-12',
      '2xl': 'py-24 px-8 sm:px-12 lg:px-16',
    };

    const spacingClasses = {
      none: 'space-y-0',
      sm: 'space-y-4',
      md: 'space-y-6',
      lg: 'space-y-8',
      xl: 'space-y-12',
      '2xl': 'space-y-16',
    };

    const heightClasses = fullHeight ? 'min-h-screen' : '';
    const centerClasses = centerContent ? 'flex flex-col items-center justify-center text-center' : '';

    return (
      <Component
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          paddingClasses[padding],
          spacingClasses[spacing],
          heightClasses,
          centerClasses,
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ className, centerText = false, children, ...props }, ref) => {
    const centerClasses = centerText ? 'text-center' : '';

    return (
      <div
        ref={ref}
        className={cn('mb-8 lg:mb-12', centerClasses, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const SectionTitle = React.forwardRef<HTMLHeadingElement, SectionTitleProps>(
  ({ className, level = 2, size = 'xl', children, ...props }, ref) => {
    const Component = `h${level}` as keyof JSX.IntrinsicElements;
    
    const sizeClasses = {
      xs: 'text-lg',
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-3xl',
      xl: 'text-4xl',
      '2xl': 'text-5xl',
      '3xl': 'text-6xl',
      '4xl': 'text-7xl',
    };

    return (
      <Component
        ref={ref as any}
        className={cn(
          'font-bold tracking-tight',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

const SectionSubtitle = React.forwardRef<HTMLParagraphElement, SectionSubtitleProps>(
  ({ className, size = 'md', children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    };

    return (
      <p
        ref={ref}
        className={cn(
          'text-muted-foreground mt-4',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </p>
    );
  }
);

const SectionContent = React.forwardRef<HTMLDivElement, SectionContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex-1', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const SectionFooter = React.forwardRef<HTMLDivElement, SectionFooterProps>(
  ({ className, centerContent = false, children, ...props }, ref) => {
    const centerClasses = centerContent ? 'flex items-center justify-center' : '';

    return (
      <div
        ref={ref}
        className={cn('mt-8 lg:mt-12', centerClasses, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Section.displayName = 'Section';
SectionHeader.displayName = 'SectionHeader';
SectionTitle.displayName = 'SectionTitle';
SectionSubtitle.displayName = 'SectionSubtitle';
SectionContent.displayName = 'SectionContent';
SectionFooter.displayName = 'SectionFooter';

export { 
  Section, 
  SectionHeader, 
  SectionTitle, 
  SectionSubtitle, 
  SectionContent, 
  SectionFooter 
};