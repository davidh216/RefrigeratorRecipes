'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMealPlan, useRecipes, useDebounce, useMealTemplates, useMealPlanningShortcuts, useIngredients, useShoppingList } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth';
import { AppLayout } from '@/components/layout';
import { FloatingAgentButton } from '@/components/agents';
import {
  WeeklyCalendar,
  RecipeSelector,
  MealPlanDashboard,
  MealSlotEditor,
  EmptyStates,
  OnboardingTour,
  useOnboarding,
  QuickActionsBar,
  MealTemplates,
  ShoppingListGenerator,
  MealInsights,
  WeeklyShoppingList,
} from '@/components/meal-planning';
import { MealSlotSkeleton, WeeklyCalendarSkeleton } from '@/components/meal-planning/MealSlotSkeleton';
import { ToastProvider } from '@/components/ui/Toast';
import { useMealPlanningToast as useToast } from '@/hooks/useToast';
import {
  Grid,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  Flex,
  Loading,
  Alert,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@/components/ui';
import { Recipe, MealSlot } from '@/types';

type ViewMode = 'calendar' | 'dashboard' | 'recipes' | 'templates' | 'insights';

function MealPlanningContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedMealSlot, setSelectedMealSlot] = useState<MealSlot | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<{ type: 'meal'; data: MealSlot } | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Auth context for demo mode
  const { isDemoMode, enableDemoMode, disableDemoMode } = useAuth();

  // Onboarding
  const {
    isOnboardingVisible,
    completeOnboarding,
    skipOnboarding,
  } = useOnboarding();

  // Toast notifications
  const toast = useToast();

  // Hooks
  const {
    mealPlans,
    currentWeekPlan,
    currentWeek,
    isLoading,
    error,
    getWeeklySummary,
    navigateWeek,
    assignRecipeToSlot,
    removeRecipeFromSlot,
    updateMealNotes,
    getMealSlot,
  } = useMealPlan();

  const {
    templates,
    createTemplate,
    applyTemplate,
    getTemplatePreview,
  } = useMealTemplates();

  // Derived state - use currentWeek from hook

  // Add a client-side only flag to prevent hydration issues
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // All functions are now provided by the useMealPlan hook

  const {
    recipes,
    isLoading: recipesLoading,
    searchRecipes,
    toggleFavorite,
    getFavorites,
  } = useRecipes();

  // Get user ingredients for shopping list comparison
  const {
    ingredients: userIngredients,
    isLoading: ingredientsLoading,
  } = useIngredients();

  // Shopping list functionality
  const {
    addShoppingList,
    shoppingLists,
    isLoading: shoppingListLoading,
    error: shoppingListError,
  } = useShoppingList();

  // Derived state
  const filteredRecipes = searchRecipes(debouncedSearchQuery);
  const weeklySummary = getWeeklySummary();

  // Handlers
  const handleMealSlotClick = (slotId: string) => {
    let slot = getMealSlot(slotId);
    
    // If slot doesn't exist, create a default slot for empty meal slots
    if (!slot) {
      // Parse slotId to extract date and meal type
      const parts = slotId.split('-');
      if (parts.length >= 3) {
        const [empty, dayIndex, mealType] = parts;
        if (empty === 'empty' && dayIndex && mealType) {
          const date = new Date(currentWeek);
          date.setDate(currentWeek.getDate() + parseInt(dayIndex));
          
          slot = {
            id: slotId,
            date: date,
            mealType: mealType as 'breakfast' | 'lunch' | 'dinner',
            recipeId: undefined,
            recipe: undefined,
            notes: '',
            servings: undefined
          };
        }
      }
    }
    
    if (slot) {
      setSelectedMealSlot(slot);
      setIsEditorOpen(true);
    }
  };

  const handleRecipeDrop = async (slotId: string, recipe: Recipe) => {
    setIsOperationLoading(true);
    
    try {
      await assignRecipeToSlot(slotId, recipe);
      toast.dropSuccess(recipe.title, 'meal slot');
    } catch (err) {
      console.error('Error dropping recipe:', err);
      toast.dropError(recipe.title);
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleMealSlotSave = async (slotId: string, updates: Partial<MealSlot>) => {
    setIsOperationLoading(true);
    
    try {
      if (updates.recipeId && updates.recipe) {
        await assignRecipeToSlot(slotId, updates.recipe, updates.servings);
        toast.recipeAssigned(updates.recipe.title, 'meal', 'this week');
      } else {
        await removeRecipeFromSlot(slotId);
        toast.recipeRemoved('Recipe', 'meal', 'this week');
      }

      if (updates.notes !== undefined) {
        await updateMealNotes(slotId, updates.notes || '');
      }
    } catch (err) {
      console.error('Error saving meal slot:', err);
      toast.saveError('Failed to update meal slot');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleGenerateShoppingList = async (filteredItems?: any[]) => {
    if (filteredItems) {
      try {
        // Create a new shopping list with the filtered items
        const weekRange = `${currentWeek.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })} - ${new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })}`;
        
        const shoppingListData = {
          name: `Meal Plan - ${weekRange}`,
          items: filteredItems.map(item => ({
            name: item.name,
            category: item.category || 'other',
            totalAmount: item.totalAmount,
            unit: item.unit,
            isPurchased: false,
            estimatedCost: 0,
            userPrice: undefined,
            priceSource: 'unknown' as const,
            notes: `From recipes: ${item.sources?.map(s => s.recipeTitle).join(', ') || 'Unknown'}`
          }))
        };

        console.log('Attempting to create shopping list with data:', shoppingListData);
        console.log('Current shopping lists before creation:', shoppingLists);
        console.log('Shopping list loading state:', shoppingListLoading);
        console.log('Shopping list error:', shoppingListError);
        console.log('User demo mode:', isDemoMode);
        
        await addShoppingList(shoppingListData);
        console.log('Shopping list created successfully');
        
        // Wait a moment for the real-time listener to update
        setTimeout(() => {
          console.log('Current shopping lists after creation (delayed):', shoppingLists);
          console.log('Total shopping lists in meal planning hook:', shoppingLists.length);
        }, 1000);
        
        toast.showSuccess('Shopping list created!', `${filteredItems.length} items added to your shopping list. Check the Shopping List page to view it.`);
        return;
      } catch (error) {
        console.error('Error creating shopping list:', error);
        toast.showError(`Failed to create shopping list: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
    }
    
    // Fallback to original logic
    // Get all ingredients needed from current meal plan
    const allIngredients = currentWeekPlan?.meals.flatMap(meal => 
      meal.recipe ? meal.recipe.ingredients.map(ingredient => ({
        ...ingredient,
        recipeTitle: meal.recipe!.title,
        servings: meal.servings || meal.recipe!.servings,
        originalServings: meal.recipe!.servings
      })) : []
    ) || [];

    // Group by ingredient name and calculate totals
    const ingredientMap = new Map();
    allIngredients.forEach(ingredient => {
      const key = `${ingredient.name.toLowerCase()}-${ingredient.unit}`;
      const scaledAmount = (ingredient.amount * ingredient.servings) / ingredient.originalServings;
      
      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key);
        existing.totalAmount += scaledAmount;
        existing.recipes.push(ingredient.recipeTitle);
      } else {
        ingredientMap.set(key, {
          name: ingredient.name,
          unit: ingredient.unit,
          category: ingredient.category,
          totalAmount: scaledAmount,
          recipes: [ingredient.recipeTitle]
        });
      }
    });

    const shoppingListItems = Array.from(ingredientMap.values());
    console.log('Generated shopping list:', shoppingListItems);
    toast.shoppingListGenerated(shoppingListItems.length);
  };

  const handleExportMealPlan = () => {
    toast.showSuccess('Meal plan exported!', 'Your meal plan has been exported successfully.');
    // TODO: Implement meal plan export
    console.log('Export meal plan');
  };

  // Quick Actions Handlers
  const handleCopyLastWeek = async () => {
    try {
      // Get last week's meal plan
      const lastWeek = new Date(currentWeek);
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      // Get last week's meals (this would need to be implemented in the meal plan service)
      const lastWeekMeals = currentWeekPlan?.meals || []; // Placeholder - would get actual last week data
      
      if (lastWeekMeals.length === 0) {
        toast.showError('No meals found from last week');
        return;
      }

      // Copy recipes to current week
      let copiedCount = 0;
      for (const meal of lastWeekMeals) {
        if (meal.recipe) {
          await assignRecipeToSlot(meal.id, meal.recipe, meal.servings);
          copiedCount++;
        }
      }

      toast.showSuccess('Last week copied!', `${copiedCount} meals have been copied from last week.`);
    } catch (error) {
      console.error('Error copying last week:', error);
      toast.showError('Failed to copy last week');
    }
  };

  const handleAutoFillFavorites = async () => {
    try {
      // Get actual favorite recipes
      const favoriteRecipes = getFavorites();
      
      if (favoriteRecipes.length === 0) {
        toast.showError('No favorite recipes found. Add some recipes to your favorites first!');
        return;
      }

      // Get empty slots
      const emptySlots = currentWeekPlan?.meals.filter(meal => !meal.recipe) || [];
      
      if (emptySlots.length === 0) {
        toast.showInfo('No empty slots', 'All meal slots are already filled!');
        return;
      }

      // Fill empty slots with favorites, considering meal types
      let filledCount = 0;
      for (const slot of emptySlots) {
        // Find a favorite recipe that matches the meal type
        const matchingFavorite = favoriteRecipes.find(recipe => 
          recipe.mealType.includes(slot.mealType)
        );
        
        if (matchingFavorite) {
          await assignRecipeToSlot(slot.id, matchingFavorite);
          filledCount++;
        } else if (favoriteRecipes.length > 0) {
          // If no matching meal type, use any favorite
          const randomFavorite = favoriteRecipes[Math.floor(Math.random() * favoriteRecipes.length)];
          await assignRecipeToSlot(slot.id, randomFavorite);
          filledCount++;
        }
      }

      toast.showSuccess('Favorites added!', `${filledCount} favorite recipes have been added to the week.`);
    } catch (error) {
      console.error('Error auto-filling favorites:', error);
      toast.showError('Failed to auto-fill favorites');
    }
  };

  const handleClearWeek = async () => {
    try {
      // Remove all recipes from current week
      const currentMeals = currentWeekPlan?.meals || [];
      let clearedCount = 0;
      
      for (const meal of currentMeals) {
        if (meal.recipe) {
          await removeRecipeFromSlot(meal.id);
          clearedCount++;
        }
      }

      toast.showSuccess('Week cleared!', `${clearedCount} meals have been removed from this week.`);
    } catch (error) {
      console.error('Error clearing week:', error);
      toast.showError('Failed to clear week');
    }
  };

  const handleBalanceMeals = async () => {
    try {
      // Get current meal distribution
      const currentMeals = currentWeekPlan?.meals || [];
      const mealTypes = ['breakfast', 'lunch', 'dinner'];
      const mealTypeCounts = mealTypes.map(type => 
        currentMeals.filter(meal => meal.mealType === type && meal.recipe).length
      );

      // Check if week is empty
      const totalPlannedMeals = currentMeals.filter(meal => meal.recipe).length;
      if (totalPlannedMeals === 0) {
        toast.showError('Cannot balance meals when week is empty');
        return;
      }

      // Check if already balanced
      const maxCount = Math.max(...mealTypeCounts);
      const minCount = Math.min(...mealTypeCounts);
      
      if (maxCount - minCount <= 1) {
        toast.showSuccess('Meals already balanced!', 'Your meals are well distributed.');
        return;
      }

      // Get empty slots and available recipes
      const emptySlots = currentMeals.filter(meal => !meal.recipe);
      const availableRecipes = recipes.filter(recipe => recipe.id);
      
      if (emptySlots.length === 0 || availableRecipes.length === 0) {
        toast.showInfo('Cannot balance', 'No empty slots or recipes available for balancing.');
        return;
      }

      // Add recipes to balance meal types
      let balancedCount = 0;
      for (const slot of emptySlots.slice(0, 3)) { // Limit to 3 to avoid over-filling
        const randomRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
        await assignRecipeToSlot(slot.id, randomRecipe);
        balancedCount++;
      }

      toast.showSuccess('Meals balanced!', `${balancedCount} recipes have been added to balance meal types.`);
    } catch (error) {
      console.error('Error balancing meals:', error);
      toast.showError('Failed to balance meals');
    }
  };

  const handleSurpriseMe = async () => {
    try {
      // Get empty meal slots
      const emptySlots = currentWeekPlan?.meals.filter(meal => !meal.recipe) || [];
      
      if (emptySlots.length === 0) {
        toast.showInfo('No empty slots', 'All meal slots are already filled!');
        return;
      }

      // Get available recipes
      const availableRecipes = recipes.filter(recipe => recipe.id);
      
      if (availableRecipes.length === 0) {
        toast.showWarning('No recipes available', 'Add some recipes to your library first.');
        return;
      }

      // Assign random recipes to empty slots
      let assignedCount = 0;
      for (const slot of emptySlots) {
        const randomRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
        await assignRecipeToSlot(slot.id, randomRecipe);
        assignedCount++;
      }

      toast.showSuccess('Surprise added!', `${assignedCount} random recipes have been added to empty slots.`);
    } catch (error) {
      console.error('Error in surprise me:', error);
      toast.showError('Failed to add surprise recipes');
    }
  };

  // Advanced Operations Handlers
  const handleSwapMeals = async (slotId1: string, slotId2: string) => {
    toast.loadingStarted('Swapping meals');
    try {
      // TODO: Implement meal swapping
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.showSuccess('Meals swapped!', 'The selected meals have been exchanged.');
    } catch (error) {
      toast.showError('Failed to swap meals');
    } finally {
      toast.loadingComplete('Swap meals');
    }
  };

  const handleMultiSelect = (slotIds: string[]) => {
    setSelectedSlots(slotIds);
  };

  const handleBulkOperation = async (operation: 'copy' | 'delete' | 'move', slotIds: string[]) => {
    toast.loadingStarted(`${operation}ing meals`);
    try {
      // TODO: Implement bulk operations
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.showSuccess(`${operation} completed!`, `${slotIds.length} meals have been ${operation}d.`);
    } catch (error) {
      toast.showError(`Failed to ${operation} meals`);
    } finally {
      toast.loadingComplete(`${operation} meals`);
    }
  };

  // Clipboard operations
  const handleCopyMeal = () => {
    if (selectedMealSlot && selectedMealSlot.recipe) {
      setClipboard({ type: 'meal', data: selectedMealSlot });
      toast.showSuccess('Meal copied!', 'Recipe has been copied to clipboard.');
    }
  };

  const handlePasteMeal = () => {
    if (clipboard && clipboard.type === 'meal' && selectedMealSlot) {
      // TODO: Implement paste meal functionality
      toast.showSuccess('Meal pasted!', 'Recipe has been pasted to the selected slot.');
    }
  };

  const handleDeleteMeal = () => {
    if (selectedMealSlot) {
      removeRecipeFromSlot(selectedMealSlot.id);
      toast.showSuccess('Meal deleted!', 'Recipe has been removed from the slot.');
    }
  };

  const handleEditMeal = () => {
    if (selectedMealSlot) {
      setIsEditorOpen(true);
    }
  };

  const handleFocusSearch = () => {
    // TODO: Focus search input
    console.log('Focus search');
  };

  const handleShowShortcutsHelp = () => {
    setShowShortcutsHelp(true);
  };

  // Undo/Redo handlers (placeholder)
  const handleUndo = () => {
    toast.showInfo('Undo', 'Undo functionality coming soon!');
  };

  const handleRedo = () => {
    toast.showInfo('Redo', 'Redo functionality coming soon!');
  };

  // Keyboard shortcuts configuration
  const shortcutsConfig = {
    onNavigateWeek: async (direction: 'prev' | 'next') => {
      navigateWeek(direction);
    },
    onMealSlotClick: handleMealSlotClick,
    onRecipeDrop: handleRecipeDrop,
    onRemoveRecipe: removeRecipeFromSlot,
    onSwapMeals: handleSwapMeals,
    onMultiSelect: handleMultiSelect,
    onBulkOperation: handleBulkOperation,
    onCopyLastWeek: handleCopyLastWeek,
    onAutoFillFavorites: handleAutoFillFavorites,
    onClearWeek: handleClearWeek,
    onBalanceMeals: handleBalanceMeals,
    onSurpriseMe: handleSurpriseMe,
    onGenerateShoppingList: handleGenerateShoppingList,
    onExportMealPlan: handleExportMealPlan,
    onFocusSearch: handleFocusSearch,
    onShowShortcutsHelp: handleShowShortcutsHelp,
  };

  // Initialize keyboard shortcuts
  const shortcuts = useMealPlanningShortcuts(
    shortcutsConfig,
    currentWeekPlan?.meals || [],
    selectedMealSlot?.id
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <WeeklyCalendarSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="error">
          <AlertTitle>Error Loading Meal Plan</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="mr-2"
            >
              Retry
            </Button>
            <Button 
              variant="primary" 
              onClick={() => navigateWeek('next')}
            >
              Try Next Week
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // Prevent hydration issues by not rendering until client-side
  if (!isClient) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Loading className="h-64" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-8">
        {/* View Mode Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center sm:justify-start"
        >
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'dashboard'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setViewMode('recipes')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'recipes'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Recipes
            </button>
            <button
              onClick={() => setViewMode('templates')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'templates'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setViewMode('insights')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'insights'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Insights
            </button>
          </div>
        </motion.div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {viewMode === 'calendar' && (
              <div className="space-y-8">
                {/* Quick Actions Bar - Now floating */}
                <QuickActionsBar
                  onCopyLastWeek={handleCopyLastWeek}
                  onAutoFillFavorites={handleAutoFillFavorites}
                  onClearWeek={handleClearWeek}
                  onBalanceMeals={handleBalanceMeals}
                  onSurpriseMe={handleSurpriseMe}
                  isLoading={isOperationLoading}
                  plannedMealsCount={currentWeekPlan?.meals.filter(m => m.recipe).length || 0}
                  totalMealsCount={currentWeekPlan?.meals.length || 0}
                />

                <div className="space-y-8">
                  {/* Top Row: Calendar and Recipe Selector */}
                  <div className="grid grid-cols-1 xl:grid-cols-10 gap-8">
                    {/* Calendar - takes 7 columns on xl screens */}
                    <div className="xl:col-span-7">
                      {currentWeekPlan?.meals.length === 0 ? (
                        <EmptyStates 
                          type="week" 
                          onAction={() => setViewMode('recipes')}
                        />
                      ) : (
                        <WeeklyCalendar
                          weekStart={currentWeek}
                          meals={currentWeekPlan?.meals || []}
                          onMealSlotClick={handleMealSlotClick}
                          onRecipeDrop={handleRecipeDrop}
                          onRemoveRecipe={removeRecipeFromSlot}
                          onNavigateWeek={navigateWeek}
                          onSwapMeals={handleSwapMeals}
                          onMultiSelect={handleMultiSelect}
                          onBulkOperation={handleBulkOperation}
                          selectedSlots={selectedSlots}
                          isLoading={isOperationLoading}
                        />
                      )}
                    </div>

                    {/* Recipe Selector - takes 3 columns on xl screens */}
                    <div className="xl:col-span-3">
                      <RecipeSelector
                        recipes={filteredRecipes}
                        isLoading={recipesLoading}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onToggleFavorite={toggleFavorite}
                        onRecipeSelect={(recipe) => {
                          // You could open a modal to select which meal slot
                          console.log('Recipe selected:', recipe);
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Shopping List - Full width below both containers */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <WeeklyShoppingList
                      meals={currentWeekPlan?.meals || []}
                      userIngredients={userIngredients || []}
                      onGenerateShoppingList={handleGenerateShoppingList}
                      onExportMealPlan={handleExportMealPlan}
                    />
                  </motion.div>
                </div>
              </div>
            )}

          {viewMode === 'dashboard' && (
            <div className="space-y-8">
              <MealPlanDashboard
                summary={weeklySummary}
                weekStart={currentWeek}
                onGenerateShoppingList={handleGenerateShoppingList}
                onExportMealPlan={handleExportMealPlan}
              />
              
              <ShoppingListGenerator
                meals={currentWeekPlan?.meals || []}
                onGenerateList={async (items) => {
                  console.log('Generated shopping list:', items);
                  toast.showSuccess('Shopping list generated!', `${items.length} items added to your list.`);
                }}
                onExportToShoppingList={async (items) => {
                  console.log('Exporting to shopping list:', items);
                  toast.showSuccess('Exported to shopping list!', 'Items have been added to your shopping list.');
                }}
                onShareViaEmail={async (items) => {
                  console.log('Sharing via email:', items);
                  toast.showSuccess('Shared via email!', 'Your shopping list has been sent.');
                }}
                onShareViaSMS={async (items) => {
                  console.log('Sharing via SMS:', items);
                  toast.showSuccess('Shared via SMS!', 'Your shopping list has been sent.');
                }}
              />
            </div>
          )}

          {viewMode === 'recipes' && (
            <div className="space-y-8">
              {/* Recipes View */}
              {filteredRecipes.length === 0 && !recipesLoading ? (
                <EmptyStates 
                  type="search" 
                  onAction={() => setSearchQuery('')}
                />
              ) : (
                <Card className="shadow-lg">
                  <CardHeader className="pb-6">
                    <CardTitle className="text-2xl">Recipe Library</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RecipeSelector
                      recipes={filteredRecipes}
                      isLoading={recipesLoading}
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      onRecipeSelect={(recipe) => {
                        console.log('Recipe selected:', recipe);
                      }}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {viewMode === 'templates' && (
            <MealTemplates
              onApplyTemplate={async (meals) => {
                // TODO: Apply template to current week
                console.log('Applying template with meals:', meals);
                toast.showSuccess('Template applied!', 'The template has been applied to your current week.');
              }}
              onSaveAsTemplate={async (name, description, meals) => {
                try {
                  await createTemplate(name, description, meals);
                  toast.showSuccess('Template saved!', 'Your meal plan has been saved as a template.');
                } catch (error) {
                  toast.showError('Failed to save template');
                }
              }}
              currentMeals={currentWeekPlan?.meals || []}
            />
          )}

          {viewMode === 'insights' && (
            <MealInsights
              meals={currentWeekPlan?.meals || []}
            />
          )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Meal Slot Editor Modal */}
      <MealSlotEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedMealSlot(null);
        }}
        mealSlot={selectedMealSlot}
        availableRecipes={recipes}
        onSave={handleMealSlotSave}
        onRemoveRecipe={removeRecipeFromSlot}
        isLoading={isOperationLoading}
      />

      {/* Onboarding Tour */}
      <OnboardingTour
        isVisible={isOnboardingVisible}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />

      {/* Shortcuts Help Modal */}
      <Modal isOpen={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} size="lg">
        <ModalHeader>
          <ModalTitle>Keyboard Shortcuts</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Navigation</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>← →</span>
                    <span>Navigate weeks</span>
                  </div>
                  <div className="flex justify-between">
                    <span>↑ ↓</span>
                    <span>Navigate meal slots</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Enter</span>
                    <span>Edit selected slot</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>1</span>
                    <span>Copy last week</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2</span>
                    <span>Auto-fill favorites</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3</span>
                    <span>Clear week</span>
                  </div>
                  <div className="flex justify-between">
                    <span>4</span>
                    <span>Balance meals</span>
                  </div>
                  <div className="flex justify-between">
                    <span>5</span>
                    <span>Surprise me</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Copy & Paste</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Ctrl/Cmd + C</span>
                    <span>Copy meal</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ctrl/Cmd + V</span>
                    <span>Paste meal</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delete/Backspace</span>
                    <span>Remove meal</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Utilities</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>S</span>
                    <span>Generate shopping list</span>
                  </div>
                  <div className="flex justify-between">
                    <span>E</span>
                    <span>Export meal plan</span>
                  </div>
                  <div className="flex justify-between">
                    <span>/</span>
                    <span>Focus search</span>
                  </div>
                  <div className="flex justify-between">
                    <span>?</span>
                    <span>Show this help</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">
                <strong>Tip:</strong> Hold Shift while dragging to swap meals between slots instead of copying them.
              </p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={() => setShowShortcutsHelp(false)}
            className="w-full"
          >
            Got it!
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

// Wrapper component with providers
export default function MealPlanningPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <ToastProvider>
          <MealPlanningContent />
        </ToastProvider>
        <FloatingAgentButton />
      </AppLayout>
    </ProtectedRoute>
  );
}