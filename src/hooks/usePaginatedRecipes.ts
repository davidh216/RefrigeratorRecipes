import React from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Recipe, RecipeFormData, RecipeFilters, RecipeSortOptions } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  createRecipe,
  getUserRecipes,
  updateRecipe as updateFirestoreRecipe,
  deleteRecipe as deleteFirestoreRecipe,
  subscribeToUserRecipes
} from '@/lib/firebase/firestore';
import { demoRecipes } from '@/lib/demo-data';
import { queryKeys } from '@/lib/query-client';

const ITEMS_PER_PAGE = 20;

export interface UsePaginatedRecipesReturn {
  // Paginated data
  recipes: Recipe[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  
  // Filtering and sorting
  filters: RecipeFilters;
  sortOptions: RecipeSortOptions;
  filteredRecipes: Recipe[];
  
  // Loading states
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  
  // Actions
  addRecipe: (data: RecipeFormData) => Promise<void>;
  updateRecipe: (id: string, data: Partial<RecipeFormData>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  setFilters: (filters: Partial<RecipeFilters>) => void;
  setSortOptions: (options: RecipeSortOptions) => void;
  clearFilters: () => void;
  searchRecipes: (query: string) => Recipe[];
  
  // Manual refresh
  refetch: () => void;
}

const DEFAULT_FILTERS: RecipeFilters = {
  search: '',
  cuisine: '',
  difficulty: '',
  mealType: '',
  dietary: [],
  tags: [],
  maxPrepTime: null,
  maxCookTime: null,
};

const DEFAULT_SORT: RecipeSortOptions = {
  field: 'title',
  direction: 'asc',
};

export function usePaginatedRecipes(): UsePaginatedRecipesReturn {
  const { user, isDemoMode } = useAuth();
  const queryClient = useQueryClient();
  
  // State for filters and sorting
  const [filters, setFiltersState] = React.useState<RecipeFilters>(DEFAULT_FILTERS);
  const [sortOptions, setSortOptionsState] = React.useState<RecipeSortOptions>(DEFAULT_SORT);

  // Demo mode: Use demo data with pagination simulation
  const demoQuery = useQuery({
    queryKey: ['demo-recipes'],
    queryFn: () => Promise.resolve(demoRecipes),
    enabled: isDemoMode,
    staleTime: Infinity, // Demo data never goes stale
  });

  // Real-time subscription for live data
  const realtimeQuery = useQuery({
    queryKey: queryKeys.recipes(user?.uid || ''),
    queryFn: () => getUserRecipes(user?.uid || ''),
    enabled: !isDemoMode && !!user?.uid,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Infinite query for pagination
  const infiniteQuery = useInfiniteQuery({
    queryKey: [...queryKeys.recipes(user?.uid || ''), 'paginated', filters, sortOptions],
    queryFn: async ({ pageParam = 0 }) => {
      if (isDemoMode) {
        const allRecipes = demoRecipes;
        const filteredRecipes = filterAndSortRecipes(allRecipes, filters, sortOptions);
        const start = pageParam * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return {
          recipes: filteredRecipes.slice(start, end),
          nextPage: end < filteredRecipes.length ? pageParam + 1 : undefined,
          total: filteredRecipes.length,
        };
      } else {
        // For Firebase, we'll implement cursor-based pagination
        const allRecipes = await getUserRecipes(user?.uid || '');
        const filteredRecipes = filterAndSortRecipes(allRecipes, filters, sortOptions);
        const start = pageParam * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return {
          recipes: filteredRecipes.slice(start, end),
          nextPage: end < filteredRecipes.length ? pageParam + 1 : undefined,
          total: filteredRecipes.length,
        };
      }
    },
    enabled: !!user?.uid || isDemoMode,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutations
  const addRecipeMutation = useMutation({
    mutationFn: async (data: RecipeFormData) => {
      if (isDemoMode) {
        // Simulate adding recipe in demo mode
        const newRecipe: Recipe = {
          id: `demo-recipe-${Date.now()}`,
          title: data.title,
          description: data.description,
          images: data.images || [],
          difficulty: data.difficulty,
          cuisine: data.cuisine || undefined,
          mealType: data.mealType || [],
                     prepTime: data.prepTime,
           cookTime: data.cookTime,
           totalTime: data.prepTime + data.cookTime + (data.restTime || 0),
           restTime: data.restTime || undefined,
           servings: data.servingsCount,
           servingsNotes: data.servingsNotes || undefined,
          ingredients: data.ingredients || [],
          instructions: data.instructions || [],
          nutrition: null,
          tags: data.tags || [],
          dietary: data.dietary || [],
          ratings: {
            average: 0,
            count: 0,
            userRating: null,
          },
          source: {
            type: 'user-created'
          },
          sharing: {
            isPublic: data.isPublic || false,
            sharedWith: [],
            allowComments: data.allowComments || false,
            allowRating: data.allowRating || false,
          },
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            lastCookedAt: undefined,
            cookCount: 0,
            isFavorite: false,
            isArchived: false,
          }
        };
        return newRecipe;
      }
      return createRecipe(user?.uid || '', data);
    },
    onSuccess: () => {
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes(user?.uid || '') });
      infiniteQuery.refetch();
    },
  });

  const updateRecipeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RecipeFormData> }) => {
      if (isDemoMode) {
        // Simulate updating recipe in demo mode
        return Promise.resolve();
      }
      return updateFirestoreRecipe(user?.uid || '', id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes(user?.uid || '') });
      infiniteQuery.refetch();
    },
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        // Simulate deleting recipe in demo mode
        return Promise.resolve();
      }
      return deleteFirestoreRecipe(user?.uid || '', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes(user?.uid || '') });
      infiniteQuery.refetch();
    },
  });

  // Helper function to filter and sort recipes
  const filterAndSortRecipes = (recipes: Recipe[], filters: RecipeFilters, sortOptions: RecipeSortOptions): Recipe[] => {
    const filtered = recipes.filter(recipe => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesTitle = recipe.title.toLowerCase().includes(searchTerm);
        const matchesDescription = recipe.description.toLowerCase().includes(searchTerm);
        const matchesTags = recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        
        if (!(matchesTitle || matchesDescription || matchesTags)) {
          return false;
        }
      }

      // Cuisine filter
      if (filters.cuisine && recipe.cuisine !== filters.cuisine) {
        return false;
      }

      // Difficulty filter
      if (filters.difficulty && recipe.difficulty !== filters.difficulty) {
        return false;
      }

      // Meal type filter
      if (filters.mealType && !recipe.mealType.includes(filters.mealType)) {
        return false;
      }

      // Dietary filter
      if (filters.dietary.length > 0) {
        const hasMatchingDietary = filters.dietary.some(diet =>
          recipe.dietary.includes(diet)
        );
        if (!hasMatchingDietary) {
          return false;
        }
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(filterTag =>
          recipe.tags.includes(filterTag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Prep time filter
      if (filters.maxPrepTime && recipe.prepTime > filters.maxPrepTime) {
        return false;
      }

      // Cook time filter
      if (filters.maxCookTime && recipe.cookTime > filters.maxCookTime) {
        return false;
      }

      return true;
    });

    // Sort recipes
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOptions.field) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'difficulty':
          aValue = a.difficulty;
          bValue = b.difficulty;
          break;
        case 'cuisine':
          aValue = a.cuisine?.toLowerCase() || '';
          bValue = b.cuisine?.toLowerCase() || '';
          break;
                 case 'prepTime':
           aValue = a.prepTime;
           bValue = b.prepTime;
           break;
         case 'cookTime':
           aValue = a.cookTime;
           bValue = b.cookTime;
           break;
         case 'totalTime':
           aValue = a.totalTime;
           bValue = b.totalTime;
           break;
        case 'rating':
          aValue = a.ratings.average;
          bValue = b.ratings.average;
          break;
        case 'createdAt':
          aValue = a.metadata.createdAt.getTime();
          bValue = b.metadata.createdAt.getTime();
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (sortOptions.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return sorted;
  };

  // Get all recipes from infinite query
  const allRecipes = React.useMemo(() => {
    if (infiniteQuery.data?.pages) {
      return infiniteQuery.data.pages.flatMap(page => page.recipes);
    }
    return [];
  }, [infiniteQuery.data]);

  // Set filters
  const setFilters = React.useCallback((newFilters: Partial<RecipeFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    // Reset pagination when filters change
    infiniteQuery.refetch();
  }, [infiniteQuery]);

  // Set sort options
  const setSortOptions = React.useCallback((options: RecipeSortOptions) => {
    setSortOptionsState(options);
    // Reset pagination when sort changes
    infiniteQuery.refetch();
  }, [infiniteQuery]);

  // Clear filters
  const clearFilters = React.useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    infiniteQuery.refetch();
  }, [infiniteQuery]);

  // Search recipes function
  const searchRecipes = React.useCallback((query: string) => {
    if (!query.trim()) {
      return allRecipes;
    }

    const searchTerm = query.toLowerCase();
    return allRecipes.filter(recipe => {
      const matchesTitle = recipe.title.toLowerCase().includes(searchTerm);
      const matchesDescription = recipe.description.toLowerCase().includes(searchTerm);
      const matchesTags = recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm));
      const matchesIngredients = recipe.ingredients.some(ingredient => 
        ingredient.name.toLowerCase().includes(searchTerm)
      );
      
      return matchesTitle || matchesDescription || matchesTags || matchesIngredients;
    });
  }, [allRecipes]);

  return {
    // Paginated data
    recipes: allRecipes,
    hasNextPage: infiniteQuery.hasNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    
    // Filtering and sorting
    filters,
    sortOptions,
    filteredRecipes: allRecipes, // Already filtered in the query
    
    // Loading states
    isLoading: infiniteQuery.isLoading,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error?.message || null,
    
    // Actions
    addRecipe: addRecipeMutation.mutateAsync,
    updateRecipe: (id: string, data: Partial<RecipeFormData>) => 
      updateRecipeMutation.mutateAsync({ id, data }),
    deleteRecipe: deleteRecipeMutation.mutateAsync,
    setFilters,
    setSortOptions,
    clearFilters,
    searchRecipes,
    
    // Manual refresh
    refetch: infiniteQuery.refetch,
  };
}
