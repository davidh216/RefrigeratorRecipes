// New refactored Firestore services
export { ingredientService } from './ingredient-service';
export { recipeService } from './recipe-service';
export { mealPlanService } from './meal-plan-service';
export { shoppingListService } from './shopping-list-service';

// Base service and error handling
export { BaseFirebaseService, FirebaseServiceError } from './base-service';
export type { BaseEntity, CreateEntityData, UpdateEntityData } from './base-service';

// Data converters
export * from './data-converters';

// Collections constant (for backward compatibility)
export const COLLECTIONS = {
  USERS: 'users',
  INGREDIENTS: 'ingredients',
  RECIPES: 'recipes',
  MEAL_PLANS: 'mealPlans',
  SHOPPING_LISTS: 'shoppingLists'
} as const;

// Backward compatibility exports - these will be removed after migration
// TODO: Remove these exports after all components are migrated to use the new services

import { ingredientService } from './ingredient-service';
import { recipeService } from './recipe-service';
import { mealPlanService } from './meal-plan-service';
import { shoppingListService } from './shopping-list-service';

// Ingredient functions (backward compatibility)
export const createIngredient = async (userId: string, ingredientData: any): Promise<string> => {
  return await ingredientService.create(userId, ingredientData);
};

export const getUserIngredients = async (userId: string): Promise<any[]> => {
  return await ingredientService.getAll(userId);
};

export const getIngredient = async (userId: string, ingredientId: string): Promise<any | null> => {
  return await ingredientService.getById(userId, ingredientId);
};

export const updateIngredient = async (userId: string, ingredientId: string, updates: any): Promise<void> => {
  return await ingredientService.update(userId, ingredientId, updates);
};

export const deleteIngredient = async (userId: string, ingredientId: string): Promise<void> => {
  return await ingredientService.delete(userId, ingredientId);
};

export const subscribeToUserIngredients = (userId: string, callback: any, onError?: any) => {
  return ingredientService.subscribeToChanges(userId, callback, onError);
};

export const getExpiringIngredients = async (userId: string, daysFromNow = 3): Promise<any[]> => {
  return await ingredientService.getExpiringIngredients(userId, daysFromNow);
};

export const getIngredientsByLocation = async (userId: string, location: any): Promise<any[]> => {
  return await ingredientService.getByLocation(userId, location);
};

// Recipe functions (backward compatibility)
export const createRecipe = async (userId: string, recipeData: any): Promise<string> => {
  return await recipeService.create(userId, recipeData);
};

export const getUserRecipes = async (userId: string): Promise<any[]> => {
  return await recipeService.getAll(userId);
};

export const getRecipe = async (userId: string, recipeId: string): Promise<any | null> => {
  return await recipeService.getById(userId, recipeId);
};

export const updateRecipe = async (userId: string, recipeId: string, updates: any): Promise<void> => {
  return await recipeService.update(userId, recipeId, updates);
};

export const deleteRecipe = async (userId: string, recipeId: string): Promise<void> => {
  return await recipeService.delete(userId, recipeId);
};

export const subscribeToUserRecipes = (userId: string, callback: any, onError?: any) => {
  return recipeService.subscribeToChanges(userId, callback, onError);
};

export const getRecipesByIngredient = async (userId: string, ingredientName: string): Promise<any[]> => {
  return await recipeService.getByIngredient(userId, ingredientName);
};

export const getRecipesByCategory = async (userId: string, category: string): Promise<any[]> => {
  return await recipeService.getByCategory(userId, category);
};

export const searchRecipes = async (userId: string, searchTerm: string): Promise<any[]> => {
  return await recipeService.search(userId, searchTerm);
};

// Meal plan functions (backward compatibility)
export const createMealPlan = async (userId: string, mealPlanData: any): Promise<string> => {
  return await mealPlanService.create(userId, mealPlanData);
};

export const getUserMealPlans = async (userId: string): Promise<any[]> => {
  return await mealPlanService.getAll(userId);
};

export const getMealPlan = async (userId: string, mealPlanId: string): Promise<any | null> => {
  return await mealPlanService.getById(userId, mealPlanId);
};

export const updateMealPlan = async (userId: string, mealPlanId: string, updates: any): Promise<void> => {
  return await mealPlanService.update(userId, mealPlanId, updates);
};

export const deleteMealPlan = async (userId: string, mealPlanId: string): Promise<void> => {
  return await mealPlanService.delete(userId, mealPlanId);
};

export const subscribeToUserMealPlans = (userId: string, callback: any, onError?: any) => {
  return mealPlanService.subscribeToChanges(userId, callback, onError);
};

export const getMealPlanByWeek = async (userId: string, weekStart: Date): Promise<any | null> => {
  return await mealPlanService.getByWeek(userId, weekStart);
};

export const getMealPlansByDateRange = async (userId: string, startDate: Date, endDate: Date): Promise<any[]> => {
  return await mealPlanService.getByDateRange(userId, startDate, endDate);
};

export const getMealSlotById = async (userId: string, mealPlanId: string, slotId: string): Promise<any | null> => {
  return await mealPlanService.getMealSlotById(userId, mealPlanId, slotId);
};

export const updateMealSlot = async (userId: string, mealPlanId: string, slotId: string, updates: any): Promise<void> => {
  return await mealPlanService.updateMealSlot(userId, mealPlanId, slotId, updates);
};

export const createOrUpdateWeekMealPlan = async (userId: string, weekStart: Date, meals: any): Promise<string> => {
  return await mealPlanService.createOrUpdateWeekPlan(userId, weekStart, meals);
};

// Shopping list functions (backward compatibility)
export const createShoppingList = async (userId: string, shoppingListData: any): Promise<string> => {
  return await shoppingListService.create(userId, shoppingListData);
};

export const getUserShoppingLists = async (userId: string): Promise<any[]> => {
  return await shoppingListService.getAll(userId);
};

export const getShoppingList = async (userId: string, shoppingListId: string): Promise<any | null> => {
  return await shoppingListService.getById(userId, shoppingListId);
};

export const updateShoppingList = async (userId: string, shoppingListId: string, updates: any): Promise<void> => {
  return await shoppingListService.update(userId, shoppingListId, updates);
};

export const deleteShoppingList = async (userId: string, shoppingListId: string): Promise<void> => {
  return await shoppingListService.delete(userId, shoppingListId);
};

export const subscribeToUserShoppingLists = (userId: string, callback: any, onError?: any) => {
  return shoppingListService.subscribeToChanges(userId, callback, onError);
};

export const generateShoppingListFromMealPlan = async (userId: string, mealPlan: any, userIngredients: any): Promise<any> => {
  return await shoppingListService.generateFromMealPlan(userId, mealPlan, userIngredients);
};

// User profile function (backward compatibility)
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

export const createUserProfile = async (userId: string, userData: any): Promise<void> => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    // If user doesn't exist, create new document
    if ((error as any).code === 'not-found') {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      console.error('Error creating/updating user profile:', error);
      throw error;
    }
  }
};
