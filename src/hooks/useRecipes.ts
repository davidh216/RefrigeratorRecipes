import { useState, useCallback, useMemo, useEffect } from 'react';
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

export interface UseRecipesReturn {
  recipes: Recipe[];
  filteredRecipes: Recipe[];
  filters: RecipeFilters;
  sortOptions: RecipeSortOptions;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addRecipe: (data: RecipeFormData) => Promise<void>;
  updateRecipe: (id: string, data: Partial<RecipeFormData>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  setFilters: (filters: Partial<RecipeFilters>) => void;
  setSortOptions: (options: RecipeSortOptions) => void;
  clearFilters: () => void;
  searchRecipes: (query: string) => Recipe[];
  
  // Firebase functions
  loadRecipes: () => Promise<void>;
  refreshRecipes: () => void;
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

export function useRecipes(): UseRecipesReturn {
  const { user, isDemoMode } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filters, setFiltersState] = useState<RecipeFilters>(DEFAULT_FILTERS);
  const [sortOptions, setSortOptionsState] = useState<RecipeSortOptions>(DEFAULT_SORT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  // Demo mode: Use demo data
  useEffect(() => {
    if (isDemoMode) {
      setRecipes(demoRecipes);
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
      setRecipes([]);
      return;
    }

    setIsLoading(true);
    
    const unsubscribeFn = subscribeToUserRecipes(
      user.uid,
      (newRecipes) => {
        setRecipes(newRecipes);
        setIsLoading(false);
        setError(null);
      },
      (error) => {
        setError('Failed to load recipes: ' + error.message);
        setIsLoading(false);
      }
    );

    setUnsubscribe(() => unsubscribeFn);

    // Cleanup function
    return () => {
      unsubscribeFn();
    };
  }, [user?.uid, isDemoMode]);

  // Add recipe
  const addRecipe = useCallback(async (data: RecipeFormData) => {
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
        timing: {
          prepTime: data.prepTime,
          cookTime: data.cookTime,
          totalTime: data.prepTime + data.cookTime + (data.restTime || 0),
          restTime: data.restTime || undefined,
        },
        servings: {
          count: data.servingsCount,
          notes: data.servingsNotes || undefined,
        },
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
      setRecipes(prev => [...prev, newRecipe]);
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await createRecipe(user.uid, data);
      setError(null);
      // The real-time listener will update the state automatically
    } catch (err: unknown) {
      setError('Failed to add recipe: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Update recipe
  const updateRecipe = useCallback(async (id: string, data: Partial<RecipeFormData>) => {
    if (isDemoMode) {
      // Simulate updating recipe in demo mode
      setRecipes(prev => prev.map(recipe => 
        recipe.id === id 
          ? { 
              ...recipe, 
              ...data,
              metadata: {
                ...recipe.metadata,
                updatedAt: new Date()
              }
            }
          : recipe
      ));
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await updateFirestoreRecipe(user.uid, id, data);
      setError(null);
      // The real-time listener will update the state automatically
    } catch (err: unknown) {
      setError('Failed to update recipe: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Delete recipe
  const deleteRecipe = useCallback(async (id: string) => {
    if (isDemoMode) {
      // Simulate deleting recipe in demo mode
      setRecipes(prev => prev.filter(recipe => recipe.id !== id));
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await deleteFirestoreRecipe(user.uid, id);
      setError(null);
      // The real-time listener will update the state automatically
    } catch (err: unknown) {
      setError('Failed to delete recipe: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<RecipeFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Set sort options
  const setSortOptions = useCallback((options: RecipeSortOptions) => {
    setSortOptionsState(options);
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Filter and sort recipes
  const filteredRecipes = useMemo(() => {
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
      if (filters.maxPrepTime && recipe.timing.prepTime > filters.maxPrepTime) {
        return false;
      }

      // Cook time filter
      if (filters.maxCookTime && recipe.timing.cookTime > filters.maxCookTime) {
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
          aValue = a.timing.prepTime;
          bValue = b.timing.prepTime;
          break;
        case 'cookTime':
          aValue = a.timing.cookTime;
          bValue = b.timing.cookTime;
          break;
        case 'totalTime':
          aValue = a.timing.totalTime;
          bValue = b.timing.totalTime;
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
  }, [recipes, filters, sortOptions]);

  // Load recipes (for manual refresh)
  const loadRecipes = useCallback(async () => {
    if (isDemoMode) {
      setRecipes(demoRecipes);
      return;
    }

    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const userRecipes = await getUserRecipes(user.uid);
      setRecipes(userRecipes);
      setError(null);
    } catch (err: unknown) {
      setError('Failed to load recipes: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Refresh recipes
  const refreshRecipes = useCallback(() => {
    if (isDemoMode) {
      setRecipes(demoRecipes);
    } else {
      loadRecipes();
    }
  }, [isDemoMode, loadRecipes]);

  // Search recipes function
  const searchRecipes = useCallback((query: string) => {
    if (!query.trim()) {
      return recipes;
    }

    const searchTerm = query.toLowerCase();
    return recipes.filter(recipe => {
      const matchesTitle = recipe.title.toLowerCase().includes(searchTerm);
      const matchesDescription = recipe.description.toLowerCase().includes(searchTerm);
      const matchesTags = recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm));
      const matchesIngredients = recipe.ingredients.some(ingredient => 
        ingredient.name.toLowerCase().includes(searchTerm)
      );
      
      return matchesTitle || matchesDescription || matchesTags || matchesIngredients;
    });
  }, [recipes]);

  return {
    recipes,
    filteredRecipes,
    filters,
    sortOptions,
    isLoading,
    error,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    setFilters,
    setSortOptions,
    clearFilters,
    searchRecipes,
    loadRecipes,
    refreshRecipes,
  };
}