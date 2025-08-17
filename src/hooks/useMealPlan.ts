import { useState, useCallback, useMemo, useEffect } from 'react';
import { MealPlan, MealPlanFormData, WeeklyMealPlanSummary } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  createMealPlan,
  getUserMealPlans,
  updateMealPlan as updateFirestoreMealPlan,
  deleteMealPlan as deleteFirestoreMealPlan,
  subscribeToUserMealPlans
} from '@/lib/firebase/firestore';
import { demoMealPlans } from '@/lib/demo-data';

export interface UseMealPlanReturn {
  mealPlans: MealPlan[];
  currentWeekPlan: MealPlan | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createMealPlan: (data: MealPlanFormData) => Promise<void>;
  updateMealPlan: (id: string, data: Partial<MealPlanFormData>) => Promise<void>;
  deleteMealPlan: (id: string) => Promise<void>;
  addMealToPlan: (planId: string, meal: any) => Promise<void>;
  removeMealFromPlan: (planId: string, mealId: string) => Promise<void>;
  updateMealInPlan: (planId: string, mealId: string, meal: any) => Promise<void>;
  
  // Utility functions
  getWeeklySummary: () => WeeklyMealPlanSummary;
  
  // Firebase functions
  loadMealPlans: () => Promise<void>;
  refreshMealPlans: () => void;
}

export function useMealPlan(): UseMealPlanReturn {
  const { user, isDemoMode } = useAuth();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  // Demo mode: Use demo data
  useEffect(() => {
    if (isDemoMode) {
      setMealPlans(demoMealPlans);
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
      setMealPlans([]);
      return;
    }

    setIsLoading(true);
    
    const unsubscribeFn = subscribeToUserMealPlans(
      user.uid,
      (newMealPlans) => {
        setMealPlans(newMealPlans);
        setIsLoading(false);
        setError(null);
      },
      (error) => {
        setError('Failed to load meal plans: ' + error.message);
        setIsLoading(false);
      }
    );

    setUnsubscribe(() => unsubscribeFn);

    // Cleanup function
    return () => {
      unsubscribeFn();
    };
  }, [user?.uid, isDemoMode]);

  // Get current week's meal plan
  const currentWeekPlan = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    return mealPlans.find(plan => {
      const planStart = new Date(plan.weekStart);
      planStart.setHours(0, 0, 0, 0);
      return planStart.getTime() === startOfWeek.getTime();
    }) || null;
  }, [mealPlans]);

  // Create meal plan
  const createMealPlan = useCallback(async (data: MealPlanFormData) => {
    if (isDemoMode) {
      // Simulate creating meal plan in demo mode
      const newMealPlan: MealPlan = {
        id: `demo-meal-plan-${Date.now()}`,
        userId: 'demo-user-id',
        weekStart: new Date(data.weekStart),
        weekEnd: new Date(data.weekEnd),
        meals: data.meals || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setMealPlans(prev => [...prev, newMealPlan]);
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await createMealPlan(user.uid, data);
      setError(null);
      // The real-time listener will update the state automatically
    } catch (err: unknown) {
      setError('Failed to create meal plan: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Update meal plan
  const updateMealPlan = useCallback(async (id: string, data: Partial<MealPlanFormData>) => {
    if (isDemoMode) {
      // Simulate updating meal plan in demo mode
      setMealPlans(prev => prev.map(plan => 
        plan.id === id 
          ? { 
              ...plan, 
              ...data,
              updatedAt: new Date()
            }
          : plan
      ));
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await updateFirestoreMealPlan(user.uid, id, data);
      setError(null);
      // The real-time listener will update the state automatically
    } catch (err: unknown) {
      setError('Failed to update meal plan: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Delete meal plan
  const deleteMealPlan = useCallback(async (id: string) => {
    if (isDemoMode) {
      // Simulate deleting meal plan in demo mode
      setMealPlans(prev => prev.filter(plan => plan.id !== id));
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      await deleteFirestoreMealPlan(user.uid, id);
      setError(null);
      // The real-time listener will update the state automatically
    } catch (err: unknown) {
      setError('Failed to delete meal plan: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Add meal to plan
  const addMealToPlan = useCallback(async (planId: string, meal: any) => {
    if (isDemoMode) {
      // Simulate adding meal to plan in demo mode
      setMealPlans(prev => prev.map(plan => 
        plan.id === planId 
          ? { 
              ...plan, 
              meals: [...plan.meals, meal],
              updatedAt: new Date()
            }
          : plan
      ));
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const plan = mealPlans.find(p => p.id === planId);
      if (plan) {
        const updatedMeals = [...plan.meals, meal];
        await updateFirestoreMealPlan(user.uid, planId, { meals: updatedMeals });
      }
      setError(null);
    } catch (err: unknown) {
      setError('Failed to add meal to plan: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, mealPlans, isDemoMode]);

  // Remove meal from plan
  const removeMealFromPlan = useCallback(async (planId: string, mealId: string) => {
    if (isDemoMode) {
      // Simulate removing meal from plan in demo mode
      setMealPlans(prev => prev.map(plan => 
        plan.id === planId 
          ? { 
              ...plan, 
              meals: plan.meals.filter(meal => meal.id !== mealId),
              updatedAt: new Date()
            }
          : plan
      ));
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const plan = mealPlans.find(p => p.id === planId);
      if (plan) {
        const updatedMeals = plan.meals.filter(meal => meal.id !== mealId);
        await updateFirestoreMealPlan(user.uid, planId, { meals: updatedMeals });
      }
      setError(null);
    } catch (err: unknown) {
      setError('Failed to remove meal from plan: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, mealPlans, isDemoMode]);

  // Update meal in plan
  const updateMealInPlan = useCallback(async (planId: string, mealId: string, updatedMeal: any) => {
    if (isDemoMode) {
      // Simulate updating meal in plan in demo mode
      setMealPlans(prev => prev.map(plan => 
        plan.id === planId 
          ? { 
              ...plan, 
              meals: plan.meals.map(meal => meal.id === mealId ? updatedMeal : meal),
              updatedAt: new Date()
            }
          : plan
      ));
      return;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const plan = mealPlans.find(p => p.id === planId);
      if (plan) {
        const updatedMeals = plan.meals.map(meal => meal.id === mealId ? updatedMeal : meal);
        await updateFirestoreMealPlan(user.uid, planId, { meals: updatedMeals });
      }
      setError(null);
    } catch (err: unknown) {
      setError('Failed to update meal in plan: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, mealPlans, isDemoMode]);

  // Load meal plans (for manual refresh)
  const loadMealPlans = useCallback(async () => {
    if (isDemoMode) {
      setMealPlans(demoMealPlans);
      return;
    }

    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const userMealPlans = await getUserMealPlans(user.uid);
      setMealPlans(userMealPlans);
      setError(null);
    } catch (err: unknown) {
      setError('Failed to load meal plans: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Refresh meal plans
  const refreshMealPlans = useCallback(() => {
    if (isDemoMode) {
      setMealPlans(demoMealPlans);
    } else {
      loadMealPlans();
    }
  }, [isDemoMode, loadMealPlans]);

  // Get weekly summary
  const getWeeklySummary = useCallback((): WeeklyMealPlanSummary => {
    if (!currentWeekPlan) {
      return {
        totalMeals: 0,
        plannedMeals: 0,
        unplannedMeals: 0,
        totalRecipes: 0,
        uniqueRecipes: 0,
        mealsByType: {
          breakfast: 0,
          lunch: 0,
          dinner: 0,
          snack: 0
        },
        ingredientsNeeded: []
      };
    }

    const totalMeals = currentWeekPlan.meals.length;
    const plannedMeals = currentWeekPlan.meals.filter(meal => meal.recipeId).length;
    const unplannedMeals = totalMeals - plannedMeals;
    const totalRecipes = plannedMeals;
    const uniqueRecipes = new Set(currentWeekPlan.meals.map(meal => meal.recipeId).filter(Boolean)).size;
    
    const mealsByType = currentWeekPlan.meals.reduce((acc, meal) => {
      acc[meal.mealType] = (acc[meal.mealType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // TODO: Implement ingredients calculation based on recipes
    const ingredientsNeeded: string[] = [];

    return {
      totalMeals,
      plannedMeals,
      unplannedMeals,
      totalRecipes,
      uniqueRecipes,
      mealsByType: {
        breakfast: mealsByType.breakfast || 0,
        lunch: mealsByType.lunch || 0,
        dinner: mealsByType.dinner || 0,
        snack: mealsByType.snack || 0
      },
      ingredientsNeeded
    };
  }, [currentWeekPlan]);

  return {
    mealPlans,
    currentWeekPlan,
    isLoading,
    error,
    createMealPlan,
    updateMealPlan,
    deleteMealPlan,
    addMealToPlan,
    removeMealFromPlan,
    updateMealInPlan,
    getWeeklySummary,
    loadMealPlans,
    refreshMealPlans,
  };
}

// Hook for recipe management (placeholder for future recipe integration)
export const useRecipes = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getRecipeById = useCallback(
    (id: string): Recipe | undefined => {
      return recipes.find((recipe) => recipe.id === id);
    },
    [recipes]
  );

  const searchRecipes = useCallback(
    (query: string): Recipe[] => {
      if (!query.trim()) return recipes;

      const lowercaseQuery = query.toLowerCase();
      return recipes.filter(
        (recipe) =>
          recipe.title.toLowerCase().includes(lowercaseQuery) ||
          recipe.description.toLowerCase().includes(lowercaseQuery) ||
          recipe.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery))
      );
    },
    [recipes]
  );

  return {
    recipes,
    isLoading,
    getRecipeById,
    searchRecipes,
  };
};