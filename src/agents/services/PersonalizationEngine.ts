import { Recipe, Ingredient, MealPlan } from '@/types';
import { QueryAnalysis } from '../types';

export interface UserPreferences {
  dietary?: {
    restrictions: string[];
    preferences: string[];
    dislikes: string[];
  };
  cooking?: {
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
    preferredCookTime: number;
    preferredDifficulty: 'easy' | 'medium' | 'hard';
    favoriteEquipment: string[];
  };
  flavor?: {
    spiceLevel: 'mild' | 'medium' | 'spicy';
    favoriteCuisines: string[];
    flavorProfiles: string[];
  };
  lifestyle?: {
    mealPrepFriendly: boolean;
    budgetConscious: boolean;
    timeConstrained: boolean;
    healthFocused: boolean;
  };
  schedule?: {
    busyDays: string[];
    mealTimes: Record<string, string>;
    shoppingDays: string[];
  };
}

export interface LearningData {
  recipeInteractions: {
    recipeId: string;
    views: number;
    saves: number;
    makes: number;
    rating?: number;
    lastInteraction: Date;
  }[];
  ingredientUsage: {
    ingredientName: string;
    purchaseFrequency: number;
    usageRate: number;
    wasteRate: number;
    lastPurchased?: Date;
  }[];
  queryPatterns: {
    query: string;
    frequency: number;
    successfulResponses: number;
    lastAsked: Date;
  }[];
  mealPlanningPatterns: {
    preferredPlanningDay: string;
    averagePlansPerWeek: number;
    mostPlannedMealTypes: string[];
    planCompletionRate: number;
  };
  shoppingPatterns: {
    averageShoppingFrequency: number;
    preferredShoppingDays: string[];
    budgetRange: { min: number; max: number };
    impulseCategories: string[];
  };
}

export interface PersonalizedInsight {
  type: 'preference' | 'habit' | 'recommendation' | 'warning';
  category: 'cooking' | 'shopping' | 'meal_planning' | 'ingredient_management';
  message: string;
  confidence: number;
  actionable?: boolean;
  suggestedActions?: string[];
}

export class PersonalizationEngine {
  private preferences: UserPreferences;
  private learningData: LearningData;

  constructor(initialPreferences?: UserPreferences, initialLearningData?: LearningData) {
    this.preferences = initialPreferences || this.getDefaultPreferences();
    this.learningData = initialLearningData || this.getEmptyLearningData();
  }

  async personalizeResponse(baseResponse: any, context: { query?: QueryAnalysis; user?: any }): Promise<any> {
    const personalizedResponse = { ...baseResponse };

    // Adjust recommendations based on dietary preferences
    if (personalizedResponse.recommendations) {
      personalizedResponse.recommendations = this.filterByDietaryPreferences(
        personalizedResponse.recommendations
      );
    }

    // Adjust cooking suggestions based on skill level
    if (personalizedResponse.suggestions && this.preferences.cooking?.skillLevel) {
      personalizedResponse.suggestions = this.adjustForSkillLevel(
        personalizedResponse.suggestions,
        this.preferences.cooking.skillLevel
      );
    }

    // Add personalized insights
    personalizedResponse.personalizedInsights = await this.generatePersonalizedInsights(context);

    // Adjust tone and complexity based on user patterns
    if (context.query) {
      personalizedResponse.tone = this.determineOptimalTone(context.query);
    }

    return personalizedResponse;
  }

  async learnFromInteraction(interaction: {
    type: 'query' | 'recipe_view' | 'recipe_save' | 'recipe_make' | 'ingredient_purchase' | 'meal_plan';
    data: any;
    outcome: 'positive' | 'negative' | 'neutral';
  }): Promise<void> {
    const timestamp = new Date();

    switch (interaction.type) {
      case 'query':
        await this.updateQueryPatterns(interaction.data.query, interaction.outcome, timestamp);
        break;
      case 'recipe_view':
        await this.updateRecipeInteraction(interaction.data.recipeId, 'views', timestamp);
        break;
      case 'recipe_save':
        await this.updateRecipeInteraction(interaction.data.recipeId, 'saves', timestamp);
        break;
      case 'recipe_make':
        await this.updateRecipeInteraction(interaction.data.recipeId, 'makes', timestamp);
        if (interaction.data.rating) {
          await this.updateRecipeRating(interaction.data.recipeId, interaction.data.rating);
        }
        break;
      case 'ingredient_purchase':
        await this.updateIngredientUsage(interaction.data.ingredientName, 'purchase', timestamp);
        break;
      case 'meal_plan':
        await this.updateMealPlanningPatterns(interaction.data, timestamp);
        break;
    }

    // Update preferences based on patterns
    await this.updatePreferencesFromLearning();
  }

  async generatePersonalizedInsights(context: { query?: QueryAnalysis; user?: any }): Promise<PersonalizedInsight[]> {
    const insights: PersonalizedInsight[] = [];

    // Analyze ingredient waste patterns
    const wasteInsights = this.analyzeIngredientWaste();
    insights.push(...wasteInsights);

    // Analyze cooking patterns
    const cookingInsights = this.analyzeCookingPatterns();
    insights.push(...cookingInsights);

    // Analyze meal planning efficiency
    const planningInsights = this.analyzeMealPlanningEfficiency();
    insights.push(...planningInsights);

    // Generate contextual recommendations
    if (context.query) {
      const contextualInsights = this.generateContextualInsights(context.query);
      insights.push(...contextualInsights);
    }

    return insights.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  async updatePreferences(newPreferences: Partial<UserPreferences>): Promise<void> {
    this.preferences = {
      ...this.preferences,
      ...newPreferences,
      dietary: { ...this.preferences.dietary, ...newPreferences.dietary },
      cooking: { ...this.preferences.cooking, ...newPreferences.cooking },
      flavor: { ...this.preferences.flavor, ...newPreferences.flavor },
      lifestyle: { ...this.preferences.lifestyle, ...newPreferences.lifestyle },
      schedule: { ...this.preferences.schedule, ...newPreferences.schedule }
    };
  }

  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  getLearningData(): LearningData {
    return { ...this.learningData };
  }

  private filterByDietaryPreferences(recommendations: any[]): any[] {
    if (!this.preferences.dietary) return recommendations;

    return recommendations.filter(rec => {
      // Filter out restricted items
      if (this.preferences.dietary!.restrictions.some(restriction => 
        this.containsRestriction(rec, restriction)
      )) {
        return false;
      }

      // Filter out disliked items
      if (this.preferences.dietary!.dislikes.some(dislike => 
        this.containsIngredient(rec, dislike)
      )) {
        return false;
      }

      return true;
    });
  }

  private adjustForSkillLevel(suggestions: string[], skillLevel: string): string[] {
    const skillMap = {
      beginner: ['simple', 'easy', 'basic', 'quick'],
      intermediate: ['moderate', 'standard', 'balanced'],
      advanced: ['complex', 'gourmet', 'challenging', 'technique-focused']
    };

    const skillKeywords = skillMap[skillLevel as keyof typeof skillMap] || skillMap.intermediate;
    
    return suggestions.map(suggestion => {
      // Adjust language based on skill level
      if (skillLevel === 'beginner') {
        return suggestion.replace(/advanced|complex|difficult/gi, 'simple');
      } else if (skillLevel === 'advanced') {
        return suggestion.replace(/simple|basic|easy/gi, 'elevated');
      }
      return suggestion;
    });
  }

  private determineOptimalTone(query: QueryAnalysis): 'casual' | 'instructional' | 'encouraging' | 'professional' {
    // Analyze query complexity and user patterns
    if (query.complexity === 'high' || this.preferences.cooking?.skillLevel === 'advanced') {
      return 'professional';
    }
    
    if (this.preferences.cooking?.skillLevel === 'beginner') {
      return 'encouraging';
    }
    
    if (query.patterns.includes('help') || query.patterns.includes('how')) {
      return 'instructional';
    }
    
    return 'casual';
  }

  private async updateQueryPatterns(query: string, outcome: string, timestamp: Date): Promise<void> {
    const existing = this.learningData.queryPatterns.find(qp => qp.query === query);
    
    if (existing) {
      existing.frequency++;
      existing.lastAsked = timestamp;
      if (outcome === 'positive') {
        existing.successfulResponses++;
      }
    } else {
      this.learningData.queryPatterns.push({
        query,
        frequency: 1,
        successfulResponses: outcome === 'positive' ? 1 : 0,
        lastAsked: timestamp
      });
    }
  }

  private async updateRecipeInteraction(recipeId: string, interactionType: 'views' | 'saves' | 'makes', timestamp: Date): Promise<void> {
    const existing = this.learningData.recipeInteractions.find(ri => ri.recipeId === recipeId);
    
    if (existing) {
      existing[interactionType]++;
      existing.lastInteraction = timestamp;
    } else {
      this.learningData.recipeInteractions.push({
        recipeId,
        views: interactionType === 'views' ? 1 : 0,
        saves: interactionType === 'saves' ? 1 : 0,
        makes: interactionType === 'makes' ? 1 : 0,
        lastInteraction: timestamp
      });
    }
  }

  private async updateRecipeRating(recipeId: string, rating: number): Promise<void> {
    const existing = this.learningData.recipeInteractions.find(ri => ri.recipeId === recipeId);
    if (existing) {
      existing.rating = rating;
    }
  }

  private async updateIngredientUsage(ingredientName: string, action: 'purchase' | 'use', timestamp: Date): Promise<void> {
    const existing = this.learningData.ingredientUsage.find(iu => iu.ingredientName === ingredientName);
    
    if (existing) {
      if (action === 'purchase') {
        existing.purchaseFrequency++;
        existing.lastPurchased = timestamp;
      } else {
        existing.usageRate++;
      }
    } else {
      this.learningData.ingredientUsage.push({
        ingredientName,
        purchaseFrequency: action === 'purchase' ? 1 : 0,
        usageRate: action === 'use' ? 1 : 0,
        wasteRate: 0,
        lastPurchased: action === 'purchase' ? timestamp : undefined
      });
    }
  }

  private async updateMealPlanningPatterns(planData: any, timestamp: Date): Promise<void> {
    // Update meal planning patterns based on user behavior
    const dayOfWeek = timestamp.toLocaleDateString('en-US', { weekday: 'long' });
    
    // This would be more sophisticated in a real implementation
    this.learningData.mealPlanningPatterns.preferredPlanningDay = dayOfWeek;
    this.learningData.mealPlanningPatterns.averagePlansPerWeek = 
      Math.min(this.learningData.mealPlanningPatterns.averagePlansPerWeek + 0.1, 7);
  }

  private async updatePreferencesFromLearning(): Promise<void> {
    // Analyze patterns and update preferences
    const topRecipes = this.learningData.recipeInteractions
      .filter(ri => ri.saves > 0 || ri.makes > 0)
      .sort((a, b) => (b.saves + b.makes) - (a.saves + a.makes))
      .slice(0, 10);

    // This would analyze recipe patterns to infer dietary preferences
    // For now, this is a placeholder for the learning logic
  }

  private analyzeIngredientWaste(): PersonalizedInsight[] {
    const insights: PersonalizedInsight[] = [];
    
    const highWasteItems = this.learningData.ingredientUsage
      .filter(iu => iu.wasteRate > iu.usageRate * 0.3)
      .sort((a, b) => b.wasteRate - a.wasteRate);

    if (highWasteItems.length > 0) {
      insights.push({
        type: 'warning',
        category: 'ingredient_management',
        message: `You tend to waste ${highWasteItems[0].ingredientName}. Consider buying smaller quantities or finding more recipes that use it.`,
        confidence: 0.8,
        actionable: true,
        suggestedActions: [
          `Find recipes using ${highWasteItems[0].ingredientName}`,
          'Set expiration reminders',
          'Buy smaller quantities'
        ]
      });
    }

    return insights;
  }

  private analyzeCookingPatterns(): PersonalizedInsight[] {
    const insights: PersonalizedInsight[] = [];
    
    const averageCookFrequency = this.learningData.recipeInteractions
      .reduce((acc, ri) => acc + ri.makes, 0) / 30; // per month

    if (averageCookFrequency < 5) {
      insights.push({
        type: 'recommendation',
        category: 'cooking',
        message: 'You could benefit from more simple, quick recipes to cook more often at home.',
        confidence: 0.7,
        actionable: true,
        suggestedActions: [
          'Show me 15-minute recipes',
          'Find one-pot meals',
          'Suggest meal prep ideas'
        ]
      });
    }

    return insights;
  }

  private analyzeMealPlanningEfficiency(): PersonalizedInsight[] {
    const insights: PersonalizedInsight[] = [];
    
    if (this.learningData.mealPlanningPatterns.planCompletionRate < 0.6) {
      insights.push({
        type: 'habit',
        category: 'meal_planning',
        message: 'Your meal plans often go unfinished. Consider planning fewer meals or simpler recipes.',
        confidence: 0.75,
        actionable: true,
        suggestedActions: [
          'Plan only 3-4 meals per week',
          'Choose backup quick recipes',
          'Build flexible meal plans'
        ]
      });
    }

    return insights;
  }

  private generateContextualInsights(query: QueryAnalysis): PersonalizedInsight[] {
    const insights: PersonalizedInsight[] = [];
    
    // Generate insights based on current query and historical patterns
    if (query.intent === 'recipe_search') {
      const similarQueries = this.learningData.queryPatterns.filter(qp => 
        qp.query.toLowerCase().includes(query.originalQuery.toLowerCase())
      );
      
      if (similarQueries.length > 0 && similarQueries[0].successfulResponses / similarQueries[0].frequency > 0.8) {
        insights.push({
          type: 'preference',
          category: 'cooking',
          message: 'Based on your history, you usually enjoy the recipes I suggest for this type of request.',
          confidence: 0.9
        });
      }
    }

    return insights;
  }

  private containsRestriction(recipe: any, restriction: string): boolean {
    // Simplified restriction checking
    const restrictionMap: Record<string, string[]> = {
      'vegetarian': ['meat', 'chicken', 'beef', 'pork', 'fish'],
      'vegan': ['meat', 'chicken', 'beef', 'pork', 'fish', 'dairy', 'eggs', 'cheese'],
      'gluten-free': ['wheat', 'flour', 'bread', 'pasta'],
      'dairy-free': ['milk', 'cheese', 'butter', 'cream', 'yogurt']
    };

    const forbiddenIngredients = restrictionMap[restriction.toLowerCase()] || [];
    return forbiddenIngredients.some(ingredient => 
      recipe.name?.toLowerCase().includes(ingredient) ||
      recipe.ingredients?.some((ing: any) => 
        ing.name?.toLowerCase().includes(ingredient)
      )
    );
  }

  private containsIngredient(recipe: any, ingredient: string): boolean {
    return recipe.name?.toLowerCase().includes(ingredient.toLowerCase()) ||
           recipe.ingredients?.some((ing: any) => 
             ing.name?.toLowerCase().includes(ingredient.toLowerCase())
           );
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      dietary: {
        restrictions: [],
        preferences: [],
        dislikes: []
      },
      cooking: {
        skillLevel: 'intermediate',
        preferredCookTime: 30,
        preferredDifficulty: 'medium',
        favoriteEquipment: []
      },
      flavor: {
        spiceLevel: 'medium',
        favoriteCuisines: [],
        flavorProfiles: []
      },
      lifestyle: {
        mealPrepFriendly: false,
        budgetConscious: false,
        timeConstrained: false,
        healthFocused: false
      },
      schedule: {
        busyDays: [],
        mealTimes: {},
        shoppingDays: []
      }
    };
  }

  private getEmptyLearningData(): LearningData {
    return {
      recipeInteractions: [],
      ingredientUsage: [],
      queryPatterns: [],
      mealPlanningPatterns: {
        preferredPlanningDay: 'Sunday',
        averagePlansPerWeek: 0,
        mostPlannedMealTypes: [],
        planCompletionRate: 1.0
      },
      shoppingPatterns: {
        averageShoppingFrequency: 7,
        preferredShoppingDays: ['Saturday'],
        budgetRange: { min: 50, max: 150 },
        impulseCategories: []
      }
    };
  }
}