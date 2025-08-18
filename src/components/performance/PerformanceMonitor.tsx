'use client';

import { useEffect } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

interface PerformanceMonitorProps {
  // Optional callback for custom metric handling
  onMetric?: (metric: any) => void;
}

export function PerformanceMonitor({ onMetric }: PerformanceMonitorProps) {
  useEffect(() => {
    // Function to send metrics to analytics or console
    const sendMetric = (metric: any) => {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Web Vital:', metric.name, metric.value);
      }

      // Send to analytics service in production
      if (process.env.NODE_ENV === 'production') {
        // Example: Send to Google Analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', metric.name, {
            value: Math.round(metric.value),
            metric_id: metric.id,
            metric_value: metric.value,
            metric_delta: metric.delta,
          });
        }

        // Example: Send to custom analytics endpoint
        fetch('/api/metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: metric.name,
            value: metric.value,
            id: metric.id,
            delta: metric.delta,
            navigationType: metric.navigationType,
            timestamp: Date.now(),
          }),
        }).catch(console.error);
      }

      // Call custom handler if provided
      if (onMetric) {
        onMetric(metric);
      }
    };

    // Track Core Web Vitals
    getCLS(sendMetric);
    getFID(sendMetric);
    getFCP(sendMetric);
    getLCP(sendMetric);
    getTTFB(sendMetric);

    // Track custom performance metrics
    const trackCustomMetrics = () => {
      // Track memory usage
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        sendMetric({
          name: 'memory-usage',
          value: memory.usedJSHeapSize / 1024 / 1024, // MB
          id: 'memory-usage',
          delta: 0,
        });
      }

      // Track DOM content loaded time
      if (document.readyState === 'complete') {
        const domContentLoaded = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (domContentLoaded) {
          sendMetric({
            name: 'dom-content-loaded',
            value: domContentLoaded.domContentLoadedEventEnd - domContentLoaded.domContentLoadedEventStart,
            id: 'dom-content-loaded',
            delta: 0,
          });
        }
      }
    };

    // Track metrics after page load
    if (document.readyState === 'complete') {
      trackCustomMetrics();
    } else {
      window.addEventListener('load', trackCustomMetrics);
    }

    // Track long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            sendMetric({
              name: 'long-task',
              value: entry.duration,
              id: 'long-task',
              delta: 0,
              startTime: entry.startTime,
            });
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    }

    return () => {
      window.removeEventListener('load', trackCustomMetrics);
    };
  }, [onMetric]);

  return null; // This component doesn't render anything
}
