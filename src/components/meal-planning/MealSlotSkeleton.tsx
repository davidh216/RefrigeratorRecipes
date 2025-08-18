'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui';
import { clsx } from 'clsx';

interface MealSlotSkeletonProps {
  className?: string;
  variant?: 'default' | 'compact';
}

const shimmerAnimation = {
  initial: { opacity: 0.5 },
  animate: { 
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const ShimmerElement: React.FC<{ className?: string; width?: string }> = ({ 
  className, 
  width = "100%" 
}) => (
  <motion.div
    className={clsx(
      "bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded",
      "dark:from-gray-700 dark:via-gray-600 dark:to-gray-700",
      className
    )}
    style={{ width }}
    variants={shimmerAnimation}
    initial="initial"
    animate="animate"
  />
);

export const MealSlotSkeleton: React.FC<MealSlotSkeletonProps> = ({
  className,
  variant = 'default'
}) => {
  const isCompact = variant === 'compact';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card className={clsx(
        'h-20 sm:h-24 border-dashed border-2 border-gray-200 dark:border-gray-700',
        'bg-gray-50 dark:bg-gray-800',
        className
      )}>
        <CardContent className="p-1 sm:p-2 h-full">
          <div className="h-full flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center gap-1 mb-1">
              <ShimmerElement className="w-4 h-4 rounded-full" />
              <ShimmerElement 
                className="h-3 rounded" 
                width={isCompact ? "60%" : "70%"} 
              />
            </div>
            
            {/* Content */}
            <div className="flex-1 flex flex-col justify-center space-y-2">
              <ShimmerElement className="h-3 rounded" width="90%" />
              <ShimmerElement className="h-2 rounded" width="60%" />
              {!isCompact && (
                <ShimmerElement className="h-2 rounded" width="40%" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const MealSlotSkeletonGrid: React.FC<{
  rows?: number;
  cols?: number;
  variant?: 'default' | 'compact';
  className?: string;
}> = ({ 
  rows = 4, 
  cols = 7, 
  variant = 'default',
  className 
}) => {
  return (
    <div className={clsx('space-y-4', className)}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <motion.div
          key={rowIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.4, 
            delay: rowIndex * 0.1,
            ease: "easeOut"
          }}
          className="space-y-2"
        >
          {/* Row Header */}
          <div className="flex items-center gap-2 px-1">
            <ShimmerElement className="w-6 h-6 rounded-full" />
            <ShimmerElement className="h-4 rounded" width="120px" />
          </div>
          
          {/* Skeleton Grid */}
          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <MealSlotSkeleton 
                key={colIndex} 
                variant={variant}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export const WeeklyCalendarSkeleton: React.FC<{ className?: string }> = ({ 
  className 
}) => {
  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header Skeleton */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <ShimmerElement className="h-8 rounded" width="120px" />
            <div className="flex gap-2">
              <ShimmerElement className="h-8 rounded" width="80px" />
              <ShimmerElement className="h-8 rounded" width="80px" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Day Headers Skeleton */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-7 gap-2 md:gap-4"
      >
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
            <ShimmerElement className="h-4 rounded mb-1" width="60%" />
            <ShimmerElement className="h-3 rounded" width="40%" />
          </div>
        ))}
      </motion.div>

      {/* Meal Slots Skeleton */}
      <MealSlotSkeletonGrid />
    </div>
  );
};
