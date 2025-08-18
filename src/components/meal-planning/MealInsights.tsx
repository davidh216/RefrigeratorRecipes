'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MealSlot, MealType, Recipe } from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Flex,
  Grid,
  Badge,
  Progress,
} from '@/components/ui';

interface MealInsightsProps {
  meals: MealSlot[];
  className?: string;
}

interface MealStats {
  totalMeals: number;
  plannedMeals: number;
  unplannedMeals: number;
  uniqueRecipes: number;
  avgPrepTime: number;
  avgCookTime: number;
  totalCost: number;
  mealsByType: Record<MealType, number>;
  cuisineDistribution: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  cookingTimeHeatmap: Record<string, number>;
  ingredientFrequency: Record<string, number>;
  topRecipes: Array<{ recipe: Recipe; count: number }>;
  weeklyProgress: {
    planned: number;
    total: number;
    percentage: number;
  };
}

const getCuisineFromRecipe = (recipe: Recipe): string => {
  return recipe.cuisine || 'Other';
};

const getDifficultyLevel = (recipe: Recipe): string => {
  return recipe.difficulty || 'unknown';
};

const getCookingTimeSlot = (recipe: Recipe): string => {
  const totalTime = recipe.prepTime + recipe.cookTime;
  if (totalTime <= 15) return '0-15 min';
  if (totalTime <= 30) return '15-30 min';
  if (totalTime <= 45) return '30-45 min';
  if (totalTime <= 60) return '45-60 min';
  return '60+ min';
};

const getIngredientFrequency = (meals: MealSlot[]): Record<string, number> => {
  const frequency: Record<string, number> = {};
  
  meals.forEach(meal => {
    if (meal.recipe) {
      meal.recipe.ingredients.forEach(ingredient => {
        const name = ingredient.name.toLowerCase();
        frequency[name] = (frequency[name] || 0) + 1;
      });
    }
  });
  
  return frequency;
};

const getTopRecipes = (meals: MealSlot[]): Array<{ recipe: Recipe; count: number }> => {
  const recipeCounts: Record<string, { recipe: Recipe; count: number }> = {};
  
  meals.forEach(meal => {
    if (meal.recipe) {
      const recipeId = meal.recipe.id;
      if (recipeCounts[recipeId]) {
        recipeCounts[recipeId].count++;
      } else {
        recipeCounts[recipeId] = { recipe: meal.recipe, count: 1 };
      }
    }
  });
  
  return Object.values(recipeCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};

export const MealInsights: React.FC<MealInsightsProps> = ({
  meals,
  className,
}) => {
  const stats = useMemo((): MealStats => {
    const plannedMeals = meals.filter(meal => meal.recipe);
    const unplannedMeals = meals.filter(meal => !meal.recipe);
    const uniqueRecipes = new Set(plannedMeals.map(meal => meal.recipe!.id)).size;
    
    // Calculate averages
    const totalPrepTime = plannedMeals.reduce((sum, meal) => sum + (meal.recipe?.prepTime || 0), 0);
    const totalCookTime = plannedMeals.reduce((sum, meal) => sum + (meal.recipe?.cookTime || 0), 0);
    const avgPrepTime = plannedMeals.length > 0 ? totalPrepTime / plannedMeals.length : 0;
    const avgCookTime = plannedMeals.length > 0 ? totalCookTime / plannedMeals.length : 0;
    
    // Estimate total cost (rough calculation)
    const totalCost = plannedMeals.reduce((sum, meal) => {
      const baseCost = meal.recipe?.metadata?.estimatedCost || 0;
      const servings = meal.servings || meal.recipe?.servings || 1;
      return sum + (baseCost * servings);
    }, 0);
    
    // Meals by type
    const mealsByType = plannedMeals.reduce((acc, meal) => {
      acc[meal.mealType] = (acc[meal.mealType] || 0) + 1;
      return acc;
    }, {} as Record<MealType, number>);
    
    // Cuisine distribution
    const cuisineDistribution = plannedMeals.reduce((acc, meal) => {
      const cuisine = getCuisineFromRecipe(meal.recipe!);
      acc[cuisine] = (acc[cuisine] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Difficulty distribution
    const difficultyDistribution = plannedMeals.reduce((acc, meal) => {
      const difficulty = getDifficultyLevel(meal.recipe!);
      acc[difficulty] = (acc[difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Cooking time heatmap
    const cookingTimeHeatmap = plannedMeals.reduce((acc, meal) => {
      const timeSlot = getCookingTimeSlot(meal.recipe!);
      acc[timeSlot] = (acc[timeSlot] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Ingredient frequency
    const ingredientFrequency = getIngredientFrequency(plannedMeals);
    
    // Top recipes
    const topRecipes = getTopRecipes(plannedMeals);
    
    // Weekly progress
    const weeklyProgress = {
      planned: plannedMeals.length,
      total: meals.length,
      percentage: meals.length > 0 ? (plannedMeals.length / meals.length) * 100 : 0,
    };
    
    return {
      totalMeals: meals.length,
      plannedMeals: plannedMeals.length,
      unplannedMeals: unplannedMeals.length,
      uniqueRecipes,
      avgPrepTime,
      avgCookTime,
      totalCost,
      mealsByType,
      cuisineDistribution,
      difficultyDistribution,
      cookingTimeHeatmap,
      ingredientFrequency,
      topRecipes,
      weeklyProgress,
    };
  }, [meals]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'hard': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCuisineColor = (cuisine: string) => {
    const colors = [
      'text-blue-600 bg-blue-50 border-blue-200',
      'text-green-600 bg-green-50 border-green-200',
      'text-purple-600 bg-purple-50 border-purple-200',
      'text-orange-600 bg-orange-50 border-orange-200',
      'text-red-600 bg-red-50 border-red-200',
      'text-indigo-600 bg-indigo-50 border-indigo-200',
    ];
    const index = cuisine.length % colors.length;
    return colors[index];
  };

  const topIngredients = Object.entries(stats.ingredientFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <div className={className}>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Meal Planning Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Weekly Progress */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Weekly Progress</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Planning Completion</span>
                <span className="text-sm text-gray-600">
                  {stats.weeklyProgress.planned} of {stats.weeklyProgress.total} meals
                </span>
              </div>
              <Progress 
                value={stats.weeklyProgress.percentage} 
                className="h-3"
              />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{stats.plannedMeals}</p>
                  <p className="text-sm text-blue-700">Planned</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{stats.unplannedMeals}</p>
                  <p className="text-sm text-orange-700">Unplanned</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats.uniqueRecipes}</p>
                  <p className="text-sm text-green-700">Unique Recipes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Key Metrics</h3>
            <Grid cols={2} responsive={{ lg: 4 }} className="gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-800">{Math.round(stats.avgPrepTime)}m</p>
                <p className="text-sm text-gray-600">Avg Prep Time</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-800">{Math.round(stats.avgCookTime)}m</p>
                <p className="text-sm text-gray-600">Avg Cook Time</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-800">${Math.round(stats.totalCost)}</p>
                <p className="text-sm text-gray-600">Est. Total Cost</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-800">{Math.round((stats.avgPrepTime + stats.avgCookTime))}m</p>
                <p className="text-sm text-gray-600">Avg Total Time</p>
              </div>
            </Grid>
          </div>

          {/* Meal Type Distribution */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Meal Type Distribution</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(mealType => (
                <div key={mealType} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">
                    {mealType === 'breakfast' && '🍳'}
                    {mealType === 'lunch' && '🥗'}
                    {mealType === 'dinner' && '🍽️'}
                    {mealType === 'snack' && '🍎'}
                  </div>
                  <p className="text-lg font-bold text-gray-800">
                    {stats.mealsByType[mealType] || 0}
                  </p>
                  <p className="text-sm text-gray-600 capitalize">{mealType}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cuisine Distribution */}
          {Object.keys(stats.cuisineDistribution).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cuisine Distribution</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.cuisineDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cuisine, count]) => (
                    <Badge
                      key={cuisine}
                      variant="outline"
                      className={`${getCuisineColor(cuisine)}`}
                    >
                      {cuisine} ({count})
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {/* Difficulty Distribution */}
          {Object.keys(stats.difficultyDistribution).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Difficulty Distribution</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.difficultyDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([difficulty, count]) => (
                    <Badge
                      key={difficulty}
                      variant="outline"
                      className={`${getDifficultyColor(difficulty)}`}
                    >
                      {difficulty} ({count})
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {/* Cooking Time Heatmap */}
          {Object.keys(stats.cookingTimeHeatmap).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cooking Time Distribution</h3>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {Object.entries(stats.cookingTimeHeatmap)
                  .sort(([, a], [, b]) => b - a)
                  .map(([timeSlot, count]) => (
                    <div key={timeSlot} className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-gray-800">{count}</p>
                      <p className="text-sm text-gray-600">{timeSlot}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Top Ingredients */}
          {topIngredients.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Most Used Ingredients</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {topIngredients.map(([ingredient, count]) => (
                  <div key={ingredient} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium capitalize">
                      {ingredient.replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Recipes */}
          {stats.topRecipes.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Most Planned Recipes</h3>
              <div className="space-y-3">
                {stats.topRecipes.map(({ recipe, count }, index) => (
                  <motion.div
                    key={recipe.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm font-bold text-primary-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{recipe.title}</p>
                        <p className="text-sm text-gray-600">
                          {recipe.prepTime + recipe.cookTime}min • {recipe.difficulty}
                        </p>
                      </div>
                    </div>
                    <Badge variant="primary" className="text-sm">
                      {count} time{count > 1 ? 's' : ''}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Tracking */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Progress Tracking</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Meal Planning</span>
                  <span className="text-sm text-gray-600">
                    {Math.round(stats.weeklyProgress.percentage)}%
                  </span>
                </div>
                <Progress value={stats.weeklyProgress.percentage} className="h-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Recipe Variety</span>
                  <span className="text-sm text-gray-600">
                    {Math.round((stats.uniqueRecipes / stats.plannedMeals) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={stats.plannedMeals > 0 ? (stats.uniqueRecipes / stats.plannedMeals) * 100 : 0} 
                  className="h-2" 
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
