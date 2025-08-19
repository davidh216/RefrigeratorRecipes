import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui';

type ViewMode = 'calendar' | 'dashboard' | 'recipes' | 'templates' | 'insights';

interface MealPlanningViewTabsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const MealPlanningViewTabs: React.FC<MealPlanningViewTabsProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex justify-center sm:justify-start"
    >
      <Tabs value={viewMode} onValueChange={(value) => onViewModeChange(value as ViewMode)}>
        <TabsList className="grid w-full max-w-md grid-cols-5 sm:w-auto sm:grid-cols-none sm:inline-flex">
          <TabsTrigger value="calendar" className="flex items-center gap-2 px-4 py-3">
            <span className="text-lg">📅</span>
            <span className="hidden sm:inline font-medium">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2 px-4 py-3">
            <span className="text-lg">📊</span>
            <span className="hidden sm:inline font-medium">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="recipes" className="flex items-center gap-2 px-4 py-3">
            <span className="text-lg">📖</span>
            <span className="hidden sm:inline font-medium">Recipes</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2 px-4 py-3">
            <span className="text-lg">📋</span>
            <span className="hidden sm:inline font-medium">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2 px-4 py-3">
            <span className="text-lg">📈</span>
            <span className="hidden sm:inline font-medium">Insights</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </motion.div>
  );
};
