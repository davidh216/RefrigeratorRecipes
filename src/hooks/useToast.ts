'use client';

import { useToastActions } from '@/components/ui/Toast';

export const useMealPlanningToast = () => {
  const { success, error, warning, info } = useToastActions();

  return {
    // Recipe assignment toasts
    recipeAssigned: (recipeName: string, mealTime: string, day: string) => {
      success(
        `Recipe added! 🎉`,
        `${recipeName} has been added to ${mealTime} on ${day}`,
        { duration: 2000 }
      );
    },

    recipeRemoved: (recipeName: string, mealTime: string, day: string) => {
      info(
        `Recipe removed`,
        `${recipeName} has been removed from ${mealTime} on ${day}`,
        { duration: 1500 }
      );
    },

    // Week navigation toasts
    weekChanged: (direction: 'next' | 'previous') => {
      info(
        `Loading ${direction} week...`,
        `Navigating to ${direction} week`,
        { duration: 1000 }
      );
    },

    // Save operation toasts
    saveSuccess: (message?: string) => {
      success(
        `Saved successfully! ✅`,
        message || `Your meal plan has been saved`,
        { duration: 2000 }
      );
    },

    saveError: (message?: string) => {
      error(
        `Save failed ❌`,
        message || `Couldn't save your meal plan. Please try again.`,
        {
          duration: 5000,
          action: {
            label: 'Retry',
            onClick: () => {
              // This would typically trigger a retry function
              console.log('Retry save operation');
            }
          }
        }
      );
    },

    // Drag and drop toasts
    dragStarted: (recipeName: string) => {
      info(
        `Dragging ${recipeName}`,
        `Drop it into a meal slot to assign it`,
        { duration: 1500 }
      );
    },

    dropSuccess: (recipeName: string, mealSlot: string) => {
      success(
        `Recipe assigned! 🎯`,
        `${recipeName} has been added to ${mealSlot}`,
        { duration: 1800 }
      );
    },

    dropError: (recipeName: string) => {
      error(
        `Assignment failed`,
        `Couldn't assign ${recipeName}. Please try again.`,
        { duration: 3000 }
      );
    },

    // Shopping list toasts
    shoppingListGenerated: (itemCount: number) => {
      success(
        `Shopping list created! 🛒`,
        `Generated shopping list with ${itemCount} items`,
        { duration: 2500 }
      );
    },

    shoppingListError: () => {
      error(
        `Shopping list failed`,
        `Couldn't generate shopping list. Please check your meal plan.`,
        { duration: 4000 }
      );
    },

    // Meal planning tips
    planningTip: (tip: string) => {
      info(
        `💡 Planning Tip`,
        tip,
        { duration: 3000 }
      );
    },

    // Empty state toasts
    noRecipesFound: (searchQuery?: string) => {
      warning(
        `No recipes found`,
        searchQuery 
          ? `No recipes match "${searchQuery}". Try different keywords.`
          : `No recipes available. Add some recipes to get started.`,
        { duration: 2500 }
      );
    },

    emptyWeek: () => {
      info(
        `Empty week detected`,
        `Start by adding recipes to your meal slots`,
        { duration: 2500 }
      );
    },

    // Validation toasts
    validationError: (field: string, message: string) => {
      error(
        `Invalid ${field}`,
        message,
        { duration: 2500 }
      );
    },

    // Loading states
    loadingStarted: (operation: string) => {
      info(
        `Loading...`,
        `${operation} in progress`,
        { duration: 0 } // No auto-dismiss for loading states
      );
    },

    loadingComplete: (operation: string) => {
      success(
        `${operation} complete!`,
        `Operation finished successfully`,
        { duration: 1500 }
      );
    },

    // Network/connection toasts
    connectionError: () => {
      error(
        `Connection lost`,
        `Please check your internet connection and try again.`,
        {
          duration: 0, // Persistent until user dismisses
          action: {
            label: 'Retry',
            onClick: () => {
              window.location.reload();
            }
          }
        }
      );
    },

    // Unsaved changes warning
    unsavedChanges: () => {
      warning(
        `Unsaved changes`,
        `You have unsaved changes. Save your meal plan before leaving.`,
        {
          duration: 0,
          action: {
            label: 'Save Now',
            onClick: () => {
              // This would trigger a save operation
              console.log('Save meal plan');
            }
          }
        }
      );
    },

    // Meal plan completion
    mealPlanComplete: (totalMeals: number) => {
      success(
        `Meal plan complete! 🎉`,
        `All ${totalMeals} meals have been planned for the week.`,
        { duration: 3000 }
      );
    },

    // Quick actions
    quickAdd: (recipeName: string) => {
      success(
        `Quick add successful! ⚡`,
        `${recipeName} has been added to your meal plan`,
        { duration: 1500 }
      );
    },

    // Error recovery
    autoSaveRecovery: () => {
      info(
        `Auto-save recovered`,
        `Your changes have been automatically saved`,
        { duration: 2000 }
      );
    },

    // General success/error wrappers
    showSuccess: (title: string, message?: string) => {
      success(title, message, { duration: 2000 });
    },

    showError: (title: string, message?: string) => {
      error(title, message, { duration: 2500 });
    },

    showWarning: (title: string, message?: string) => {
      warning(title, message, { duration: 2500 });
    },

    showInfo: (title: string, message?: string) => {
      info(title, message, { duration: 2000 });
    }
  };
};
