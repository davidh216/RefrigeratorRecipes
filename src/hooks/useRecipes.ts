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
import { recipeService } from '@/lib/firebase/recipe-service';
import { demoRecipes } from '@/lib/demo-data';
import { AGENT_FEATURES } from '@/lib/feature-flags';

// Agent integration types for recipe discovery
interface RecipeDiscoverySuggestion {
  id: string;
  type: 'ingredient-based' | 'cuisine-exploration' | 'skill-building' | 'dietary-match';
  message: string;
  recipes?: Recipe[];
  action?: () => void;
  dismissed?: boolean;
}

interface RecipeInsights {
  cookedFrequently: Recipe[];
  newToTry: Recipe[];
  skillProgression: {
    currentLevel: 'beginner' | 'intermediate' | 'advanced';
    suggestedNext: Recipe[];
  };
  cuisineVariety: {
    tried: string[];
    suggested: string[];
  };
}

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
  
  // Favorites functionality
  toggleFavorite: (recipeId: string) => Promise<void>;
  getFavorites: () => Recipe[];
  
  // Firebase functions
  loadRecipes: () => Promise<void>;
  refreshRecipes: () => void;

  // Agent-enhanced discovery features (additive, non-breaking)
  recipeDiscoverySuggestions: RecipeDiscoverySuggestion[];
  recipeInsights: RecipeInsights;
  dismissDiscoverySuggestion: (suggestionId: string) => void;
  enableRecipeAgent: boolean;
  getRecipesForIngredients: (ingredients: string[]) => Recipe[];
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
  
  // Agent-enhanced features state
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const enableRecipeAgent = AGENT_FEATURES.recipes && AGENT_FEATURES.system;

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

  // Toggle favorite status
  const toggleFavorite = useCallback(async (recipeId: string) => {
    if (isDemoMode) {
      // Simulate toggling favorite in demo mode
      setRecipes(prev => prev.map(recipe => 
        recipe.id === recipeId 
          ? { 
              ...recipe, 
              metadata: {
                ...recipe.metadata,
                isFavorite: !recipe.metadata.isFavorite,
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
      await recipeService.toggleFavorite(user.uid, recipeId);
      setError(null);
      // The real-time listener will update the state automatically
    } catch (err: unknown) {
      setError('Failed to toggle favorite: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Get favorite recipes
  const getFavorites = useCallback(() => {
    return recipes.filter(recipe => recipe.metadata.isFavorite);
  }, [recipes]);

  // Get recipes that can be made with specific ingredients
  const getRecipesForIngredients = useCallback((ingredients: string[]) => {
    if (ingredients.length === 0) return [];
    
    const normalizedIngredients = ingredients.map(ing => ing.toLowerCase().trim());
    
    return recipes.filter(recipe => {
      const recipeIngredients = recipe.ingredients.map(ing => ing.name.toLowerCase());
      const matchCount = normalizedIngredients.filter(userIng =>
        recipeIngredients.some(recipeIng => recipeIng.includes(userIng) || userIng.includes(recipeIng))
      ).length;
      
      // Return recipes where at least 50% of user ingredients are used
      return matchCount >= Math.ceil(normalizedIngredients.length * 0.5);
    });
  }, [recipes]);

  // Recipe insights and analysis
  const recipeInsights = useMemo((): RecipeInsights => {
    if (!enableRecipeAgent) {
      return {
        cookedFrequently: [],
        newToTry: [],
        skillProgression: { currentLevel: 'beginner', suggestedNext: [] },
        cuisineVariety: { tried: [], suggested: [] }
      };
    }

    // Find frequently cooked recipes
    const cookedFrequently = recipes
      .filter(recipe => recipe.metadata.cookCount > 2)
      .sort((a, b) => b.metadata.cookCount - a.metadata.cookCount)
      .slice(0, 5);

    // Find new recipes to try (never cooked or cooked once)
    const newToTry = recipes
      .filter(recipe => recipe.metadata.cookCount <= 1 && !recipe.metadata.isArchived)
      .slice(0, 5);

    // Determine skill level based on recipe complexity
    const cookedDifficulties = recipes
      .filter(recipe => recipe.metadata.cookCount > 0)
      .map(recipe => recipe.difficulty);
    
    let currentLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
    const advancedCount = cookedDifficulties.filter(d => d === 'advanced').length;
    const intermediateCount = cookedDifficulties.filter(d => d === 'intermediate').length;
    
    if (advancedCount >= 3) currentLevel = 'advanced';
    else if (intermediateCount >= 5 || advancedCount >= 1) currentLevel = 'intermediate';

    // Suggest next skill level recipes
    const nextDifficulty = currentLevel === 'beginner' ? 'intermediate' : 
                          currentLevel === 'intermediate' ? 'advanced' : 'advanced';
    const suggestedNext = recipes
      .filter(recipe => recipe.difficulty === nextDifficulty && recipe.metadata.cookCount === 0)
      .slice(0, 3);

    // Analyze cuisine variety
    const triedCuisines = [...new Set(recipes
      .filter(recipe => recipe.metadata.cookCount > 0 && recipe.cuisine)
      .map(recipe => recipe.cuisine!)
    )];
    
    const allCuisines = [...new Set(recipes.map(recipe => recipe.cuisine).filter(Boolean) as string[])];
    const suggested = allCuisines.filter(cuisine => !triedCuisines.includes(cuisine));

    return {
      cookedFrequently,
      newToTry,
      skillProgression: { currentLevel, suggestedNext },
      cuisineVariety: { tried: triedCuisines, suggested: suggested.slice(0, 3) }
    };
  }, [recipes, enableRecipeAgent]);

  // Recipe discovery suggestions
  const recipeDiscoverySuggestions = useMemo((): RecipeDiscoverySuggestion[] => {
    if (!enableRecipeAgent) return [];

    const suggestions: RecipeDiscoverySuggestion[] = [];

    // Suggest recipes based on skill progression
    if (recipeInsights.skillProgression.suggestedNext.length > 0) {
      const suggestionId = 'skill-building';
      if (!dismissedSuggestions.has(suggestionId)) {
        suggestions.push({
          id: suggestionId,
          type: 'skill-building',
          message: `Ready for a challenge? Try some ${recipeInsights.skillProgression.currentLevel === 'beginner' ? 'intermediate' : 'advanced'} recipes to level up your cooking skills.`,
          recipes: recipeInsights.skillProgression.suggestedNext
        });
      }
    }

    // Suggest new cuisines to explore
    if (recipeInsights.cuisineVariety.suggested.length > 0) {
      const suggestionId = 'cuisine-exploration';
      if (!dismissedSuggestions.has(suggestionId)) {
        suggestions.push({
          id: suggestionId,
          type: 'cuisine-exploration',
          message: `Expand your palate! Try ${recipeInsights.cuisineVariety.suggested[0]} cuisine.`,
          recipes: recipes.filter(r => r.cuisine === recipeInsights.cuisineVariety.suggested[0]).slice(0, 3)
        });
      }
    }

    // Suggest trying recipes that have been saved but not cooked
    const untriedFavorites = recipes.filter(r => r.metadata.isFavorite && r.metadata.cookCount === 0);
    if (untriedFavorites.length > 0) {
      const suggestionId = 'untried-favorites';
      if (!dismissedSuggestions.has(suggestionId)) {
        suggestions.push({
          id: suggestionId,
          type: 'dietary-match',
          message: `You have ${untriedFavorites.length} favorite recipes you haven't tried cooking yet!`,
          recipes: untriedFavorites.slice(0, 3)
        });
      }
    }

    return suggestions.filter(s => !dismissedSuggestions.has(s.id));
  }, [recipes, recipeInsights, enableRecipeAgent, dismissedSuggestions]);

  // Dismiss suggestion function
  const dismissDiscoverySuggestion = useCallback((suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]));
  }, []);

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
    toggleFavorite,
    getFavorites,
    loadRecipes,
    refreshRecipes,
    // Agent-enhanced features (additive)
    recipeDiscoverySuggestions,
    recipeInsights,
    dismissDiscoverySuggestion,
    enableRecipeAgent,
    getRecipesForIngredients,
  };
}