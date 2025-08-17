/**
 * RefrigeratorRecipes UI Component Library Examples
 * 
 * This file demonstrates how to use all the components in the design system.
 * Each example shows common usage patterns and best practices.
 */

import React from 'react';
import {
  // Form Components
  Button,
  Input,
  Select,
  Checkbox,
  Radio,
  RadioGroup,
  DatePicker,
  Textarea,
  
  // Data Display Components
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Avatar,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  List,
  ListItem,
  
  // Navigation Components
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  Breadcrumbs,
  Tabs,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  
  // Feedback Components
  Alert,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Loading,
  Skeleton,
  Toast,
  ToastProvider,
  useToast,
  
  // Layout Components
  Container,
  Grid,
  GridItem,
  Section,
  SectionHeader,
  SectionTitle,
  SectionSubtitle,
  SectionContent,
  Divider,
  Flex,
  FlexItem,
} from './index';

// Example: Recipe Form Component
export const RecipeFormExample: React.FC = () => {
  const [formData, setFormData] = React.useState({
    title: '',
    difficulty: '',
    prepTime: '',
    description: '',
    tags: [] as string[],
  });

  return (
    <Container size="md">
      <Card>
        <CardHeader>
          <CardTitle>Add New Recipe</CardTitle>
          <CardDescription>
            Create a delicious recipe to share with the community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <Input
              label="Recipe Title"
              placeholder="Enter recipe title..."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
            
            <Grid cols={2} gap="md">
              <GridItem>
                <Select
                  label="Difficulty Level"
                  placeholder="Select difficulty"
                  options={[
                    { value: 'easy', label: 'Easy' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'hard', label: 'Hard' },
                  ]}
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                />
              </GridItem>
              <GridItem>
                <DatePicker
                  label="Prep Time"
                  value={formData.prepTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, prepTime: e.target.value }))}
                />
              </GridItem>
            </Grid>

            <Textarea
              label="Description"
              placeholder="Describe your recipe..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
            />

            <div>
              <label className="text-sm font-medium mb-3 block">Recipe Tags</label>
              <Flex gap="sm" wrap="wrap">
                {['Quick', 'Healthy', 'Vegetarian', 'Gluten-Free', 'Dairy-Free'].map((tag) => (
                  <Checkbox
                    key={tag}
                    label={tag}
                    checked={formData.tags.includes(tag)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
                      } else {
                        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
                      }
                    }}
                  />
                ))}
              </Flex>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Flex justify="between" className="w-full">
            <Button variant="outline">Cancel</Button>
            <Button variant="primary">Save Recipe</Button>
          </Flex>
        </CardFooter>
      </Card>
    </Container>
  );
};

// Example: Recipe Card Grid
export const RecipeGridExample: React.FC = () => {
  const recipes = [
    {
      id: '1',
      title: 'Spaghetti Carbonara',
      description: 'A classic Italian pasta dish with eggs, cheese, and pancetta.',
      difficulty: 'medium',
      prepTime: 30,
      imageUrl: '/recipe-1.jpg',
      tags: ['Italian', 'Pasta', 'Quick'],
    },
    {
      id: '2',
      title: 'Chicken Tikka Masala',
      description: 'Creamy tomato-based curry with marinated chicken pieces.',
      difficulty: 'hard',
      prepTime: 60,
      imageUrl: '/recipe-2.jpg',
      tags: ['Indian', 'Curry', 'Spicy'],
    },
    {
      id: '3',
      title: 'Caesar Salad',
      description: 'Fresh romaine lettuce with parmesan and croutons.',
      difficulty: 'easy',
      prepTime: 15,
      imageUrl: '/recipe-3.jpg',
      tags: ['Salad', 'Healthy', 'Quick'],
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container size="xl">
      <Section>
        <SectionHeader centerText>
          <SectionTitle level={2} size="3xl">
            Popular Recipes
          </SectionTitle>
          <SectionSubtitle size="lg">
            Discover delicious recipes from our community
          </SectionSubtitle>
        </SectionHeader>
        
        <Grid cols={3} gap="lg" responsive={{ sm: 1, md: 2, lg: 3 }}>
          {recipes.map((recipe) => (
            <GridItem key={recipe.id}>
              <Card hover className="h-full">
                <div className="aspect-video bg-muted rounded-t-lg" />
                <CardContent padding="md">
                  <Flex justify="between" align="start" className="mb-2">
                    <Badge variant={getDifficultyColor(recipe.difficulty) as any}>
                      {recipe.difficulty}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {recipe.prepTime} min
                    </span>
                  </Flex>
                  
                  <h3 className="font-semibold text-lg mb-2">{recipe.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {recipe.description}
                  </p>
                  
                  <Flex gap="xs" wrap="wrap">
                    {recipe.tags.map((tag) => (
                      <Badge key={tag} variant="outline" size="xs">
                        {tag}
                      </Badge>
                    ))}
                  </Flex>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Recipe
                  </Button>
                </CardFooter>
              </Card>
            </GridItem>
          ))}
        </Grid>
      </Section>
    </Container>
  );
};

// Example: Navigation Layout
export const NavigationExample: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('recipes');

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Recipes', href: '/recipes' },
    { label: 'Italian', href: '/recipes/italian', current: true },
  ];

  const tabItems = [
    { id: 'recipes', label: 'Recipes', content: <div>Recipe content</div> },
    { id: 'ingredients', label: 'Ingredients', content: <div>Ingredients content</div> },
    { id: 'favorites', label: 'Favorites', content: <div>Favorites content</div> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar position="sticky">
        <NavbarBrand href="/">
          <span className="text-primary">🍳</span>
          RefrigeratorRecipes
        </NavbarBrand>
        
        <NavbarContent className="hidden md:flex" justify="center">
          <NavbarItem href="/recipes">Recipes</NavbarItem>
          <NavbarItem href="/ingredients">Ingredients</NavbarItem>
          <NavbarItem href="/meal-plans">Meal Plans</NavbarItem>
          <NavbarItem href="/about">About</NavbarItem>
        </NavbarContent>
        
        <NavbarContent justify="end">
          <Button variant="outline" size="sm" className="hidden md:inline-flex">
            Sign In
          </Button>
          <Button size="sm" className="hidden md:inline-flex">
            Sign Up
          </Button>
          <NavbarMenuToggle
            isOpen={isMobileMenuOpen}
            onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </NavbarContent>
        
        <NavbarMenu isOpen={isMobileMenuOpen}>
          <NavbarItem href="/recipes">Recipes</NavbarItem>
          <NavbarItem href="/ingredients">Ingredients</NavbarItem>
          <NavbarItem href="/meal-plans">Meal Plans</NavbarItem>
          <NavbarItem href="/about">About</NavbarItem>
        </NavbarMenu>
      </Navbar>

      <Container size="xl">
        <div className="py-6">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
        
        <Tabs
          items={tabItems}
          value={activeTab}
          onValueChange={setActiveTab}
          variant="underline"
        />
      </Container>
    </div>
  );
};

// Example: Loading States
export const LoadingStatesExample: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(false);

  return (
    <Container size="md">
      <Section spacing="lg">
        <SectionHeader>
          <SectionTitle level={2}>Loading States</SectionTitle>
        </SectionHeader>
        
        <Grid cols={2} gap="lg">
          <GridItem>
            <Card>
              <CardHeader>
                <CardTitle>Loading Spinners</CardTitle>
              </CardHeader>
              <CardContent>
                <Flex direction="col" gap="md">
                  <Loading variant="spinner" size="sm" text="Loading..." />
                  <Loading variant="dots" size="md" />
                  <Loading variant="pulse" size="lg" />
                </Flex>
              </CardContent>
            </Card>
          </GridItem>
          
          <GridItem>
            <Card>
              <CardHeader>
                <CardTitle>Skeleton Loading</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Flex gap="md" align="center">
                    <Skeleton variant="circular" width={40} height={40} />
                    <div className="flex-1 space-y-2">
                      <Skeleton height={16} width="60%" />
                      <Skeleton height={14} width="40%" />
                    </div>
                  </Flex>
                  <Skeleton height={100} />
                </div>
              </CardContent>
            </Card>
          </GridItem>
        </Grid>

        <Button
          onClick={() => setIsLoading(!isLoading)}
          loading={isLoading}
        >
          {isLoading ? 'Loading...' : 'Start Loading'}
        </Button>
      </Section>
    </Container>
  );
};

// Example: Alert Messages
export const AlertExample: React.FC = () => {
  return (
    <Container size="md">
      <Section spacing="md">
        <SectionHeader>
          <SectionTitle level={2}>Alert Messages</SectionTitle>
        </SectionHeader>
        
        <div className="space-y-4">
          <Alert variant="success" closable>
            <AlertTitle>Recipe Saved Successfully!</AlertTitle>
            <AlertDescription>
              Your delicious recipe has been added to your collection.
            </AlertDescription>
          </Alert>
          
          <Alert variant="warning">
            <AlertTitle>Missing Ingredients</AlertTitle>
            <AlertDescription>
              You're missing 2 ingredients for this recipe. Check your refrigerator!
            </AlertDescription>
          </Alert>
          
          <Alert variant="error" closable>
            <AlertTitle>Upload Failed</AlertTitle>
            <AlertDescription>
              Failed to upload recipe image. Please try again.
            </AlertDescription>
          </Alert>
          
          <Alert variant="info">
            <AlertTitle>Pro Tip</AlertTitle>
            <AlertDescription>
              Add your ingredients to get personalized recipe recommendations.
            </AlertDescription>
          </Alert>
        </div>
      </Section>
    </Container>
  );
};

// Example: Complete Dashboard Layout
export const DashboardExample: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  
  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        collapsible
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        width="md"
      >
        <SidebarHeader>
          <Avatar src="/logo.png" fallback="RR" />
          {!sidebarCollapsed && (
            <div>
              <h3 className="font-semibold">RefrigeratorRecipes</h3>
              <p className="text-sm text-muted-foreground">Dashboard</p>
            </div>
          )}
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem
              icon={<span>🏠</span>}
              active
            >
              Dashboard
            </SidebarMenuItem>
            <SidebarMenuItem
              icon={<span>🍳</span>}
              badge={<Badge size="xs">12</Badge>}
            >
              My Recipes
            </SidebarMenuItem>
            <SidebarMenuItem
              icon={<span>🥕</span>}
            >
              Ingredients
            </SidebarMenuItem>
            <SidebarMenuItem
              icon={<span>📅</span>}
            >
              Meal Plans
            </SidebarMenuItem>
            <SidebarMenuItem
              icon={<span>❤️</span>}
            >
              Favorites
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Container size="full">
            <Section>
              <SectionHeader>
                <SectionTitle level={1} size="2xl">
                  Welcome back, Chef! 👨‍🍳
                </SectionTitle>
                <SectionSubtitle>
                  Here's what's cooking in your kitchen today
                </SectionSubtitle>
              </SectionHeader>
              
              <Grid cols={4} gap="md" responsive={{ sm: 1, md: 2, lg: 4 }}>
                <GridItem>
                  <Card>
                    <CardContent padding="md">
                      <Flex justify="between" align="center">
                        <div>
                          <p className="text-2xl font-bold">24</p>
                          <p className="text-sm text-muted-foreground">Total Recipes</p>
                        </div>
                        <span className="text-2xl">🍳</span>
                      </Flex>
                    </CardContent>
                  </Card>
                </GridItem>
                
                <GridItem>
                  <Card>
                    <CardContent padding="md">
                      <Flex justify="between" align="center">
                        <div>
                          <p className="text-2xl font-bold">12</p>
                          <p className="text-sm text-muted-foreground">Ingredients</p>
                        </div>
                        <span className="text-2xl">🥕</span>
                      </Flex>
                    </CardContent>
                  </Card>
                </GridItem>
                
                <GridItem>
                  <Card>
                    <CardContent padding="md">
                      <Flex justify="between" align="center">
                        <div>
                          <p className="text-2xl font-bold">8</p>
                          <p className="text-sm text-muted-foreground">Favorites</p>
                        </div>
                        <span className="text-2xl">❤️</span>
                      </Flex>
                    </CardContent>
                  </Card>
                </GridItem>
                
                <GridItem>
                  <Card>
                    <CardContent padding="md">
                      <Flex justify="between" align="center">
                        <div>
                          <p className="text-2xl font-bold">3</p>
                          <p className="text-sm text-muted-foreground">Meal Plans</p>
                        </div>
                        <span className="text-2xl">📅</span>
                      </Flex>
                    </CardContent>
                  </Card>
                </GridItem>
              </Grid>
            </Section>
          </Container>
        </div>
      </main>
    </div>
  );
};

// Toast Provider Example
export const ToastExample: React.FC = () => {
  const { addToast } = useToast();

  const showToast = (variant: 'success' | 'error' | 'warning' | 'info') => {
    addToast({
      variant,
      title: `${variant.charAt(0).toUpperCase() + variant.slice(1)} Toast`,
      description: `This is a ${variant} toast message!`,
      duration: 3000,
    });
  };

  return (
    <Container size="md">
      <Section>
        <SectionHeader centerText>
          <SectionTitle level={2}>Toast Notifications</SectionTitle>
        </SectionHeader>
        
        <Flex gap="md" justify="center" wrap="wrap">
          <Button variant="outline" onClick={() => showToast('success')}>
            Success Toast
          </Button>
          <Button variant="outline" onClick={() => showToast('error')}>
            Error Toast
          </Button>
          <Button variant="outline" onClick={() => showToast('warning')}>
            Warning Toast
          </Button>
          <Button variant="outline" onClick={() => showToast('info')}>
            Info Toast
          </Button>
        </Flex>
      </Section>
    </Container>
  );
};

// Main Example App Component
export const ExampleApp: React.FC = () => {
  return (
    <ToastProvider position="top-right">
      <div className="min-h-screen bg-background">
        <DashboardExample />
        
        <Divider label="Form Examples" />
        <RecipeFormExample />
        
        <Divider label="Grid Examples" />
        <RecipeGridExample />
        
        <Divider label="Loading Examples" />
        <LoadingStatesExample />
        
        <Divider label="Alert Examples" />
        <AlertExample />
        
        <Divider label="Toast Examples" />
        <ToastExample />
      </div>
    </ToastProvider>
  );
};