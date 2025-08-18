import { Ingredient, Recipe, MealPlan, ShoppingList, ShoppingListItem } from '@/types';

// Demo Ingredients
export const demoIngredients: Ingredient[] = [
  {
    id: 'demo-ing-1',
    name: 'Chicken Breast',
    customName: null,
    quantity: 2,
    unit: 'lbs',
    dateBought: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    location: 'fridge',
    category: 'protein',
    tags: ['organic', 'boneless'],
    notes: 'Free range chicken',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  },
  {
    id: 'demo-ing-2',
    name: 'Broccoli',
    customName: null,
    quantity: 1,
    unit: 'head',
    dateBought: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    location: 'fridge',
    category: 'vegetables',
    tags: ['fresh', 'organic'],
    notes: 'Large head',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  },
  {
    id: 'demo-ing-3',
    name: 'Brown Rice',
    customName: null,
    quantity: 2,
    unit: 'cups',
    dateBought: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    expirationDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000), // 300 days from now
    location: 'pantry',
    category: 'grains',
    tags: ['whole grain', 'organic'],
    notes: 'Long grain brown rice',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  },
  {
    id: 'demo-ing-4',
    name: 'Tomatoes',
    customName: null,
    quantity: 6,
    unit: 'pieces',
    dateBought: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    location: 'fridge',
    category: 'vegetables',
    tags: ['fresh', 'vine-ripened'],
    notes: 'Roma tomatoes',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  },
  {
    id: 'demo-ing-5',
    name: 'Onion',
    customName: null,
    quantity: 3,
    unit: 'pieces',
    dateBought: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    expirationDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    location: 'pantry',
    category: 'vegetables',
    tags: ['yellow', 'large'],
    notes: 'Yellow onions',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  },
  {
    id: 'demo-ing-6',
    name: 'Garlic',
    customName: null,
    quantity: 1,
    unit: 'head',
    dateBought: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    expirationDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
    location: 'pantry',
    category: 'vegetables',
    tags: ['fresh', 'organic'],
    notes: 'Fresh garlic head',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  },
  {
    id: 'demo-ing-7',
    name: 'Olive Oil',
    customName: null,
    quantity: 1,
    unit: 'bottle',
    dateBought: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    expirationDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000), // 300 days from now
    location: 'pantry',
    category: 'oils',
    tags: ['extra virgin', 'organic'],
    notes: 'Extra virgin olive oil',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  },
  {
    id: 'demo-ing-8',
    name: 'Eggs',
    customName: null,
    quantity: 12,
    unit: 'pieces',
    dateBought: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    location: 'fridge',
    category: 'dairy',
    tags: ['organic', 'large'],
    notes: 'Farm fresh eggs',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  },
  {
    id: 'demo-ing-9',
    name: 'Milk',
    customName: null,
    quantity: 1,
    unit: 'gallon',
    dateBought: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    location: 'fridge',
    category: 'dairy',
    tags: ['organic', 'whole'],
    notes: 'Organic whole milk',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  },
  {
    id: 'demo-ing-10',
    name: 'Bananas',
    customName: null,
    quantity: 6,
    unit: 'pieces',
    dateBought: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    expirationDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    location: 'fridge',
    category: 'fruits',
    tags: ['organic', 'ripe'],
    notes: 'Organic bananas',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  }
];

// Demo Recipes
export const demoRecipes: Recipe[] = [
  {
    id: 'demo-recipe-1',
    title: 'Grilled Chicken with Roasted Vegetables',
    description: 'A healthy and delicious meal featuring grilled chicken breast with a medley of roasted vegetables.',
    images: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'],
    difficulty: 'easy',
    cuisine: 'american',
    mealType: ['dinner', 'lunch'],
    prepTime: 15,
    cookTime: 25,
    totalTime: 40,
    restTime: 5,
    servings: 4,
    servingsNotes: 'Serves 4 adults',
    ingredients: [
      {
        id: 'demo-ing-1',
        name: 'Chicken Breast',
        amount: 2,
        unit: 'lbs',
        notes: 'boneless, skinless',
        isOptional: false,
        category: 'protein'
      },
      {
        id: 'demo-ing-2',
        name: 'Broccoli',
        amount: 1,
        unit: 'head',
        notes: 'cut into florets',
        isOptional: false,
        category: 'vegetables'
      },
      {
        name: 'Olive Oil',
        amount: 3,
        unit: 'tbsp',
        notes: 'extra virgin',
        isOptional: false,
        category: 'oils'
      },
      {
        name: 'Garlic',
        amount: 4,
        unit: 'cloves',
        notes: 'minced',
        isOptional: false,
        category: 'vegetables'
      },
      {
        name: 'Lemon',
        amount: 1,
        unit: 'piece',
        notes: 'juiced',
        isOptional: true,
        category: 'fruits'
      }
    ],
    instructions: [
      {
        step: 1,
        instruction: 'Preheat oven to 425°F (220°C).',
        timer: undefined,
        temperature: 425,
        notes: undefined
      },
      {
        step: 2,
        instruction: 'Season chicken breasts with salt, pepper, and garlic powder.',
        timer: undefined,
        temperature: undefined,
        notes: 'Let sit for 10 minutes'
      },
      {
        step: 3,
        instruction: 'Toss broccoli with olive oil, minced garlic, salt, and pepper.',
        timer: undefined,
        temperature: undefined,
        notes: undefined
      },
      {
        step: 4,
        instruction: 'Place vegetables on a baking sheet and roast for 20-25 minutes.',
        timer: 25,
        temperature: 425,
        notes: 'Until tender and slightly charred'
      },
      {
        step: 5,
        instruction: 'Grill chicken for 6-8 minutes per side until cooked through.',
        timer: 16,
        temperature: undefined,
        notes: 'Internal temperature should reach 165°F'
      },
      {
        step: 6,
        instruction: 'Let chicken rest for 5 minutes before slicing.',
        timer: 5,
        temperature: undefined,
        notes: 'This keeps the juices in'
      }
    ],
    nutrition: {
      perServing: {
        calories: 350,
        protein: 45,
        carbs: 15,
        fat: 12,
        fiber: 8,
        sugar: 4,
        sodium: 600
      },
      total: {
        calories: 1400,
        protein: 180,
        carbs: 60,
        fat: 48,
        fiber: 32,
        sugar: 16,
        sodium: 2400
      }
    },
    tags: ['healthy', 'high-protein', 'low-carb', 'gluten-free'],
    dietary: ['gluten-free', 'dairy-free'],
    ratings: {
      average: 4.5,
      count: 12,
      userRating: 5
    },
    source: {
      type: 'user-created'
    },
    sharing: {
      isPublic: true,
      sharedWith: [],
      allowComments: true,
      allowRating: true
    },
    metadata: {
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      lastCookedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      cookCount: 5,
      isFavorite: true,
      isArchived: false
    }
  },
  {
    id: 'demo-recipe-2',
    title: 'Classic Spaghetti Bolognese',
    description: 'A hearty Italian pasta dish with rich tomato sauce and ground beef.',
    images: ['https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400'],
    difficulty: 'medium',
    cuisine: 'italian',
    mealType: ['dinner'],
    prepTime: 20,
    cookTime: 45,
    totalTime: 65,
    restTime: undefined,
    servings: 6,
    servingsNotes: 'Serves 6 adults',
    ingredients: [
      {
        name: 'Ground Beef',
        amount: 1,
        unit: 'lb',
        notes: '80/20 lean',
        isOptional: false,
        category: 'protein'
      },
      {
        id: 'demo-ing-4',
        name: 'Tomatoes',
        amount: 6,
        unit: 'pieces',
        notes: 'diced',
        isOptional: false,
        category: 'vegetables'
      },
      {
        id: 'demo-ing-5',
        name: 'Onion',
        amount: 1,
        unit: 'piece',
        notes: 'finely chopped',
        isOptional: false,
        category: 'vegetables'
      },
      {
        id: 'demo-ing-6',
        name: 'Garlic',
        amount: 3,
        unit: 'cloves',
        notes: 'minced',
        isOptional: false,
        category: 'vegetables'
      },
      {
        name: 'Spaghetti',
        amount: 1,
        unit: 'lb',
        notes: 'dried pasta',
        isOptional: false,
        category: 'grains'
      },
      {
        name: 'Parmesan Cheese',
        amount: 1,
        unit: 'cup',
        notes: 'grated',
        isOptional: true,
        category: 'dairy'
      }
    ],
    instructions: [
      {
        step: 1,
        instruction: 'Bring a large pot of salted water to boil for pasta.',
        timer: null,
        temperature: null,
        notes: null
      },
      {
        step: 2,
        instruction: 'In a large skillet, brown the ground beef over medium heat.',
        timer: 8,
        temperature: null,
        notes: 'Break into small pieces'
      },
      {
        step: 3,
        instruction: 'Add chopped onion and garlic, cook until softened.',
        timer: 5,
        temperature: null,
        notes: 'About 5 minutes'
      },
      {
        step: 4,
        instruction: 'Add diced tomatoes and simmer for 30 minutes.',
        timer: 30,
        temperature: null,
        notes: 'Stir occasionally'
      },
      {
        step: 5,
        instruction: 'Cook spaghetti according to package directions.',
        timer: 10,
        temperature: null,
        notes: 'Al dente'
      },
      {
        step: 6,
        instruction: 'Serve sauce over pasta with grated parmesan.',
        timer: null,
        temperature: null,
        notes: 'Garnish with fresh basil if available'
      }
    ],
    nutrition: {
      perServing: {
        calories: 450,
        protein: 25,
        carbs: 55,
        fat: 18,
        fiber: 6,
        sugar: 8,
        sodium: 800
      },
      total: {
        calories: 2700,
        protein: 150,
        carbs: 330,
        fat: 108,
        fiber: 36,
        sugar: 48,
        sodium: 4800
      }
    },
    tags: ['classic', 'comfort-food', 'family-friendly'],
    dietary: [],
    ratings: {
      average: 4.8,
      count: 25,
      userRating: 4
    },
    source: {
      type: 'user-created'
    },
    sharing: {
      isPublic: true,
      sharedWith: [],
      allowComments: true,
      allowRating: true
    },
    metadata: {
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      lastCookedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      cookCount: 12,
      isFavorite: true,
      isArchived: false
    }
  },
  {
    id: 'demo-recipe-3',
    title: 'Quick Breakfast Smoothie Bowl',
    description: 'A nutritious and colorful smoothie bowl perfect for a healthy breakfast.',
    images: ['https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400'],
    difficulty: 'easy',
    cuisine: 'american',
    mealType: ['breakfast'],
    prepTime: 10,
    cookTime: 0,
    totalTime: 10,
    restTime: undefined,
    servings: 2,
    servingsNotes: 'Serves 2 people',
    ingredients: [
      {
        id: 'demo-ing-10',
        name: 'Bananas',
        amount: 2,
        unit: 'pieces',
        notes: 'frozen, sliced',
        isOptional: false,
        category: 'fruits'
      },
      {
        name: 'Strawberries',
        amount: 1,
        unit: 'cup',
        notes: 'frozen',
        isOptional: false,
        category: 'fruits'
      },
      {
        name: 'Greek Yogurt',
        amount: 1,
        unit: 'cup',
        notes: 'plain, non-fat',
        isOptional: false,
        category: 'dairy'
      },
      {
        name: 'Honey',
        amount: 2,
        unit: 'tbsp',
        notes: 'raw honey',
        isOptional: true,
        category: 'sweeteners'
      },
      {
        name: 'Granola',
        amount: 1,
        unit: 'cup',
        notes: 'for topping',
        isOptional: true,
        category: 'grains'
      }
    ],
    instructions: [
      {
        step: 1,
        instruction: 'Add frozen bananas, strawberries, and yogurt to blender.',
        timer: undefined,
        temperature: undefined,
        notes: undefined
      },
      {
        step: 2,
        instruction: 'Blend until smooth and creamy.',
        timer: 2,
        temperature: undefined,
        notes: 'Add honey if desired'
      },
      {
        step: 3,
        instruction: 'Pour into bowls and top with granola and fresh fruit.',
        timer: undefined,
        temperature: undefined,
        notes: 'Serve immediately'
      }
    ],
    nutrition: {
      perServing: {
        calories: 280,
        protein: 15,
        carbs: 45,
        fat: 8,
        fiber: 6,
        sugar: 32,
        sodium: 80
      },
      total: {
        calories: 560,
        protein: 30,
        carbs: 90,
        fat: 16,
        fiber: 12,
        sugar: 64,
        sodium: 160
      }
    },
    tags: ['quick', 'healthy', 'vegetarian', 'gluten-free'],
    dietary: ['vegetarian', 'gluten-free'],
    ratings: {
      average: 4.2,
      count: 8,
      userRating: 5
    },
    source: {
      type: 'user-created'
    },
    sharing: {
      isPublic: true,
      sharedWith: [],
      allowComments: true,
      allowRating: true
    },
    metadata: {
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      lastCookedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      cookCount: 3,
      isFavorite: false,
      isArchived: false
    }
  }
];

// Demo Meal Plans
export const demoMealPlans: MealPlan[] = [
  {
    id: 'demo-meal-plan-1',
    userId: 'demo-user-id',
    weekStart: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    weekEnd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    meals: [
      {
        id: 'meal-1',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        mealType: 'dinner',
        recipeId: 'demo-recipe-1',
        recipe: demoRecipes[0], // Grilled Chicken with Roasted Vegetables
        recipeTitle: 'Grilled Chicken with Roasted Vegetables',
        servings: 2,
        notes: 'Used leftover chicken'
      },
      {
        id: 'meal-2',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        mealType: 'breakfast',
        recipeId: 'demo-recipe-3',
        recipe: demoRecipes[2], // Quick Breakfast Smoothie Bowl
        recipeTitle: 'Quick Breakfast Smoothie Bowl',
        servings: 1,
        notes: 'Added extra berries'
      },
      {
        id: 'meal-3',
        date: new Date(), // Today
        mealType: 'dinner',
        recipeId: 'demo-recipe-2',
        recipe: demoRecipes[1], // Classic Spaghetti Bolognese
        recipeTitle: 'Classic Spaghetti Bolognese',
        servings: 4,
        notes: 'Family dinner'
      },
      {
        id: 'meal-4',
        date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        mealType: 'lunch',
        recipeId: 'demo-recipe-1',
        recipe: demoRecipes[0], // Grilled Chicken with Roasted Vegetables
        recipeTitle: 'Grilled Chicken with Roasted Vegetables',
        servings: 2,
        notes: 'Meal prep'
      }
    ],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  }
];

// Demo Shopping Lists
export const demoShoppingLists: ShoppingList[] = [
  {
    id: 'demo-shopping-list-1',
    userId: 'demo-user-id',
    name: 'Weekly Groceries',
    items: [
      {
        id: 'item-1',
        name: 'Ground Beef',
        totalAmount: 2,
        unit: 'lbs',
        category: 'protein',
        isPurchased: false,
        estimatedCost: 12.99,
        notes: '80/20 lean',
        sources: []
      },
      {
        id: 'item-2',
        name: 'Strawberries',
        totalAmount: 2,
        unit: 'pints',
        category: 'fruits',
        isPurchased: true,
        estimatedCost: 5.98,
        notes: 'Fresh, organic',
        sources: []
      },
      {
        id: 'item-3',
        name: 'Greek Yogurt',
        totalAmount: 1,
        unit: 'container',
        category: 'dairy',
        isPurchased: false,
        estimatedCost: 4.99,
        notes: 'Plain, non-fat',
        sources: []
      },
      {
        id: 'item-4',
        name: 'Spaghetti',
        totalAmount: 1,
        unit: 'lb',
        category: 'grains',
        isPurchased: false,
        estimatedCost: 2.49,
        notes: 'Whole wheat',
        sources: []
      },
      {
        id: 'item-5',
        name: 'Parmesan Cheese',
        totalAmount: 1,
        unit: 'block',
        category: 'dairy',
        isPurchased: true,
        estimatedCost: 6.99,
        notes: 'Freshly grated',
        sources: []
      }
    ],
    totalEstimatedCost: 33.44,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date()
  }
];

// Helper function to get demo data
export const getDemoData = () => {
  return {
    ingredients: demoIngredients,
    recipes: demoRecipes,
    mealPlans: demoMealPlans,
    shoppingLists: demoShoppingLists
  };
};
