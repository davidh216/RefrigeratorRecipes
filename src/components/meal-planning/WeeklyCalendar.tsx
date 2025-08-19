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
  onMealSlotClick: (slotId: string) => void;
  onRecipeDrop: (slotId: string, recipe: Recipe) => void;
  onRemoveRecipe: (slotId: string) => void;
  onNavigateWeek?: (direction: 'prev' | 'next') => void;
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
  'Sunday',
  'Monday',
  'Tuesday', 
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
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
  const [showDropSuccess, setShowDropSuccess] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set drag over to false if we're actually leaving the element
    // This prevents flickering when moving between child elements
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
          // Show success feedback
          setShowDropSuccess(true);
          setTimeout(() => setShowDropSuccess(false), 1000);
        }
      }
    } catch (error) {
      console.error('Error parsing dropped recipe data:', error);
      // Try alternative data formats
      try {
        const alternativeData = e.dataTransfer.getData('application/json');
        if (alternativeData) {
          const recipeData = JSON.parse(alternativeData);
          if (recipeData && recipeData.recipe) {
            onRecipeDrop(recipeData.recipe);
          }
        }
      } catch (altError) {
        console.error('Error parsing alternative recipe data:', altError);
      }
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
        className="relative"
      >
        {/* Extended drop zone for better drag and drop experience */}
        <div 
          className={clsx(
            "absolute inset-0 -m-2 z-10 rounded-lg transition-all duration-200",
            isDragOver && "bg-primary-100/50 border-2 border-dashed border-primary-400"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
        <Card
          className={clsx(
            'w-20 h-20 cursor-pointer transition-all duration-200 hover:shadow-lg flex',
            'relative overflow-hidden group border-2',
            meal.recipe 
              ? 'border-primary-300 bg-gradient-to-br from-primary-50 to-white shadow-md' 
              : 'border-dashed border-gray-300 bg-gray-50 hover:border-primary-300 hover:bg-primary-50/30',
            isDragOver && 'ring-4 ring-primary-400 bg-primary-100 scale-110 border-primary-400 shadow-xl',
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

          {/* Success Drop Overlay */}
          {showDropSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="absolute inset-0 bg-green-200/80 flex items-center justify-center z-20 rounded-lg"
            >
              <div className="text-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.5, 1],
                    rotate: [0, 360]
                  }}
                  transition={{ duration: 0.6 }}
                  className="text-3xl mb-2"
                >
                  ✅
                </motion.div>
                <p className="text-green-800 font-semibold text-sm">Added!</p>
              </div>
            </motion.div>
          )}

          <CardContent className="p-2 flex-1 relative z-10 flex items-center justify-center">
            {meal.recipe ? (
              <motion.div 
                className="text-center flex items-center justify-center h-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <p className="text-xs font-medium text-gray-900 leading-tight">
                  {meal.recipe.title}
                </p>
              </motion.div>
            ) : (
              <motion.div 
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="text-2xl text-gray-400 group-hover:text-primary-400 transition-colors">+</div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  Drop recipe
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
            </CardContent>
          </Card>
        </motion.div>
      </>
    );
  };

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  weekStart,
  meals,
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
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    slotId: string;
  } | null>(null);



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
    <div className={clsx('space-y-4 border border-gray-300 rounded-lg p-4 h-[575px] overflow-hidden flex flex-col', className)}>
      {/* Calendar Grid - Scrollable */}
      <motion.div 
        className="space-y-4 flex-1 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Day Headers with Navigation */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mb-2"
        >
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => onNavigateWeek?.('prev')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Previous week"
            >
              <span className="text-xl">←</span>
            </button>
            <div className="text-sm font-medium text-gray-600">
              {formatWeekRange(weekStart)}
            </div>
            <button
              onClick={() => onNavigateWeek?.('next')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Next week"
            >
              <span className="text-xl">→</span>
            </button>
          </div>
        </motion.div>

        {/* Meal Rows */}
                 <AnimatePresence mode="wait">
                         <motion.div
                 key={weekStart.toISOString()}
                 initial={{ opacity: 0, x: -50 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 50 }}
                 transition={{ duration: 0.3 }}
                 className="space-y-8"
               >
                                 {/* Multi-select controls - Hidden for now */}
                 {/* {isMultiSelectMode && (
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

                 {/* Multi-select toggle - Hidden for now */}
                 {/* {!isMultiSelectMode && (
                   <div className="flex justify-end">
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={toggleMultiSelectMode}
                     >
                       ☑️ Multi-select
                     </Button>
                   </div>
                 )} */}
            <div className="grid grid-cols-8 gap-4">
              {/* Empty corner cell */}
              <div className="w-20 h-8"></div>
              
              {/* Day headers in the top row */}
              {DAYS_OF_WEEK.map((day, index) => {
                const date = getDateForDay(index);
                const today = isToday(date);
                return (
                  <div key={day} className="text-center flex flex-col justify-center w-20">
                    <div className={clsx(
                      "text-sm font-semibold",
                      today ? "text-primary-600" : "text-gray-600"
                    )}>
                      {day}
                    </div>
                    <div className={clsx(
                      "text-xs text-gray-500",
                      today && "text-primary-500 font-medium"
                    )}>
                      {date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                );
              })}
              
              {/* Meal rows with headers */}
              {MEAL_TYPES.map((mealTypeInfo, rowIndex) => (
                <React.Fragment key={mealTypeInfo.type}>
                  {/* Row header */}
                  <motion.div 
                    className="flex items-center justify-center"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + rowIndex * 0.1 }}
                  >
                    <Flex align="center" className="gap-2">
                      <motion.span 
                        className="text-lg"
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: rowIndex * 0.5 }}
                      >
                        {mealTypeInfo.emoji}
                      </motion.span>
                      <h4 className="font-semibold text-gray-700 text-sm">{mealTypeInfo.label}</h4>
                    </Flex>
                  </motion.div>
                  
                  {/* Meal slots for this row */}
                  {DAYS_OF_WEEK.map((_, dayIndex) => {
                    const meal = getMealsForDateAndType(dayIndex, mealTypeInfo.type);
                    const slotId = meal?.id || `empty-${dayIndex}-${mealTypeInfo.type}`;
                    
                    return (
                      <motion.div
                        key={`${dayIndex}-${mealTypeInfo.type}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + rowIndex * 0.1 + dayIndex * 0.05 }}
                        className="flex justify-center w-20"
                      >
                        <MealSlotCard
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
                      </motion.div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};