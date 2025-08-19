import { Timestamp, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { 
  Ingredient, 
  IngredientFormData, 
  Recipe, 
  RecipeFormData, 
  MealPlan, 
  MealPlanFormData,
  ShoppingList,
  ShoppingListFormData
} from '@/types';

// Convert Firestore timestamp to Date
export const timestampToDate = (timestamp: Timestamp | null | undefined): Date | undefined => {
  return timestamp ? timestamp.toDate() : undefined;
};

// Convert Date to Firestore timestamp
export const dateToTimestamp = (date: Date | string | null | undefined): Timestamp | null => {
  if (!date) return null;
  return Timestamp.fromDate(new Date(date));
};

// ===== INGREDIENT CONVERTERS =====

export const docToIngredient = (doc: QueryDocumentSnapshot<DocumentData>): Ingredient => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    customName: data.customName,
    quantity: data.quantity,
    unit: data.unit,
    dateBought: timestampToDate(data.dateBought) || new Date(),
    expirationDate: timestampToDate(data.expirationDate),
    location: data.location,
    category: data.category,
    tags: data.tags || [],
    notes: data.notes,
    createdAt: timestampToDate(data.createdAt) || new Date(),
    updatedAt: timestampToDate(data.updatedAt) || new Date()
  };
};

export const ingredientToDoc = (data: IngredientFormData): DocumentData => {
  return {
    name: data.name,
    customName: data.customName || null,
    quantity: data.quantity,
    unit: data.unit,
    dateBought: dateToTimestamp(data.dateBought),
    expirationDate: dateToTimestamp(data.expirationDate),
    location: data.location,
    category: data.category,
    tags: data.tags || [],
    notes: data.notes || null
  };
};

// ===== RECIPE CONVERTERS =====

export const docToRecipe = (doc: QueryDocumentSnapshot<DocumentData>): Recipe => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title,
    description: data.description,
    images: data.images || [],
    difficulty: data.difficulty,
    cuisine: data.cuisine,
    mealType: data.mealType || [],
    timing: {
      prepTime: data.timing?.prepTime || 0,
      cookTime: data.timing?.cookTime || 0,
      totalTime: data.timing?.totalTime || 0,
      restTime: data.timing?.restTime,
    },
    servings: {
      count: data.servings?.count || 1,
      notes: data.servings?.notes,
    },
    ingredients: data.ingredients || [],
    instructions: data.instructions || [],
    nutrition: data.nutrition,
    tags: data.tags || [],
    dietary: data.dietary || [],
    ratings: {
      average: data.ratings?.average || 0,
      count: data.ratings?.count || 0,
      userRating: data.ratings?.userRating,
    },
    source: data.source,
    sharing: {
      isPublic: data.sharing?.isPublic || false,
      sharedWith: data.sharing?.sharedWith || [],
      allowComments: data.sharing?.allowComments || false,
      allowRating: data.sharing?.allowRating || false,
    },
    metadata: {
      createdAt: timestampToDate(data.metadata?.createdAt) || new Date(),
      updatedAt: timestampToDate(data.metadata?.updatedAt) || new Date(),
      lastCookedAt: timestampToDate(data.metadata?.lastCookedAt),
      cookCount: data.metadata?.cookCount || 0,
      isFavorite: data.metadata?.isFavorite || false,
      isArchived: data.metadata?.isArchived || false,
    },
  };
};

export const recipeToDoc = (data: RecipeFormData): DocumentData => {
  const totalTime = data.prepTime + data.cookTime + (data.restTime || 0);
  
  return {
    title: data.title,
    description: data.description,
    images: data.images || [],
    difficulty: data.difficulty,
    cuisine: data.cuisine || null,
    mealType: data.mealType || [],
    timing: {
      prepTime: data.prepTime,
      cookTime: data.cookTime,
      totalTime,
      restTime: data.restTime || null,
    },
    servings: {
      count: data.servingsCount,
      notes: data.servingsNotes || null,
    },
    ingredients: data.ingredients || [],
    instructions: data.instructions || [],
    nutrition: null, // Can be calculated separately
    tags: data.tags || [],
    dietary: data.dietary || [],
    ratings: {
      average: 0,
      count: 0,
      userRating: null,
    },
    source: {
      type: 'user-created',
    },
    sharing: {
      isPublic: data.isPublic || false,
      sharedWith: [],
      allowComments: data.allowComments || false,
      allowRating: data.allowRating || false,
    },
    metadata: {
      lastCookedAt: null,
      cookCount: 0,
      isFavorite: false,
      isArchived: false,
    },
  };
};

// ===== MEAL PLAN CONVERTERS =====

export const docToMealPlan = (doc: QueryDocumentSnapshot<DocumentData>): MealPlan => {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    weekStart: timestampToDate(data.weekStart) || new Date(),
    weekEnd: timestampToDate(data.weekEnd) || new Date(),
    meals: data.meals?.map((meal: any) => ({
      ...meal,
      date: timestampToDate(meal.date) || new Date(),
    })) || [],
    createdAt: timestampToDate(data.createdAt) || new Date(),
    updatedAt: timestampToDate(data.updatedAt) || new Date(),
  };
};

export const mealPlanToDoc = (data: MealPlanFormData): DocumentData => {
  return {
    weekStart: dateToTimestamp(data.weekStart),
    weekEnd: dateToTimestamp(data.weekStart), // Will be calculated
    meals: data.meals?.map(meal => ({
      ...meal,
      date: dateToTimestamp(meal.date),
    })) || [],
  };
};

// ===== SHOPPING LIST CONVERTERS =====

export const docToShoppingList = (doc: QueryDocumentSnapshot<DocumentData>): ShoppingList => {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    name: data.name,
    items: data.items || [],
    totalEstimatedCost: data.totalEstimatedCost,
    createdAt: timestampToDate(data.createdAt) || new Date(),
    updatedAt: timestampToDate(data.updatedAt) || new Date(),
    isCompleted: data.isCompleted || false,
  };
};

export const shoppingListToDoc = (data: ShoppingListFormData): DocumentData => {
  return {
    name: data.name,
    items: data.items || [],
    totalEstimatedCost: data.items?.reduce((total, item) => total + (item.estimatedCost || 0), 0) || 0,
    isCompleted: false,
  };
};
