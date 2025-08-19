// New modular demo data structure
export { recipeTemplates } from './recipe-data';
export { createRecipeFromTemplate, type RecipeTemplate } from './recipe-templates';
export { demoIngredients, generateDemoIngredients } from './ingredient-data';
export { ingredientTemplates, createIngredientFromTemplate, type IngredientTemplate } from './ingredient-templates';

// Re-export everything from the original demo-data for backward compatibility
export * from '../demo-data';