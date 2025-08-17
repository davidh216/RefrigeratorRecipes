# Ingredient Management System

A comprehensive ingredient tracking system for the RefrigeratorRecipes app, built with React, TypeScript, and Tailwind CSS.

## Features

### 📝 Add Ingredient Form
- **Comprehensive fields**: name, custom name, quantity, unit, purchase date, expiration date, location, category, tags, and notes
- **Smart validation**: prevents invalid data entry with real-time validation
- **Location tracking**: fridge, pantry, or freezer storage
- **Tag system**: predefined and custom tags for easy categorization
- **Unit selection**: 14+ measurement units (cups, lbs, pieces, etc.)

### 📋 Ingredient List View
- **Search functionality**: search by name, custom name, category, or tags
- **Advanced filtering**: filter by location, category, tags, and expiration status
- **Flexible sorting**: sort by name, date bought, expiration date, category, or quantity
- **Responsive grid**: adaptive layout for different screen sizes
- **Empty states**: helpful messages when no ingredients match filters

### 🏷️ Ingredient Card Component
- **Rich display**: shows all ingredient details in an organized card
- **Expiration status**: visual indicators for fresh, expiring soon, and expired items
- **Location icons**: visual indicators for storage location
- **Tag display**: shows first 3 tags with overflow indicator
- **Quick actions**: edit and delete buttons with confirmation

### ⚠️ Expiration Date Tracking
- **Expiration dashboard**: dedicated view for tracking expiration status
- **Visual warnings**: color-coded badges and alerts for different statuses
- **Smart categorization**: groups items by expired, expiring soon (≤3 days), and fresh
- **Statistics**: summary cards showing counts for each category
- **Helpful tips**: guidance for reducing food waste

### 🏷️ Tagging System
- **Predefined tags**: 16 common tags (organic, gluten-free, vegetarian, etc.)
- **Custom tags**: add unlimited custom tags
- **Tag filtering**: filter ingredients by multiple tags
- **Tag management**: easy add/remove functionality in forms and filters

## Component Architecture

### Core Components
- `IngredientDashboard` - Main dashboard with navigation and overview
- `IngredientList` - Complete list view with search, filter, and sort
- `IngredientForm` - Add/edit ingredient form with validation
- `IngredientCard` - Individual ingredient display card
- `ExpirationTracker` - Expiration monitoring and warnings
- `IngredientFilters` - Advanced filtering interface

### Custom Hook
- `useIngredients` - Complete state management for ingredients
  - Local state management with React hooks
  - CRUD operations (Create, Read, Update, Delete)
  - Search, filter, and sort functionality
  - Firebase-ready with placeholder functions
  - Error handling and loading states

### UI Components
- `Input` - Text input with label, validation, and helper text
- `Select` - Dropdown with options and validation
- `Modal` - Reusable modal with different sizes
- `Badge` - Tag display with optional remove functionality
- `Button` - Styled button with variants and sizes

## TypeScript Interfaces

### Core Types
```typescript
interface Ingredient {
  id: string;
  name: string;
  customName?: string;
  quantity: number;
  unit: string;
  dateBought: Date;
  expirationDate?: Date;
  location: 'fridge' | 'pantry' | 'freezer';
  category: string;
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IngredientFormData {
  name: string;
  customName?: string;
  quantity: number;
  unit: string;
  dateBought: string;
  expirationDate?: string;
  location: 'fridge' | 'pantry' | 'freezer';
  category: string;
  tags: string[];
  notes?: string;
}

interface IngredientFilters {
  search: string;
  location: 'all' | 'fridge' | 'pantry' | 'freezer';
  category: string;
  tags: string[];
  expirationStatus: 'all' | 'fresh' | 'expiring-soon' | 'expired';
}

interface IngredientSortOptions {
  field: 'name' | 'dateBought' | 'expirationDate' | 'category' | 'quantity';
  direction: 'asc' | 'desc';
}
```

## Utility Functions

### Date and Expiration Utils
- `formatDate(date)` - Format dates for display
- `getDaysUntilExpiration(date)` - Calculate days until expiration
- `getExpirationStatus(date)` - Determine expiration status
- `getExpirationBadgeVariant(status)` - Get appropriate badge styling

### General Utils
- `generateId()` - Generate unique IDs for ingredients
- `capitalizeFirst(str)` - Capitalize first letter of strings
- `cn(classes)` - Combine Tailwind CSS classes

## Usage Examples

### Basic Usage
```tsx
import { IngredientDashboard } from '@/components/ingredients';

export default function IngredientsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <IngredientDashboard />
      </div>
    </div>
  );
}
```

### Using the Hook Directly
```tsx
import { useIngredients } from '@/hooks';

function MyComponent() {
  const {
    ingredients,
    filteredIngredients,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    setFilters,
  } = useIngredients();

  // Use the ingredient data and functions
}
```

### Individual Components
```tsx
import { IngredientList, ExpirationTracker } from '@/components/ingredients';

function CustomLayout() {
  return (
    <div>
      <ExpirationTracker ingredients={ingredients} />
      <IngredientList />
    </div>
  );
}
```

## Firebase Integration

The system is designed to be Firebase-ready. To integrate with Firestore:

1. Implement the placeholder functions in `useIngredients`:
   - `loadIngredients()`
   - `saveIngredient(ingredient)`
   - `removeIngredient(id)`

2. Replace local state management with Firebase operations
3. Add real-time listeners for ingredient updates
4. Implement user authentication and data scoping

## File Structure

```
src/
├── components/
│   ├── ingredients/
│   │   ├── IngredientDashboard.tsx
│   │   ├── IngredientList.tsx
│   │   ├── IngredientForm.tsx
│   │   ├── IngredientCard.tsx
│   │   ├── IngredientFilters.tsx
│   │   ├── ExpirationTracker.tsx
│   │   └── index.ts
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Modal.tsx
│       ├── Badge.tsx
│       └── index.ts
├── hooks/
│   ├── useIngredients.ts
│   └── index.ts
├── types/
│   └── index.ts
├── utils/
│   └── index.ts
└── lib/
    └── constants.ts
```

## Features Ready for Implementation

1. **User Authentication**: Multi-user support with Firebase Auth
2. **Data Persistence**: Firestore integration for cloud storage
3. **Real-time Updates**: Live synchronization across devices
4. **Image Upload**: Photo support for ingredients
5. **Barcode Scanning**: Quick ingredient entry via barcode
6. **Recipe Integration**: Link ingredients to recipes
7. **Shopping Lists**: Generate shopping lists from low inventory
8. **Notifications**: Expiration reminders and alerts

## Demo

Visit `/demo` to see the ingredient system with sample data, or visit `/ingredients` to start with an empty state.

The system provides a complete, production-ready ingredient tracking solution that can be easily extended and integrated with additional features.