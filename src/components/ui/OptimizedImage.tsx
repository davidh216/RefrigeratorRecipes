'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  fill?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 75,
  fill = false,
  onLoad,
  onError,
  fallbackSrc = '/placeholder-recipe.jpg',
}) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(false);
    } else {
      setHasError(true);
    }
    onError?.();
  };

  // If we have an error and no fallback, show a placeholder
  if (hasError) {
    return (
      <div
        className={cn(
          'bg-gray-200 flex items-center justify-center',
          className
        )}
        style={{
          width: fill ? '100%' : width,
          height: fill ? '100%' : height,
        }}
      >
        <div className="text-gray-400 text-center">
          <div className="text-2xl mb-2">🍽️</div>
          <div className="text-sm">Image unavailable</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        src={imageSrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={sizes}
        quality={quality}
        fill={fill}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          objectFit: 'cover',
        }}
      />
      
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
};

// Recipe image component with specific optimizations
export const RecipeImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}> = ({ src, alt, className, priority = false }) => {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={400}
      height={300}
      className={cn('rounded-lg', className)}
      priority={priority}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
      quality={80}
      fallbackSrc="/placeholder-recipe.jpg"
    />
  );
};

// Ingredient image component
export const IngredientImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className }) => {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={200}
      height={200}
      className={cn('rounded-md', className)}
      sizes="(max-width: 768px) 100vw, 200px"
      quality={70}
      fallbackSrc="/placeholder-ingredient.jpg"
    />
  );
};

// Avatar image component
export const AvatarImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className }) => {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={40}
      height={40}
      className={cn('rounded-full', className)}
      sizes="40px"
      quality={60}
      fallbackSrc="/placeholder-avatar.jpg"
    />
  );
};
