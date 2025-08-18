'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  onSwapMeals?: (slotId1: string, slotId2: string) => void;
  onMultiSelect?: (slotIds: string[]) => void;
  onBulkOperation?: (operation: 'copy' | 'delete' | 'move', slotIds: string[]) => void;
  selectedSlots?: string[];
  isLoading?: boolean;
  className?: string;
}

interface MealSlotCardProps {
  meal: MealSlot;
  onClick: () => void;
  onRecipeDrop: (recipe: Recipe) => void;
  onRemoveRecipe: () => void;
  onSwap?: (targetSlotId: string) => void;
  onSelect?: (selected: boolean) => void;
  isSelected?: boolean;
  isMultiSelectMode?: boolean;
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
  onSwap,
  onSelect,
  isSelected = false,
  isMultiSelectMode = false,
  className,
}) => {
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

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
        if (isShiftPressed && onSwap && recipeData.sourceSlotId) {
          // Swap mode - exchange meals between slots
          onSwap(recipeData.sourceSlotId);
        } else {
          // Normal drop mode
          onRecipeDrop(recipeData.recipe);
        }
      }
    } catch (error) {
      console.error('Error parsing dropped recipe data:', error);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isMultiSelectMode && onSelect) {
      e.preventDefault();
      onSelect(!isSelected);
    } else {
      onClick();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Shift') {
      setIsShiftPressed(true);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Shift') {
      setIsShiftPressed(false);
    }
  };

  const totalTime = meal.recipe ? (meal.recipe.prepTime + meal.recipe.cookTime) : 0;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card
          className={clsx(
            'h-28 sm:h-32 lg:h-36 cursor-pointer transition-all duration-200 hover:shadow-lg',
            'relative overflow-hidden group border-2',
            meal.recipe 
              ? 'border-primary-300 bg-gradient-to-br from-primary-50 to-white shadow-md' 
              : 'border-dashed border-gray-300 bg-gray-50 hover:border-primary-300 hover:bg-primary-50/30',
            isDragOver && 'ring-2 ring-primary-400 bg-primary-100 scale-105 border-primary-400',
            isSelected && 'ring-2 ring-blue-500 bg-blue-50',
            isMultiSelectMode && 'cursor-default',
            className
          )}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          tabIndex={0}
          data-tour="meal-slot"
        >
          {/* Recipe Image Background (if available) */}
          {meal.recipe?.images && meal.recipe.images.length > 0 && (
            <div className="absolute inset-0 opacity-15">
              <img 
                src={meal.recipe.images[0]} 
                alt={meal.recipe.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Gradient Overlay */}
          {meal.recipe && (
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10" />
          )}

          {/* Drag Overlay */}
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-primary-200/50 flex items-center justify-center z-20"
            >
              <div className="text-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-3xl mb-2"
                >
                  🎯
                </motion.div>
                <p className="text-primary-800 font-semibold text-sm">Drop here!</p>
              </div>
            </motion.div>
          )}

          <CardContent className="p-3 h-full relative z-10">
            <Flex direction="col" className="h-full justify-between">
              {/* Content */}
              {meal.recipe ? (
                <motion.div 
                  className="flex-1 min-h-0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <p className="text-sm sm:text-base font-semibold text-gray-900 truncate mb-1">
                    {meal.recipe.title}
                  </p>
                  <p className="text-xs text-gray-600 truncate mb-2">
                    {meal.servings || meal.recipe?.servings || 1} servings
                  </p>
                  
                  {/* Recipe Badges */}
                  <div className="flex flex-wrap gap-1">
                    {totalTime > 0 && (
                      <Badge variant="outline" className="text-xs px-2 py-1">
                        ⏱️ {totalTime}min
                      </Badge>
                    )}
                    <Badge 
                      variant="outline" 
                      className={clsx(
                        "text-xs px-2 py-1",
                        meal.recipe.difficulty === 'easy' && "text-green-600 border-green-300 bg-green-50",
                        meal.recipe.difficulty === 'medium' && "text-yellow-600 border-yellow-300 bg-yellow-50",
                        meal.recipe.difficulty === 'hard' && "text-red-600 border-red-300 bg-red-50"
                      )}
                    >
                      {meal.recipe.difficulty}
                    </Badge>
                  </div>

                  {meal.notes && (
                    <p className="text-xs text-gray-500 truncate mt-2 italic">
                      "{meal.notes}"
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  className="flex-1 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl text-gray-400 mb-1">+</div>
                  </div>
                </motion.div>
              )}

              {/* Selection Indicator */}
              {isMultiSelectMode && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-2 left-2 w-5 h-5 border-2 border-gray-300 rounded-full flex items-center justify-center"
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3 h-3 bg-blue-500 rounded-full"
                    />
                  )}
                </motion.div>
              )}

              {/* Remove Button (only show if has recipe) */}
              {meal.recipe && !isMultiSelectMode && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveRecipe();
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="Remove recipe"
                >
                  ×
                </motion.button>
              )}

              {/* Shift indicator for swap mode */}
              {isShiftPressed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute bottom-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full"
                >
                  SWAP
                </motion.div>
              )}
            </Flex>
          </CardContent>
        </Card>
      </motion.div>
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
  onSwapMeals,
  onMultiSelect,
  onBulkOperation,
  selectedSlots = [],
  isLoading = false,
  className,
}) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    slotId: string;
  } | null>(null);

  const handleNavigateWeek = async (direction: 'prev' | 'next') => {
    setIsNavigating(true);
    await onNavigateWeek(direction);
    setIsNavigating(false);
  };

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

  const getDateForDay = (dayIndex: number): Date => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    return date;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getMealsForDateAndType = (dayIndex: number, mealType: MealType): MealSlot | null => {
    const date = getDateForDay(dayIndex);
    return meals.find(meal => 
      meal.date.toDateString() === date.toDateString() && 
      meal.mealType === mealType
    ) || null;
  };

  const handleSlotSelect = (slotId: string, selected: boolean) => {
    if (onMultiSelect) {
      const newSelection = selected 
        ? [...selectedSlots, slotId]
        : selectedSlots.filter(id => id !== slotId);
      onMultiSelect(newSelection);
    }
  };

  const handleBulkOperation = (operation: 'copy' | 'delete' | 'move') => {
    if (onBulkOperation && selectedSlots.length > 0) {
      onBulkOperation(operation, selectedSlots);
      setShowBulkMenu(false);
      setIsMultiSelectMode(false);
    }
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    if (isMultiSelectMode) {
      // Exit multi-select mode
      if (onMultiSelect) {
        onMultiSelect([]);
      }
    }
  };

  return (
    <div className={clsx('space-y-8', className)}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="shadow-lg">
          <CardHeader className="pb-6">
            <Flex align="center" justify="between" className="flex-col lg:flex-row gap-4 lg:gap-0">
              <Button 
                variant="outline" 
                onClick={() => handleNavigateWeek('prev')}
                disabled={isNavigating}
                className="px-6 py-3 w-full lg:w-auto order-2 lg:order-1"
                data-tour="week-navigation"
              >
                <motion.span 
                  animate={{ x: isNavigating ? [-2, 2, -2] : 0 }}
                  transition={{ duration: 0.5, repeat: isNavigating ? Infinity : 0 }}
                >
                  <span className="hidden sm:inline">← Previous Week</span>
                  <span className="sm:hidden">← Previous</span>
                </motion.span>
              </Button>
              
              <motion.div
                key={weekStart.toISOString()}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <CardTitle className="text-xl lg:text-2xl font-semibold text-center order-1 lg:order-2">
                  {formatWeekRange(weekStart)}
                </CardTitle>
              </motion.div>
              
              <Button 
                variant="outline" 
                onClick={() => handleNavigateWeek('next')}
                disabled={isNavigating}
                className="px-6 py-3 w-full lg:w-auto order-3"
              >
                <motion.span 
                  animate={{ x: isNavigating ? [2, -2, 2] : 0 }}
                  transition={{ duration: 0.5, repeat: isNavigating ? Infinity : 0 }}
                >
                  <span className="hidden sm:inline">Next Week →</span>
                  <span className="sm:hidden">Next →</span>
                </motion.span>
              </Button>
            </Flex>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Calendar Grid */}
      <motion.div 
        className="space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Day Headers */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Grid 
            cols={7} 
            responsive={{ sm: 1, md: 7 }}
            className="gap-3 md:gap-6"
          >
            {DAYS_OF_WEEK.map((day, index) => {
              const date = getDateForDay(index);
              const today = isToday(date);
              
              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                >
                  <Card 
                    className={clsx(
                      'text-center py-4 shadow-md',
                      today && 'bg-primary-50 border-primary-200 ring-2 ring-primary-200'
                    )}
                  >
                    <CardContent className="p-0">
                      <h3 className={clsx(
                        'font-semibold text-sm lg:text-base',
                        today ? 'text-primary-700' : 'text-gray-700'
                      )}>
                        {day}
                      </h3>
                      <p className={clsx(
                        'text-lg lg:text-xl font-bold mt-2',
                        today ? 'text-primary-600' : 'text-gray-500'
                      )}>
                        {date.getDate()}
                      </p>
                      {today && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.6, type: "spring" }}
                        >
                          <Badge variant="primary" className="mt-2 text-xs">
                            Today
                          </Badge>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </Grid>
        </motion.div>

        {/* Meal Rows */}
        <AnimatePresence mode="wait">
                        <motion.div
                key={weekStart.toISOString()}
                initial={{ opacity: 0, x: isNavigating ? 50 : -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isNavigating ? -50 : 50 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Multi-select controls */}
                {isMultiSelectMode && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-blue-800">
                        {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selected
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkOperation('copy')}
                        disabled={selectedSlots.length === 0}
                      >
                        📋 Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkOperation('delete')}
                        disabled={selectedSlots.length === 0}
                      >
                        🗑️ Delete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkOperation('move')}
                        disabled={selectedSlots.length === 0}
                      >
                        📦 Move
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleMultiSelectMode}
                    >
                      ✕ Cancel
                    </Button>
                  </motion.div>
                )}

                {/* Multi-select toggle */}
                {!isMultiSelectMode && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleMultiSelectMode}
                    >
                      ☑️ Multi-select
                    </Button>
                  </div>
                )}
            {MEAL_TYPES.map((mealTypeInfo, rowIndex) => (
              <motion.div 
                key={mealTypeInfo.type} 
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + rowIndex * 0.1 }}
              >
                <Flex align="center" className="gap-3 px-2">
                  <motion.span 
                    className="text-2xl"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: rowIndex * 0.5 }}
                  >
                    {mealTypeInfo.emoji}
                  </motion.span>
                  <h4 className="font-semibold text-gray-700 text-lg">{mealTypeInfo.label}</h4>
                </Flex>
                
                <Grid 
                  cols={7} 
                  responsive={{ sm: 1, md: 7 }}
                  className="gap-3 md:gap-6"
                  data-tour="meal-slots"
                >
                  {DAYS_OF_WEEK.map((_, dayIndex) => {
                    const meal = getMealsForDateAndType(dayIndex, mealTypeInfo.type);
                    const slotId = meal?.id || `empty-${dayIndex}-${mealTypeInfo.type}`;
                    
                    return (
                      <MealSlotCard
                        key={`${dayIndex}-${mealTypeInfo.type}`}
                        meal={meal || {
                          id: slotId,
                          date: getDateForDay(dayIndex),
                          mealType: mealTypeInfo.type,
                        }}
                        onClick={() => onMealSlotClick(slotId)}
                        onRecipeDrop={(recipe) => onRecipeDrop(slotId, recipe)}
                        onRemoveRecipe={() => meal && onRemoveRecipe(meal.id)}
                        onSwap={onSwapMeals ? (targetSlotId) => onSwapMeals(slotId, targetSlotId) : undefined}
                        onSelect={handleSlotSelect ? (selected) => handleSlotSelect(slotId, selected) : undefined}
                        isSelected={selectedSlots.includes(slotId)}
                        isMultiSelectMode={isMultiSelectMode}
                      />
                    );
                  })}
                </Grid>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};