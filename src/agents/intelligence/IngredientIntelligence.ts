/**
 * Ingredient Intelligence Engine
 * 
 * Specialized subagent for ingredient management, expiration tracking,
 * usage optimization, and waste reduction. Works in parallel with other
 * intelligence engines to provide comprehensive cooking assistance.
 */

import { Ingredient, Recipe } from '@/types';
import { getExpirationStatus } from '@/utils';
import { AgentDataService, IngredientAnalysis } from '../services/AgentDataService';
import { QueryAnalysis } from '../sous-chef/QueryProcessor';

/**
 * Ingredient insight types
 */
export interface IngredientInsight {
  type: 'expiration-alert' | 'usage-suggestion' | 'storage-tip' | 'waste-reduction';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  ingredients: Ingredient[];
  actionable: boolean;
  suggestedActions: Array<{
    action: string;
    label: string;
    data?: any;
  }>;
}

/**
 * Usage optimization result
 */
export interface UsageOptimization {
  ingredient: Ingredient;
  recommendedRecipes: Recipe[];
  urgencyScore: number;
  expirationDays: number;
  alternatives: string[];
  storageImprovement?: string;
}

/**
 * Inventory health assessment
 */
export interface InventoryHealth {
  overallScore: number; // 0-100
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  categoryAnalysis: Record<string, {
    count: number;
    health: 'excellent' | 'good' | 'fair' | 'poor';
    suggestions: string[];
  }>;
}

/**
 * Main Ingredient Intelligence Engine
 */
export class IngredientIntelligence {
  constructor(private dataService: AgentDataService) {}

  /**
   * Generate comprehensive ingredient insights
   */
  async generateInsights(context?: QueryAnalysis): Promise<IngredientInsight[]> {
    const analysis = await this.dataService.getIngredientAnalysis();
    const insights: IngredientInsight[] = [];

    // Expiration alerts - highest priority
    const expirationInsights = await this.generateExpirationInsights(analysis);
    insights.push(...expirationInsights);

    // Usage optimization
    const usageInsights = await this.generateUsageInsights(analysis);
    insights.push(...usageInsights);

    // Storage recommendations
    const storageInsights = await this.generateStorageInsights(analysis);
    insights.push(...storageInsights);

    // Waste reduction strategies
    const wasteInsights = await this.generateWasteReductionInsights(analysis);
    insights.push(...wasteInsights);

    // Sort by priority and relevance
    return this.prioritizeInsights(insights, context);
  }

  /**
   * Analyze ingredient usage patterns and optimization opportunities
   */
  async optimizeIngredientUsage(targetIngredients?: string[]): Promise<UsageOptimization[]> {
    const analysis = await this.dataService.getIngredientAnalysis();
    let ingredientsToOptimize: Ingredient[];

    if (targetIngredients) {
      ingredientsToOptimize = analysis.expiringSoon.concat(analysis.expired)
        .filter(ingredient => targetIngredients.includes(ingredient.name.toLowerCase()));
    } else {
      // Focus on expiring ingredients first
      ingredientsToOptimize = analysis.expiringSoon.concat(analysis.expired);
    }

    const optimizations: UsageOptimization[] = [];

    for (const ingredient of ingredientsToOptimize) {
      const optimization = await this.createUsageOptimization(ingredient);
      optimizations.push(optimization);
    }

    // Sort by urgency (expiration date and priority)
    return optimizations.sort((a, b) => b.urgencyScore - a.urgencyScore);
  }

  /**
   * Assess overall inventory health
   */
  async assessInventoryHealth(): Promise<InventoryHealth> {
    const analysis = await this.dataService.getIngredientAnalysis();
    
    const totalIngredients = analysis.total;
    const expiredCount = analysis.expired.length;
    const expiringSoonCount = analysis.expiringSoon.length;
    const lowStockCount = analysis.lowStock.length;

    // Calculate overall health score
    let healthScore = 100;
    healthScore -= (expiredCount * 10); // -10 points per expired ingredient
    healthScore -= (expiringSoonCount * 5); // -5 points per expiring ingredient
    healthScore -= (lowStockCount * 3); // -3 points per low stock item
    
    const overallScore = Math.max(0, Math.min(100, healthScore));

    // Generate strengths and concerns
    const strengths: string[] = [];
    const concerns: string[] = [];
    const recommendations: string[] = [];

    // Analyze strengths
    if (expiredCount === 0) {
      strengths.push("No expired ingredients - excellent inventory management!");
    }
    if (expiringSoonCount < totalIngredients * 0.1) {
      strengths.push("Low expiration rate - good planning");
    }
    if (totalIngredients > 20) {
      strengths.push("Well-stocked kitchen with good variety");
    }

    // Identify concerns
    if (expiredCount > 0) {
      concerns.push(`${expiredCount} ingredients have expired`);
      recommendations.push("Remove expired ingredients and plan meals to use up remaining inventory");
    }
    if (expiringSoonCount > totalIngredients * 0.2) {
      concerns.push("High percentage of ingredients expiring soon");
      recommendations.push("Plan meals focusing on expiring ingredients first");
    }
    if (lowStockCount > 5) {
      concerns.push("Multiple ingredients running low");
      recommendations.push("Create shopping list for frequently used items");
    }

    // Category analysis
    const categoryAnalysis: InventoryHealth['categoryAnalysis'] = {};
    for (const [category, ingredients] of Object.entries(analysis.categories)) {
      const categoryExpired = ingredients.filter(i => getExpirationStatus(i.expirationDate) === 'expired').length;
      const categoryExpiring = ingredients.filter(i => getExpirationStatus(i.expirationDate) === 'expiring-soon').length;
      
      let health: 'excellent' | 'good' | 'fair' | 'poor';
      const suggestions: string[] = [];

      if (categoryExpired === 0 && categoryExpiring < ingredients.length * 0.1) {
        health = 'excellent';
      } else if (categoryExpired === 0 && categoryExpiring < ingredients.length * 0.2) {
        health = 'good';
      } else if (categoryExpired <= 1 && categoryExpiring < ingredients.length * 0.3) {
        health = 'fair';
        suggestions.push(`Monitor ${category.toLowerCase()} more closely`);
      } else {
        health = 'poor';
        suggestions.push(`Urgent attention needed for ${category.toLowerCase()}`);
        suggestions.push(`Consider reducing ${category.toLowerCase()} purchases temporarily`);
      }

      categoryAnalysis[category] = {
        count: ingredients.length,
        health,
        suggestions
      };
    }

    return {
      overallScore,
      strengths,
      concerns,
      recommendations,
      categoryAnalysis
    };
  }

  /**
   * Predict optimal ingredient usage for meal planning
   */
  async predictOptimalUsage(timeHorizon: 'week' | 'month' = 'week'): Promise<{
    priorityIngredients: Array<{
      ingredient: Ingredient;
      priority: number;
      recommendedUsage: 'immediate' | 'this-week' | 'this-month';
      suggestedRecipes: Recipe[];
    }>;
    usageStrategy: string;
    wasteReduction: number; // percentage
  }> {
    const analysis = await this.dataService.getIngredientAnalysis();
    const priorityIngredients: any[] = [];

    // Combine expired and expiring ingredients with priority scoring
    const allIngredients = [...analysis.expired, ...analysis.expiringSoon];
    
    for (const ingredient of allIngredients) {
      const expirationStatus = getExpirationStatus(ingredient.expirationDate);
      const daysUntilExpiration = Math.ceil(
        (ingredient.expirationDate ? new Date(ingredient.expirationDate).getTime() - new Date().getTime() : 0) / (1000 * 60 * 60 * 24)
      );

      let priority = 0;
      let recommendedUsage: 'immediate' | 'this-week' | 'this-month';

      if (expirationStatus === 'expired') {
        priority = 100;
        recommendedUsage = 'immediate';
      } else if (daysUntilExpiration <= 2) {
        priority = 90;
        recommendedUsage = 'immediate';
      } else if (daysUntilExpiration <= 7) {
        priority = 70;
        recommendedUsage = 'this-week';
      } else {
        priority = 50;
        recommendedUsage = 'this-month';
      }

      // Get recipes for this ingredient
      const recipeMatches = await this.dataService.findRecipesWithIngredients([ingredient.name]);
      const suggestedRecipes = recipeMatches.perfectMatches.concat(recipeMatches.partialMatches).slice(0, 3);

      priorityIngredients.push({
        ingredient,
        priority,
        recommendedUsage,
        suggestedRecipes
      });
    }

    // Sort by priority
    priorityIngredients.sort((a, b) => b.priority - a.priority);

    // Generate usage strategy
    let usageStrategy = "";
    const immediateCount = priorityIngredients.filter(p => p.recommendedUsage === 'immediate').length;
    const weekCount = priorityIngredients.filter(p => p.recommendedUsage === 'this-week').length;

    if (immediateCount > 0) {
      usageStrategy = `Focus immediately on using ${immediateCount} ingredients that are expired or expiring within 2 days. `;
    }
    if (weekCount > 0) {
      usageStrategy += `Plan this week's meals around ${weekCount} ingredients expiring soon.`;
    }
    if (immediateCount === 0 && weekCount === 0) {
      usageStrategy = "Your ingredients are well-managed! Focus on variety and nutrition in your meal planning.";
    }

    // Calculate potential waste reduction
    const totalExpiringValue = allIngredients.length;
    const addressedValue = priorityIngredients.length;
    const wasteReduction = totalExpiringValue > 0 ? (addressedValue / totalExpiringValue) * 100 : 100;

    return {
      priorityIngredients: priorityIngredients.slice(0, 10), // Top 10 priority ingredients
      usageStrategy,
      wasteReduction
    };
  }

  // Private helper methods

  private async generateExpirationInsights(analysis: IngredientAnalysis): Promise<IngredientInsight[]> {
    const insights: IngredientInsight[] = [];

    // Critical expiration alerts
    if (analysis.expired.length > 0) {
      insights.push({
        type: 'expiration-alert',
        priority: 'urgent',
        title: 'Expired Ingredients Alert',
        message: `${analysis.expired.length} ingredients have expired and should be removed to prevent spoilage spread.`,
        ingredients: analysis.expired,
        actionable: true,
        suggestedActions: [
          {
            action: 'remove-ingredients',
            label: 'Remove expired ingredients',
            data: { ingredientIds: analysis.expired.map(i => i.id) }
          }
        ]
      });
    }

    // Expiring soon alerts
    if (analysis.expiringSoon.length > 0) {
      const recipes = await this.dataService.findRecipesWithIngredients(
        analysis.expiringSoon.map(i => i.name)
      );

      insights.push({
        type: 'expiration-alert',
        priority: 'high',
        title: 'Ingredients Expiring Soon',
        message: `${analysis.expiringSoon.length} ingredients are expiring within the next few days. Here are recipes to use them up!`,
        ingredients: analysis.expiringSoon,
        actionable: true,
        suggestedActions: [
          {
            action: 'plan-expiring-meals',
            label: 'Plan meals with expiring ingredients',
            data: { 
              ingredients: analysis.expiringSoon.map(i => i.name),
              recipes: recipes.usageOptimization.recipesForExpiring.slice(0, 3)
            }
          }
        ]
      });
    }

    return insights;
  }

  private async generateUsageInsights(analysis: IngredientAnalysis): Promise<IngredientInsight[]> {
    const insights: IngredientInsight[] = [];

    // Underutilized ingredients
    const commonIngredients = analysis.commonIngredients.slice(0, 3);
    if (commonIngredients.length > 0) {
      const recipes = await this.dataService.findRecipesWithIngredients(commonIngredients);
      
      if (recipes.perfectMatches.length > 3) {
        insights.push({
          type: 'usage-suggestion',
          priority: 'medium',
          title: 'Maximize Your Staple Ingredients',
          message: `You have great staples like ${commonIngredients.join(', ')}. Here are some creative ways to use them!`,
          ingredients: analysis.categories['Pantry'] || [],
          actionable: true,
          suggestedActions: [
            {
              action: 'explore-recipes',
              label: 'Explore creative recipes',
              data: { recipes: recipes.perfectMatches.slice(0, 3) }
            }
          ]
        });
      }
    }

    return insights;
  }

  private async generateStorageInsights(analysis: IngredientAnalysis): Promise<IngredientInsight[]> {
    const insights: IngredientInsight[] = [];

    // Storage optimization for frequently expiring categories
    const produceIngredients = analysis.categories['Produce'] || [];
    const expiringProduce = produceIngredients.filter(i => 
      getExpirationStatus(i.expirationDate) === 'expiring-soon'
    );

    if (expiringProduce.length > produceIngredients.length * 0.3) {
      insights.push({
        type: 'storage-tip',
        priority: 'medium',
        title: 'Optimize Produce Storage',
        message: 'Your produce is expiring frequently. Try these storage improvements to extend freshness.',
        ingredients: expiringProduce,
        actionable: true,
        suggestedActions: [
          {
            action: 'learn-storage',
            label: 'Learn proper storage techniques',
            data: { category: 'Produce' }
          }
        ]
      });
    }

    return insights;
  }

  private async generateWasteReductionInsights(analysis: IngredientAnalysis): Promise<IngredientInsight[]> {
    const insights: IngredientInsight[] = [];

    const totalWasteRisk = analysis.expired.length + analysis.expiringSoon.length;
    const wastePercentage = (totalWasteRisk / analysis.total) * 100;

    if (wastePercentage > 15) {
      insights.push({
        type: 'waste-reduction',
        priority: 'high',
        title: 'Reduce Food Waste',
        message: `${Math.round(wastePercentage)}% of your ingredients are at risk of waste. Let's create a plan to use them efficiently!`,
        ingredients: [...analysis.expired, ...analysis.expiringSoon],
        actionable: true,
        suggestedActions: [
          {
            action: 'create-waste-reduction-plan',
            label: 'Create waste reduction meal plan',
            data: { 
              atRiskIngredients: totalWasteRisk,
              strategies: ['meal-prep', 'batch-cooking', 'creative-leftovers']
            }
          }
        ]
      });
    }

    return insights;
  }

  private prioritizeInsights(insights: IngredientInsight[], context?: QueryAnalysis): IngredientInsight[] {
    const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
    
    return insights.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by relevance to context
      if (context) {
        const aRelevance = this.calculateContextRelevance(a, context);
        const bRelevance = this.calculateContextRelevance(b, context);
        return bRelevance - aRelevance;
      }
      
      return 0;
    });
  }

  private calculateContextRelevance(insight: IngredientInsight, context: QueryAnalysis): number {
    let relevance = 0;
    
    // Check if insight ingredients match query ingredients
    const queryIngredients = context.entities.ingredients.map(i => i.toLowerCase());
    const insightIngredients = insight.ingredients.map(i => i.name.toLowerCase());
    
    const matches = insightIngredients.filter(ingredient => 
      queryIngredients.includes(ingredient)
    ).length;
    
    relevance += matches * 10;
    
    // Boost relevance for certain query types
    if (context.intent === 'ingredient-management' && insight.type === 'expiration-alert') {
      relevance += 20;
    }
    
    return relevance;
  }

  private async createUsageOptimization(ingredient: Ingredient): Promise<UsageOptimization> {
    const recipes = await this.dataService.findRecipesWithIngredients([ingredient.name]);
    const expirationStatus = getExpirationStatus(ingredient.expirationDate);
    
    const now = new Date();
    const expirationDate = ingredient.expirationDate ? new Date(ingredient.expirationDate) : null;
    const expirationDays = expirationDate ? Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 30;
    
    // Calculate urgency score
    let urgencyScore = 0;
    if (expirationStatus === 'expired') {
      urgencyScore = 100;
    } else if (expirationDays <= 0) {
      urgencyScore = 95;
    } else if (expirationDays <= 2) {
      urgencyScore = 85;
    } else if (expirationDays <= 5) {
      urgencyScore = 65;
    } else if (expirationDays <= 7) {
      urgencyScore = 45;
    } else {
      urgencyScore = 25;
    }

    // Generate alternatives and storage improvements
    const alternatives = this.generateAlternativeUses(ingredient.name);
    const storageImprovement = this.generateStorageTip(ingredient);

    return {
      ingredient,
      recommendedRecipes: recipes.perfectMatches.concat(recipes.partialMatches).slice(0, 5),
      urgencyScore,
      expirationDays,
      alternatives,
      storageImprovement
    };
  }

  private generateAlternativeUses(ingredientName: string): string[] {
    const alternatives: Record<string, string[]> = {
      'banana': ['smoothies', 'banana bread', 'pancakes', 'freeze for later'],
      'spinach': ['smoothies', 'pasta sauce', 'soup', 'sautéed side dish'],
      'tomato': ['pasta sauce', 'soup', 'salsa', 'roasted side'],
      'herbs': ['herb oil', 'freeze in ice cubes', 'herb butter', 'pesto'],
      'bread': ['breadcrumbs', 'croutons', 'bread pudding', 'french toast']
    };

    const lowerName = ingredientName.toLowerCase();
    for (const [key, uses] of Object.entries(alternatives)) {
      if (lowerName.includes(key)) {
        return uses;
      }
    }

    return ['soup ingredient', 'stir-fry addition', 'freeze for later use'];
  }

  private generateStorageTip(ingredient: Ingredient): string | undefined {
    const tips: Record<string, string> = {
      'Produce': 'Store in crisper drawer with proper humidity settings',
      'Dairy': 'Keep at consistent cold temperature, use airtight containers',
      'Meat': 'Store on bottom shelf, use within 2-3 days or freeze',
      'Herbs': 'Store like flowers in water, or freeze in oil'
    };

    return tips[ingredient.category || 'Other'];
  }
}