import { useEffect, useCallback, useRef } from 'react';
import { MealSlot, Recipe } from '@/types';

export interface MealPlanningShortcutsConfig {
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onMealSlotClick: (slotId: string) => void;
  onRecipeDrop: (slotId: string, recipe: Recipe) => void;
  onRemoveRecipe: (slotId: string) => void;
  onCopyLastWeek: () => void;
  onAutoFillFavorites: () => void;
  onClearWeek: () => void;
  onBalanceMeals: () => void;
  onSurpriseMe: () => void;
  onGenerateShoppingList: () => void;
  onExportMealPlan: () => void;
  onFocusSearch: () => void;
  onShowShortcutsHelp: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopyMeal: () => void;
  onPasteMeal: () => void;
  onDeleteMeal: () => void;
  onEditMeal: () => void;
  currentMeals: MealSlot[];
  selectedSlotId?: string;
  clipboard?: { type: 'meal'; data: MealSlot } | null;
  canUndo: boolean;
  canRedo: boolean;
  isSearchFocused: boolean;
}

export interface UseMealPlanningShortcutsReturn {
  isEnabled: boolean;
  enableShortcuts: () => void;
  disableShortcuts: () => void;
  showShortcutsHelp: () => void;
}

const SHORTCUTS = {
  // Navigation
  'ArrowLeft': 'Navigate to previous week',
  'ArrowRight': 'Navigate to next week',
  'ArrowUp': 'Navigate to previous meal slot',
  'ArrowDown': 'Navigate to next meal slot',
  
  // Actions
  'Enter': 'Edit selected meal slot',
  'Delete': 'Remove recipe from selected slot',
  'Backspace': 'Remove recipe from selected slot',
  'Space': 'Toggle meal slot selection',
  
  // Copy/Paste
  'Ctrl+C': 'Copy meal (Windows/Linux)',
  'Cmd+C': 'Copy meal (Mac)',
  'Ctrl+V': 'Paste meal (Windows/Linux)',
  'Cmd+V': 'Paste meal (Mac)',
  
  // Undo/Redo
  'Ctrl+Z': 'Undo (Windows/Linux)',
  'Cmd+Z': 'Undo (Mac)',
  'Ctrl+Shift+Z': 'Redo (Windows/Linux)',
  'Cmd+Shift+Z': 'Redo (Mac)',
  
  // Quick Actions
  '1': 'Copy last week',
  '2': 'Auto-fill favorites',
  '3': 'Clear week',
  '4': 'Balance meals',
  '5': 'Surprise me',
  
  // Utilities
  'S': 'Generate shopping list',
  'E': 'Export meal plan',
  '/': 'Focus search',
  '?': 'Show shortcuts help',
  'Escape': 'Close modals / Clear selection',
};

export function useMealPlanningShortcuts(config: MealPlanningShortcutsConfig): UseMealPlanningShortcutsReturn {
  const isEnabledRef = useRef(true);
  const selectedSlotIndexRef = useRef(0);
  const clipboardRef = useRef<{ type: 'meal'; data: MealSlot } | null>(null);

  // Get current meals for navigation
  const currentMeals = config.currentMeals;
  const totalSlots = currentMeals.length;

  // Update selected slot index when selectedSlotId changes
  useEffect(() => {
    if (config.selectedSlotId) {
      const index = currentMeals.findIndex(meal => meal.id === config.selectedSlotId);
      if (index !== -1) {
        selectedSlotIndexRef.current = index;
      }
    }
  }, [config.selectedSlotId, currentMeals]);

  // Navigate to meal slot
  const navigateToSlot = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const currentIndex = selectedSlotIndexRef.current;
    let newIndex = currentIndex;

    switch (direction) {
      case 'up':
        newIndex = Math.max(0, currentIndex - 7); // Move up one week
        break;
      case 'down':
        newIndex = Math.min(totalSlots - 1, currentIndex + 7); // Move down one week
        break;
      case 'left':
        newIndex = Math.max(0, currentIndex - 1); // Move left one slot
        break;
      case 'right':
        newIndex = Math.min(totalSlots - 1, currentIndex + 1); // Move right one slot
        break;
    }

    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalSlots) {
      selectedSlotIndexRef.current = newIndex;
      const targetSlot = currentMeals[newIndex];
      if (targetSlot) {
        config.onMealSlotClick(targetSlot.id);
      }
    }
  }, [currentMeals, totalSlots, config]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabledRef.current || config.isSearchFocused) {
      return;
    }

    const { key, ctrlKey, cmdKey, shiftKey, metaKey } = event;
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierKey = isMac ? metaKey : ctrlKey;

    // Prevent default for all our shortcuts
    let handled = false;

    // Navigation shortcuts
    switch (key) {
      case 'ArrowLeft':
        event.preventDefault();
        config.onNavigateWeek('prev');
        handled = true;
        break;
      case 'ArrowRight':
        event.preventDefault();
        config.onNavigateWeek('next');
        handled = true;
        break;
      case 'ArrowUp':
        event.preventDefault();
        navigateToSlot('up');
        handled = true;
        break;
      case 'ArrowDown':
        event.preventDefault();
        navigateToSlot('down');
        handled = true;
        break;
    }

    // Action shortcuts
    if (!handled) {
      switch (key) {
        case 'Enter':
          event.preventDefault();
          if (config.selectedSlotId) {
            config.onEditMeal();
          }
          handled = true;
          break;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          if (config.selectedSlotId) {
            config.onDeleteMeal();
          }
          handled = true;
          break;
        case ' ':
          event.preventDefault();
          if (config.selectedSlotId) {
            // Toggle selection or trigger slot click
            config.onMealSlotClick(config.selectedSlotId);
          }
          handled = true;
          break;
      }
    }

    // Copy/Paste shortcuts
    if (!handled && modifierKey && !shiftKey) {
      switch (key.toLowerCase()) {
        case 'c':
          event.preventDefault();
          config.onCopyMeal();
          handled = true;
          break;
        case 'v':
          event.preventDefault();
          config.onPasteMeal();
          handled = true;
          break;
      }
    }

    // Undo/Redo shortcuts
    if (!handled && modifierKey) {
      if (key.toLowerCase() === 'z') {
        event.preventDefault();
        if (shiftKey) {
          if (config.canRedo) {
            config.onRedo();
          }
        } else {
          if (config.canUndo) {
            config.onUndo();
          }
        }
        handled = true;
      }
    }

    // Quick action shortcuts
    if (!handled && !modifierKey && !shiftKey) {
      switch (key) {
        case '1':
          event.preventDefault();
          config.onCopyLastWeek();
          handled = true;
          break;
        case '2':
          event.preventDefault();
          config.onAutoFillFavorites();
          handled = true;
          break;
        case '3':
          event.preventDefault();
          config.onClearWeek();
          handled = true;
          break;
        case '4':
          event.preventDefault();
          config.onBalanceMeals();
          handled = true;
          break;
        case '5':
          event.preventDefault();
          config.onSurpriseMe();
          handled = true;
          break;
      }
    }

    // Utility shortcuts
    if (!handled && !modifierKey) {
      switch (key.toLowerCase()) {
        case 's':
          event.preventDefault();
          config.onGenerateShoppingList();
          handled = true;
          break;
        case 'e':
          event.preventDefault();
          config.onExportMealPlan();
          handled = true;
          break;
        case '/':
          event.preventDefault();
          config.onFocusSearch();
          handled = true;
          break;
        case '?':
          event.preventDefault();
          config.onShowShortcutsHelp();
          handled = true;
          break;
        case 'escape':
          event.preventDefault();
          // Close modals or clear selection
          handled = true;
          break;
      }
    }

    // Visual feedback for handled shortcuts
    if (handled) {
      // Add a subtle visual feedback
      const feedback = document.createElement('div');
      feedback.className = 'fixed top-4 right-4 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg z-50 text-sm';
      feedback.textContent = `Shortcut: ${key}${modifierKey ? ' + Ctrl' : ''}${shiftKey ? ' + Shift' : ''}`;
      document.body.appendChild(feedback);
      
      setTimeout(() => {
        feedback.remove();
      }, 1000);
    }
  }, [config, navigateToSlot]);

  // Enable/disable shortcuts
  const enableShortcuts = useCallback(() => {
    isEnabledRef.current = true;
  }, []);

  const disableShortcuts = useCallback(() => {
    isEnabledRef.current = false;
  }, []);

  // Show shortcuts help
  const showShortcutsHelp = useCallback(() => {
    config.onShowShortcutsHelp();
  }, [config]);

  // Set up event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Update clipboard when config changes
  useEffect(() => {
    clipboardRef.current = config.clipboard || null;
  }, [config.clipboard]);

  return {
    isEnabled: isEnabledRef.current,
    enableShortcuts,
    disableShortcuts,
    showShortcutsHelp,
  };
}

// Helper function to get shortcut display text
export const getShortcutDisplayText = (shortcut: string): string => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return shortcut
    .replace('Ctrl', isMac ? '⌘' : 'Ctrl')
    .replace('Cmd', '⌘')
    .replace('Shift', '⇧')
    .replace('Alt', '⌥')
    .replace('Enter', '↵')
    .replace('Escape', '⎋')
    .replace('Delete', '⌫')
    .replace('Backspace', '⌫')
    .replace('Space', '␣');
};

// Helper function to get all available shortcuts
export const getAllShortcuts = () => {
  return Object.entries(SHORTCUTS).map(([key, description]) => ({
    key,
    description,
    displayText: getShortcutDisplayText(key),
  }));
};

// Helper function to check if a key combination is a valid shortcut
export const isValidShortcut = (key: string, ctrlKey: boolean, shiftKey: boolean, metaKey: boolean): boolean => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? metaKey : ctrlKey;
  
  // Check if this combination matches any of our shortcuts
  const shortcutKey = [
    modifierKey ? (isMac ? 'Cmd' : 'Ctrl') : '',
    shiftKey ? 'Shift' : '',
    key.toUpperCase(),
  ].filter(Boolean).join('+');
  
  return SHORTCUTS.hasOwnProperty(shortcutKey);
};
