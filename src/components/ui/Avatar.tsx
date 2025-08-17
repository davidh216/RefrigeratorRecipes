import React from 'react';
import { cn } from '@/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fallback?: string;
  variant?: 'circular' | 'rounded' | 'square';
  status?: 'online' | 'offline' | 'away' | 'busy';
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ 
    className, 
    src, 
    alt = 'Avatar',
    size = 'md',
    fallback,
    variant = 'circular',
    status,
    ...props 
  }, ref) => {
    const [imageLoaded, setImageLoaded] = React.useState(false);
    const [imageError, setImageError] = React.useState(false);

    const baseClasses = 'relative inline-flex items-center justify-center overflow-hidden bg-muted font-medium text-muted-foreground select-none';
    
    const sizeClasses = {
      xs: 'h-6 w-6 text-xs',
      sm: 'h-8 w-8 text-sm',
      md: 'h-10 w-10 text-base',
      lg: 'h-12 w-12 text-lg',
      xl: 'h-16 w-16 text-xl',
      '2xl': 'h-20 w-20 text-2xl',
    };

    const variantClasses = {
      circular: 'rounded-full',
      rounded: 'rounded-lg',
      square: 'rounded-none',
    };

    const statusSizeClasses = {
      xs: 'h-1.5 w-1.5',
      sm: 'h-2 w-2',
      md: 'h-2.5 w-2.5',
      lg: 'h-3 w-3',
      xl: 'h-4 w-4',
      '2xl': 'h-5 w-5',
    };

    const statusClasses = {
      online: 'bg-green-500',
      offline: 'bg-gray-400',
      away: 'bg-yellow-500',
      busy: 'bg-red-500',
    };

    const handleImageLoad = () => {
      setImageLoaded(true);
      setImageError(false);
    };

    const handleImageError = () => {
      setImageLoaded(false);
      setImageError(true);
    };

    const shouldShowImage = src && !imageError;
    const shouldShowFallback = !shouldShowImage;

    // Generate initials from fallback text
    const getInitials = (text: string) => {
      return text
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {shouldShowImage && (
          <img
            src={src}
            alt={alt}
            className={cn(
              'h-full w-full object-cover',
              variantClasses[variant],
              !imageLoaded && 'opacity-0'
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
        
        {shouldShowFallback && (
          <span className="select-none">
            {fallback ? getInitials(fallback) : '?'}
          </span>
        )}

        {/* Status indicator */}
        {status && (
          <span 
            className={cn(
              'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
              statusSizeClasses[size],
              statusClasses[status]
            )}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';