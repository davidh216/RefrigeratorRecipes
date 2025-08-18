import React from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { queryKeys } from '@/lib/query-client';

const ITEMS_PER_PAGE = 25;

export interface UsePaginatedIngredientsReturn {
  // Paginated data
  ingredients: Ingredient[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  
  // Filtering and sorting
  filters: IngredientFilters;
  sortOptions: IngredientSortOptions;
  filteredIngredients: Ingredient[];
  
  // Loading states
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  
  // Actions
  addIngredient: (data: IngredientFormData) => Promise<void>;
  updateIngredient: (id: string, data: Partial<IngredientFormData>) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
  setFilters: (filters: Partial<IngredientFilters>) => void;
  setSortOptions: (options: IngredientSortOptions) => void;
  clearFilters: () => void;
  
  // Manual refresh
  refetch: () => void;
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

export function usePaginatedIngredients(): UsePaginatedIngredientsReturn {
  const { user, isDemoMode } = useAuth();
  const queryClient = useQueryClient();
  
  // State for filters and sorting
  const [filters, setFiltersState] = React.useState<IngredientFilters>(DEFAULT_FILTERS);
  const [sortOptions, setSortOptionsState] = React.useState<IngredientSortOptions>(DEFAULT_SORT);

  // Demo mode: Use demo data with pagination simulation
  const demoQuery = useQuery({
    queryKey: ['demo-ingredients'],
    queryFn: () => Promise.resolve(demoIngredients),
    enabled: isDemoMode,
    staleTime: Infinity, // Demo data never goes stale
  });

  // Real-time subscription for live data
  const realtimeQuery = useQuery({
    queryKey: queryKeys.ingredients(user?.uid || ''),
    queryFn: () => getUserIngredients(user?.uid || ''),
    enabled: !isDemoMode && !!user?.uid,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Infinite query for pagination
  const infiniteQuery = useInfiniteQuery({
    queryKey: [...queryKeys.ingredients(user?.uid || ''), 'paginated', filters, sortOptions],
    queryFn: async ({ pageParam = 0 }: { pageParam: number }) => {
      if (isDemoMode) {
        const allIngredients = demoIngredients;
        const filteredIngredients = filterAndSortIngredients(allIngredients, filters, sortOptions);
        const start = pageParam * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return {
          ingredients: filteredIngredients.slice(start, end),
          nextPage: end < filteredIngredients.length ? pageParam + 1 : undefined,
          total: filteredIngredients.length,
        };
      } else {
        // For Firebase, we'll implement cursor-based pagination
        const allIngredients = await getUserIngredients(user?.uid || '');
        const filteredIngredients = filterAndSortIngredients(allIngredients, filters, sortOptions);
        const start = pageParam * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return {
          ingredients: filteredIngredients.slice(start, end),
          nextPage: end < filteredIngredients.length ? pageParam + 1 : undefined,
          total: filteredIngredients.length,
        };
      }
    },
    enabled: !!user?.uid || isDemoMode,
    getNextPageParam: (lastPage: any) => lastPage.nextPage,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutations
  const addIngredientMutation = useMutation({
    mutationFn: async (data: IngredientFormData) => {
      if (isDemoMode) {
        // Simulate adding ingredient in demo mode
        const newIngredient: Ingredient = {
          id: `demo-ing-${Date.now()}`,
          name: data.name,
          customName: data.customName || undefined,
          quantity: data.quantity,
          unit: data.unit,
          dateBought: data.dateBought ? new Date(data.dateBought) : new Date(),
          expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
          location: data.location,
          category: data.category,
          tags: data.tags || [],
          notes: data.notes || undefined,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        return newIngredient;
      }
      return createIngredient(user?.uid || '', data);
    },
    onSuccess: () => {
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: queryKeys.ingredients(user?.uid || '') });
      infiniteQuery.refetch();
    },
  });

  const updateIngredientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<IngredientFormData> }) => {
      if (isDemoMode) {
        // Simulate updating ingredient in demo mode
        return Promise.resolve();
      }
      return updateFirestoreIngredient(user?.uid || '', id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ingredients(user?.uid || '') });
      infiniteQuery.refetch();
    },
  });

  const deleteIngredientMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        // Simulate deleting ingredient in demo mode
        return Promise.resolve();
      }
      return deleteFirestoreIngredient(user?.uid || '', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ingredients(user?.uid || '') });
      infiniteQuery.refetch();
    },
  });

  // Helper function to filter and sort ingredients
  const filterAndSortIngredients = (ingredients: Ingredient[], filters: IngredientFilters, sortOptions: IngredientSortOptions): Ingredient[] => {
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
  };

  // Get all ingredients from infinite query
  const allIngredients = React.useMemo(() => {
    if (infiniteQuery.data?.pages) {
      return infiniteQuery.data.pages.flatMap((page: any) => page.ingredients);
    }
    return [];
  }, [infiniteQuery.data]);

  // Set filters
  const setFilters = React.useCallback((newFilters: Partial<IngredientFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    // Reset pagination when filters change
    infiniteQuery.refetch();
  }, [infiniteQuery]);

  // Set sort options
  const setSortOptions = React.useCallback((options: IngredientSortOptions) => {
    setSortOptionsState(options);
    // Reset pagination when sort changes
    infiniteQuery.refetch();
  }, [infiniteQuery]);

  // Clear filters
  const clearFilters = React.useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    infiniteQuery.refetch();
  }, [infiniteQuery]);

  return {
    // Paginated data
    ingredients: allIngredients,
    hasNextPage: infiniteQuery.hasNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    
    // Filtering and sorting
    filters,
    sortOptions,
    filteredIngredients: allIngredients, // Already filtered in the query
    
    // Loading states
    isLoading: infiniteQuery.isLoading,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error?.message || null,
    
    // Actions
    addIngredient: addIngredientMutation.mutateAsync,
    updateIngredient: (id: string, data: Partial<IngredientFormData>) => 
      updateIngredientMutation.mutateAsync({ id, data }),
    deleteIngredient: deleteIngredientMutation.mutateAsync,
    setFilters,
    setSortOptions,
    clearFilters,
    
    // Manual refresh
    refetch: infiniteQuery.refetch,
  };
}
