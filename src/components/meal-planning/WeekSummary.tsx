import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, Button, Flex } from '@/components/ui';

interface WeekSummaryProps {
  weeklySummary: {
    plannedMeals: number;
    totalMeals: number;
    ingredientsNeeded: any[];
  };
  onGenerateShoppingList: () => void;
  onExportMealPlan: () => void;
}

export const WeekSummary: React.FC<WeekSummaryProps> = ({
  weeklySummary,
  onGenerateShoppingList,
  onExportMealPlan,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200 shadow-lg">
        <CardContent className="p-6">
          <Flex 
            align="center" 
            justify="between" 
            className="flex-col lg:flex-row gap-6 lg:gap-0"
          >
            <div className="text-center lg:text-left">
              <h3 className="text-xl font-semibold text-primary-900 mb-2">
                Week Summary
              </h3>
              <p className="text-primary-700 text-lg">
                {weeklySummary.plannedMeals} of {weeklySummary.totalMeals} meals planned
                {weeklySummary.ingredientsNeeded.length > 0 && 
                  ` • ${weeklySummary.ingredientsNeeded.length} ingredients needed`
                }
              </p>
            </div>
            
            <Flex className="gap-4 flex-col sm:flex-row w-full lg:w-auto">
              {weeklySummary.ingredientsNeeded.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={onGenerateShoppingList}
                  className="w-full sm:w-auto px-8 py-3 text-base"
                >
                  🛒 Generate Shopping List
                </Button>
              )}
              <Button 
                variant="primary" 
                onClick={onExportMealPlan}
                className="w-full sm:w-auto px-8 py-3 text-base"
              >
                📄 Export Meal Plan
              </Button>
            </Flex>
          </Flex>
        </CardContent>
      </Card>
    </motion.div>
  );
};
