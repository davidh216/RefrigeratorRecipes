/**
 * Core Response Generator for Sous Chef Agent
 * 
 * Orchestrates all subagents to generate intelligent, context-aware responses.
 * This is the central intelligence that connects QueryProcessor, AgentDataService,
 * and specialized intelligence engines to create comprehensive responses.
 */

import {
  AgentResponse,
  AgentRequest,
  UserContext,
  QueryIntent,
  AgentResponseData
} from '../types';
import { QueryAnalysis } from '../sous-chef/QueryProcessor';
import { 
  AgentDataService, 
  IngredientAnalysis, 
  RecipeMatchResult, 
  MealPlanAnalysis,
  ShoppingOptimization 
} from './AgentDataService';
import { 
  EnhancedRecipeService, 
  EnhancedRecipeResult,
  OnlineRecipe 
} from './EnhancedRecipeService';

/**
 * Response generation context
 */
export interface ResponseContext {
  query: string;
  analysis: QueryAnalysis;
  userContext: UserContext;
  dataService: AgentDataService;
}

/**
 * Response components that can be generated independently
 */
interface ResponseComponents {
  primaryContent: string;
  recommendations: any[];
  suggestedActions: Array<{
    action: string;
    label: string;
    data?: any;
  }>;
  followUpSuggestions: string[];
  confidence: number;
}

/**
 * Core Response Generator class
 */
export class ResponseGenerator {
  /**
   * Generate complete agent response based on intent
   */
  async generateResponse(context: ResponseContext): Promise<AgentResponse> {
    const { analysis, userContext, dataService } = context;
    
    // Route to appropriate response generator based on intent
    switch (analysis.intent) {
      case 'ingredient-management':
        return await this.generateIngredientResponse(context);
      
      case 'recipe-search':
      case 'recipe-recommendation':
        return await this.generateRecipeResponse(context);
      
      case 'meal-planning':
        return await this.generateMealPlanResponse(context);
      
      case 'shopping-list':
        return await this.generateShoppingResponse(context);
      
      case 'nutrition-info':
        return await this.generateNutritionResponse(context);
      
      case 'cooking-tips':
        return await this.generateCookingTipsResponse(context);
      
      case 'substitution-help':
        return await this.generateSubstitutionResponse(context);
      
      case 'dietary-guidance':
        return await this.generateDietaryResponse(context);
      
      default:
        return await this.generateGeneralHelpResponse(context);
    }
  }

  /**
   * Generate ingredient-focused responses
   */
  private async generateIngredientResponse(context: ResponseContext): Promise<AgentResponse> {
    const { analysis, userContext, dataService } = context;
    const ingredientAnalysis = await dataService.getIngredientAnalysis();
    
    let primaryContent = '';
    const recommendations: any[] = [];
    const suggestedActions: any[] = [];
    const followUpSuggestions: string[] = [];

    // Handle different ingredient-related queries
    if (this.isExpirationQuery(analysis)) {
      const response = await this.handleExpirationQuery(ingredientAnalysis, dataService);
      primaryContent = response.content;
      recommendations.push(...response.recommendations);
      suggestedActions.push(...response.actions);
      followUpSuggestions.push(...response.followUps);
    } else if (this.isInventoryQuery(analysis)) {
      const response = await this.handleInventoryQuery(ingredientAnalysis, analysis);
      primaryContent = response.content;
      recommendations.push(...response.recommendations);
      suggestedActions.push(...response.actions);
      followUpSuggestions.push(...response.followUps);
    } else if (this.isUsageQuery(analysis)) {
      const response = await this.handleIngredientUsageQuery(analysis, dataService);
      primaryContent = response.content;
      recommendations.push(...response.recommendations);
      suggestedActions.push(...response.actions);
      followUpSuggestions.push(...response.followUps);
    }

    return this.assembleResponse({
      primaryContent,
      recommendations,
      suggestedActions,
      followUpSuggestions,
      confidence: analysis.confidence
    });
  }

  /**
   * Generate recipe-focused responses
   */
  private async generateRecipeResponse(context: ResponseContext): Promise<AgentResponse> {
    const { analysis, userContext, dataService } = context;
    
    // Initialize enhanced recipe service
    const enhancedRecipeService = new EnhancedRecipeService(
      userContext.availableRecipes || [],
      userContext.availableIngredients
    );

    // Get relevant data
    const ingredientAnalysis = await dataService.getIngredientAnalysis();
    
    let primaryContent = '';
    const recommendations: any[] = [];
    const suggestedActions: any[] = [];
    let recipeResults: EnhancedRecipeResult;

    if ((analysis.entities.ingredients || []).length > 0) {
      // User specified specific ingredients
      recipeResults = await enhancedRecipeService.findRecipesWithIngredients(
        analysis.entities.ingredients || [],
        { 
          maxResults: 6, 
          includePartialMatches: true,
          cuisineType: analysis.entities.cuisines?.[0],
          maxCookTime: analysis.entities.timeConstraints?.maxTotalTime,
          difficulty: analysis.entities.difficulty
        }
      );
      
      primaryContent = this.generateRecipeContentWithSpecificIngredients(recipeResults, analysis.entities.ingredients || []);
    } else {
      // General recipe request - use expiring ingredients if available
      const expiring = ingredientAnalysis.expiringSoon || [];
      const searchIngredients = expiring.length > 0 
        ? expiring.map(i => i.name) 
        : userContext.availableIngredients.slice(0, 5).map(i => i.name);

      recipeResults = await enhancedRecipeService.findRecipesWithIngredients(
        searchIngredients,
        { 
          maxResults: 6, 
          includePartialMatches: true,
          preferSaved: true
        }
      );
      
      if (expiring.length > 0) {
        primaryContent = this.generateRecipeContentWithExpiringIngredients(recipeResults, expiring.map(i => i.name));
      } else {
        primaryContent = this.generateGeneralRecipeContent(recipeResults, searchIngredients);
      }
    }

    // Add all found recipes to recommendations (convert online recipes to Recipe format)
    const allRecipes = [
      ...recipeResults.savedRecipes.slice(0, 3),
      ...recipeResults.onlineRecipes.slice(0, 3).map(recipe => this.convertOnlineRecipeToRecipe(recipe))
    ];
    recommendations.push(...allRecipes);

    // Add suggested actions based on results
    if (recipeResults.totalFound > 0) {
      const firstRecipe = recipeResults.savedRecipes[0] || recipeResults.onlineRecipes[0];
      if (firstRecipe) {
        suggestedActions.push({
          action: 'add-to-meal-plan',
          label: 'Add to meal plan',
          data: { 
            recipeId: firstRecipe.id,
            recipeName: 'title' in firstRecipe ? firstRecipe.title : firstRecipe.name
          }
        });
      }
      
      if (recipeResults.searchStrategy === 'hybrid' || recipeResults.searchStrategy === 'online-only') {
        suggestedActions.push({
          action: 'save-recipe',
          label: 'Save favorite recipes',
          data: { source: 'online' }
        });
      }
    }

    const followUpSuggestions = [
      "Show me more recipe options",
      "What ingredients do I need to buy?",
      "Add this to my meal plan",
      "Give me cooking tips for this recipe"
    ];

    return this.assembleResponse({
      primaryContent,
      recommendations,
      suggestedActions,
      followUpSuggestions,
      confidence: analysis.confidence
    });
  }

  /**
   * Generate meal planning responses
   */
  private async generateMealPlanResponse(context: ResponseContext): Promise<AgentResponse> {
    const { analysis, userContext, dataService } = context;
    const mealPlanAnalysis = await dataService.getMealPlanAnalysis();
    const ingredientAnalysis = await dataService.getIngredientAnalysis();

    let primaryContent = '';
    const recommendations: any[] = [];
    const suggestedActions: any[] = [];

    if (mealPlanAnalysis.emptySlots.length > 0) {
      primaryContent = `I see you have ${mealPlanAnalysis.emptySlots.length} empty meal slots this week. Let me help you plan some delicious meals!`;
      
      // Generate meal suggestions
      const suggestions = await dataService.generateMealPlanSuggestions({
        useExpiringIngredients: true,
        maxMeals: 5,
        skillLevel: userContext.cookingSkillLevel
      });

      primaryContent += `\n\n📅 **Suggested Meals:**`;
      for (const suggestion of suggestions.suggestions.slice(0, 3)) {
        primaryContent += `\n• **${suggestion.day}** (${suggestion.mealType}): ${suggestion.recipe.name} - ${suggestion.reason}`;
        recommendations.push(suggestion.recipe);
      }

      if (suggestions.expirationOptimization > 0) {
        primaryContent += `\n\n♻️ This plan will use ${Math.round(suggestions.expirationOptimization)}% of your expiring ingredients!`;
      }

      suggestedActions.push({
        action: 'create-meal-plan',
        label: 'Add suggestions to meal plan',
        data: { suggestions: suggestions.suggestions }
      });

      if (suggestions.shoppingNeeded.length > 0) {
        suggestedActions.push({
          action: 'create-shopping-list',
          label: 'Create shopping list',
          data: { ingredients: suggestions.shoppingNeeded }
        });
      }
    } else {
      primaryContent = "Your meal plan looks complete! Here are some ways to optimize it:";
      
      if (mealPlanAnalysis.nutritionalBalance.variety === 'low') {
        primaryContent += "\n• Consider adding more cuisine variety";
      }
      if (mealPlanAnalysis.nutritionalBalance.vegetables === 'low') {
        primaryContent += "\n• Try incorporating more vegetable-rich meals";
      }
    }

    const followUpSuggestions = [
      "Suggest more meal options",
      "Help me balance nutrition",
      "Create a shopping list",
      "What can I meal prep?"
    ];

    return this.assembleResponse({
      primaryContent,
      recommendations,
      suggestedActions,
      followUpSuggestions,
      confidence: analysis.confidence
    });
  }

  /**
   * Generate shopping list responses
   */
  private async generateShoppingResponse(context: ResponseContext): Promise<AgentResponse> {
    const { analysis, userContext, dataService } = context;
    const mealPlanAnalysis = await dataService.getMealPlanAnalysis();
    const optimization = await dataService.optimizeShoppingList();

    let primaryContent = '';
    const suggestedActions: any[] = [];

    if (mealPlanAnalysis.ingredientsNeeded.length > 0) {
      primaryContent = `Based on your meal plan, here's what you need to buy:\n\n🛒 **Shopping List:**`;
      
      const categoryGroups = optimization.categoryGroups;
      for (const [category, items] of Object.entries(categoryGroups)) {
        if (items.length > 0) {
          primaryContent += `\n\n**${category}:**`;
          items.slice(0, 5).forEach(item => {
            primaryContent += `\n• ${item.name} (${item.quantity} ${item.unit})`;
          });
        }
      }

      // Add budget optimizations
      if (optimization.budgetOptimizations.length > 0) {
        primaryContent += `\n\n💰 **Money-Saving Tips:**`;
        optimization.budgetOptimizations.slice(0, 3).forEach(opt => {
          primaryContent += `\n• ${opt.item.name}: Try ${opt.alternatives.join(' or ')} (save ~${Math.round(opt.potentialSaving * 100)}%)`;
        });
      }

      // Add seasonal suggestions
      if (optimization.seasonalSuggestions.length > 0) {
        primaryContent += `\n\n🌱 **Seasonal Picks:** ${optimization.seasonalSuggestions.map(s => s.name).join(', ')}`;
      }

      suggestedActions.push({
        action: 'create-shopping-list',
        label: 'Create optimized shopping list',
        data: { items: optimization.consolidatedList }
      });
    } else {
      primaryContent = "You're all set! Your ingredients should cover your current meal plan.";
      
      if (optimization.seasonalSuggestions.length > 0) {
        primaryContent += `\n\n🌱 Consider adding these seasonal ingredients to diversify your cooking: ${optimization.seasonalSuggestions.map(s => s.name).join(', ')}`;
      }
    }

    const followUpSuggestions = [
      "Optimize my shopping route",
      "Find budget-friendly alternatives",
      "What's in season right now?",
      "Help me meal prep with these ingredients"
    ];

    return this.assembleResponse({
      primaryContent,
      recommendations: [],
      suggestedActions,
      followUpSuggestions,
      confidence: analysis.confidence
    });
  }

  /**
   * Generate general help responses
   */
  private async generateGeneralHelpResponse(context: ResponseContext): Promise<AgentResponse> {
    const primaryContent = `Hi! I'm your Sous Chef assistant. I can help you with:

🥗 **Ingredients**: Check expiration dates, suggest usage, manage inventory
🍳 **Recipes**: Find recipes with your ingredients, get personalized recommendations  
📅 **Meal Planning**: Create weekly plans, balance nutrition, optimize ingredient usage
🛒 **Shopping**: Generate smart shopping lists, find budget alternatives
💡 **Cooking Tips**: Get advice on techniques, substitutions, and dietary needs

What would you like help with today?`;

    const followUpSuggestions = [
      "What's expiring soon?",
      "What can I cook tonight?",
      "Help me plan this week's meals",
      "Create a shopping list",
      "Give me a quick recipe",
      "Help me reduce food waste"
    ];

    return this.assembleResponse({
      primaryContent,
      recommendations: [],
      suggestedActions: [],
      followUpSuggestions,
      confidence: 0.9
    });
  }

  // Helper methods for response generation
  
  private async generateNutritionResponse(context: ResponseContext): Promise<AgentResponse> {
    const primaryContent = "I can help you analyze the nutritional balance of your meals and suggest improvements for a healthier diet.";
    
    return this.assembleResponse({
      primaryContent,
      recommendations: [],
      suggestedActions: [],
      followUpSuggestions: ["Analyze my meal plan", "Suggest healthy recipes", "Help me balance macronutrients"],
      confidence: 0.8
    });
  }

  private async generateCookingTipsResponse(context: ResponseContext): Promise<AgentResponse> {
    const primaryContent = "I'd love to share cooking tips! What specific technique or recipe would you like help with?";
    
    return this.assembleResponse({
      primaryContent,
      recommendations: [],
      suggestedActions: [],
      followUpSuggestions: ["How to cook chicken perfectly", "Knife skills basics", "Seasoning tips", "Cooking time guides"],
      confidence: 0.8
    });
  }

  private async generateSubstitutionResponse(context: ResponseContext): Promise<AgentResponse> {
    const { analysis } = context;
    let primaryContent = "I can help you find substitutions for ingredients! ";
    
    if (analysis.entities.ingredients.length > 0) {
      const ingredient = analysis.entities.ingredients[0];
      primaryContent += `For ${ingredient}, you could try: `;
      
      // Simple substitution logic (could be expanded)
      const substitutions: Record<string, string[]> = {
        'butter': ['olive oil', 'coconut oil', 'applesauce'],
        'eggs': ['flax eggs', 'applesauce', 'mashed banana'],
        'milk': ['almond milk', 'oat milk', 'soy milk'],
        'flour': ['almond flour', 'coconut flour', 'oat flour']
      };
      
      const subs = substitutions[ingredient.toLowerCase()] || ['similar ingredients from your pantry'];
      primaryContent += subs.join(', ') + '.';
    } else {
      primaryContent += "What ingredient do you need to substitute?";
    }
    
    return this.assembleResponse({
      primaryContent,
      recommendations: [],
      suggestedActions: [],
      followUpSuggestions: ["Egg substitutes", "Dairy-free alternatives", "Gluten-free flour options", "Sugar substitutes"],
      confidence: 0.8
    });
  }

  private async generateDietaryResponse(context: ResponseContext): Promise<AgentResponse> {
    const primaryContent = "I can help you find recipes that match your dietary needs and preferences. What dietary restrictions or goals do you have?";
    
    return this.assembleResponse({
      primaryContent,
      recommendations: [],
      suggestedActions: [],
      followUpSuggestions: ["Vegetarian recipes", "Gluten-free options", "Keto meal ideas", "Low-sodium cooking", "High-protein meals"],
      confidence: 0.8
    });
  }

  // Query analysis helper methods

  private isExpirationQuery(analysis: QueryAnalysis): boolean {
    return /expir|expire|expiring|going.*bad|use.*up|waste/.test(analysis.queryBreakdown.action + analysis.queryBreakdown.subject);
  }

  private isInventoryQuery(analysis: QueryAnalysis): boolean {
    return /have|inventory|stock|available|current/.test(analysis.queryBreakdown.action + analysis.queryBreakdown.subject);
  }

  private isUsageQuery(analysis: QueryAnalysis): boolean {
    return analysis.entities.ingredients.length > 0 && /cook|make|use|recipe/.test(analysis.queryBreakdown.action);
  }

  // Specific response handlers

  private async handleExpirationQuery(
    ingredientAnalysis: IngredientAnalysis, 
    dataService: AgentDataService
  ) {
    const expiringSoon = ingredientAnalysis.expiringSoon;
    const expired = ingredientAnalysis.expired;

    let content = '';
    const recommendations: any[] = [];
    const actions: any[] = [];
    const followUps: string[] = [];

    if (expiringSoon.length === 0 && expired.length === 0) {
      content = "Great news! None of your ingredients are expiring soon. You're doing an excellent job managing your food inventory! 🎉";
      followUps.push("What should I cook tonight?", "Plan meals for this week", "Show me new recipes");
    } else {
      if (expired.length > 0) {
        content += `⚠️ **Expired Ingredients** (${expired.length}): ${expired.slice(0, 3).map(i => i.name).join(', ')}`;
        if (expired.length > 3) content += ` and ${expired.length - 3} more`;
        content += '\n\n';
      }

      if (expiringSoon.length > 0) {
        content += `⏰ **Expiring Soon** (${expiringSoon.length}): `;
        expiringSoon.slice(0, 5).forEach(ingredient => {
          const daysUntilExpiration = Math.ceil(
            (new Date(ingredient.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          content += `\n• ${ingredient.name} (${daysUntilExpiration} days)`;
        });

        // Get recipes using expiring ingredients
        const recipeMatches = await dataService.findRecipesWithIngredients(
          expiringSoon.map(i => i.name)
        );

        if (recipeMatches.recipesForExpiring.length > 0) {
          content += '\n\n🍳 **Recipes to use them up:**';
          recipeMatches.recipesForExpiring.slice(0, 3).forEach(recipe => {
            content += `\n• ${recipe.name}`;
            recommendations.push(recipe);
          });

          actions.push({
            action: 'add-to-meal-plan',
            label: 'Add recipe to meal plan',
            data: { recipeId: recipeMatches.recipesForExpiring[0].id }
          });
        }

        followUps.push(
          "Show me more recipes with these ingredients",
          "How can I store these longer?",
          "Plan meals using expiring ingredients"
        );
      }
    }

    return { content, recommendations, actions, followUps };
  }

  private async handleInventoryQuery(
    ingredientAnalysis: IngredientAnalysis,
    analysis: QueryAnalysis
  ) {
    let content = `📦 **Your Ingredient Inventory:**\n\n`;
    content += `Total ingredients: ${ingredientAnalysis.total}\n`;
    
    // Show by category
    const topCategories = Object.entries(ingredientAnalysis.categories)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 5);
    
    for (const [category, ingredients] of topCategories) {
      content += `\n**${category}** (${ingredients.length}): ${ingredients.slice(0, 3).map(i => i.name).join(', ')}`;
      if (ingredients.length > 3) content += ` and ${ingredients.length - 3} more`;
    }

    const lowStock = ingredientAnalysis.lowStock;
    if (lowStock.length > 0) {
      content += `\n\n⚠️ **Running Low**: ${lowStock.map(i => i.name).join(', ')}`;
    }

    return {
      content,
      recommendations: [],
      actions: [{
        action: 'create-shopping-list',
        label: 'Create shopping list for low stock items',
        data: { ingredients: lowStock.map(i => i.name) }
      }],
      followUps: [
        "What's expiring soon?",
        "What can I cook with these ingredients?",
        "Help me organize my pantry"
      ]
    };
  }

  private async handleIngredientUsageQuery(
    analysis: QueryAnalysis,
    dataService: AgentDataService
  ) {
    const ingredients = analysis.entities.ingredients;
    const recipeMatches = await dataService.findRecipesWithIngredients(ingredients);

    let content = `Great! I found ${recipeMatches.perfectMatches.length + recipeMatches.partialMatches.length} recipes using ${ingredients.join(', ')}:\n\n`;

    if (recipeMatches.perfectMatches.length > 0) {
      content += `✅ **Perfect Matches** (use all your ingredients):\n`;
      recipeMatches.perfectMatches.slice(0, 3).forEach(recipe => {
        content += `• ${recipe.name} - ${recipe.description || 'Delicious and satisfying'}\n`;
      });
    }

    if (recipeMatches.partialMatches.length > 0) {
      content += `\n🔶 **Good Matches** (need a few more ingredients):\n`;
      recipeMatches.partialMatches.slice(0, 3).forEach(recipe => {
        const missing = recipeMatches.missingIngredients[recipe.id] || [];
        content += `• ${recipe.name} - Need: ${missing.slice(0, 2).join(', ')}\n`;
      });
    }

    return {
      content,
      recommendations: [...recipeMatches.perfectMatches.slice(0, 3), ...recipeMatches.partialMatches.slice(0, 2)],
      actions: [{
        action: 'add-to-meal-plan',
        label: 'Add to meal plan',
        data: { recipeId: recipeMatches.perfectMatches[0]?.id }
      }],
      followUps: [
        "Show me more recipes",
        "What ingredients do I need to buy?",
        "Add this to my meal plan"
      ]
    };
  }

  private generateRecipeContentWithIngredients(recipeMatches: RecipeMatchResult, ingredients: string[]): string {
    const ingredientList = ingredients.join(', ');
    let content = `Perfect! I found recipes using ${ingredientList}:\n\n`;

    if (recipeMatches.perfectMatches.length > 0) {
      content += `✅ **Perfect Matches:**\n`;
      recipeMatches.perfectMatches.slice(0, 3).forEach((recipe, index) => {
        content += `${index + 1}. **${recipe.name}**`;
        if (recipe.prepTime) content += ` (${recipe.prepTime} min prep)`;
        if (recipe.description) content += ` - ${recipe.description}`;
        content += '\n';
      });
    }

    if (recipeMatches.partialMatches.length > 0) {
      content += `\n🔶 **Almost Perfect** (need 1-2 more ingredients):\n`;
      recipeMatches.partialMatches.slice(0, 2).forEach(recipe => {
        const missing = recipeMatches.missingIngredients[recipe.id] || [];
        content += `• **${recipe.name}** - Add: ${missing.slice(0, 2).join(', ')}\n`;
      });
    }

    return content;
  }

  /**
   * Assemble final response from components
   */
  private assembleResponse(components: ResponseComponents): AgentResponse {
    const response: AgentResponse = {
      id: `resp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentType: 'sous-chef',
      message: components.primaryContent,
      intent: 'general-help', // This would be set based on the original intent
      confidence: this.mapConfidenceToString(components.confidence),
      priority: 'medium',
      followUpSuggestions: components.followUpSuggestions,
      metadata: {
        processingTime: Date.now(),
        timestamp: new Date(),
        version: '1.0.0'
      }
    };

    if (components.recommendations.length > 0) {
      response.data = {
        recipes: components.recommendations
      };
    }

    if (components.suggestedActions.length > 0) {
      response.suggestedActions = components.suggestedActions;
    }

    return response;
  }

  private mapConfidenceToString(confidence: number): 'very-low' | 'low' | 'medium' | 'high' | 'very-high' {
    if (confidence >= 0.9) return 'very-high';
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    if (confidence >= 0.3) return 'low';
    return 'very-low';
  }

  /**
   * Generate content for recipes with specific ingredients
   */
  private generateRecipeContentWithSpecificIngredients(results: EnhancedRecipeResult, ingredients: string[]): string {
    const totalRecipes = results.savedRecipes.length + results.onlineRecipes.length;
    
    if (totalRecipes === 0) {
      return `I couldn't find any recipes specifically using ${ingredients.join(', ')}. Would you like me to suggest similar recipes or help you find alternatives?`;
    }

    let content = `Found ${totalRecipes} delicious recipe${totalRecipes > 1 ? 's' : ''} using ${ingredients.join(', ')}!\n\n`;
    
    // Show saved recipes first
    if (results.savedRecipes.length > 0) {
      content += `📚 **From your saved recipes:**\n`;
      results.savedRecipes.slice(0, 3).forEach(recipe => {
        content += `• **${recipe.name}** - ${recipe.description || 'Ready in ' + recipe.cookTime + ' minutes'}\n`;
      });
      content += '\n';
    }

    // Show online recipes
    if (results.onlineRecipes.length > 0) {
      content += `🌐 **Recommended recipes:**\n`;
      results.onlineRecipes.slice(0, 3).forEach(recipe => {
        content += `• **${recipe.title}** - ${recipe.description} (${recipe.readyInMinutes} min)\n`;
      });
    }

    if (results.ingredientCoverage < 1) {
      content += `\n💡 These recipes use ${Math.round(results.ingredientCoverage * 100)}% of your requested ingredients.`;
    }

    return content;
  }

  /**
   * Generate content for recipes using expiring ingredients
   */
  private generateRecipeContentWithExpiringIngredients(results: EnhancedRecipeResult, expiringIngredients: string[]): string {
    const totalRecipes = results.savedRecipes.length + results.onlineRecipes.length;
    
    if (totalRecipes === 0) {
      return `I couldn't find recipes for your expiring ingredients: ${expiringIngredients.join(', ')}. Consider simple preparations like stir-fries, soups, or smoothies to use them up!`;
    }

    let content = `🎯 Perfect timing! I found ${totalRecipes} recipe${totalRecipes > 1 ? 's' : ''} to help you use up these ingredients before they expire: **${expiringIngredients.join(', ')}**\n\n`;
    
    // Prioritize saved recipes
    if (results.savedRecipes.length > 0) {
      content += `📚 **From your collection:**\n`;
      results.savedRecipes.slice(0, 2).forEach(recipe => {
        const matchingIngredients = recipe.ingredients.filter(ing => 
          expiringIngredients.some(exp => exp.toLowerCase().includes(ing.name.toLowerCase()))
        ).length;
        content += `• **${recipe.name}** - Uses ${matchingIngredients} expiring ingredient${matchingIngredients > 1 ? 's' : ''}\n`;
      });
      content += '\n';
    }

    // Add online suggestions
    if (results.onlineRecipes.length > 0) {
      content += `✨ **New ideas:**\n`;
      results.onlineRecipes.slice(0, 3).forEach(recipe => {
        content += `• **${recipe.title}** - Ready in ${recipe.readyInMinutes} minutes\n`;
      });
    }

    content += `\n♻️ Acting now will prevent food waste and save money!`;

    return content;
  }

  /**
   * Generate general recipe content for "what should I cook" queries
   */
  private generateGeneralRecipeContent(results: EnhancedRecipeResult, searchIngredients: string[]): string {
    const totalRecipes = results.savedRecipes.length + results.onlineRecipes.length;
    
    if (totalRecipes === 0) {
      return `Based on your current ingredients, I'd recommend some simple, versatile dishes like stir-fries, pasta, or one-pot meals. Would you like me to suggest specific recipes?`;
    }

    let content = '';
    
    // Context-aware greeting based on time of day
    const now = new Date();
    const hour = now.getHours();
    if (hour < 11) {
      content = `🌅 Good morning! For breakfast or brunch, here are some ideas using your ingredients:\n\n`;
    } else if (hour < 17) {
      content = `☀️ Looking for lunch inspiration? Here are some recipes using what you have:\n\n`;
    } else {
      content = `🌆 Perfect dinner timing! Here are some delicious options using your available ingredients:\n\n`;
    }
    
    // Show saved recipes first (more personalized)
    if (results.savedRecipes.length > 0) {
      content += `👨‍🍳 **Your favorites:**\n`;
      results.savedRecipes.slice(0, 2).forEach(recipe => {
        content += `• **${recipe.name}** - ${recipe.description || `${recipe.cookTime} minutes, serves ${recipe.servingsCount}`}\n`;
      });
      content += '\n';
    }

    // Show online discoveries
    if (results.onlineRecipes.length > 0) {
      content += `🍽️ **New discoveries:**\n`;
      results.onlineRecipes.slice(0, 3).forEach(recipe => {
        content += `• **${recipe.title}** - ${recipe.description}\n`;
      });
    }

    // Add personalized insights
    if (results.searchStrategy === 'hybrid') {
      content += `\n🔄 I've combined your saved favorites with fresh ideas from online!`;
    } else if (results.searchStrategy === 'online-only') {
      content += `\n🌐 These are new recipe ideas - save your favorites to see them again!`;
    }

    return content;
  }

  /**
   * Convert OnlineRecipe to Recipe format for consistency
   */
  private convertOnlineRecipeToRecipe(onlineRecipe: OnlineRecipe): Recipe {
    return {
      id: onlineRecipe.id,
      name: onlineRecipe.title,
      description: onlineRecipe.description,
      ingredients: onlineRecipe.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.amount,
        unit: ing.unit,
        category: 'other'
      })),
      instructions: onlineRecipe.instructions.length > 0 ? onlineRecipe.instructions : [
        'Visit the source website for detailed cooking instructions',
        onlineRecipe.sourceUrl || 'Recipe from online source'
      ],
      prepTime: Math.max(5, Math.round(onlineRecipe.readyInMinutes * 0.3)),
      cookTime: Math.max(10, Math.round(onlineRecipe.readyInMinutes * 0.7)),
      totalTime: onlineRecipe.readyInMinutes,
      servingsCount: onlineRecipe.servings,
      difficulty: 'medium' as const,
      cuisineType: onlineRecipe.cuisineType || 'international',
      mealType: 'dinner' as const,
      tags: [onlineRecipe.sourceName || 'online', onlineRecipe.cuisineType || 'international'].filter(Boolean),
      images: onlineRecipe.image ? [onlineRecipe.image] : [],
      sourceUrl: onlineRecipe.sourceUrl,
      metadata: {
        isOnlineRecipe: true,
        originalSource: onlineRecipe.sourceName,
        sourceUrl: onlineRecipe.sourceUrl
      }
    } as Recipe;
  }
}