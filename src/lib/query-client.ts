import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (but only if data is stale)
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Refetch on mount if data is stale
      refetchOnMount: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      // Retry delay
      retryDelay: 1000,
    },
  },
});

// Query keys factory for consistent cache keys
export const queryKeys = {
  // User data
  user: (userId: string) => ['user', userId],
  
  // Ingredients
  ingredients: (userId: string) => ['ingredients', userId],
  ingredient: (userId: string, ingredientId: string) => ['ingredients', userId, ingredientId],
  ingredientsByLocation: (userId: string, location: string) => ['ingredients', userId, 'location', location],
  expiringIngredients: (userId: string, days: number) => ['ingredients', userId, 'expiring', days],
  
  // Recipes
  recipes: (userId: string) => ['recipes', userId],
  recipe: (userId: string, recipeId: string) => ['recipes', userId, recipeId],
  recipesByIngredient: (userId: string, ingredientName: string) => ['recipes', userId, 'ingredient', ingredientName],
  recipesByCategory: (userId: string, category: string) => ['recipes', userId, 'category', category],
  searchRecipes: (userId: string, searchTerm: string) => ['recipes', userId, 'search', searchTerm],
  
  // Meal Plans
  mealPlans: (userId: string) => ['mealPlans', userId],
  mealPlan: (userId: string, mealPlanId: string) => ['mealPlans', userId, mealPlanId],
  mealPlanByWeek: (userId: string, weekStart: string) => ['mealPlans', userId, 'week', weekStart],
  mealPlansByDateRange: (userId: string, startDate: string, endDate: string) => ['mealPlans', userId, 'range', startDate, endDate],
  
  // Shopping Lists
  shoppingLists: (userId: string) => ['shoppingLists', userId],
  shoppingList: (userId: string, shoppingListId: string) => ['shoppingLists', userId, shoppingListId],
} as const;

// Prefetch functions for common queries
export const prefetchQueries = {
  // Prefetch user's ingredients
  ingredients: async (userId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.ingredients(userId),
      queryFn: () => import('@/lib/firebase/firestore').then(m => m.getUserIngredients(userId)),
    });
  },
  
  // Prefetch user's recipes
  recipes: async (userId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.recipes(userId),
      queryFn: () => import('@/lib/firebase/firestore').then(m => m.getUserRecipes(userId)),
    });
  },
  
  // Prefetch user's meal plans
  mealPlans: async (userId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.mealPlans(userId),
      queryFn: () => import('@/lib/firebase/firestore').then(m => m.getUserMealPlans(userId)),
    });
  },
  
  // Prefetch user's shopping lists
  shoppingLists: async (userId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.shoppingLists(userId),
      queryFn: () => import('@/lib/firebase/firestore').then(m => m.getUserShoppingLists(userId)),
    });
  },
};
