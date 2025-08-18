# Firebase Integration Guide

## Overview

This guide documents the complete Firebase integration for the RefrigeratorRecipes application, covering recipes, meal planning, shopping lists, and recipe recommendations. The application uses Firebase 12.1.0 with Next.js 15.4.6 and React 19.1.0.

## Architecture

### Collections Structure

```
users/
├── {userId}/
    ├── ingredients/
    │   └── {ingredientId}/
    ├── recipes/
    │   └── {recipeId}/
    ├── mealPlans/
    │   └── {mealPlanId}/
    └── shoppingLists/
        └── {shoppingListId}/
```

### Data Models

#### Recipe
```typescript
interface Recipe {
  id: string;
  title: string;
  description: string;
  images: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  mealType: string[];
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
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  nutrition?: RecipeNutrition;
  tags: string[];
  dietary: string[];
  ratings: RecipeRatings;
  source?: RecipeSource;
  sharing: RecipeSharing;
  metadata: RecipeMetadata;
}
```

#### MealPlan
```typescript
interface MealPlan {
  id: string;
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  meals: MealSlot[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### ShoppingList
```typescript
interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  items: ShoppingListItem[];
  totalEstimatedCost?: number;
  createdAt: Date;
  updatedAt: Date;
  isCompleted: boolean;
}
```

## Firebase Functions

### Recipe Management

#### CRUD Operations
- `createRecipe(userId, recipeData)` - Create a new recipe
- `getUserRecipes(userId)` - Get all user recipes
- `getRecipe(userId, recipeId)` - Get a single recipe
- `updateRecipe(userId, recipeId, updates)` - Update a recipe
- `deleteRecipe(userId, recipeId)` - Delete a recipe

#### Query Functions
- `getRecipesByIngredient(userId, ingredientName)` - Find recipes by ingredient
- `getRecipesByCategory(userId, category)` - Find recipes by category
- `searchRecipes(userId, searchTerm)` - Search recipes by text

#### Real-time Updates
- `subscribeToUserRecipes(userId, callback, onError)` - Real-time recipe updates

### Meal Planning

#### CRUD Operations
- `createMealPlan(userId, mealPlanData)` - Create a new meal plan
- `getUserMealPlans(userId)` - Get all user meal plans
- `getMealPlan(userId, mealPlanId)` - Get a single meal plan
- `updateMealPlan(userId, mealPlanId, updates)` - Update a meal plan
- `deleteMealPlan(userId, mealPlanId)` - Delete a meal plan

#### Query Functions
- `getMealPlanByWeek(userId, weekStart)` - Get meal plan for specific week
- `getMealPlansByDateRange(userId, startDate, endDate)` - Get meal plans in date range

#### Real-time Updates
- `subscribeToUserMealPlans(userId, callback, onError)` - Real-time meal plan updates

### Shopping Lists

#### CRUD Operations
- `createShoppingList(userId, shoppingListData)` - Create a new shopping list
- `getUserShoppingLists(userId)` - Get all user shopping lists
- `getShoppingList(userId, shoppingListId)` - Get a single shopping list
- `updateShoppingList(userId, shoppingListId, updates)` - Update a shopping list
- `deleteShoppingList(userId, shoppingListId)` - Delete a shopping list

#### Special Functions
- `generateShoppingListFromMealPlan(userId, mealPlan, userIngredients)` - Generate shopping list from meal plan

#### Real-time Updates
- `subscribeToUserShoppingLists(userId, callback, onError)` - Real-time shopping list updates

## React Hooks

### useRecipes Hook

```typescript
const {
  recipes,
  filteredRecipes,
  filters,
  sortOptions,
  isLoading,
  error,
  addRecipe,
  updateRecipe,
  deleteRecipe,
  toggleFavorite,
  markAsCooked,
  rateRecipe,
  setFilters,
  setSortOptions,
  clearFilters,
  loadRecipes,
  refreshRecipes,
  getRecipeById,
  getRecipesByIngredient,
  getRecipesByCategory,
  searchRecipes,
  getAvailableCuisines,
  getAvailableTags,
  checkIngredientAvailability,
} = useRecipes();
```

**Features:**
- Real-time Firebase synchronization
- Comprehensive filtering and sorting
- Ingredient availability checking
- Recipe search and categorization
- Error handling and loading states
- Pagination support for large datasets
- TanStack Query caching integration

### useMealPlan Hook

```typescript
const {
  mealPlan,
  currentWeek,
  isLoading,
  error,
  loadMealPlan,
  navigateWeek,
  assignRecipeToSlot,
  removeRecipeFromSlot,
  updateMealNotes,
  setDraggedRecipe,
  getWeeklySummary,
  getMealsForDate,
  getMealSlot,
} = useMealPlan();
```

**Features:**
- Week-based meal planning
- Drag-and-drop recipe assignment
- Real-time Firebase synchronization
- Automatic meal plan creation for new weeks
- Weekly summary and statistics
- TanStack Query caching integration

### useShoppingList Hook

```typescript
const {
  shoppingLists,
  filteredShoppingLists,
  filters,
  sortOptions,
  isLoading,
  error,
  addShoppingList,
  updateShoppingList,
  deleteShoppingList,
  toggleItemPurchased,
  updateItemQuantity,
  generateFromMealPlan,
  setFilters,
  setSortOptions,
  clearFilters,
  getShoppingListById,
  getItemsByCategory,
  getTotalCost,
  getPurchasedCount,
} = useShoppingList();
```

**Features:**
- Shopping list management
- Item purchase tracking
- Category-based organization
- Cost estimation
- Meal plan integration
- TanStack Query caching integration

### useRecipeRecommendations Hook

```typescript
const {
  recommendations,
  filteredRecommendations,
  filters,
  isLoading,
  error,
  generateRecommendations,
  setFilters,
  clearFilters,
  getRecommendationById,
  getTopRecommendations,
  getRecommendationsByCategory,
} = useRecipeRecommendations();
```

**Features:**
- Ingredient-based recipe recommendations
- Smart scoring algorithm
- Multiple recommendation reasons
- Filtering by difficulty, time, and preferences
- Real-time recommendation updates
- TanStack Query caching integration

## Components

### ShoppingListDashboard

A comprehensive shopping list management component with:
- Shopping list creation and management
- Item purchase tracking
- Category-based organization
- Meal plan integration
- Cost estimation
- Filtering and sorting

### RecipeRecommendations

A recipe recommendation component with:
- Ingredient-based recommendations
- Match percentage display
- Missing ingredient highlighting
- Recommendation reasoning
- Advanced filtering options
- Top recommendations section

## Usage Examples

### Creating a Recipe

```typescript
import { useRecipes } from '@/hooks';

const { addRecipe } = useRecipes();

const handleCreateRecipe = async () => {
  const recipeData = {
    title: 'Spaghetti Carbonara',
    description: 'Classic Italian pasta dish',
    difficulty: 'medium',
    cuisine: 'italian',
    mealType: ['dinner'],
    prepTime: 10,
    cookTime: 15,
    servingsCount: 4,
    ingredients: [
      { name: 'spaghetti', amount: 1, unit: 'lb', isOptional: false },
      { name: 'eggs', amount: 4, unit: 'large', isOptional: false },
      // ... more ingredients
    ],
    instructions: [
      { step: 1, instruction: 'Boil pasta according to package directions' },
      // ... more instructions
    ],
    tags: ['pasta', 'italian', 'quick'],
    dietary: ['vegetarian'],
    isPublic: true,
    allowComments: true,
    allowRating: true,
  };

  await addRecipe(recipeData);
};
```

### Creating a Meal Plan

```typescript
import { useMealPlan } from '@/hooks';

const { assignRecipeToSlot } = useMealPlan();

const handleAssignRecipe = async (slotId: string, recipe: Recipe) => {
  await assignRecipeToSlot(slotId, recipe, 4); // 4 servings
};
```

### Generating a Shopping List

```typescript
import { useShoppingList } from '@/hooks';
import { useMealPlan } from '@/hooks';
import { useIngredients } from '@/hooks';

const { generateFromMealPlan } = useShoppingList();
const { mealPlan } = useMealPlan();
const { ingredients } = useIngredients();

const handleGenerateShoppingList = async () => {
  if (mealPlan) {
    const shoppingList = await generateFromMealPlan(mealPlan, ingredients);
    console.log('Generated shopping list:', shoppingList);
  }
};
```

### Getting Recipe Recommendations

```typescript
import { useRecipeRecommendations } from '@/hooks';
import { useIngredients } from '@/hooks';

const { generateRecommendations, recommendations } = useRecipeRecommendations();
const { ingredients } = useIngredients();

// Generate recommendations when ingredients change
useEffect(() => {
  if (ingredients.length > 0) {
    generateRecommendations(ingredients);
  }
}, [ingredients, generateRecommendations]);

// Display top recommendations
const topRecommendations = recommendations.slice(0, 5);
```

## Error Handling

All Firebase operations include comprehensive error handling:

```typescript
try {
  await addRecipe(recipeData);
  // Success
} catch (error) {
  console.error('Failed to add recipe:', error);
  // Handle error (show toast, update UI, etc.)
}
```

## Real-time Updates

All data is synchronized in real-time across browser tabs and devices:

```typescript
// Automatic real-time updates
const { recipes } = useRecipes();
const { mealPlan } = useMealPlan();
const { shoppingLists } = useShoppingList();

// Data automatically updates when changed in other tabs/devices
```

## Performance Considerations

### Optimizations
- Real-time subscriptions are automatically cleaned up on component unmount
- Pagination support for large datasets (20 items per page)
- Efficient Firestore queries with proper indexing
- Optimistic updates for better UX
- TanStack Query caching with 5-minute stale time
- Service worker for offline support

### Caching
- Real-time listeners cache data locally
- Automatic refresh mechanisms
- Smart re-subscription handling
- TanStack Query intelligent caching
- Offline data persistence

## Security Rules

Ensure your Firestore security rules allow authenticated users to access their own data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{collection}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Testing

### Unit Tests
- Test all Firebase functions
- Test hook logic and state management
- Test error handling scenarios

### Integration Tests
- Test complete user workflows
- Test real-time updates
- Test concurrent user scenarios

## Deployment

1. Set up Firebase project
2. Configure authentication
3. Set up Firestore database
4. Deploy security rules
5. Configure environment variables
6. Deploy application

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure user is authenticated before accessing Firebase
   - Check Firebase configuration

2. **Real-time Update Issues**
   - Verify security rules allow read/write access
   - Check network connectivity
   - Ensure proper cleanup of subscriptions

3. **Performance Issues**
   - Implement pagination for large datasets
   - Use proper Firestore indexes
   - Optimize queries

### Debug Mode

Enable debug logging:

```typescript
// In development
if (process.env.NODE_ENV === 'development') {
  console.log('Firebase operations:', operations);
}
```

## Future Enhancements

1. **Advanced Search**
   - Implement Algolia for full-text search
   - Add fuzzy matching
   - Support for complex queries

2. **Offline Support**
   - Implement offline-first architecture
   - Sync when connection restored
   - Conflict resolution

3. **Analytics**
   - Track recipe popularity
   - User behavior analytics
   - Performance metrics

4. **Social Features**
   - Recipe sharing
   - User ratings and reviews
   - Community features

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Firebase documentation
3. Check application logs
4. Contact development team
