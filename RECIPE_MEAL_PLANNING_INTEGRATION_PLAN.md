# Recipe & Meal Planning Firebase Integration Plan

## Overview

This document outlines the implementation plan for completing the Firebase integration for the Recipe Management and Meal Planning systems in the RefrigeratorRecipes app.

## Current Status

### ✅ Completed
- **UI Components**: All recipe and meal planning components are built and functional
- **TypeScript Types**: Complete type definitions for recipes and meal plans
- **Local State Management**: Hooks with local state management
- **Firebase Configuration**: Firebase setup and authentication working

### 🚧 Pending Implementation
- **Recipe Firebase Integration**: CRUD operations with Firestore
- **Meal Planning Firebase Integration**: CRUD operations with Firestore
- **Shopping List Generation**: Based on meal plans and available ingredients
- **Recipe Recommendations**: Based on available ingredients

## Phase 1: Recipe Firebase Integration

### 1.1 Extend Firestore Functions (`src/lib/firebase/firestore.ts`)

#### Add Recipe Functions
```typescript
// Recipe CRUD operations
export const createRecipe = async (userId: string, recipeData: RecipeFormData): Promise<string>
export const getUserRecipes = async (userId: string): Promise<Recipe[]>
export const getRecipe = async (userId: string, recipeId: string): Promise<Recipe | null>
export const updateRecipe = async (userId: string, recipeId: string, updates: Partial<RecipeFormData>): Promise<void>
export const deleteRecipe = async (userId: string, recipeId: string): Promise<void>

// Recipe queries
export const getRecipesByIngredient = async (userId: string, ingredientName: string): Promise<Recipe[]>
export const getRecipesByCategory = async (userId: string, category: string): Promise<Recipe[]>
export const searchRecipes = async (userId: string, searchTerm: string): Promise<Recipe[]>

// Real-time listeners
export const subscribeToUserRecipes = (userId: string, callback: (recipes: Recipe[]) => void)
```

#### Implementation Steps
1. **Add recipe document conversion functions**
   - `recipeToDoc()` - Convert RecipeFormData to Firestore document
   - `docToRecipe()` - Convert Firestore document to Recipe

2. **Implement CRUD operations**
   - Create recipe with proper validation
   - Read recipes with pagination support
   - Update recipe with optimistic updates
   - Delete recipe with cascade cleanup

3. **Add query functions**
   - Search by ingredient names
   - Filter by categories and tags
   - Sort by various criteria

4. **Set up real-time listeners**
   - Subscribe to user's recipe collection
   - Handle real-time updates

### 1.2 Update Recipe Hook (`src/hooks/useRecipes.ts`)

#### Replace TODO Functions
```typescript
// Replace placeholder functions with Firebase calls
const loadRecipes = useCallback(async () => {
  if (!user?.uid) return;
  
  setIsLoading(true);
  try {
    const data = await getUserRecipes(user.uid);
    setRecipes(data);
    setError(null);
  } catch (err) {
    setError('Failed to load recipes: ' + (err as Error).message);
  } finally {
    setIsLoading(false);
  }
}, [user?.uid]);

const saveRecipe = useCallback(async (recipe: Recipe) => {
  if (!user?.uid) return;
  
  try {
    if (recipe.id) {
      await updateRecipe(user.uid, recipe.id, recipe);
    } else {
      await createRecipe(user.uid, recipe);
    }
    setError(null);
  } catch (err) {
    setError('Failed to save recipe: ' + (err as Error).message);
  }
}, [user?.uid]);

const removeRecipe = useCallback(async (id: string) => {
  if (!user?.uid) return;
  
  try {
    await deleteRecipe(user.uid, id);
    setError(null);
  } catch (err) {
    setError('Failed to remove recipe: ' + (err as Error).message);
  }
}, [user?.uid]);
```

#### Add Real-time Subscription
```typescript
useEffect(() => {
  if (!user?.uid) {
    setRecipes([]);
    return;
  }

  const unsubscribe = subscribeToUserRecipes(
    user.uid,
    (newRecipes) => {
      setRecipes(newRecipes);
      setIsLoading(false);
      setError(null);
    },
    (error) => {
      setError('Failed to load recipes: ' + error.message);
      setIsLoading(false);
    }
  );

  return unsubscribe;
}, [user?.uid]);
```

### 1.3 Recipe Search and Filtering

#### Implement Advanced Search
```typescript
// Add to useRecipes hook
const searchRecipesByIngredients = useCallback(async (ingredientNames: string[]) => {
  if (!user?.uid) return [];
  
  try {
    const recipes = await getRecipesByIngredient(user.uid, ingredientNames);
    return recipes;
  } catch (err) {
    setError('Failed to search recipes: ' + (err as Error).message);
    return [];
  }
}, [user?.uid]);

const getRecipesByAvailability = useCallback(async (availableIngredients: string[]) => {
  // Get all user recipes and filter by ingredient availability
  const allRecipes = await getUserRecipes(user!.uid);
  return allRecipes.filter(recipe => 
    checkIngredientAvailability(recipe.ingredients, availableIngredients)
  );
}, [user?.uid]);
```

## Phase 2: Meal Planning Firebase Integration

### 2.1 Extend Firestore Functions

#### Add Meal Plan Functions
```typescript
// Meal Plan CRUD operations
export const createMealPlan = async (userId: string, mealPlanData: MealPlanFormData): Promise<string>
export const getUserMealPlans = async (userId: string): Promise<MealPlan[]>
export const getMealPlan = async (userId: string, planId: string): Promise<MealPlan | null>
export const updateMealPlan = async (userId: string, planId: string, updates: Partial<MealPlan>): Promise<void>
export const deleteMealPlan = async (userId: string, planId: string): Promise<void>

// Meal Plan queries
export const getMealPlanByWeek = async (userId: string, weekStart: Date): Promise<MealPlan | null>
export const getMealPlansByDateRange = async (userId: string, startDate: Date, endDate: Date): Promise<MealPlan[]>

// Real-time listeners
export const subscribeToUserMealPlans = (userId: string, callback: (mealPlans: MealPlan[]) => void)
```

#### Implementation Steps
1. **Add meal plan document conversion functions**
   - `mealPlanToDoc()` - Convert MealPlanFormData to Firestore document
   - `docToMealPlan()` - Convert Firestore document to MealPlan

2. **Implement CRUD operations**
   - Create meal plan with week-based ID
   - Read meal plans with date filtering
   - Update meal plan with optimistic updates
   - Delete meal plan

3. **Add week-based queries**
   - Get meal plan for specific week
   - Query meal plans by date range

4. **Set up real-time listeners**
   - Subscribe to user's meal plan collection
   - Handle real-time updates

### 2.2 Update Meal Plan Hook (`src/hooks/useMealPlan.ts`)

#### Replace TODO Functions
```typescript
// Replace placeholder functions with Firebase calls
const loadMealPlan = useCallback(async (weekStart: Date) => {
  if (!user?.uid) return;
  
  setState(prev => ({ ...prev, isLoading: true, error: null }));
  
  try {
    const mealPlan = await getMealPlanByWeek(user.uid, weekStart);
    
    if (mealPlan) {
      setState(prev => ({
        ...prev,
        mealPlan,
        currentWeek: weekStart,
        isLoading: false,
      }));
    } else {
      // Create empty meal plan if none exists
      const emptyMealPlan = generateEmptyMealPlan(weekStart);
      const planId = await createMealPlan(user.uid, emptyMealPlan);
      
      setState(prev => ({
        ...prev,
        mealPlan: { ...emptyMealPlan, id: planId },
        currentWeek: weekStart,
        isLoading: false,
      }));
    }
  } catch (error) {
    setState(prev => ({
      ...prev,
      error: error instanceof Error ? error.message : 'Failed to load meal plan',
      isLoading: false,
    }));
  }
}, [user?.uid, generateEmptyMealPlan]);

const saveMealPlan = useCallback(async (mealPlan: MealPlan) => {
  if (!user?.uid || !mealPlan.id) return;
  
  try {
    await updateMealPlan(user.uid, mealPlan.id, mealPlan);
  } catch (error) {
    setState(prev => ({
      ...prev,
      error: 'Failed to save meal plan: ' + (error as Error).message,
    }));
  }
}, [user?.uid]);
```

#### Add Real-time Subscription
```typescript
useEffect(() => {
  if (!user?.uid) {
    setState(prev => ({ ...prev, mealPlan: null }));
    return;
  }

  const unsubscribe = subscribeToUserMealPlans(
    user.uid,
    (mealPlans) => {
      // Find meal plan for current week
      const currentMealPlan = mealPlans.find(plan => 
        isSameWeek(new Date(plan.weekStart), state.currentWeek)
      );
      
      setState(prev => ({
        ...prev,
        mealPlan: currentMealPlan || null,
        isLoading: false,
        error: null,
      }));
    },
    (error) => {
      setState(prev => ({
        ...prev,
        error: 'Failed to load meal plans: ' + error.message,
        isLoading: false,
      }));
    }
  );

  return unsubscribe;
}, [user?.uid, state.currentWeek]);
```

### 2.3 Shopping List Generation

#### Implement Shopping List Logic
```typescript
// Add to useMealPlan hook
const generateShoppingList = useCallback(async (): Promise<ShoppingListItem[]> => {
  if (!mealPlan || !user?.uid) return [];
  
  try {
    // Get all recipes from meal plan
    const recipeIds = mealPlan.meals
      .filter(meal => meal.recipeId)
      .map(meal => meal.recipeId!);
    
    // Get recipe details
    const recipes = await Promise.all(
      recipeIds.map(id => getRecipe(user.uid, id))
    );
    
    // Get user's current ingredients
    const userIngredients = await getUserIngredients(user.uid);
    
    // Generate shopping list
    const shoppingList = generateShoppingListFromRecipes(
      recipes.filter(Boolean) as Recipe[],
      userIngredients
    );
    
    return shoppingList;
  } catch (error) {
    setState(prev => ({
      ...prev,
      error: 'Failed to generate shopping list: ' + (error as Error).message,
    }));
    return [];
  }
}, [mealPlan, user?.uid]);

// Helper function
const generateShoppingListFromRecipes = (
  recipes: Recipe[], 
  availableIngredients: Ingredient[]
): ShoppingListItem[] => {
  const neededIngredients = new Map<string, ShoppingListItem>();
  
  recipes.forEach(recipe => {
    recipe.ingredients.forEach(ingredient => {
      const key = ingredient.name.toLowerCase();
      const available = availableIngredients.find(
        ai => ai.name.toLowerCase().includes(key) || key.includes(ai.name.toLowerCase())
      );
      
      if (available) {
        const needed = ingredient.amount - available.quantity;
        if (needed > 0) {
          if (neededIngredients.has(key)) {
            neededIngredients.get(key)!.amount += needed;
          } else {
            neededIngredients.set(key, {
              name: ingredient.name,
              amount: needed,
              unit: ingredient.unit,
              category: ingredient.category || 'other',
            });
          }
        }
      } else {
        if (neededIngredients.has(key)) {
          neededIngredients.get(key)!.amount += ingredient.amount;
        } else {
          neededIngredients.set(key, {
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit,
            category: ingredient.category || 'other',
          });
        }
      }
    });
  });
  
  return Array.from(neededIngredients.values());
};
```

## Phase 3: Recipe Recommendations

### 3.1 Implement Recommendation Engine

#### Add Recommendation Functions
```typescript
// Add to firestore.ts
export const getRecipeRecommendations = async (
  userId: string, 
  availableIngredients: string[],
  limit: number = 10
): Promise<Recipe[]> => {
  try {
    // Get all user recipes
    const allRecipes = await getUserRecipes(userId);
    
    // Score recipes based on ingredient availability
    const scoredRecipes = allRecipes.map(recipe => ({
      recipe,
      score: calculateRecipeScore(recipe, availableIngredients),
    }));
    
    // Sort by score and return top recommendations
    return scoredRecipes
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.recipe);
  } catch (error) {
    console.error('Error getting recipe recommendations:', error);
    throw error;
  }
};

const calculateRecipeScore = (recipe: Recipe, availableIngredients: string[]): number => {
  const totalIngredients = recipe.ingredients.length;
  const availableCount = recipe.ingredients.filter(ingredient =>
    availableIngredients.some(available =>
      available.toLowerCase().includes(ingredient.name.toLowerCase()) ||
      ingredient.name.toLowerCase().includes(available.toLowerCase())
    )
  ).length;
  
  const availabilityRatio = availableCount / totalIngredients;
  const difficultyBonus = recipe.difficulty === 'easy' ? 0.1 : 0;
  const ratingBonus = recipe.ratings.average * 0.05;
  
  return availabilityRatio + difficultyBonus + ratingBonus;
};
```

### 3.2 Add Recommendation Hook
```typescript
// Create new hook: src/hooks/useRecipeRecommendations.ts
export const useRecipeRecommendations = () => {
  const { user } = useAuth();
  const { ingredients } = useIngredients();
  const [recommendations, setRecommendations] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    if (!user?.uid || ingredients.length === 0) return;
    
    setIsLoading(true);
    try {
      const availableIngredients = ingredients.map(ing => ing.name);
      const recs = await getRecipeRecommendations(user.uid, availableIngredients);
      setRecommendations(recs);
      setError(null);
    } catch (err) {
      setError('Failed to load recommendations: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, ingredients]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  return {
    recommendations,
    isLoading,
    error,
    refreshRecommendations: loadRecommendations,
  };
};
```

## Implementation Timeline

### Week 1: Recipe Firebase Integration
- [ ] Extend Firestore functions for recipes
- [ ] Update useRecipes hook with Firebase integration
- [ ] Test recipe CRUD operations
- [ ] Implement real-time recipe updates

### Week 2: Meal Planning Firebase Integration
- [ ] Extend Firestore functions for meal plans
- [ ] Update useMealPlan hook with Firebase integration
- [ ] Test meal plan CRUD operations
- [ ] Implement real-time meal plan updates

### Week 3: Shopping List & Recommendations
- [ ] Implement shopping list generation
- [ ] Create recipe recommendation engine
- [ ] Add recommendation hook
- [ ] Test end-to-end functionality

### Week 4: Testing & Polish
- [ ] Comprehensive testing of all features
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Documentation updates

## Testing Strategy

### Unit Tests
- Test individual Firebase functions
- Test hook logic and state management
- Test utility functions

### Integration Tests
- Test recipe CRUD operations
- Test meal plan CRUD operations
- Test shopping list generation
- Test recipe recommendations

### End-to-End Tests
- Test complete user workflows
- Test real-time updates
- Test error scenarios

## Success Criteria

### Recipe Management
- [ ] Users can create, read, update, and delete recipes
- [ ] Real-time updates work across multiple browser tabs
- [ ] Recipe search and filtering work with Firebase data
- [ ] Recipe recommendations are accurate and useful

### Meal Planning
- [ ] Users can create and manage weekly meal plans
- [ ] Real-time updates work for meal plan changes
- [ ] Shopping lists are generated correctly
- [ ] Meal plans persist across sessions

### Performance
- [ ] Page load times under 2 seconds
- [ ] Real-time updates under 500ms
- [ ] Smooth user experience with loading states
- [ ] Efficient Firestore queries with proper indexing

## Risk Mitigation

### Data Consistency
- Implement optimistic updates for better UX
- Add proper error handling and rollback mechanisms
- Use Firestore transactions for critical operations

### Performance
- Implement pagination for large datasets
- Use Firestore indexes for efficient queries
- Cache frequently accessed data

### User Experience
- Add comprehensive loading states
- Implement proper error messages
- Provide offline capabilities where possible

This integration plan provides a clear roadmap for completing the Firebase integration for recipes and meal planning, ensuring a robust and scalable solution.
