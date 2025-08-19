import { useMemo, useEffect, useCallback, useState } from 'react';
import { MealSlot } from '@/types';

export interface ShortcutsConfig {
  onNavigateWeek: (direction: 'prev' | 'next') => Promise<void>;
  onMealSlotClick: (slotId: string) => void;
  onRecipeDrop: (slotId: string, recipe: any) => Promise<void>;
  onRemoveRecipe: (slotId: string) => Promise<void>;
  onSwapMeals: (slotId1: string, slotId2: string) => Promise<void>;
  onMultiSelect: (slotIds: string[]) => void;
  onBulkOperation: (operation: 'copy' | 'delete' | 'move', slotIds: string[]) => Promise<void>;
  onCopyLastWeek: () => Promise<void>;
  onAutoFillFavorites: () => Promise<void>;
  onClearWeek: () => Promise<void>;
  onBalanceMeals: () => Promise<void>;
  onSurpriseMe: () => Promise<void>;
  onGenerateShoppingList: () => void;
  onExportMealPlan: () => void;
  onFocusSearch: () => void;
  onShowShortcutsHelp: () => void;
}

export interface UseMealPlanningShortcutsReturn {
  shortcuts: Array<{
    key: string;
    description: string;
    action: () => void;
  }>;
  isEnabled: boolean;
  enableShortcuts: () => void;
  disableShortcuts: () => void;
}

export function useMealPlanningShortcuts(
  config: ShortcutsConfig,
  mealSlots: MealSlot[],
  selectedSlotId?: string
): UseMealPlanningShortcutsReturn {
  const [isEnabled, setIsEnabled] = useState(true);

  // Define shortcuts
  const shortcuts = useMemo(() => [
    // Navigation shortcuts
    {
      key: 'ArrowLeft',
      description: 'Previous week',
      action: () => config.onNavigateWeek('prev')
    },
    {
      key: 'ArrowRight',
      description: 'Next week',
      action: () => config.onNavigateWeek('next')
    },
    {
      key: 'ArrowUp',
      description: 'Previous meal slot',
      action: () => {
        if (!selectedSlotId) return;
        const currentIndex = mealSlots.findIndex(slot => slot.id === selectedSlotId);
        if (currentIndex > 0) {
          config.onMealSlotClick(mealSlots[currentIndex - 1].id);
        }
      }
    },
    {
      key: 'ArrowDown',
      description: 'Next meal slot',
      action: () => {
        if (!selectedSlotId) return;
        const currentIndex = mealSlots.findIndex(slot => slot.id === selectedSlotId);
        if (currentIndex < mealSlots.length - 1) {
          config.onMealSlotClick(mealSlots[currentIndex + 1].id);
        }
      }
    },
    {
      key: 'Enter',
      description: 'Edit selected slot',
      action: () => {
        if (selectedSlotId) {
          config.onMealSlotClick(selectedSlotId);
        }
      }
    },

    // Quick action shortcuts
    {
      key: '1',
      description: 'Copy last week',
      action: config.onCopyLastWeek
    },
    {
      key: '2',
      description: 'Auto-fill favorites',
      action: config.onAutoFillFavorites
    },
    {
      key: '3',
      description: 'Clear week',
      action: config.onClearWeek
    },
    {
      key: '4',
      description: 'Balance meals',
      action: config.onBalanceMeals
    },
    {
      key: '5',
      description: 'Surprise me',
      action: config.onSurpriseMe
    },

    // Copy & paste shortcuts
    {
      key: 'c',
      description: 'Copy meal (with Ctrl/Cmd)',
      action: () => {
        if (selectedSlotId) {
          // Copy to clipboard (implemented in state hook)
          console.log('Copy meal:', selectedSlotId);
        }
      }
    },
    {
      key: 'v',
      description: 'Paste meal (with Ctrl/Cmd)',
      action: () => {
        if (selectedSlotId) {
          // Paste from clipboard (implemented in state hook)
          console.log('Paste meal to:', selectedSlotId);
        }
      }
    },
    {
      key: 'Delete',
      description: 'Remove meal',
      action: () => {
        if (selectedSlotId) {
          config.onRemoveRecipe(selectedSlotId);
        }
      }
    },
    {
      key: 'Backspace',
      description: 'Remove meal',
      action: () => {
        if (selectedSlotId) {
          config.onRemoveRecipe(selectedSlotId);
        }
      }
    },

    // Utility shortcuts
    {
      key: 's',
      description: 'Generate shopping list',
      action: config.onGenerateShoppingList
    },
    {
      key: 'e',
      description: 'Export meal plan',
      action: config.onExportMealPlan
    },
    {
      key: '/',
      description: 'Focus search',
      action: config.onFocusSearch
    },
    {
      key: '?',
      description: 'Show shortcuts help',
      action: config.onShowShortcutsHelp
    }
  ], [config, mealSlots, selectedSlotId]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;

    // Don't trigger shortcuts when typing in input fields
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      return;
    }

    const key = event.key.toLowerCase();
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;

    // Handle Ctrl/Cmd + key combinations
    if (isCtrlOrCmd) {
      switch (key) {
        case 'c':
          event.preventDefault();
          if (selectedSlotId) {
            // Copy meal to clipboard
            console.log('Copy meal:', selectedSlotId);
          }
          return;
        case 'v':
          event.preventDefault();
          if (selectedSlotId) {
            // Paste meal from clipboard
            console.log('Paste meal to:', selectedSlotId);
          }
          return;
        case 'z':
          event.preventDefault();
          // Undo last action
          console.log('Undo last action');
          return;
        case 'y':
          event.preventDefault();
          // Redo last action
          console.log('Redo last action');
          return;
      }
    }

    // Handle Shift + key combinations
    if (isShift) {
      switch (key) {
        case 'arrowleft':
        case 'arrowright':
        case 'arrowup':
        case 'arrowdown':
          // Multi-select mode
          event.preventDefault();
          console.log('Multi-select mode:', key);
          return;
      }
    }

    // Handle single key shortcuts
    const shortcut = shortcuts.find(s => s.key.toLowerCase() === key);
    if (shortcut) {
      event.preventDefault();
      shortcut.action();
    }
  }, [isEnabled, shortcuts, selectedSlotId]);

  // Set up keyboard event listeners
  useEffect(() => {
    if (isEnabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, isEnabled]);

  const enableShortcuts = useCallback(() => setIsEnabled(true), []);
  const disableShortcuts = useCallback(() => setIsEnabled(false), []);

  return {
    shortcuts,
    isEnabled,
    enableShortcuts,
    disableShortcuts,
  };
}
