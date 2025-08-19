import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface UseVirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside the visible area
  scrollElement?: HTMLElement | null;
}

interface UseVirtualScrollReturn {
  virtualItems: Array<{
    index: number;
    start: number;
    end: number;
    size: number;
    offsetTop: number;
  }>;
  totalSize: number;
  scrollTop: number;
  setScrollTop: (scrollTop: number) => void;
  scrollToIndex: (index: number) => void;
  scrollToOffset: (offset: number) => void;
}

export function useVirtualScroll(
  itemCount: number,
  options: UseVirtualScrollOptions
): UseVirtualScrollReturn {
  const { itemHeight, containerHeight, overscan = 5, scrollElement } = options;
  
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLElement | null>(scrollElement);

  // Calculate total size
  const totalSize = useMemo(() => itemCount * itemHeight, [itemCount, itemHeight]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );

    const overscanStart = Math.max(0, start - overscan);
    const overscanEnd = Math.min(itemCount - 1, end + overscan);

    return { start: overscanStart, end: overscanEnd };
  }, [scrollTop, containerHeight, itemHeight, itemCount, overscan]);

  // Generate virtual items
  const virtualItems = useMemo(() => {
    const items = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight,
        size: itemHeight,
        offsetTop: i * itemHeight,
      });
    }
    return items;
  }, [visibleRange, itemHeight]);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    const newScrollTop = index * itemHeight;
    setScrollTop(newScrollTop);
    
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTop = newScrollTop;
    }
  }, [itemHeight]);

  // Scroll to specific offset
  const scrollToOffset = useCallback((offset: number) => {
    setScrollTop(offset);
    
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTop = offset;
    }
  }, []);

  // Handle scroll events
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Set up scroll listener
  useEffect(() => {
    const element = scrollElementRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Update scroll element ref
  useEffect(() => {
    scrollElementRef.current = scrollElement;
  }, [scrollElement]);

  return {
    virtualItems,
    totalSize,
    scrollTop,
    setScrollTop,
    scrollToIndex,
    scrollToOffset,
  };
}
