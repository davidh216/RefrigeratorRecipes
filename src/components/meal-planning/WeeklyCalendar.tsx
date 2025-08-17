'use client';

import React, { useState } from 'react';
import { MealSlot, MealType, Recipe } from '@/types';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button,
  Badge,
  Flex,
  Grid,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter
} from '@/components/ui';
import { clsx } from 'clsx';

interface WeeklyCalendarProps {
  weekStart: Date;
  meals: MealSlot[];
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onMealSlotClick: (slotId: string) => void;
  onRecipeDrop: (slotId: string, recipe: Recipe) => void;
  onRemoveRecipe: (slotId: string) => void;
  className?: string;
}

interface MealSlotCardProps {
  meal: MealSlot;
  onClick: () => void;
  onRecipeDrop: (recipe: Recipe) => void;
  onRemoveRecipe: () => void;
  className?: string;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday', 
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const MEAL_TYPES: { type: MealType; label: string; emoji: string }[] = [
  { type: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { type: 'lunch', label: 'Lunch', emoji: '🥗' },
  { type: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { type: 'snack', label: 'Snack', emoji: '🍎' },
];

const getMealTypeColor = (mealType: MealType): string => {
  const colors = {
    breakfast: 'bg-orange-50 border-orange-200 text-orange-800',
    lunch: 'bg-green-50 border-green-200 text-green-800',
    dinner: 'bg-blue-50 border-blue-200 text-blue-800',
    snack: 'bg-purple-50 border-purple-200 text-purple-800',
  };
  return colors[mealType];
};

const MealSlotCard: React.FC<MealSlotCardProps> = ({
  meal,
  onClick,
  onRecipeDrop,
  onRemoveRecipe,
  className,
}) => {
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const recipeData = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (recipeData && recipeData.recipe) {
        onRecipeDrop(recipeData.recipe);
      }
    } catch (error) {
      console.error('Error parsing dropped recipe data:', error);
    }
  };

  const mealTypeInfo = MEAL_TYPES.find(m => m.type === meal.mealType);

  return (
    <>
      <Card
        className={clsx(
          'h-20 sm:h-24 cursor-pointer transition-all duration-200 hover:shadow-md',
          getMealTypeColor(meal.mealType),
          isDragOver && 'ring-2 ring-primary-400 bg-primary-50',
          meal.recipe && 'border-l-4 border-l-primary-500',
          className
        )}
        onClick={onClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-1 sm:p-2 h-full">
          <Flex direction="column" className="h-full justify-between">
            <Flex align="center" className="gap-1 mb-1">
              <span className="text-xs">{mealTypeInfo?.emoji}</span>
              <span className="text-xs font-medium truncate hidden sm:block">
                {mealTypeInfo?.label}
              </span>
              <span className="text-xs font-medium truncate sm:hidden">
                {mealTypeInfo?.label.slice(0, 4)}
              </span>
            </Flex>
            
            {meal.recipe ? (
              <div className="flex-1 min-h-0">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {meal.recipe.title}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {meal.servings || meal.recipe.servings} servings
                </p>
                {meal.notes && (
                  <p className="text-xs text-gray-500 truncate">
                    {meal.notes}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-gray-400 text-center">
                  <span className="hidden sm:block">Drop recipe here or click to add</span>
                  <span className="sm:hidden">Tap to add</span>
                </p>
              </div>
            )}
          </Flex>
        </CardContent>
      </Card>

      {/* Recipe Details Modal */}
      {showRecipeModal && meal.recipe && (
        <Modal 
          isOpen={showRecipeModal} 
          onClose={() => setShowRecipeModal(false)}
        >
          <ModalHeader>
            <ModalTitle>{meal.recipe.title}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <p className="text-gray-600">{meal.recipe.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Prep Time:</span> {meal.recipe.prepTime} min
                </div>
                <div>
                  <span className="font-medium">Cook Time:</span> {meal.recipe.cookTime} min
                </div>
                <div>
                  <span className="font-medium">Servings:</span> {meal.servings || meal.recipe.servings}
                </div>
                <div>
                  <span className="font-medium">Difficulty:</span> {meal.recipe.difficulty}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Ingredients:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {meal.recipe.ingredients.map((ingredient, index) => (
                    <li key={index}>{ingredient}</li>
                  ))}
                </ul>
              </div>

              {meal.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes:</h4>
                  <p className="text-sm text-gray-600">{meal.notes}</p>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRecipeModal(false)}
            >
              Close
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                onRemoveRecipe();
                setShowRecipeModal(false);
              }}
            >
              Remove Recipe
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
};

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  weekStart,
  meals,
  onNavigateWeek,
  onMealSlotClick,
  onRecipeDrop,
  onRemoveRecipe,
  className,
}) => {
  const formatWeekRange = (start: Date): string => {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const startStr = start.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const endStr = end.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    return `${startStr} - ${endStr}`;
  };

  const getMealsForDateAndType = (dayIndex: number, mealType: MealType): MealSlot | undefined => {
    const targetDate = new Date(weekStart);
    targetDate.setDate(weekStart.getDate() + dayIndex);
    
    return meals.find(meal => {
      const mealDate = new Date(meal.date);
      return mealDate.toDateString() === targetDate.toDateString() && 
             meal.mealType === mealType;
    });
  };

  const getDateForDay = (dayIndex: number): Date => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    return date;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <Flex align="center" justify="between" className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => onNavigateWeek('prev')}
              className="px-3 w-full sm:w-auto order-2 sm:order-1"
            >
              <span className="hidden sm:inline">← Previous Week</span>
              <span className="sm:hidden">← Previous</span>
            </Button>
            
            <CardTitle className="text-lg sm:text-xl font-semibold text-center order-1 sm:order-2">
              {formatWeekRange(weekStart)}
            </CardTitle>
            
            <Button 
              variant="outline" 
              onClick={() => onNavigateWeek('next')}
              className="px-3 w-full sm:w-auto order-3"
            >
              <span className="hidden sm:inline">Next Week →</span>
              <span className="sm:hidden">Next →</span>
            </Button>
          </Flex>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <div className="space-y-4">
        {/* Day Headers */}
        <Grid 
          cols={7} 
          responsive={{ sm: 1, md: 7 }}
          className="gap-2 md:gap-4"
        >
          {DAYS_OF_WEEK.map((day, index) => {
            const date = getDateForDay(index);
            const today = isToday(date);
            
            return (
              <Card 
                key={day} 
                className={clsx(
                  'text-center py-3',
                  today && 'bg-primary-50 border-primary-200'
                )}
              >
                <CardContent className="p-0">
                  <h3 className={clsx(
                    'font-medium text-sm',
                    today ? 'text-primary-700' : 'text-gray-700'
                  )}>
                    {day}
                  </h3>
                  <p className={clsx(
                    'text-xs mt-1',
                    today ? 'text-primary-600' : 'text-gray-500'
                  )}>
                    {date.getDate()}
                  </p>
                  {today && (
                    <Badge variant="primary" className="mt-1 text-xs">
                      Today
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Grid>

        {/* Meal Rows */}
        {MEAL_TYPES.map((mealTypeInfo) => (
          <div key={mealTypeInfo.type} className="space-y-2">
            <Flex align="center" className="gap-2 px-1">
              <span className="text-lg">{mealTypeInfo.emoji}</span>
              <h4 className="font-medium text-gray-700">{mealTypeInfo.label}</h4>
            </Flex>
            
            <Grid 
              cols={7} 
              responsive={{ sm: 1, md: 7 }}
              className="gap-2 md:gap-4"
            >
              {DAYS_OF_WEEK.map((_, dayIndex) => {
                const meal = getMealsForDateAndType(dayIndex, mealTypeInfo.type);
                
                return (
                  <MealSlotCard
                    key={`${dayIndex}-${mealTypeInfo.type}`}
                    meal={meal || {
                      id: `empty-${dayIndex}-${mealTypeInfo.type}`,
                      date: getDateForDay(dayIndex),
                      mealType: mealTypeInfo.type,
                    }}
                    onClick={() => meal && onMealSlotClick(meal.id)}
                    onRecipeDrop={(recipe) => meal && onRecipeDrop(meal.id, recipe)}
                    onRemoveRecipe={() => meal && onRemoveRecipe(meal.id)}
                  />
                );
              })}
            </Grid>
          </div>
        ))}
      </div>
    </div>
  );
};