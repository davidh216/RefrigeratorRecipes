'use client';

import React, { useState } from 'react';
import { useMealPlan, useRecipes, useDebounce } from '@/hooks';
import {
  WeeklyCalendar,
  RecipeSelector,
  MealPlanDashboard,
  MealSlotEditor,
} from '@/components/meal-planning';
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
} from '@/components/ui';
import { Recipe, MealSlot } from '@/types';

type ViewMode = 'calendar' | 'dashboard' | 'recipes';

export default function MealPlanningPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedMealSlot, setSelectedMealSlot] = useState<MealSlot | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Hooks
  const {
    mealPlan,
    currentWeek,
    isLoading,
    error,
    navigateWeek,
    assignRecipeToSlot,
    removeRecipeFromSlot,
    updateMealNotes,
    getWeeklySummary,
    getMealSlot,
  } = useMealPlan();

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
    const slot = getMealSlot(slotId);
    if (slot) {
      setSelectedMealSlot(slot);
      setIsEditorOpen(true);
    }
  };

  const handleRecipeDrop = (slotId: string, recipe: Recipe) => {
    assignRecipeToSlot(slotId, recipe);
  };

  const handleMealSlotSave = (slotId: string, updates: Partial<MealSlot>) => {
    if (updates.recipeId && updates.recipe) {
      assignRecipeToSlot(slotId, updates.recipe, updates.servings);
    } else {
      removeRecipeFromSlot(slotId);
    }

    if (updates.notes !== undefined) {
      updateMealNotes(slotId, updates.notes || '');
    }
  };

  const handleGenerateShoppingList = () => {
    // TODO: Implement shopping list generation
    alert('Shopping list generation coming soon!');
  };

  const handleExportMealPlan = () => {
    // TODO: Implement meal plan export
    alert('Meal plan export coming soon!');
  };

  if (isLoading) {
    return (
      <Container>
        <div className="py-8">
          <Loading className="h-64" />
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
          </Alert>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-6">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Meal Planning
            </h1>
            <p className="text-gray-600 mt-2">
              Plan your weekly meals and generate shopping lists
            </p>
          </div>

          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:grid-cols-none sm:inline-flex">
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <span>📅</span>
                <span className="hidden sm:inline">Calendar</span>
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <span>📊</span>
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="recipes" className="flex items-center gap-2">
                <span>📖</span>
                <span className="hidden sm:inline">Recipes</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {viewMode === 'calendar' && (
            <Grid 
              cols={4} 
              responsive={{ sm: 1, lg: 4 }}
              className="gap-6"
            >
              {/* Calendar - takes 3 columns on large screens */}
              <div className="lg:col-span-3">
                <WeeklyCalendar
                  weekStart={currentWeek}
                  meals={mealPlan?.meals || []}
                  onNavigateWeek={navigateWeek}
                  onMealSlotClick={handleMealSlotClick}
                  onRecipeDrop={handleRecipeDrop}
                  onRemoveRecipe={removeRecipeFromSlot}
                />
              </div>

              {/* Recipe Selector - takes 1 column on large screens */}
              <div className="lg:col-span-1">
                <div className="sticky top-6">
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
                </div>
              </div>
            </Grid>
          )}

          {viewMode === 'dashboard' && (
            <MealPlanDashboard
              summary={weeklySummary}
              weekStart={currentWeek}
              onGenerateShoppingList={handleGenerateShoppingList}
              onExportMealPlan={handleExportMealPlan}
            />
          )}

          {viewMode === 'recipes' && (
            <div className="space-y-6">
              {/* Recipes View */}
              <Card>
                <CardHeader>
                  <CardTitle>Recipe Library</CardTitle>
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
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <Card className="bg-primary-50 border-primary-200">
          <CardContent className="p-4">
            <Flex 
              align="center" 
              justify="between" 
              className="flex-col sm:flex-row gap-4 sm:gap-0"
            >
              <div>
                <h3 className="font-semibold text-primary-900">
                  Week Summary
                </h3>
                <p className="text-sm text-primary-700">
                  {weeklySummary.plannedMeals} of {weeklySummary.totalMeals} meals planned
                  {weeklySummary.ingredientsNeeded.length > 0 && 
                    ` • ${weeklySummary.ingredientsNeeded.length} ingredients needed`
                  }
                </p>
              </div>
              
              <Flex className="gap-2 flex-col sm:flex-row w-full sm:w-auto">
                {weeklySummary.ingredientsNeeded.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={handleGenerateShoppingList}
                    className="w-full sm:w-auto"
                  >
                    Generate Shopping List
                  </Button>
                )}
                <Button 
                  variant="primary" 
                  onClick={handleExportMealPlan}
                  className="w-full sm:w-auto"
                >
                  Export Meal Plan
                </Button>
              </Flex>
            </Flex>
          </CardContent>
        </Card>
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
      />
    </Container>
  );
}