# API Reference

## Overview

This document provides comprehensive API reference for the RefrigeratorRecipes application, including Firebase functions, custom hooks, and utility functions.

## 🔥 Firebase Functions

### Authentication Functions

#### `signUp(email: string, password: string)`
Creates a new user account with email and password.

**Parameters:**
- `email` (string): User's email address
- `password` (string): User's password (minimum 6 characters)

**Returns:** Promise<UserCredential>

**Example:**
```typescript
import { signUp } from '@/lib/firebase/auth';

try {
  const userCredential = await signUp('user@example.com', 'password123');
  console.log('User created:', userCredential.user.uid);
} catch (error) {
  console.error('Signup error:', error.message);
}
```

#### `signIn(email: string, password: string)`
Signs in an existing user with email and password.

**Parameters:**
- `email` (string): User's email address
- `password` (string): User's password

**Returns:** Promise<UserCredential>

**Example:**
```typescript
import { signIn } from '@/lib/firebase/auth';

try {
  const userCredential = await signIn('user@example.com', 'password123');
  console.log('User signed in:', userCredential.user.uid);
} catch (error) {
  console.error('Signin error:', error.message);
}
```

#### `signInWithGoogle()`
Signs in a user using Google OAuth.

**Returns:** Promise<UserCredential>

**Example:**
```typescript
import { signInWithGoogle } from '@/lib/firebase/auth';

try {
  const userCredential = await signInWithGoogle();
  console.log('Google signin successful:', userCredential.user.uid);
} catch (error) {
  console.error('Google signin error:', error.message);
}
```

#### `signOutUser()`
Signs out the current user.

**Returns:** Promise<void>

**Example:**
```typescript
import { signOutUser } from '@/lib/firebase/auth';

try {
  await signOutUser();
  console.log('User signed out successfully');
} catch (error) {
  console.error('Signout error:', error.message);
}
```

#### `resetPassword(email: string)`
Sends a password reset email to the user.

**Parameters:**
- `email` (string): User's email address

**Returns:** Promise<void>

**Example:**
```typescript
import { resetPassword } from '@/lib/firebase/auth';

try {
  await resetPassword('user@example.com');
  console.log('Password reset email sent');
} catch (error) {
  console.error('Password reset error:', error.message);
}
```

#### `onAuthStateChange(callback: (user: User | null) => void)`
Listens for authentication state changes.

**Parameters:**
- `callback` (function): Function called when auth state changes

**Returns:** Unsubscribe function

**Example:**
```typescript
import { onAuthStateChange } from '@/lib/firebase/auth';

const unsubscribe = onAuthStateChange((user) => {
  if (user) {
    console.log('User is signed in:', user.uid);
  } else {
    console.log('User is signed out');
  }
});

// Cleanup when done
unsubscribe();
```

### Firestore Functions

#### `createDocument(path: string, data: any)`
Creates a new document in Firestore.

**Parameters:**
- `path` (string): Collection path (e.g., 'users/userId/ingredients')
- `data` (object): Document data

**Returns:** Promise<DocumentReference>

**Example:**
```typescript
import { createDocument } from '@/lib/firebase/firestore';

const ingredientData = {
  name: 'Tomato',
  quantity: 5,
  unit: 'pieces',
  category: 'vegetables',
  location: 'fridge',
  expirationDate: new Date('2024-01-20'),
  tags: ['fresh', 'organic'],
};

try {
  const docRef = await createDocument('users/userId/ingredients', ingredientData);
  console.log('Document created with ID:', docRef.id);
} catch (error) {
  console.error('Create document error:', error.message);
}
```

#### `getDocument(path: string, id: string)`
Retrieves a single document from Firestore.

**Parameters:**
- `path` (string): Collection path
- `id` (string): Document ID

**Returns:** Promise<DocumentData | null>

**Example:**
```typescript
import { getDocument } from '@/lib/firebase/firestore';

try {
  const document = await getDocument('users/userId/ingredients', 'ingredientId');
  if (document) {
    console.log('Document data:', document);
  } else {
    console.log('Document not found');
  }
} catch (error) {
  console.error('Get document error:', error.message);
}
```

#### `updateDocument(path: string, id: string, data: any)`
Updates an existing document in Firestore.

**Parameters:**
- `path` (string): Collection path
- `id` (string): Document ID
- `data` (object): Updated data

**Returns:** Promise<void>

**Example:**
```typescript
import { updateDocument } from '@/lib/firebase/firestore';

const updates = {
  quantity: 3,
  updatedAt: new Date(),
};

try {
  await updateDocument('users/userId/ingredients', 'ingredientId', updates);
  console.log('Document updated successfully');
} catch (error) {
  console.error('Update document error:', error.message);
}
```

#### `deleteDocument(path: string, id: string)`
Deletes a document from Firestore.

**Parameters:**
- `path` (string): Collection path
- `id` (string): Document ID

**Returns:** Promise<void>

**Example:**
```typescript
import { deleteDocument } from '@/lib/firebase/firestore';

try {
  await deleteDocument('users/userId/ingredients', 'ingredientId');
  console.log('Document deleted successfully');
} catch (error) {
  console.error('Delete document error:', error.message);
}
```

#### `subscribeToCollection(path: string, callback: (data: any[]) => void, constraints: any[] = [])`
Sets up a real-time listener for a collection.

**Parameters:**
- `path` (string): Collection path
- `callback` (function): Function called when data changes
- `constraints` (array): Query constraints (optional)

**Returns:** Unsubscribe function

**Example:**
```typescript
import { subscribeToCollection } from '@/lib/firebase/firestore';
import { orderBy, where } from 'firebase/firestore';

const constraints = [
  where('location', '==', 'fridge'),
  orderBy('expirationDate', 'asc'),
];

const unsubscribe = subscribeToCollection(
  'users/userId/ingredients',
  (ingredients) => {
    console.log('Ingredients updated:', ingredients);
  },
  constraints
);

// Cleanup when done
unsubscribe();
```

## 🎣 Custom Hooks

### Authentication Hooks

#### `useAuth()`
Provides authentication state and user information.

**Returns:** AuthContextType

**Properties:**
- `user` (User | null): Current user object or null
- `loading` (boolean): Loading state

**Example:**
```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please sign in</div>;
  }

  return <div>Welcome, {user.displayName}!</div>;
}
```

### Data Management Hooks

#### `useIngredients()`
Manages ingredient data with real-time updates.

**Returns:** UseIngredientsReturn

**Properties:**
- `ingredients` (Ingredient[]): Array of ingredients
- `loading` (boolean): Loading state
- `addIngredient` (function): Add new ingredient
- `updateIngredient` (function): Update existing ingredient
- `deleteIngredient` (function): Delete ingredient

**Example:**
```typescript
import { useIngredients } from '@/hooks/useIngredients';

function IngredientList() {
  const { ingredients, loading, addIngredient, updateIngredient, deleteIngredient } = useIngredients();

  const handleAddIngredient = async () => {
    const newIngredient = {
      name: 'Apple',
      quantity: 3,
      unit: 'pieces',
      category: 'fruits',
      location: 'fridge',
      expirationDate: new Date('2024-01-25'),
      tags: ['fresh'],
    };

    try {
      await addIngredient(newIngredient);
      console.log('Ingredient added successfully');
    } catch (error) {
      console.error('Error adding ingredient:', error);
    }
  };

  if (loading) {
    return <div>Loading ingredients...</div>;
  }

  return (
    <div>
      <button onClick={handleAddIngredient}>Add Ingredient</button>
      {ingredients.map((ingredient) => (
        <div key={ingredient.id}>
          {ingredient.name} - {ingredient.quantity} {ingredient.unit}
        </div>
      ))}
    </div>
  );
}
```

#### `useRecipes()`
Manages recipe data with real-time updates.

**Returns:** UseRecipesReturn

**Properties:**
- `recipes` (Recipe[]): Array of recipes
- `loading` (boolean): Loading state
- `addRecipe` (function): Add new recipe
- `updateRecipe` (function): Update existing recipe
- `deleteRecipe` (function): Delete recipe
- `searchRecipes` (function): Search recipes
- `getRecipesByIngredient` (function): Get recipes by ingredient

**Example:**
```typescript
import { useRecipes } from '@/hooks/useRecipes';

function RecipeList() {
  const { recipes, loading, addRecipe, searchRecipes } = useRecipes();

  const handleSearch = async (searchTerm: string) => {
    try {
      const results = await searchRecipes(searchTerm);
      console.log('Search results:', results);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  if (loading) {
    return <div>Loading recipes...</div>;
  }

  return (
    <div>
      <input 
        type="text" 
        placeholder="Search recipes..."
        onChange={(e) => handleSearch(e.target.value)}
      />
      {recipes.map((recipe) => (
        <div key={recipe.id}>
          <h3>{recipe.title}</h3>
          <p>{recipe.description}</p>
        </div>
      ))}
    </div>
  );
}
```

#### `useMealPlan()`
Manages meal plan data with real-time updates.

**Returns:** UseMealPlanReturn

**Properties:**
- `mealPlan` (MealPlan | null): Current meal plan
- `loading` (boolean): Loading state
- `createMealPlan` (function): Create new meal plan
- `updateMealPlan` (function): Update meal plan
- `addMealToSlot` (function): Add meal to specific slot
- `removeMealFromSlot` (function): Remove meal from slot

**Example:**
```typescript
import { useMealPlan } from '@/hooks/useMealPlan';

function MealPlanCalendar() {
  const { mealPlan, loading, addMealToSlot, removeMealFromSlot } = useMealPlan();

  const handleAddMeal = async (day: string, mealType: string, recipeId: string) => {
    try {
      await addMealToSlot(day, mealType, recipeId, 2);
      console.log('Meal added to plan');
    } catch (error) {
      console.error('Error adding meal:', error);
    }
  };

  if (loading) {
    return <div>Loading meal plan...</div>;
  }

  return (
    <div>
      {mealPlan?.meals.map((meal) => (
        <div key={meal.id}>
          <span>{meal.day} - {meal.mealType}</span>
          {meal.recipe && <span>{meal.recipe.title}</span>}
          <button onClick={() => removeMealFromSlot(meal.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
```

#### `useShoppingList()`
Manages shopping list data with real-time updates.

**Returns:** UseShoppingListReturn

**Properties:**
- `shoppingLists` (ShoppingList[]): Array of shopping lists
- `loading` (boolean): Loading state
- `createShoppingList` (function): Create new shopping list
- `updateShoppingList` (function): Update shopping list
- `generateFromMealPlan` (function): Generate list from meal plan
- `markItemPurchased` (function): Mark item as purchased

**Example:**
```typescript
import { useShoppingList } from '@/hooks/useShoppingList';

function ShoppingList() {
  const { shoppingLists, loading, generateFromMealPlan, markItemPurchased } = useShoppingList();

  const handleGenerateList = async () => {
    try {
      await generateFromMealPlan('Weekly Shopping List');
      console.log('Shopping list generated');
    } catch (error) {
      console.error('Error generating list:', error);
    }
  };

  if (loading) {
    return <div>Loading shopping lists...</div>;
  }

  return (
    <div>
      <button onClick={handleGenerateList}>Generate from Meal Plan</button>
      {shoppingLists.map((list) => (
        <div key={list.id}>
          <h3>{list.name}</h3>
          {list.items.map((item) => (
            <div key={item.id}>
              <input
                type="checkbox"
                checked={item.isPurchased}
                onChange={() => markItemPurchased(list.id, item.id, !item.isPurchased)}
              />
              <span>{item.name} - {item.quantity} {item.unit}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### Utility Hooks

#### `useDebounce(value: any, delay: number)`
Debounces a value to reduce frequent updates.

**Parameters:**
- `value` (any): Value to debounce
- `delay` (number): Delay in milliseconds

**Returns:** Debounced value

**Example:**
```typescript
import { useDebounce } from '@/hooks/useDebounce';
import { useState } from 'react';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // This effect will only run when debouncedSearchTerm changes
  useEffect(() => {
    if (debouncedSearchTerm) {
      // Perform search
      performSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

#### `useToast()`
Manages toast notifications.

**Returns:** UseToastReturn

**Properties:**
- `toasts` (Toast[]): Array of active toasts
- `addToast` (function): Add new toast
- `removeToast` (function): Remove toast
- `clearToasts` (function): Clear all toasts

**Example:**
```typescript
import { useToast } from '@/hooks/useToast';

function MyComponent() {
  const { addToast } = useToast();

  const handleSuccess = () => {
    addToast({
      id: 'success-1',
      type: 'success',
      title: 'Success!',
      message: 'Operation completed successfully',
      duration: 5000,
    });
  };

  const handleError = () => {
    addToast({
      id: 'error-1',
      type: 'error',
      title: 'Error!',
      message: 'Something went wrong',
      duration: 0, // Don't auto-dismiss
    });
  };

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleError}>Show Error</button>
    </div>
  );
}
```

## 🛠️ Utility Functions

### Date and Time Utilities

#### `formatDate(date: Date | null | undefined)`
Formats a date for display.

**Parameters:**
- `date` (Date | null | undefined): Date to format

**Returns:** string

**Example:**
```typescript
import { formatDate } from '@/utils';

const date = new Date('2024-01-15');
console.log(formatDate(date)); // "Jan 15, 2024"
console.log(formatDate(null)); // "N/A"
```

#### `formatDuration(minutes: number)`
Formats duration in minutes to human-readable format.

**Parameters:**
- `minutes` (number): Duration in minutes

**Returns:** string

**Example:**
```typescript
import { formatDuration } from '@/utils';

console.log(formatDuration(30)); // "30 min"
console.log(formatDuration(60)); // "1 hr"
console.log(formatDuration(90)); // "1 hr 30 min"
```

#### `calculateExpirationStatus(expirationDate: Date)`
Calculates the expiration status of an ingredient.

**Parameters:**
- `expirationDate` (Date): Expiration date

**Returns:** 'expired' | 'expiring-soon' | 'good'

**Example:**
```typescript
import { calculateExpirationStatus } from '@/utils';

const today = new Date();
const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

console.log(calculateExpirationStatus(tomorrow)); // "expiring-soon"
console.log(calculateExpirationStatus(nextWeek)); // "good"
console.log(calculateExpirationStatus(yesterday)); // "expired"
```

### String Utilities

#### `capitalizeFirst(str: string)`
Capitalizes the first letter of a string.

**Parameters:**
- `str` (string): String to capitalize

**Returns:** string

**Example:**
```typescript
import { capitalizeFirst } from '@/utils';

console.log(capitalizeFirst('hello')); // "Hello"
console.log(capitalizeFirst('world')); // "World"
```

#### `slugify(str: string)`
Converts a string to a URL-friendly slug.

**Parameters:**
- `str` (string): String to slugify

**Returns:** string

**Example:**
```typescript
import { slugify } from '@/utils';

console.log(slugify('Hello World!')); // "hello-world"
console.log(slugify('Recipe Name 123')); // "recipe-name-123"
```

### Array Utilities

#### `groupBy(array: any[], key: string)`
Groups array items by a specified key.

**Parameters:**
- `array` (any[]): Array to group
- `key` (string): Key to group by

**Returns:** Record<string, any[]>

**Example:**
```typescript
import { groupBy } from '@/utils';

const ingredients = [
  { name: 'Apple', category: 'fruits' },
  { name: 'Banana', category: 'fruits' },
  { name: 'Carrot', category: 'vegetables' },
];

const grouped = groupBy(ingredients, 'category');
console.log(grouped);
// {
//   fruits: [{ name: 'Apple', category: 'fruits' }, { name: 'Banana', category: 'fruits' }],
//   vegetables: [{ name: 'Carrot', category: 'vegetables' }]
// }
```

#### `sortBy(array: any[], key: string, direction: 'asc' | 'desc' = 'asc')`
Sorts an array by a specified key.

**Parameters:**
- `array` (any[]): Array to sort
- `key` (string): Key to sort by
- `direction` ('asc' | 'desc'): Sort direction

**Returns:** any[]

**Example:**
```typescript
import { sortBy } from '@/utils';

const ingredients = [
  { name: 'Banana', quantity: 3 },
  { name: 'Apple', quantity: 5 },
  { name: 'Carrot', quantity: 2 },
];

const sortedByName = sortBy(ingredients, 'name');
const sortedByQuantity = sortBy(ingredients, 'quantity', 'desc');

console.log(sortedByName); // [{ name: 'Apple' }, { name: 'Banana' }, { name: 'Carrot' }]
console.log(sortedByQuantity); // [{ name: 'Apple', quantity: 5 }, { name: 'Banana', quantity: 3 }, { name: 'Carrot', quantity: 2 }]
```

### Validation Utilities

#### `validateEmail(email: string)`
Validates an email address format.

**Parameters:**
- `email` (string): Email to validate

**Returns:** boolean

**Example:**
```typescript
import { validateEmail } from '@/utils';

console.log(validateEmail('user@example.com')); // true
console.log(validateEmail('invalid-email')); // false
```

#### `validatePassword(password: string)`
Validates password strength.

**Parameters:**
- `password` (string): Password to validate

**Returns:** { isValid: boolean; errors: string[] }

**Example:**
```typescript
import { validatePassword } from '@/utils';

const result = validatePassword('weak');
console.log(result);
// { isValid: false, errors: ['Password must be at least 8 characters', 'Password must contain at least one number'] }

const strongResult = validatePassword('StrongPass123!');
console.log(strongResult);
// { isValid: true, errors: [] }
```

## 📊 Error Handling

### Error Types

#### `FirebaseError`
Firebase-specific errors with error codes.

**Properties:**
- `code` (string): Firebase error code
- `message` (string): Error message
- `stack` (string): Error stack trace

**Common Error Codes:**
- `auth/user-not-found`: User not found
- `auth/wrong-password`: Incorrect password
- `auth/email-already-in-use`: Email already registered
- `permission-denied`: Firestore permission denied
- `not-found`: Document not found

#### `ValidationError`
Custom validation errors.

**Properties:**
- `field` (string): Field that failed validation
- `message` (string): Validation error message
- `value` (any): Invalid value

### Error Handling Patterns

#### Try-Catch Pattern
```typescript
try {
  const result = await someAsyncFunction();
  // Handle success
} catch (error) {
  if (error.code === 'auth/user-not-found') {
    // Handle specific error
    showError('User not found. Please check your email.');
  } else {
    // Handle generic error
    showError('An unexpected error occurred.');
  }
}
```

#### Error Boundary Pattern
```typescript
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

---

This API reference provides comprehensive documentation for all Firebase functions, custom hooks, and utility functions used in the RefrigeratorRecipes application. For more specific implementation details, refer to the individual source files.
