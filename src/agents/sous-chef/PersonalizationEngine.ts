/**
 * Personalization Engine for Sous Chef Agent
 * 
 * Handles user preference learning, cooking pattern analysis, skill level adaptation,
 * and flavor profile building. This engine learns from user interactions to provide
 * increasingly personalized recommendations over time.
 */

import {
  UserContext,
  UserAgentPreferences,
  UserInteraction
} from '../types';
import { QueryAnalysis } from './QueryProcessor';

/**
 * User cooking pattern analysis
 */
export interface CookingPattern {
  /** Preferred cooking times by day of week */
  timePreferences: Record<string, string[]>;
  
  /** Preferred meal types by time of day */
  mealTypePreferences: Record<string, string[]>;
  
  /** Cooking frequency patterns */
  cookingFrequency: {
    weekdays: number;
    weekends: number;
    averagePerWeek: number;
  };
  
  /** Preferred recipe complexity */
  complexityPreference: {
    weekdays: 'easy' | 'medium' | 'hard';
    weekends: 'easy' | 'medium' | 'hard';
    when_tired: 'easy' | 'medium' | 'hard';
  };
  
  /** Seasonal cooking patterns */
  seasonalPatterns: Record<string, {
    preferredCuisines: string[];
    preferredMealTypes: string[];
    cookingMethods: string[];
  }>;
  
  /** Social cooking patterns */
  socialPatterns: Record<string, {
    preferredCuisines: string[];
    portionSizes: number;
    complexity: 'easy' | 'medium' | 'hard';
  }>;
}

/**
 * User flavor profile
 */
export interface FlavorProfile {
  /** Preferred flavor intensities */
  intensityPreferences: {
    sweet: number; // 0-10 scale
    salty: number;
    spicy: number;
    sour: number;
    umami: number;
    bitter: number;
  };
  
  /** Preferred spice level */
  spiceLevel: 'mild' | 'medium' | 'hot' | 'extra-hot';
  
  /** Texture preferences */
  texturePreferences: {
    crispy: number; // 0-10 preference scale
    creamy: number;
    chewy: number;
    soft: number;
    crunchy: number;
  };
  
  /** Cooking method preferences */
  cookingMethodPreferences: Record<string, number>; // method -> preference score
  
  /** Ingredient affinity scores */
  ingredientAffinities: Record<string, number>; // ingredient -> affinity score
  
  /** Cuisine preferences with confidence */
  cuisinePreferences: Record<string, {
    score: number;
    confidence: number;
    lastUpdated: Date;
  }>;
}

/**
 * Skill level assessment
 */
export interface SkillAssessment {
  /** Overall skill level */
  overallLevel: 'beginner' | 'intermediate' | 'advanced';
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Skill breakdown by area */
  skillAreas: {
    basicTechniques: number; // 0-10 scale
    knifework: number;
    timing: number;
    seasoning: number;
    heatControl: number;
    plating: number;
    baking: number;
    improvisation: number;
  };
  
  /** Learning trajectory */
  learningTrajectory: {
    recentImprovement: boolean;
    suggestedNextSkills: string[];
    challengeAreas: string[];
  };
  
  /** Equipment familiarity */
  equipmentFamiliarity: Record<string, number>; // equipment -> familiarity score
}

/**
 * Personalization insights
 */
export interface PersonalizationInsights {
  /** User cooking persona */
  persona: 'quick_cook' | 'weekend_chef' | 'health_focused' | 'comfort_seeker' | 'adventurous_eater' | 'budget_conscious';
  
  /** Confidence in persona assignment */
  personaConfidence: number;
  
  /** Key behavioral patterns */
  behaviorPatterns: string[];
  
  /** Recommended improvements */
  recommendations: string[];
  
  /** Areas for growth */
  growthAreas: string[];
  
  /** Predicted future preferences */
  predictedTrends: string[];
}

/**
 * Main Personalization Engine class
 */
export class PersonalizationEngine {
  private readonly learningThreshold = 5; // Minimum interactions to start learning
  private readonly confidenceDecayRate = 0.95; // Daily confidence decay
  private readonly patternWeights = {
    recent: 1.0,
    frequency: 0.8,
    success: 1.2,
    explicit: 1.5 // User explicitly stated preferences
  };

  constructor() {}

  /**
   * Analyze user cooking patterns from interaction history
   */
  analyzeCookingPatterns(interactions: UserInteraction[], currentPatterns?: CookingPattern): CookingPattern {
    if (interactions.length < this.learningThreshold) {
      return this.getDefaultCookingPattern();
    }

    // Group interactions by patterns
    const timePatterns = this.analyzeTimePatterns(interactions);
    const mealTypePatterns = this.analyzeMealTypePatterns(interactions);
    const frequencyPatterns = this.analyzeFrequencyPatterns(interactions);
    const complexityPatterns = this.analyzeComplexityPatterns(interactions);
    const seasonalPatterns = this.analyzeSeasonalPatterns(interactions);
    const socialPatterns = this.analyzeSocialPatterns(interactions);

    return {
      timePreferences: timePatterns,
      mealTypePreferences: mealTypePatterns,
      cookingFrequency: frequencyPatterns,
      complexityPreference: complexityPatterns,
      seasonalPatterns: seasonalPatterns,
      socialPatterns: socialPatterns
    };
  }

  /**
   * Build user flavor profile from successful recipes and feedback
   */
  buildFlavorProfile(interactions: UserInteraction[], currentProfile?: FlavorProfile): FlavorProfile {
    if (interactions.length < this.learningThreshold) {
      return this.getDefaultFlavorProfile();
    }

    // Filter for successful interactions
    const successfulInteractions = interactions.filter(i => 
      i.feedback?.helpful === true || (i.feedback?.rating && i.feedback.rating >= 4)
    );

    const intensityPreferences = this.analyzeFlavorIntensities(successfulInteractions);
    const spiceLevel = this.analyzeSpiceLevel(successfulInteractions);
    const texturePreferences = this.analyzeTexturePreferences(successfulInteractions);
    const cookingMethodPreferences = this.analyzeCookingMethodPreferences(successfulInteractions);
    const ingredientAffinities = this.analyzeIngredientAffinities(successfulInteractions);
    const cuisinePreferences = this.analyzeCuisinePreferences(successfulInteractions);

    return {
      intensityPreferences,
      spiceLevel,
      texturePreferences,
      cookingMethodPreferences,
      ingredientAffinities,
      cuisinePreferences
    };
  }

  /**
   * Assess user cooking skill level
   */
  assessSkillLevel(interactions: UserInteraction[], context: UserContext): SkillAssessment {
    if (interactions.length < this.learningThreshold) {
      return this.getDefaultSkillAssessment(context);
    }

    // Analyze recipe complexity progression
    const complexityProgression = this.analyzeComplexityProgression(interactions);
    
    // Analyze success rates by difficulty
    const successByDifficulty = this.analyzeSuccessByDifficulty(interactions);
    
    // Analyze technique usage
    const techniqueUsage = this.analyzeTechniqueUsage(interactions);
    
    // Calculate overall skill level
    const overallLevel = this.calculateOverallSkillLevel(complexityProgression, successByDifficulty);
    const confidence = this.calculateSkillConfidence(interactions);
    
    // Assess specific skill areas
    const skillAreas = this.assessSpecificSkills(interactions, techniqueUsage);
    
    // Determine learning trajectory
    const learningTrajectory = this.assessLearningTrajectory(interactions, complexityProgression);
    
    // Assess equipment familiarity
    const equipmentFamiliarity = this.assessEquipmentFamiliarity(interactions);

    return {
      overallLevel,
      confidence,
      skillAreas,
      learningTrajectory,
      equipmentFamiliarity
    };
  }

  /**
   * Generate personalization insights and recommendations
   */
  generateInsights(
    patterns: CookingPattern,
    flavorProfile: FlavorProfile,
    skillAssessment: SkillAssessment,
    interactions: UserInteraction[]
  ): PersonalizationInsights {
    // Determine cooking persona
    const persona = this.determinePersona(patterns, flavorProfile, skillAssessment);
    const personaConfidence = this.calculatePersonaConfidence(interactions, persona);
    
    // Identify key behavioral patterns
    const behaviorPatterns = this.identifyBehaviorPatterns(patterns, interactions);
    
    // Generate recommendations
    const recommendations = this.generatePersonalizedRecommendations(
      patterns,
      flavorProfile,
      skillAssessment
    );
    
    // Identify growth areas
    const growthAreas = this.identifyGrowthAreas(skillAssessment, patterns);
    
    // Predict future trends
    const predictedTrends = this.predictFutureTrends(interactions, patterns);

    return {
      persona,
      personaConfidence,
      behaviorPatterns,
      recommendations,
      growthAreas,
      predictedTrends
    };
  }

  /**
   * Personalize query analysis based on user profile
   */
  personalizeQuery(
    queryAnalysis: QueryAnalysis,
    patterns: CookingPattern,
    flavorProfile: FlavorProfile,
    skillAssessment: SkillAssessment,
    context: UserContext
  ): QueryAnalysis {
    // Create personalized copy
    const personalizedAnalysis = { ...queryAnalysis };

    // Adjust intent confidence based on user patterns
    personalizedAnalysis.confidence = this.adjustIntentConfidence(
      queryAnalysis,
      patterns,
      context
    );

    // Enhance entities with personalized preferences
    personalizedAnalysis.entities = this.enhanceEntitiesWithPreferences(
      queryAnalysis.entities,
      flavorProfile,
      patterns
    );

    // Adjust mood based on user personality
    personalizedAnalysis.mood = this.adjustMoodWithPersonality(
      queryAnalysis.mood,
      patterns,
      skillAssessment
    );

    return personalizedAnalysis;
  }

  /**
   * Get personalized recommendations for recipe selection
   */
  getPersonalizedFilters(
    patterns: CookingPattern,
    flavorProfile: FlavorProfile,
    skillAssessment: SkillAssessment,
    context: UserContext
  ): any {
    const filters: any = {};

    // Time-based filtering
    const currentTime = context.sessionContext.timeOfDay;
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase(); // mon, tue, etc.

    // Difficulty filtering based on context and skill
    if (currentTime === 'evening' && patterns.complexityPreference.weekdays === 'easy') {
      filters.maxDifficulty = 'easy';
    } else {
      filters.maxDifficulty = skillAssessment.overallLevel;
    }

    // Cuisine preferences
    const topCuisines = Object.entries(flavorProfile.cuisinePreferences)
      .sort(([,a], [,b]) => b.score - a.score)
      .slice(0, 3)
      .map(([cuisine]) => cuisine);
    
    if (topCuisines.length > 0) {
      filters.preferredCuisines = topCuisines;
    }

    // Time constraints based on patterns
    const timePrefs = patterns.timePreferences[dayOfWeek] || [];
    if (timePrefs.includes('quick')) {
      filters.maxTotalTime = 30;
    }

    // Spice level
    filters.maxSpiceLevel = flavorProfile.spiceLevel;

    return filters;
  }

  // Private helper methods

  private analyzeTimePatterns(interactions: UserInteraction[]): Record<string, string[]> {
    const patterns: Record<string, string[]> = {};
    
    for (const interaction of interactions) {
      const timeOfDay = interaction.request.context.sessionContext.timeOfDay;
      const dayOfWeek = new Date(interaction.metadata.createdAt).toLocaleDateString('en', { weekday: 'short' }).toLowerCase();
      
      if (!patterns[dayOfWeek]) {
        patterns[dayOfWeek] = [];
      }
      
      if (!patterns[dayOfWeek].includes(timeOfDay)) {
        patterns[dayOfWeek].push(timeOfDay);
      }
    }
    
    return patterns;
  }

  private analyzeMealTypePatterns(interactions: UserInteraction[]): Record<string, string[]> {
    const patterns: Record<string, string[]> = {};
    
    for (const interaction of interactions) {
      const timeOfDay = interaction.request.context.sessionContext.timeOfDay;
      const recipes = interaction.response.data?.recipes || [];
      
      if (!patterns[timeOfDay]) {
        patterns[timeOfDay] = [];
      }
      
      for (const recipe of recipes) {
        for (const mealType of recipe.mealType) {
          if (!patterns[timeOfDay].includes(mealType)) {
            patterns[timeOfDay].push(mealType);
          }
        }
      }
    }
    
    return patterns;
  }

  private analyzeFrequencyPatterns(interactions: UserInteraction[]): CookingPattern['cookingFrequency'] {
    const weeklyData = this.groupInteractionsByWeek(interactions);
    
    let totalWeekdays = 0;
    let totalWeekends = 0;
    let totalWeeks = weeklyData.length;
    
    for (const week of weeklyData) {
      totalWeekdays += week.weekdays;
      totalWeekends += week.weekends;
    }
    
    return {
      weekdays: totalWeeks > 0 ? totalWeekdays / totalWeeks : 0,
      weekends: totalWeeks > 0 ? totalWeekends / totalWeeks : 0,
      averagePerWeek: totalWeeks > 0 ? (totalWeekdays + totalWeekends) / totalWeeks : 0
    };
  }

  private analyzeComplexityPatterns(interactions: UserInteraction[]): CookingPattern['complexityPreference'] {
    const weekdayComplexity = this.getMostCommonComplexity(
      interactions.filter(i => this.isWeekday(i.metadata.createdAt))
    );
    
    const weekendComplexity = this.getMostCommonComplexity(
      interactions.filter(i => !this.isWeekday(i.metadata.createdAt))
    );
    
    // Analyze patterns when user seems tired (evening interactions with simple requests)
    const tiredComplexity = this.getMostCommonComplexity(
      interactions.filter(i => 
        i.request.context.sessionContext.timeOfDay === 'evening' &&
        i.request.query.includes('quick') || i.request.query.includes('easy')
      )
    );

    return {
      weekdays: weekdayComplexity || 'medium',
      weekends: weekendComplexity || 'medium',
      when_tired: tiredComplexity || 'easy'
    };
  }

  private analyzeSeasonalPatterns(interactions: UserInteraction[]): CookingPattern['seasonalPatterns'] {
    const seasonalData: Record<string, any> = {};
    
    for (const interaction of interactions) {
      const season = this.getSeasonFromDate(interaction.metadata.createdAt);
      const recipes = interaction.response.data?.recipes || [];
      
      if (!seasonalData[season]) {
        seasonalData[season] = {
          cuisines: new Map<string, number>(),
          mealTypes: new Map<string, number>(),
          cookingMethods: new Map<string, number>()
        };
      }
      
      for (const recipe of recipes) {
        // Count cuisine preferences
        seasonalData[season].cuisines.set(
          recipe.cuisine,
          (seasonalData[season].cuisines.get(recipe.cuisine) || 0) + 1
        );
        
        // Count meal types
        for (const mealType of recipe.mealType) {
          seasonalData[season].mealTypes.set(
            mealType,
            (seasonalData[season].mealTypes.get(mealType) || 0) + 1
          );
        }
        
        // Count cooking methods (would need to be extracted from recipes)
        // This is a simplified implementation
        const cookingMethod = this.extractCookingMethod(recipe);
        if (cookingMethod) {
          seasonalData[season].cookingMethods.set(
            cookingMethod,
            (seasonalData[season].cookingMethods.get(cookingMethod) || 0) + 1
          );
        }
      }
    }
    
    // Convert maps to sorted arrays
    const patterns: Record<string, any> = {};
    for (const [season, data] of Object.entries(seasonalData)) {
      patterns[season] = {
        preferredCuisines: this.getTopEntries(data.cuisines, 3),
        preferredMealTypes: this.getTopEntries(data.mealTypes, 3),
        cookingMethods: this.getTopEntries(data.cookingMethods, 3)
      };
    }
    
    return patterns;
  }

  private analyzeSocialPatterns(interactions: UserInteraction[]): CookingPattern['socialPatterns'] {
    // This would analyze patterns based on social context mentions in queries
    // Simplified implementation
    return {
      solo: { preferredCuisines: ['Italian', 'Asian'], portionSizes: 1, complexity: 'easy' },
      couple: { preferredCuisines: ['French', 'Italian'], portionSizes: 2, complexity: 'medium' },
      family: { preferredCuisines: ['American', 'Mexican'], portionSizes: 4, complexity: 'easy' },
      party: { preferredCuisines: ['Italian', 'Mexican'], portionSizes: 8, complexity: 'medium' }
    };
  }

  private analyzeFlavorIntensities(interactions: UserInteraction[]): FlavorProfile['intensityPreferences'] {
    // This would analyze flavor preferences from recipe data and feedback
    // Simplified implementation returning defaults
    return {
      sweet: 5,
      salty: 6,
      spicy: 4,
      sour: 3,
      umami: 7,
      bitter: 2
    };
  }

  private analyzeSpiceLevel(interactions: UserInteraction[]): FlavorProfile['spiceLevel'] {
    // Analyze spice preferences from successful recipes
    return 'medium'; // Simplified
  }

  private analyzeTexturePreferences(interactions: UserInteraction[]): FlavorProfile['texturePreferences'] {
    // Analyze texture preferences from recipe feedback
    return {
      crispy: 7,
      creamy: 6,
      chewy: 4,
      soft: 5,
      crunchy: 8
    };
  }

  private analyzeCookingMethodPreferences(interactions: UserInteraction[]): Record<string, number> {
    // Analyze preferred cooking methods
    return {
      'baking': 8,
      'sautéing': 9,
      'grilling': 7,
      'steaming': 5,
      'frying': 6
    };
  }

  private analyzeIngredientAffinities(interactions: UserInteraction[]): Record<string, number> {
    // Analyze ingredient preferences from successful recipes
    return {
      'chicken': 9,
      'garlic': 10,
      'onion': 8,
      'tomato': 7,
      'cheese': 9
    };
  }

  private analyzeCuisinePreferences(interactions: UserInteraction[]): FlavorProfile['cuisinePreferences'] {
    // Analyze cuisine preferences with confidence scores
    return {
      'Italian': { score: 9, confidence: 0.8, lastUpdated: new Date() },
      'Mexican': { score: 7, confidence: 0.6, lastUpdated: new Date() },
      'Asian': { score: 8, confidence: 0.7, lastUpdated: new Date() }
    };
  }

  // Additional helper methods would be implemented here...
  // Including skill assessment, persona determination, etc.

  private getDefaultCookingPattern(): CookingPattern {
    return {
      timePreferences: {},
      mealTypePreferences: {},
      cookingFrequency: { weekdays: 2, weekends: 1, averagePerWeek: 3 },
      complexityPreference: { weekdays: 'easy', weekends: 'medium', when_tired: 'easy' },
      seasonalPatterns: {},
      socialPatterns: {}
    };
  }

  private getDefaultFlavorProfile(): FlavorProfile {
    return {
      intensityPreferences: { sweet: 5, salty: 5, spicy: 5, sour: 5, umami: 5, bitter: 5 },
      spiceLevel: 'medium',
      texturePreferences: { crispy: 5, creamy: 5, chewy: 5, soft: 5, crunchy: 5 },
      cookingMethodPreferences: {},
      ingredientAffinities: {},
      cuisinePreferences: {}
    };
  }

  private getDefaultSkillAssessment(context: UserContext): SkillAssessment {
    return {
      overallLevel: context.cookingSkillLevel || 'intermediate',
      confidence: 0.5,
      skillAreas: {
        basicTechniques: 5,
        knifework: 5,
        timing: 5,
        seasoning: 5,
        heatControl: 5,
        plating: 5,
        baking: 5,
        improvisation: 5
      },
      learningTrajectory: {
        recentImprovement: false,
        suggestedNextSkills: [],
        challengeAreas: []
      },
      equipmentFamiliarity: {}
    };
  }

  // Utility methods
  private groupInteractionsByWeek(interactions: UserInteraction[]): Array<{weekdays: number, weekends: number}> {
    // Group interactions by week and count weekday vs weekend usage
    return []; // Simplified
  }

  private isWeekday(date: Date): boolean {
    const day = date.getDay();
    return day >= 1 && day <= 5;
  }

  private getMostCommonComplexity(interactions: UserInteraction[]): 'easy' | 'medium' | 'hard' | null {
    // Analyze most common recipe difficulty in interactions
    return 'medium'; // Simplified
  }

  private getSeasonFromDate(date: Date): string {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private extractCookingMethod(recipe: any): string | null {
    // Extract primary cooking method from recipe
    return null; // Simplified
  }

  private getTopEntries(map: Map<string, number>, count: number): string[] {
    return Array.from(map.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, count)
      .map(([key]) => key);
  }

  private analyzeComplexityProgression(interactions: UserInteraction[]): any {
    // Analyze how user's recipe complexity choices have evolved
    return {};
  }

  private analyzeSuccessByDifficulty(interactions: UserInteraction[]): any {
    // Analyze success rates for different difficulty levels
    return {};
  }

  private analyzeTechniqueUsage(interactions: UserInteraction[]): any {
    // Analyze cooking techniques used in successful recipes
    return {};
  }

  private calculateOverallSkillLevel(progression: any, successRates: any): 'beginner' | 'intermediate' | 'advanced' {
    // Calculate overall skill level from analysis
    return 'intermediate';
  }

  private calculateSkillConfidence(interactions: UserInteraction[]): number {
    // Calculate confidence in skill assessment
    return 0.7;
  }

  private assessSpecificSkills(interactions: UserInteraction[], techniques: any): SkillAssessment['skillAreas'] {
    // Assess specific skill areas
    return {
      basicTechniques: 6,
      knifework: 5,
      timing: 7,
      seasoning: 6,
      heatControl: 5,
      plating: 4,
      baking: 3,
      improvisation: 5
    };
  }

  private assessLearningTrajectory(interactions: UserInteraction[], progression: any): SkillAssessment['learningTrajectory'] {
    return {
      recentImprovement: true,
      suggestedNextSkills: ['Advanced knife techniques', 'Sauce making'],
      challengeAreas: ['Baking', 'Timing coordination']
    };
  }

  private assessEquipmentFamiliarity(interactions: UserInteraction[]): Record<string, number> {
    return {
      'oven': 8,
      'stovetop': 9,
      'grill': 6,
      'food processor': 4
    };
  }

  private determinePersona(patterns: CookingPattern, flavor: FlavorProfile, skill: SkillAssessment): PersonalizationInsights['persona'] {
    // Determine user's cooking persona based on all factors
    return 'weekend_chef';
  }

  private calculatePersonaConfidence(interactions: UserInteraction[], persona: string): number {
    return 0.8;
  }

  private identifyBehaviorPatterns(patterns: CookingPattern, interactions: UserInteraction[]): string[] {
    return ['Prefers quick weekday meals', 'Adventurous on weekends'];
  }

  private generatePersonalizedRecommendations(patterns: CookingPattern, flavor: FlavorProfile, skill: SkillAssessment): string[] {
    return ['Try more advanced techniques on weekends', 'Explore spicier cuisines'];
  }

  private identifyGrowthAreas(skill: SkillAssessment, patterns: CookingPattern): string[] {
    return ['Baking skills', 'Sauce techniques'];
  }

  private predictFutureTrends(interactions: UserInteraction[], patterns: CookingPattern): string[] {
    return ['Interest in healthy cooking', 'Growing confidence with complex recipes'];
  }

  private adjustIntentConfidence(query: QueryAnalysis, patterns: CookingPattern, context: UserContext): number {
    return query.confidence;
  }

  private enhanceEntitiesWithPreferences(entities: any, flavor: FlavorProfile, patterns: CookingPattern): any {
    return entities;
  }

  private adjustMoodWithPersonality(mood: any, patterns: CookingPattern, skill: SkillAssessment): any {
    return mood;
  }
}