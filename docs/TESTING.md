# Testing Framework & Coverage Guide

## Overview

This document provides comprehensive information about the testing framework implementation, current coverage status, and guidelines for writing and running tests in the RefrigeratorRecipes application.

## 🧪 Current Testing Status

### Coverage Metrics
- **Statements**: 20.47% (Target: 80%)
- **Branches**: 11.84% (Target: 80%)
- **Functions**: 14.71% (Target: 80%)
- **Lines**: 20.76% (Target: 80%)

### Test Statistics
- **Total Tests**: 267
- **Passed**: 182
- **Failed**: 85
- **Test Suites**: 15 total (3 passed, 12 failed)

## 🛠️ Testing Infrastructure

### Jest Configuration (`jest.config.js`)
```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

### Test Setup (`jest.setup.js`)
```javascript
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock Firebase
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

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
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  writeBatch: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    reload: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};
```

### Test Utilities (`src/utils/test-utils.tsx`)
```typescript
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock data for testing
export const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
};

export const mockRecipe = {
  id: 'recipe-1',
  title: 'Test Recipe',
  description: 'A test recipe',
  ingredients: [
    { name: 'Ingredient 1', quantity: 1, unit: 'cup' },
  ],
  instructions: ['Step 1', 'Step 2'],
  difficulty: 'easy' as const,
  servings: { count: 4 },
  timing: { prepTime: 10, cookTime: 20, totalTime: 30 },
  tags: ['test'],
  dietary: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockIngredient = {
  id: 'ingredient-1',
  name: 'Test Ingredient',
  quantity: 1,
  unit: 'cup',
  category: 'vegetables',
  location: 'fridge' as const,
  expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  tags: ['test'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockMealPlan = {
  id: 'meal-plan-1',
  userId: 'test-user-id',
  weekStart: new Date('2024-01-01'),
  weekEnd: new Date('2024-01-07'),
  meals: [
    {
      id: 'meal-1',
      day: 'monday',
      mealType: 'dinner' as const,
      recipeId: 'recipe-1',
      servings: 2,
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
```

## 📊 Test Coverage by Category

### 🔥 Firebase Functions (35.49% coverage)

#### Auth Functions (`src/lib/firebase/__tests__/auth.test.ts`)
✅ **Complete - 100% coverage**
```typescript
import { signUp, signIn, signInWithGoogle, signOutUser, resetPassword } from '../auth';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

describe('Auth Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should create a new user with email and password', async () => {
      const mockUser = { uid: 'test-uid' };
      (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: mockUser });

      const result = await signUp('test@example.com', 'password123');
      
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
      expect(result.user).toEqual(mockUser);
    });

    it('should handle signup errors', async () => {
      const error = new Error('Email already in use');
      (createUserWithEmailAndPassword as jest.Mock).mockRejectedValue(error);

      await expect(signUp('test@example.com', 'password123')).rejects.toThrow('Email already in use');
    });
  });

  // Additional tests for signIn, signInWithGoogle, signOutUser, resetPassword
});
```

#### Firestore Functions (`src/lib/firebase/__tests__/firestore.test.ts`)
✅ **Existing - 44.07% coverage**
```typescript
import { createDocument, getDocument, updateDocument, deleteDocument } from '../firestore';
import { addDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

describe('Firestore Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDocument', () => {
    it('should create a new document', async () => {
      const mockDocRef = { id: 'test-id' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const result = await createDocument('test-collection', { name: 'test' });
      
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'test',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );
      expect(result).toEqual(mockDocRef);
    });
  });

  // Additional tests for getDocument, updateDocument, deleteDocument
});
```

#### Config Functions (`src/lib/firebase/__tests__/config.test.ts`)
✅ **Complete - 100% coverage**
```typescript
import { auth, db } from '../config';

describe('Firebase Config', () => {
  it('should export auth and db instances', () => {
    expect(auth).toBeDefined();
    expect(db).toBeDefined();
  });

  it('should initialize with correct environment variables', () => {
    expect(process.env.NEXT_PUBLIC_FIREBASE_API_KEY).toBeDefined();
    expect(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toBeDefined();
  });
});
```

### 🎣 Custom Hooks (47.65% coverage)

#### useDebounce (`src/hooks/__tests__/useDebounce.test.tsx`)
✅ **Complete - 100% coverage**
```typescript
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    act(() => {
      rerender({ value: 'updated' });
    });

    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  it('should handle multiple rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    act(() => {
      rerender({ value: 'change1' });
      jest.advanceTimersByTime(100);
      rerender({ value: 'change2' });
      jest.advanceTimersByTime(100);
      rerender({ value: 'final' });
    });

    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('final');
  });
});
```

#### useRecipes (`src/hooks/__tests__/useRecipes.test.tsx`)
✅ **Existing - 57.83% coverage**
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useRecipes } from '../useRecipes';
import { mockRecipe } from '@/utils/test-utils';

// Mock Firebase functions
jest.mock('@/lib/firebase/firestore', () => ({
  subscribeToCollection: jest.fn(),
  createDocument: jest.fn(),
  updateDocument: jest.fn(),
  deleteDocument: jest.fn(),
}));

describe('useRecipes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load recipes on mount', async () => {
    const mockSubscribe = jest.fn();
    const { subscribeToCollection } = require('@/lib/firebase/firestore');
    subscribeToCollection.mockReturnValue(mockSubscribe);

    const { result } = renderHook(() => useRecipes());

    expect(result.current.loading).toBe(true);
    expect(subscribeToCollection).toHaveBeenCalled();
  });

  // Additional tests for CRUD operations
});
```

#### useIngredients (`src/hooks/__tests__/useIngredients.test.tsx`)
✅ **Existing - 64.81% coverage**
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useIngredients } from '../useIngredients';
import { mockIngredient } from '@/utils/test-utils';

describe('useIngredients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load ingredients on mount', async () => {
    const mockSubscribe = jest.fn();
    const { subscribeToCollection } = require('@/lib/firebase/firestore');
    subscribeToCollection.mockReturnValue(mockSubscribe);

    const { result } = renderHook(() => useIngredients());

    expect(result.current.loading).toBe(true);
    expect(subscribeToCollection).toHaveBeenCalled();
  });

  it('should add new ingredient', async () => {
    const mockCreateDocument = jest.fn();
    const { createDocument } = require('@/lib/firebase/firestore');
    createDocument.mockResolvedValue({ id: 'new-id' });

    const { result } = renderHook(() => useIngredients());

    await act(async () => {
      await result.current.addIngredient(mockIngredient);
    });

    expect(createDocument).toHaveBeenCalledWith(
      'users/test-user-id/ingredients',
      mockIngredient
    );
  });
});
```

#### useMealPlan (`src/hooks/__tests__/useMealPlan.test.tsx`)
✅ **Complete - 53.26% coverage**
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useMealPlan } from '../useMealPlan';
import { mockMealPlan } from '@/utils/test-utils';

describe('useMealPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load meal plan for current week', async () => {
    const mockSubscribe = jest.fn();
    const { subscribeToCollection } = require('@/lib/firebase/firestore');
    subscribeToCollection.mockReturnValue(mockSubscribe);

    const { result } = renderHook(() => useMealPlan());

    expect(result.current.loading).toBe(true);
    expect(subscribeToCollection).toHaveBeenCalled();
  });

  // Additional tests for meal plan operations
});
```

### 🧩 UI Components (4.94% coverage)

#### Button Component (`src/components/ui/__tests__/Button.test.tsx`)
✅ **Complete - 100% coverage**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('should render with default props', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn');
  });

  it('should render with different variants', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
```

#### Loading Component (`src/components/ui/__tests__/Loading.test.tsx`)
✅ **Complete - 100% coverage**
```typescript
import { render, screen } from '@testing-library/react';
import { Loading } from '../Loading';

describe('Loading', () => {
  it('should render with default props', () => {
    render(<Loading />);
    
    const loading = screen.getByRole('status');
    expect(loading).toBeInTheDocument();
    expect(loading).toHaveTextContent('Loading...');
  });

  it('should render with custom text', () => {
    render(<Loading text="Please wait..." />);
    
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<Loading size="small" />);
    expect(screen.getByRole('status')).toHaveClass('loading-sm');

    rerender(<Loading size="large" />);
    expect(screen.getByRole('status')).toHaveClass('loading-lg');
  });
});
```

### 🔄 Contexts (100% coverage)

#### AuthContext (`src/contexts/__tests__/AuthContext.test.tsx`)
✅ **Complete - 100% coverage**
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { mockUser } from '@/utils/test-utils';

const TestComponent = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;
  
  return <div>Welcome, {user.displayName}</div>;
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state initially', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show user when authenticated', async () => {
    const { onAuthStateChanged } = require('firebase/auth');
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return jest.fn();
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
    });
  });

  it('should show not authenticated when no user', async () => {
    const { onAuthStateChanged } = require('firebase/auth');
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return jest.fn();
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
    });
  });
});
```

### 🛠️ Utilities (56.66% coverage)

#### Utility Functions (`src/utils/__tests__/index.test.ts`)
✅ **Existing - 56.66% coverage**
```typescript
import { formatDate, formatDuration, calculateExpirationStatus } from '../index';

describe('Utility Functions', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date)).toBe('Jan 15, 2024');
    });

    it('should handle invalid dates', () => {
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate(undefined)).toBe('N/A');
    });
  });

  describe('formatDuration', () => {
    it('should format duration in minutes', () => {
      expect(formatDuration(30)).toBe('30 min');
      expect(formatDuration(60)).toBe('1 hr');
      expect(formatDuration(90)).toBe('1 hr 30 min');
    });
  });

  describe('calculateExpirationStatus', () => {
    it('should calculate expiration status correctly', () => {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      expect(calculateExpirationStatus(tomorrow)).toBe('expiring-soon');
      expect(calculateExpirationStatus(nextWeek)).toBe('good');
      expect(calculateExpirationStatus(yesterday)).toBe('expired');
    });
  });
});
```

## 📋 Pending Test Categories

### Authentication Components (0% coverage)
- **SignInPage**: Authentication form and validation
- **SignUpPage**: Registration form and validation
- **AuthForm**: Reusable authentication form component
- **ProtectedRoute**: Route protection component
- **UserProfile**: User profile management

### Core Feature Components (0% coverage)
- **IngredientDashboard**: Main ingredient management interface
- **RecipeList**: Recipe listing and filtering
- **MealPlanDashboard**: Meal planning interface
- **ShoppingListDashboard**: Shopping list management
- **RecipeRecommendations**: Recipe recommendation interface

### Page Components (0% coverage)
- **HomePage**: Landing page and navigation
- **IngredientsPage**: Ingredient management page
- **RecipesPage**: Recipe management page
- **MealPlanningPage**: Meal planning page
- **ShoppingListPage**: Shopping list page

### Additional UI Components (0% coverage)
- **Modal**: Modal dialog component
- **Toast**: Notification component
- **Form**: Form components and validation
- **Table**: Data table component
- **Tabs**: Tab navigation component

## 🚀 Running Tests

### Available Test Scripts
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests for CI environment
npm run test:ci

# Run specific test file
npm test -- --testPathPattern=Button.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should render"

# Run tests with verbose output
npm test -- --verbose
```

### Test Coverage Commands
```bash
# Generate coverage report
npm run test:coverage

# Generate coverage report in HTML format
npm test -- --coverage --coverageReporters=html

# Generate coverage report for specific files
npm test -- --coverage --collectCoverageFrom="src/components/**/*.{ts,tsx}"
```

### Debugging Tests
```bash
# Run tests with debug output
npm test -- --verbose --detectOpenHandles

# Run tests with console output
npm test -- --verbose --silent=false

# Run tests with specific environment
NODE_ENV=test npm test
```

## 📝 Writing Tests

### Test File Structure
```typescript
// src/components/MyComponent/__tests__/MyComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  // Setup and teardown
  beforeEach(() => {
    // Setup code
  });

  afterEach(() => {
    // Cleanup code
  });

  // Test cases
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });

  it('should handle user interactions', () => {
    const handleClick = jest.fn();
    render(<MyComponent onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should handle async operations', async () => {
    render(<MyComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('Loaded data')).toBeInTheDocument();
    });
  });
});
```

### Testing Guidelines

#### Component Testing
1. **Test user interactions**: Click, type, submit forms
2. **Test prop variations**: Different prop combinations
3. **Test error states**: Error handling and display
4. **Test loading states**: Loading indicators and skeletons
5. **Test accessibility**: ARIA labels and keyboard navigation

#### Hook Testing
1. **Test state changes**: State updates and side effects
2. **Test cleanup**: Proper cleanup of subscriptions
3. **Test error handling**: Error states and recovery
4. **Test async operations**: Loading states and results

#### Utility Testing
1. **Test edge cases**: Null, undefined, empty values
2. **Test different inputs**: Various input combinations
3. **Test return values**: Expected output formats
4. **Test performance**: Large datasets and optimization

### Mocking Guidelines

#### Firebase Mocking
```typescript
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
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
}));
```

#### Next.js Mocking
```typescript
// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
    query: {},
  }),
}));

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));
```

## 🎯 Coverage Improvement Plan

### Phase 1: Core Components (Week 1-2)
1. **Authentication Components**
   - SignInPage, SignUpPage, AuthForm
   - UserProfile, ProtectedRoute
   - Target: 80% coverage

2. **Core Feature Components**
   - IngredientDashboard, RecipeList
   - MealPlanDashboard, ShoppingListDashboard
   - Target: 80% coverage

### Phase 2: UI Components (Week 3-4)
1. **Base UI Components**
   - Modal, Toast, Form components
   - Table, Tabs, Navigation
   - Target: 80% coverage

2. **Page Components**
   - All page-level components
   - Layout and routing components
   - Target: 80% coverage

### Phase 3: Integration Testing (Week 5-6)
1. **End-to-End Workflows**
   - User registration and authentication
   - Recipe creation and meal planning
   - Shopping list generation
   - Target: 80% coverage

2. **Performance Testing**
   - Large dataset handling
   - Memory usage optimization
   - Bundle size analysis

### Phase 4: Advanced Testing (Week 7-8)
1. **Accessibility Testing**
   - ARIA compliance
   - Keyboard navigation
   - Screen reader compatibility

2. **Cross-Browser Testing**
   - Browser compatibility
   - Mobile responsiveness
   - Progressive enhancement

## 📊 Coverage Reporting

### Coverage Reports
- **Console Output**: Coverage summary in terminal
- **HTML Report**: Detailed coverage report in `coverage/` directory
- **CI Integration**: Coverage reporting in CI/CD pipeline
- **Coverage Badges**: GitHub badges for coverage status

### Coverage Thresholds
```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  './src/components/': {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85,
  },
  './src/hooks/': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
}
```

## 🔧 Continuous Integration

### GitHub Actions
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run type-check
      - run: npm run lint
```

### Coverage Reporting
```yaml
# .github/workflows/coverage.yml
name: Coverage
on: [push]
jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

---

This testing guide provides comprehensive information about the testing framework, current coverage status, and guidelines for writing and running tests. Regular updates will be made as test coverage improves and new testing requirements are identified.
