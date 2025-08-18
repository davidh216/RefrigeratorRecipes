# Component Library

## Overview

This document provides comprehensive documentation for all UI components in the RefrigeratorRecipes application, including usage examples, props, and styling guidelines.

## 🎨 Design System

### Color Palette
```css
/* Primary Colors */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-500: #3b82f6;
--primary-600: #2563eb;
--primary-700: #1d4ed8;

/* Neutral Colors */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;

/* Semantic Colors */
--success-500: #10b981;
--warning-500: #f59e0b;
--error-500: #ef4444;
--info-500: #3b82f6;
```

### Typography
```css
/* Font Sizes */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
--text-4xl: 2.25rem;

/* Font Weights */
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Spacing
```css
/* Spacing Scale */
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-5: 1.25rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-10: 2.5rem;
--space-12: 3rem;
--space-16: 4rem;
--space-20: 5rem;
```

## 🧩 Base Components

### Button
A versatile button component with multiple variants and sizes.

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
- `size`: 'sm' | 'md' | 'lg'
- `disabled`: boolean
- `loading`: boolean
- `icon`: ReactNode
- `children`: ReactNode

**Example:**
```tsx
import { Button } from '@/components/ui/Button';

function MyComponent() {
  return (
    <div>
      <Button variant="primary" size="md">
        Primary Button
      </Button>
      
      <Button variant="secondary" size="sm" disabled>
        Disabled Button
      </Button>
      
      <Button variant="outline" loading>
        Loading Button
      </Button>
      
      <Button variant="danger" icon={<TrashIcon />}>
        Delete
      </Button>
    </div>
  );
}
```

### Input
A form input component with validation states.

**Props:**
- `type`: 'text' | 'email' | 'password' | 'number' | 'search'
- `placeholder`: string
- `value`: string
- `onChange`: (value: string) => void
- `error`: string
- `disabled`: boolean
- `required`: boolean

**Example:**
```tsx
import { Input } from '@/components/ui/Input';

function MyForm() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  return (
    <Input
      type="email"
      placeholder="Enter your email"
      value={value}
      onChange={setValue}
      error={error}
      required
    />
  );
}
```

### Modal
A modal dialog component for overlays and dialogs.

**Props:**
- `isOpen`: boolean
- `onClose`: () => void
- `title`: string
- `children`: ReactNode
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `closeOnOverlayClick`: boolean

**Example:**
```tsx
import { Modal } from '@/components/ui/Modal';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Open Modal
      </Button>
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirmation"
        size="md"
      >
        <p>Are you sure you want to delete this item?</p>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger">
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
```

### Toast
A notification component for displaying messages.

**Props:**
- `type`: 'success' | 'error' | 'warning' | 'info'
- `title`: string
- `message`: string
- `duration`: number (milliseconds)
- `onClose`: () => void

**Example:**
```tsx
import { useToast } from '@/hooks/useToast';

function MyComponent() {
  const { addToast } = useToast();

  const showSuccess = () => {
    addToast({
      type: 'success',
      title: 'Success!',
      message: 'Operation completed successfully',
      duration: 5000,
    });
  };

  return (
    <Button onClick={showSuccess}>
      Show Success Toast
    </Button>
  );
}
```

### Loading
A loading spinner component.

**Props:**
- `size`: 'sm' | 'md' | 'lg'
- `text`: string
- `color`: string

**Example:**
```tsx
import { Loading } from '@/components/ui/Loading';

function MyComponent() {
  return (
    <div>
      <Loading size="md" text="Loading..." />
      <Loading size="lg" text="Please wait..." />
    </div>
  );
}
```

## 📋 Form Components

### Form
A form wrapper component with validation.

**Props:**
- `onSubmit`: (data: any) => void
- `children`: ReactNode
- `initialValues`: object
- `validationSchema`: Yup schema

**Example:**
```tsx
import { Form } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import * as yup from 'yup';

const validationSchema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().min(8).required(),
});

function MyForm() {
  const handleSubmit = (data) => {
    console.log('Form data:', data);
  };

  return (
    <Form
      onSubmit={handleSubmit}
      initialValues={{ email: '', password: '' }}
      validationSchema={validationSchema}
    >
      <Input name="email" type="email" placeholder="Email" />
      <Input name="password" type="password" placeholder="Password" />
      <Button type="submit">Submit</Button>
    </Form>
  );
}
```

### Select
A dropdown select component.

**Props:**
- `options`: Array<{ value: string; label: string }>
- `value`: string
- `onChange`: (value: string) => void
- `placeholder`: string
- `disabled`: boolean

**Example:**
```tsx
import { Select } from '@/components/ui/Select';

function MyComponent() {
  const [value, setValue] = useState('');

  const options = [
    { value: 'fruits', label: 'Fruits' },
    { value: 'vegetables', label: 'Vegetables' },
    { value: 'dairy', label: 'Dairy' },
  ];

  return (
    <Select
      options={options}
      value={value}
      onChange={setValue}
      placeholder="Select category"
    />
  );
}
```

### Checkbox
A checkbox input component.

**Props:**
- `checked`: boolean
- `onChange`: (checked: boolean) => void
- `label`: string
- `disabled`: boolean

**Example:**
```tsx
import { Checkbox } from '@/components/ui/Checkbox';

function MyComponent() {
  const [checked, setChecked] = useState(false);

  return (
    <Checkbox
      checked={checked}
      onChange={setChecked}
      label="I agree to the terms and conditions"
    />
  );
}
```

## 📊 Data Display Components

### Card
A container component for content sections.

**Props:**
- `title`: string
- `children`: ReactNode
- `variant`: 'default' | 'elevated' | 'outlined'
- `padding`: 'sm' | 'md' | 'lg'

**Example:**
```tsx
import { Card } from '@/components/ui/Card';

function MyComponent() {
  return (
    <Card title="Recipe Details" variant="elevated" padding="md">
      <p>This is the recipe content.</p>
      <p>It can contain any React elements.</p>
    </Card>
  );
}
```

### Table
A data table component.

**Props:**
- `columns`: Array<{ key: string; label: string; render?: (value: any) => ReactNode }>
- `data`: Array<any>
- `loading`: boolean
- `pagination`: boolean

**Example:**
```tsx
import { Table } from '@/components/ui/Table';

function MyComponent() {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'expirationDate', label: 'Expires', render: (value) => formatDate(value) },
    { key: 'actions', label: 'Actions', render: (_, row) => (
      <Button size="sm" variant="outline">Edit</Button>
    ) },
  ];

  const data = [
    { id: 1, name: 'Apple', quantity: 5, expirationDate: new Date() },
    { id: 2, name: 'Banana', quantity: 3, expirationDate: new Date() },
  ];

  return (
    <Table
      columns={columns}
      data={data}
      loading={false}
      pagination={true}
    />
  );
}
```

### Badge
A small status indicator component.

**Props:**
- `variant`: 'default' | 'success' | 'warning' | 'error' | 'info'
- `children`: ReactNode
- `size`: 'sm' | 'md' | 'lg'

**Example:**
```tsx
import { Badge } from '@/components/ui/Badge';

function MyComponent() {
  return (
    <div>
      <Badge variant="success">Active</Badge>
      <Badge variant="warning">Pending</Badge>
      <Badge variant="error">Expired</Badge>
      <Badge variant="info">New</Badge>
    </div>
  );
}
```

### Avatar
A user avatar component.

**Props:**
- `src`: string
- `alt`: string
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `fallback`: string

**Example:**
```tsx
import { Avatar } from '@/components/ui/Avatar';

function MyComponent() {
  return (
    <div>
      <Avatar
        src="/path/to/image.jpg"
        alt="User avatar"
        size="md"
        fallback="JD"
      />
    </div>
  );
}
```

## 🧭 Navigation Components

### Navbar
The main navigation bar component.

**Props:**
- `user`: User object
- `onSignOut`: () => void
- `logo`: ReactNode

**Example:**
```tsx
import { Navbar } from '@/components/ui/Navbar';

function App() {
  const { user, signOut } = useAuth();

  return (
    <Navbar
      user={user}
      onSignOut={signOut}
      logo={<Logo />}
    />
  );
}
```

### Sidebar
A sidebar navigation component.

**Props:**
- `items`: Array<{ label: string; href: string; icon?: ReactNode }>
- `isOpen`: boolean
- `onClose`: () => void

**Example:**
```tsx
import { Sidebar } from '@/components/ui/Sidebar';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  const items = [
    { label: 'Dashboard', href: '/', icon: <HomeIcon /> },
    { label: 'Ingredients', href: '/ingredients', icon: <IngredientIcon /> },
    { label: 'Recipes', href: '/recipes', icon: <RecipeIcon /> },
    { label: 'Meal Planning', href: '/meal-planning', icon: <CalendarIcon /> },
  ];

  return (
    <Sidebar
      items={items}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );
}
```

### Breadcrumbs
A breadcrumb navigation component.

**Props:**
- `items`: Array<{ label: string; href?: string }>

**Example:**
```tsx
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

function MyComponent() {
  const items = [
    { label: 'Home', href: '/' },
    { label: 'Recipes', href: '/recipes' },
    { label: 'Pasta Carbonara' },
  ];

  return <Breadcrumbs items={items} />;
}
```

## 🎯 Feature-Specific Components

### IngredientCard
A card component for displaying ingredient information.

**Props:**
- `ingredient`: Ingredient object
- `onEdit`: (ingredient: Ingredient) => void
- `onDelete`: (id: string) => void

**Example:**
```tsx
import { IngredientCard } from '@/components/ingredients/IngredientCard';

function IngredientList() {
  const { ingredients } = useIngredients();

  const handleEdit = (ingredient) => {
    // Handle edit
  };

  const handleDelete = (id) => {
    // Handle delete
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ingredients.map((ingredient) => (
        <IngredientCard
          key={ingredient.id}
          ingredient={ingredient}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
```

### RecipeCard
A card component for displaying recipe information.

**Props:**
- `recipe`: Recipe object
- `onEdit`: (recipe: Recipe) => void
- `onDelete`: (id: string) => void
- `onAddToMealPlan`: (recipe: Recipe) => void

**Example:**
```tsx
import { RecipeCard } from '@/components/recipes/RecipeCard';

function RecipeList() {
  const { recipes } = useRecipes();

  const handleEdit = (recipe) => {
    // Handle edit
  };

  const handleDelete = (id) => {
    // Handle delete
  };

  const handleAddToMealPlan = (recipe) => {
    // Handle add to meal plan
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddToMealPlan={handleAddToMealPlan}
        />
      ))}
    </div>
  );
}
```

### MealSlotEditor
A component for editing meal plan slots.

**Props:**
- `slot`: MealSlot object
- `recipes`: Recipe[]
- `onUpdate`: (slot: MealSlot) => void
- `onRemove`: (slotId: string) => void

**Example:**
```tsx
import { MealSlotEditor } from '@/components/meal-planning/MealSlotEditor';

function MealPlanCalendar() {
  const { mealPlan } = useMealPlan();
  const { recipes } = useRecipes();

  const handleUpdate = (slot) => {
    // Handle slot update
  };

  const handleRemove = (slotId) => {
    // Handle slot removal
  };

  return (
    <div>
      {mealPlan?.meals.map((slot) => (
        <MealSlotEditor
          key={slot.id}
          slot={slot}
          recipes={recipes}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
}
```

## 🎨 Styling Guidelines

### CSS Classes
Components use Tailwind CSS classes for styling. Common patterns:

```css
/* Layout */
.flex, .grid, .block, .inline-block

/* Spacing */
.p-4, .m-2, .gap-4, .space-y-2

/* Colors */
.text-gray-900, .bg-white, .border-gray-200

/* Typography */
.text-sm, .font-medium, .text-center

/* States */
.hover:bg-gray-50, .focus:ring-2, .disabled:opacity-50

/* Responsive */
.md:grid-cols-2, .lg:grid-cols-3
```

### Dark Mode
Components support dark mode with CSS variables:

```css
/* Light mode */
--bg-primary: #ffffff;
--text-primary: #111827;
--border-primary: #e5e7eb;

/* Dark mode */
.dark {
  --bg-primary: #111827;
  --text-primary: #f9fafb;
  --border-primary: #374151;
}
```

### Responsive Design
Components are responsive by default:

```tsx
// Mobile-first approach
<div className="w-full md:w-1/2 lg:w-1/3">
  <Card>
    <div className="p-4 md:p-6">
      <h3 className="text-lg md:text-xl">Title</h3>
      <p className="text-sm md:text-base">Content</p>
    </div>
  </Card>
</div>
```

## 🔧 Component Development

### Creating New Components
1. Create component file in appropriate directory
2. Export component from index file
3. Add TypeScript interfaces
4. Include JSDoc comments
5. Add unit tests

**Example:**
```tsx
// src/components/ui/MyComponent.tsx
import React from 'react';
import { cn } from '@/utils';

export interface MyComponentProps {
  /** The content to display */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Component variant */
  variant?: 'default' | 'primary';
}

/**
 * MyComponent description
 */
export function MyComponent({ 
  children, 
  className, 
  variant = 'default' 
}: MyComponentProps) {
  return (
    <div 
      className={cn(
        'base-styles',
        variant === 'primary' && 'primary-styles',
        className
      )}
    >
      {children}
    </div>
  );
}
```

### Testing Components
```tsx
// src/components/ui/__tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders children correctly', () => {
    render(<MyComponent>Test content</MyComponent>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<MyComponent className="custom-class">Content</MyComponent>);
    expect(screen.getByText('Content')).toHaveClass('custom-class');
  });
});
```

---

This component library documentation provides comprehensive information about all UI components in the RefrigeratorRecipes application. For more specific implementation details, refer to the individual component files.
