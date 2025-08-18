'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, CardContent } from '@/components/ui';
import { clsx } from 'clsx';

interface EmptyStatesProps {
  type: 'week' | 'recipes' | 'search' | 'meal-plan';
  onAction?: () => void;
  className?: string;
}

interface Tip {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const WEEK_TIPS: Tip[] = [
  {
    id: '1',
    title: 'Start with Breakfast',
    description: 'Plan your morning meals first - they set the tone for your day!',
    icon: '🍳',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200'
  },
  {
    id: '2',
    title: 'Batch Cook Weekends',
    description: 'Prepare multiple meals on Sunday to save time during the week.',
    icon: '👨‍🍳',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
  },
  {
    id: '3',
    title: 'Mix Up Your Proteins',
    description: 'Rotate between chicken, fish, beans, and tofu for variety.',
    icon: '🥩',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
  },
  {
    id: '4',
    title: 'Plan Around Leftovers',
    description: 'Use dinner leftovers for next day\'s lunch to reduce waste.',
    icon: '♻️',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200'
  }
];

const SAMPLE_MEALS = [
  { name: 'Overnight Oats', time: '5 min', difficulty: 'Easy', icon: '🥣' },
  { name: 'Grilled Chicken Salad', time: '20 min', difficulty: 'Medium', icon: '🥗' },
  { name: 'Pasta Primavera', time: '25 min', difficulty: 'Easy', icon: '🍝' },
  { name: 'Greek Yogurt Bowl', time: '3 min', difficulty: 'Easy', icon: '🍯' },
];

const EmptyWeekState: React.FC<{ onAction?: () => void }> = ({ onAction }) => {
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % WEEK_TIPS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center space-y-6"
    >
      {/* Main Illustration */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative"
      >
        <div className="text-8xl mb-4">📅</div>
        <motion.div
          animate={{ 
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            repeatType: "reverse" 
          }}
          className="absolute -top-2 -right-2 text-2xl"
        >
          ✨
        </motion.div>
      </motion.div>

      {/* Content */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Your Week is Empty!
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Start planning your meals for the week. Drag recipes from the library or click to add them to your meal slots.
        </p>
      </div>

      {/* Action Button */}
      {onAction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button 
            size="lg" 
            onClick={onAction}
            className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
          >
            🚀 Get Started
          </Button>
        </motion.div>
      )}

      {/* Tips Carousel */}
      <div className="mt-8">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          💡 Planning Tips
        </h4>
        <div className="relative h-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTip}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className={clsx(
                "absolute inset-0 flex items-center justify-center p-4 rounded-lg",
                WEEK_TIPS[currentTip].color
              )}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{WEEK_TIPS[currentTip].icon}</div>
                <h5 className="font-semibold text-sm">{WEEK_TIPS[currentTip].title}</h5>
                <p className="text-xs opacity-90">{WEEK_TIPS[currentTip].description}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Tip Indicators */}
        <div className="flex justify-center gap-2 mt-3">
          {WEEK_TIPS.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentTip(index)}
              className={clsx(
                "w-2 h-2 rounded-full transition-colors",
                index === currentTip 
                  ? "bg-primary-500" 
                  : "bg-gray-300 dark:bg-gray-600"
              )}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>
      </div>

      {/* Sample Meals */}
      <div className="mt-8">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          🍽️ Quick Start Ideas
        </h4>
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          {SAMPLE_MEALS.map((meal, index) => (
            <motion.div
              key={meal.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
            >
              <div className="text-center">
                <div className="text-xl mb-1">{meal.icon}</div>
                <h5 className="font-medium text-xs text-gray-900 dark:text-gray-100">
                  {meal.name}
                </h5>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {meal.time} • {meal.difficulty}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const EmptyRecipesState: React.FC<{ onAction?: () => void }> = ({ onAction }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center space-y-6"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-8xl"
      >
        📚
      </motion.div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          No Recipes Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Try adjusting your search terms or browse all available recipes to find what you're looking for.
        </p>
      </div>

      {onAction && (
        <Button variant="outline" onClick={onAction}>
          Browse All Recipes
        </Button>
      )}
    </motion.div>
  );
};

const EmptySearchState: React.FC<{ onAction?: () => void }> = ({ onAction }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center space-y-6"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-8xl"
      >
        🔍
      </motion.div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          No Results Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          We couldn't find any recipes matching your search. Try different keywords or browse our recipe collection.
        </p>
      </div>

      {onAction && (
        <Button variant="outline" onClick={onAction}>
          Clear Search
        </Button>
      )}
    </motion.div>
  );
};

const EmptyMealPlanState: React.FC<{ onAction?: () => void }> = ({ onAction }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center space-y-6"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-8xl"
      >
        🎯
      </motion.div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Start Meal Planning
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Create your first meal plan to organize your weekly meals and make grocery shopping easier.
        </p>
      </div>

      {onAction && (
        <Button size="lg" onClick={onAction}>
          Create Meal Plan
        </Button>
      )}
    </motion.div>
  );
};

export const EmptyStates: React.FC<EmptyStatesProps> = ({
  type,
  onAction,
  className
}) => {
  const getEmptyState = () => {
    switch (type) {
      case 'week':
        return <EmptyWeekState onAction={onAction} />;
      case 'recipes':
        return <EmptyRecipesState onAction={onAction} />;
      case 'search':
        return <EmptySearchState onAction={onAction} />;
      case 'meal-plan':
        return <EmptyMealPlanState onAction={onAction} />;
      default:
        return <EmptyWeekState onAction={onAction} />;
    }
  };

  return (
    <Card className={clsx('p-8', className)}>
      <CardContent className="p-0">
        {getEmptyState()}
      </CardContent>
    </Card>
  );
};
