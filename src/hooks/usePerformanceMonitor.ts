import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  domNodes: number;
  reflows: number;
  repaints: number;
}

interface UsePerformanceMonitorOptions {
  enabled?: boolean;
  onMetrics?: (metrics: PerformanceMetrics) => void;
  threshold?: number; // Minimum render time to report
}

export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
  const { enabled = true, onMetrics, threshold = 16 } = options;
  const renderStartRef = useRef<number>(0);
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    domNodes: 0,
    reflows: 0,
    repaints: 0,
  });

  // Start measuring render time
  const startMeasure = useCallback(() => {
    if (!enabled) return;
    renderStartRef.current = performance.now();
  }, [enabled]);

  // End measuring and collect metrics
  const endMeasure = useCallback(() => {
    if (!enabled) return;

    const renderTime = performance.now() - renderStartRef.current;
    
    // Only report if render time exceeds threshold
    if (renderTime < threshold) return;

    // Collect performance metrics
    const metrics: PerformanceMetrics = {
      renderTime,
      domNodes: document.querySelectorAll('*').length,
      reflows: 0, // Would need to be tracked separately
      repaints: 0, // Would need to be tracked separately
    };

    // Get memory usage if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
    }

    metricsRef.current = metrics;

    // Report metrics
    if (onMetrics) {
      onMetrics(metrics);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Performance warning:', {
        renderTime: `${renderTime.toFixed(2)}ms`,
        domNodes: metrics.domNodes,
        memoryUsage: metrics.memoryUsage ? `${metrics.memoryUsage.toFixed(1)}MB` : 'N/A',
      });
    }
  }, [enabled, threshold, onMetrics]);

  // Set up performance observer for long tasks
  useEffect(() => {
    if (!enabled || !('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) { // Tasks longer than 50ms
          console.warn('Long task detected:', {
            duration: `${entry.duration.toFixed(2)}ms`,
            startTime: `${entry.startTime.toFixed(2)}ms`,
            name: entry.name,
          });
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });

    return () => observer.disconnect();
  }, [enabled]);

  return {
    startMeasure,
    endMeasure,
    metrics: metricsRef.current,
  };
}

// Hook for measuring component render performance
export function useRenderPerformance(componentName: string, options?: UsePerformanceMonitorOptions) {
  const { startMeasure, endMeasure } = usePerformanceMonitor({
    ...options,
    onMetrics: (metrics) => {
      if (options?.onMetrics) {
        options.onMetrics(metrics);
      }
      
      // Send to analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'component_render', {
          component_name: componentName,
          render_time: Math.round(metrics.renderTime),
          dom_nodes: metrics.domNodes,
          memory_usage: metrics.memoryUsage ? Math.round(metrics.memoryUsage) : undefined,
        });
      }
    },
  });

  useEffect(() => {
    startMeasure();
    
    // Use requestAnimationFrame to measure after render
    const rafId = requestAnimationFrame(() => {
      endMeasure();
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  });
}

// Hook for measuring async operations
export function useAsyncPerformance(operationName: string) {
  const startTimeRef = useRef<number>(0);

  const startOperation = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const endOperation = useCallback((success: boolean = true) => {
    const duration = performance.now() - startTimeRef.current;
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`${operationName} took ${duration.toFixed(2)}ms (${success ? 'success' : 'failed'})`);
    }

    // Send to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'async_operation', {
        operation_name: operationName,
        duration: Math.round(duration),
        success,
      });
    }
  }, [operationName]);

  return {
    startOperation,
    endOperation,
  };
}
