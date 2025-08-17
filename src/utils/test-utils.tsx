import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthContext } from '@/contexts/AuthContext'

// Mock user data
export const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: '2023-01-01T00:00:00.000Z',
    lastSignInTime: '2023-01-01T00:00:00.000Z',
  },
  providerData: [],
  refreshToken: 'mock-refresh-token',
  tenantId: null,
  delete: jest.fn(),
  getIdToken: jest.fn(),
  getIdTokenResult: jest.fn(),
  reload: jest.fn(),
  toJSON: jest.fn(),
  phoneNumber: null,
  providerId: 'password',
}

// Mock auth context value
export const mockAuthContextValue = {
  user: mockUser,
  loading: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContextValue?: typeof mockAuthContextValue
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { authContextValue = mockAuthContextValue, ...renderOptions } = options

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthContext.Provider value={authContextValue}>
        {children}
      </AuthContext.Provider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock ingredient data
export const mockIngredient: any = {
  id: 'test-ingredient-id',
  name: 'Test Ingredient',
  customName: null,
  quantity: 1,
  unit: 'piece',
  dateBought: new Date('2023-01-01'),
  expirationDate: new Date('2023-01-15'),
  location: 'fridge',
  category: 'Vegetables',
  tags: ['organic', 'fresh'],
  notes: 'Test notes',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
}

// Mock recipe data
export const mockRecipe: any = {
  id: 'test-recipe-id',
  title: 'Test Recipe',
  description: 'A test recipe description',
  images: [],
  difficulty: 'easy',
  cuisine: 'Italian',
  mealType: ['dinner'],
  timing: {
    prepTime: 15,
    cookTime: 30,
    totalTime: 45,
    restTime: null,
  },
  servings: {
    count: 4,
    notes: null,
  },
  ingredients: [
    {
      name: 'Test Ingredient',
      amount: 2,
      unit: 'pieces',
      category: 'Vegetables',
      notes: null,
    },
  ],
  instructions: ['Step 1', 'Step 2'],
  nutrition: null,
  tags: ['quick', 'healthy'],
  dietary: ['vegetarian'],
  ratings: {
    average: 0,
    count: 0,
    userRating: null,
  },
  source: {
    type: 'user-created',
  },
  sharing: {
    isPublic: false,
    sharedWith: [],
    allowComments: false,
    allowRating: false,
  },
  metadata: {
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    lastCookedAt: null,
    cookCount: 0,
    isFavorite: false,
    isArchived: false,
  },
}

// Mock meal plan data
export const mockMealPlan: any = {
  id: 'test-meal-plan-id',
  userId: 'test-user-id',
  weekStart: new Date('2023-01-01'),
  weekEnd: new Date('2023-01-07'),
  meals: [
    {
      id: 'meal-1',
      date: new Date('2023-01-01'),
      mealType: 'dinner',
      recipeId: 'test-recipe-id',
      recipeTitle: 'Test Recipe',
      servings: 2,
      notes: 'Test meal notes',
    },
  ],
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
}

// Mock shopping list data
export const mockShoppingList: any = {
  id: 'test-shopping-list-id',
  userId: 'test-user-id',
  name: 'Test Shopping List',
  items: [
    {
      id: 'item-1',
      name: 'Test Item',
      category: 'Vegetables',
      totalAmount: 2,
      unit: 'pieces',
      estimatedCost: 5.99,
      isPurchased: false,
      notes: 'Test item notes',
      sources: [
        {
          recipeId: 'test-recipe-id',
          recipeTitle: 'Test Recipe',
          amount: 2,
          servings: 4,
        },
      ],
    },
  ],
  totalEstimatedCost: 5.99,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  isCompleted: false,
}

// Helper function to create mock Firestore documents
export const createMockFirestoreDoc = (data: any, id: string = 'test-id') => ({
  id,
  data: () => data,
  exists: () => true,
})

// Helper function to create mock Firestore query snapshot
export const createMockQuerySnapshot = (docs: any[]) => ({
  docs,
  empty: docs.length === 0,
  size: docs.length,
  metadata: {
    fromCache: false,
    hasPendingWrites: false,
  },
})

// Helper function to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Re-export everything from testing library
export * from '@testing-library/react'
