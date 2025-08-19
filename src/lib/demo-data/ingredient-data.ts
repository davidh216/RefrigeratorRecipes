import { Ingredient } from '@/types';
import { ingredientTemplates, createIngredientFromTemplate } from './ingredient-templates';

// Generate 100 ingredients from templates with some randomization
export function generateDemoIngredients(): Ingredient[] {
  const ingredients: Ingredient[] = [];
  
  // Use all templates at least once
  for (let i = 0; i < ingredientTemplates.length; i++) {
    ingredients.push(createIngredientFromTemplate(ingredientTemplates[i], i));
  }
  
  // Fill remaining slots by randomly selecting from templates
  const remainingSlots = 100 - ingredientTemplates.length;
  for (let i = 0; i < remainingSlots; i++) {
    const randomIndex = Math.floor(Math.random() * ingredientTemplates.length);
    const template = ingredientTemplates[randomIndex];
    ingredients.push(createIngredientFromTemplate(template, ingredientTemplates.length + i));
  }
  
  // Sort ingredients by category and name for better organization
  return ingredients.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });
}

// Pre-generated static ingredients for consistent demo experience
export const demoIngredients = generateDemoIngredients();