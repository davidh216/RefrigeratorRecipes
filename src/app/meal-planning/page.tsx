'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMealPlan, useRecipes, useDebounce, useMealTemplates, useMealPlanningShortcuts } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
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
  CalendarPicker,
  MealInsights,
} from '@/components/meal-planning';
import { MealSlotSkeleton, WeeklyCalendarSkeleton } from '@/components/meal-planning/MealSlotSkeleton';
import { ToastProvider } from '@/components/ui/Toast';
import { useMealPlanningToast as useToast } from '@/hooks/useToast';
import { AppLayout } from '@/components/layout';
import {
  Container,
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
  } = useRecipes();

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
            mealType: mealType as any,
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
    toast.loadingStarted('Assigning recipe');
    
    try {
      await assignRecipeToSlot(slotId, recipe);
      toast.dropSuccess(recipe.title, 'meal slot');
      toast.loadingComplete('Recipe assignment');
    } catch (err) {
      console.error('Error dropping recipe:', err);
      toast.dropError(recipe.title);
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleMealSlotSave = async (slotId: string, updates: Partial<MealSlot>) => {
    setIsOperationLoading(true);
    toast.loadingStarted('Saving meal slot');
    
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
      
      toast.saveSuccess('Meal slot updated successfully');
    } catch (err) {
      console.error('Error saving meal slot:', err);
      toast.saveError('Failed to update meal slot');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleGenerateShoppingList = () => {
    toast.shoppingListGenerated(weeklySummary.ingredientsNeeded.length);
    // TODO: Implement shopping list generation
    console.log('Generate shopping list');
  };

  const handleExportMealPlan = () => {
    toast.showSuccess('Meal plan exported!', 'Your meal plan has been exported successfully.');
    // TODO: Implement meal plan export
    console.log('Export meal plan');
  };

  // Quick Actions Handlers
  const handleCopyLastWeek = async () => {
    toast.loadingStarted('Copying last week');
    try {
      // TODO: Implement copy last week functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.showSuccess('Last week copied!', 'Your previous week has been duplicated.');
    } catch (error) {
      toast.showError('Failed to copy last week');
    } finally {
      toast.loadingComplete('Copy last week');
    }
  };

  const handleAutoFillFavorites = async () => {
    toast.loadingStarted('Auto-filling favorites');
    try {
      // TODO: Implement auto-fill favorites functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.showSuccess('Favorites added!', 'Your favorite recipes have been added to the week.');
    } catch (error) {
      toast.showError('Failed to auto-fill favorites');
    } finally {
      toast.loadingComplete('Auto-fill favorites');
    }
  };

  const handleClearWeek = async () => {
    toast.loadingStarted('Clearing week');
    try {
      // TODO: Implement clear week functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.showSuccess('Week cleared!', 'All meals have been removed from this week.');
    } catch (error) {
      toast.showError('Failed to clear week');
    } finally {
      toast.loadingComplete('Clear week');
    }
  };

  const handleBalanceMeals = async () => {
    toast.loadingStarted('Balancing meals');
    try {
      // TODO: Implement balance meals functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.showSuccess('Meals balanced!', 'Meal types have been distributed evenly.');
    } catch (error) {
      toast.showError('Failed to balance meals');
    } finally {
      toast.loadingComplete('Balance meals');
    }
  };

  const handleSurpriseMe = async () => {
    toast.loadingStarted('Adding surprise recipes');
    try {
      // TODO: Implement surprise me functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.showSuccess('Surprise added!', 'Random recipes have been added to empty slots.');
    } catch (error) {
      toast.showError('Failed to add surprise recipes');
    } finally {
      toast.loadingComplete('Surprise me');
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
    onNavigateWeek: navigateWeek,
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
    onUndo: handleUndo,
    onRedo: handleRedo,
    onCopyMeal: handleCopyMeal,
    onPasteMeal: handlePasteMeal,
    onDeleteMeal: handleDeleteMeal,
    onEditMeal: handleEditMeal,
    currentMeals: currentWeekPlan?.meals || [],
    selectedSlotId: selectedMealSlot?.id,
    clipboard,
    canUndo: false, // TODO: Implement undo/redo
    canRedo: false,
    isSearchFocused: false, // TODO: Track search focus
  };

  // Initialize keyboard shortcuts
  const shortcuts = useMealPlanningShortcuts(shortcutsConfig);

  if (isLoading) {
    return (
      <Container>
        <div className="py-8">
          <WeeklyCalendarSkeleton />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div className="py-8">
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
      </Container>
    );
  }

  // Prevent hydration issues by not rendering until client-side
  if (!isClient) {
    return (
      <Container>
        <div className="py-8">
          <Loading className="h-64" />
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8 max-w-7xl mx-auto">
      <div className="space-y-8">
        {/* Header */}
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
              onClick={isDemoMode ? disableDemoMode : enableDemoMode}
              className="text-sm"
            >
              {isDemoMode ? "🔄 Exit Demo Mode" : "🎮 Enable Demo Mode"}
            </Button>
          </div>
        </motion.div>

        {/* View Mode Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center sm:justify-start"
        >
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
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
                {/* Quick Actions Bar */}
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

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                  {/* Calendar - takes 3 columns on xl screens */}
                  <div className="xl:col-span-3">
                    {currentWeekPlan?.meals.length === 0 ? (
                      <EmptyStates 
                        type="week" 
                        onAction={() => setViewMode('recipes')}
                      />
                    ) : (
                      <WeeklyCalendar
                        weekStart={currentWeek}
                        meals={currentWeekPlan?.meals || []}
                        onNavigateWeek={navigateWeek}
                        onMealSlotClick={handleMealSlotClick}
                        onRecipeDrop={handleRecipeDrop}
                        onRemoveRecipe={removeRecipeFromSlot}
                        onSwapMeals={handleSwapMeals}
                        onMultiSelect={handleMultiSelect}
                        onBulkOperation={handleBulkOperation}
                        selectedSlots={selectedSlots}
                        isLoading={isOperationLoading}
                      />
                    )}
                  </div>

                  {/* Recipe Selector - takes 1 column on xl screens */}
                  <div className="xl:col-span-1">
                    <div className="sticky top-8 space-y-6">
                      <RecipeSelector
                        recipes={filteredRecipes}
                        isLoading={recipesLoading}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onRecipeSelect={(recipe) => {
                          // You could open a modal to select which meal slot
                          console.log('Recipe selected:', recipe);
                        }}
                      />
                      
                      {/* Mini Calendar */}
                      <CalendarPicker
                        currentWeek={currentWeek}
                        meals={currentWeekPlan?.meals || []}
                        onWeekSelect={(weekStart) => {
                          // TODO: Navigate to specific week
                          console.log('Navigate to week:', weekStart);
                        }}
                      />
                    </div>
                  </div>
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

        {/* Quick Actions */}
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
                      onClick={handleGenerateShoppingList}
                      className="w-full sm:w-auto px-8 py-3 text-base"
                    >
                      🛒 Generate Shopping List
                    </Button>
                  )}
                  <Button 
                    variant="primary" 
                    onClick={handleExportMealPlan}
                    className="w-full sm:w-auto px-8 py-3 text-base"
                  >
                    📄 Export Meal Plan
                  </Button>
                </Flex>
              </Flex>
            </CardContent>
          </Card>
        </motion.div>
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
    </Container>
  );
}

// Wrapper component with providers
export default function MealPlanningPage() {
  return (
    <ToastProvider>
      <MealPlanningContent />
    </ToastProvider>
  );
}