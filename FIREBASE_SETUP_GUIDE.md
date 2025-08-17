# Firebase Setup Guide for RefrigeratorRecipes Project

This guide provides comprehensive instructions for integrating Firebase with your RefrigeratorRecipes React/Next.js application, including Firestore database and Authentication services.

## Table of Contents
1. [Firebase Project Creation](#firebase-project-creation)
2. [Required npm Packages](#required-npm-packages)
3. [Configuration File Structure](#configuration-file-structure)
4. [Environment Variables](#environment-variables)
5. [Firebase Configuration Code](#firebase-configuration-code)
6. [Firestore Setup](#firestore-setup)
7. [Authentication Setup](#authentication-setup)
8. [Security Rules](#security-rules)
9. [Project Structure](#project-structure)

## Firebase Project Creation

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

### Step 3: Enable Authentication
1. In the Firebase console, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable your desired sign-in providers:
   - **Email/Password**: Click, toggle "Enable", save
   - **Google**: Click, toggle "Enable", add your email to authorized domains, save
   - **Other providers** as needed (Facebook, Twitter, etc.)

### Step 4: Create Firestore Database
1. In the Firebase console, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for development (you'll update security rules later)
4. Select a location for your database (choose the closest region to your users)
5. Click "Done"

## Required npm Packages

### For React Applications
```bash
npm install firebase
# Optional: for React hooks integration
npm install react-firebase-hooks
```

### For Next.js Applications
```bash
npm install firebase
# Optional: for React hooks integration
npm install react-firebase-hooks
# Optional: for server-side operations
npm install firebase-admin
```

### Development Dependencies (Optional)
```bash
npm install --save-dev @firebase/rules-unit-testing
```

## Configuration File Structure

### Basic Structure
```
src/
├── lib/
│   └── firebase/
│       ├── config.js          # Firebase configuration
│       ├── auth.js            # Authentication functions
│       ├── firestore.js       # Firestore functions
│       └── index.js           # Main exports
├── hooks/
│   └── useAuth.js             # Custom authentication hook
└── components/
    ├── AuthProvider.jsx       # Authentication context provider
    └── ProtectedRoute.jsx     # Route protection component
```

## Environment Variables

### Required Environment Variables
Create a `.env.local` file in your project root:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Optional: For server-side operations (Next.js)
FIREBASE_PRIVATE_KEY="your_private_key_here"
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PROJECT_ID=your_project_id
```

### Security Notes
- Add `.env.local` to your `.gitignore` file
- Never commit environment variables to version control
- Use different Firebase projects for development and production

## Firebase Configuration Code

### 1. Firebase Configuration (`src/lib/firebase/config.js`)
```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
```

### 2. Authentication Functions (`src/lib/firebase/auth.js`)
```javascript
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './config';

// Google provider
const googleProvider = new GoogleAuthProvider();

// Sign up with email and password
export const signUp = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign in with email and password
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    throw error;
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw error;
  }
};

// Reset password
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw error;
  }
};

// Auth state observer
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
```

### 3. Firestore Functions (`src/lib/firebase/firestore.js`)
```javascript
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
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

// Collections
export const COLLECTIONS = {
  RECIPES: 'recipes',
  USERS: 'users',
  INGREDIENTS: 'ingredients'
};

// Create a new recipe
export const createRecipe = async (userId, recipeData) => {
  try {
    const recipeRef = await addDoc(collection(db, COLLECTIONS.RECIPES), {
      ...recipeData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return recipeRef.id;
  } catch (error) {
    throw error;
  }
};

// Get user's recipes
export const getUserRecipes = async (userId) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.RECIPES),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

// Get a single recipe
export const getRecipe = async (recipeId) => {
  try {
    const docRef = doc(db, COLLECTIONS.RECIPES, recipeId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Recipe not found');
    }
  } catch (error) {
    throw error;
  }
};

// Update a recipe
export const updateRecipe = async (recipeId, updates) => {
  try {
    const docRef = doc(db, COLLECTIONS.RECIPES, recipeId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

// Delete a recipe
export const deleteRecipe = async (recipeId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.RECIPES, recipeId));
  } catch (error) {
    throw error;
  }
};

// Real-time listener for user's recipes
export const subscribeToUserRecipes = (userId, callback) => {
  const q = query(
    collection(db, COLLECTIONS.RECIPES),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const recipes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(recipes);
  });
};

// Create or update user profile
export const createUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    // If user doesn't exist, create new document
    if (error.code === 'not-found') {
      await addDoc(collection(db, COLLECTIONS.USERS), {
        ...userData,
        id: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      throw error;
    }
  }
};
```

### 4. Main Exports (`src/lib/firebase/index.js`)
```javascript
// Re-export everything for easy imports
export * from './config';
export * from './auth';
export * from './firestore';
```

### 5. Authentication Context (`src/components/AuthProvider.jsx`)
```jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChange } from '../lib/firebase/auth';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 6. Custom Authentication Hook (`src/hooks/useAuth.js`)
```javascript
import { useState, useEffect } from 'react';
import { onAuthStateChange } from '../lib/firebase/auth';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
};
```

### 7. Protected Route Component (`src/components/ProtectedRoute.jsx`)
```jsx
import React from 'react';
import { useAuth } from './AuthProvider';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
```

## Firestore Setup

### Data Structure for RefrigeratorRecipes

#### Users Collection
```javascript
// users/{userId}
{
  id: "user_id",
  email: "user@example.com",
  displayName: "John Doe",
  createdAt: timestamp,
  updatedAt: timestamp,
  preferences: {
    dietaryRestrictions: ["vegetarian", "gluten-free"],
    favoriteCategories: ["breakfast", "dinner"]
  }
}
```

#### Recipes Collection
```javascript
// recipes/{recipeId}
{
  id: "recipe_id",
  userId: "user_id",
  title: "Delicious Pasta",
  description: "A quick and easy pasta recipe",
  ingredients: [
    {
      name: "pasta",
      amount: "200g",
      category: "pantry"
    },
    {
      name: "tomatoes",
      amount: "2 pieces",
      category: "fresh"
    }
  ],
  instructions: [
    "Boil water in a large pot",
    "Add pasta and cook for 8-10 minutes",
    "Drain and serve with sauce"
  ],
  prepTime: 15, // minutes
  cookTime: 20, // minutes
  servings: 4,
  category: "dinner",
  tags: ["quick", "easy", "vegetarian"],
  imageUrl: "https://example.com/image.jpg",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Ingredients Collection (Optional - for autocomplete)
```javascript
// ingredients/{ingredientId}
{
  id: "ingredient_id",
  name: "tomatoes",
  category: "fresh",
  commonUnits: ["pieces", "kg", "g"],
  aliases: ["tomato", "cherry tomatoes"]
}
```

## Authentication Setup

### Security Rules

#### Firestore Security Rules
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only access their own recipes
    match /recipes/{recipeId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid);
    }
    
    // Everyone can read ingredients (for autocomplete)
    match /ingredients/{ingredientId} {
      allow read: if true;
      allow write: if request.auth != null; // Only authenticated users can add ingredients
    }
  }
}
```

#### Storage Security Rules (if using Firebase Storage for images)
```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /recipe-images/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Project Structure

### Complete Project Structure
```
refrigerator-recipes/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── AuthProvider.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── RecipeList.jsx
│   │   ├── RecipeForm.jsx
│   │   └── RecipeCard.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useRecipes.js
│   │   └── useFirestore.js
│   ├── lib/
│   │   └── firebase/
│   │       ├── config.js
│   │       ├── auth.js
│   │       ├── firestore.js
│   │       └── index.js
│   ├── pages/ (if using Next.js)
│   │   ├── _app.js
│   │   ├── index.js
│   │   ├── login.js
│   │   ├── register.js
│   │   └── recipes/
│   │       ├── index.js
│   │       ├── [id].js
│   │       └── new.js
│   └── styles/
│       └── globals.css
├── .env.local
├── .gitignore
├── package.json
└── README.md
```

## Getting Started

### Next Steps After Setup

1. **Install dependencies**: Run `npm install firebase`
2. **Configure environment variables**: Create `.env.local` with your Firebase config
3. **Implement authentication**: Start with login/register components
4. **Set up data models**: Create your first recipe
5. **Deploy security rules**: Update Firestore and Storage rules
6. **Test the integration**: Verify authentication and data persistence

### Common Patterns for RefrigeratorRecipes App

#### Recipe Management Hook
```javascript
// src/hooks/useRecipes.js
import { useState, useEffect } from 'react';
import { getUserRecipes, subscribeToUserRecipes } from '../lib/firebase/firestore';
import { useAuth } from './useAuth';

export const useRecipes = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUserRecipes(user.uid, (userRecipes) => {
      setRecipes(userRecipes);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { recipes, loading };
};
```

This setup provides a solid foundation for integrating Firebase with your RefrigeratorRecipes application, including authentication, real-time data synchronization, and proper security measures.