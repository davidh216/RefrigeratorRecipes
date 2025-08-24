import { useCallback } from 'react';
import { Recipe, MealSlot } from '@/types';
import { 
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  getMealPlan
} from '@/lib/firebase/firestore';

export interface UseMealPlanningQuickActionsReturn {
  // Recipe operations
  handleRecipeDrop: (slotId: string, recipe: Recipe) => Promise<void>;
  
  // Quick actions
  handleCopyLastWeek: () => Promise<void>;
  handleAutoFillFavorites: () => Promise<void>;
  handleClearWeek: () => Promise<void>;
  handleBalanceMeals: () => Promise<void>;
  handleSurpriseMe: () => Promise<void>;
  
  // Advanced operations
  handleSwapMeals: (slotId1: string, slotId2: string) => Promise<void>;
  handleBulkOperation: (operation: 'copy' | 'delete' | 'move', slotIds: string[]) => Promise<void>;
  
  // Export operations
  handleGenerateShoppingList: () => void;
  handleExportMealPlan: () => void;
}

export function useMealPlanningQuickActions(
  assignRecipeToSlot: (slotId: string, recipe: Recipe, servings?: number) => Promise<void>,
  removeRecipeFromSlot: (slotId: string) => Promise<void>,
  toast: any,
  weeklySummary: any,
  currentWeek: Date,
  userId: string,
  getMealSlots: () => MealSlot[],
  setMealSlots: (slots: MealSlot[]) => void
): UseMealPlanningQuickActionsReturn {
  
  // Recipe operations
  const handleRecipeDrop = useCallback(async (slotId: string, recipe: Recipe) => {
    toast.loadingStarted('Assigning recipe');
    
    try {
      await assignRecipeToSlot(slotId, recipe);
      toast.dropSuccess(recipe.title, 'meal slot');
      toast.loadingComplete('Recipe assignment');
    } catch (err) {
      console.error('Error dropping recipe:', err);
      toast.dropError(recipe.title);
    }
  }, [assignRecipeToSlot, toast]);

  // Quick actions
  const handleCopyLastWeek = useCallback(async () => {
    toast.loadingStarted('Copying last week');
    try {
      // Get last week's meal plan
      const lastWeek = new Date(currentWeek);
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      const lastWeekSlots = await mealPlanService.getMealSlotsForWeek(userId, lastWeek);
      
      if (lastWeekSlots.length === 0) {
        toast.showError('No meals found from last week');
        return;
      }

      // Clear current week and copy last week's meals
      const currentSlots = getMealSlots();
      const updatedSlots = currentSlots.map(slot => {
        const lastWeekSlot = lastWeekSlots.find(s => s.mealType === slot.mealType);
        return lastWeekSlot ? { ...slot, recipeId: lastWeekSlot.recipeId, recipe: lastWeekSlot.recipe, servings: lastWeekSlot.servings } : slot;
      });

      // Update all slots
      for (const slot of updatedSlots) {
        if (slot.recipeId && slot.recipe) {
          await assignRecipeToSlot(slot.id, slot.recipe, slot.servings);
        }
      }

      setMealSlots(updatedSlots);
      toast.showSuccess('Last week copied!', 'Your previous week has been duplicated.');
    } catch (error) {
      console.error('Error copying last week:', error);
      toast.showError('Failed to copy last week');
    } finally {
      toast.loadingComplete('Copy last week');
    }
  }, [toast, currentWeek, userId, getMealSlots, setMealSlots, assignRecipeToSlot]);

  const handleAutoFillFavorites = useCallback(async () => {
    toast.loadingStarted('Auto-filling favorites');
    try {
      // Get user's favorite recipes
      const favoriteRecipes = await mealPlanService.getFavoriteRecipes(userId);
      
      if (favoriteRecipes.length === 0) {
        toast.showError('No favorite recipes found');
        return;
      }

      const currentSlots = getMealSlots();
      const emptySlots = currentSlots.filter(slot => !slot.recipeId);
      
      // Fill empty slots with favorite recipes
      for (let i = 0; i < Math.min(emptySlots.length, favoriteRecipes.length); i++) {
        const slot = emptySlots[i];
        const recipe = favoriteRecipes[i % favoriteRecipes.length];
        await assignRecipeToSlot(slot.id, recipe);
      }

      toast.showSuccess('Favorites added!', 'Your favorite recipes have been added to the week.');
    } catch (error) {
      console.error('Error auto-filling favorites:', error);
      toast.showError('Failed to auto-fill favorites');
    } finally {
      toast.loadingComplete('Auto-fill favorites');
    }
  }, [toast, userId, getMealSlots, assignRecipeToSlot]);

  const handleClearWeek = useCallback(async () => {
    toast.loadingStarted('Clearing week');
    try {
      const currentSlots = getMealSlots();
      
      // Remove all recipes from slots
      for (const slot of currentSlots) {
        if (slot.recipeId) {
          await removeRecipeFromSlot(slot.id);
        }
      }

      const clearedSlots = currentSlots.map(slot => ({ ...slot, recipeId: undefined, recipe: undefined, servings: undefined }));
      setMealSlots(clearedSlots);
      
      toast.showSuccess('Week cleared!', 'All meals have been removed from this week.');
    } catch (error) {
      console.error('Error clearing week:', error);
      toast.showError('Failed to clear week');
    } finally {
      toast.loadingComplete('Clear week');
    }
  }, [toast, getMealSlots, setMealSlots, removeRecipeFromSlot]);

  const handleBalanceMeals = useCallback(async () => {
    toast.loadingStarted('Balancing meals');
    try {
      const currentSlots = getMealSlots();
      const mealTypes = ['breakfast', 'lunch', 'dinner'];
      const mealTypeCounts = mealTypes.map(type => 
        currentSlots.filter(slot => slot.mealType === type && slot.recipeId).length
      );

      // Find the most and least common meal types
      const maxCount = Math.max(...mealTypeCounts);
      const minCount = Math.min(...mealTypeCounts);
      
      if (maxCount - minCount <= 1) {
        toast.showSuccess('Meals already balanced!', 'Your meals are well distributed.');
        return;
      }

      // Get recipes for redistribution
      const allRecipes = await mealPlanService.getUserRecipes(userId);
      const recipesByType = mealTypes.map(type => 
        allRecipes.filter(recipe => recipe.mealType?.includes(type))
      );

      // Redistribute meals
      const updatedSlots = [...currentSlots];
      for (let i = 0; i < mealTypes.length; i++) {
        const type = mealTypes[i];
        const slotsOfType = updatedSlots.filter(slot => slot.mealType === type);
        const emptySlots = slotsOfType.filter(slot => !slot.recipeId);
        
        if (emptySlots.length > 0 && recipesByType[i].length > 0) {
          const recipe = recipesByType[i][Math.floor(Math.random() * recipesByType[i].length)];
          await assignRecipeToSlot(emptySlots[0].id, recipe);
        }
      }

      toast.showSuccess('Meals balanced!', 'Meal types have been distributed evenly.');
    } catch (error) {
      console.error('Error balancing meals:', error);
      toast.showError('Failed to balance meals');
    } finally {
      toast.loadingComplete('Balance meals');
    }
  }, [toast, userId, getMealSlots, assignRecipeToSlot]);

  const handleSurpriseMe = useCallback(async () => {
    toast.loadingStarted('Adding surprise recipes');
    try {
      const currentSlots = getMealSlots();
      const emptySlots = currentSlots.filter(slot => !slot.recipeId);
      
      if (emptySlots.length === 0) {
        toast.showError('No empty slots available');
        return;
      }

      // Get random recipes
      const allRecipes = await mealPlanService.getUserRecipes(userId);
      const randomRecipes = allRecipes.sort(() => 0.5 - Math.random()).slice(0, emptySlots.length);

      // Assign random recipes to empty slots
      for (let i = 0; i < Math.min(emptySlots.length, randomRecipes.length); i++) {
        await assignRecipeToSlot(emptySlots[i].id, randomRecipes[i]);
      }

      toast.showSuccess('Surprise added!', 'Random recipes have been added to empty slots.');
    } catch (error) {
      console.error('Error adding surprise recipes:', error);
      toast.showError('Failed to add surprise recipes');
    } finally {
      toast.loadingComplete('Surprise me');
    }
  }, [toast, userId, getMealSlots, assignRecipeToSlot]);

  // Advanced operations
  const handleSwapMeals = useCallback(async (slotId1: string, slotId2: string) => {
    toast.loadingStarted('Swapping meals');
    try {
      const currentSlots = getMealSlots();
      const slot1 = currentSlots.find(s => s.id === slotId1);
      const slot2 = currentSlots.find(s => s.id === slotId2);

      if (!slot1 || !slot2) {
        toast.showError('Invalid slots selected');
        return;
      }

      // Store original recipes
      const recipe1 = slot1.recipe;
      const recipe2 = slot2.recipe;
      const servings1 = slot1.servings;
      const servings2 = slot2.servings;

      // Clear both slots
      if (slot1.recipeId) await removeRecipeFromSlot(slotId1);
      if (slot2.recipeId) await removeRecipeFromSlot(slotId2);

      // Assign recipes to opposite slots
      if (recipe2) await assignRecipeToSlot(slotId1, recipe2, servings2);
      if (recipe1) await assignRecipeToSlot(slotId2, recipe1, servings1);

      toast.showSuccess('Meals swapped!', 'The selected meals have been exchanged.');
    } catch (error) {
      console.error('Error swapping meals:', error);
      toast.showError('Failed to swap meals');
    } finally {
      toast.loadingComplete('Swap meals');
    }
  }, [toast, getMealSlots, removeRecipeFromSlot, assignRecipeToSlot]);

  const handleBulkOperation = useCallback(async (operation: 'copy' | 'delete' | 'move', slotIds: string[]) => {
    toast.loadingStarted(`${operation}ing meals`);
    try {
      const currentSlots = getMealSlots();
      const selectedSlots = currentSlots.filter(slot => slotIds.includes(slot.id));

      switch (operation) {
        case 'delete':
          for (const slot of selectedSlots) {
            if (slot.recipeId) {
              await removeRecipeFromSlot(slot.id);
            }
          }
          break;
        case 'copy':
          // Copy recipes to clipboard (implemented in state hook)
          break;
        case 'move':
          // Move recipes to different slots (implemented in state hook)
          break;
      }

      toast.showSuccess(`${operation} completed!`, `${slotIds.length} meals have been ${operation}d.`);
    } catch (error) {
      console.error(`Error ${operation}ing meals:`, error);
      toast.showError(`Failed to ${operation} meals`);
    } finally {
      toast.loadingComplete(`${operation} meals`);
    }
  }, [toast, getMealSlots, removeRecipeFromSlot]);

  // Export operations
  const handleGenerateShoppingList = useCallback(() => {
    toast.shoppingListGenerated(weeklySummary.ingredientsNeeded.length);
    // Navigate to shopping list page with generated items
    window.location.href = '/shopping-list?generate=true';
  }, [toast, weeklySummary]);

  const handleExportMealPlan = useCallback(() => {
    const currentSlots = getMealSlots();
    const mealPlanData = {
      week: currentWeek,
      meals: currentSlots.filter(slot => slot.recipeId).map(slot => ({
        date: slot.date,
        mealType: slot.mealType,
        recipe: slot.recipe,
        servings: slot.servings
      }))
    };

    // Create and download CSV
    const csvContent = generateMealPlanCSV(mealPlanData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meal-plan-${currentWeek.toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.showSuccess('Meal plan exported!', 'Your meal plan has been exported successfully.');
  }, [toast, currentWeek, getMealSlots]);

  return {
    // Recipe operations
    handleRecipeDrop,
    
    // Quick actions
    handleCopyLastWeek,
    handleAutoFillFavorites,
    handleClearWeek,
    handleBalanceMeals,
    handleSurpriseMe,
    
    // Advanced operations
    handleSwapMeals,
    handleBulkOperation,
    
    // Export operations
    handleGenerateShoppingList,
    handleExportMealPlan,
  };
}

// Helper function to generate CSV
function generateMealPlanCSV(mealPlanData: any): string {
  const headers = ['Date', 'Meal Type', 'Recipe', 'Servings'];
  const rows = mealPlanData.meals.map((meal: any) => [
    new Date(meal.date).toLocaleDateString(),
    meal.mealType,
    meal.recipe?.title || '',
    meal.servings || 1
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}
