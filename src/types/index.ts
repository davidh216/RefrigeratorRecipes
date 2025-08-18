// Common types for the Refrigerator Recipes application

// Recipe types based on Firestore schema
export interface RecipeIngredient {
  id?: string; // Reference to user's ingredient if available
  name: string;
  amount: number;
  unit: string;
  notes?: string; // "finely chopped", "room temperature"
  isOptional: boolean;
  substitutes?: string[]; // Alternative ingredients
  category?: string; // For grouping in UI
}

export interface RecipeInstruction {
  step: number;
  instruction: string;
  image?: string;
  timer?: number; // If step has specific timing
  temperature?: number; // Oven temperature, etc.
  notes?: string;
}

export interface RecipeNutrition {
  perServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
  total: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
}

export interface RecipeRatings {
  average: number; // Calculated field
  count: number; // Number of ratings
  userRating?: number; // Current user's rating
}

export interface RecipeSource {
  type: 'user-created' | 'imported' | 'shared';
  originalAuthor?: string;
  url?: string;
  book?: string;
}

export interface RecipeSharing {
  isPublic: boolean;
  sharedWith?: string[]; // Array of user IDs
  allowComments: boolean;
  allowRating: boolean;
}

export interface RecipeMetadata {
  createdAt: Date;
  updatedAt: Date;
  lastCookedAt?: Date;
  cookCount: number; // How many times user has made this
  isFavorite: boolean;
  isArchived: boolean;
}

// Unified Recipe interface with consistent structure
export interface Recipe {
  id: string;
  title: string;
  description: string;
  images: string[]; // Array of image URLs
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine?: string; // "italian", "mexican", "asian"
  mealType: string[]; // ["breakfast", "lunch", "dinner", "snack"]
  
  // Timing information - flat structure for component compatibility
  prepTime: number; // minutes
  cookTime: number; // minutes
  totalTime: number; // minutes
  restTime?: number; // for bread, marinades, etc.
  
  // Servings information - flat structure for component compatibility
  servings: number; // number of servings
  servingsNotes?: string; // "serves 4-6 adults"
  
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  
  nutrition?: RecipeNutrition;
  tags: string[]; // ["quick", "healthy", "vegetarian"]
  dietary: string[]; // ["vegan", "gluten-free", "dairy-free"]
  
  ratings: RecipeRatings;
  source?: RecipeSource;
  sharing: RecipeSharing;
  metadata: RecipeMetadata;
}

// Legacy Recipe interface for backward compatibility with Firestore
export interface RecipeFirestore extends Omit<Recipe, 'prepTime' | 'cookTime' | 'totalTime' | 'restTime' | 'servings' | 'servingsNotes'> {
  timing: {
    prepTime: number;
    cookTime: number;
    totalTime: number;
    restTime?: number;
  };
  servings: {
    count: number;
    notes?: string;
  };
}

export interface RecipeFormData {
  title: string;
  description: string;
  images: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  mealType: string[];
  prepTime: number;
  cookTime: number;
  restTime?: number;
  servingsCount: number;
  servingsNotes?: string;
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  tags: string[];
  dietary: string[];
  isPublic: boolean;
  allowComments: boolean;
  allowRating: boolean;
}

export interface RecipeFilters {
  search: string;
  difficulty: 'all' | 'easy' | 'medium' | 'hard';
  cuisine: string;
  mealType: string[];
  dietary: string[];
  tags: string[];
  maxPrepTime?: number;
  maxCookTime?: number;
  maxTotalTime?: number;
  minRating?: number;
  isFavorite?: boolean;
  hasIngredients?: boolean; // Whether user has ingredients for this recipe
}

export interface RecipeSortOptions {
  field: 'title' | 'difficulty' | 'prepTime' | 'cookTime' | 'totalTime' | 'rating' | 'createdAt' | 'lastCookedAt' | 'cookCount';
  direction: 'asc' | 'desc';
}

export interface Ingredient {
  id: string;
  name: string;
  customName?: string; // User-defined name (optional)
  quantity: number;
  unit: string; // e.g., 'cups', 'lbs', 'pieces', 'tbsp'
  dateBought: Date;
  expirationDate?: Date;
  location: 'fridge' | 'pantry' | 'freezer';
  category: string;
  tags: string[];
  notes?: string; // Additional notes about the ingredient
  createdAt: Date;
  updatedAt: Date;
}

export interface IngredientFormData {
  name: string;
  customName?: string;
  quantity: number;
  unit: string;
  dateBought: string; // Form uses string format
  expirationDate?: string;
  location: 'fridge' | 'pantry' | 'freezer';
  category: string;
  tags: string[];
  notes?: string;
}

export interface IngredientFilters {
  search: string;
  location: 'all' | 'fridge' | 'pantry' | 'freezer';
  category: string;
  tags: string[];
  expirationStatus: 'all' | 'fresh' | 'expiring-soon' | 'expired';
}

export interface IngredientSortOptions {
  field: 'name' | 'dateBought' | 'expirationDate' | 'category' | 'quantity';
  direction: 'asc' | 'desc';
}

export interface User {
  id: string;
  email: string;
  name: string;
  preferences: {
    dietaryRestrictions: string[];
    favoriteCategories: string[];
  };
}

// Meal Planning Types
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealSlot {
  id: string;
  date: Date;
  mealType: MealType;
  recipeId?: string;
  recipe?: Recipe;
  recipeTitle?: string; // For backward compatibility with existing data
  notes?: string;
  servings?: number;
}

export interface MealPlan {
  id: string;
  userId: string;
  weekStart: Date; // Monday of the week
  weekEnd: Date; // Sunday of the week
  meals: MealSlot[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MealPlanFormData {
  weekStart: string;
  meals: {
    date: string;
    mealType: MealType;
    recipeId?: string;
    notes?: string;
    servings?: number;
  }[];
}

export interface WeeklyMealPlanSummary {
  totalMeals: number;
  plannedMeals: number;
  unplannedMeals: number;
  totalRecipes: number;
  uniqueRecipes: number;
  mealsByType: Record<MealType, number>;
  ingredientsNeeded: string[];
}

export interface DragDropMealData {
  recipeId: string;
  recipe: Recipe;
  sourceSlotId?: string;
}

export interface MealPlanFilters {
  weekStart?: Date;
  mealType?: MealType | 'all';
  hasRecipe?: boolean;
}

export interface MealPlanState {
  currentWeek: Date;
  mealPlan: MealPlan | null;
  isLoading: boolean;
  error: string | null;
  draggedRecipe: DragDropMealData | null;
}

// Shopping List Types
export interface ShoppingListItem {
  id: string;
  name: string;
  category: string;
  totalAmount: number;
  unit: string;
  estimatedCost?: number;        // System-generated estimate
  userPrice?: number;            // User-entered price
  priceSource?: 'user' | 'system' | 'unknown';  // Source of the price
  isPurchased: boolean;
  notes?: string;
  sources: {
    recipeId: string;
    recipeTitle: string;
    amount: number;
    servings: number;
  }[];
}

export interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  items: ShoppingListItem[];
  totalEstimatedCost?: number;
  createdAt: Date;
  updatedAt: Date;
  isCompleted: boolean;
}

export interface ShoppingListFormData {
  name: string;
  items: Omit<ShoppingListItem, 'id' | 'sources'>[];
}

export interface ShoppingListFilters {
  search: string;
  category: string;
  isPurchased: 'all' | 'purchased' | 'unpurchased';
}

export interface ShoppingListSortOptions {
  field: 'name' | 'category' | 'totalAmount' | 'estimatedCost';
  direction: 'asc' | 'desc';
}

// Recipe Recommendation Types
export interface RecipeRecommendation {
  recipe: Recipe;
  matchPercentage: number;
  availableIngredients: number;
  totalIngredients: number;
  missingIngredients: RecipeIngredient[];
  reasons: string[]; // Why this recipe was recommended
}

export interface RecommendationFilters {
  maxMissingIngredients: number;
  minMatchPercentage: number;
  difficulty: 'all' | 'easy' | 'medium' | 'hard';
  cuisine: string;
  mealType: string[];
  dietary: string[];
  maxPrepTime?: number;
  maxCookTime?: number;
}

// Type Guards and Validation Functions
export const isRecipe = (obj: any): obj is Recipe => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.description === 'string' &&
    Array.isArray(obj.images) &&
    typeof obj.difficulty === 'string' &&
    Array.isArray(obj.mealType) &&
    typeof obj.prepTime === 'number' &&
    typeof obj.cookTime === 'number' &&
    typeof obj.totalTime === 'number' &&
    typeof obj.servings === 'number' &&
    Array.isArray(obj.ingredients) &&
    Array.isArray(obj.instructions) &&
    Array.isArray(obj.tags) &&
    Array.isArray(obj.dietary) &&
    obj.ratings &&
    obj.sharing &&
    obj.metadata
  );
};

export const isRecipeFirestore = (obj: any): obj is RecipeFirestore => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.description === 'string' &&
    Array.isArray(obj.images) &&
    typeof obj.difficulty === 'string' &&
    Array.isArray(obj.mealType) &&
    obj.timing &&
    typeof obj.timing.prepTime === 'number' &&
    typeof obj.timing.cookTime === 'number' &&
    typeof obj.timing.totalTime === 'number' &&
    obj.servings &&
    typeof obj.servings.count === 'number' &&
    Array.isArray(obj.ingredients) &&
    Array.isArray(obj.instructions) &&
    Array.isArray(obj.tags) &&
    Array.isArray(obj.dietary) &&
    obj.ratings &&
    obj.sharing &&
    obj.metadata
  );
};

export const isMealSlot = (obj: any): obj is MealSlot => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    obj.date instanceof Date &&
    typeof obj.mealType === 'string' &&
    (obj.recipeId === undefined || typeof obj.recipeId === 'string') &&
    (obj.recipe === undefined || isRecipe(obj.recipe)) &&
    (obj.recipeTitle === undefined || typeof obj.recipeTitle === 'string') &&
    (obj.notes === undefined || typeof obj.notes === 'string') &&
    (obj.servings === undefined || typeof obj.servings === 'number')
  );
};

export const isMealPlan = (obj: any): obj is MealPlan => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    obj.weekStart instanceof Date &&
    obj.weekEnd instanceof Date &&
    Array.isArray(obj.meals) &&
    obj.meals.every(isMealSlot) &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date
  );
};

// Data transformation functions for backward compatibility
export const transformRecipeFromFirestore = (firestoreRecipe: RecipeFirestore): Recipe => {
  return {
    ...firestoreRecipe,
    prepTime: firestoreRecipe.timing.prepTime,
    cookTime: firestoreRecipe.timing.cookTime,
    totalTime: firestoreRecipe.timing.totalTime,
    restTime: firestoreRecipe.timing.restTime,
    servings: firestoreRecipe.servings.count,
    servingsNotes: firestoreRecipe.servings.notes,
  };
};

export const transformRecipeToFirestore = (recipe: Recipe): RecipeFirestore => {
  const { prepTime, cookTime, totalTime, restTime, servings, servingsNotes, ...rest } = recipe;
  return {
    ...rest,
    timing: {
      prepTime,
      cookTime,
      totalTime,
      restTime,
    },
    servings: {
      count: servings,
      notes: servingsNotes,
    },
  };
};

// Re-export validation utilities from the dedicated validation module
export * from '@/utils/type-validation';