/**
 * Enhanced Recipe Service for Intelligent Recipe Recommendations
 * 
 * Provides hybrid recipe recommendations from both saved recipes and online sources.
 * Integrates with existing recipe storage while providing fallback to online recipe APIs.
 */

import { Recipe, Ingredient } from '@/types';

export interface OnlineRecipe {
  id: string;
  title: string;
  description: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
  instructions: string[];
  cuisineType?: string;
  dishType?: string;
  sourceUrl?: string;
  sourceName?: string;
}

export interface EnhancedRecipeResult {
  savedRecipes: Recipe[];
  onlineRecipes: OnlineRecipe[];
  totalFound: number;
  searchStrategy: 'saved-only' | 'online-only' | 'hybrid';
  ingredientCoverage: number;
}

export interface RecipeSearchOptions {
  maxResults?: number;
  preferSaved?: boolean;
  includePartialMatches?: boolean;
  cuisineType?: string;
  maxCookTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export class EnhancedRecipeService {
  private readonly SPOONACULAR_API_KEY = process.env.NEXT_PUBLIC_SPOONACULAR_API_KEY;
  private readonly EDAMAM_APP_ID = process.env.NEXT_PUBLIC_EDAMAM_APP_ID;
  private readonly EDAMAM_API_KEY = process.env.NEXT_PUBLIC_EDAMAM_API_KEY;
  
  constructor(
    private savedRecipes: Recipe[] = [],
    private availableIngredients: Ingredient[] = []
  ) {}

  /**
   * Main method to find recipes using hybrid approach
   */
  async findRecipesWithIngredients(
    ingredients: string[],
    options: RecipeSearchOptions = {}
  ): Promise<EnhancedRecipeResult> {
    const {
      maxResults = 6,
      preferSaved = true,
      includePartialMatches = true,
      cuisineType,
      maxCookTime,
      difficulty
    } = options;

    // Step 1: Search saved recipes first
    const savedMatches = this.searchSavedRecipes(ingredients, {
      includePartialMatches,
      cuisineType,
      maxCookTime,
      difficulty
    });

    let onlineRecipes: OnlineRecipe[] = [];
    let searchStrategy: 'saved-only' | 'online-only' | 'hybrid' = 'saved-only';

    // Step 2: Determine if we need online recipes
    const needsOnlineSearch = 
      !preferSaved || 
      savedMatches.length < maxResults || 
      savedMatches.length === 0;

    if (needsOnlineSearch) {
      try {
        onlineRecipes = await this.searchOnlineRecipes(ingredients, {
          maxResults: maxResults - savedMatches.length,
          cuisineType,
          maxCookTime,
          difficulty
        });
        
        searchStrategy = savedMatches.length > 0 ? 'hybrid' : 'online-only';
      } catch (error) {
        console.warn('Online recipe search failed, using saved recipes only:', error);
        searchStrategy = 'saved-only';
      }
    }

    // Step 3: Calculate ingredient coverage
    const allFoundRecipes = [...savedMatches, ...onlineRecipes];
    const ingredientCoverage = this.calculateIngredientCoverage(ingredients, allFoundRecipes);

    return {
      savedRecipes: savedMatches.slice(0, maxResults),
      onlineRecipes: onlineRecipes.slice(0, maxResults - Math.min(savedMatches.length, maxResults)),
      totalFound: savedMatches.length + onlineRecipes.length,
      searchStrategy,
      ingredientCoverage
    };
  }

  /**
   * Search through saved/user recipes
   */
  private searchSavedRecipes(
    targetIngredients: string[],
    options: {
      includePartialMatches?: boolean;
      cuisineType?: string;
      maxCookTime?: number;
      difficulty?: string;
    }
  ): Recipe[] {
    if (!this.savedRecipes || this.savedRecipes.length === 0) {
      return [];
    }

    const targetIngredientsLower = targetIngredients.map(i => i.toLowerCase());
    const matches: Array<{ recipe: Recipe; score: number }> = [];

    for (const recipe of this.savedRecipes) {
      // Filter by criteria
      if (options.cuisineType && recipe.cuisineType !== options.cuisineType) continue;
      if (options.maxCookTime && recipe.cookTime > options.maxCookTime) continue;
      if (options.difficulty && recipe.difficulty !== options.difficulty) continue;

      const recipeIngredients = recipe.ingredients.map(i => i.name.toLowerCase());
      const matchingCount = recipeIngredients.filter(ingredient => 
        targetIngredientsLower.includes(ingredient)
      ).length;

      const matchPercentage = matchingCount / recipeIngredients.length;
      
      // Perfect matches (can make with available ingredients)
      if (matchPercentage === 1) {
        matches.push({ recipe, score: matchPercentage + 1 }); // Boost perfect matches
      } 
      // Partial matches (need a few more ingredients)
      else if (options.includePartialMatches && matchPercentage >= 0.6) {
        matches.push({ recipe, score: matchPercentage });
      }
    }

    // Sort by score (perfect matches first, then by percentage)
    return matches
      .sort((a, b) => b.score - a.score)
      .map(match => match.recipe);
  }

  /**
   * Search online recipe APIs
   */
  private async searchOnlineRecipes(
    ingredients: string[],
    options: {
      maxResults?: number;
      cuisineType?: string;
      maxCookTime?: number;
      difficulty?: string;
    }
  ): Promise<OnlineRecipe[]> {
    const { maxResults = 6 } = options;
    
    // Try Spoonacular first (if API key available)
    if (this.SPOONACULAR_API_KEY) {
      try {
        return await this.searchSpoonacular(ingredients, options);
      } catch (error) {
        console.warn('Spoonacular search failed, trying Edamam:', error);
      }
    }

    // Try Edamam as fallback (if API keys available)
    if (this.EDAMAM_APP_ID && this.EDAMAM_API_KEY) {
      try {
        return await this.searchEdamam(ingredients, options);
      } catch (error) {
        console.warn('Edamam search failed:', error);
      }
    }

    // If no API keys or all APIs fail, return mock recipes for development
    return this.getMockRecipes(ingredients, maxResults);
  }

  /**
   * Search Spoonacular API
   */
  private async searchSpoonacular(
    ingredients: string[],
    options: any
  ): Promise<OnlineRecipe[]> {
    const ingredientQuery = ingredients.join(',');
    const params = new URLSearchParams({
      apiKey: this.SPOONACULAR_API_KEY!,
      ingredients: ingredientQuery,
      number: options.maxResults?.toString() || '6',
      ranking: '2', // Maximize used ingredients
      ignorePantry: 'true'
    });

    if (options.cuisineType) params.append('cuisine', options.cuisineType);
    if (options.maxCookTime) params.append('maxReadyTime', options.maxCookTime.toString());

    const response = await fetch(
      `https://api.spoonacular.com/recipes/findByIngredients?${params}`
    );

    if (!response.ok) {
      throw new Error(`Spoonacular API error: ${response.status}`);
    }

    const recipes = await response.json();
    return recipes.map((recipe: any) => this.transformSpoonacularRecipe(recipe));
  }

  /**
   * Search Edamam API
   */
  private async searchEdamam(
    ingredients: string[],
    options: any
  ): Promise<OnlineRecipe[]> {
    const query = ingredients.join(' ');
    const params = new URLSearchParams({
      app_id: this.EDAMAM_APP_ID!,
      app_key: this.EDAMAM_API_KEY!,
      q: query,
      type: 'public',
      to: options.maxResults?.toString() || '6'
    });

    if (options.cuisineType) params.append('cuisineType', options.cuisineType);
    if (options.maxCookTime) params.append('time', `1-${options.maxCookTime}`);

    const response = await fetch(
      `https://api.edamam.com/search?${params}`
    );

    if (!response.ok) {
      throw new Error(`Edamam API error: ${response.status}`);
    }

    const data = await response.json();
    return data.hits.map((hit: any) => this.transformEdamamRecipe(hit.recipe));
  }

  /**
   * Get mock recipes for development (when no API keys)
   */
  private getMockRecipes(ingredients: string[], maxResults: number): OnlineRecipe[] {
    const mockRecipes = [
      {
        id: 'mock-1',
        title: `Quick ${ingredients[0]} Stir Fry`,
        description: `A delicious stir fry using ${ingredients.slice(0, 3).join(', ')} and simple seasonings.`,
        image: '/api/placeholder/400/300',
        readyInMinutes: 20,
        servings: 4,
        ingredients: ingredients.slice(0, 5).map(ing => ({
          name: ing,
          amount: 1,
          unit: 'cup'
        })),
        instructions: [
          `Heat oil in a large pan`,
          `Add ${ingredients[0]} and cook for 5 minutes`,
          `Add remaining ingredients and stir fry for 10-15 minutes`,
          'Season with salt, pepper, and your favorite spices',
          'Serve hot over rice or noodles'
        ],
        sourceName: 'Refrigerator Recipes AI',
        cuisineType: 'Asian'
      },
      {
        id: 'mock-2',
        title: `${ingredients[0]} and ${ingredients[1] || 'Veggie'} Skillet`,
        description: `One-pan meal featuring ${ingredients.slice(0, 2).join(' and ')} with herbs and spices.`,
        image: '/api/placeholder/400/300',
        readyInMinutes: 25,
        servings: 3,
        ingredients: ingredients.slice(0, 4).map(ing => ({
          name: ing,
          amount: 0.5,
          unit: 'lb'
        })),
        instructions: [
          'Preheat oven to 400°F',
          `Season ${ingredients[0]} with salt and pepper`,
          'Heat skillet over medium-high heat',
          'Cook ingredients until golden brown',
          'Transfer to oven and bake for 15 minutes'
        ],
        sourceName: 'Refrigerator Recipes AI',
        cuisineType: 'American'
      },
      {
        id: 'mock-3',
        title: `Healthy ${ingredients[0]} Bowl`,
        description: `Nutritious bowl combining ${ingredients.slice(0, 3).join(', ')} with fresh herbs.`,
        image: '/api/placeholder/400/300',
        readyInMinutes: 15,
        servings: 2,
        ingredients: ingredients.slice(0, 3).map(ing => ({
          name: ing,
          amount: 1,
          unit: 'cup'
        })),
        instructions: [
          `Prepare ${ingredients[0]} by washing and chopping`,
          'Combine all ingredients in a bowl',
          'Add your favorite dressing or seasonings',
          'Toss well and serve immediately'
        ],
        sourceName: 'Refrigerator Recipes AI',
        cuisineType: 'Mediterranean'
      }
    ];

    return mockRecipes.slice(0, maxResults);
  }

  /**
   * Transform Spoonacular recipe format
   */
  private transformSpoonacularRecipe(recipe: any): OnlineRecipe {
    return {
      id: recipe.id.toString(),
      title: recipe.title,
      description: recipe.summary || `Recipe using ${recipe.usedIngredientCount} of your ingredients`,
      image: recipe.image,
      readyInMinutes: recipe.readyInMinutes || 30,
      servings: recipe.servings || 4,
      ingredients: recipe.usedIngredients?.map((ing: any) => ({
        name: ing.name,
        amount: ing.amount || 1,
        unit: ing.unit || 'piece'
      })) || [],
      instructions: [], // Would need additional API call for detailed instructions
      sourceUrl: recipe.sourceUrl,
      sourceName: 'Spoonacular'
    };
  }

  /**
   * Transform Edamam recipe format
   */
  private transformEdamamRecipe(recipe: any): OnlineRecipe {
    return {
      id: recipe.uri.split('#recipe_')[1] || recipe.label.replace(/\s+/g, '-').toLowerCase(),
      title: recipe.label,
      description: `${recipe.cuisineType?.join(', ')} recipe with ${recipe.ingredientLines?.length || 0} ingredients`,
      image: recipe.image,
      readyInMinutes: recipe.totalTime || 30,
      servings: recipe.yield || 4,
      ingredients: recipe.ingredientLines?.map((line: string) => {
        // Simple parsing of ingredient lines
        const parts = line.split(' ');
        const amount = parseFloat(parts[0]) || 1;
        const unit = parts[1] || '';
        const name = parts.slice(2).join(' ');
        return { name, amount, unit };
      }) || [],
      instructions: [], // Edamam doesn't provide instructions
      sourceUrl: recipe.url,
      sourceName: recipe.source
    };
  }

  /**
   * Calculate how well the found recipes cover the requested ingredients
   */
  private calculateIngredientCoverage(
    targetIngredients: string[],
    recipes: (Recipe | OnlineRecipe)[]
  ): number {
    if (targetIngredients.length === 0 || recipes.length === 0) return 0;

    const targetIngredientsLower = targetIngredients.map(i => i.toLowerCase());
    const usedIngredients = new Set<string>();

    recipes.forEach(recipe => {
      const recipeIngredients = recipe.ingredients.map(i => i.name.toLowerCase());
      recipeIngredients.forEach(ingredient => {
        if (targetIngredientsLower.includes(ingredient)) {
          usedIngredients.add(ingredient);
        }
      });
    });

    return usedIngredients.size / targetIngredients.length;
  }

  /**
   * Update the service with fresh recipe and ingredient data
   */
  updateData(savedRecipes: Recipe[], availableIngredients: Ingredient[]) {
    this.savedRecipes = savedRecipes;
    this.availableIngredients = availableIngredients;
  }
}