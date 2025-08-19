import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyLoadOptions {
  threshold?: number; // Intersection observer threshold
  rootMargin?: string; // Intersection observer root margin
  fallback?: string; // Fallback image URL
}

interface UseLazyLoadReturn {
  isVisible: boolean;
  isLoaded: boolean;
  hasError: boolean;
  ref: React.RefObject<HTMLElement>;
  load: () => void;
}

export function useLazyLoad(options: UseLazyLoadOptions = {}): UseLazyLoadReturn {
  const { threshold = 0.1, rootMargin = '50px', fallback } = options;
  
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const ref = useRef<HTMLElement>(null);

  // Intersection observer callback
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting) {
      setIsVisible(true);
    }
  }, []);

  // Set up intersection observer
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [handleIntersection, threshold, rootMargin]);

  // Manual load function
  const load = useCallback(() => {
    setIsVisible(true);
  }, []);

  return {
    isVisible,
    isLoaded,
    hasError,
    ref,
    load,
  };
}

// Specialized hook for lazy loading images
interface UseLazyImageOptions extends UseLazyLoadOptions {
  src: string;
  alt?: string;
}

interface UseLazyImageReturn extends UseLazyLoadReturn {
  imageSrc: string;
  imageAlt: string;
}

export function useLazyImage(options: UseLazyImageOptions): UseLazyImageReturn {
  const { src, alt = '', fallback, ...lazyLoadOptions } = options;
  
  const [imageSrc, setImageSrc] = useState(fallback || '');
  const [imageAlt, setImageAlt] = useState(alt);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const lazyLoad = useLazyLoad(lazyLoadOptions);

  // Load image when visible
  useEffect(() => {
    if (lazyLoad.isVisible && src) {
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
        setImageAlt(alt);
        setIsLoaded(true);
        setHasError(false);
      };
      
      img.onerror = () => {
        setHasError(true);
        setIsLoaded(false);
        if (fallback) {
          setImageSrc(fallback);
        }
      };
      
      img.src = src;
    }
  }, [lazyLoad.isVisible, src, alt, fallback]);

  return {
    ...lazyLoad,
    isLoaded,
    hasError,
    imageSrc,
    imageAlt,
  };
}
