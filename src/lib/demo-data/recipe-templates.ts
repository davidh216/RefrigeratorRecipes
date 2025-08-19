import { Recipe } from '@/types';

// Recipe data templates for easier generation
export interface RecipeTemplate {
  id: string;
  title: string;
  description: string;
  image: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine: string;
  mealType: string[];
  prepTime: number;
  cookTime: number;
  totalTime: number;
  restTime?: number;
  servings: number;
  servingsNotes: string;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
    notes?: string;
    isOptional?: boolean;
    category: string;
  }>;
  instructions: Array<{
    step: number;
    instruction: string;
    timer?: number;
    temperature?: number;
    notes?: string;
  }>;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
  tags: string[];
  dietary: string[];
  ratings: {
    average: number;
    count: number;
    userRating?: number;
  };
  isFavorite?: boolean;
  cookCount?: number;
  lastCookedDays?: number;
  createdDays?: number;
}

// Helper function to convert template to full recipe
export const createRecipeFromTemplate = (template: RecipeTemplate): Recipe => {
  const now = Date.now();
  const createdAt = new Date(now - (template.createdDays || 30) * 24 * 60 * 60 * 1000);
  const lastCookedAt = template.lastCookedDays 
    ? new Date(now - template.lastCookedDays * 24 * 60 * 60 * 1000)
    : undefined;

  return {
    id: template.id,
    title: template.title,
    description: template.description,
    images: [template.image],
    difficulty: template.difficulty,
    cuisine: template.cuisine,
    mealType: template.mealType,
    prepTime: template.prepTime,
    cookTime: template.cookTime,
    totalTime: template.totalTime,
    restTime: template.restTime || 0,
    servings: template.servings,
    servingsNotes: template.servingsNotes,
    ingredients: template.ingredients.map(ing => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      notes: ing.notes,
      isOptional: ing.isOptional || false,
      category: ing.category,
    })),
    instructions: template.instructions.map(inst => ({
      step: inst.step,
      instruction: inst.instruction,
      timer: inst.timer,
      temperature: inst.temperature,
      notes: inst.notes,
    })),
    nutrition: {
      perServing: template.nutrition,
      total: {
        calories: template.nutrition.calories * template.servings,
        protein: template.nutrition.protein * template.servings,
        carbs: template.nutrition.carbs * template.servings,
        fat: template.nutrition.fat * template.servings,
        fiber: template.nutrition.fiber * template.servings,
        sugar: template.nutrition.sugar * template.servings,
        sodium: template.nutrition.sodium * template.servings,
      }
    },
    tags: template.tags,
    dietary: template.dietary,
    ratings: template.ratings,
    source: { type: 'user-created' },
    sharing: { isPublic: true, sharedWith: [], allowComments: true, allowRating: true },
    metadata: {
      createdAt,
      updatedAt: new Date(),
      lastCookedAt,
      cookCount: template.cookCount || 0,
      isFavorite: template.isFavorite || false,
      isArchived: false,
    }
  };
};