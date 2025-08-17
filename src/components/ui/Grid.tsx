import React from 'react';
import { cn } from '@/utils';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto' | 'none';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  rowGap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  colGap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  responsive?: {
    sm?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    md?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    lg?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    xl?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  };
  as?: React.ElementType;
}

export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto' | 'full';
  start?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'auto';
  end?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'auto';
  responsive?: {
    sm?: { span?: GridItemProps['span']; start?: GridItemProps['start']; end?: GridItemProps['end'] };
    md?: { span?: GridItemProps['span']; start?: GridItemProps['start']; end?: GridItemProps['end'] };
    lg?: { span?: GridItemProps['span']; start?: GridItemProps['start']; end?: GridItemProps['end'] };
    xl?: { span?: GridItemProps['span']; start?: GridItemProps['start']; end?: GridItemProps['end'] };
  };
  as?: React.ElementType;
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ 
    className, 
    cols = 12,
    gap = 'md',
    rowGap,
    colGap,
    responsive,
    as: Component = 'div',
    children,
    ...props 
  }, ref) => {
    const baseClasses = 'grid';
    
    const colsClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      7: 'grid-cols-7',
      8: 'grid-cols-8',
      9: 'grid-cols-9',
      10: 'grid-cols-10',
      11: 'grid-cols-11',
      12: 'grid-cols-12',
      auto: 'grid-cols-auto',
      none: 'grid-cols-none',
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

    const rowGapClasses = {
      none: 'gap-y-0',
      xs: 'gap-y-1',
      sm: 'gap-y-2',
      md: 'gap-y-4',
      lg: 'gap-y-6',
      xl: 'gap-y-8',
      '2xl': 'gap-y-12',
    };

    const colGapClasses = {
      none: 'gap-x-0',
      xs: 'gap-x-1',
      sm: 'gap-x-2',
      md: 'gap-x-4',
      lg: 'gap-x-6',
      xl: 'gap-x-8',
      '2xl': 'gap-x-12',
    };

    const responsiveClasses = responsive ? [
      responsive.sm && `sm:grid-cols-${responsive.sm}`,
      responsive.md && `md:grid-cols-${responsive.md}`,
      responsive.lg && `lg:grid-cols-${responsive.lg}`,
      responsive.xl && `xl:grid-cols-${responsive.xl}`,
    ].filter(Boolean).join(' ') : '';

    return (
      <Component
        ref={ref}
        className={cn(
          baseClasses,
          colsClasses[cols],
          !rowGap && !colGap && gapClasses[gap],
          rowGap && rowGapClasses[rowGap],
          colGap && colGapClasses[colGap],
          responsiveClasses,
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  ({ 
    className, 
    span,
    start,
    end,
    responsive,
    as: Component = 'div',
    children,
    ...props 
  }, ref) => {
    const spanClasses = {
      1: 'col-span-1',
      2: 'col-span-2',
      3: 'col-span-3',
      4: 'col-span-4',
      5: 'col-span-5',
      6: 'col-span-6',
      7: 'col-span-7',
      8: 'col-span-8',
      9: 'col-span-9',
      10: 'col-span-10',
      11: 'col-span-11',
      12: 'col-span-12',
      auto: 'col-auto',
      full: 'col-span-full',
    };

    const startClasses = {
      1: 'col-start-1',
      2: 'col-start-2',
      3: 'col-start-3',
      4: 'col-start-4',
      5: 'col-start-5',
      6: 'col-start-6',
      7: 'col-start-7',
      8: 'col-start-8',
      9: 'col-start-9',
      10: 'col-start-10',
      11: 'col-start-11',
      12: 'col-start-12',
      13: 'col-start-13',
      auto: 'col-start-auto',
    };

    const endClasses = {
      1: 'col-end-1',
      2: 'col-end-2',
      3: 'col-end-3',
      4: 'col-end-4',
      5: 'col-end-5',
      6: 'col-end-6',
      7: 'col-end-7',
      8: 'col-end-8',
      9: 'col-end-9',
      10: 'col-end-10',
      11: 'col-end-11',
      12: 'col-end-12',
      13: 'col-end-13',
      auto: 'col-end-auto',
    };

    const responsiveClasses = responsive ? [
      responsive.sm?.span && `sm:col-span-${responsive.sm.span === 'auto' ? 'auto' : responsive.sm.span === 'full' ? 'full' : responsive.sm.span}`,
      responsive.sm?.start && `sm:col-start-${responsive.sm.start === 'auto' ? 'auto' : responsive.sm.start}`,
      responsive.sm?.end && `sm:col-end-${responsive.sm.end === 'auto' ? 'auto' : responsive.sm.end}`,
      responsive.md?.span && `md:col-span-${responsive.md.span === 'auto' ? 'auto' : responsive.md.span === 'full' ? 'full' : responsive.md.span}`,
      responsive.md?.start && `md:col-start-${responsive.md.start === 'auto' ? 'auto' : responsive.md.start}`,
      responsive.md?.end && `md:col-end-${responsive.md.end === 'auto' ? 'auto' : responsive.md.end}`,
      responsive.lg?.span && `lg:col-span-${responsive.lg.span === 'auto' ? 'auto' : responsive.lg.span === 'full' ? 'full' : responsive.lg.span}`,
      responsive.lg?.start && `lg:col-start-${responsive.lg.start === 'auto' ? 'auto' : responsive.lg.start}`,
      responsive.lg?.end && `lg:col-end-${responsive.lg.end === 'auto' ? 'auto' : responsive.lg.end}`,
      responsive.xl?.span && `xl:col-span-${responsive.xl.span === 'auto' ? 'auto' : responsive.xl.span === 'full' ? 'full' : responsive.xl.span}`,
      responsive.xl?.start && `xl:col-start-${responsive.xl.start === 'auto' ? 'auto' : responsive.xl.start}`,
      responsive.xl?.end && `xl:col-end-${responsive.xl.end === 'auto' ? 'auto' : responsive.xl.end}`,
    ].filter(Boolean).join(' ') : '';

    return (
      <Component
        ref={ref}
        className={cn(
          span && spanClasses[span],
          start && startClasses[start],
          end && endClasses[end],
          responsiveClasses,
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Grid.displayName = 'Grid';
GridItem.displayName = 'GridItem';

export { Grid, GridItem };