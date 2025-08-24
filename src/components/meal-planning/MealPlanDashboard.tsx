'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { WeeklyMealPlanSummary, MealType } from '@/types';
import { LazyFloatingAgentButton } from '@/components/agents/LazyAgentInterface';
import { AGENT_FEATURES } from '@/lib/feature-flags';
import { useMealPlan } from '@/hooks';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Flex,
  Grid,
  Button,
  Divider,
} from '@/components/ui';
import { clsx } from 'clsx';

interface MealPlanDashboardProps {
  summary: WeeklyMealPlanSummary;
  weekStart: Date;
  onGenerateShoppingList?: () => void;
  onExportMealPlan?: () => void;
  className?: string;
  showAgentFeatures?: boolean;
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

interface MealTypeBreakdownProps {
  mealsByType: Record<MealType, number>;
  totalMeals: number;
}

interface IngredientListProps {
  ingredients: string[];
  onGenerateShoppingList?: () => void;
}

const getVariantStyles = (variant: StatCardProps['variant'] = 'default'): string => {
  const styles = {
    default: 'bg-gray-50 border-gray-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    error: 'bg-red-50 border-red-200',
  };
  return styles[variant];
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={clsx(getVariantStyles(variant), className)}>
        <CardContent className="p-4">
          <Flex align="center" justify="between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <motion.p 
                className="text-2xl font-bold text-gray-900"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                {value}
              </motion.p>
              {subtitle && (
                <p className="text-xs text-gray-500">{subtitle}</p>
              )}
            </div>
            {icon && (
              <motion.div 
                className="text-3xl opacity-60"
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  repeatType: "reverse" 
                }}
              >
                {icon}
              </motion.div>
            )}
          </Flex>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const MealTypeBreakdown: React.FC<MealTypeBreakdownProps> = ({
  mealsByType,
  totalMeals,
}) => {
  const mealTypeInfo = [
    { type: 'breakfast' as MealType, label: 'Breakfast', emoji: '🍳', color: 'bg-orange-500' },
    { type: 'lunch' as MealType, label: 'Lunch', emoji: '🥗', color: 'bg-green-500' },
    { type: 'dinner' as MealType, label: 'Dinner', emoji: '🍽️', color: 'bg-blue-500' },
    { type: 'snack' as MealType, label: 'Snacks', emoji: '🍎', color: 'bg-purple-500' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meal Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mealTypeInfo.map((meal) => {
            const count = mealsByType[meal.type] || 0;
            const percentage = totalMeals > 0 ? (count / totalMeals) * 100 : 0;
            
            return (
              <div key={meal.type} className="space-y-2">
                <Flex align="center" justify="between">
                  <Flex align="center" className="gap-2">
                    <span className="text-lg">{meal.emoji}</span>
                    <span className="font-medium text-gray-700">{meal.label}</span>
                  </Flex>
                  <span className="text-sm text-gray-600">
                    {count} meal{count !== 1 ? 's' : ''}
                  </span>
                </Flex>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={clsx('h-2 rounded-full transition-all duration-300', meal.color)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                
                <p className="text-xs text-gray-500">
                  {percentage.toFixed(1)}% of total meals
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const IngredientList: React.FC<IngredientListProps> = ({
  ingredients,
  onGenerateShoppingList,
}) => {
  const displayedIngredients = ingredients.slice(0, 8);
  const remainingCount = ingredients.length - displayedIngredients.length;

  return (
    <Card>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle>Ingredients Needed</CardTitle>
          {onGenerateShoppingList && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onGenerateShoppingList}
            >
              Generate Shopping List
            </Button>
          )}
        </Flex>
      </CardHeader>
      <CardContent>
        {ingredients.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No ingredients needed for planned meals
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {ingredients.length} unique ingredient{ingredients.length !== 1 ? 's' : ''} required
            </p>
            
            <div className="flex flex-wrap gap-2">
              {displayedIngredients.map((ingredient, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {ingredient}
                </Badge>
              ))}
              
              {remainingCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  +{remainingCount} more
                </Badge>
              )}
            </div>
            
            {onGenerateShoppingList && ingredients.length > 0 && (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={onGenerateShoppingList}
                className="w-full mt-4"
              >
                Create Shopping List ({ingredients.length} items)
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const MealPlanDashboard: React.FC<MealPlanDashboardProps> = ({
  summary,
  weekStart,
  onGenerateShoppingList,
  onExportMealPlan,
  className,
  showAgentFeatures = true,
}) => {
  // Get meal plan agent features
  const { 
    mealPlanSuggestions, 
    mealPlanInsights, 
    dismissPlanSuggestion, 
    enableMealPlanAgent 
  } = useMealPlan();
  const formatWeekRange = (start: Date): string => {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return `${start.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })} - ${end.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })}`;
  };

  const completionPercentage = summary.totalMeals > 0 
    ? (summary.plannedMeals / summary.totalMeals) * 100 
    : 0;

  const getCompletionVariant = (): StatCardProps['variant'] => {
    if (completionPercentage >= 80) return 'success';
    if (completionPercentage >= 50) return 'warning';
    return 'error';
  };

  return (
    <>
      <motion.div 
        className={clsx('space-y-6', className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Agent Suggestions */}
        {showAgentFeatures && enableMealPlanAgent && mealPlanSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="mr-2">🤖</span>
                Meal Planning Insights
              </h3>
              <Badge variant="outline">
                {mealPlanSuggestions.length} suggestion{mealPlanSuggestions.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="space-y-2">
              {mealPlanSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="flex items-start justify-between bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {suggestion.type === 'recipe-suggestion' && <span className="text-blue-500">🍽️</span>}
                      {suggestion.type === 'nutrition-balance' && <span className="text-green-500">🥗</span>}
                      {suggestion.type === 'ingredient-usage' && <span className="text-orange-500">🥕</span>}
                      {suggestion.type === 'variety-suggestion' && <span className="text-purple-500">🌮</span>}
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {suggestion.type.replace('-', ' ')}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">{suggestion.message}</p>
                  </div>
                  <button
                    onClick={() => dismissPlanSuggestion(suggestion.id)}
                    className="text-gray-400 hover:text-gray-600 ml-3"
                    title="Dismiss suggestion"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Dashboard Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <Flex align="center" justify="between">
              <div>
                <CardTitle>Meal Plan Overview</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Week of {formatWeekRange(weekStart)}
                </p>
              </div>
              
              <Flex className="gap-2 flex-col sm:flex-row">
                {onExportMealPlan && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button variant="outline" onClick={onExportMealPlan} className="w-full sm:w-auto">
                      Export Plan
                    </Button>
                  </motion.div>
                )}
                {onGenerateShoppingList && summary.ingredientsNeeded.length > 0 && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    data-tour="shopping-list"
                  >
                    <Button variant="primary" onClick={onGenerateShoppingList} className="w-full sm:w-auto">
                      Shopping List
                    </Button>
                  </motion.div>
                )}
              </Flex>
            </Flex>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Grid 
          cols={4} 
          responsive={{ sm: 1, md: 2, lg: 4 }}
          className="gap-4"
        >
          <StatCard
            title="Meal Completion"
            value={`${completionPercentage.toFixed(0)}%`}
            subtitle={`${summary.plannedMeals} of ${summary.totalMeals} meals planned`}
            icon="📅"
            variant={getCompletionVariant()}
          />
          
          <StatCard
            title="Total Recipes"
            value={summary.totalRecipes}
            subtitle={`${summary.uniqueRecipes} unique recipes`}
            icon="📖"
          />
          
          <StatCard
            title="Ingredients Needed"
            value={summary.ingredientsNeeded.length}
            subtitle="for all planned meals"
            icon="🛒"
          />
          
          <StatCard
            title="Unplanned Meals"
            value={summary.unplannedMeals}
            subtitle="need recipes assigned"
            icon="❓"
            variant={summary.unplannedMeals > 0 ? 'warning' : 'success'}
          />
        </Grid>
      </motion.div>

      {/* Detailed Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Grid 
          cols={2} 
          responsive={{ sm: 1, lg: 2 }}
          className="gap-6"
        >
        <MealTypeBreakdown 
          mealsByType={summary.mealsByType}
          totalMeals={summary.totalMeals}
        />
        
        <IngredientList 
          ingredients={summary.ingredientsNeeded}
          onGenerateShoppingList={onGenerateShoppingList}
        />
        </Grid>
      </motion.div>

      {/* Planning Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Planning Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Flex align="center" justify="between" className="mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Meal Planning Completion
                </span>
                <span className="text-sm text-gray-600">
                  {summary.plannedMeals}/{summary.totalMeals} meals
                </span>
              </Flex>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={clsx(
                    'h-3 rounded-full transition-all duration-500',
                    completionPercentage >= 80 ? 'bg-green-500' :
                    completionPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            {summary.unplannedMeals > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">
                    {summary.unplannedMeals} meal{summary.unplannedMeals !== 1 ? 's' : ''} still need recipes assigned.
                  </span>
                  {' '}Add recipes from the library to complete your meal plan.
                </p>
              </div>
            )}

            {summary.plannedMeals === summary.totalMeals && summary.totalMeals > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <span className="font-medium">Great job!</span>
                  {' '}Your meal plan is complete with all {summary.totalMeals} meals planned.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>

    {/* Floating Agent Button */}
    {showAgentFeatures && enableMealPlanAgent && AGENT_FEATURES.floatingButton && (
      <LazyFloatingAgentButton
        initialContext="meal-planning"
        notificationCount={mealPlanSuggestions.length}
        showNotifications={true}
      />
    )}
    </>
  );
};