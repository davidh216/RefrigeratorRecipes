import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  ShoppingList, 
  ShoppingListFormData, 
  ShoppingListItem, 
  ShoppingListFilters, 
  ShoppingListSortOptions,
  MealPlan,
  Ingredient
} from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  createShoppingList,
  getUserShoppingLists,
  updateShoppingList as updateFirestoreShoppingList,
  deleteShoppingList as deleteFirestoreShoppingList,
  subscribeToUserShoppingLists
} from '@/lib/firebase/firestore';
import { demoShoppingLists } from '@/lib/demo-data';
import { AGENT_FEATURES } from '@/lib/feature-flags';

const DEFAULT_FILTERS: ShoppingListFilters = {
  search: '',
  category: '',
  isPurchased: 'all',
};

const DEFAULT_SORT: ShoppingListSortOptions = {
  field: 'name',
  direction: 'asc',
};

// Agent integration types for shopping list optimization
interface ShoppingListSuggestion {
  id: string;
  type: 'cost-optimization' | 'bulk-suggestion' | 'alternative-suggestion' | 'store-optimization';
  message: string;
  items?: ShoppingListItem[];
  action?: () => void;
  dismissed?: boolean;
}

interface ShoppingOptimizations {
  duplicateItems: ShoppingListItem[];
  costSavings: Array<{
    item: ShoppingListItem;
    suggestion: string;
    potentialSaving: number;
  }>;
  bulkOpportunities: Array<{
    category: string;
    items: ShoppingListItem[];
    suggestion: string;
  }>;
}

export interface UseShoppingListReturn {
  shoppingLists: ShoppingList[];
  filteredShoppingLists: ShoppingList[];
  currentList: ShoppingList | null;
  filters: ShoppingListFilters;
  sortOptions: ShoppingListSortOptions;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addShoppingList: (data: ShoppingListFormData) => Promise<void>;
  updateShoppingList: (id: string, data: Partial<ShoppingListFormData>) => Promise<void>;
  deleteShoppingList: (id: string) => Promise<void>;
  addItemToList: (listId: string, item: ShoppingListItem) => Promise<void>;
  removeItemFromList: (listId: string, itemId: string) => Promise<void>;
  updateItemInList: (listId: string, itemId: string, item: Partial<ShoppingListItem>) => Promise<void>;
  toggleItemPurchased: (listId: string, itemId: string) => Promise<void>;
  updateItemQuantity: (listId: string, itemId: string, quantity: number) => Promise<void>;
  updateItemPrice: (listId: string, itemId: string, price: number) => Promise<void>;
  generateFromMealPlan: (mealPlan: MealPlan, ingredients: Ingredient[]) => Promise<void>;
  
  // Filtering and sorting
  setFilters: (filters: Partial<ShoppingListFilters>) => void;
  setSortOptions: (options: ShoppingListSortOptions) => void;
  clearFilters: () => void;
  
  // Utility functions
  getItemsByCategory: (listId: string) => Record<string, ShoppingListItem[]>;
  getTotalCost: (listId: string) => number;
  getPurchasedCount: (listId: string) => { purchased: number; total: number };
  
  // Firebase functions
  loadShoppingLists: () => Promise<void>;
  refreshShoppingLists: () => void;

  // Agent-enhanced features (additive, non-breaking)
  shoppingOptimizations: ShoppingOptimizations;
  shoppingSuggestions: ShoppingListSuggestion[];
  dismissShoppingSuggestion: (suggestionId: string) => void;
  enableShoppingAgent: boolean;
}

export function useShoppingList(): UseShoppingListReturn {
  const { user, isDemoMode } = useAuth();
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [filters, setFiltersState] = useState<ShoppingListFilters>(DEFAULT_FILTERS);
  const [sortOptions, setSortOptionsState] = useState<ShoppingListSortOptions>(DEFAULT_SORT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);
  
  // Agent-enhanced features state
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const enableShoppingAgent = AGENT_FEATURES.shopping && AGENT_FEATURES.system;

  // Demo mode: Load shopping lists from localStorage or use demo data
  useEffect(() => {
    if (isDemoMode) {
      try {
        const savedLists = localStorage.getItem('demo-shopping-lists');
        if (savedLists) {
          const parsedLists = JSON.parse(savedLists);
          console.log('Demo mode: Loading shopping lists from localStorage:', parsedLists.length);
          setShoppingLists(parsedLists);
        } else {
          console.log('Demo mode: No saved lists, using demo data');
          setShoppingLists(demoShoppingLists);
          localStorage.setItem('demo-shopping-lists', JSON.stringify(demoShoppingLists));
        }
      } catch (error) {
        console.error('Demo mode: Error loading from localStorage, using demo data:', error);
        setShoppingLists(demoShoppingLists);
      }
      setIsLoading(false);
      setError(null);
      return;
    }
  }, [isDemoMode]);

  // Set up real-time subscription when user is available (non-demo mode)
  useEffect(() => {
    if (isDemoMode) return; // Skip Firebase in demo mode

    if (!user?.uid) {
      // Clean up existing subscription if user logs out
      if (unsubscribe) {
        unsubscribe();
        setUnsubscribe(null);
      }
      setShoppingLists([]);
      return;
    }

    setIsLoading(true);
    
    const unsubscribeFn = subscribeToUserShoppingLists(
      user.uid,
      (newShoppingLists) => {
        setShoppingLists(newShoppingLists);
        setIsLoading(false);
        setError(null);
      },
      (error) => {
        setError('Failed to load shopping lists: ' + error.message);
        setIsLoading(false);
      }
    );

    setUnsubscribe(() => unsubscribeFn);

    // Cleanup function
    return () => {
      unsubscribeFn();
    };
  }, [user?.uid, isDemoMode]);

  // Get current shopping list (most recent or active)
  const currentList = useMemo(() => {
    if (shoppingLists.length === 0) return null;
    return shoppingLists[0]; // Return the first list for demo purposes
  }, [shoppingLists]);

  // Add shopping list
  const addShoppingList = useCallback(async (data: ShoppingListFormData) => {
    if (isDemoMode) {
      // Simulate creating shopping list in demo mode
      const newShoppingList: ShoppingList = {
        id: `demo-shopping-list-${Date.now()}`,
        userId: 'demo-user-id',
        name: data.name,
        items: data.items || [],
        totalEstimatedCost: data.items?.reduce((sum, item) => sum + (item.estimatedCost || 0), 0) || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setShoppingLists(prev => {
        const updatedLists = [newShoppingList, ...prev];
        // Save to localStorage for persistence across page navigation
        localStorage.setItem('demo-shopping-lists', JSON.stringify(updatedLists));
        console.log('Demo mode: Saved shopping list to localStorage:', newShoppingList.id);
        return updatedLists;
      });
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await createShoppingList(user.uid, data);
      setError(null);
      // The real-time listener will update the state automatically
    } catch (err: unknown) {
      setError('Failed to create shopping list: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Update shopping list
  const updateShoppingList = useCallback(async (id: string, data: Partial<ShoppingListFormData>) => {
    if (isDemoMode) {
      // Simulate updating shopping list in demo mode
      setShoppingLists(prev => prev.map(list => 
        list.id === id 
          ? { 
              ...list, 
              ...data,
              updatedAt: new Date()
            }
          : list
      ));
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await updateFirestoreShoppingList(user.uid, id, data);
      setError(null);
      // The real-time listener will update the state automatically
    } catch (err: unknown) {
      setError('Failed to update shopping list: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Delete shopping list
  const deleteShoppingList = useCallback(async (id: string) => {
    if (isDemoMode) {
      // Simulate deleting shopping list in demo mode
      setShoppingLists(prev => prev.filter(list => list.id !== id));
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await deleteFirestoreShoppingList(user.uid, id);
      setError(null);
      // The real-time listener will update the state automatically
    } catch (err: unknown) {
      setError('Failed to delete shopping list: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Add item to list
  const addItemToList = useCallback(async (listId: string, item: ShoppingListItem) => {
    if (isDemoMode) {
      // Simulate adding item to list in demo mode
      setShoppingLists(prev => prev.map(list => 
        list.id === listId 
          ? { 
              ...list, 
              items: [...list.items, item],
              totalEstimatedCost: list.totalEstimatedCost + (item.estimatedCost || 0),
              updatedAt: new Date()
            }
          : list
      ));
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const list = shoppingLists.find(l => l.id === listId);
      if (list) {
        const updatedItems = [...list.items, item];
        const updatedTotalCost = list.totalEstimatedCost + (item.estimatedCost || 0);
        await updateFirestoreShoppingList(user.uid, listId, { 
          items: updatedItems,
          totalEstimatedCost: updatedTotalCost
        });
      }
      setError(null);
    } catch (err: unknown) {
      setError('Failed to add item to list: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, shoppingLists, isDemoMode]);

  // Remove item from list
  const removeItemFromList = useCallback(async (listId: string, itemId: string) => {
    if (isDemoMode) {
      // Simulate removing item from list in demo mode
      setShoppingLists(prev => prev.map(list => 
        list.id === listId 
          ? { 
              ...list, 
              items: list.items.filter(item => item.id !== itemId),
              totalEstimatedCost: list.items
                .filter(item => item.id !== itemId)
                .reduce((sum, item) => sum + (item.estimatedCost || 0), 0),
              updatedAt: new Date()
            }
          : list
      ));
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const list = shoppingLists.find(l => l.id === listId);
      if (list) {
        const updatedItems = list.items.filter(item => item.id !== itemId);
        const updatedTotalCost = updatedItems.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
        await updateFirestoreShoppingList(user.uid, listId, { 
          items: updatedItems,
          totalEstimatedCost: updatedTotalCost
        });
      }
      setError(null);
    } catch (err: unknown) {
      setError('Failed to remove item from list: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, shoppingLists, isDemoMode]);

  // Update item in list
  const updateItemInList = useCallback(async (listId: string, itemId: string, updatedItem: Partial<ShoppingListItem>) => {
    if (isDemoMode) {
      // Simulate updating item in list in demo mode
      setShoppingLists(prev => prev.map(list => 
        list.id === listId 
          ? { 
              ...list, 
              items: list.items.map(item => 
                item.id === itemId 
                  ? { ...item, ...updatedItem }
                  : item
              ),
              updatedAt: new Date()
            }
          : list
      ));
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const list = shoppingLists.find(l => l.id === listId);
      if (list) {
        const updatedItems = list.items.map(item => 
          item.id === itemId 
            ? { ...item, ...updatedItem }
            : item
        );
        await updateFirestoreShoppingList(user.uid, listId, { items: updatedItems });
      }
      setError(null);
    } catch (err: unknown) {
      setError('Failed to update item in list: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, shoppingLists, isDemoMode]);

  // Toggle item purchased status
  const toggleItemPurchased = useCallback(async (listId: string, itemId: string) => {
    if (isDemoMode) {
      // Simulate toggling item purchased status in demo mode
      setShoppingLists(prev => prev.map(list => 
        list.id === listId 
          ? { 
              ...list, 
              items: list.items.map(item => 
                item.id === itemId 
                  ? { ...item, isPurchased: !item.isPurchased }
                  : item
              ),
              updatedAt: new Date()
            }
          : list
      ));
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const list = shoppingLists.find(l => l.id === listId);
      if (list) {
        const updatedItems = list.items.map(item => 
          item.id === itemId 
            ? { ...item, isPurchased: !item.isPurchased }
            : item
        );
        await updateFirestoreShoppingList(user.uid, listId, { items: updatedItems });
      }
      setError(null);
    } catch (err: unknown) {
      setError('Failed to toggle item purchased status: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, shoppingLists, isDemoMode]);

  // Load shopping lists (for manual refresh)
  const loadShoppingLists = useCallback(async () => {
    if (isDemoMode) {
      setShoppingLists(demoShoppingLists);
      return;
    }

    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const userShoppingLists = await getUserShoppingLists(user.uid);
      setShoppingLists(userShoppingLists);
      setError(null);
    } catch (err: unknown) {
      setError('Failed to load shopping lists: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Refresh shopping lists
  const refreshShoppingLists = useCallback(() => {
    if (isDemoMode) {
      setShoppingLists(demoShoppingLists);
    } else {
      loadShoppingLists();
    }
  }, [isDemoMode, loadShoppingLists]);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<ShoppingListFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Set sort options
  const setSortOptions = useCallback((options: ShoppingListSortOptions) => {
    setSortOptionsState(options);
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Filter and sort shopping lists
  const filteredShoppingLists = useMemo(() => {
    const filtered = shoppingLists.filter(list => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesName = list.name.toLowerCase().includes(searchTerm);
        const matchesItems = list.items.some(item => 
          item.name.toLowerCase().includes(searchTerm)
        );
        
        if (!(matchesName || matchesItems)) {
          return false;
        }
      }

      return true;
    });

    // Sort shopping lists
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOptions.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOptions.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return sorted;
  }, [shoppingLists, filters, sortOptions]);

  // Utility functions
  const getItemsByCategory = useCallback((listId: string) => {
    const list = shoppingLists.find(l => l.id === listId);
    if (!list) return {};
    
    return list.items.reduce((acc, item) => {
      const category = item.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, ShoppingListItem[]>);
  }, [shoppingLists]);

  const getTotalCost = useCallback((listId: string) => {
    const list = shoppingLists.find(l => l.id === listId);
    if (!list) return 0;
    
    return list.items.reduce((sum, item) => {
      // Use user price if available, otherwise fall back to estimated cost
      const price = item.userPrice ?? item.estimatedCost ?? 0;
      return sum + price;
    }, 0);
  }, [shoppingLists]);

  const getPurchasedCount = useCallback((listId: string) => {
    const list = shoppingLists.find(l => l.id === listId);
    if (!list) return { purchased: 0, total: 0 };
    
    const purchased = list.items.filter(item => item.isPurchased).length;
    const total = list.items.length;
    
    return { purchased, total };
  }, [shoppingLists]);

  // Update item quantity
  const updateItemQuantity = useCallback(async (listId: string, itemId: string, quantity: number) => {
    await updateItemInList(listId, itemId, { totalAmount: quantity });
  }, [updateItemInList]);

  // Update item price
  const updateItemPrice = useCallback(async (listId: string, itemId: string, price: number) => {
    await updateItemInList(listId, itemId, { 
      userPrice: price,
      priceSource: 'user' as const
    });
  }, [updateItemInList]);

  // Generate shopping list from meal plan
  const generateFromMealPlan = useCallback(async (mealPlan: MealPlan, ingredients: Ingredient[]) => {
    // This is a simplified implementation - you might want to make this more sophisticated
    const listName = `Meal Plan - ${mealPlan.weekStart.toLocaleDateString()}`;
    const items: ShoppingListItem[] = [];
    
    // Extract ingredients from meal plan recipes
    // This is a placeholder implementation - you'd need to implement the actual logic
    // based on your meal plan structure and recipe ingredients
    
    await addShoppingList({ name: listName, items });
  }, [addShoppingList]);

  // Agent-enhanced optimizations
  const shoppingOptimizations = useMemo((): ShoppingOptimizations => {
    if (!enableShoppingAgent || !currentList) {
      return { duplicateItems: [], costSavings: [], bulkOpportunities: [] };
    }

    // Find duplicate or similar items
    const duplicateItems: ShoppingListItem[] = [];
    const itemNames = new Map<string, ShoppingListItem[]>();
    
    currentList.items.forEach(item => {
      const normalizedName = item.name.toLowerCase().trim();
      if (!itemNames.has(normalizedName)) {
        itemNames.set(normalizedName, []);
      }
      itemNames.get(normalizedName)!.push(item);
    });

    itemNames.forEach((items, name) => {
      if (items.length > 1) {
        duplicateItems.push(...items.slice(1)); // All but the first are duplicates
      }
    });

    // Identify bulk opportunities by category
    const bulkOpportunities: ShoppingOptimizations['bulkOpportunities'] = [];
    const itemsByCategory = getItemsByCategory(currentList.id);
    
    Object.entries(itemsByCategory).forEach(([category, items]) => {
      if (items.length >= 3 && category !== 'Other') {
        const totalCost = items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
        if (totalCost >= 20) { // Bulk savings threshold
          bulkOpportunities.push({
            category,
            items,
            suggestion: `Consider shopping at bulk stores for ${category.toLowerCase()} items to save money.`
          });
        }
      }
    });

    // Cost saving suggestions (simplified)
    const costSavings: ShoppingOptimizations['costSavings'] = [];
    currentList.items.forEach(item => {
      if (item.estimatedCost && item.estimatedCost > 5) {
        costSavings.push({
          item,
          suggestion: 'Consider store brands or seasonal alternatives',
          potentialSaving: item.estimatedCost * 0.15 // 15% potential saving
        });
      }
    });

    return { duplicateItems, costSavings: costSavings.slice(0, 3), bulkOpportunities };
  }, [enableShoppingAgent, currentList, getItemsByCategory]);

  // Agent suggestions
  const shoppingSuggestions = useMemo((): ShoppingListSuggestion[] => {
    if (!enableShoppingAgent || !currentList) return [];

    const suggestions: ShoppingListSuggestion[] = [];

    // Duplicate items suggestion
    if (shoppingOptimizations.duplicateItems.length > 0) {
      const suggestionId = 'duplicate-items';
      if (!dismissedSuggestions.has(suggestionId)) {
        suggestions.push({
          id: suggestionId,
          type: 'cost-optimization',
          message: `Found ${shoppingOptimizations.duplicateItems.length} duplicate items that could be merged.`,
          items: shoppingOptimizations.duplicateItems,
          action: () => {
            // Could implement merge functionality
            console.log('Merge duplicate items');
          }
        });
      }
    }

    // Bulk opportunity suggestions
    shoppingOptimizations.bulkOpportunities.forEach((opportunity, index) => {
      const suggestionId = `bulk-${opportunity.category}`;
      if (!dismissedSuggestions.has(suggestionId)) {
        suggestions.push({
          id: suggestionId,
          type: 'bulk-suggestion',
          message: opportunity.suggestion,
          items: opportunity.items
        });
      }
    });

    // High-cost item alternatives
    if (shoppingOptimizations.costSavings.length > 0) {
      const suggestionId = 'cost-alternatives';
      if (!dismissedSuggestions.has(suggestionId)) {
        const totalPotentialSaving = shoppingOptimizations.costSavings
          .reduce((sum, saving) => sum + saving.potentialSaving, 0);
        suggestions.push({
          id: suggestionId,
          type: 'alternative-suggestion',
          message: `You could save up to $${totalPotentialSaving.toFixed(2)} by choosing alternative products.`
        });
      }
    }

    return suggestions.filter(s => !dismissedSuggestions.has(s.id));
  }, [enableShoppingAgent, currentList, shoppingOptimizations, dismissedSuggestions]);

  // Dismiss suggestion function
  const dismissShoppingSuggestion = useCallback((suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]));
  }, []);

  return {
    shoppingLists,
    filteredShoppingLists,
    currentList,
    filters,
    sortOptions,
    isLoading,
    error,
    addShoppingList,
    updateShoppingList,
    deleteShoppingList,
    addItemToList,
    removeItemFromList,
    updateItemInList,
    toggleItemPurchased,
    updateItemQuantity,
    updateItemPrice,
    generateFromMealPlan,
    setFilters,
    setSortOptions,
    clearFilters,
    getItemsByCategory,
    getTotalCost,
    getPurchasedCount,
    loadShoppingLists,
    refreshShoppingLists,
    // Agent-enhanced features (additive)
    shoppingOptimizations,
    shoppingSuggestions,
    dismissShoppingSuggestion,
    enableShoppingAgent,
  };
}
