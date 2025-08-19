import React, { useState, useCallback, useEffect } from 'react';
import { MealSlot, Recipe } from '@/types';

type ViewMode = 'calendar' | 'dashboard' | 'recipes' | 'templates' | 'insights';

export interface UseMealPlanningStateReturn {
  // View state
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  // Search state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Selection state
  selectedMealSlot: MealSlot | null;
  setSelectedMealSlot: (slot: MealSlot | null) => void;
  selectedSlots: string[];
  setSelectedSlots: (slots: string[]) => void;
  
  // Modal state
  isEditorOpen: boolean;
  setIsEditorOpen: (open: boolean) => void;
  showShortcutsHelp: boolean;
  setShowShortcutsHelp: (show: boolean) => void;
  
  // Loading state
  isOperationLoading: boolean;
  setIsOperationLoading: (loading: boolean) => void;
  
  // Clipboard state
  clipboard: { type: 'meal'; data: MealSlot } | null;
  setClipboard: (data: { type: 'meal'; data: MealSlot } | null) => void;
  
  // Client-side hydration state
  isClient: boolean;
  
  // Actions
  handleMealSlotClick: (slotId: string, slot?: MealSlot) => void;
  handleMealSlotSave: (slotId: string, updates: Partial<MealSlot>) => void;
  handleCopyMeal: () => void;
  handlePasteMeal: () => void;
  handleDeleteMeal: () => void;
  handleEditMeal: () => void;
  handleFocusSearch: () => void;
  handleShowShortcutsHelp: () => void;
  handleMultiSelect: (slotIds: string[]) => void;
}

export function useMealPlanningState(
  currentWeek: Date,
  getMealSlot: (slotId: string) => MealSlot | undefined,
  assignRecipeToSlot: (slotId: string, recipe: Recipe, servings?: number) => Promise<void>,
  removeRecipeFromSlot: (slotId: string) => Promise<void>,
  updateMealNotes: (slotId: string, notes: string) => Promise<void>,
  toast: any
): UseMealPlanningStateReturn {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection state
  const [selectedMealSlot, setSelectedMealSlot] = useState<MealSlot | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  
  // Modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
  // Loading state
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  
  // Clipboard state
  const [clipboard, setClipboard] = useState<{ type: 'meal'; data: MealSlot } | null>(null);
  
  // Client-side hydration state
  const [isClient, setIsClient] = useState(false);

  // Initialize client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handlers
  const handleMealSlotClick = useCallback((slotId: string, slot?: MealSlot) => {
    let targetSlot = slot || getMealSlot(slotId);
    
    // If slot doesn't exist, create a default slot for empty meal slots
    if (!targetSlot) {
      // Parse slotId to extract date and meal type
      const parts = slotId.split('-');
      if (parts.length >= 3) {
        const [empty, dayIndex, mealType] = parts;
        if (empty === 'empty' && dayIndex && mealType) {
          const date = new Date(currentWeek);
          date.setDate(currentWeek.getDate() + parseInt(dayIndex));
          
          targetSlot = {
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
    
    if (targetSlot) {
      setSelectedMealSlot(targetSlot);
      setIsEditorOpen(true);
    }
  }, [currentWeek, getMealSlot]);

  const handleMealSlotSave = useCallback(async (slotId: string, updates: Partial<MealSlot>) => {
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
  }, [assignRecipeToSlot, removeRecipeFromSlot, updateMealNotes, toast]);

  const handleCopyMeal = useCallback(() => {
    if (selectedMealSlot && selectedMealSlot.recipe) {
      setClipboard({ type: 'meal', data: selectedMealSlot });
      toast.showSuccess('Meal copied!', 'Recipe has been copied to clipboard.');
    }
  }, [selectedMealSlot, toast]);

  const handlePasteMeal = useCallback(async () => {
    if (clipboard && clipboard.type === 'meal' && selectedMealSlot) {
      try {
        setIsOperationLoading(true);
        toast.loadingStarted('Pasting meal');
        
        const { recipe, servings } = clipboard.data;
        if (recipe) {
          await assignRecipeToSlot(selectedMealSlot.id, recipe, servings);
          toast.showSuccess('Meal pasted!', 'Recipe has been pasted to the selected slot.');
        }
      } catch (err) {
        console.error('Error pasting meal:', err);
        toast.showError('Failed to paste meal');
      } finally {
        setIsOperationLoading(false);
      }
    }
  }, [clipboard, selectedMealSlot, assignRecipeToSlot, toast]);

  const handleDeleteMeal = useCallback(async () => {
    if (selectedMealSlot) {
      try {
        setIsOperationLoading(true);
        toast.loadingStarted('Deleting meal');
        
        await removeRecipeFromSlot(selectedMealSlot.id);
        toast.showSuccess('Meal deleted!', 'Recipe has been removed from the slot.');
      } catch (err) {
        console.error('Error deleting meal:', err);
        toast.showError('Failed to delete meal');
      } finally {
        setIsOperationLoading(false);
      }
    }
  }, [selectedMealSlot, removeRecipeFromSlot, toast]);

  const handleEditMeal = useCallback(() => {
    if (selectedMealSlot) {
      setIsEditorOpen(true);
    }
  }, [selectedMealSlot]);

  const handleFocusSearch = useCallback(() => {
    // Focus the search input element
    const searchInput = document.querySelector('input[placeholder*="search"], input[placeholder*="Search"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    } else {
      // Fallback: try to find any search input
      const inputs = document.querySelectorAll('input[type="text"]');
      for (const input of inputs) {
        const placeholder = input.getAttribute('placeholder')?.toLowerCase();
        if (placeholder && (placeholder.includes('search') || placeholder.includes('recipe'))) {
          (input as HTMLInputElement).focus();
          (input as HTMLInputElement).select();
          break;
        }
      }
    }
  }, []);

  const handleShowShortcutsHelp = useCallback(() => {
    setShowShortcutsHelp(true);
  }, []);

  const handleMultiSelect = useCallback((slotIds: string[]) => {
    setSelectedSlots(slotIds);
  }, []);

  return {
    // View state
    viewMode,
    setViewMode,
    
    // Search state
    searchQuery,
    setSearchQuery,
    
    // Selection state
    selectedMealSlot,
    setSelectedMealSlot,
    selectedSlots,
    setSelectedSlots,
    
    // Modal state
    isEditorOpen,
    setIsEditorOpen,
    showShortcutsHelp,
    setShowShortcutsHelp,
    
    // Loading state
    isOperationLoading,
    setIsOperationLoading,
    
    // Clipboard state
    clipboard,
    setClipboard,
    
    // Client-side hydration state
    isClient,
    
    // Actions
    handleMealSlotClick,
    handleMealSlotSave,
    handleCopyMeal,
    handlePasteMeal,
    handleDeleteMeal,
    handleEditMeal,
    handleFocusSearch,
    handleShowShortcutsHelp,
    handleMultiSelect,
  };
}
