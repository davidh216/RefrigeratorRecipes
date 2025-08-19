import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';

interface MealPlanningHeaderProps {
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
}

export const MealPlanningHeader: React.FC<MealPlanningHeaderProps> = ({
  isDemoMode,
  onToggleDemoMode,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-center sm:text-left">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
          Meal Planning
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mt-3">
          Plan your weekly meals, discover recipes, and create shopping lists
        </p>
      </div>
      
      {/* Demo Mode Toggle */}
      <div className="mt-4 flex justify-center sm:justify-start">
        <Button
          variant={isDemoMode ? "primary" : "outline"}
          onClick={onToggleDemoMode}
          className="text-sm"
        >
          {isDemoMode ? "🔄 Exit Demo Mode" : "🎮 Enable Demo Mode"}
        </Button>
      </div>
    </motion.div>
  );
};
