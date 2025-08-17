# RefrigeratorRecipes UI Component Library

A comprehensive, accessible, and responsive React component library built with TypeScript and Tailwind CSS for the RefrigeratorRecipes application.

## 🎨 Design System

Our design system is built around cooking and food themes, featuring:

- **Primary Color**: Warm orange (#f97316) - representing the warmth of cooking
- **Secondary Color**: Fresh green (#22c55e) - representing fresh ingredients
- **Typography**: Inter font family for modern readability
- **Spacing**: Consistent 8px grid system
- **Responsive**: Mobile-first design with sm, md, lg, xl breakpoints

## 📦 Components

### Form Components

#### Button
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md" loading={isLoading}>
  Save Recipe
</Button>
```

**Props:**
- `variant`: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
- `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
- `loading`: boolean
- `leftIcon`, `rightIcon`: React.ReactNode

#### Input
```tsx
import { Input } from '@/components/ui';

<Input
  label="Recipe Title"
  placeholder="Enter recipe title..."
  error={errors.title}
  leftIcon={<SearchIcon />}
/>
```

**Props:**
- `label`, `error`, `helperText`: string
- `variant`: 'default' | 'filled' | 'outline'
- `inputSize`: 'sm' | 'md' | 'lg'
- `leftIcon`, `rightIcon`: React.ReactNode

#### Select
```tsx
import { Select } from '@/components/ui';

<Select
  label="Difficulty Level"
  options={[
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ]}
/>
```

#### Checkbox & Radio
```tsx
import { Checkbox, RadioGroup } from '@/components/ui';

<Checkbox label="Vegetarian" />

<RadioGroup
  name="difficulty"
  options={[
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' }
  ]}
/>
```

### Data Display Components

#### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

<Card hover>
  <CardHeader>
    <CardTitle>Recipe Title</CardTitle>
  </CardHeader>
  <CardContent>
    Recipe content here...
  </CardContent>
</Card>
```

#### Badge
```tsx
import { Badge } from '@/components/ui';

<Badge variant="success" size="sm">Easy</Badge>
<Badge variant="outline" rounded>Italian</Badge>
```

#### Avatar
```tsx
import { Avatar } from '@/components/ui';

<Avatar
  src="/user.jpg"
  fallback="JD"
  size="md"
  status="online"
/>
```

#### Table
```tsx
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui';

<Table variant="striped">
  <TableHeader>
    <TableRow>
      <TableHead sortable>Recipe</TableHead>
      <TableHead>Difficulty</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow hover>
      <TableCell>Spaghetti Carbonara</TableCell>
      <TableCell>Medium</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Navigation Components

#### Navbar
```tsx
import { 
  Navbar, 
  NavbarBrand, 
  NavbarContent, 
  NavbarItem 
} from '@/components/ui';

<Navbar position="sticky">
  <NavbarBrand href="/">RefrigeratorRecipes</NavbarBrand>
  <NavbarContent>
    <NavbarItem href="/recipes" active>Recipes</NavbarItem>
    <NavbarItem href="/ingredients">Ingredients</NavbarItem>
  </NavbarContent>
</Navbar>
```

#### Sidebar
```tsx
import { 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuItem 
} from '@/components/ui';

<Sidebar collapsible width="md">
  <SidebarHeader>Dashboard</SidebarHeader>
  <SidebarContent>
    <SidebarMenu>
      <SidebarMenuItem icon={<HomeIcon />} active>
        Dashboard
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarContent>
</Sidebar>
```

#### Tabs
```tsx
import { Tabs } from '@/components/ui';

<Tabs
  items={[
    { id: 'recipes', label: 'Recipes', content: <RecipeList /> },
    { id: 'ingredients', label: 'Ingredients', content: <IngredientList /> }
  ]}
  variant="underline"
/>
```

#### Breadcrumbs
```tsx
import { Breadcrumbs } from '@/components/ui';

<Breadcrumbs
  items={[
    { label: 'Home', href: '/' },
    { label: 'Recipes', href: '/recipes' },
    { label: 'Italian', current: true }
  ]}
/>
```

### Feedback Components

#### Alert
```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui';

<Alert variant="success" closable>
  <AlertTitle>Success!</AlertTitle>
  <AlertDescription>Recipe saved successfully.</AlertDescription>
</Alert>
```

#### Modal
```tsx
import { 
  Modal, 
  ModalHeader, 
  ModalTitle, 
  ModalBody, 
  ModalFooter 
} from '@/components/ui';

<Modal isOpen={isOpen} onClose={onClose} size="md">
  <ModalHeader>
    <ModalTitle>Confirm Delete</ModalTitle>
  </ModalHeader>
  <ModalBody>
    Are you sure you want to delete this recipe?
  </ModalBody>
  <ModalFooter>
    <Button variant="outline" onClick={onClose}>Cancel</Button>
    <Button variant="destructive" onClick={onDelete}>Delete</Button>
  </ModalFooter>
</Modal>
```

#### Toast
```tsx
import { ToastProvider, useToast } from '@/components/ui';

function App() {
  return (
    <ToastProvider position="top-right">
      <YourAppContent />
    </ToastProvider>
  );
}

function Component() {
  const { addToast } = useToast();
  
  const showSuccess = () => {
    addToast({
      variant: 'success',
      title: 'Recipe Saved!',
      description: 'Your recipe has been saved successfully.',
      duration: 3000
    });
  };
}
```

#### Loading
```tsx
import { Loading, Skeleton } from '@/components/ui';

<Loading variant="spinner" size="md" text="Loading recipes..." />
<Loading variant="dots" overlay />

<Skeleton width="100%" height={20} />
<Skeleton variant="circular" width={40} height={40} />
```

### Layout Components

#### Container
```tsx
import { Container } from '@/components/ui';

<Container size="lg" padding="md">
  Content goes here...
</Container>
```

#### Grid
```tsx
import { Grid, GridItem } from '@/components/ui';

<Grid cols={3} gap="md" responsive={{ sm: 1, md: 2, lg: 3 }}>
  <GridItem span={2}>
    Main content
  </GridItem>
  <GridItem>
    Sidebar
  </GridItem>
</Grid>
```

#### Section
```tsx
import { 
  Section, 
  SectionHeader, 
  SectionTitle, 
  SectionContent 
} from '@/components/ui';

<Section padding="lg" spacing="md">
  <SectionHeader centerText>
    <SectionTitle level={2} size="xl">Popular Recipes</SectionTitle>
  </SectionHeader>
  <SectionContent>
    Recipe grid content...
  </SectionContent>
</Section>
```

#### Flex
```tsx
import { Flex, FlexItem } from '@/components/ui';

<Flex direction="row" justify="between" align="center" gap="md">
  <FlexItem grow>
    Main content that grows
  </FlexItem>
  <FlexItem>
    Fixed sidebar
  </FlexItem>
</Flex>
```

#### Divider
```tsx
import { Divider } from '@/components/ui';

<Divider />
<Divider label="OR" labelPosition="center" />
<Divider orientation="vertical" />
```

## 🎯 Design Principles

### Accessibility
- All components follow WCAG 2.1 AA guidelines
- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management for modals and dropdowns
- Screen reader friendly

### Responsive Design
- Mobile-first approach
- Consistent breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- Flexible grid system
- Responsive typography

### Performance
- Tree-shakeable components
- Minimal bundle size
- Optimized re-renders with React.forwardRef
- Lazy loading support

### Consistency
- Unified color palette
- Consistent spacing scale
- Standardized component APIs
- Design tokens for maintainability

## 🛠️ Customization

### CSS Variables
The design system uses CSS custom properties that can be customized:

```css
:root {
  --primary: #f97316;
  --secondary: #22c55e;
  --background: #ffffff;
  --foreground: #171717;
  /* ... more variables */
}
```

### Theme Switching
Dark mode is supported through CSS classes:

```tsx
<html className="dark">
  <body>
    <App />
  </body>
</html>
```

### Component Customization
All components accept a `className` prop for custom styling:

```tsx
<Button className="custom-button-styles">
  Custom Button
</Button>
```

## 📱 Responsive Behavior

### Breakpoints
- `xs`: < 640px (mobile)
- `sm`: 640px+ (large mobile)
- `md`: 768px+ (tablet)
- `lg`: 1024px+ (desktop)
- `xl`: 1280px+ (large desktop)

### Component Responsiveness
- Grid components adapt column counts
- Navigation components collapse on mobile
- Typography scales appropriately
- Spacing adjusts for screen size

## 🧪 Testing

All components are built with testing in mind:
- Semantic HTML structure
- Proper ARIA attributes
- Predictable class names
- Accessible text alternatives

## 📖 Examples

See the complete examples in `src/components/ui/examples.tsx` for real-world usage patterns including:

- Recipe form with validation
- Recipe card grid layout
- Dashboard with sidebar navigation
- Loading states and error handling
- Toast notifications
- Modal dialogs

## 🔄 Migration Guide

When updating components:
1. Check the component props interface
2. Update any deprecated prop names
3. Test responsive behavior
4. Verify accessibility features

## 🤝 Contributing

When adding new components:
1. Follow the existing naming conventions
2. Include TypeScript interfaces
3. Add accessibility features
4. Create responsive variants
5. Write usage examples
6. Update this documentation

## 📄 License

This component library is part of the RefrigeratorRecipes project and follows the same licensing terms.