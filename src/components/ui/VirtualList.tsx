import React, { useRef, useEffect, useState } from 'react';
import { useVirtualScroll } from '@/hooks/useVirtualScroll';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  scrollToIndex?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
  renderItem,
  className = '',
  onScroll,
  scrollToIndex,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerElement, setContainerElement] = useState<HTMLElement | null>(null);

  const {
    virtualItems,
    totalSize,
    scrollTop,
    setScrollTop,
    scrollToIndex: scrollToVirtualIndex,
  } = useVirtualScroll(items.length, {
    itemHeight,
    containerHeight,
    overscan,
    scrollElement: containerElement,
  });

  // Set up container element
  useEffect(() => {
    if (containerRef.current) {
      setContainerElement(containerRef.current);
    }
  }, []);

  // Handle scroll events
  useEffect(() => {
    if (onScroll) {
      onScroll(scrollTop);
    }
  }, [scrollTop, onScroll]);

  // Scroll to specific index
  useEffect(() => {
    if (scrollToIndex !== undefined && scrollToIndex >= 0 && scrollToIndex < items.length) {
      scrollToVirtualIndex(scrollToIndex);
    }
  }, [scrollToIndex, scrollToVirtualIndex, items.length]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{
        height: containerHeight,
        position: 'relative',
      }}
    >
      <div
        style={{
          height: totalSize,
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          if (!item) return null;

          return (
            <div
              key={virtualItem.index}
              style={{
                position: 'absolute',
                top: virtualItem.offsetTop,
                height: virtualItem.size,
                width: '100%',
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
