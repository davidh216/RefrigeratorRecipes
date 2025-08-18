import { useState, useCallback, useMemo, useEffect } from 'react';
import { MealPlan, MealPlanFormData, WeeklyMealPlanSummary, MealSlot, Recipe } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  createMealPlan,
  getUserMealPlans,
  updateMealPlan as updateFirestoreMealPlan,
  deleteMealPlan as deleteFirestoreMealPlan,
  subscribeToUserMealPlans,
  getMealPlanByWeek,
  getMealPlan
} from '@/lib/firebase/firestore';
import { demoMealPlans } from '@/lib/demo-data';

export interface UseMealPlanReturn {
  mealPlans: MealPlan[];
  currentWeekPlan: MealPlan | null;
  currentWeek: Date;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createMealPlan: (data: MealPlanFormData) => Promise<void>;
  updateMealPlan: (id: string, data: Partial<MealPlanFormData>) => Promise<void>;
  deleteMealPlan: (id: string) => Promise<void>;
  addMealToPlan: (planId: string, meal: MealSlot) => Promise<void>;
  removeMealFromPlan: (planId: string, mealId: string) => Promise<void>;
  updateMealInPlan: (planId: string, mealId: string, meal: Partial<MealSlot>) => Promise<void>;
  
  // Meal slot management
  assignRecipeToSlot: (slotId: string, recipe: Recipe, servings?: number) => Promise<void>;
  removeRecipeFromSlot: (slotId: string) => Promise<void>;
  updateMealNotes: (slotId: string, notes: string) => Promise<void>;
  getMealSlot: (slotId: string) => MealSlot | undefined;
  
  // Week navigation
  navigateWeek: (direction: 'prev' | 'next') => Promise<void>;
  loadOrCreateWeekPlan: (weekStart: Date) => Promise<MealPlan>;
  
  // Utility functions
  getWeeklySummary: () => WeeklyMealPlanSummary;
  
  // Firebase functions
  loadMealPlans: () => Promise<void>;
  refreshMealPlans: () => void;
}

// Helper function to get Monday of a given week
const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
};

// Helper function to get Sunday of a given week
const getSundayOfWeek = (date: Date): Date => {
  const monday = getMondayOfWeek(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
};

// Helper function to generate meal slots for a week
const generateWeekMealSlots = (weekStart: Date): MealSlot[] => {
  const slots: MealSlot[] = [];
  const mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  
  for (let day = 0; day < 7; day++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + day);
    
    mealTypes.forEach((mealType, index) => {
      slots.push({
        id: `${date.toISOString().split('T')[0]}-${mealType}`,
        date: new Date(date),
        mealType,
        recipeId: undefined,
        recipe: undefined,
        notes: '',
        servings: undefined
      });
    });
  }
  
  return slots;
};

// Helper function to transform MealSlot[] to MealPlanFormData format for Firebase
const transformMealsToFormData = (meals: MealSlot[]) => {
  return meals.map(meal => ({
    date: meal.date.toISOString().split('T')[0], // Convert Date to string
    mealType: meal.mealType,
    recipeId: meal.recipeId,
    notes: meal.notes,
    servings: meal.servings,
  }));
};

// Helper function to transform MealPlanFormData format to MealSlot[] for components
const transformFormDataToMeals = (meals: MealPlanFormData['meals']): MealSlot[] => {
  return meals.map(meal => ({
    id: `${meal.date}-${meal.mealType}`,
    date: new Date(meal.date),
    mealType: meal.mealType,
    recipeId: meal.recipeId,
    notes: meal.notes,
    servings: meal.servings,
  }));
};

export function useMealPlan(): UseMealPlanReturn {
  const { user, isDemoMode } = useAuth();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [currentWeek, setCurrentWeek] = useState<Date>(getMondayOfWeek(new Date()));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  // Initialize demo mode
  useEffect(() => {
    if (isDemoMode) {
      setMealPlans(demoMealPlans);
      
      // Ensure there's a meal plan for the current week
      const currentWeekPlan = demoMealPlans.find(plan => {
        const planStart = new Date(plan.weekStart);
        const currentStart = new Date(currentWeek);
        planStart.setHours(0, 0, 0, 0);
        currentStart.setHours(0, 0, 0, 0);
        return planStart.getTime() === currentStart.getTime();
      });

      if (!currentWeekPlan) {
        // Create a meal plan for the current week
        const newPlan: MealPlan = {
          id: `demo-meal-plan-current-${Date.now()}`,
          userId: 'demo-user-id',
          weekStart: new Date(currentWeek),
          weekEnd: getSundayOfWeek(currentWeek),
          meals: generateWeekMealSlots(currentWeek),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setMealPlans(prev => [...prev, newPlan]);
      }
      
      setIsLoading(false);
      setError(null);
    }
  }, [isDemoMode, currentWeek]);

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
    const plan = mealPlans.find(plan => {
      const planStart = new Date(plan.weekStart);
      const currentStart = new Date(currentWeek);
      planStart.setHours(0, 0, 0, 0);
      currentStart.setHours(0, 0, 0, 0);
      return planStart.getTime() === currentStart.getTime();
    }) || null;
    
    console.log('currentWeekPlan calculation:', {
      currentWeek: currentWeek.toISOString(),
      availablePlans: mealPlans.map(p => ({ id: p.id, weekStart: p.weekStart.toISOString() })),
      foundPlan: !!plan
    });
    
    return plan;
  }, [mealPlans, currentWeek]);

  // Load or create week plan
  const loadOrCreateWeekPlan = useCallback(async (weekStart: Date): Promise<MealPlan> => {
    if (isDemoMode) {
      // In demo mode, create a new plan if it doesn't exist
      const existingPlan = mealPlans.find(plan => {
        const planStart = new Date(plan.weekStart);
        planStart.setHours(0, 0, 0, 0);
        const targetStart = new Date(weekStart);
        targetStart.setHours(0, 0, 0, 0);
        return planStart.getTime() === targetStart.getTime();
      });

      if (existingPlan) {
        return existingPlan;
      }

      // Create new demo plan
      const newPlan: MealPlan = {
        id: `demo-meal-plan-${Date.now()}`,
        userId: 'demo-user-id',
        weekStart: new Date(weekStart),
        weekEnd: getSundayOfWeek(weekStart),
        meals: generateWeekMealSlots(weekStart),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setMealPlans(prev => [...prev, newPlan]);
      return newPlan;
    }

    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      // Try to get existing plan
      let plan = await getMealPlanByWeek(user.uid, weekStart);
      
      if (!plan) {
        // Create new plan if it doesn't exist
        const weekEnd = getSundayOfWeek(weekStart);
        const slots = generateWeekMealSlots(weekStart);
        const newPlanData: MealPlanFormData = {
          weekStart: weekStart.toISOString(),
          meals: slots.map(slot => ({
            date: slot.date.toISOString(),
            mealType: slot.mealType,
            recipeId: slot.recipeId,
            notes: slot.notes,
            servings: slot.servings
          }))
        };
        
        const planId = await createMealPlan(user.uid, newPlanData);
        plan = await getMealPlan(user.uid, planId);
        
        if (!plan) {
          throw new Error('Failed to create meal plan');
        }
      }
      
      return plan;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(`Failed to load or create week plan: ${errorMessage}`);
    }
  }, [user?.uid, mealPlans, isDemoMode]);

  // Navigate week
  const navigateWeek = useCallback(async (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    if (direction === 'prev') {
      newWeek.setDate(currentWeek.getDate() - 7);
    } else {
      newWeek.setDate(currentWeek.getDate() + 7);
    }
    
    setCurrentWeek(newWeek);
    
    // Load or create the plan for the new week
    try {
      await loadOrCreateWeekPlan(newWeek);
    } catch (err: unknown) {
      setError('Failed to navigate week: ' + ((err as Error).message || 'Unknown error'));
    }
  }, [currentWeek, loadOrCreateWeekPlan]);

  // Get meal slot by ID
  const getMealSlot = useCallback((slotId: string): MealSlot | undefined => {
    if (!currentWeekPlan) return undefined;
    return currentWeekPlan.meals.find(meal => meal.id === slotId);
  }, [currentWeekPlan]);

  // Assign recipe to slot
  const assignRecipeToSlot = useCallback(async (slotId: string, recipe: Recipe, servings?: number) => {
    console.log('assignRecipeToSlot called with:', { slotId, recipe: recipe.title, servings, currentWeekPlan: !!currentWeekPlan, isDemoMode });
    
    if (!currentWeekPlan) {
      console.error('No current week plan available. Available plans:', mealPlans.map(p => ({ id: p.id, weekStart: p.weekStart })));
      setError('No current week plan available');
      return;
    }

    if (isDemoMode) {
      // Simulate assigning recipe in demo mode
      setMealPlans(prev => prev.map(plan => 
        plan.id === currentWeekPlan.id 
          ? {
              ...plan,
              meals: plan.meals.map(meal => 
                meal.id === slotId 
                  ? { ...meal, recipeId: recipe.id, recipe, servings }
                  : meal
              ),
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
      const updatedMeals = currentWeekPlan.meals.map(meal => 
        meal.id === slotId 
          ? { ...meal, recipeId: recipe.id, recipe, servings }
          : meal
      );
      
      await updateFirestoreMealPlan(user.uid, currentWeekPlan.id, { meals: transformMealsToFormData(updatedMeals) });
      setError(null);
    } catch (err: unknown) {
      setError('Failed to assign recipe: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [currentWeekPlan, user?.uid, isDemoMode, mealPlans]);

  // Remove recipe from slot
  const removeRecipeFromSlot = useCallback(async (slotId: string) => {
    if (!currentWeekPlan) {
      setError('No current week plan available');
      return;
    }

    if (isDemoMode) {
      // Simulate removing recipe in demo mode
      setMealPlans(prev => prev.map(plan => 
        plan.id === currentWeekPlan.id 
          ? {
              ...plan,
              meals: plan.meals.map(meal => 
                meal.id === slotId 
                  ? { ...meal, recipeId: undefined, recipe: undefined, servings: undefined }
                  : meal
              ),
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
      const updatedMeals = currentWeekPlan.meals.map(meal => 
        meal.id === slotId 
          ? { ...meal, recipeId: undefined, recipe: undefined, servings: undefined }
          : meal
      );
      
      await updateFirestoreMealPlan(user.uid, currentWeekPlan.id, { meals: transformMealsToFormData(updatedMeals) });
      setError(null);
    } catch (err: unknown) {
      setError('Failed to remove recipe: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [currentWeekPlan, user?.uid, isDemoMode]);

  // Update meal notes
  const updateMealNotes = useCallback(async (slotId: string, notes: string) => {
    if (!currentWeekPlan) {
      setError('No current week plan available');
      return;
    }

    if (isDemoMode) {
      // Simulate updating notes in demo mode
      setMealPlans(prev => prev.map(plan => 
        plan.id === currentWeekPlan.id 
          ? {
              ...plan,
              meals: plan.meals.map(meal => 
                meal.id === slotId 
                  ? { ...meal, notes }
                  : meal
              ),
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
      const updatedMeals = currentWeekPlan.meals.map(meal => 
        meal.id === slotId 
          ? { ...meal, notes }
          : meal
      );
      
      await updateFirestoreMealPlan(user.uid, currentWeekPlan.id, { meals: transformMealsToFormData(updatedMeals) });
      setError(null);
    } catch (err: unknown) {
      setError('Failed to update meal notes: ' + ((err as Error).message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [currentWeekPlan, user?.uid, isDemoMode]);

  // Create meal plan
  const createMealPlanLocal = useCallback(async (data: MealPlanFormData) => {
    if (isDemoMode) {
      // Simulate creating meal plan in demo mode
      const newMealPlan: MealPlan = {
        id: `demo-meal-plan-${Date.now()}`,
        userId: 'demo-user-id',
        weekStart: new Date(data.weekStart),
        weekEnd: getSundayOfWeek(new Date(data.weekStart)),
        meals: data.meals.map(meal => ({
          id: `meal-${Date.now()}-${Math.random()}`,
          date: new Date(meal.date),
          mealType: meal.mealType,
          recipeId: meal.recipeId,
          notes: meal.notes,
          servings: meal.servings,
        })),
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
              weekStart: data.weekStart ? new Date(data.weekStart) : plan.weekStart,
              weekEnd: data.weekStart ? getSundayOfWeek(new Date(data.weekStart)) : plan.weekEnd,
              meals: data.meals ? data.meals.map(meal => ({
                id: `meal-${Date.now()}-${Math.random()}`,
                date: new Date(meal.date),
                mealType: meal.mealType,
                recipeId: meal.recipeId,
                notes: meal.notes,
                servings: meal.servings,
              })) : plan.meals,
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
        await updateFirestoreMealPlan(user.uid, planId, { meals: transformMealsToFormData(updatedMeals) });
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
        totalMeals: 28, // 7 days * 4 meals per day
        plannedMeals: 0,
        unplannedMeals: 28,
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
    currentWeek,
    isLoading,
    error,
    createMealPlan: createMealPlanLocal,
    updateMealPlan,
    deleteMealPlan,
    addMealToPlan,
    removeMealFromPlan,
    updateMealInPlan,
    assignRecipeToSlot,
    removeRecipeFromSlot,
    updateMealNotes,
    getMealSlot,
    navigateWeek,
    loadOrCreateWeekPlan,
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