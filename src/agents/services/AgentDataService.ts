/**
 * Agent Data Service
 * 
 * Unified data access layer for the agent system. This service provides
 * a clean interface to all app data (ingredients, recipes, meal plans, shopping lists)
 * with caching, error handling, and performance optimizations.
 */

import { 
  Ingredient, 
  Recipe, 
  MealPlan, 
  ShoppingList,
  ShoppingListItem,
  RecipeRecommendation,
  MealSlot,
  User
} from '@/types';
import {
  UseIngredientsReturn,
  UseRecipesReturn, 
  UseMealPlanReturn,
  UseShoppingListReturn
} from '@/hooks';
import { getExpirationStatus } from '@/utils';

/**
 * Configuration for data service
 */
interface AgentDataServiceConfig {
  cacheTimeout: number; // milliseconds
  maxRetries: number;
  batchSize: number;
}

/**
 * Analysis results for ingredients
 */
export interface IngredientAnalysis {
  total: number;
  expiringSoon: Ingredient[];
  expired: Ingredient[];
  categories: Record<string, Ingredient[]>;
  commonIngredients: string[];
  lowStock: Ingredient[];
}

/**
 * Recipe matching results
 */
export interface RecipeMatchResult {
  perfectMatches: Recipe[];
  partialMatches: Recipe[];
  missingIngredients: Record<string, string[]>;
  usageOptimization: {
    recipesUsingMostIngredients: Recipe[];
    recipesForExpiring: Recipe[];
  };
}

/**
 * Meal plan analysis
 */
export interface MealPlanAnalysis {
  currentWeek: MealPlan | null;
  emptySlots: Array<{ day: string; mealType: string }>;
  ingredientsNeeded: string[];
  nutritionalBalance: {
    protein: 'low' | 'good' | 'high';
    vegetables: 'low' | 'good' | 'high';
    variety: 'low' | 'good' | 'high';
  };
  weeklyStats: {
    plannedMeals: number;
    totalMeals: number;
    completionRate: number;
  };
}

/**
 * Shopping list optimization
 */
export interface ShoppingOptimization {
  consolidatedList: ShoppingListItem[];
  duplicateItems: ShoppingListItem[];
  seasonalSuggestions: ShoppingListItem[];
  budgetOptimizations: Array<{
    item: ShoppingListItem;
    alternatives: string[];
    potentialSaving: number;
  }>;
  categoryGroups: Record<string, ShoppingListItem[]>;
}

/**
 * Main Agent Data Service
 */
export class AgentDataService {
  private config: AgentDataServiceConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(
    private ingredientsHook: UseIngredientsReturn,
    private recipesHook: UseRecipesReturn,
    private mealPlanHook: UseMealPlanReturn,
    private shoppingHook: UseShoppingListReturn,
    config: Partial<AgentDataServiceConfig> = {}
  ) {
    this.config = {
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      maxRetries: 3,
      batchSize: 50,
      ...config
    };
  }

  // ============================================================================
  // INGREDIENT INTELLIGENCE
  // ============================================================================

  /**
   * Get comprehensive ingredient analysis
   */
  async getIngredientAnalysis(): Promise<IngredientAnalysis> {
    const cacheKey = 'ingredient-analysis';
    const cached = this.getFromCache<IngredientAnalysis>(cacheKey);
    if (cached) return cached;

    const ingredients = this.ingredientsHook.ingredients;
    
    const analysis: IngredientAnalysis = {
      total: ingredients.length,
      expiringSoon: this.getExpiringSoonIngredients(ingredients),
      expired: this.getExpiredIngredients(ingredients),
      categories: this.groupIngredientsByCategory(ingredients),
      commonIngredients: this.getCommonIngredients(ingredients),
      lowStock: this.getLowStockIngredients(ingredients)
    };

    this.setCache(cacheKey, analysis);
    return analysis;
  }

  /**
   * Find recipes that can be made with available ingredients
   */
  async findRecipesWithIngredients(requestedIngredients?: string[]): Promise<RecipeMatchResult> {
    const cacheKey = `recipe-matches-${requestedIngredients?.join(',') || 'all'}`;
    const cached = this.getFromCache<RecipeMatchResult>(cacheKey);
    if (cached) return cached;

    const availableIngredients = this.ingredientsHook.ingredients.map(i => i.name.toLowerCase());
    const recipes = this.recipesHook.recipes;
    const targetIngredients = requestedIngredients?.map(i => i.toLowerCase()) || availableIngredients;

    const perfectMatches: Recipe[] = [];
    const partialMatches: Recipe[] = [];
    const missingIngredients: Record<string, string[]> = {};

    for (const recipe of recipes) {
      const recipeIngredients = recipe.ingredients.map(i => i.name.toLowerCase());
      const matchingIngredients = recipeIngredients.filter(ingredient => 
        availableIngredients.includes(ingredient) || targetIngredients.includes(ingredient)
      );
      
      const matchPercentage = matchingIngredients.length / recipeIngredients.length;

      if (matchPercentage === 1) {
        perfectMatches.push(recipe);
      } else if (matchPercentage >= 0.7) {
        partialMatches.push(recipe);
        missingIngredients[recipe.id] = recipeIngredients.filter(ingredient => 
          !availableIngredients.includes(ingredient) && !targetIngredients.includes(ingredient)
        );
      }
    }

    // Sort by relevance
    const expiringSoon = this.getExpiringSoonIngredients(this.ingredientsHook.ingredients);
    const expiringIngredientNames = expiringSoon.map(i => i.name.toLowerCase());

    const result: RecipeMatchResult = {
      perfectMatches: this.sortRecipesByRelevance(perfectMatches, expiringIngredientNames),
      partialMatches: this.sortRecipesByRelevance(partialMatches, expiringIngredientNames),
      missingIngredients,
      usageOptimization: {
        recipesUsingMostIngredients: this.getRecipesUsingMostIngredients(perfectMatches.concat(partialMatches), availableIngredients),
        recipesForExpiring: this.getRecipesForExpiringIngredients(perfectMatches.concat(partialMatches), expiringIngredientNames)
      }
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Get ingredients that are expiring soon
   */
  getExpiringSoonIngredients(ingredients: Ingredient[] = this.ingredientsHook.ingredients): Ingredient[] {
    return ingredients
      .filter(ingredient => {
        const status = getExpirationStatus(ingredient.expirationDate);
        return status === 'expiring-soon';
      })
      .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
  }

  /**
   * Get expired ingredients
   */
  getExpiredIngredients(ingredients: Ingredient[] = this.ingredientsHook.ingredients): Ingredient[] {
    return ingredients
      .filter(ingredient => {
        const status = getExpirationStatus(ingredient.expirationDate);
        return status === 'expired';
      })
      .sort((a, b) => new Date(b.expirationDate).getTime() - new Date(a.expirationDate).getTime());
  }

  // ============================================================================
  // MEAL PLANNING INTELLIGENCE  
  // ============================================================================

  /**
   * Analyze current meal plan
   */
  async getMealPlanAnalysis(): Promise<MealPlanAnalysis> {
    const cacheKey = 'meal-plan-analysis';
    const cached = this.getFromCache<MealPlanAnalysis>(cacheKey);
    if (cached) return cached;

    const currentWeek = this.mealPlanHook.currentWeekPlan;
    const emptySlots: Array<{ day: string; mealType: string }> = [];
    const ingredientsNeeded: string[] = [];

    // Analyze empty slots
    if (currentWeek) {
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

      for (const day of daysOfWeek) {
        for (const mealType of mealTypes) {
          const mealSlot = currentWeek.meals[day]?.[mealType as keyof MealSlot];
          if (!mealSlot || !mealSlot.recipeId) {
            emptySlots.push({ day, mealType });
          }
        }
      }

      // Calculate needed ingredients
      const plannedRecipes = this.getPlannedRecipes(currentWeek);
      ingredientsNeeded.push(...this.calculateMissingIngredients(plannedRecipes));
    }

    const analysis: MealPlanAnalysis = {
      currentWeek,
      emptySlots,
      ingredientsNeeded: [...new Set(ingredientsNeeded)],
      nutritionalBalance: this.analyzeNutritionalBalance(currentWeek),
      weeklyStats: this.calculateWeeklyStats(currentWeek)
    };

    this.setCache(cacheKey, analysis);
    return analysis;
  }

  /**
   * Generate optimized meal plan suggestions
   */
  async generateMealPlanSuggestions(constraints: {
    useExpiringIngredients?: boolean;
    maxMeals?: number;
    dietaryRestrictions?: string[];
    preferredCuisines?: string[];
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  } = {}): Promise<{
    suggestions: Array<{
      day: string;
      mealType: string;
      recipe: Recipe;
      reason: string;
    }>;
    shoppingNeeded: string[];
    expirationOptimization: number; // percentage of expiring ingredients used
  }> {
    const availableIngredients = this.ingredientsHook.ingredients;
    const expiringSoon = this.getExpiringSoonIngredients(availableIngredients);
    const recipes = this.recipesHook.recipes;
    const mealPlanAnalysis = await this.getMealPlanAnalysis();

    const suggestions: Array<{
      day: string;
      mealType: string;
      recipe: Recipe;
      reason: string;
    }> = [];

    // Fill empty slots with optimized suggestions
    for (const slot of mealPlanAnalysis.emptySlots.slice(0, constraints.maxMeals || 7)) {
      const suitableRecipes = this.findSuitableRecipesForSlot(
        recipes,
        slot,
        availableIngredients,
        constraints
      );

      if (suitableRecipes.length > 0) {
        const selectedRecipe = constraints.useExpiringIngredients 
          ? this.selectRecipeUsingExpiring(suitableRecipes, expiringSoon)
          : suitableRecipes[0];

        suggestions.push({
          day: slot.day,
          mealType: slot.mealType,
          recipe: selectedRecipe.recipe,
          reason: selectedRecipe.reason
        });
      }
    }

    const shoppingNeeded = this.calculateShoppingForSuggestions(suggestions.map(s => s.recipe));
    const expirationOptimization = this.calculateExpirationOptimization(suggestions.map(s => s.recipe), expiringSoon);

    return {
      suggestions,
      shoppingNeeded,
      expirationOptimization
    };
  }

  // ============================================================================
  // SHOPPING LIST INTELLIGENCE
  // ============================================================================

  /**
   * Optimize shopping list
   */
  async optimizeShoppingList(mealPlanRecipes?: Recipe[]): Promise<ShoppingOptimization> {
    const currentLists = this.shoppingHook.shoppingLists;
    const ingredients = this.ingredientsHook.ingredients;
    
    // Generate list from meal plan if provided
    const plannedIngredients = mealPlanRecipes ? 
      this.calculateMissingIngredientsForRecipes(mealPlanRecipes, ingredients) : [];

    // Consolidate all shopping items
    const allItems: ShoppingListItem[] = [
      ...currentLists.flatMap(list => list.items),
      ...plannedIngredients.map(ingredient => ({
        id: `planned-${ingredient}`,
        name: ingredient,
        quantity: 1,
        unit: 'item',
        category: this.categorizeIngredient(ingredient),
        purchased: false,
        notes: 'From meal plan'
      } as ShoppingListItem))
    ];

    const consolidatedList = this.consolidateShoppingItems(allItems);
    const duplicateItems = this.findDuplicateItems(allItems);
    
    return {
      consolidatedList,
      duplicateItems,
      seasonalSuggestions: this.getSeasonalSuggestions(),
      budgetOptimizations: this.getBudgetOptimizations(consolidatedList),
      categoryGroups: this.groupShoppingItemsByCategory(consolidatedList)
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.config.cacheTimeout;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private getExpiredIngredients(ingredients: Ingredient[]): Ingredient[] {
    return ingredients.filter(ingredient => {
      const status = getExpirationStatus(ingredient.expirationDate);
      return status === 'expired';
    });
  }

  private groupIngredientsByCategory(ingredients: Ingredient[]): Record<string, Ingredient[]> {
    const groups: Record<string, Ingredient[]> = {};
    for (const ingredient of ingredients) {
      const category = ingredient.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(ingredient);
    }
    return groups;
  }

  private getCommonIngredients(ingredients: Ingredient[]): string[] {
    const frequencyMap = new Map<string, number>();
    
    for (const ingredient of ingredients) {
      const name = ingredient.name.toLowerCase();
      frequencyMap.set(name, (frequencyMap.get(name) || 0) + 1);
    }
    
    return Array.from(frequencyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);
  }

  private getLowStockIngredients(ingredients: Ingredient[]): Ingredient[] {
    return ingredients.filter(ingredient => 
      ingredient.quantity && ingredient.quantity < (ingredient.minQuantity || 1)
    );
  }

  private sortRecipesByRelevance(recipes: Recipe[], priorityIngredients: string[]): Recipe[] {
    return recipes.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, priorityIngredients);
      const bScore = this.calculateRelevanceScore(b, priorityIngredients);
      return bScore - aScore;
    });
  }

  private calculateRelevanceScore(recipe: Recipe, priorityIngredients: string[]): number {
    let score = 0;
    
    // Boost score for using priority ingredients
    const recipeIngredients = recipe.ingredients.map(i => i.name.toLowerCase());
    for (const ingredient of priorityIngredients) {
      if (recipeIngredients.includes(ingredient.toLowerCase())) {
        score += 10;
      }
    }
    
    // Consider difficulty and time
    if (recipe.difficulty === 'easy') score += 5;
    if (recipe.prepTime && recipe.prepTime <= 30) score += 3;
    
    return score;
  }

  private getRecipesUsingMostIngredients(recipes: Recipe[], availableIngredients: string[]): Recipe[] {
    return recipes
      .map(recipe => ({
        recipe,
        usageCount: recipe.ingredients.filter(ingredient => 
          availableIngredients.includes(ingredient.name.toLowerCase())
        ).length
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(item => item.recipe);
  }

  private getRecipesForExpiringIngredients(recipes: Recipe[], expiringIngredients: string[]): Recipe[] {
    return recipes.filter(recipe => 
      recipe.ingredients.some(ingredient => 
        expiringIngredients.includes(ingredient.name.toLowerCase())
      )
    );
  }

  private getPlannedRecipes(mealPlan: MealPlan): Recipe[] {
    const recipeIds = new Set<string>();
    const recipes = this.recipesHook.recipes;
    
    // Extract recipe IDs from meal plan
    Object.values(mealPlan.meals).forEach(dayMeals => {
      Object.values(dayMeals).forEach(meal => {
        if (meal.recipeId) {
          recipeIds.add(meal.recipeId);
        }
      });
    });
    
    return recipes.filter(recipe => recipeIds.has(recipe.id));
  }

  private calculateMissingIngredients(recipes: Recipe[]): string[] {
    const availableIngredients = new Set(
      this.ingredientsHook.ingredients.map(i => i.name.toLowerCase())
    );
    
    const neededIngredients = new Set<string>();
    
    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const name = ingredient.name.toLowerCase();
        if (!availableIngredients.has(name)) {
          neededIngredients.add(ingredient.name);
        }
      }
    }
    
    return Array.from(neededIngredients);
  }

  private analyzeNutritionalBalance(mealPlan: MealPlan | null): MealPlanAnalysis['nutritionalBalance'] {
    if (!mealPlan) {
      return { protein: 'low', vegetables: 'low', variety: 'low' };
    }
    
    const plannedRecipes = this.getPlannedRecipes(mealPlan);
    
    // Simple heuristic analysis
    const hasProtein = plannedRecipes.some(recipe => 
      recipe.category?.includes('meat') || 
      recipe.category?.includes('protein') ||
      recipe.ingredients.some(i => ['chicken', 'beef', 'fish', 'eggs', 'beans'].includes(i.name.toLowerCase()))
    );
    
    const hasVegetables = plannedRecipes.some(recipe =>
      recipe.ingredients.some(i => ['carrot', 'broccoli', 'spinach', 'tomato', 'bell pepper'].includes(i.name.toLowerCase()))
    );
    
    const cuisineVariety = new Set(plannedRecipes.map(r => r.cuisine)).size;
    
    return {
      protein: hasProtein ? 'good' : 'low',
      vegetables: hasVegetables ? 'good' : 'low', 
      variety: cuisineVariety >= 3 ? 'good' : cuisineVariety >= 2 ? 'good' : 'low'
    };
  }

  private calculateWeeklyStats(mealPlan: MealPlan | null): MealPlanAnalysis['weeklyStats'] {
    if (!mealPlan) {
      return { plannedMeals: 0, totalMeals: 21, completionRate: 0 };
    }
    
    let plannedMeals = 0;
    const totalMeals = 21; // 3 meals × 7 days
    
    Object.values(mealPlan.meals).forEach(dayMeals => {
      Object.values(dayMeals).forEach(meal => {
        if (meal.recipeId) {
          plannedMeals++;
        }
      });
    });
    
    return {
      plannedMeals,
      totalMeals,
      completionRate: plannedMeals / totalMeals
    };
  }

  private findSuitableRecipesForSlot(
    recipes: Recipe[],
    slot: { day: string; mealType: string },
    availableIngredients: Ingredient[],
    constraints: any
  ): Array<{ recipe: Recipe; reason: string }> {
    const availableNames = new Set(availableIngredients.map(i => i.name.toLowerCase()));
    
    return recipes
      .filter(recipe => {
        // Filter by dietary restrictions
        if (constraints.dietaryRestrictions) {
          // This would need more sophisticated matching
          return true;
        }
        
        // Filter by skill level
        if (constraints.skillLevel) {
          const skillLevels = { beginner: 1, intermediate: 2, advanced: 3 };
          const recipeLevel = skillLevels[recipe.difficulty as keyof typeof skillLevels] || 2;
          const userLevel = skillLevels[constraints.skillLevel];
          if (recipeLevel > userLevel) return false;
        }
        
        return true;
      })
      .map(recipe => {
        const matchingIngredients = recipe.ingredients.filter(ingredient => 
          availableNames.has(ingredient.name.toLowerCase())
        ).length;
        
        const matchPercentage = matchingIngredients / recipe.ingredients.length;
        
        let reason = `${Math.round(matchPercentage * 100)}% ingredient match`;
        
        if (slot.mealType === 'breakfast' && recipe.category?.includes('breakfast')) {
          reason += ', perfect for breakfast';
        }
        
        return { recipe, reason };
      })
      .sort((a, b) => {
        // Sort by ingredient match percentage
        const aMatch = a.recipe.ingredients.filter(i => availableNames.has(i.name.toLowerCase())).length / a.recipe.ingredients.length;
        const bMatch = b.recipe.ingredients.filter(i => availableNames.has(i.name.toLowerCase())).length / b.recipe.ingredients.length;
        return bMatch - aMatch;
      })
      .slice(0, 10);
  }

  private selectRecipeUsingExpiring(
    suitableRecipes: Array<{ recipe: Recipe; reason: string }>,
    expiringIngredients: Ingredient[]
  ): { recipe: Recipe; reason: string } {
    const expiringNames = new Set(expiringIngredients.map(i => i.name.toLowerCase()));
    
    // Find recipe that uses the most expiring ingredients
    let bestRecipe = suitableRecipes[0];
    let maxExpiringUsed = 0;
    
    for (const candidate of suitableRecipes) {
      const expiringUsed = candidate.recipe.ingredients.filter(ingredient =>
        expiringNames.has(ingredient.name.toLowerCase())
      ).length;
      
      if (expiringUsed > maxExpiringUsed) {
        maxExpiringUsed = expiringUsed;
        bestRecipe = { 
          recipe: candidate.recipe, 
          reason: `Uses ${expiringUsed} expiring ingredients`
        };
      }
    }
    
    return bestRecipe;
  }

  private calculateShoppingForSuggestions(recipes: Recipe[]): string[] {
    return this.calculateMissingIngredients(recipes);
  }

  private calculateExpirationOptimization(recipes: Recipe[], expiringIngredients: Ingredient[]): number {
    if (expiringIngredients.length === 0) return 0;
    
    const expiringNames = new Set(expiringIngredients.map(i => i.name.toLowerCase()));
    const usedExpiringCount = new Set<string>();
    
    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        if (expiringNames.has(ingredient.name.toLowerCase())) {
          usedExpiringCount.add(ingredient.name.toLowerCase());
        }
      }
    }
    
    return (usedExpiringCount.size / expiringIngredients.length) * 100;
  }

  private calculateMissingIngredientsForRecipes(recipes: Recipe[], currentIngredients: Ingredient[]): string[] {
    const available = new Set(currentIngredients.map(i => i.name.toLowerCase()));
    const needed = new Set<string>();
    
    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        if (!available.has(ingredient.name.toLowerCase())) {
          needed.add(ingredient.name);
        }
      }
    }
    
    return Array.from(needed);
  }

  private consolidateShoppingItems(items: ShoppingListItem[]): ShoppingListItem[] {
    const consolidated = new Map<string, ShoppingListItem>();
    
    for (const item of items) {
      const key = item.name.toLowerCase();
      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        existing.quantity += item.quantity;
      } else {
        consolidated.set(key, { ...item });
      }
    }
    
    return Array.from(consolidated.values());
  }

  private findDuplicateItems(items: ShoppingListItem[]): ShoppingListItem[] {
    const seen = new Set<string>();
    const duplicates: ShoppingListItem[] = [];
    
    for (const item of items) {
      const key = item.name.toLowerCase();
      if (seen.has(key)) {
        duplicates.push(item);
      } else {
        seen.add(key);
      }
    }
    
    return duplicates;
  }

  private getSeasonalSuggestions(): ShoppingListItem[] {
    const now = new Date();
    const month = now.getMonth();
    
    // Simple seasonal suggestions
    const seasonalIngredients = {
      spring: ['asparagus', 'peas', 'strawberries'],
      summer: ['tomatoes', 'corn', 'berries'],
      fall: ['pumpkin', 'squash', 'apples'],
      winter: ['root vegetables', 'citrus', 'Brussels sprouts']
    };
    
    let season: keyof typeof seasonalIngredients;
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'fall';
    else season = 'winter';
    
    return seasonalIngredients[season].map((name, index) => ({
      id: `seasonal-${index}`,
      name,
      quantity: 1,
      unit: 'item',
      category: 'Produce',
      purchased: false,
      notes: `Seasonal suggestion for ${season}`
    } as ShoppingListItem));
  }

  private getBudgetOptimizations(items: ShoppingListItem[]): Array<{
    item: ShoppingListItem;
    alternatives: string[];
    potentialSaving: number;
  }> {
    // Simple budget optimization suggestions
    return items.filter(item => ['meat', 'seafood'].includes(item.category || '')).map(item => ({
      item,
      alternatives: ['beans', 'lentils', 'tofu'],
      potentialSaving: 0.3 // 30% potential saving
    }));
  }

  private groupShoppingItemsByCategory(items: ShoppingListItem[]): Record<string, ShoppingListItem[]> {
    const groups: Record<string, ShoppingListItem[]> = {};
    
    for (const item of items) {
      const category = item.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    }
    
    return groups;
  }

  private categorizeIngredient(ingredientName: string): string {
    const name = ingredientName.toLowerCase();
    
    // Simple categorization logic
    const categories = {
      'Produce': ['tomato', 'onion', 'carrot', 'lettuce', 'spinach', 'apple', 'banana'],
      'Meat': ['chicken', 'beef', 'pork', 'turkey'],
      'Seafood': ['fish', 'salmon', 'shrimp', 'tuna'],
      'Dairy': ['milk', 'cheese', 'yogurt', 'butter'],
      'Pantry': ['rice', 'pasta', 'bread', 'oil', 'flour'],
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return category;
      }
    }
    
    return 'Other';
  }
}