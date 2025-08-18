# Firebase Setup & Integration Guide

## Overview

This guide provides comprehensive instructions for setting up and integrating Firebase with the RefrigeratorRecipes application. The app uses Firebase 12.1.0 for authentication, Firestore database, and real-time data synchronization.

## Table of Contents
1. [Firebase Project Setup](#firebase-project-setup)
2. [Application Configuration](#application-configuration)
3. [Authentication Setup](#authentication-setup)
4. [Firestore Database Setup](#firestore-database-setup)
5. [Security Rules](#security-rules)
6. [Data Models](#data-models)
7. [Integration Patterns](#integration-patterns)
8. [Testing Firebase](#testing-firebase)

## Firebase Project Setup

### Step 1: Create Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `refrigerator-recipes` (or your preferred name)
4. Choose whether to enable Google Analytics (recommended for production)
5. Select or create a Google Analytics account if enabled
6. Click "Create project"

### Step 2: Add Web App
1. In your Firebase project dashboard, click the web icon (`</>`)
2. Register your app with nickname: "RefrigeratorRecipes Web App"
3. Check "Also set up Firebase Hosting" if you plan to deploy to Firebase Hosting
4. Click "Register app"
5. Copy the Firebase configuration object (you'll need this later)
6. Click "Continue to console"

## Application Configuration

### Required Dependencies
```bash
npm install firebase react-firebase-hooks
```

### Environment Variables
Create a `.env.local` file in your project root:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Optional: Analytics
NEXT_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token
NEXT_PUBLIC_GA_MEASUREMENT_ID=your_ga_id
```

### Firebase Configuration
The Firebase configuration is centralized in `src/lib/firebase/config.ts`:

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
```

## Authentication Setup

### Step 1: Enable Authentication Providers
1. In the Firebase console, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable your desired sign-in providers:

#### Email/Password Authentication
- Click "Email/Password"
- Toggle "Enable"
- Optionally enable "Email link (passwordless sign-in)"
- Click "Save"

#### Google OAuth
- Click "Google"
- Toggle "Enable"
- Add your email to authorized domains
- Configure OAuth consent screen if needed
- Click "Save"

### Step 2: Authentication Functions
The authentication functions are implemented in `src/lib/firebase/auth.ts`:

```typescript
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './config';

// Sign up with email/password
export const signUp = async (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

// Sign in with email/password
export const signIn = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// Sign in with Google
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

// Sign out
export const signOutUser = async () => {
  return signOut(auth);
};

// Password reset
export const resetPassword = async (email: string) => {
  return sendPasswordResetEmail(auth, email);
};

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
```

### Step 3: Authentication Context
The authentication state is managed through React Context in `src/contexts/AuthContext.tsx`:

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange } from '@/lib/firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Firestore Database Setup

### Step 1: Create Firestore Database
1. In the Firebase console, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for development (you'll update security rules later)
4. Select a location for your database (choose the closest region to your users)
5. Click "Done"

### Step 2: Database Structure
The application uses the following Firestore structure:

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

### Step 3: Firestore Functions
The Firestore operations are implemented in `src/lib/firebase/firestore.ts`:

```typescript
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';

// Generic CRUD operations
export const createDocument = async (path: string, data: any) => {
  const docRef = await addDoc(collection(db, path), {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return docRef;
};

export const getDocument = async (path: string, id: string) => {
  const docRef = doc(db, path, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const updateDocument = async (path: string, id: string, data: any) => {
  const docRef = doc(db, path, id);
  return updateDoc(docRef, {
    ...data,
    updatedAt: new Date(),
  });
};

export const deleteDocument = async (path: string, id: string) => {
  const docRef = doc(db, path, id);
  return deleteDoc(docRef);
};

// Real-time subscriptions
export const subscribeToCollection = (
  path: string,
  callback: (data: any[]) => void,
  constraints: any[] = []
) => {
  let q = collection(db, path);
  
  if (constraints.length > 0) {
    q = query(collection(db, path), ...constraints);
  }
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(data);
  });
};
```

## Security Rules

### Firestore Security Rules
Set up proper security rules in the Firebase console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data is only accessible by the authenticated user
    match /users/{userId}/{collection}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public recipes (if implementing sharing)
    match /public/recipes/{recipeId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Authentication Security
- Enable email verification for new accounts
- Set up password strength requirements
- Configure authorized domains for OAuth providers
- Set up proper session management

## Data Models

### Ingredient Model
```typescript
interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  location: 'fridge' | 'pantry' | 'freezer';
  expirationDate: Date;
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Recipe Model
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

### Meal Plan Model
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

interface MealSlot {
  id: string;
  day: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId?: string;
  recipe?: Recipe;
  servings: number;
  notes?: string;
}
```

### Shopping List Model
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

interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  isPurchased: boolean;
  estimatedCost?: number;
}
```

## Integration Patterns

### Custom Hooks
The application uses custom hooks for Firebase integration:

```typescript
// src/hooks/useIngredients.ts
import { useState, useEffect } from 'react';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '@/lib/firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export const useIngredients = () => {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToCollection(
      `users/${user.uid}/ingredients`,
      (data) => {
        setIngredients(data);
        setLoading(false);
      },
      [orderBy('createdAt', 'desc')]
    );

    return unsubscribe;
  }, [user]);

  const addIngredient = async (ingredientData: Omit<Ingredient, 'id'>) => {
    if (!user) throw new Error('User not authenticated');
    return createDocument(`users/${user.uid}/ingredients`, ingredientData);
  };

  const updateIngredient = async (id: string, updates: Partial<Ingredient>) => {
    if (!user) throw new Error('User not authenticated');
    return updateDocument(`users/${user.uid}/ingredients`, id, updates);
  };

  const deleteIngredient = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    return deleteDocument(`users/${user.uid}/ingredients`, id);
  };

  return {
    ingredients,
    loading,
    addIngredient,
    updateIngredient,
    deleteIngredient,
  };
};
```

### Real-time Updates
The application uses Firebase's real-time listeners for instant updates:

```typescript
// Example: Real-time recipe updates
const useRecipes = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToCollection(
      `users/${user.uid}/recipes`,
      setRecipes,
      [orderBy('title')]
    );

    return unsubscribe;
  }, [user]);

  return { recipes };
};
```

### Optimistic Updates
For better user experience, the app implements optimistic updates:

```typescript
const addRecipeOptimistic = async (recipeData: RecipeData) => {
  const tempId = `temp-${Date.now()}`;
  const tempRecipe = { id: tempId, ...recipeData };
  
  // Optimistically add to UI
  setRecipes(prev => [tempRecipe, ...prev]);
  
  try {
    // Actually save to Firebase
    const result = await addRecipe(recipeData);
    
    // Replace temp recipe with real one
    setRecipes(prev => prev.map(r => 
      r.id === tempId ? { ...r, id: result.id } : r
    ));
  } catch (error) {
    // Remove temp recipe on error
    setRecipes(prev => prev.filter(r => r.id !== tempId));
    throw error;
  }
};
```

## Testing Firebase

### Mocking Firebase
For testing, Firebase is mocked using Jest:

```typescript
// jest.setup.js
import { jest } from '@jest/globals';

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
}));
```

### Test Utilities
Create test utilities for Firebase operations:

```typescript
// src/utils/test-utils.tsx
import { render } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';

export const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

export const mockFirebaseUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
};
```

## Best Practices

### Performance Optimization
1. **Use indexes**: Create composite indexes for complex queries
2. **Limit data**: Use pagination and limit queries
3. **Cache data**: Implement client-side caching with React Query
4. **Optimize subscriptions**: Unsubscribe from listeners when components unmount

### Security Best Practices
1. **Validate data**: Always validate data on both client and server
2. **Use security rules**: Implement proper Firestore security rules
3. **Handle errors**: Implement proper error handling for all Firebase operations
4. **Monitor usage**: Set up Firebase usage monitoring and alerts

### Error Handling
```typescript
const handleFirebaseError = (error: any) => {
  switch (error.code) {
    case 'auth/user-not-found':
      return 'User not found. Please check your email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'Email already registered. Please sign in instead.';
    default:
      return 'An error occurred. Please try again.';
  }
};
```

## Troubleshooting

### Common Issues

1. **Firebase not initialized**
   - Check environment variables
   - Ensure Firebase config is correct
   - Verify Firebase project settings

2. **Authentication errors**
   - Check Firebase Auth settings
   - Verify authorized domains
   - Ensure proper OAuth configuration

3. **Firestore permission errors**
   - Check security rules
   - Verify user authentication
   - Ensure proper data structure

4. **Real-time updates not working**
   - Check network connectivity
   - Verify subscription cleanup
   - Ensure proper error handling

### Debug Mode
Enable Firebase debug mode for development:

```typescript
// Only in development
if (process.env.NODE_ENV === 'development') {
  import('firebase/firestore').then(({ connectFirestoreEmulator }) => {
    connectFirestoreEmulator(db, 'localhost', 8080);
  });
}
```

---

This guide covers the complete Firebase setup and integration for the RefrigeratorRecipes application. For more specific implementation details, refer to the individual component files and hooks in the codebase.
