/**
 * Recipe Intelligence Engine
 * 
 * Specialized subagent for recipe discovery, recommendation, and culinary guidance.
 * Works in parallel with other intelligence engines to provide smart recipe suggestions
 * based on ingredients, preferences, skill level, and contextual factors.
 */

import { Recipe, Ingredient, User } from '@/types';
import { AgentDataService, RecipeMatchResult } from '../services/AgentDataService';
import { QueryAnalysis } from '../sous-chef/QueryProcessor';
import { UserContext } from '../types';

/**
 * Recipe recommendation with intelligence scoring
 */
export interface IntelligentRecipeRecommendation {
  recipe: Recipe;
  matchScore: number; // 0-100
  reasoningFactors: {
    ingredientMatch: number;
    skillAlignment: number;
    timeAlignment: number;
    dietaryMatch: number;
    cuisinePreference: number;
    seasonality: number;
    popularityScore: number;
  };
  explanation: string;
  cookingTips: string[];
  modifications: string[];
  difficultyAdjustment?: {
    currentLevel: 'beginner' | 'intermediate' | 'advanced';
    suggestedModifications: string[];
  };
}

/**
 * Recipe discovery insights
 */
export interface RecipeDiscoveryInsight {
  type: 'skill-building' | 'cuisine-exploration' | 'ingredient-utilization' | 'seasonal-featured';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recipes: Recipe[];
  benefits: string[];
  actionable: boolean;
}

/**
 * Culinary skill assessment
 */
export interface SkillAssessment {
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  strengths: string[];
  areasForImprovement: string[];
  recommendedNextSteps: string[];
  skillProgression: {
    techniquesLearned: string[];
    cuisinesExplored: string[];
    complexityProgression: number; // 1-10
  };
}

/**
 * Recipe personalization profile
 */
export interface RecipePersonalizationProfile {
  preferredCuisines: string[];
  favoriteFlavors: string[];
  avoidedIngredients: string[];
  typicalCookingTime: number;
  skillProgression: SkillAssessment;
  dietaryPreferences: string[];
  cookingGoals: ('quick-meals' | 'healthy-eating' | 'skill-building' | 'budget-friendly' | 'family-meals')[];
}

/**
 * Main Recipe Intelligence Engine
 */
export class RecipeIntelligence {
  private personalizationCache = new Map<string, { profile: RecipePersonalizationProfile; timestamp: number }>();
  private readonly cacheTimeout = 30 * 60 * 1000; // 30 minutes

  constructor(private dataService: AgentDataService) {}

  /**
   * Generate intelligent recipe recommendations
   */
  async generateIntelligentRecommendations(
    context: UserContext,
    query?: QueryAnalysis,
    maxRecommendations: number = 5
  ): Promise<IntelligentRecipeRecommendation[]> {
    // Get base recipe matches
    const ingredients = query?.entities.ingredients || 
      (await this.dataService.getIngredientAnalysis()).expiringSoon.map(i => i.name);
    
    const recipeMatches = await this.dataService.findRecipesWithIngredients(ingredients);
    const allCandidates = [...recipeMatches.perfectMatches, ...recipeMatches.partialMatches];
    
    // Get or build personalization profile
    const profile = await this.buildPersonalizationProfile(context);
    
    // Score and rank recipes
    const scoredRecommendations: IntelligentRecipeRecommendation[] = [];
    
    for (const recipe of allCandidates) {
      const recommendation = await this.scoreRecipe(recipe, context, profile, query);
      scoredRecommendations.push(recommendation);
    }
    
    // Sort by match score and return top recommendations
    return scoredRecommendations
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxRecommendations);
  }

  /**
   * Discover new recipes based on exploration goals
   */
  async discoverNewRecipes(
    context: UserContext,
    explorationGoals: ('skill-building' | 'cuisine-exploration' | 'seasonal' | 'trending')[] = ['skill-building']
  ): Promise<RecipeDiscoveryInsight[]> {
    const insights: RecipeDiscoveryInsight[] = [];
    const profile = await this.buildPersonalizationProfile(context);
    const availableIngredients = context.availableIngredients.map(i => i.name);
    
    for (const goal of explorationGoals) {
      const insight = await this.generateDiscoveryInsight(goal, context, profile, availableIngredients);
      if (insight) insights.push(insight);
    }
    
    return insights.sort((a, b) => this.getPriorityScore(b.priority) - this.getPriorityScore(a.priority));
  }

  /**
   * Assess user's culinary skill progression
   */
  async assessCulinarySkills(context: UserContext): Promise<SkillAssessment> {
    const profile = await this.buildPersonalizationProfile(context);
    return profile.skillProgression;
  }

  /**
   * Generate contextual cooking suggestions
   */
  async generateContextualSuggestions(context: UserContext, timeContext: {
    timeOfDay: string;
    availableTime: number;
    occasion?: string;
  }): Promise<{
    primarySuggestion: IntelligentRecipeRecommendation;
    alternatives: IntelligentRecipeRecommendation[];
    reasoning: string;
  }> {
    const profile = await this.buildPersonalizationProfile(context);
    const ingredients = context.availableIngredients.map(i => i.name);
    
    // Create contextual query
    const contextualQuery: Partial<QueryAnalysis> = {
      intent: 'recipe-recommendation',
      entities: {
        ingredients,
        timeConstraints: { maxTotalTime: timeContext.availableTime },
        cuisines: [],
        mealTypes: [this.inferMealTypeFromTime(timeContext.timeOfDay)],
        dietaryRestrictions: profile.dietaryPreferences,
        servings: this.inferServingsFromContext(context),
        difficulty: this.mapSkillTodifficulty(profile.skillProgression.currentLevel),
        equipment: [],
        cookingMethods: []
      },
      confidence: 0.8,
      mood: {
        sentiment: 'neutral',
        energy: this.inferEnergyFromTime(timeContext.timeOfDay),
        urgency: timeContext.availableTime < 30 ? 'high' : 'medium',
        adventurous: profile.cookingGoals.includes('skill-building')
      },
      context: {
        timeOfDay: timeContext.timeOfDay,
        social: this.inferSocialContext(context),
        occasion: timeContext.occasion
      },
      queryBreakdown: {
        action: 'find',
        subject: 'recipe',
        modifiers: ['contextual'],
        questions: ['what']
      }
    };

    const recommendations = await this.generateIntelligentRecommendations(context, contextualQuery as QueryAnalysis, 4);
    
    if (recommendations.length === 0) {
      // Fallback to simple recommendations
      const fallbackRecipes = await this.dataService.findRecipesWithIngredients(ingredients.slice(0, 3));
      const fallback = await this.scoreRecipe(
        fallbackRecipes.perfectMatches[0] || fallbackRecipes.partialMatches[0],
        context,
        profile
      );
      
      return {
        primarySuggestion: fallback,
        alternatives: [],
        reasoning: "Based on your available ingredients, here's a simple option to get you cooking!"
      };
    }

    const primarySuggestion = recommendations[0];
    const alternatives = recommendations.slice(1, 4);
    
    const reasoning = this.generateContextualReasoning(primarySuggestion, timeContext, profile);

    return {
      primarySuggestion,
      alternatives,
      reasoning
    };
  }

  /**
   * Learn from user recipe interactions
   */
  async learnFromInteraction(
    recipeId: string,
    interaction: 'viewed' | 'cooked' | 'favorited' | 'skipped' | 'rated',
    context: UserContext,
    rating?: number
  ): Promise<void> {
    // This would typically update user preferences and learning models
    // For now, we'll implement basic preference learning
    
    const userId = context.user.id;
    const profile = await this.buildPersonalizationProfile(context);
    
    // Update preferences based on interaction
    if (interaction === 'cooked' || interaction === 'favorited' || (interaction === 'rated' && (rating || 0) >= 4)) {
      // Positive interaction - learn preferences
      // This is simplified - in production would use more sophisticated ML
      await this.updatePositivePreferences(userId, recipeId, profile);
    } else if (interaction === 'skipped' || (interaction === 'rated' && (rating || 0) <= 2)) {
      // Negative interaction - avoid similar recommendations
      await this.updateNegativePreferences(userId, recipeId, profile);
    }
    
    // Cache updated profile
    this.personalizationCache.set(userId, {
      profile,
      timestamp: Date.now()
    });
  }

  // Private helper methods

  private async buildPersonalizationProfile(context: UserContext): Promise<RecipePersonalizationProfile> {
    const userId = context.user.id;
    
    // Check cache first
    const cached = this.personalizationCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.profile;
    }

    // Build profile from context and user data
    const profile: RecipePersonalizationProfile = {
      preferredCuisines: context.dietaryPreferences.preferredCuisines,
      favoriteFlavors: this.extractFavoriteFlavorsfromHistory(context),
      avoidedIngredients: context.dietaryPreferences.allergens,
      typicalCookingTime: this.inferTypicalCookingTime(context),
      skillProgression: this.assessSkillFromHistory(context),
      dietaryPreferences: context.dietaryPreferences.restrictions,
      cookingGoals: this.inferCookingGoals(context)
    };

    // Cache the profile
    this.personalizationCache.set(userId, {
      profile,
      timestamp: Date.now()
    });

    return profile;
  }

  private async scoreRecipe(
    recipe: Recipe,
    context: UserContext,
    profile: RecipePersonalizationProfile,
    query?: QueryAnalysis
  ): Promise<IntelligentRecipeRecommendation> {
    const factors = {
      ingredientMatch: this.calculateIngredientMatch(recipe, context.availableIngredients, query?.entities.ingredients),
      skillAlignment: this.calculateSkillAlignment(recipe, profile.skillProgression.currentLevel),
      timeAlignment: this.calculateTimeAlignment(recipe, query?.entities.timeConstraints?.maxTotalTime || 60),
      dietaryMatch: this.calculateDietaryMatch(recipe, profile.dietaryPreferences),
      cuisinePreference: this.calculateCuisinePreference(recipe, profile.preferredCuisines),
      seasonality: this.calculateSeasonality(recipe),
      popularityScore: this.calculatePopularityScore(recipe)
    };

    // Weighted average of all factors
    const weights = {
      ingredientMatch: 0.25,
      skillAlignment: 0.15,
      timeAlignment: 0.15,
      dietaryMatch: 0.20,
      cuisinePreference: 0.10,
      seasonality: 0.05,
      popularityScore: 0.10
    };

    const matchScore = Object.entries(factors).reduce((score, [key, value]) => {
      return score + (value * weights[key as keyof typeof weights]);
    }, 0);

    const explanation = this.generateRecommendationExplanation(recipe, factors, matchScore);
    const cookingTips = this.generateCookingTips(recipe, profile.skillProgression.currentLevel);
    const modifications = this.generateModifications(recipe, profile, context);
    const difficultyAdjustment = this.generateDifficultyAdjustment(recipe, profile.skillProgression.currentLevel);

    return {
      recipe,
      matchScore: Math.round(matchScore),
      reasoningFactors: factors,
      explanation,
      cookingTips,
      modifications,
      difficultyAdjustment
    };
  }

  private calculateIngredientMatch(recipe: Recipe, availableIngredients: Ingredient[], queryIngredients?: string[]): number {
    const recipeIngredients = recipe.ingredients.map(i => i.name.toLowerCase());
    const available = new Set(availableIngredients.map(i => i.name.toLowerCase()));
    const query = new Set((queryIngredients || []).map(i => i.toLowerCase()));

    let matches = 0;
    let total = recipeIngredients.length;

    for (const ingredient of recipeIngredients) {
      if (available.has(ingredient)) {
        matches += 1.0;
      } else if (query.has(ingredient)) {
        matches += 0.8; // Slight penalty for ingredients not in inventory but mentioned in query
      }
    }

    return (matches / total) * 100;
  }

  private calculateSkillAlignment(recipe: Recipe, userSkillLevel: 'beginner' | 'intermediate' | 'advanced'): number {
    const skillLevels = { beginner: 1, intermediate: 2, advanced: 3 };
    const recipeLevel = skillLevels[recipe.difficulty as keyof typeof skillLevels] || 2;
    const userLevel = skillLevels[userSkillLevel];

    if (recipeLevel === userLevel) return 100;
    if (recipeLevel === userLevel + 1) return 80; // Slight challenge is good
    if (recipeLevel === userLevel - 1) return 90; // Easier recipes are fine
    if (recipeLevel > userLevel + 1) return Math.max(0, 40 - (recipeLevel - userLevel) * 20); // Too difficult
    return 70; // Much easier than skill level
  }

  private calculateTimeAlignment(recipe: Recipe, availableTime: number): number {
    const totalTime = (recipe.prepTime || 15) + (recipe.cookTime || 15);
    if (totalTime <= availableTime) return 100;
    
    const overage = totalTime - availableTime;
    if (overage <= 15) return 80; // 15 minutes over is acceptable
    if (overage <= 30) return 60; // 30 minutes over is pushing it
    return Math.max(0, 40 - overage); // Linear decrease after that
  }

  private calculateDietaryMatch(recipe: Recipe, dietaryRestrictions: string[]): number {
    if (dietaryRestrictions.length === 0) return 100;

    // Simple dietary matching - in production would be more sophisticated
    const recipeIngredients = recipe.ingredients.map(i => i.name.toLowerCase()).join(' ');
    let violations = 0;

    const dietaryChecks: Record<string, string[]> = {
      'vegetarian': ['chicken', 'beef', 'pork', 'fish', 'meat'],
      'vegan': ['chicken', 'beef', 'pork', 'fish', 'meat', 'cheese', 'milk', 'eggs', 'butter'],
      'gluten-free': ['wheat', 'flour', 'bread', 'pasta'],
      'dairy-free': ['cheese', 'milk', 'butter', 'cream', 'yogurt'],
      'keto': ['rice', 'pasta', 'bread', 'potato', 'sugar']
    };

    for (const restriction of dietaryRestrictions) {
      const forbiddenIngredients = dietaryChecks[restriction.toLowerCase()] || [];
      for (const forbidden of forbiddenIngredients) {
        if (recipeIngredients.includes(forbidden)) {
          violations++;
          break;
        }
      }
    }

    return Math.max(0, 100 - (violations * 50));
  }

  private calculateCuisinePreference(recipe: Recipe, preferredCuisines: string[]): number {
    if (preferredCuisines.length === 0) return 100;
    
    const recipeCuisine = (recipe.cuisine || 'other').toLowerCase();
    const hasPreference = preferredCuisines.some(cuisine => 
      recipeCuisine.includes(cuisine.toLowerCase())
    );

    return hasPreference ? 100 : 70; // Not a strong negative, just not preferred
  }

  private calculateSeasonality(recipe: Recipe): number {
    const now = new Date();
    const month = now.getMonth();
    
    // Simple seasonality based on ingredients - could be more sophisticated
    const recipeIngredients = recipe.ingredients.map(i => i.name.toLowerCase()).join(' ');
    
    const seasonalIngredients = {
      spring: ['asparagus', 'peas', 'strawberry', 'spinach'],
      summer: ['tomato', 'corn', 'zucchini', 'berries'],
      fall: ['pumpkin', 'squash', 'apple', 'sweet potato'],
      winter: ['root vegetables', 'citrus', 'brussels sprouts', 'cabbage']
    };

    let season: keyof typeof seasonalIngredients;
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'fall';
    else season = 'winter';

    const seasonalBonus = seasonalIngredients[season].some(ingredient => 
      recipeIngredients.includes(ingredient)
    ) ? 20 : 0;

    return 80 + seasonalBonus; // Base score with seasonal bonus
  }

  private calculatePopularityScore(recipe: Recipe): number {
    // In production, this would be based on actual user data
    // For now, using simple heuristics
    let score = 70; // Base popularity

    if (recipe.category?.includes('popular')) score += 20;
    if (recipe.difficulty === 'easy') score += 10;
    if ((recipe.prepTime || 30) <= 30) score += 10;

    return Math.min(100, score);
  }

  private generateRecommendationExplanation(recipe: Recipe, factors: any, matchScore: number): string {
    const reasons: string[] = [];

    if (factors.ingredientMatch > 80) {
      reasons.push(`uses ${Math.round(factors.ingredientMatch)}% of your available ingredients`);
    }
    
    if (factors.skillAlignment > 90) {
      reasons.push("perfectly matches your skill level");
    } else if (factors.skillAlignment > 70) {
      reasons.push("provides a good cooking challenge");
    }

    if (factors.timeAlignment > 90) {
      reasons.push("fits your available time perfectly");
    }

    if (factors.dietaryMatch > 90) {
      reasons.push("matches all your dietary preferences");
    }

    if (factors.seasonality > 90) {
      reasons.push("features seasonal ingredients");
    }

    const explanation = reasons.length > 0 
      ? `This recipe is recommended because it ${reasons.join(', ')}.`
      : `This recipe has a ${matchScore}% match with your preferences and available ingredients.`;

    return explanation;
  }

  private generateCookingTips(recipe: Recipe, skillLevel: 'beginner' | 'intermediate' | 'advanced'): string[] {
    const tips: string[] = [];
    
    // General tips based on skill level
    if (skillLevel === 'beginner') {
      tips.push("Read through the entire recipe before starting");
      tips.push("Prep all ingredients first (mise en place)");
      tips.push("Don't rush - take your time to learn the technique");
    } else if (skillLevel === 'intermediate') {
      tips.push("Focus on timing - start with longer-cooking components first");
      tips.push("Taste and adjust seasonings as you go");
    } else {
      tips.push("Consider experimenting with additional herbs or spices");
      tips.push("Think about presentation and plating");
    }

    // Recipe-specific tips based on cooking method
    const cookingMethods = recipe.instructions.toLowerCase();
    if (cookingMethods.includes('sauté')) {
      tips.push("Heat the pan before adding oil for better searing");
    }
    if (cookingMethods.includes('bake')) {
      tips.push("Preheat your oven completely before baking");
    }

    return tips.slice(0, 3); // Limit to 3 tips
  }

  private generateModifications(recipe: Recipe, profile: RecipePersonalizationProfile, context: UserContext): string[] {
    const modifications: string[] = [];

    // Dietary modifications
    if (profile.dietaryPreferences.includes('vegetarian')) {
      const recipeText = recipe.instructions.toLowerCase();
      if (recipeText.includes('chicken')) {
        modifications.push("Replace chicken with tofu, tempeh, or extra vegetables");
      }
      if (recipeText.includes('beef')) {
        modifications.push("Substitute beef with mushrooms or plant-based protein");
      }
    }

    // Time modifications
    const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
    if (totalTime > 45) {
      modifications.push("Prep ingredients in advance to reduce active cooking time");
      modifications.push("Consider making a larger batch for leftovers");
    }

    // Skill-based modifications
    if (profile.skillProgression.currentLevel === 'beginner') {
      modifications.push("Start with pre-chopped vegetables to save time and effort");
      modifications.push("Use store-bought sauces to simplify the recipe");
    }

    return modifications.slice(0, 3);
  }

  private generateDifficultyAdjustment(recipe: Recipe, skillLevel: 'beginner' | 'intermediate' | 'advanced') {
    const skillLevels = { beginner: 1, intermediate: 2, advanced: 3 };
    const recipeLevel = skillLevels[recipe.difficulty as keyof typeof skillLevels] || 2;
    const userLevel = skillLevels[skillLevel];

    if (recipeLevel <= userLevel) return undefined; // No adjustment needed

    const suggestedModifications: string[] = [];
    
    if (recipeLevel > userLevel) {
      suggestedModifications.push("Simplify by using pre-made components where possible");
      suggestedModifications.push("Break the recipe into steps you can do over multiple days");
      suggestedModifications.push("Watch video tutorials for unfamiliar techniques");
    }

    return {
      currentLevel: skillLevel,
      suggestedModifications
    };
  }

  // Additional helper methods for profile building

  private extractFavoriteFlavorsfromHistory(context: UserContext): string[] {
    // This would analyze user's recipe history in production
    // For now, return defaults based on dietary preferences
    const flavors: string[] = [];
    
    if (context.dietaryPreferences.preferredCuisines.includes('Italian')) {
      flavors.push('garlic', 'basil', 'tomato');
    }
    if (context.dietaryPreferences.preferredCuisines.includes('Mexican')) {
      flavors.push('cilantro', 'lime', 'chili');
    }
    
    return flavors.length > 0 ? flavors : ['garlic', 'lemon', 'herbs'];
  }

  private inferTypicalCookingTime(context: UserContext): number {
    // Analyze user's lifestyle and cooking patterns
    // For now, use simple heuristics
    const timeOfDay = context.sessionContext.timeOfDay;
    
    if (timeOfDay === 'morning') return 15; // Quick breakfast
    if (timeOfDay === 'afternoon') return 30; // Lunch prep
    if (timeOfDay === 'evening') return 45; // Dinner with more time
    
    return 30; // Default
  }

  private assessSkillFromHistory(context: UserContext): SkillAssessment {
    // In production, would analyze user's recipe completion history
    return {
      currentLevel: context.cookingSkillLevel,
      strengths: ['basic knife skills', 'following recipes'],
      areasForImprovement: ['seasoning', 'timing multiple dishes'],
      recommendedNextSteps: ['practice sautéing', 'learn mother sauces'],
      skillProgression: {
        techniquesLearned: ['boiling', 'baking', 'sautéing'],
        cuisinesExplored: context.dietaryPreferences.preferredCuisines,
        complexityProgression: context.cookingSkillLevel === 'beginner' ? 3 : 
                              context.cookingSkillLevel === 'intermediate' ? 6 : 9
      }
    };
  }

  private inferCookingGoals(context: UserContext): RecipePersonalizationProfile['cookingGoals'] {
    const goals: RecipePersonalizationProfile['cookingGoals'] = [];
    
    // Infer from context
    if (context.sessionContext.timeOfDay === 'morning') goals.push('quick-meals');
    if (context.dietaryPreferences.restrictions.length > 0) goals.push('healthy-eating');
    if (context.cookingSkillLevel === 'beginner') goals.push('skill-building');
    
    return goals.length > 0 ? goals : ['quick-meals', 'healthy-eating'];
  }

  // Additional helper methods

  private async generateDiscoveryInsight(
    goal: 'skill-building' | 'cuisine-exploration' | 'seasonal' | 'trending',
    context: UserContext,
    profile: RecipePersonalizationProfile,
    availableIngredients: string[]
  ): Promise<RecipeDiscoveryInsight | null> {
    // This would be more sophisticated in production
    switch (goal) {
      case 'skill-building':
        return {
          type: 'skill-building',
          priority: 'high',
          title: 'Level Up Your Cooking Skills',
          description: 'Try these recipes to learn new techniques',
          recipes: [], // Would fetch skill-appropriate recipes
          benefits: ['Learn new techniques', 'Build confidence', 'Expand repertoire'],
          actionable: true
        };
      
      case 'cuisine-exploration':
        const unexplored = ['Thai', 'Indian', 'Moroccan'].filter(
          cuisine => !profile.preferredCuisines.includes(cuisine)
        );
        
        if (unexplored.length > 0) {
          return {
            type: 'cuisine-exploration',
            priority: 'medium',
            title: `Explore ${unexplored[0]} Cuisine`,
            description: `Discover the flavors and techniques of ${unexplored[0]} cooking`,
            recipes: [], // Would fetch appropriate recipes
            benefits: ['Cultural exploration', 'New flavors', 'Cooking versatility'],
            actionable: true
          };
        }
        break;
    }
    
    return null;
  }

  private getPriorityScore(priority: 'high' | 'medium' | 'low'): number {
    return { high: 3, medium: 2, low: 1 }[priority];
  }

  private inferMealTypeFromTime(timeOfDay: string): string {
    const mapping: Record<string, string> = {
      'morning': 'breakfast',
      'afternoon': 'lunch',
      'evening': 'dinner',
      'night': 'snack'
    };
    return mapping[timeOfDay] || 'main';
  }

  private inferServingsFromContext(context: UserContext): number {
    // Simple heuristic - could be more sophisticated
    return 2; // Default to 2 servings
  }

  private mapSkillTodifficulty(skill: 'beginner' | 'intermediate' | 'advanced'): 'easy' | 'medium' | 'hard' {
    const mapping = {
      'beginner': 'easy' as const,
      'intermediate': 'medium' as const,
      'advanced': 'hard' as const
    };
    return mapping[skill];
  }

  private inferEnergyFromTime(timeOfDay: string): 'low' | 'medium' | 'high' {
    if (timeOfDay === 'morning') return 'medium';
    if (timeOfDay === 'afternoon') return 'high';
    if (timeOfDay === 'evening') return 'medium';
    return 'low';
  }

  private inferSocialContext(context: UserContext): 'solo' | 'couple' | 'family' | 'party' {
    // Simple inference - in production would be more sophisticated
    return 'solo'; // Default
  }

  private generateContextualReasoning(
    recommendation: IntelligentRecipeRecommendation,
    timeContext: any,
    profile: RecipePersonalizationProfile
  ): string {
    const factors: string[] = [];
    
    if (recommendation.reasoningFactors.ingredientMatch > 80) {
      factors.push("makes great use of your available ingredients");
    }
    
    if (recommendation.reasoningFactors.timeAlignment > 80) {
      factors.push(`fits perfectly in your ${timeContext.availableTime}-minute window`);
    }
    
    if (timeContext.timeOfDay === 'evening' && recommendation.recipe.category?.includes('comfort')) {
      factors.push("provides the comfort food perfect for evening dining");
    }
    
    const reasoning = factors.length > 0 
      ? `I recommend ${recommendation.recipe.name} because it ${factors.join(', ')}.`
      : `${recommendation.recipe.name} is a great choice for right now.`;
    
    return reasoning;
  }

  private async updatePositivePreferences(userId: string, recipeId: string, profile: RecipePersonalizationProfile): Promise<void> {
    // In production, would update user preference models
    // For now, just log the positive interaction
    console.log(`User ${userId} had positive interaction with recipe ${recipeId}`);
  }

  private async updateNegativePreferences(userId: string, recipeId: string, profile: RecipePersonalizationProfile): Promise<void> {
    // In production, would update user preference models
    // For now, just log the negative interaction
    console.log(`User ${userId} had negative interaction with recipe ${recipeId}`);
  }
}