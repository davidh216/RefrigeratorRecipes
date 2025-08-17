import { useState, useCallback, useMemo } from 'react';
import { 
  Recipe, 
  RecipeRecommendation, 
  RecommendationFilters,
  Ingredient,
  RecipeIngredient
} from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRecipes } from '@/lib/firebase/firestore';

export interface UseRecipeRecommendationsReturn {
  recommendations: RecipeRecommendation[];
  filteredRecommendations: RecipeRecommendation[];
  filters: RecommendationFilters;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  generateRecommendations: (userIngredients: Ingredient[]) => Promise<void>;
  setFilters: (filters: Partial<RecommendationFilters>) => void;
  clearFilters: () => void;
  
  // Helper functions
  getRecommendationById: (recipeId: string) => RecipeRecommendation | undefined;
  getTopRecommendations: (count: number) => RecipeRecommendation[];
  getRecommendationsByCategory: (category: string) => RecipeRecommendation[];
}

const DEFAULT_FILTERS: RecommendationFilters = {
  maxMissingIngredients: 5,
  minMatchPercentage: 50,
  difficulty: 'all',
  cuisine: '',
  mealType: [],
  dietary: [],
  maxPrepTime: undefined,
  maxCookTime: undefined,
};

export function useRecipeRecommendations(): UseRecipeRecommendationsReturn {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<RecipeRecommendation[]>([]);
  const [filters, setFiltersState] = useState<RecommendationFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate ingredient match for a recipe
  const calculateIngredientMatch = useCallback((
    recipe: Recipe, 
    userIngredients: Ingredient[]
  ): {
    available: number;
    total: number;
    percentage: number;
    missing: RecipeIngredient[];
  } => {
    if (userIngredients.length === 0) {
      return {
        available: 0,
        total: recipe.ingredients.length,
        percentage: 0,
        missing: recipe.ingredients,
      };
    }

    const userIngredientMap = new Map<string, Ingredient>();
    userIngredients.forEach(ing => {
      userIngredientMap.set(ing.name.toLowerCase(), ing);
    });

    const missing: RecipeIngredient[] = [];
    let available = 0;

    recipe.ingredients.forEach(recipeIng => {
      const userIngredient = userIngredientMap.get(recipeIng.name.toLowerCase());
      if (userIngredient && userIngredient.quantity >= recipeIng.amount) {
        available++;
      } else {
        missing.push(recipeIng);
      }
    });

    const percentage = Math.round((available / recipe.ingredients.length) * 100);

    return {
      available,
      total: recipe.ingredients.length,
      percentage,
      missing,
    };
  }, []);

  // Generate recommendation reasons
  const generateReasons = useCallback((
    recipe: Recipe,
    match: { available: number; total: number; percentage: number; missing: RecipeIngredient[] }
  ): string[] => {
    const reasons: string[] = [];

    // High ingredient match
    if (match.percentage >= 80) {
      reasons.push('High ingredient availability');
    } else if (match.percentage >= 60) {
      reasons.push('Good ingredient match');
    }

    // Quick recipes
    if (recipe.timing.totalTime <= 30) {
      reasons.push('Quick to prepare');
    }

    // Popular recipes
    if (recipe.metadata.cookCount > 5) {
      reasons.push('Frequently cooked');
    }

    // Favorite recipes
    if (recipe.metadata.isFavorite) {
      reasons.push('Your favorite');
    }

    // Easy difficulty
    if (recipe.difficulty === 'easy') {
      reasons.push('Easy to make');
    }

    // Recent recipes
    const daysSinceCreated = Math.floor(
      (Date.now() - recipe.metadata.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreated <= 7) {
      reasons.push('Recently added');
    }

    // Dietary preferences (could be enhanced with user preferences)
    if (recipe.dietary.includes('vegetarian')) {
      reasons.push('Vegetarian option');
    }

    return reasons;
  }, []);

  // Calculate recommendation score
  const calculateScore = useCallback((
    recipe: Recipe,
    match: { available: number; total: number; percentage: number; missing: RecipeIngredient[] }
  ): number => {
    let score = 0;

    // Base score from ingredient match (0-100)
    score += match.percentage;

    // Bonus for high match
    if (match.percentage >= 90) score += 20;
    else if (match.percentage >= 80) score += 15;
    else if (match.percentage >= 70) score += 10;

    // Bonus for quick recipes
    if (recipe.timing.totalTime <= 15) score += 15;
    else if (recipe.timing.totalTime <= 30) score += 10;
    else if (recipe.timing.totalTime <= 60) score += 5;

    // Bonus for easy difficulty
    if (recipe.difficulty === 'easy') score += 10;
    else if (recipe.difficulty === 'medium') score += 5;

    // Bonus for frequently cooked recipes
    if (recipe.metadata.cookCount > 10) score += 15;
    else if (recipe.metadata.cookCount > 5) score += 10;
    else if (recipe.metadata.cookCount > 0) score += 5;

    // Bonus for favorites
    if (recipe.metadata.isFavorite) score += 20;

    // Bonus for high ratings
    if (recipe.ratings.average >= 4.5) score += 15;
    else if (recipe.ratings.average >= 4.0) score += 10;
    else if (recipe.ratings.average >= 3.5) score += 5;

    // Penalty for many missing ingredients
    if (match.missing.length > 5) score -= 10;
    else if (match.missing.length > 3) score -= 5;

    return Math.max(0, Math.min(100, score));
  }, []);

  // Generate recommendations
  const generateRecommendations = useCallback(async (userIngredients: Ingredient[]) => {
    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get all user recipes
      const recipes = await getUserRecipes(user.uid);
      
      // Calculate recommendations for each recipe
      const recipeRecommendations: RecipeRecommendation[] = recipes.map(recipe => {
        const match = calculateIngredientMatch(recipe, userIngredients);
        const reasons = generateReasons(recipe, match);
        const score = calculateScore(recipe, match);

        return {
          recipe,
          matchPercentage: match.percentage,
          availableIngredients: match.available,
          totalIngredients: match.total,
          missingIngredients: match.missing,
          reasons,
        };
      });

      // Sort by score (highest first)
      recipeRecommendations.sort((a, b) => {
        const scoreA = calculateScore(a.recipe, {
          available: a.availableIngredients,
          total: a.totalIngredients,
          percentage: a.matchPercentage,
          missing: a.missingIngredients,
        });
        const scoreB = calculateScore(b.recipe, {
          available: b.availableIngredients,
          total: b.totalIngredients,
          percentage: b.matchPercentage,
          missing: b.missingIngredients,
        });
        return scoreB - scoreA;
      });

      setRecommendations(recipeRecommendations);
    } catch (err: unknown) {
      setError('Failed to generate recommendations: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, calculateIngredientMatch, generateReasons, calculateScore]);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<RecommendationFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Get recommendation by ID
  const getRecommendationById = useCallback((recipeId: string) => {
    return recommendations.find(rec => rec.recipe.id === recipeId);
  }, [recommendations]);

  // Get top recommendations
  const getTopRecommendations = useCallback((count: number) => {
    return recommendations.slice(0, count);
  }, [recommendations]);

  // Get recommendations by category
  const getRecommendationsByCategory = useCallback((category: string) => {
    return recommendations.filter(rec => 
      rec.recipe.tags.includes(category) || 
      rec.recipe.cuisine === category
    );
  }, [recommendations]);

  // Filter recommendations
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec => {
      // Missing ingredients filter
      if (rec.missingIngredients.length > filters.maxMissingIngredients) {
        return false;
      }

      // Match percentage filter
      if (rec.matchPercentage < filters.minMatchPercentage) {
        return false;
      }

      // Difficulty filter
      if (filters.difficulty !== 'all' && rec.recipe.difficulty !== filters.difficulty) {
        return false;
      }

      // Cuisine filter
      if (filters.cuisine && rec.recipe.cuisine !== filters.cuisine) {
        return false;
      }

      // Meal type filter
      if (filters.mealType.length > 0) {
        const hasMatchingMealType = filters.mealType.some(filterMealType =>
          rec.recipe.mealType.includes(filterMealType)
        );
        if (!hasMatchingMealType) {
          return false;
        }
      }

      // Dietary filter
      if (filters.dietary.length > 0) {
        const hasMatchingDietary = filters.dietary.every(filterDietary =>
          rec.recipe.dietary.includes(filterDietary)
        );
        if (!hasMatchingDietary) {
          return false;
        }
      }

      // Prep time filter
      if (filters.maxPrepTime && rec.recipe.timing.prepTime > filters.maxPrepTime) {
        return false;
      }

      // Cook time filter
      if (filters.maxCookTime && rec.recipe.timing.cookTime > filters.maxCookTime) {
        return false;
      }

      return true;
    });
  }, [recommendations, filters]);

  return {
    recommendations,
    filteredRecommendations,
    filters,
    isLoading,
    error,
    generateRecommendations,
    setFilters,
    clearFilters,
    getRecommendationById,
    getTopRecommendations,
    getRecommendationsByCategory,
  };
}
