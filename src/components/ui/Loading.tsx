import React from 'react';
import { cn } from '@/utils';

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  overlay?: boolean;
  fullScreen?: boolean;
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ 
    className, 
    variant = 'spinner',
    size = 'md',
    text,
    overlay = false,
    fullScreen = false,
    ...props 
  }, ref) => {
    const sizeClasses = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-12 h-12',
    };

    const textSizeClasses = {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    };

    const SpinnerIcon = () => (
      <svg
        className={cn('animate-spin', sizeClasses[size])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    const DotsIcon = () => (
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'rounded-full bg-current animate-pulse',
              size === 'xs' ? 'w-1 h-1' :
              size === 'sm' ? 'w-1.5 h-1.5' :
              size === 'md' ? 'w-2 h-2' :
              size === 'lg' ? 'w-3 h-3' : 'w-4 h-4'
            )}
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1.4s',
            }}
          />
        ))}
      </div>
    );

    const PulseIcon = () => (
      <div
        className={cn(
          'rounded-full bg-current animate-pulse',
          sizeClasses[size]
        )}
      />
    );

    const renderLoader = () => {
      switch (variant) {
        case 'spinner':
          return <SpinnerIcon />;
        case 'dots':
          return <DotsIcon />;
        case 'pulse':
          return <PulseIcon />;
        default:
          return <SpinnerIcon />;
      }
    };

    const content = (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center gap-2 text-muted-foreground',
          className
        )}
        {...props}
      >
        {variant !== 'skeleton' && renderLoader()}
        {text && (
          <span className={cn('text-center', textSizeClasses[size])}>
            {text}
          </span>
        )}
      </div>
    );

    if (overlay || fullScreen) {
      return (
        <div
          className={cn(
            'flex items-center justify-center bg-background/80 backdrop-blur-sm',
            fullScreen ? 'fixed inset-0 z-overlay' : 'absolute inset-0 z-10'
          )}
        >
          {content}
        </div>
      );
    }

    return content;
  }
);

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className, 
    width,
    height,
    variant = 'rectangular',
    animation = 'pulse',
    style,
    ...props 
  }, ref) => {
    const baseClasses = 'bg-muted';
    
    const variantClasses = {
      text: 'rounded-sm',
      circular: 'rounded-full',
      rectangular: 'rounded-md',
    };

    const animationClasses = {
      pulse: 'animate-pulse',
      wave: 'animate-pulse', // Could be enhanced with wave animation
      none: '',
    };

    const combinedStyle = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          animationClasses[animation],
          className
        )}
        style={combinedStyle}
        {...props}
      />
    );
  }
);

// Pre-built skeleton templates
const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 3, 
  className 
}) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton
        key={i}
        variant="text"
        height={16}
        width={i === lines - 1 ? '75%' : '100%'}
      />
    ))}
  </div>
);

const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-4 p-6 border border-border rounded-lg', className)}>
    <div className="flex items-center space-x-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="space-y-2 flex-1">
        <Skeleton variant="text" height={16} width="60%" />
        <Skeleton variant="text" height={14} width="40%" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);

Loading.displayName = 'Loading';
Skeleton.displayName = 'Skeleton';

export { Loading, Skeleton, SkeletonText, SkeletonCard };