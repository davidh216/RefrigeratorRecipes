import React from 'react';
import { cn } from '@/utils';

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'row-reverse' | 'col' | 'col-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  grow?: boolean;
  shrink?: boolean;
  as?: React.ElementType;
}

export interface FlexItemProps extends React.HTMLAttributes<HTMLDivElement> {
  flex?: 'none' | 'auto' | 'initial' | '1' | number | string;
  grow?: boolean | number;
  shrink?: boolean | number;
  basis?: 'auto' | 'full' | string;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  order?: number;
  as?: React.ElementType;
}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ 
    className, 
    direction = 'row',
    align = 'stretch',
    justify = 'start',
    wrap = 'nowrap',
    gap = 'md',
    grow = false,
    shrink = true,
    as: Component = 'div',
    children,
    ...props 
  }, ref) => {
    const baseClasses = 'flex';
    
    const directionClasses = {
      row: 'flex-row',
      'row-reverse': 'flex-row-reverse',
      col: 'flex-col',
      'col-reverse': 'flex-col-reverse',
    };

    const alignClasses = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    };

    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    };

    const wrapClasses = {
      nowrap: 'flex-nowrap',
      wrap: 'flex-wrap',
      'wrap-reverse': 'flex-wrap-reverse',
    };

    const gapClasses = {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
      '2xl': 'gap-12',
    };

    const growClasses = grow ? 'flex-grow' : '';
    const shrinkClasses = !shrink ? 'flex-shrink-0' : '';

    return (
      <Component
        ref={ref}
        className={cn(
          baseClasses,
          directionClasses[direction],
          alignClasses[align],
          justifyClasses[justify],
          wrapClasses[wrap],
          gapClasses[gap],
          growClasses,
          shrinkClasses,
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

const FlexItem = React.forwardRef<HTMLDivElement, FlexItemProps>(
  ({ 
    className, 
    flex,
    grow,
    shrink,
    basis = 'auto',
    align,
    order,
    as: Component = 'div',
    children,
    style,
    ...props 
  }, ref) => {
    const alignClasses = {
      start: 'self-start',
      center: 'self-center',
      end: 'self-end',
      stretch: 'self-stretch',
      baseline: 'self-baseline',
    };

    const flexClasses = {
      none: 'flex-none',
      auto: 'flex-auto',
      initial: 'flex-initial',
      '1': 'flex-1',
    };

    const basisClasses = {
      auto: 'basis-auto',
      full: 'basis-full',
    };

    // Handle custom flex values
    const customStyle = {
      ...style,
      ...(typeof flex === 'number' || (typeof flex === 'string' && !flexClasses[flex as keyof typeof flexClasses]) ? { flex } : {}),
      ...(typeof grow === 'number' ? { flexGrow: grow } : {}),
      ...(typeof shrink === 'number' ? { flexShrink: shrink } : {}),
      ...(typeof basis === 'string' && !basisClasses[basis as keyof typeof basisClasses] ? { flexBasis: basis } : {}),
      ...(order !== undefined ? { order } : {}),
    };

    return (
      <Component
        ref={ref}
        className={cn(
          typeof flex === 'string' && flexClasses[flex as keyof typeof flexClasses],
          typeof grow === 'boolean' && grow && 'flex-grow',
          typeof shrink === 'boolean' && !shrink && 'flex-shrink-0',
          basisClasses[basis as keyof typeof basisClasses],
          align && alignClasses[align],
          className
        )}
        style={customStyle}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Flex.displayName = 'Flex';
FlexItem.displayName = 'FlexItem';

export { Flex, FlexItem };