/**
 * Sous Chef Agent - Main Intelligence Coordinator
 * 
 * This is the primary agent that coordinates all intelligence engines to provide
 * comprehensive cooking assistance. It extends the base agent architecture and
 * integrates query processing, recommendations, personalization, and context awareness.
 */

import {
  AgentRequest,
  AgentResponse,
  AgentConfig,
  UserContext,
  QueryIntent,
  ConfidenceLevel,
  ResponsePriority,
  AgentResponseData
} from '../types';
import { BaseSousChefAgent } from '../base/base-agent';
import { getUserRecipes } from '@/lib/firebase/firestore';
import { QueryProcessor, QueryAnalysis } from './QueryProcessor';
import { RecommendationEngine, EnhancedRecommendation } from './RecommendationEngine';
import { PersonalizationEngine, CookingPattern, FlavorProfile, SkillAssessment } from './PersonalizationEngine';
import { ContextEngine, EnvironmentalContext, ContextualRecommendations } from './ContextEngine';
import { agentInteractionService, agentPreferencesService } from '../services';

/**
 * Sous Chef Agent Configuration
 */
const SOUS_CHEF_CONFIG: AgentConfig = {
  id: 'sous-chef',
  name: 'Sous Chef Assistant',
  description: 'Intelligent cooking assistant that provides personalized recipe recommendations, meal planning, and cooking guidance',
  supportedIntents: [
    'recipe-search',
    'recipe-recommendation',
    'meal-planning',
    'ingredient-management',
    'shopping-list',
    'nutrition-info',
    'cooking-tips',
    'substitution-help',
    'dietary-guidance'
  ],
  priority: 10, // Highest priority agent
  maxProcessingTime: 10000, // 10 seconds max
  enabled: true,
  settings: {
    maxRecommendations: 10,
    learningEnabled: true,
    contextAwarenessLevel: 'high',
    personalizationLevel: 'adaptive'
  }
};

/**
 * Enhanced response data specific to Sous Chef
 */
interface SousChefResponseData extends AgentResponseData {
  /** Enhanced recipe recommendations */
  enhancedRecommendations?: EnhancedRecommendation[];
  
  /** Contextual insights */
  contextualInsights?: {
    environmentalFactors: string[];
    personalizedSuggestions: string[];
    optimalTiming: string;
    skillConsiderations: string[];
  };
  
  /** Learning insights for the user */
  learningInsights?: {
    detectedPatterns: string[];
    skillProgression: string[];
    suggestedChallenges: string[];
  };
  
  /** Optimization recommendations */
  optimizations?: {
    timeOptimizations: string[];
    ingredientOptimizations: string[];
    techniqueImprovements: string[];
  };
}

/**
 * Main Sous Chef Agent class
 */
export class SousChefAgent extends BaseSousChefAgent {
  protected config = SOUS_CHEF_CONFIG;
  
  private queryProcessor: QueryProcessor;
  private recommendationEngine: RecommendationEngine;
  private personalizationEngine: PersonalizationEngine;
  private contextEngine: ContextEngine;
  
  // Caching for performance
  private userPatternCache = new Map<string, { patterns: CookingPattern; timestamp: number }>();
  private userProfileCache = new Map<string, { profile: FlavorProfile; timestamp: number }>();
  private userSkillCache = new Map<string, { skill: SkillAssessment; timestamp: number }>();
  private readonly cacheTimeout = 30 * 60 * 1000; // 30 minutes

  constructor() {
    super();
    this.queryProcessor = new QueryProcessor();
    this.recommendationEngine = new RecommendationEngine();
    this.personalizationEngine = new PersonalizationEngine();
    this.contextEngine = new ContextEngine();
  }

  /**
   * Check if this agent can handle the request
   */
  protected canHandle(request: AgentRequest): boolean {
    // Sous Chef can handle all cooking-related intents
    if (request.intent && this.config.supportedIntents.includes(request.intent)) {
      return true;
    }

    // Use query processor to analyze if this is cooking-related
    const analysis = this.queryProcessor.analyzeQuery(request.query, request.context);
    return this.config.supportedIntents.includes(analysis.intent);
  }

  /**
   * Main request processing method
   */
  protected async processRequest(request: AgentRequest): Promise<AgentResponse> {
    try {
      // Phase 1: Query Analysis and Intent Detection
      const queryAnalysis = await this.analyzeQuery(request);
      
      // Phase 2: User Profiling and Personalization
      const userProfile = await this.buildUserProfile(request.context, queryAnalysis);
      
      // Phase 3: Context Analysis
      const environmentalContext = await this.analyzeContext(request.context, queryAnalysis);
      
      // Phase 4: Generate Intelligent Response
      const response = await this.generateIntelligentResponse(
        request,
        queryAnalysis,
        userProfile,
        environmentalContext
      );
      
      // Phase 5: Learning and Optimization
      await this.updateLearning(request, response, queryAnalysis, userProfile);
      
      return response;
      
    } catch (error) {
      console.error('Error in Sous Chef processing:', error);
      throw error;
    }
  }

  /**
   * Phase 1: Analyze query and detect intent
   */
  private async analyzeQuery(request: AgentRequest): Promise<QueryAnalysis> {
    // Use query processor for initial analysis
    let analysis = this.queryProcessor.analyzeQuery(request.query, request.context);
    
    // Override intent if explicitly provided
    if (request.intent) {
      analysis.intent = request.intent;
      analysis.confidence = Math.max(analysis.confidence, 0.8);
    }
    
    return analysis;
  }

  /**
   * Phase 2: Build comprehensive user profile
   */
  private async buildUserProfile(context: UserContext, queryAnalysis: QueryAnalysis): Promise<{
    patterns: CookingPattern;
    flavorProfile: FlavorProfile;
    skillAssessment: SkillAssessment;
    preferences: any;
  }> {
    const userId = context.user.id;
    
    try {
      // Get user preferences
      const preferences = await agentPreferencesService.getUserPreferences(userId);
      
      // Get user interaction history
      const interactions = await agentInteractionService.getRecentInteractions(userId, 100);
      
      // Build cooking patterns (with caching)
      let patterns = this.getCachedPatterns(userId);
      if (!patterns) {
        patterns = this.personalizationEngine.analyzeCookingPatterns(interactions);
        this.cacheUserPatterns(userId, patterns);
      }
      
      // Build flavor profile (with caching)
      let flavorProfile = this.getCachedProfile(userId);
      if (!flavorProfile) {
        flavorProfile = this.personalizationEngine.buildFlavorProfile(interactions);
        this.cacheUserProfile(userId, flavorProfile);
      }
      
      // Assess skill level (with caching)
      let skillAssessment = this.getCachedSkill(userId);
      if (!skillAssessment) {
        skillAssessment = this.personalizationEngine.assessSkillLevel(interactions, context);
        this.cacheUserSkill(userId, skillAssessment);
      }
      
      // Personalize the query analysis
      const personalizedAnalysis = this.personalizationEngine.personalizeQuery(
        queryAnalysis,
        patterns,
        flavorProfile,
        skillAssessment,
        context
      );
      
      return {
        patterns,
        flavorProfile,
        skillAssessment,
        preferences
      };
      
    } catch (error) {
      console.error('Error building user profile:', error);
      // Return defaults if profiling fails
      return {
        patterns: this.personalizationEngine.analyzeCookingPatterns([]),
        flavorProfile: this.personalizationEngine.buildFlavorProfile([]),
        skillAssessment: this.personalizationEngine.assessSkillLevel([], context),
        preferences: null
      };
    }
  }

  /**
   * Phase 3: Analyze environmental and contextual factors
   */
  private async analyzeContext(
    userContext: UserContext,
    queryAnalysis: QueryAnalysis
  ): Promise<{
    environmental: EnvironmentalContext;
    recommendations: ContextualRecommendations;
  }> {
    try {
      // Analyze environmental context
      const environmental = this.contextEngine.analyzeEnvironmentalContext(userContext);
      
      // Generate contextual recommendations
      const recommendations = this.contextEngine.generateContextualRecommendations(
        environmental,
        queryAnalysis,
        userContext
      );
      
      return { environmental, recommendations };
      
    } catch (error) {
      console.error('Error analyzing context:', error);
      // Return minimal context if analysis fails
      return {
        environmental: {
          temporal: {
            timeOfDay: userContext.sessionContext.timeOfDay,
            dayOfWeek: 'monday',
            season: 'spring',
            month: 'January',
            isWeekend: false,
            isHoliday: false,
            timeUntilNextMeal: 240
          },
          location: { timezone: userContext.sessionContext.timezone, seasonalProduce: [] },
          kitchen: {
            availableEquipment: [],
            kitchenSize: 'medium',
            storageCapacity: 'adequate',
            timeAvailable: 60,
            energyLevel: 'medium',
            noiseRestrictions: false
          },
          social: {
            companionCount: 1,
            guestTypes: ['adults'],
            occasion: 'casual',
            dietaryRestrictions: [],
            budgetConstraints: 'moderate'
          }
        },
        recommendations: {
          timeRecommendations: { suggestedMealTypes: [], optimalCookingWindow: 60, prepTimeRecommendations: [], energyConsiderations: [] },
          seasonalRecommendations: { ingredientSuggestions: [], cookingMethodSuggestions: [], nutritionalFocus: [], comfortFactors: [] },
          socialRecommendations: { portionAdjustments: 1, complexityAdjustments: 'same', presentationSuggestions: [], servingStyleSuggestions: [] },
          environmentalAdaptations: { equipmentAlternatives: {}, timeAdjustments: [], temperatureConsiderations: [], storageRecommendations: [] },
          moodAdaptations: { effortLevel: 'moderate', comfortFactors: [], motivationalSuggestions: [], simplicityRecommendations: [] }
        }
      };
    }
  }

  /**
   * Phase 4: Generate intelligent response based on intent
   */
  private async generateIntelligentResponse(
    request: AgentRequest,
    queryAnalysis: QueryAnalysis,
    userProfile: any,
    contextData: any
  ): Promise<AgentResponse> {
    const { intent } = queryAnalysis;
    
    switch (intent) {
      case 'recipe-recommendation':
        return await this.handleRecipeRecommendation(request, queryAnalysis, userProfile, contextData);
      
      case 'recipe-search':
        return await this.handleRecipeSearch(request, queryAnalysis, userProfile, contextData);
      
      case 'meal-planning':
        return await this.handleMealPlanning(request, queryAnalysis, userProfile, contextData);
      
      case 'ingredient-management':
        return await this.handleIngredientManagement(request, queryAnalysis, userProfile, contextData);
      
      case 'shopping-list':
        return await this.handleShoppingList(request, queryAnalysis, userProfile, contextData);
      
      case 'nutrition-info':
        return await this.handleNutritionInfo(request, queryAnalysis, userProfile, contextData);
      
      case 'cooking-tips':
        return await this.handleCookingTips(request, queryAnalysis, userProfile, contextData);
      
      case 'substitution-help':
        return await this.handleSubstitutionHelp(request, queryAnalysis, userProfile, contextData);
      
      case 'dietary-guidance':
        return await this.handleDietaryGuidance(request, queryAnalysis, userProfile, contextData);
      
      default:
        return await this.handleGeneralHelp(request, queryAnalysis, userProfile, contextData);
    }
  }

  /**
   * Handle recipe recommendation requests
   */
  private async handleRecipeRecommendation(
    request: AgentRequest,
    queryAnalysis: QueryAnalysis,
    userProfile: any,
    contextData: any
  ): Promise<AgentResponse> {
    try {
      // Get user's recipes
      const recipes = await getUserRecipes(request.context.user.id);
      
      // Generate enhanced recommendations
      const enhancedRecommendations = this.recommendationEngine.generateEnhancedRecommendations(
        recipes,
        queryAnalysis,
        request.context,
        userProfile.preferences?.preferences,
        []
      );
      
      // Limit to top recommendations
      const topRecommendations = enhancedRecommendations.slice(0, this.config.settings.maxRecommendations);
      
      // Generate response message
      const message = this.generateRecommendationMessage(topRecommendations, queryAnalysis, contextData);
      
      // Create response data
      const responseData: SousChefResponseData = {
        recipes: topRecommendations.map(r => r.recipe),
        enhancedRecommendations: topRecommendations,
        contextualInsights: {
          environmentalFactors: this.extractEnvironmentalFactors(contextData),
          personalizedSuggestions: this.generatePersonalizedSuggestions(userProfile, queryAnalysis),
          optimalTiming: this.generateOptimalTiming(contextData),
          skillConsiderations: this.generateSkillConsiderations(userProfile.skillAssessment)
        }
      };
      
      return this.createResponse(
        request,
        message,
        this.calculateResponseConfidence(topRecommendations, queryAnalysis),
        'medium',
        {
          data: responseData,
          followUpSuggestions: this.generateFollowUpSuggestions(queryAnalysis.intent, request.context),
          suggestedActions: this.generateSuggestedActions(topRecommendations, queryAnalysis)
        }
      );
      
    } catch (error) {
      console.error('Error handling recipe recommendation:', error);
      throw error;
    }
  }

  /**
   * Handle recipe search requests
   */
  private async handleRecipeSearch(
    request: AgentRequest,
    queryAnalysis: QueryAnalysis,
    userProfile: any,
    contextData: any
  ): Promise<AgentResponse> {
    // Similar implementation to recommendation but with search focus
    return await this.handleRecipeRecommendation(request, queryAnalysis, userProfile, contextData);
  }

  /**
   * Handle meal planning requests
   */
  private async handleMealPlanning(
    request: AgentRequest,
    queryAnalysis: QueryAnalysis,
    userProfile: any,
    contextData: any
  ): Promise<AgentResponse> {
    try {
      const recipes = await getUserRecipes(request.context.user.id);
      
      // Generate meal plan recommendation
      const mealPlanRecommendation = this.recommendationEngine.generateMealPlanRecommendations(
        recipes,
        queryAnalysis,
        request.context,
        7 // Default to weekly planning
      );
      
      const message = `I've created a personalized meal plan for you! This plan balances nutrition, uses your available ingredients efficiently, and fits your cooking schedule.`;
      
      const responseData: SousChefResponseData = {
        mealPlans: mealPlanRecommendation.mealPlan,
        contextualInsights: {
          environmentalFactors: [`Optimized for ${contextData.environmental.temporal.timeOfDay} planning`],
          personalizedSuggestions: [`Based on your ${userProfile.patterns.complexityPreference.weekdays} weekday preferences`],
          optimalTiming: this.generateOptimalTiming(contextData),
          skillConsiderations: [`Matched to your ${userProfile.skillAssessment.overallLevel} skill level`]
        }
      };
      
      return this.createResponse(
        request,
        message,
        'high',
        'medium',
        {
          data: responseData,
          followUpSuggestions: [
            "Would you like me to create a shopping list for this meal plan?",
            "Should I suggest prep-ahead techniques?",
            "Would you like nutritional breakdown for each meal?"
          ]
        }
      );
      
    } catch (error) {
      console.error('Error handling meal planning:', error);
      throw error;
    }
  }

  /**
   * Handle ingredient management requests
   */
  private async handleIngredientManagement(
    request: AgentRequest,
    queryAnalysis: QueryAnalysis,
    userProfile: any,
    contextData: any
  ): Promise<AgentResponse> {
    const availableIngredients = request.context.availableIngredients;
    const expiringIngredients = availableIngredients.filter(ing => 
      ing.expirationDate && new Date(ing.expirationDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    );
    
    let message = `You have ${availableIngredients.length} ingredients in your inventory. `;
    
    if (expiringIngredients.length > 0) {
      message += `${expiringIngredients.length} ingredients are expiring soon. I recommend using them first!`;
    } else {
      message += `Everything looks fresh! Let me suggest some recipes that make great use of what you have.`;
    }
    
    const responseData: SousChefResponseData = {
      ingredients: availableIngredients,
      contextualInsights: {
        environmentalFactors: [`Current season: ${contextData.environmental.temporal.season}`],
        personalizedSuggestions: this.generateIngredientSuggestions(availableIngredients, userProfile),
        optimalTiming: expiringIngredients.length > 0 ? 'Use expiring ingredients within 3 days' : 'No urgency',
        skillConsiderations: [`Consider ${userProfile.skillAssessment.overallLevel} level techniques`]
      }
    };
    
    return this.createResponse(
      request,
      message,
      'high',
      expiringIngredients.length > 0 ? 'high' : 'medium',
      {
        data: responseData,
        followUpSuggestions: this.generateIngredientFollowUps(availableIngredients, expiringIngredients)
      }
    );
  }

  // Helper methods for response generation

  private generateRecommendationMessage(
    recommendations: EnhancedRecommendation[],
    queryAnalysis: QueryAnalysis,
    contextData: any
  ): string {
    if (recommendations.length === 0) {
      return "I couldn't find any recipes that match your current criteria. Try adjusting your requirements or adding more ingredients to your inventory.";
    }
    
    const topRecipe = recommendations[0];
    const count = Math.min(recommendations.length, 3);
    
    let message = `I found ${recommendations.length} great recipe${recommendations.length !== 1 ? 's' : ''} for you! `;
    message += `Here are my top ${count} recommendation${count !== 1 ? 's' : ''}: `;
    
    const topRecipes = recommendations.slice(0, count);
    const recipeNames = topRecipes.map(r => r.recipe.title).join(', ');
    message += recipeNames + '. ';
    
    // Add contextual insight
    if (topRecipe.aiExplanation) {
      message += topRecipe.aiExplanation;
    }
    
    return message;
  }

  private calculateResponseConfidence(
    recommendations: EnhancedRecommendation[],
    queryAnalysis: QueryAnalysis
  ): ConfidenceLevel {
    if (recommendations.length === 0) return 'very-low';
    
    const avgScore = recommendations.slice(0, 3).reduce((sum, r) => sum + r.intelligenceScore, 0) / Math.min(3, recommendations.length);
    
    if (avgScore >= 80) return 'very-high';
    if (avgScore >= 65) return 'high';
    if (avgScore >= 50) return 'medium';
    if (avgScore >= 35) return 'low';
    return 'very-low';
  }

  private extractEnvironmentalFactors(contextData: any): string[] {
    const factors = [];
    const env = contextData.environmental;
    
    factors.push(`${env.temporal.timeOfDay} cooking session`);
    
    if (env.temporal.isWeekend) {
      factors.push('Weekend cooking opportunity');
    }
    
    if (env.location.weatherCondition) {
      factors.push(`${env.location.weatherCondition} weather considerations`);
    }
    
    factors.push(`${env.temporal.season} seasonal ingredients available`);
    
    return factors;
  }

  private generatePersonalizedSuggestions(userProfile: any, queryAnalysis: QueryAnalysis): string[] {
    const suggestions = [];
    
    if (userProfile.skillAssessment.overallLevel === 'beginner') {
      suggestions.push('Focus on simple techniques to build confidence');
    } else if (userProfile.skillAssessment.overallLevel === 'advanced') {
      suggestions.push('Try challenging techniques to expand your skills');
    }
    
    const topCuisine = Object.keys(userProfile.flavorProfile.cuisinePreferences)[0];
    if (topCuisine) {
      suggestions.push(`Your favorite ${topCuisine} cuisine flavors featured`);
    }
    
    return suggestions;
  }

  private generateOptimalTiming(contextData: any): string {
    const timeAvailable = contextData.environmental.kitchen.timeAvailable;
    const timeOfDay = contextData.environmental.temporal.timeOfDay;
    
    return `Best cooking window: ${timeAvailable} minutes available for ${timeOfDay} cooking`;
  }

  private generateSkillConsiderations(skillAssessment: SkillAssessment): string[] {
    const considerations = [];
    
    considerations.push(`Recipes matched to ${skillAssessment.overallLevel} skill level`);
    
    if (skillAssessment.learningTrajectory.suggestedNextSkills.length > 0) {
      const nextSkill = skillAssessment.learningTrajectory.suggestedNextSkills[0];
      considerations.push(`Opportunity to practice: ${nextSkill}`);
    }
    
    return considerations;
  }

  private generateSuggestedActions(
    recommendations: EnhancedRecommendation[],
    queryAnalysis: QueryAnalysis
  ): Array<{ label: string; action: string; data?: Record<string, any> }> {
    const actions = [];
    
    if (recommendations.length > 0) {
      const topRecipe = recommendations[0];
      actions.push({
        label: `Cook ${topRecipe.recipe.title}`,
        action: 'start_cooking',
        data: { recipeId: topRecipe.recipe.id }
      });
      
      actions.push({
        label: 'Add to meal plan',
        action: 'add_to_meal_plan',
        data: { recipeId: topRecipe.recipe.id }
      });
      
      if (topRecipe.missingIngredients.length > 0) {
        actions.push({
          label: 'Add missing ingredients to shopping list',
          action: 'add_to_shopping_list',
          data: { ingredients: topRecipe.missingIngredients.map(ing => ing.name) }
        });
      }
    }
    
    return actions;
  }

  private generateIngredientSuggestions(ingredients: any[], userProfile: any): string[] {
    const suggestions = [];
    
    if (ingredients.length > 10) {
      suggestions.push('Great ingredient variety for diverse cooking options');
    } else if (ingredients.length < 5) {
      suggestions.push('Consider stocking staple ingredients for more recipe options');
    }
    
    const proteins = ingredients.filter(ing => 
      ['chicken', 'beef', 'fish', 'eggs', 'tofu'].some(protein => 
        ing.name.toLowerCase().includes(protein)
      )
    );
    
    if (proteins.length === 0) {
      suggestions.push('Add protein sources for complete meals');
    }
    
    return suggestions;
  }

  private generateIngredientFollowUps(available: any[], expiring: any[]): string[] {
    const followUps = [];
    
    if (expiring.length > 0) {
      followUps.push(`Show me recipes using ${expiring[0].name}`);
      followUps.push('What can I make with expiring ingredients?');
    }
    
    followUps.push('Suggest recipes with my available ingredients');
    followUps.push('What ingredients should I buy next?');
    
    return followUps;
  }

  // Placeholder implementations for other intent handlers
  private async handleShoppingList(request: AgentRequest, queryAnalysis: QueryAnalysis, userProfile: any, contextData: any): Promise<AgentResponse> {
    return this.createResponse(request, "I can help you optimize your shopping list based on your meal plans and current inventory.", 'medium');
  }

  private async handleNutritionInfo(request: AgentRequest, queryAnalysis: QueryAnalysis, userProfile: any, contextData: any): Promise<AgentResponse> {
    return this.createResponse(request, "I can provide detailed nutritional information and suggest balanced meal options.", 'medium');
  }

  private async handleCookingTips(request: AgentRequest, queryAnalysis: QueryAnalysis, userProfile: any, contextData: any): Promise<AgentResponse> {
    return this.createResponse(request, "Here are some cooking tips tailored to your skill level and current context.", 'medium');
  }

  private async handleSubstitutionHelp(request: AgentRequest, queryAnalysis: QueryAnalysis, userProfile: any, contextData: any): Promise<AgentResponse> {
    return this.createResponse(request, "I can suggest ingredient substitutions based on what you have available.", 'medium');
  }

  private async handleDietaryGuidance(request: AgentRequest, queryAnalysis: QueryAnalysis, userProfile: any, contextData: any): Promise<AgentResponse> {
    return this.createResponse(request, "I can help you find recipes that meet your dietary restrictions and preferences.", 'medium');
  }

  private async handleGeneralHelp(request: AgentRequest, queryAnalysis: QueryAnalysis, userProfile: any, contextData: any): Promise<AgentResponse> {
    return this.createResponse(request, "I'm your personal sous chef! I can help with recipe recommendations, meal planning, cooking tips, and more. What would you like to cook today?", 'medium');
  }

  /**
   * Phase 5: Update learning and user model
   */
  private async updateLearning(
    request: AgentRequest,
    response: AgentResponse,
    queryAnalysis: QueryAnalysis,
    userProfile: any
  ): Promise<void> {
    try {
      // This would typically update user preferences based on the interaction
      // For now, we'll just log the successful interaction
      console.log('Learning update completed for user:', request.context.user.id);
    } catch (error) {
      console.error('Error updating learning:', error);
      // Don't throw here as this shouldn't break the response
    }
  }

  // Caching methods

  private getCachedPatterns(userId: string): CookingPattern | null {
    const cached = this.userPatternCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.patterns;
    }
    return null;
  }

  private cacheUserPatterns(userId: string, patterns: CookingPattern): void {
    this.userPatternCache.set(userId, { patterns, timestamp: Date.now() });
  }

  private getCachedProfile(userId: string): FlavorProfile | null {
    const cached = this.userProfileCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.profile;
    }
    return null;
  }

  private cacheUserProfile(userId: string, profile: FlavorProfile): void {
    this.userProfileCache.set(userId, { profile, timestamp: Date.now() });
  }

  private getCachedSkill(userId: string): SkillAssessment | null {
    const cached = this.userSkillCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.skill;
    }
    return null;
  }

  private cacheUserSkill(userId: string, skill: SkillAssessment): void {
    this.userSkillCache.set(userId, { skill, timestamp: Date.now() });
  }
}