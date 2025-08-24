/**
 * Agent Hook Foundation
 * 
 * Base hook that provides agent functionality and integrates with existing
 * auth and Firebase systems. Other agent features will extend this foundation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIngredients } from './useIngredients';
import { useMealPlan } from './useMealPlan';
import { useRecipes } from './useRecipes';
import { useShoppingList } from './useShoppingList';
import {
  AgentRequest,
  AgentResponse,
  UserContext,
  AgentState,
  UserAgentPreferences,
  UserInteraction,
  QueryIntent,
  AgentError,
  UseAgentReturn
} from '@/agents/types';
import { AgentRegistry } from '@/agents/base';

// Demo mode check
const isDemoMode = () => {
  if (typeof window !== 'undefined') {
    // Set demo mode automatically for development
    localStorage.setItem('demoMode', 'true');
    console.log('Demo mode enabled automatically for development');
    return true;
  }
  return !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo_key';
};

/**
 * Main agent hook that provides core functionality
 * Follows the same patterns as existing hooks like useRecipes, useIngredients
 */
export const useAgent = (): UseAgentReturn => {
  // State management following existing hook patterns
  const [state, setState] = useState<AgentState>({
    status: 'idle',
    metrics: {
      totalRequests: 0,
      successfulResponses: 0,
      averageProcessingTime: 0,
      lastActivity: new Date()
    }
  });

  const [history, setHistory] = useState<Array<{
    request: AgentRequest;
    response: AgentResponse;
    timestamp: Date;
  }>>([]);

  const [preferences, setPreferences] = useState<UserAgentPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dependencies from existing hooks
  const { user } = useAuth();
  const { ingredients } = useIngredients();
  const { currentMealPlan } = useMealPlan();
  const { recipes } = useRecipes();
  const { shoppingList } = useShoppingList();

  // Session management
  const sessionId = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const agentRegistry = useRef<AgentRegistry>(AgentRegistry.getInstance());

  /**
   * Load user preferences on mount
   */
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        
        // In demo mode, use default preferences without Firebase calls
        if (isDemoMode()) {
          const demoPrefs: UserAgentPreferences = {
            userId: user.uid,
            language: 'en',
            responseStyle: 'helpful',
            personalityMode: 'friendly',
            privacySettings: {
              shareUsageData: false,
              personalizationLevel: 'basic',
              storeConversations: false
            },
            preferences: {
              preferredCuisines: ['italian', 'american'],
              dietaryRestrictions: [],
              skillLevel: 'intermediate',
              cookingGoals: ['quick_meals', 'healthy_eating']
            },
            lastUpdated: new Date()
          };
          setPreferences(demoPrefs);
        } else {
          // Only make Firebase calls in production mode
          const { agentPreferencesService } = await import('@/agents/services');
          const userPrefs = await agentPreferencesService.getUserPreferences(user.uid);
          setPreferences(userPrefs);
        }
      } catch (err) {
        console.error('Error loading agent preferences:', err);
        setError('Failed to load preferences');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  /**
   * Build user context from current app state
   */
  const buildUserContext = useCallback((): UserContext => {
    if (!user) {
      throw new Error('User must be authenticated to use agents');
    }

    // Get current time and device info
    const now = new Date();
    const hour = now.getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    // Build comprehensive context for intelligent agents
    return {
      user: {
        id: user.uid,
        email: user.email || '',
        name: user.displayName || 'User',
        preferences: {
          dietaryRestrictions: preferences?.preferences?.dietaryRestrictions || [],
          favoriteCategories: preferences?.preferences?.preferredCuisines || []
        }
      } as User,
      availableIngredients: ingredients || [],
      availableRecipes: recipes || [],
      currentMealPlan: currentMealPlan || undefined,
      currentShoppingList: shoppingList || [],
      dietaryPreferences: {
        restrictions: preferences?.preferences?.dietaryRestrictions || [],
        favoriteCategories: preferences?.preferences?.preferredCuisines || [],
        allergens: [], // TODO: Extract from user preferences
        preferredCuisines: preferences?.preferences?.preferredCuisines || []
      },
      cookingSkillLevel: preferences?.preferences?.skillLevel || 'intermediate',
      recentActivity: {
        lastViewedRecipes: [], // TODO: Get from analytics
        recentSearches: [], // TODO: Get from search history
        lastCookedRecipes: [], // TODO: Get from meal plan history
        frequentIngredients: preferences?.learnedPreferences?.commonIngredients || []
      },
      sessionContext: {
        currentPage: typeof window !== 'undefined' ? window.location.pathname : '/',
        timeOfDay,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        device: typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : (typeof window !== 'undefined' && window.innerWidth < 1024 ? 'tablet' : 'desktop') as 'mobile' | 'tablet' | 'desktop'
      }
    };
  }, [user, ingredients, recipes, currentMealPlan, shoppingList, preferences]);

  /**
   * Send a query to the agent system
   */
  const sendQuery = useCallback(async (
    query: string,
    intent?: QueryIntent
  ): Promise<AgentResponse> => {
    if (!user) {
      throw new Error('User must be authenticated to use agents');
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Update state to processing
      setState(prev => ({
        ...prev,
        status: 'thinking'
      }));

      // Build request
      const request: AgentRequest = {
        id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        query,
        intent,
        context: buildUserContext(),
        metadata: {
          timestamp: new Date(),
          source: 'chat',
          sessionId: sessionId.current
        }
      };

      // Update state to processing
      setState(prev => ({
        ...prev,
        status: 'processing',
        currentRequest: request
      }));

      // Use intelligent response system (both demo and production mode)
      const startTime = Date.now();
      
      // Import and initialize all intelligence services
      const { QueryProcessor } = await import('@/agents/sous-chef/QueryProcessor');
      const { AgentDataService } = await import('@/agents/services/AgentDataService');
      const { ResponseGenerator } = await import('@/agents/services/ResponseGenerator');
      const { ActionExecutor } = await import('@/agents/services/ActionExecutor');
      const { PersonalizationEngine } = await import('@/agents/services/PersonalizationEngine');
      
      // Build hook returns for data access (matching actual hook interfaces)
      const ingredientsHookReturn = { 
        ingredients: ingredients || [], 
        filteredIngredients: ingredients || [], 
        addIngredient: async () => {}, 
        updateIngredient: async () => {}, 
        deleteIngredient: async () => {},
        isLoading: false,
        error: null,
        filters: {},
        sortOptions: {},
        setFilters: () => {},
        setSortOptions: () => {},
        clearFilters: () => {},
        loadIngredients: async () => {},
        refreshIngredients: () => {}
      };
      const recipesHookReturn = { 
        recipes: recipes || [], 
        addRecipe: async () => {}, 
        removeRecipe: async () => {},
        isLoading: false,
        error: null
      };
      const mealPlanHookReturn = { 
        currentMealPlan: currentMealPlan || null, 
        addRecipeToMealPlan: async () => {}, 
        removeRecipeFromMealPlan: async () => {}, 
        createMealPlan: async () => {}, 
        scheduleMeal: async () => {},
        isLoading: false,
        error: null
      };
      const shoppingHookReturn = { 
        shoppingList: shoppingList || [], 
        addItems: async () => {}, 
        removeItems: async () => {},
        isLoading: false,
        error: null
      };

      // Build action executor hook context (different interface)
      const actionHookContext = {
        useIngredients: () => ingredientsHookReturn,
        useRecipes: () => recipesHookReturn,
        useMealPlan: () => mealPlanHookReturn,
        useShoppingList: () => shoppingHookReturn
      };

      // Initialize services
      const queryProcessor = new QueryProcessor();
      const dataService = new AgentDataService(ingredientsHookReturn, recipesHookReturn, mealPlanHookReturn, shoppingHookReturn);
      const actionExecutor = new ActionExecutor(actionHookContext);
      const personalizationEngine = new PersonalizationEngine();
      const responseGenerator = new ResponseGenerator(dataService, actionExecutor, personalizationEngine);
      
      // Process the query through our intelligence pipeline
      const queryAnalysis = queryProcessor.analyzeQuery(query, request.context);
      
      // Generate intelligent response
      const response = await responseGenerator.generateResponse({
        query: query,
        analysis: queryAnalysis,
        userContext: request.context,
        dataService: dataService
      });

      const processingTime = Date.now() - startTime;
      
      // Enhance response with metadata
      const intelligentResponse: AgentResponse = {
        ...response,
        id: `resp-${Date.now()}`,
        metadata: {
          processingTime,
          agent: 'intelligent-sous-chef',
          version: '2.0.0',
          queryAnalysis: {
            intent: queryAnalysis.intent,
            confidence: queryAnalysis.confidence,
            patterns: queryAnalysis.patterns
          }
        }
      };

      // Learn from this interaction
      await personalizationEngine.learnFromInteraction({
        type: 'query',
        data: { query, analysis: queryAnalysis },
        outcome: 'neutral' // Will be updated based on user feedback
      });

      // Add to history
      setHistory(prev => [...prev, {
        request,
        response: intelligentResponse,
        timestamp: new Date()
      }]);

      setState(prev => ({
        ...prev,
        status: 'idle',
        currentRequest: undefined,
        metrics: {
          ...prev.metrics,
          totalRequests: prev.metrics.totalRequests + 1,
          successfulResponses: prev.metrics.successfulResponses + 1,
          averageProcessingTime: processingTime,
          lastActivity: new Date()
        }
      }));

      return intelligentResponse;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      
      setError(errorMessage);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: {
          message: errorMessage,
          code: err instanceof AgentError ? err.code : 'UNKNOWN_ERROR',
          timestamp: new Date()
        },
        currentRequest: undefined
      }));

      // Return error response
      const errorResponse: AgentResponse = {
        id: `error-${Date.now()}`,
        agentType: 'system',
        message: errorMessage,
        intent: intent || 'general-help',
        confidence: 'very-low',
        priority: 'medium',
        followUpSuggestions: [
          "Try rephrasing your question",
          "Check your internet connection",
          "Contact support if the problem persists"
        ],
        metadata: {
          processingTime: 0,
          timestamp: new Date(),
          version: '1.0.0'
        }
      };

      setHistory(prev => [
        ...prev,
        {
          request: {
            id: `error-req-${Date.now()}`,
            query,
            intent,
            context: buildUserContext(),
            metadata: {
              timestamp: new Date(),
              source: 'chat',
              sessionId: sessionId.current
            }
          },
          response: errorResponse,
          timestamp: new Date()
        }
      ]);

      return errorResponse;

    } finally {
      setIsProcessing(false);
    }
  }, [user, buildUserContext, preferences]);

  /**
   * Clear chat history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setState(prev => ({
      ...prev,
      lastResponse: undefined,
      error: undefined
    }));
  }, []);

  /**
   * Provide feedback on a response
   */
  const provideFeedback = useCallback(async (
    responseId: string,
    feedback: UserInteraction['feedback']
  ): Promise<void> => {
    if (!user) return;

    try {
      // Find the interaction in history
      const interaction = history.find(h => h.response.id === responseId);
      if (!interaction) {
        throw new Error('Interaction not found');
      }

      // Find the stored interaction and add feedback
      const interactions = await agentInteractionService.getSessionInteractions(
        user.uid,
        sessionId.current
      );

      const storedInteraction = interactions.find(
        i => i.response.id === responseId
      );

      if (storedInteraction) {
        await agentInteractionService.addFeedback(
          user.uid,
          storedInteraction.id,
          feedback
        );
      }

      // Update metrics based on feedback
      if (feedback.helpful) {
        setState(prev => ({
          ...prev,
          metrics: {
            ...prev.metrics,
            successfulResponses: prev.metrics.successfulResponses + 1
          }
        }));
      }
    } catch (err) {
      console.error('Error providing feedback:', err);
      setError('Failed to record feedback');
    }
  }, [user, history]);

  /**
   * Update user preferences
   */
  const updatePreferences = useCallback(async (
    updates: Partial<UserAgentPreferences['preferences']>
  ): Promise<void> => {
    if (!user) return;

    try {
      setIsLoading(true);
      await agentPreferencesService.updateUserPreferences(user.uid, updates);
      
      // Reload preferences
      const updatedPrefs = await agentPreferencesService.getUserPreferences(user.uid);
      setPreferences(updatedPrefs);
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError('Failed to update preferences');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setState(prev => ({
      ...prev,
      error: undefined,
      status: prev.status === 'error' ? 'idle' : prev.status
    }));
  }, []);

  // Return the hook interface
  return {
    sendQuery,
    state,
    history,
    clearHistory,
    provideFeedback,
    preferences,
    updatePreferences,
    isLoading,
    isProcessing,
    error,
    clearError
  };
};

/**
 * Hook for getting agent analytics and metrics
 */
export const useAgentAnalytics = (agentType?: string) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async (days: number = 30) => {
    if (!user || !agentType) return;

    try {
      setLoading(true);
      setError(null);
      const agentMetrics = await agentAnalyticsService.getAgentMetrics(
        user.uid,
        agentType,
        days
      );
      setMetrics(agentMetrics);
    } catch (err) {
      console.error('Error loading agent metrics:', err);
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [user, agentType]);

  useEffect(() => {
    if (user && agentType) {
      loadMetrics();
    }
  }, [user, agentType, loadMetrics]);

  return {
    metrics,
    loading,
    error,
    loadMetrics
  };
};