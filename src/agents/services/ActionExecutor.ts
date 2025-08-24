import { Recipe, MealPlan, Ingredient, ShoppingListItem } from '@/types';
import { QueryAnalysis } from '../types';

export interface ActionContext {
  userPreferences?: any;
  currentIngredients?: Ingredient[];
  currentRecipes?: Recipe[];
  currentMealPlan?: MealPlan;
  currentShoppingList?: ShoppingListItem[];
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  suggestions?: string[];
}

export interface ExecutableAction {
  type: 'add_recipe' | 'remove_recipe' | 'update_ingredient' | 'create_meal_plan' | 'add_to_shopping_list' | 'remove_from_shopping_list' | 'mark_ingredient_used' | 'schedule_meal';
  payload: any;
  confirmation?: string;
  reason?: string;
}

export class ActionExecutor {
  private hooks: {
    useIngredients: () => any;
    useRecipes: () => any;
    useMealPlan: () => any;
    useShoppingList: () => any;
  };

  constructor(hooks: any) {
    this.hooks = hooks;
  }

  async executeAction(action: ExecutableAction, context: ActionContext): Promise<ActionResult> {
    try {
      switch (action.type) {
        case 'add_recipe':
          return await this.addRecipe(action.payload, context);
        case 'remove_recipe':
          return await this.removeRecipe(action.payload, context);
        case 'update_ingredient':
          return await this.updateIngredient(action.payload, context);
        case 'create_meal_plan':
          return await this.createMealPlan(action.payload, context);
        case 'add_to_shopping_list':
          return await this.addToShoppingList(action.payload, context);
        case 'remove_from_shopping_list':
          return await this.removeFromShoppingList(action.payload, context);
        case 'mark_ingredient_used':
          return await this.markIngredientUsed(action.payload, context);
        case 'schedule_meal':
          return await this.scheduleMeal(action.payload, context);
        default:
          return {
            success: false,
            message: `Unknown action type: ${action.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Action execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async addRecipe(payload: { recipe: Recipe; toMealPlan?: boolean; date?: string }, context: ActionContext): Promise<ActionResult> {
    const { recipe, toMealPlan, date } = payload;

    if (toMealPlan && date) {
      // Add recipe to meal plan for specific date
      const mealPlanHooks = this.hooks.useMealPlan();
      if (mealPlanHooks?.addRecipeToMealPlan) {
        await mealPlanHooks.addRecipeToMealPlan(recipe.id, date);
        
        // Generate shopping list items for missing ingredients
        const missingIngredients = await this.findMissingIngredients(recipe, context);
        if (missingIngredients.length > 0) {
          const shoppingHooks = this.hooks.useShoppingList();
          if (shoppingHooks?.addItems) {
            await shoppingHooks.addItems(missingIngredients);
          }
        }

        return {
          success: true,
          message: `Added "${recipe.name}" to your meal plan for ${date}`,
          data: { recipe, date, missingIngredients },
          suggestions: missingIngredients.length > 0 
            ? [`I've added ${missingIngredients.length} missing ingredients to your shopping list`]
            : ['You have all ingredients needed for this recipe!']
        };
      }
    } else {
      // Add recipe to saved recipes
      const recipeHooks = this.hooks.useRecipes();
      if (recipeHooks?.addRecipe) {
        await recipeHooks.addRecipe(recipe);
        return {
          success: true,
          message: `Saved "${recipe.name}" to your recipes`,
          data: { recipe },
          suggestions: ['Would you like to add this to your meal plan as well?']
        };
      }
    }

    return {
      success: false,
      message: 'Unable to add recipe - hook not available'
    };
  }

  private async removeRecipe(payload: { recipeId: string; fromMealPlan?: boolean; date?: string }, context: ActionContext): Promise<ActionResult> {
    const { recipeId, fromMealPlan, date } = payload;

    if (fromMealPlan && date) {
      const mealPlanHooks = this.hooks.useMealPlan();
      if (mealPlanHooks?.removeRecipeFromMealPlan) {
        await mealPlanHooks.removeRecipeFromMealPlan(recipeId, date);
        return {
          success: true,
          message: `Removed recipe from meal plan for ${date}`,
          suggestions: ['Should I remove related ingredients from your shopping list too?']
        };
      }
    } else {
      const recipeHooks = this.hooks.useRecipes();
      if (recipeHooks?.removeRecipe) {
        await recipeHooks.removeRecipe(recipeId);
        return {
          success: true,
          message: 'Recipe removed from your collection'
        };
      }
    }

    return {
      success: false,
      message: 'Unable to remove recipe - hook not available'
    };
  }

  private async updateIngredient(payload: { ingredientId: string; updates: Partial<Ingredient> }, context: ActionContext): Promise<ActionResult> {
    const { ingredientId, updates } = payload;
    
    const ingredientHooks = this.hooks.useIngredients();
    if (ingredientHooks?.updateIngredient) {
      await ingredientHooks.updateIngredient(ingredientId, updates);
      
      const updateSummary = Object.keys(updates).map(key => {
        if (key === 'quantity') return `quantity to ${updates.quantity}`;
        if (key === 'expirationDate') return `expiration date to ${updates.expirationDate}`;
        if (key === 'location') return `location to ${updates.location}`;
        return `${key}`;
      }).join(', ');

      return {
        success: true,
        message: `Updated ingredient ${updateSummary}`,
        data: { ingredientId, updates },
        suggestions: updates.quantity === 0 
          ? ['Should I remove this ingredient from your inventory?']
          : []
      };
    }

    return {
      success: false,
      message: 'Unable to update ingredient - hook not available'
    };
  }

  private async createMealPlan(payload: { meals: Array<{ date: string; recipeId: string; mealType?: 'breakfast' | 'lunch' | 'dinner' }> }, context: ActionContext): Promise<ActionResult> {
    const { meals } = payload;
    
    const mealPlanHooks = this.hooks.useMealPlan();
    if (mealPlanHooks?.createMealPlan) {
      await mealPlanHooks.createMealPlan(meals);
      
      // Generate comprehensive shopping list
      const allMissingIngredients: ShoppingListItem[] = [];
      for (const meal of meals) {
        const recipe = context.currentRecipes?.find(r => r.id === meal.recipeId);
        if (recipe) {
          const missing = await this.findMissingIngredients(recipe, context);
          allMissingIngredients.push(...missing);
        }
      }

      // Add to shopping list
      if (allMissingIngredients.length > 0) {
        const shoppingHooks = this.hooks.useShoppingList();
        if (shoppingHooks?.addItems) {
          await shoppingHooks.addItems(allMissingIngredients);
        }
      }

      return {
        success: true,
        message: `Created meal plan with ${meals.length} meals`,
        data: { meals, shoppingItems: allMissingIngredients },
        suggestions: [
          `Added ${allMissingIngredients.length} items to your shopping list`,
          'Would you like me to organize your shopping list by store section?'
        ]
      };
    }

    return {
      success: false,
      message: 'Unable to create meal plan - hook not available'
    };
  }

  private async addToShoppingList(payload: { items: ShoppingListItem[] }, context: ActionContext): Promise<ActionResult> {
    const { items } = payload;
    
    const shoppingHooks = this.hooks.useShoppingList();
    if (shoppingHooks?.addItems) {
      await shoppingHooks.addItems(items);
      return {
        success: true,
        message: `Added ${items.length} item${items.length > 1 ? 's' : ''} to your shopping list`,
        data: { items },
        suggestions: ['I can help organize your shopping list by store section if you\'d like']
      };
    }

    return {
      success: false,
      message: 'Unable to add to shopping list - hook not available'
    };
  }

  private async removeFromShoppingList(payload: { itemIds: string[] }, context: ActionContext): Promise<ActionResult> {
    const { itemIds } = payload;
    
    const shoppingHooks = this.hooks.useShoppingList();
    if (shoppingHooks?.removeItems) {
      await shoppingHooks.removeItems(itemIds);
      return {
        success: true,
        message: `Removed ${itemIds.length} item${itemIds.length > 1 ? 's' : ''} from your shopping list`,
        data: { itemIds }
      };
    }

    return {
      success: false,
      message: 'Unable to remove from shopping list - hook not available'
    };
  }

  private async markIngredientUsed(payload: { ingredientId: string; amountUsed: number; unit?: string }, context: ActionContext): Promise<ActionResult> {
    const { ingredientId, amountUsed, unit } = payload;
    
    const ingredientHooks = this.hooks.useIngredients();
    if (ingredientHooks?.updateIngredient) {
      const currentIngredient = context.currentIngredients?.find(i => i.id === ingredientId);
      if (currentIngredient) {
        const newQuantity = Math.max(0, currentIngredient.quantity - amountUsed);
        await ingredientHooks.updateIngredient(ingredientId, { quantity: newQuantity });
        
        return {
          success: true,
          message: `Marked ${amountUsed} ${unit || 'units'} of ${currentIngredient.name} as used`,
          data: { ingredientId, amountUsed, newQuantity },
          suggestions: newQuantity === 0 
            ? ['This ingredient is now empty. Should I add it to your shopping list?']
            : newQuantity < (currentIngredient.quantity * 0.2) 
              ? ['This ingredient is running low. Consider adding it to your shopping list.']
              : []
        };
      }
    }

    return {
      success: false,
      message: 'Unable to mark ingredient as used - ingredient not found or hook not available'
    };
  }

  private async scheduleMeal(payload: { recipeId: string; date: string; mealType: 'breakfast' | 'lunch' | 'dinner' }, context: ActionContext): Promise<ActionResult> {
    const { recipeId, date, mealType } = payload;
    
    const mealPlanHooks = this.hooks.useMealPlan();
    if (mealPlanHooks?.scheduleMeal) {
      await mealPlanHooks.scheduleMeal(recipeId, date, mealType);
      
      const recipe = context.currentRecipes?.find(r => r.id === recipeId);
      const recipeName = recipe?.name || 'recipe';
      
      return {
        success: true,
        message: `Scheduled ${recipeName} for ${mealType} on ${date}`,
        data: { recipeId, date, mealType },
        suggestions: ['Would you like me to check if you have all the ingredients needed?']
      };
    }

    return {
      success: false,
      message: 'Unable to schedule meal - hook not available'
    };
  }

  private async findMissingIngredients(recipe: Recipe, context: ActionContext): Promise<ShoppingListItem[]> {
    const currentIngredients = context.currentIngredients || [];
    const missingIngredients: ShoppingListItem[] = [];

    for (const recipeIngredient of recipe.ingredients) {
      const existing = currentIngredients.find(
        ing => ing.name.toLowerCase() === recipeIngredient.name.toLowerCase()
      );

      if (!existing || existing.quantity < recipeIngredient.quantity) {
        const neededQuantity = recipeIngredient.quantity - (existing?.quantity || 0);
        missingIngredients.push({
          id: `missing-${recipeIngredient.name}-${Date.now()}`,
          name: recipeIngredient.name,
          quantity: neededQuantity,
          unit: recipeIngredient.unit,
          category: this.categorizeIngredient(recipeIngredient.name),
          priority: existing ? 'medium' : 'high',
          recipeContext: recipe.name
        } as ShoppingListItem);
      }
    }

    return missingIngredients;
  }

  private categorizeIngredient(ingredientName: string): string {
    const name = ingredientName.toLowerCase();
    
    if (name.includes('meat') || name.includes('chicken') || name.includes('beef') || name.includes('pork')) {
      return 'meat';
    } else if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt') || name.includes('butter')) {
      return 'dairy';
    } else if (name.includes('apple') || name.includes('banana') || name.includes('orange') || name.includes('berry')) {
      return 'produce';
    } else if (name.includes('bread') || name.includes('pasta') || name.includes('rice')) {
      return 'grains';
    }
    
    return 'other';
  }

  async planActions(query: QueryAnalysis, context: ActionContext): Promise<ExecutableAction[]> {
    const actions: ExecutableAction[] = [];
    
    // Action planning based on query intent and patterns
    if (query.intent === 'meal_planning' && query.patterns.includes('add_to_plan')) {
      const recipeKeywords = query.entities.filter(e => e.type === 'recipe');
      const dateKeywords = query.entities.filter(e => e.type === 'date');
      
      if (recipeKeywords.length > 0 && dateKeywords.length > 0) {
        const recipe = context.currentRecipes?.find(r => 
          r.name.toLowerCase().includes(recipeKeywords[0].value.toLowerCase())
        );
        
        if (recipe) {
          actions.push({
            type: 'add_recipe',
            payload: { 
              recipe, 
              toMealPlan: true, 
              date: dateKeywords[0].value 
            },
            confirmation: `Add "${recipe.name}" to meal plan for ${dateKeywords[0].value}?`,
            reason: 'Recipe matches your request and date specified'
          });
        }
      }
    }

    if (query.intent === 'ingredient_management' && query.patterns.includes('mark_used')) {
      const ingredientKeywords = query.entities.filter(e => e.type === 'ingredient');
      const quantityKeywords = query.entities.filter(e => e.type === 'quantity');
      
      if (ingredientKeywords.length > 0) {
        const ingredient = context.currentIngredients?.find(i => 
          i.name.toLowerCase().includes(ingredientKeywords[0].value.toLowerCase())
        );
        
        if (ingredient) {
          const amountUsed = quantityKeywords.length > 0 ? 
            parseFloat(quantityKeywords[0].value) : 1;
          
          actions.push({
            type: 'mark_ingredient_used',
            payload: { 
              ingredientId: ingredient.id, 
              amountUsed 
            },
            confirmation: `Mark ${amountUsed} units of ${ingredient.name} as used?`,
            reason: 'Ingredient usage tracking requested'
          });
        }
      }
    }

    return actions;
  }
}