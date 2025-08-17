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

export interface Recipe {
  id: string;
  title: string;
  description: string;
  images: string[]; // Array of image URLs
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine?: string; // "italian", "mexican", "asian"
  mealType: string[]; // ["breakfast", "lunch", "dinner", "snack"]
  
  timing: {
    prepTime: number; // minutes
    cookTime: number; // minutes
    totalTime: number; // minutes
    restTime?: number; // for bread, marinades, etc.
  };
  
  servings: {
    count: number;
    notes?: string; // "serves 4-6 adults"
  };
  
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