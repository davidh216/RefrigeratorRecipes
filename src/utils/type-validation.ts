import { 
  Recipe, 
  RecipeFirestore, 
  MealSlot, 
  MealPlan, 
  Ingredient,
  ShoppingList,
  ShoppingListItem,
  RecipeIngredient,
  RecipeInstruction,
  RecipeNutrition,
  RecipeRatings,
  RecipeSource,
  RecipeSharing,
  RecipeMetadata,
  User
} from '@/types';

// Type validation functions for runtime type checking

export const isValidString = (value: any): value is string => {
  return typeof value === 'string' && value.length > 0;
};

export const isValidNumber = (value: any): value is number => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

export const isValidDate = (value: any): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

export const isValidArray = <T>(value: any, validator: (item: any) => item is T): value is T[] => {
  return Array.isArray(value) && value.every(validator);
};

export const isValidObject = (value: any): value is Record<string, any> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

// Recipe validation
export const isValidRecipeIngredient = (obj: any): obj is RecipeIngredient => {
  return (
    isValidObject(obj) &&
    isValidString(obj.name) &&
    isValidNumber(obj.amount) &&
    isValidString(obj.unit) &&
    typeof obj.isOptional === 'boolean' &&
    (obj.notes === undefined || isValidString(obj.notes)) &&
    (obj.substitutes === undefined || isValidArray(obj.substitutes, isValidString)) &&
    (obj.category === undefined || isValidString(obj.category))
  );
};

export const isValidRecipeInstruction = (obj: any): obj is RecipeInstruction => {
  return (
    isValidObject(obj) &&
    isValidNumber(obj.step) &&
    isValidString(obj.instruction) &&
    (obj.image === undefined || isValidString(obj.image)) &&
    (obj.timer === undefined || isValidNumber(obj.timer)) &&
    (obj.temperature === undefined || isValidNumber(obj.temperature)) &&
    (obj.notes === undefined || isValidString(obj.notes))
  );
};

export const isValidRecipeNutrition = (obj: any): obj is RecipeNutrition => {
  const isValidNutritionValues = (nutrition: any) => {
    return (
      isValidObject(nutrition) &&
      isValidNumber(nutrition.calories) &&
      isValidNumber(nutrition.protein) &&
      isValidNumber(nutrition.carbs) &&
      isValidNumber(nutrition.fat) &&
      isValidNumber(nutrition.fiber) &&
      isValidNumber(nutrition.sugar) &&
      isValidNumber(nutrition.sodium)
    );
  };

  return (
    isValidObject(obj) &&
    isValidNutritionValues(obj.perServing) &&
    isValidNutritionValues(obj.total)
  );
};

export const isValidRecipeRatings = (obj: any): obj is RecipeRatings => {
  return (
    isValidObject(obj) &&
    isValidNumber(obj.average) &&
    isValidNumber(obj.count) &&
    (obj.userRating === undefined || isValidNumber(obj.userRating))
  );
};

export const isValidRecipeSource = (obj: any): obj is RecipeSource => {
  return (
    isValidObject(obj) &&
    ['user-created', 'imported', 'shared'].includes(obj.type) &&
    (obj.originalAuthor === undefined || isValidString(obj.originalAuthor)) &&
    (obj.url === undefined || isValidString(obj.url)) &&
    (obj.book === undefined || isValidString(obj.book))
  );
};

export const isValidRecipeSharing = (obj: any): obj is RecipeSharing => {
  return (
    isValidObject(obj) &&
    typeof obj.isPublic === 'boolean' &&
    (obj.sharedWith === undefined || isValidArray(obj.sharedWith, isValidString)) &&
    typeof obj.allowComments === 'boolean' &&
    typeof obj.allowRating === 'boolean'
  );
};

export const isValidRecipeMetadata = (obj: any): obj is RecipeMetadata => {
  return (
    isValidObject(obj) &&
    isValidDate(obj.createdAt) &&
    isValidDate(obj.updatedAt) &&
    (obj.lastCookedAt === undefined || isValidDate(obj.lastCookedAt)) &&
    isValidNumber(obj.cookCount) &&
    typeof obj.isFavorite === 'boolean' &&
    typeof obj.isArchived === 'boolean'
  );
};

export const isValidRecipe = (obj: any): obj is Recipe => {
  return (
    isValidObject(obj) &&
    isValidString(obj.id) &&
    isValidString(obj.title) &&
    isValidString(obj.description) &&
    isValidArray(obj.images, isValidString) &&
    ['easy', 'medium', 'hard'].includes(obj.difficulty) &&
    (obj.cuisine === undefined || isValidString(obj.cuisine)) &&
    isValidArray(obj.mealType, isValidString) &&
    isValidNumber(obj.prepTime) &&
    isValidNumber(obj.cookTime) &&
    isValidNumber(obj.totalTime) &&
    (obj.restTime === undefined || isValidNumber(obj.restTime)) &&
    isValidNumber(obj.servings) &&
    (obj.servingsNotes === undefined || isValidString(obj.servingsNotes)) &&
    isValidArray(obj.ingredients, isValidRecipeIngredient) &&
    isValidArray(obj.instructions, isValidRecipeInstruction) &&
    (obj.nutrition === undefined || isValidRecipeNutrition(obj.nutrition)) &&
    isValidArray(obj.tags, isValidString) &&
    isValidArray(obj.dietary, isValidString) &&
    isValidRecipeRatings(obj.ratings) &&
    (obj.source === undefined || isValidRecipeSource(obj.source)) &&
    isValidRecipeSharing(obj.sharing) &&
    isValidRecipeMetadata(obj.metadata)
  );
};

export const isValidRecipeFirestore = (obj: any): obj is RecipeFirestore => {
  return (
    isValidObject(obj) &&
    isValidString(obj.id) &&
    isValidString(obj.title) &&
    isValidString(obj.description) &&
    isValidArray(obj.images, isValidString) &&
    ['easy', 'medium', 'hard'].includes(obj.difficulty) &&
    (obj.cuisine === undefined || isValidString(obj.cuisine)) &&
    isValidArray(obj.mealType, isValidString) &&
    isValidObject(obj.timing) &&
    isValidNumber(obj.timing.prepTime) &&
    isValidNumber(obj.timing.cookTime) &&
    isValidNumber(obj.timing.totalTime) &&
    (obj.timing.restTime === undefined || isValidNumber(obj.timing.restTime)) &&
    isValidObject(obj.servings) &&
    isValidNumber(obj.servings.count) &&
    (obj.servings.notes === undefined || isValidString(obj.servings.notes)) &&
    isValidArray(obj.ingredients, isValidRecipeIngredient) &&
    isValidArray(obj.instructions, isValidRecipeInstruction) &&
    (obj.nutrition === undefined || isValidRecipeNutrition(obj.nutrition)) &&
    isValidArray(obj.tags, isValidString) &&
    isValidArray(obj.dietary, isValidString) &&
    isValidRecipeRatings(obj.ratings) &&
    (obj.source === undefined || isValidRecipeSource(obj.source)) &&
    isValidRecipeSharing(obj.sharing) &&
    isValidRecipeMetadata(obj.metadata)
  );
};

// Meal planning validation
export const isValidMealSlot = (obj: any): obj is MealSlot => {
  return (
    isValidObject(obj) &&
    isValidString(obj.id) &&
    isValidDate(obj.date) &&
    ['breakfast', 'lunch', 'dinner', 'snack'].includes(obj.mealType) &&
    (obj.recipeId === undefined || isValidString(obj.recipeId)) &&
    (obj.recipe === undefined || isValidRecipe(obj.recipe)) &&
    (obj.recipeTitle === undefined || isValidString(obj.recipeTitle)) &&
    (obj.notes === undefined || isValidString(obj.notes)) &&
    (obj.servings === undefined || isValidNumber(obj.servings))
  );
};

export const isValidMealPlan = (obj: any): obj is MealPlan => {
  return (
    isValidObject(obj) &&
    isValidString(obj.id) &&
    isValidString(obj.userId) &&
    isValidDate(obj.weekStart) &&
    isValidDate(obj.weekEnd) &&
    isValidArray(obj.meals, isValidMealSlot) &&
    isValidDate(obj.createdAt) &&
    isValidDate(obj.updatedAt)
  );
};

// Ingredient validation
export const isValidIngredient = (obj: any): obj is Ingredient => {
  return (
    isValidObject(obj) &&
    isValidString(obj.id) &&
    isValidString(obj.name) &&
    (obj.customName === undefined || isValidString(obj.customName)) &&
    isValidNumber(obj.quantity) &&
    isValidString(obj.unit) &&
    isValidDate(obj.dateBought) &&
    (obj.expirationDate === undefined || isValidDate(obj.expirationDate)) &&
    ['fridge', 'pantry', 'freezer'].includes(obj.location) &&
    isValidString(obj.category) &&
    isValidArray(obj.tags, isValidString) &&
    (obj.notes === undefined || isValidString(obj.notes)) &&
    isValidDate(obj.createdAt) &&
    isValidDate(obj.updatedAt)
  );
};

// Shopping list validation
export const isValidShoppingListItem = (obj: any): obj is ShoppingListItem => {
  return (
    isValidObject(obj) &&
    isValidString(obj.id) &&
    isValidString(obj.name) &&
    isValidString(obj.category) &&
    isValidNumber(obj.totalAmount) &&
    isValidString(obj.unit) &&
    (obj.estimatedCost === undefined || isValidNumber(obj.estimatedCost)) &&
    (obj.userPrice === undefined || isValidNumber(obj.userPrice)) &&
    (obj.priceSource === undefined || ['user', 'system', 'unknown'].includes(obj.priceSource)) &&
    typeof obj.isPurchased === 'boolean' &&
    (obj.notes === undefined || isValidString(obj.notes)) &&
        isValidArray(obj.sources, (source: any): source is { recipeId: string; recipeTitle: string; amount: number; servings: number } =>
      isValidObject(source) &&
      isValidString(source.recipeId) &&
      isValidString(source.recipeTitle) &&
      isValidNumber(source.amount) &&
      isValidNumber(source.servings)
    )
  );
};

export const isValidShoppingList = (obj: any): obj is ShoppingList => {
  return (
    isValidObject(obj) &&
    isValidString(obj.id) &&
    isValidString(obj.userId) &&
    isValidString(obj.name) &&
    isValidArray(obj.items, isValidShoppingListItem) &&
    (obj.totalEstimatedCost === undefined || isValidNumber(obj.totalEstimatedCost)) &&
    isValidDate(obj.createdAt) &&
    isValidDate(obj.updatedAt) &&
    typeof obj.isCompleted === 'boolean'
  );
};

// User validation
export const isValidUser = (obj: any): obj is User => {
  return (
    isValidObject(obj) &&
    isValidString(obj.id) &&
    isValidString(obj.email) &&
    isValidString(obj.name) &&
    isValidObject(obj.preferences) &&
    isValidArray(obj.preferences.dietaryRestrictions, isValidString) &&
    isValidArray(obj.preferences.favoriteCategories, isValidString)
  );
};

// Data transformation utilities
export const transformRecipeFromFirestore = (firestoreRecipe: RecipeFirestore): Recipe => {
  if (!isValidRecipeFirestore(firestoreRecipe)) {
    throw new Error('Invalid RecipeFirestore data');
  }

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
  if (!isValidRecipe(recipe)) {
    throw new Error('Invalid Recipe data');
  }

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

// Validation wrapper for Firebase data
export const validateFirebaseData = <T>(
  data: any, 
  validator: (obj: any) => obj is T,
  transformFn?: (data: any) => T
): T | null => {
  try {
    if (validator(data)) {
      return data;
    }
    
    if (transformFn) {
      const transformed = transformFn(data);
      if (validator(transformed)) {
        return transformed;
      }
    }
    
    console.warn('Data validation failed:', data);
    return null;
  } catch (error) {
    console.error('Error validating data:', error);
    return null;
  }
};

// Batch validation for arrays
export const validateArrayData = <T>(
  data: any[],
  validator: (obj: any) => obj is T,
  transformFn?: (data: any) => T
): T[] => {
  return data
    .map(item => validateFirebaseData(item, validator, transformFn))
    .filter((item): item is T => item !== null);
};

// Type-safe data access utilities
export const safeGet = <T>(obj: any, path: string[], defaultValue: T): T => {
  try {
    let current = obj;
    for (const key of path) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
    }
    return current !== undefined ? current : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const safeGetString = (obj: any, path: string[], defaultValue: string = ''): string => {
  const value = safeGet(obj, path, defaultValue);
  return isValidString(value) ? value : defaultValue;
};

export const safeGetNumber = (obj: any, path: string[], defaultValue: number = 0): number => {
  const value = safeGet(obj, path, defaultValue);
  return isValidNumber(value) ? value : defaultValue;
};

export const safeGetDate = (obj: any, path: string[], defaultValue: Date = new Date()): Date => {
  const value = safeGet(obj, path, defaultValue);
  return isValidDate(value) ? value : defaultValue;
};

export const safeGetArray = <T>(obj: any, path: string[], validator: (item: any) => item is T, defaultValue: T[] = []): T[] => {
  const value = safeGet(obj, path, defaultValue);
  return isValidArray(value, validator) ? value : defaultValue;
};
