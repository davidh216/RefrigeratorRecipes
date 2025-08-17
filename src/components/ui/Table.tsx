import React from 'react';
import { cn } from '@/utils';

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  variant?: 'default' | 'striped' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
}

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hover?: boolean;
}

export interface TableHeadProps extends React.HTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | false;
  onSort?: () => void;
}

export interface TableCellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const baseClasses = 'w-full caption-bottom text-sm border-collapse';
    
    const variantClasses = {
      default: '',
      striped: '',
      bordered: 'border border-border',
    };

    return (
      <div className="relative w-full overflow-auto">
        <table
          ref={ref}
          className={cn(
            baseClasses,
            variantClasses[variant],
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn('[&_tr]:border-b', className)}
      {...props}
    />
  )
);

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
);

const TableFooter = React.forwardRef<HTMLTableSectionElement, TableFooterProps>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
);

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, hover = false, ...props }, ref) => {
    const hoverClasses = hover ? 'hover:bg-muted/50 data-[state=selected]:bg-muted' : '';
    
    return (
      <tr
        ref={ref}
        className={cn(
          'border-b transition-colors',
          hoverClasses,
          className
        )}
        {...props}
      />
    );
  }
);

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortable = false, sorted = false, onSort, children, ...props }, ref) => {
    const baseClasses = 'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0';
    const sortableClasses = sortable ? 'cursor-pointer select-none hover:text-foreground' : '';

    const handleClick = () => {
      if (sortable && onSort) {
        onSort();
      }
    };

    return (
      <th
        ref={ref}
        className={cn(
          baseClasses,
          sortableClasses,
          className
        )}
        onClick={handleClick}
        {...props}
      >
        <div className="flex items-center gap-2">
          {children}
          {sortable && (
            <div className="flex flex-col">
              {sorted === 'asc' ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : sorted === 'desc' ? (
                <svg className="h-4 w-4 rotate-180" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-4 w-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          )}
        </div>
      </th>
    );
  }
);

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, align = 'left', ...props }, ref) => {
    const alignClasses = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    };

    return (
      <td
        ref={ref}
        className={cn(
          'p-4 align-middle [&:has([role=checkbox])]:pr-0',
          alignClasses[align],
          className
        )}
        {...props}
      />
    );
  }
);

Table.displayName = 'Table';
TableHeader.displayName = 'TableHeader';
TableBody.displayName = 'TableBody';
TableFooter.displayName = 'TableFooter';
TableRow.displayName = 'TableRow';
TableHead.displayName = 'TableHead';
TableCell.displayName = 'TableCell';

export { 
  Table, 
  TableHeader, 
  TableBody, 
  TableFooter, 
  TableRow, 
  TableHead, 
  TableCell 
};