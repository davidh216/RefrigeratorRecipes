import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  FirestoreError
} from 'firebase/firestore';
import { db } from './config';
import { 
  Ingredient, 
  IngredientFormData, 
  Recipe, 
  RecipeFormData, 
  MealPlan, 
  MealPlanFormData,
  ShoppingList,
  ShoppingListFormData,
  ShoppingListItem,
  RecipeIngredient
} from '@/types';

// Collections
export const COLLECTIONS = {
  USERS: 'users',
  INGREDIENTS: 'ingredients',
  RECIPES: 'recipes',
  MEAL_PLANS: 'mealPlans',
  SHOPPING_LISTS: 'shoppingLists'
} as const;

// Convert Firestore timestamp to Date
const timestampToDate = (timestamp: Timestamp | null | undefined): Date | undefined => {
  return timestamp ? timestamp.toDate() : undefined;
};

// Convert Firestore document to Ingredient
const docToIngredient = (doc: QueryDocumentSnapshot<DocumentData>): Ingredient => {
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

// Convert IngredientFormData to Firestore document
const ingredientToDoc = (data: IngredientFormData) => {
  return {
    name: data.name,
    customName: data.customName || null,
    quantity: data.quantity,
    unit: data.unit,
    dateBought: data.dateBought ? Timestamp.fromDate(new Date(data.dateBought)) : serverTimestamp(),
    expirationDate: data.expirationDate ? Timestamp.fromDate(new Date(data.expirationDate)) : null,
    location: data.location,
    category: data.category,
    tags: data.tags || [],
    notes: data.notes || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
};

// Convert Firestore document to Recipe
const docToRecipe = (doc: QueryDocumentSnapshot<DocumentData>): Recipe => {
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

// Convert RecipeFormData to Firestore document
const recipeToDoc = (data: RecipeFormData) => {
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastCookedAt: null,
      cookCount: 0,
      isFavorite: false,
      isArchived: false,
    },
  };
};

// Convert Firestore document to MealPlan
const docToMealPlan = (doc: QueryDocumentSnapshot<DocumentData>): MealPlan => {
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

// Convert MealPlanFormData to Firestore document
const mealPlanToDoc = (data: MealPlanFormData) => {
  return {
    weekStart: Timestamp.fromDate(new Date(data.weekStart)),
    weekEnd: Timestamp.fromDate(new Date(data.weekStart)), // Will be calculated
    meals: data.meals?.map(meal => ({
      ...meal,
      date: Timestamp.fromDate(new Date(meal.date)),
    })) || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

// Convert Firestore document to ShoppingList
const docToShoppingList = (doc: QueryDocumentSnapshot<DocumentData>): ShoppingList => {
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

// Convert ShoppingListFormData to Firestore document
const shoppingListToDoc = (data: ShoppingListFormData) => {
  return {
    name: data.name,
    items: data.items || [],
    totalEstimatedCost: data.items?.reduce((total, item) => total + (item.estimatedCost || 0), 0) || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isCompleted: false,
  };
};

// Get user's ingredients collection reference
const getUserIngredientsRef = (userId: string) => {
  return collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.INGREDIENTS);
};

// Get user's recipes collection reference
const getUserRecipesRef = (userId: string) => {
  return collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.RECIPES);
};

// Get user's meal plans collection reference
const getUserMealPlansRef = (userId: string) => {
  return collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.MEAL_PLANS);
};

// Get user's shopping lists collection reference
const getUserShoppingListsRef = (userId: string) => {
  return collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.SHOPPING_LISTS);
};

// ===== INGREDIENT FUNCTIONS =====

// Create a new ingredient
export const createIngredient = async (userId: string, ingredientData: IngredientFormData): Promise<string> => {
  try {
    const ingredientRef = await addDoc(
      getUserIngredientsRef(userId),
      ingredientToDoc(ingredientData)
    );
    return ingredientRef.id;
  } catch (error) {
    console.error('Error creating ingredient:', error);
    throw error;
  }
};

// Get user's ingredients
export const getUserIngredients = async (userId: string): Promise<Ingredient[]> => {
  try {
    const q = query(
      getUserIngredientsRef(userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToIngredient(doc));
  } catch (error) {
    console.error('Error getting ingredients:', error);
    throw error;
  }
};

// Get a single ingredient
export const getIngredient = async (userId: string, ingredientId: string): Promise<Ingredient | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.INGREDIENTS, ingredientId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docToIngredient(docSnap as QueryDocumentSnapshot<DocumentData>);
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting ingredient:', error);
    throw error;
  }
};

// Update an ingredient
export const updateIngredient = async (
  userId: string, 
  ingredientId: string, 
  updates: Partial<IngredientFormData>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.INGREDIENTS, ingredientId);
    
    const updateData: any = {
      updatedAt: serverTimestamp()
    };

    // Convert form data fields to Firestore format
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.customName !== undefined) updateData.customName = updates.customName;
    if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
    if (updates.unit !== undefined) updateData.unit = updates.unit;
    if (updates.dateBought !== undefined) {
      updateData.dateBought = Timestamp.fromDate(new Date(updates.dateBought));
    }
    if (updates.expirationDate !== undefined) {
      updateData.expirationDate = updates.expirationDate 
        ? Timestamp.fromDate(new Date(updates.expirationDate)) 
        : null;
    }
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating ingredient:', error);
    throw error;
  }
};

// Delete an ingredient
export const deleteIngredient = async (userId: string, ingredientId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.INGREDIENTS, ingredientId));
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    throw error;
  }
};

// Real-time listener for user's ingredients
export const subscribeToUserIngredients = (
  userId: string, 
  callback: (ingredients: Ingredient[]) => void,
  onError?: (error: FirestoreError) => void
) => {
  const q = query(
    getUserIngredientsRef(userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, 
    (querySnapshot) => {
      const ingredients = querySnapshot.docs.map(doc => docToIngredient(doc));
      callback(ingredients);
    },
    (error) => {
      console.error('Error in ingredients subscription:', error);
      if (onError) onError(error);
    }
  );
};

// Get ingredients expiring soon
export const getExpiringIngredients = async (userId: string, daysFromNow = 3): Promise<Ingredient[]> => {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysFromNow);
    
    const q = query(
      getUserIngredientsRef(userId),
      where('expirationDate', '<=', Timestamp.fromDate(futureDate)),
      where('expirationDate', '>', Timestamp.fromDate(new Date())),
      orderBy('expirationDate', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToIngredient(doc));
  } catch (error) {
    console.error('Error getting expiring ingredients:', error);
    throw error;
  }
};

// Filter ingredients by location
export const getIngredientsByLocation = async (
  userId: string, 
  location: 'fridge' | 'pantry' | 'freezer'
): Promise<Ingredient[]> => {
  try {
    const q = query(
      getUserIngredientsRef(userId),
      where('location', '==', location),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToIngredient(doc));
  } catch (error) {
    console.error('Error getting ingredients by location:', error);
    throw error;
  }
};

// ===== RECIPE FUNCTIONS =====

// Create a new recipe
export const createRecipe = async (userId: string, recipeData: RecipeFormData): Promise<string> => {
  try {
    const recipeRef = await addDoc(
      getUserRecipesRef(userId),
      recipeToDoc(recipeData)
    );
    return recipeRef.id;
  } catch (error) {
    console.error('Error creating recipe:', error);
    throw error;
  }
};

// Get user's recipes
export const getUserRecipes = async (userId: string): Promise<Recipe[]> => {
  try {
    const q = query(
      getUserRecipesRef(userId),
      orderBy('metadata.createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToRecipe(doc));
  } catch (error) {
    console.error('Error getting recipes:', error);
    throw error;
  }
};

// Get a single recipe
export const getRecipe = async (userId: string, recipeId: string): Promise<Recipe | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.RECIPES, recipeId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docToRecipe(docSnap as QueryDocumentSnapshot<DocumentData>);
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting recipe:', error);
    throw error;
  }
};

// Update a recipe
export const updateRecipe = async (
  userId: string, 
  recipeId: string, 
  updates: Partial<RecipeFormData>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.RECIPES, recipeId);
    
    const updateData: any = {
      'metadata.updatedAt': serverTimestamp()
    };

    // Convert form data fields to Firestore format
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.images !== undefined) updateData.images = updates.images;
    if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty;
    if (updates.cuisine !== undefined) updateData.cuisine = updates.cuisine;
    if (updates.mealType !== undefined) updateData.mealType = updates.mealType;
    if (updates.ingredients !== undefined) updateData.ingredients = updates.ingredients;
    if (updates.instructions !== undefined) updateData.instructions = updates.instructions;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.dietary !== undefined) updateData.dietary = updates.dietary;
    if (updates.isPublic !== undefined) updateData['sharing.isPublic'] = updates.isPublic;
    if (updates.allowComments !== undefined) updateData['sharing.allowComments'] = updates.allowComments;
    if (updates.allowRating !== undefined) updateData['sharing.allowRating'] = updates.allowRating;

    // Handle timing updates
    if (updates.prepTime !== undefined || updates.cookTime !== undefined || updates.restTime !== undefined) {
      const currentRecipe = await getRecipe(userId, recipeId);
      if (currentRecipe) {
        const prepTime = updates.prepTime ?? currentRecipe.timing.prepTime;
        const cookTime = updates.cookTime ?? currentRecipe.timing.cookTime;
        const restTime = updates.restTime ?? currentRecipe.timing.restTime;
        const totalTime = prepTime + cookTime + (restTime || 0);
        
        updateData.timing = {
          prepTime,
          cookTime,
          totalTime,
          restTime: restTime || null,
        };
      }
    }

    // Handle servings updates
    if (updates.servingsCount !== undefined || updates.servingsNotes !== undefined) {
      updateData.servings = {
        count: updates.servingsCount,
        notes: updates.servingsNotes || null,
      };
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating recipe:', error);
    throw error;
  }
};

// Delete a recipe
export const deleteRecipe = async (userId: string, recipeId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.RECIPES, recipeId));
  } catch (error) {
    console.error('Error deleting recipe:', error);
    throw error;
  }
};

// Real-time listener for user's recipes
export const subscribeToUserRecipes = (
  userId: string, 
  callback: (recipes: Recipe[]) => void,
  onError?: (error: FirestoreError) => void
) => {
  const q = query(
    getUserRecipesRef(userId),
    orderBy('metadata.createdAt', 'desc')
  );
  
  return onSnapshot(q, 
    (querySnapshot) => {
      const recipes = querySnapshot.docs.map(doc => docToRecipe(doc));
      callback(recipes);
    },
    (error) => {
      console.error('Error in recipes subscription:', error);
      if (onError) onError(error);
    }
  );
};

// Get recipes by ingredient
export const getRecipesByIngredient = async (userId: string, ingredientName: string): Promise<Recipe[]> => {
  try {
    const q = query(
      getUserRecipesRef(userId),
      where('ingredients', 'array-contains', { name: ingredientName })
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToRecipe(doc));
  } catch (error) {
    console.error('Error getting recipes by ingredient:', error);
    throw error;
  }
};

// Get recipes by category
export const getRecipesByCategory = async (userId: string, category: string): Promise<Recipe[]> => {
  try {
    const q = query(
      getUserRecipesRef(userId),
      where('tags', 'array-contains', category)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToRecipe(doc));
  } catch (error) {
    console.error('Error getting recipes by category:', error);
    throw error;
  }
};

// Search recipes
export const searchRecipes = async (userId: string, searchTerm: string): Promise<Recipe[]> => {
  try {
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation - consider using Algolia or similar for production
    const allRecipes = await getUserRecipes(userId);
    const lowercaseSearch = searchTerm.toLowerCase();
    
    return allRecipes.filter(recipe => 
      recipe.title.toLowerCase().includes(lowercaseSearch) ||
      recipe.description.toLowerCase().includes(lowercaseSearch) ||
      recipe.ingredients.some(ing => ing.name.toLowerCase().includes(lowercaseSearch)) ||
      recipe.tags.some(tag => tag.toLowerCase().includes(lowercaseSearch))
    );
  } catch (error) {
    console.error('Error searching recipes:', error);
    throw error;
  }
};

// ===== MEAL PLAN FUNCTIONS =====

// Create a new meal plan
export const createMealPlan = async (userId: string, mealPlanData: MealPlanFormData): Promise<string> => {
  try {
    const mealPlanRef = await addDoc(
      getUserMealPlansRef(userId),
      mealPlanToDoc(mealPlanData)
    );
    return mealPlanRef.id;
  } catch (error) {
    console.error('Error creating meal plan:', error);
    throw error;
  }
};

// Get user's meal plans
export const getUserMealPlans = async (userId: string): Promise<MealPlan[]> => {
  try {
    const q = query(
      getUserMealPlansRef(userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToMealPlan(doc));
  } catch (error) {
    console.error('Error getting meal plans:', error);
    throw error;
  }
};

// Get a single meal plan
export const getMealPlan = async (userId: string, mealPlanId: string): Promise<MealPlan | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.MEAL_PLANS, mealPlanId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docToMealPlan(docSnap as QueryDocumentSnapshot<DocumentData>);
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting meal plan:', error);
    throw error;
  }
};

// Update a meal plan
export const updateMealPlan = async (
  userId: string, 
  mealPlanId: string, 
  updates: Partial<MealPlanFormData>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.MEAL_PLANS, mealPlanId);
    
    const updateData: any = {
      updatedAt: serverTimestamp()
    };

    if (updates.weekStart !== undefined) {
      updateData.weekStart = Timestamp.fromDate(new Date(updates.weekStart));
    }
    if (updates.meals !== undefined) {
      updateData.meals = updates.meals.map(meal => ({
        ...meal,
        date: Timestamp.fromDate(new Date(meal.date)),
      }));
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating meal plan:', error);
    throw error;
  }
};

// Delete a meal plan
export const deleteMealPlan = async (userId: string, mealPlanId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.MEAL_PLANS, mealPlanId));
  } catch (error) {
    console.error('Error deleting meal plan:', error);
    throw error;
  }
};

// Real-time listener for user's meal plans
export const subscribeToUserMealPlans = (
  userId: string, 
  callback: (mealPlans: MealPlan[]) => void,
  onError?: (error: FirestoreError) => void
) => {
  const q = query(
    getUserMealPlansRef(userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, 
    (querySnapshot) => {
      const mealPlans = querySnapshot.docs.map(doc => docToMealPlan(doc));
      callback(mealPlans);
    },
    (error) => {
      console.error('Error in meal plans subscription:', error);
      if (onError) onError(error);
    }
  );
};

// Get meal plan by week
export const getMealPlanByWeek = async (userId: string, weekStart: Date): Promise<MealPlan | null> => {
  try {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const q = query(
      getUserMealPlansRef(userId),
      where('weekStart', '>=', Timestamp.fromDate(weekStart)),
      where('weekStart', '<=', Timestamp.fromDate(weekEnd)),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.docs.length > 0) {
      return docToMealPlan(querySnapshot.docs[0]);
    }
    return null;
  } catch (error) {
    console.error('Error getting meal plan by week:', error);
    throw error;
  }
};

// Get meal plans by date range
export const getMealPlansByDateRange = async (
  userId: string, 
  startDate: Date, 
  endDate: Date
): Promise<MealPlan[]> => {
  try {
    const q = query(
      getUserMealPlansRef(userId),
      where('weekStart', '>=', Timestamp.fromDate(startDate)),
      where('weekStart', '<=', Timestamp.fromDate(endDate)),
      orderBy('weekStart', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToMealPlan(doc));
  } catch (error) {
    console.error('Error getting meal plans by date range:', error);
    throw error;
  }
};

// ===== SHOPPING LIST FUNCTIONS =====

// Create a new shopping list
export const createShoppingList = async (userId: string, shoppingListData: ShoppingListFormData): Promise<string> => {
  try {
    const shoppingListRef = await addDoc(
      getUserShoppingListsRef(userId),
      shoppingListToDoc(shoppingListData)
    );
    return shoppingListRef.id;
  } catch (error) {
    console.error('Error creating shopping list:', error);
    throw error;
  }
};

// Get user's shopping lists
export const getUserShoppingLists = async (userId: string): Promise<ShoppingList[]> => {
  try {
    const q = query(
      getUserShoppingListsRef(userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToShoppingList(doc));
  } catch (error) {
    console.error('Error getting shopping lists:', error);
    throw error;
  }
};

// Get a single shopping list
export const getShoppingList = async (userId: string, shoppingListId: string): Promise<ShoppingList | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.SHOPPING_LISTS, shoppingListId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docToShoppingList(docSnap as QueryDocumentSnapshot<DocumentData>);
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting shopping list:', error);
    throw error;
  }
};

// Update a shopping list
export const updateShoppingList = async (
  userId: string, 
  shoppingListId: string, 
  updates: Partial<ShoppingListFormData>
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.SHOPPING_LISTS, shoppingListId);
    
    const updateData: any = {
      updatedAt: serverTimestamp()
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.items !== undefined) {
      updateData.items = updates.items;
      updateData.totalEstimatedCost = updates.items.reduce((total, item) => total + (item.estimatedCost || 0), 0);
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating shopping list:', error);
    throw error;
  }
};

// Delete a shopping list
export const deleteShoppingList = async (userId: string, shoppingListId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.SHOPPING_LISTS, shoppingListId));
  } catch (error) {
    console.error('Error deleting shopping list:', error);
    throw error;
  }
};

// Real-time listener for user's shopping lists
export const subscribeToUserShoppingLists = (
  userId: string, 
  callback: (shoppingLists: ShoppingList[]) => void,
  onError?: (error: FirestoreError) => void
) => {
  const q = query(
    getUserShoppingListsRef(userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, 
    (querySnapshot) => {
      const shoppingLists = querySnapshot.docs.map(doc => docToShoppingList(doc));
      callback(shoppingLists);
    },
    (error) => {
      console.error('Error in shopping lists subscription:', error);
      if (onError) onError(error);
    }
  );
};

// Generate shopping list from meal plan
export const generateShoppingListFromMealPlan = async (
  userId: string, 
  mealPlan: MealPlan, 
  userIngredients: Ingredient[]
): Promise<ShoppingList> => {
  try {
    // Get all recipes from meal plan
    const recipeIds = mealPlan.meals
      .filter(meal => meal.recipeId)
      .map(meal => meal.recipeId!);
    
    const recipes: Recipe[] = [];
    for (const recipeId of recipeIds) {
      const recipe = await getRecipe(userId, recipeId);
      if (recipe) {
        recipes.push(recipe);
      }
    }

    // Calculate needed ingredients
    const ingredientMap = new Map<string, ShoppingListItem>();
    const userIngredientMap = new Map<string, Ingredient>();
    
    // Create map of user ingredients for quick lookup
    userIngredients.forEach(ing => {
      userIngredientMap.set(ing.name.toLowerCase(), ing);
    });

    // Process each recipe
    recipes.forEach(recipe => {
      recipe.ingredients.forEach(recipeIngredient => {
        const key = recipeIngredient.name.toLowerCase();
        const userIngredient = userIngredientMap.get(key);
        
        // Calculate how much we need vs how much we have
        const neededAmount = recipeIngredient.amount;
        const availableAmount = userIngredient ? userIngredient.quantity : 0;
        const deficit = Math.max(0, neededAmount - availableAmount);
        
        if (deficit > 0) {
          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!;
            existing.totalAmount += deficit;
            existing.sources.push({
              recipeId: recipe.id,
              recipeTitle: recipe.title,
              amount: recipeIngredient.amount,
              servings: recipe.servings.count,
            });
          } else {
            ingredientMap.set(key, {
              id: `temp-${Date.now()}-${Math.random()}`,
              name: recipeIngredient.name,
              category: recipeIngredient.category || 'Other',
              totalAmount: deficit,
              unit: recipeIngredient.unit,
              estimatedCost: undefined, // Could be calculated based on average prices
              isPurchased: false,
              notes: recipeIngredient.notes,
              sources: [{
                recipeId: recipe.id,
                recipeTitle: recipe.title,
                amount: recipeIngredient.amount,
                servings: recipe.servings.count,
              }],
            });
          }
        }
      });
    });

    // Convert map to array and group by category
    const shoppingListItems = Array.from(ingredientMap.values());
    shoppingListItems.sort((a, b) => a.category.localeCompare(b.category));

    // Create shopping list
    const shoppingListData: ShoppingListFormData = {
      name: `Shopping List - ${mealPlan.weekStart.toLocaleDateString()} to ${mealPlan.weekEnd.toLocaleDateString()}`,
      items: shoppingListItems,
    };

    const shoppingListId = await createShoppingList(userId, shoppingListData);
    
    return {
      id: shoppingListId,
      userId,
      name: shoppingListData.name,
      items: shoppingListItems,
      totalEstimatedCost: shoppingListItems.reduce((total, item) => total + (item.estimatedCost || 0), 0),
      createdAt: new Date(),
      updatedAt: new Date(),
      isCompleted: false,
    };
  } catch (error) {
    console.error('Error generating shopping list:', error);
    throw error;
  }
};

// Create or update user profile
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