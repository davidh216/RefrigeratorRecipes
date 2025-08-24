/**
 * Enhanced Recipe Recommendations Hook
 * 
 * This hook extends the existing useRecipeRecommendations with AI-powered
 * recommendations from the Sous Chef Agent while maintaining backward compatibility.
 * It provides both traditional recommendation logic and enhanced agent-based recommendations.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Recipe, 
  RecipeRecommendation, 
  RecommendationFilters,
  Ingredient,
  RecipeIngredient
} from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAgent } from './useAgent';
import { getUserRecipes } from '@/lib/firebase/firestore';
import { 
  SousChefAgent,
  QueryProcessor,
  RecommendationEngine,
  PersonalizationEngine,
  ContextEngine,
  EnhancedRecommendation,
  QueryAnalysis
} from '@/agents';

/**
 * Enhanced return interface that extends the original
 */
export interface UseEnhancedRecipeRecommendationsReturn {
  // Original interface compatibility
  recommendations: RecipeRecommendation[];
  filteredRecommendations: RecipeRecommendation[];
  filters: RecommendationFilters;
  isLoading: boolean;
  error: string | null;
  
  // Original actions
  generateRecommendations: (userIngredients: Ingredient[]) => Promise<void>;
  setFilters: (filters: Partial<RecommendationFilters>) => void;
  clearFilters: () => void;
  
  // Original helper functions
  getRecommendationById: (recipeId: string) => RecipeRecommendation | undefined;
  getTopRecommendations: (count: number) => RecipeRecommendation[];
  getRecommendationsByCategory: (category: string) => RecipeRecommendation[];
  
  // Enhanced AI features
  enhancedRecommendations: EnhancedRecommendation[];
  aiInsights: {
    personalizedSuggestions: string[];
    contextualFactors: string[];
    skillRecommendations: string[];
    optimizationTips: string[];
  };
  
  // Enhanced actions
  generateAIRecommendations: (query?: string, options?: {
    usePersonalization?: boolean;
    useContext?: boolean;
    maxResults?: number;
  }) => Promise<void>;
  
  getPersonalizedFilters: () => RecommendationFilters;
  getContextualRecommendations: (context?: 'breakfast' | 'lunch' | 'dinner' | 'snack') => EnhancedRecommendation[];
  
  // Agent integration
  agentMode: boolean;
  toggleAgentMode: () => void;
  queryAnalysis: QueryAnalysis | null;
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

/**
 * Enhanced hook that combines traditional and AI-powered recommendations
 */
export function useEnhancedRecipeRecommendations(): UseEnhancedRecipeRecommendationsReturn {
  const { user } = useAuth();
  const { sendQuery, state: agentState, preferences } = useAgent();
  
  // Original state
  const [recommendations, setRecommendations] = useState<RecipeRecommendation[]>([]);
  const [filters, setFiltersState] = useState<RecommendationFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced state
  const [enhancedRecommendations, setEnhancedRecommendations] = useState<EnhancedRecommendation[]>([]);
  const [aiInsights, setAiInsights] = useState({
    personalizedSuggestions: [],
    contextualFactors: [],
    skillRecommendations: [],
    optimizationTips: []
  });
  const [agentMode, setAgentMode] = useState(true); // Default to AI mode
  const [queryAnalysis, setQueryAnalysis] = useState<QueryAnalysis | null>(null);
  
  // Initialize agent engines
  const [queryProcessor] = useState(() => new QueryProcessor());
  const [recommendationEngine] = useState(() => new RecommendationEngine());
  const [personalizationEngine] = useState(() => new PersonalizationEngine());
  const [contextEngine] = useState(() => new ContextEngine());

  /**
   * Original recommendation generation (maintains backward compatibility)
   */
  const generateRecommendations = useCallback(async (userIngredients: Ingredient[]) => {
    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const recipes = await getUserRecipes(user.uid);
      
      // Use original recommendation logic
      const recipeRecommendations: RecipeRecommendation[] = recipes.map(recipe => {
        const match = calculateIngredientMatch(recipe, userIngredients);
        const reasons = generateReasons(recipe, match);

        return {
          recipe,
          matchPercentage: match.percentage,
          availableIngredients: match.available,
          totalIngredients: match.total,
          missingIngredients: match.missing,
          reasons,
        };
      });

      // Sort by match percentage
      recipeRecommendations.sort((a, b) => b.matchPercentage - a.matchPercentage);
      setRecommendations(recipeRecommendations);
      
      // If agent mode is enabled, also generate enhanced recommendations
      if (agentMode) {
        await generateAIRecommendations(`Recipe recommendations using my available ingredients`);
      }
      
    } catch (err: unknown) {
      setError('Failed to generate recommendations: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, agentMode]);

  /**
   * Enhanced AI-powered recommendation generation
   */
  const generateAIRecommendations = useCallback(async (
    query: string = 'Give me recipe recommendations based on my available ingredients',
    options: {
      usePersonalization?: boolean;
      useContext?: boolean;
      maxResults?: number;
    } = {}
  ) => {
    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    const {
      usePersonalization = true,
      useContext = true,
      maxResults = 10
    } = options;

    setIsLoading(true);
    setError(null);

    try {
      // Use the agent to get enhanced recommendations
      const response = await sendQuery(query, 'recipe-recommendation');
      
      if (response.data?.enhancedRecommendations) {
        const enhanced = response.data.enhancedRecommendations.slice(0, maxResults);
        setEnhancedRecommendations(enhanced);
        
        // Convert enhanced recommendations to basic format for compatibility
        const basicRecommendations = enhanced.map(er => ({
          recipe: er.recipe,
          matchPercentage: er.matchPercentage,
          availableIngredients: er.availableIngredients,
          totalIngredients: er.totalIngredients,
          missingIngredients: er.missingIngredients,
          reasons: er.reasons
        }));
        
        setRecommendations(basicRecommendations);
        
        // Extract AI insights
        if (response.data.contextualInsights) {
          setAiInsights({
            personalizedSuggestions: response.data.contextualInsights.personalizedSuggestions || [],
            contextualFactors: response.data.contextualInsights.environmentalFactors || [],
            skillRecommendations: response.data.contextualInsights.skillConsiderations || [],
            optimizationTips: enhanced.slice(0, 3).flatMap(r => r.suggestions || [])
          });
        }
      }
      
    } catch (err: unknown) {
      setError('Failed to generate AI recommendations: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, sendQuery]);

  /**
   * Get personalized filters based on user preferences and patterns
   */
  const getPersonalizedFilters = useCallback((): RecommendationFilters => {
    if (!preferences || !agentMode) {
      return DEFAULT_FILTERS;
    }

    // Create personalized filters based on user preferences
    const personalizedFilters: RecommendationFilters = {
      ...DEFAULT_FILTERS,
      maxMissingIngredients: 3, // More restrictive for better matches
      minMatchPercentage: 60, // Higher threshold for personalized recommendations
    };

    // Apply learned preferences
    if (preferences.learnedPreferences.preferredRecipeTypes.length > 0) {
      personalizedFilters.mealType = preferences.learnedPreferences.preferredRecipeTypes.slice(0, 3);
    }

    return personalizedFilters;
  }, [preferences, agentMode]);

  /**
   * Get contextual recommendations based on time of day
   */
  const getContextualRecommendations = useCallback((
    context: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'dinner'
  ): EnhancedRecommendation[] => {
    if (!agentMode || enhancedRecommendations.length === 0) {
      return [];
    }

    // Filter recommendations based on context
    return enhancedRecommendations.filter(rec => {
      return rec.recipe.mealType.includes(context);
    }).slice(0, 5);
  }, [enhancedRecommendations, agentMode]);

  /**
   * Toggle between traditional and AI-enhanced mode
   */
  const toggleAgentMode = useCallback(() => {
    setAgentMode(prev => !prev);
  }, []);

  // Original helper functions (maintaining compatibility)
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

  const generateReasons = useCallback((
    recipe: Recipe,
    match: { available: number; total: number; percentage: number; missing: RecipeIngredient[] }
  ): string[] => {
    const reasons: string[] = [];

    if (match.percentage >= 80) {
      reasons.push('High ingredient availability');
    } else if (match.percentage >= 60) {
      reasons.push('Good ingredient match');
    }

    if (recipe.totalTime <= 30) {
      reasons.push('Quick to prepare');
    }

    if (recipe.metadata?.cookCount > 5) {
      reasons.push('Frequently cooked');
    }

    if (recipe.metadata?.isFavorite) {
      reasons.push('Your favorite');
    }

    if (recipe.difficulty === 'easy') {
      reasons.push('Easy to make');
    }

    return reasons;
  }, []);

  // Original helper functions
  const setFilters = useCallback((newFilters: Partial<RecommendationFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const getRecommendationById = useCallback((recipeId: string) => {
    return recommendations.find(rec => rec.recipe.id === recipeId);
  }, [recommendations]);

  const getTopRecommendations = useCallback((count: number) => {
    return recommendations.slice(0, count);
  }, [recommendations]);

  const getRecommendationsByCategory = useCallback((category: string) => {
    return recommendations.filter(rec => 
      rec.recipe.tags.includes(category) || 
      rec.recipe.cuisine === category
    );
  }, [recommendations]);

  // Filter recommendations
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec => {
      if (rec.missingIngredients.length > filters.maxMissingIngredients) {
        return false;
      }

      if (rec.matchPercentage < filters.minMatchPercentage) {
        return false;
      }

      if (filters.difficulty !== 'all' && rec.recipe.difficulty !== filters.difficulty) {
        return false;
      }

      if (filters.cuisine && rec.recipe.cuisine !== filters.cuisine) {
        return false;
      }

      if (filters.mealType.length > 0) {
        const hasMatchingMealType = filters.mealType.some(filterMealType =>
          rec.recipe.mealType.includes(filterMealType)
        );
        if (!hasMatchingMealType) {
          return false;
        }
      }

      if (filters.dietary.length > 0) {
        const hasMatchingDietary = filters.dietary.every(filterDietary =>
          rec.recipe.dietary.includes(filterDietary)
        );
        if (!hasMatchingDietary) {
          return false;
        }
      }

      if (filters.maxPrepTime && rec.recipe.prepTime > filters.maxPrepTime) {
        return false;
      }

      if (filters.maxCookTime && rec.recipe.cookTime > filters.maxCookTime) {
        return false;
      }

      return true;
    });
  }, [recommendations, filters]);

  // Auto-apply personalized filters when preferences change
  useEffect(() => {
    if (agentMode && preferences) {
      const personalizedFilters = getPersonalizedFilters();
      setFiltersState(prev => ({ ...prev, ...personalizedFilters }));
    }
  }, [preferences, agentMode, getPersonalizedFilters]);

  return {
    // Original interface
    recommendations,
    filteredRecommendations,
    filters,
    isLoading: isLoading || agentState.status === 'processing',
    error: error || agentState.error?.message || null,
    generateRecommendations,
    setFilters,
    clearFilters,
    getRecommendationById,
    getTopRecommendations,
    getRecommendationsByCategory,
    
    // Enhanced features
    enhancedRecommendations,
    aiInsights,
    generateAIRecommendations,
    getPersonalizedFilters,
    getContextualRecommendations,
    agentMode,
    toggleAgentMode,
    queryAnalysis
  };
}