import { useState, useCallback, useMemo, useEffect } from 'react';
import { Ingredient, IngredientFormData, IngredientFilters, IngredientSortOptions } from '@/types';
import { getExpirationStatus } from '@/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  createIngredient,
  getUserIngredients,
  updateIngredient as updateFirestoreIngredient,
  deleteIngredient as deleteFirestoreIngredient,
  subscribeToUserIngredients
} from '@/lib/firebase/firestore';
import { demoIngredients } from '@/lib/demo-data';

export interface UseIngredientsReturn {
  ingredients: Ingredient[];
  filteredIngredients: Ingredient[];
  filters: IngredientFilters;
  sortOptions: IngredientSortOptions;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addIngredient: (data: IngredientFormData) => Promise<void>;
  updateIngredient: (id: string, data: Partial<IngredientFormData>) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
  setFilters: (filters: Partial<IngredientFilters>) => void;
  setSortOptions: (options: IngredientSortOptions) => void;
  clearFilters: () => void;
  
  // Firebase functions
  loadIngredients: () => Promise<void>;
  refreshIngredients: () => void;
}

const DEFAULT_FILTERS: IngredientFilters = {
  search: '',
  location: 'all',
  category: '',
  tags: [],
  expirationStatus: 'all',
};

const DEFAULT_SORT: IngredientSortOptions = {
  field: 'name',
  direction: 'asc',
};

export function useIngredients(): UseIngredientsReturn {
  const { user, isDemoMode } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [filters, setFiltersState] = useState<IngredientFilters>(DEFAULT_FILTERS);
  const [sortOptions, setSortOptionsState] = useState<IngredientSortOptions>(DEFAULT_SORT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  // Demo mode: Use demo data
  useEffect(() => {
    if (isDemoMode) {
      setIngredients(demoIngredients);
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
      setIngredients([]);
      return;
    }

    setIsLoading(true);
    
    const unsubscribeFn = subscribeToUserIngredients(
      user.uid,
      (newIngredients) => {
        setIngredients(newIngredients);
        setIsLoading(false);
        setError(null);
      },
      (error) => {
        setError('Failed to load ingredients: ' + error.message);
        setIsLoading(false);
      }
    );

    setUnsubscribe(() => unsubscribeFn);

    // Cleanup function
    return () => {
      unsubscribeFn();
    };
  }, [user?.uid, isDemoMode]);

  // Add ingredient
  const addIngredient = useCallback(async (data: IngredientFormData) => {
    if (isDemoMode) {
      // Simulate adding ingredient in demo mode
      const newIngredient: Ingredient = {
        id: `demo-ing-${Date.now()}`,
        name: data.name,
        customName: data.customName || null,
        quantity: data.quantity,
        unit: data.unit,
        dateBought: data.dateBought ? new Date(data.dateBought) : new Date(),
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
        location: data.location,
        category: data.category,
        tags: data.tags || [],
        notes: data.notes || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setIngredients(prev => [...prev, newIngredient]);
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await createIngredient(user.uid, data);
      setError(null);
      // The real-time listener will update the state automatically
    } catch (err: unknown) {
      setError('Failed to add ingredient: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Update ingredient
  const updateIngredient = useCallback(async (id: string, data: Partial<IngredientFormData>) => {
    if (isDemoMode) {
      // Simulate updating ingredient in demo mode
      setIngredients(prev => prev.map(ingredient => 
        ingredient.id === id 
          ? { 
              ...ingredient, 
              ...data,
              updatedAt: new Date(),
              dateBought: data.dateBought ? new Date(data.dateBought) : ingredient.dateBought,
              expirationDate: data.expirationDate ? new Date(data.expirationDate) : ingredient.expirationDate
            }
          : ingredient
      ));
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await updateFirestoreIngredient(user.uid, id, data);
      setError(null);
      // The real-time listener will update the state automatically
    } catch (err: unknown) {
      setError('Failed to update ingredient: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Delete ingredient
  const deleteIngredient = useCallback(async (id: string) => {
    if (isDemoMode) {
      // Simulate deleting ingredient in demo mode
      setIngredients(prev => prev.filter(ingredient => ingredient.id !== id));
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await deleteFirestoreIngredient(user.uid, id);
      setError(null);
      // The real-time listener will update the state automatically
    } catch (err: unknown) {
      setError('Failed to delete ingredient: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<IngredientFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Set sort options
  const setSortOptions = useCallback((options: IngredientSortOptions) => {
    setSortOptionsState(options);
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Filter and sort ingredients
  const filteredIngredients = useMemo(() => {
    const filtered = ingredients.filter(ingredient => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesName = ingredient.name.toLowerCase().includes(searchTerm);
        const matchesCustomName = ingredient.customName?.toLowerCase().includes(searchTerm);
        const matchesCategory = ingredient.category.toLowerCase().includes(searchTerm);
        const matchesTags = ingredient.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        
        if (!(matchesName || matchesCustomName || matchesCategory || matchesTags)) {
          return false;
        }
      }

      // Location filter
      if (filters.location !== 'all' && ingredient.location !== filters.location) {
        return false;
      }

      // Category filter
      if (filters.category && ingredient.category !== filters.category) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(filterTag =>
          ingredient.tags.includes(filterTag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Expiration status filter
      if (filters.expirationStatus !== 'all') {
        const status = getExpirationStatus(ingredient.expirationDate);
        if (status !== filters.expirationStatus) {
          return false;
        }
      }

      return true;
    });

    // Sort ingredients
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOptions.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'location':
          aValue = a.location.toLowerCase();
          bValue = b.location.toLowerCase();
          break;
        case 'dateBought':
          aValue = a.dateBought.getTime();
          bValue = b.dateBought.getTime();
          break;
        case 'expirationDate':
          aValue = a.expirationDate?.getTime() || 0;
          bValue = b.expirationDate?.getTime() || 0;
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
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
  }, [ingredients, filters, sortOptions]);

  // Load ingredients (for manual refresh)
  const loadIngredients = useCallback(async () => {
    if (isDemoMode) {
      setIngredients(demoIngredients);
      return;
    }

    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const userIngredients = await getUserIngredients(user.uid);
      setIngredients(userIngredients);
      setError(null);
    } catch (err: unknown) {
      setError('Failed to load ingredients: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Refresh ingredients
  const refreshIngredients = useCallback(() => {
    if (isDemoMode) {
      setIngredients(demoIngredients);
    } else {
      loadIngredients();
    }
  }, [isDemoMode, loadIngredients]);

  return {
    ingredients,
    filteredIngredients,
    filters,
    sortOptions,
    isLoading,
    error,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    setFilters,
    setSortOptions,
    clearFilters,
    loadIngredients,
    refreshIngredients,
  };
}