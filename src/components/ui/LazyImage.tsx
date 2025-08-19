import React from 'react';
import { useLazyImage } from '@/hooks/useLazyLoad';

interface LazyImageProps {
  src: string;
  alt: string;
  fallback?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  threshold?: number;
  rootMargin?: string;
  onLoad?: () => void;
  onError?: () => void;
  placeholder?: React.ReactNode;
  errorPlaceholder?: React.ReactNode;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  fallback,
  className = '',
  width,
  height,
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  placeholder,
  errorPlaceholder,
}) => {
  const {
    ref,
    imageSrc,
    imageAlt,
    isVisible,
    isLoaded,
    hasError,
  } = useLazyImage({
    src,
    alt,
    fallback,
    threshold,
    rootMargin,
  });

  // Handle load and error events
  React.useEffect(() => {
    if (isLoaded && onLoad) {
      onLoad();
    }
  }, [isLoaded, onLoad]);

  React.useEffect(() => {
    if (hasError && onError) {
      onError();
    }
  }, [hasError, onError]);

  // Show placeholder while loading
  if (!isVisible || (!isLoaded && !hasError)) {
    return (
      <div
        ref={ref}
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width, height }}
      >
        {placeholder}
      </div>
    );
  }

  // Show error placeholder
  if (hasError) {
    return (
      <div
        ref={ref}
        className={`bg-gray-100 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        {errorPlaceholder || (
          <div className="text-gray-500 text-sm">
            Failed to load image
          </div>
        )}
      </div>
    );
  }

  // Show actual image
  return (
    <img
      ref={ref}
      src={imageSrc}
      alt={imageAlt}
      className={className}
      style={{ width, height }}
      loading="lazy"
    />
  );
};
