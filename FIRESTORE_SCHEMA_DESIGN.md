# Firestore Database Schema Design - RefrigeratorRecipes App

## Overview

This document outlines the complete Firestore database schema for the RefrigeratorRecipes application, designed to efficiently handle user ingredients (pantry/fridge items), recipes, and meal planning with optimal query patterns and scalability.

## Core Design Principles

1. **Denormalization for Read Performance**: Key data is duplicated to minimize reads
2. **Hierarchical Data Structure**: Related data grouped using subcollections
3. **Efficient Querying**: Schema optimized for common query patterns
4. **Scalability**: Design supports horizontal scaling and pagination
5. **Security**: Document-level security with user isolation

## Collection Structure

### 1. Users Collection (`users`)

**Document Path**: `/users/{userId}`

```typescript
{
  // Document ID is Firebase Auth UID
  email: string;
  displayName: string;
  photoURL?: string;
  preferences: {
    dietaryRestrictions: string[];
    allergies: string[];
    favoriteCategories: string[];
    measurementUnit: 'metric' | 'imperial';
    language: string;
  };
  profile: {
    firstName: string;
    lastName: string;
    bio?: string;
  };
  settings: {
    notifications: {
      expirationAlerts: boolean;
      mealPlanReminders: boolean;
      recipeRecommendations: boolean;
    };
    privacy: {
      shareRecipes: boolean;
      shareMealPlans: boolean;
    };
  };
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastLoginAt: Timestamp;
    isActive: boolean;
  };
}
```

### 2. User Ingredients (Pantry/Fridge) Subcollection

**Document Path**: `/users/{userId}/ingredients/{ingredientId}`

```typescript
{
  // Auto-generated document ID
  name: string;                    // e.g., "Organic Whole Milk"
  originalName: string;           // Original product name
  customName?: string;            // User's custom name
  category: string;               // "dairy", "vegetables", "meat", etc.
  brand?: string;
  quantity: {
    amount: number;               // 2.5
    unit: string;                // "liters", "cups", "pieces"
    originalAmount?: number;      // Original purchased amount
    originalUnit?: string;       // Original unit if converted
  };
  dates: {
    purchasedAt?: Timestamp;
    expiresAt?: Timestamp;
    addedAt: Timestamp;
    updatedAt: Timestamp;
  };
  storage: {
    location: 'fridge' | 'freezer' | 'pantry' | 'counter';
    temperature?: number;         // For specific storage requirements
    notes?: string;
  };
  tags: string[];                 // ["organic", "sale-item", "bulk-buy"]
  nutritionalInfo?: {
    calories?: number;            // per unit
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
  cost?: {
    price: number;
    currency: string;
    pricePerUnit?: number;
  };
  barcode?: string;               // For scanning functionality
  images?: string[];              // Storage URLs
  status: 'fresh' | 'expiring-soon' | 'expired' | 'used';
  notifications: {
    expirationWarning: boolean;
    lowQuantityAlert: boolean;
  };
}
```

### 3. Recipes Collection

**Document Path**: `/users/{userId}/recipes/{recipeId}`

```typescript
{
  // Auto-generated document ID
  title: string;
  description: string;
  images: string[];               // Array of image URLs
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine?: string;              // "italian", "mexican", "asian"
  mealType: string[];            // ["breakfast", "lunch", "dinner", "snack"]
  
  timing: {
    prepTime: number;            // minutes
    cookTime: number;            // minutes
    totalTime: number;           // minutes
    restTime?: number;           // for bread, marinades, etc.
  };
  
  servings: {
    count: number;
    notes?: string;              // "serves 4-6 adults"
  };
  
  ingredients: Array<{
    id?: string;                 // Reference to user's ingredient if available
    name: string;
    amount: number;
    unit: string;
    notes?: string;              // "finely chopped", "room temperature"
    isOptional: boolean;
    substitutes?: string[];      // Alternative ingredients
    category?: string;           // For grouping in UI
  }>;
  
  instructions: Array<{
    step: number;
    instruction: string;
    image?: string;
    timer?: number;              // If step has specific timing
    temperature?: number;        // Oven temperature, etc.
    notes?: string;
  }>;
  
  nutrition?: {
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
  };
  
  tags: string[];                // ["quick", "healthy", "vegetarian"]
  dietary: string[];             // ["vegan", "gluten-free", "dairy-free"]
  
  ratings: {
    average: number;             // Calculated field
    count: number;              // Number of ratings
    userRating?: number;        // Current user's rating
  };
  
  source?: {
    type: 'user-created' | 'imported' | 'shared';
    originalAuthor?: string;
    url?: string;
    book?: string;
  };
  
  sharing: {
    isPublic: boolean;
    sharedWith?: string[];      // Array of user IDs
    allowComments: boolean;
    allowRating: boolean;
  };
  
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastCookedAt?: Timestamp;
    cookCount: number;          // How many times user has made this
    isFavorite: boolean;
    isArchived: boolean;
  };
}
```

### 4. Meal Plans Subcollection

**Document Path**: `/users/{userId}/mealPlans/{planId}`

```typescript
{
  // Document ID format: "YYYY-MM-DD" or "YYYY-WW" for weekly plans
  title: string;                 // "Week of Jan 15, 2024"
  type: 'daily' | 'weekly' | 'monthly';
  
  dateRange: {
    startDate: Timestamp;
    endDate: Timestamp;
  };
  
  meals: {
    [date: string]: {            // "2024-01-15"
      breakfast?: {
        recipeId?: string;
        recipeName: string;      // Denormalized for quick display
        servings: number;
        notes?: string;
        status: 'planned' | 'prepared' | 'completed' | 'skipped';
        prepTime?: number;       // Denormalized from recipe
        cookTime?: number;       // Denormalized from recipe
      };
      lunch?: {
        // Same structure as breakfast
      };
      dinner?: {
        // Same structure as breakfast
      };
      snacks?: Array<{
        // Same structure but as array for multiple snacks
      }>;
    };
  };
  
  shoppingList?: {
    ingredients: Array<{
      name: string;
      amount: number;
      unit: string;
      category: string;
      isPurchased: boolean;
      estimatedCost?: number;
      notes?: string;
    }>;
    estimatedTotal?: number;
    generatedAt: Timestamp;
  };
  
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    isTemplate: boolean;
    templateName?: string;
  };
}
```

### 5. Recipe Collections (Public Recipes)

**Document Path**: `/publicRecipes/{recipeId}`

```typescript
{
  // Similar structure to user recipes but with additional fields
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  
  // All fields from recipe schema plus:
  
  stats: {
    views: number;
    saves: number;              // How many users saved it
    cooks: number;              // How many times it's been cooked
    shares: number;
  };
  
  reviews: {
    count: number;
    averageRating: number;
    lastReviewAt?: Timestamp;
  };
  
  moderation: {
    isApproved: boolean;
    reportCount: number;
    lastModeratedAt?: Timestamp;
    flags?: string[];
  };
  
  // Rest same as user recipe
}
```

### 6. Recipe Reviews Subcollection

**Document Path**: `/publicRecipes/{recipeId}/reviews/{reviewId}`

```typescript
{
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;               // 1-5 stars
  comment?: string;
  images?: string[];            // User's photos of their result
  
  helpful: {
    count: number;
    users: string[];            // User IDs who found it helpful
  };
  
  modifications?: string;       // What they changed
  cookingTime?: number;         // Actual time it took them
  
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    isVerified: boolean;        // If user actually cooked it
  };
}
```

### 7. Recipe Collections/Categories

**Document Path**: `/recipeCategories/{categoryId}`

```typescript
{
  name: string;
  description: string;
  icon?: string;
  color?: string;
  parentCategory?: string;      // For hierarchical categories
  
  stats: {
    recipeCount: number;
    popularityScore: number;
  };
  
  metadata: {
    createdAt: Timestamp;
    isActive: boolean;
  };
}
```

## Indexing Strategy

### Composite Indexes

1. **User Ingredients**:
   - `userId + category + expiresAt` (ascending)
   - `userId + status + expiresAt` (ascending)
   - `userId + tags (array) + addedAt` (descending)

2. **User Recipes**:
   - `userId + difficulty + createdAt` (descending)
   - `userId + tags (array) + lastCookedAt` (descending)
   - `userId + mealType (array) + isFavorite + createdAt` (descending)

3. **Public Recipes**:
   - `difficulty + cuisine + ratings.average` (descending)
   - `tags (array) + dietary (array) + createdAt` (descending)
   - `authorId + sharing.isPublic + createdAt` (descending)

4. **Meal Plans**:
   - `userId + type + dateRange.startDate` (descending)

### Single Field Indexes (Auto-created by Firestore)
- All timestamp fields
- All boolean fields
- userId fields
- status fields

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // User ingredients subcollection
      match /ingredients/{ingredientId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // User recipes subcollection
      match /recipes/{recipeId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // User meal plans subcollection
      match /mealPlans/{planId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Public recipes - read for all authenticated users
    match /publicRecipes/{recipeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (resource == null || resource.data.authorId == request.auth.uid);
      
      // Recipe reviews
      match /reviews/{reviewId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && 
          request.auth.uid == request.resource.data.userId;
        allow update, delete: if request.auth != null && 
          request.auth.uid == resource.data.userId;
      }
    }
    
    // Recipe categories - read only for authenticated users
    match /recipeCategories/{categoryId} {
      allow read: if request.auth != null;
      allow write: if false; // Only admin SDK can modify
    }
  }
}
```

## Query Patterns & Examples

### 1. Get User's Expiring Ingredients
```typescript
// Get ingredients expiring in next 3 days
const threeDaysFromNow = new Date();
threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

db.collection('users').doc(userId).collection('ingredients')
  .where('dates.expiresAt', '<=', threeDaysFromNow)
  .where('status', '==', 'fresh')
  .orderBy('dates.expiresAt', 'asc')
  .limit(20);
```

### 2. Find Recipes by Available Ingredients
```typescript
// This requires application-side filtering due to Firestore limitations
// First get user's available ingredients, then filter recipes
const userIngredients = await getUserIngredients(userId);
const ingredientNames = userIngredients.map(ing => ing.name.toLowerCase());

// Then query recipes and filter client-side
db.collection('users').doc(userId).collection('recipes')
  .orderBy('metadata.lastCookedAt', 'desc')
  .limit(50);
```

### 3. Get Meal Plan for Week
```typescript
const startOfWeek = getStartOfWeek(new Date());
const endOfWeek = getEndOfWeek(new Date());

db.collection('users').doc(userId).collection('mealPlans')
  .where('dateRange.startDate', '>=', startOfWeek)
  .where('dateRange.endDate', '<=', endOfWeek)
  .limit(1);
```

### 4. Search Public Recipes
```typescript
// Search by difficulty and cuisine
db.collection('publicRecipes')
  .where('difficulty', '==', 'easy')
  .where('cuisine', '==', 'italian')
  .orderBy('stats.views', 'desc')
  .limit(20);
```

## Sample Data

### User Document
```json
{
  "email": "john.doe@example.com",
  "displayName": "John Doe",
  "preferences": {
    "dietaryRestrictions": ["vegetarian"],
    "allergies": ["nuts"],
    "favoriteCategories": ["italian", "mexican"],
    "measurementUnit": "metric",
    "language": "en"
  },
  "profile": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "settings": {
    "notifications": {
      "expirationAlerts": true,
      "mealPlanReminders": true,
      "recipeRecommendations": false
    },
    "privacy": {
      "shareRecipes": true,
      "shareMealPlans": false
    }
  },
  "metadata": {
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "lastLoginAt": "2024-01-15T10:30:00Z",
    "isActive": true
  }
}
```

### Ingredient Document
```json
{
  "name": "Organic Whole Milk",
  "originalName": "Organic Valley Whole Milk",
  "category": "dairy",
  "brand": "Organic Valley",
  "quantity": {
    "amount": 1,
    "unit": "liter",
    "originalAmount": 1,
    "originalUnit": "liter"
  },
  "dates": {
    "purchasedAt": "2024-01-10T00:00:00Z",
    "expiresAt": "2024-01-20T00:00:00Z",
    "addedAt": "2024-01-10T10:00:00Z",
    "updatedAt": "2024-01-10T10:00:00Z"
  },
  "storage": {
    "location": "fridge",
    "temperature": 4,
    "notes": "Keep refrigerated"
  },
  "tags": ["organic", "sale-item"],
  "cost": {
    "price": 4.99,
    "currency": "USD",
    "pricePerUnit": 4.99
  },
  "status": "fresh",
  "notifications": {
    "expirationWarning": true,
    "lowQuantityAlert": false
  }
}
```

### Recipe Document
```json
{
  "title": "Spaghetti Carbonara",
  "description": "Classic Italian pasta dish with eggs, cheese, and pancetta",
  "images": ["https://storage.../carbonara1.jpg"],
  "difficulty": "medium",
  "cuisine": "italian",
  "mealType": ["dinner"],
  "timing": {
    "prepTime": 10,
    "cookTime": 15,
    "totalTime": 25
  },
  "servings": {
    "count": 4,
    "notes": "Generous portions"
  },
  "ingredients": [
    {
      "name": "spaghetti",
      "amount": 400,
      "unit": "grams",
      "notes": "high quality pasta",
      "isOptional": false,
      "category": "pasta"
    },
    {
      "name": "pancetta",
      "amount": 150,
      "unit": "grams",
      "notes": "diced",
      "isOptional": false,
      "substitutes": ["bacon", "guanciale"],
      "category": "meat"
    }
  ],
  "instructions": [
    {
      "step": 1,
      "instruction": "Bring a large pot of salted water to boil",
      "timer": 10
    },
    {
      "step": 2,
      "instruction": "Cook spaghetti according to package directions",
      "timer": 10
    }
  ],
  "tags": ["quick", "italian", "pasta"],
  "dietary": ["gluten-containing"],
  "ratings": {
    "average": 4.5,
    "count": 23,
    "userRating": 5
  },
  "source": {
    "type": "user-created"
  },
  "sharing": {
    "isPublic": true,
    "allowComments": true,
    "allowRating": true
  },
  "metadata": {
    "createdAt": "2024-01-05T00:00:00Z",
    "updatedAt": "2024-01-05T00:00:00Z",
    "lastCookedAt": "2024-01-12T18:00:00Z",
    "cookCount": 3,
    "isFavorite": true,
    "isArchived": false
  }
}
```

## Scalability Considerations

### 1. Document Size Limits
- Keep ingredient lists reasonable (max 50 items per query)
- Paginate recipe instructions for very long recipes
- Split large meal plans into weekly documents

### 2. Read/Write Optimization
- Denormalize frequently accessed data (recipe names in meal plans)
- Use batch writes for related operations
- Implement client-side caching for static data

### 3. Cost Optimization
- Use compound queries to minimize reads
- Cache user preferences and categories locally
- Implement pagination for all list views

### 4. Data Lifecycle
- Archive old meal plans (>6 months)
- Soft delete expired ingredients
- Compress images for storage efficiency

## Migration Strategy

1. **Phase 1**: Core collections (users, ingredients, recipes)
2. **Phase 2**: Meal planning and public recipes
3. **Phase 3**: Social features (reviews, sharing)
4. **Phase 4**: Advanced features (recommendations, analytics)

This schema design provides a solid foundation for the RefrigeratorRecipes app with room for future enhancements while maintaining performance and security.