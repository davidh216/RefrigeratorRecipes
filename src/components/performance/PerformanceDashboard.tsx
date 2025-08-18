'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

interface PerformanceMetrics {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
  memoryUsage?: number; // Memory usage in MB
  domContentLoaded?: number; // DOM Content Loaded time
  longTasks?: Array<{ duration: number; startTime: number }>;
}

interface PerformanceDashboardProps {
  className?: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className = '',
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Listen for performance metrics from PerformanceMonitor
    const handleMetric = (event: CustomEvent) => {
      const { name, value } = event.detail;
      setMetrics(prev => ({
        ...prev,
        [name]: value,
      }));
    };

    window.addEventListener('performance-metric', handleMetric as EventListener);
    
    return () => {
      window.removeEventListener('performance-metric', handleMetric as EventListener);
    };
  }, []);

  // Get performance score for a metric
  const getScore = (metric: keyof PerformanceMetrics, value?: number): { score: number; color: string; label: string } => {
    if (!value) return { score: 0, color: 'gray', label: 'No data' };

    const thresholds = {
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return { score: 100, color: 'green', label: 'Good' };

    if (value <= threshold.good) {
      return { score: 100, color: 'green', label: 'Good' };
    } else if (value <= threshold.poor) {
      return { score: 50, color: 'yellow', label: 'Needs improvement' };
    } else {
      return { score: 0, color: 'red', label: 'Poor' };
    }
  };

  // Calculate overall performance score
  const overallScore = React.useMemo(() => {
    const scores = ['FCP', 'LCP', 'FID', 'CLS'].map(metric => {
      const value = metrics[metric as keyof PerformanceMetrics] as number;
      return getScore(metric as keyof PerformanceMetrics, value).score;
    }).filter(score => score > 0);

    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [metrics]);

  const overallColor = overallScore >= 90 ? 'green' : overallScore >= 50 ? 'yellow' : 'red';
  const overallLabel = overallScore >= 90 ? 'Excellent' : overallScore >= 50 ? 'Good' : 'Poor';

  // Format time values
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Format memory usage
  const formatMemory = (mb: number) => {
    if (mb < 1024) return `${Math.round(mb)}MB`;
    return `${(mb / 1024).toFixed(1)}GB`;
  };

  if (!isVisible) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-white/90 backdrop-blur-sm"
        >
          📊 Performance
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-80 ${className}`}>
      <Card className="bg-white/95 backdrop-blur-sm border shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Performance Dashboard</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={overallColor as any} className="text-xs">
                {overallScore}/100
              </Badge>
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                {isExpanded ? '−' : '+'}
              </Button>
              <Button
                onClick={() => setIsVisible(false)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </div>
          <div className="text-xs text-gray-600">
            Overall: <span className={`font-medium text-${overallColor}-600`}>{overallLabel}</span>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            <Tabs defaultValue="web-vitals" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="web-vitals" className="text-xs">Web Vitals</TabsTrigger>
                <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="web-vitals" className="space-y-3">
                {/* Web Vitals */}
                {(['FCP', 'LCP', 'FID', 'CLS', 'TTFB'] as const).map((metric) => {
                  const value = metrics[metric];
                  const { score, color, label } = getScore(metric, value);
                  
                  return (
                    <div key={metric} className="flex items-center justify-between text-xs">
                      <span className="font-medium">{metric}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">
                          {metric === 'CLS' ? value?.toFixed(3) : value ? formatTime(value) : 'N/A'}
                        </span>
                        <Badge variant={color as any} className="text-xs">
                          {label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="details" className="space-y-3">
                {/* Memory Usage */}
                {metrics.memoryUsage && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">Memory Usage</span>
                    <span className="text-gray-600">{formatMemory(metrics.memoryUsage)}</span>
                  </div>
                )}

                {/* DOM Content Loaded */}
                {metrics.domContentLoaded && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">DOM Ready</span>
                    <span className="text-gray-600">{formatTime(metrics.domContentLoaded)}</span>
                  </div>
                )}

                {/* Long Tasks */}
                {metrics.longTasks && metrics.longTasks.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium">Long Tasks ({metrics.longTasks.length})</div>
                    {metrics.longTasks.slice(0, 3).map((task, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Task {index + 1}</span>
                        <span className="text-gray-600">{formatTime(task.duration)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Performance Tips */}
                <div className="mt-4 p-2 bg-blue-50 rounded text-xs">
                  <div className="font-medium text-blue-800 mb-1">Performance Tips:</div>
                  <ul className="text-blue-700 space-y-1">
                    {overallScore < 90 && (
                      <li>• Optimize images and use WebP format</li>
                    )}
                    {metrics.LCP && metrics.LCP > 2500 && (
                      <li>• Reduce server response time</li>
                    )}
                    {metrics.CLS && metrics.CLS > 0.1 && (
                      <li>• Set explicit dimensions for images</li>
                    )}
                    {metrics.FID && metrics.FID > 100 && (
                      <li>• Break up long JavaScript tasks</li>
                    )}
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
