import { Ingredient, Recipe, MealPlan, ShoppingList, ShoppingListItem } from '@/types';
import { recipeTemplates } from './demo-data/recipe-data';
import { createRecipeFromTemplate } from './demo-data/recipe-templates';
import { demoIngredients } from './demo-data/ingredient-data';

// Export the generated demo ingredients
export { demoIngredients };

// Demo Recipes - Generated from templates
export const demoRecipes: Recipe[] = recipeTemplates.map(createRecipeFromTemplate);

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
