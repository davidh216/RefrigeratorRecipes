/**
 * Query Processor for Sous Chef Agent
 * 
 * Handles natural language processing, intent recognition, and constraint extraction
 * from user queries. This is the input processing layer that analyzes what users
 * want and extracts actionable information.
 */

import {
  QueryIntent,
  AgentRequest,
  UserContext
} from '../types';

/**
 * Structure for extracted query information
 */
export interface QueryAnalysis {
  /** Primary intent detected from the query */
  intent: QueryIntent;
  
  /** Confidence score for intent detection (0-1) */
  confidence: number;
  
  /** Extracted entities and constraints */
  entities: {
    /** Mentioned ingredients */
    ingredients: string[];
    
    /** Mentioned cuisine types */
    cuisines: string[];
    
    /** Mentioned meal types */
    mealTypes: string[];
    
    /** Mentioned dietary restrictions */
    dietaryRestrictions: string[];
    
    /** Time constraints */
    timeConstraints: {
      maxPrepTime?: number;
      maxCookTime?: number;
      maxTotalTime?: number;
    };
    
    /** Budget constraints */
    budgetConstraints: {
      maxCost?: number;
      economical?: boolean;
    };
    
    /** Serving size */
    servings?: number;
    
    /** Difficulty preference */
    difficulty?: 'easy' | 'medium' | 'hard';
    
    /** Equipment mentioned */
    equipment: string[];
    
    /** Cooking methods */
    cookingMethods: string[];
  };
  
  /** Detected mood or emotional context */
  mood: {
    sentiment: 'positive' | 'neutral' | 'negative';
    energy: 'low' | 'medium' | 'high';
    urgency: 'low' | 'medium' | 'high';
    adventurous: boolean;
  };
  
  /** Contextual factors */
  context: {
    timeOfDay: string;
    season?: string;
    social?: 'solo' | 'couple' | 'family' | 'party';
    occasion?: string;
  };
  
  /** Original query broken down */
  queryBreakdown: {
    action: string;
    subject: string;
    modifiers: string[];
    questions: string[];
  };
}

/**
 * Query Processor class that analyzes user input
 */
export class QueryProcessor {
  private readonly intentPatterns: Map<QueryIntent, RegExp[]>;
  private readonly ingredientKeywords: Set<string>;
  private readonly cuisineKeywords: Map<string, string[]>;
  private readonly mealTypeKeywords: Map<string, string[]>;
  private readonly dietaryKeywords: Map<string, string[]>;
  private readonly timeKeywords: Map<string, number>;
  private readonly moodKeywords: Map<string, { sentiment?: string; energy?: string; urgency?: string; adventurous?: boolean }>;
  private readonly equipmentKeywords: Set<string>;
  private readonly cookingMethodKeywords: Set<string>;

  constructor() {
    this.intentPatterns = this.initializeIntentPatterns();
    this.ingredientKeywords = this.initializeIngredientKeywords();
    this.cuisineKeywords = this.initializeCuisineKeywords();
    this.mealTypeKeywords = this.initializeMealTypeKeywords();
    this.dietaryKeywords = this.initializeDietaryKeywords();
    this.timeKeywords = this.initializeTimeKeywords();
    this.moodKeywords = this.initializeMoodKeywords();
    this.equipmentKeywords = this.initializeEquipmentKeywords();
    this.cookingMethodKeywords = this.initializeCookingMethodKeywords();
  }

  /**
   * Main entry point for query processing
   */
  analyzeQuery(query: string, context: UserContext): QueryAnalysis {
    const normalizedQuery = this.normalizeQuery(query);
    const tokens = this.tokenizeQuery(normalizedQuery);
    
    // Extract core information
    const intent = this.detectIntent(normalizedQuery, context);
    const confidence = this.calculateIntentConfidence(intent, normalizedQuery, context);
    const entities = this.extractEntities(tokens, normalizedQuery);
    const mood = this.analyzeMood(normalizedQuery, context);
    const contextInfo = this.analyzeContext(normalizedQuery, context);
    const queryBreakdown = this.breakdownQuery(normalizedQuery);

    return {
      intent,
      confidence,
      entities,
      mood,
      context: contextInfo,
      queryBreakdown
    };
  }

  /**
   * Normalize query text for processing
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Tokenize query into words
   */
  private tokenizeQuery(query: string): string[] {
    return query.split(' ').filter(token => token.length > 1);
  }

  /**
   * Detect primary intent from query
   */
  private detectIntent(query: string, context: UserContext): QueryIntent {
    let bestIntent: QueryIntent = 'general-help';
    let highestScore = 0;

    // Check each intent pattern
    for (const [intent, patterns] of this.intentPatterns.entries()) {
      let score = 0;
      
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          score += 1;
        }
      }
      
      // Boost score based on context
      score = this.adjustIntentScore(score, intent, query, context);
      
      if (score > highestScore) {
        highestScore = score;
        bestIntent = intent;
      }
    }

    return bestIntent;
  }

  /**
   * Calculate confidence for detected intent
   */
  private calculateIntentConfidence(intent: QueryIntent, query: string, context: UserContext): number {
    const patterns = this.intentPatterns.get(intent) || [];
    let matchCount = 0;
    
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        matchCount++;
      }
    }
    
    // Base confidence from pattern matches
    let confidence = Math.min(matchCount / patterns.length, 1.0);
    
    // Adjust based on context alignment
    confidence = this.adjustConfidenceForContext(confidence, intent, context);
    
    // Ensure minimum confidence
    return Math.max(confidence, 0.1);
  }

  /**
   * Extract entities and constraints from query
   */
  private extractEntities(tokens: string[], query: string): QueryAnalysis['entities'] {
    return {
      ingredients: this.extractIngredients(tokens, query),
      cuisines: this.extractCuisines(tokens),
      mealTypes: this.extractMealTypes(tokens),
      dietaryRestrictions: this.extractDietaryRestrictions(tokens),
      timeConstraints: this.extractTimeConstraints(query),
      budgetConstraints: this.extractBudgetConstraints(query),
      servings: this.extractServings(query),
      difficulty: this.extractDifficulty(tokens),
      equipment: this.extractEquipment(tokens),
      cookingMethods: this.extractCookingMethods(tokens)
    };
  }

  /**
   * Analyze mood and emotional context
   */
  private analyzeMood(query: string, context: UserContext): QueryAnalysis['mood'] {
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let energy: 'low' | 'medium' | 'high' = 'medium';
    let urgency: 'low' | 'medium' | 'high' = 'low';
    let adventurous = false;

    // Analyze mood keywords
    for (const [keyword, moodData] of this.moodKeywords.entries()) {
      if (query.includes(keyword)) {
        if (moodData.sentiment) sentiment = moodData.sentiment as any;
        if (moodData.energy) energy = moodData.energy as any;
        if (moodData.urgency) urgency = moodData.urgency as any;
        if (moodData.adventurous !== undefined) adventurous = moodData.adventurous;
      }
    }

    // Context-based mood adjustment
    if (context.sessionContext.timeOfDay === 'morning') {
      energy = energy === 'medium' ? 'high' : energy;
    } else if (context.sessionContext.timeOfDay === 'night') {
      energy = energy === 'medium' ? 'low' : energy;
    }

    // Urgency from time constraints
    if (query.includes('quick') || query.includes('fast') || query.includes('urgent')) {
      urgency = 'high';
    }

    return { sentiment, energy, urgency, adventurous };
  }

  /**
   * Analyze contextual information
   */
  private analyzeContext(query: string, context: UserContext): QueryAnalysis['context'] {
    // Determine season (could be enhanced with actual date)
    const month = new Date().getMonth();
    let season: string | undefined;
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'fall';
    else season = 'winter';

    // Detect social context
    let social: 'solo' | 'couple' | 'family' | 'party' | undefined;
    if (query.includes('family') || query.includes('kids')) social = 'family';
    else if (query.includes('date') || query.includes('romantic')) social = 'couple';
    else if (query.includes('party') || query.includes('guests')) social = 'party';
    else social = 'solo';

    // Detect occasion
    let occasion: string | undefined;
    if (query.includes('birthday')) occasion = 'birthday';
    else if (query.includes('holiday')) occasion = 'holiday';
    else if (query.includes('celebration')) occasion = 'celebration';
    else if (query.includes('dinner party')) occasion = 'dinner party';

    return {
      timeOfDay: context.sessionContext.timeOfDay,
      season,
      social,
      occasion
    };
  }

  /**
   * Break down query structure
   */
  private breakdownQuery(query: string): QueryAnalysis['queryBreakdown'] {
    const tokens = query.split(' ');
    
    // Extract action words
    const actionWords = ['make', 'cook', 'prepare', 'find', 'suggest', 'recommend', 'plan', 'create'];
    const action = tokens.find(token => actionWords.includes(token)) || 'find';
    
    // Extract subject (usually noun phrases)
    const subjectWords = ['recipe', 'meal', 'dish', 'food', 'dinner', 'lunch', 'breakfast'];
    const subject = tokens.find(token => subjectWords.includes(token)) || 'recipe';
    
    // Extract modifiers (adjectives and descriptive words)
    const modifierWords = ['quick', 'easy', 'healthy', 'delicious', 'simple', 'vegetarian', 'spicy'];
    const modifiers = tokens.filter(token => modifierWords.includes(token));
    
    // Extract questions
    const questionWords = ['what', 'how', 'when', 'where', 'why', 'which'];
    const questions = tokens.filter(token => questionWords.includes(token));

    return { action, subject, modifiers, questions };
  }

  // Entity extraction helper methods

  private extractIngredients(tokens: string[], query: string): string[] {
    const ingredients: string[] = [];
    
    // Check against known ingredient keywords
    for (const token of tokens) {
      if (this.ingredientKeywords.has(token)) {
        ingredients.push(token);
      }
    }
    
    // Look for "with X" or "using X" patterns
    const withPattern = /with\s+([a-z\s]+?)(?:\s|$)/g;
    const usingPattern = /using\s+([a-z\s]+?)(?:\s|$)/g;
    
    let match;
    while ((match = withPattern.exec(query)) !== null) {
      const ingredient = match[1].trim();
      if (ingredient && !ingredients.includes(ingredient)) {
        ingredients.push(ingredient);
      }
    }
    
    while ((match = usingPattern.exec(query)) !== null) {
      const ingredient = match[1].trim();
      if (ingredient && !ingredients.includes(ingredient)) {
        ingredients.push(ingredient);
      }
    }
    
    return ingredients;
  }

  private extractCuisines(tokens: string[]): string[] {
    const cuisines: string[] = [];
    
    for (const [cuisine, keywords] of this.cuisineKeywords.entries()) {
      for (const keyword of keywords) {
        if (tokens.includes(keyword)) {
          cuisines.push(cuisine);
          break;
        }
      }
    }
    
    return cuisines;
  }

  private extractMealTypes(tokens: string[]): string[] {
    const mealTypes: string[] = [];
    
    for (const [mealType, keywords] of this.mealTypeKeywords.entries()) {
      for (const keyword of keywords) {
        if (tokens.includes(keyword)) {
          mealTypes.push(mealType);
          break;
        }
      }
    }
    
    return mealTypes;
  }

  private extractDietaryRestrictions(tokens: string[]): string[] {
    const restrictions: string[] = [];
    
    for (const [restriction, keywords] of this.dietaryKeywords.entries()) {
      for (const keyword of keywords) {
        if (tokens.includes(keyword)) {
          restrictions.push(restriction);
          break;
        }
      }
    }
    
    return restrictions;
  }

  private extractTimeConstraints(query: string): QueryAnalysis['entities']['timeConstraints'] {
    const constraints: QueryAnalysis['entities']['timeConstraints'] = {};
    
    // Look for time patterns
    const timePattern = /(\d+)\s*(minute|min|hour|hr)s?/g;
    let match;
    
    while ((match = timePattern.exec(query)) !== null) {
      const value = parseInt(match[1]);
      const unit = match[2];
      const minutes = unit.startsWith('hour') || unit === 'hr' ? value * 60 : value;
      
      if (query.includes('prep')) {
        constraints.maxPrepTime = minutes;
      } else if (query.includes('cook')) {
        constraints.maxCookTime = minutes;
      } else {
        constraints.maxTotalTime = minutes;
      }
    }
    
    // Quick/fast keywords
    for (const [keyword, minutes] of this.timeKeywords.entries()) {
      if (query.includes(keyword)) {
        constraints.maxTotalTime = Math.min(constraints.maxTotalTime || Infinity, minutes);
      }
    }
    
    return constraints;
  }

  private extractBudgetConstraints(query: string): QueryAnalysis['entities']['budgetConstraints'] {
    const constraints: QueryAnalysis['entities']['budgetConstraints'] = {};
    
    // Look for budget keywords
    if (query.includes('cheap') || query.includes('budget') || query.includes('affordable')) {
      constraints.economical = true;
    }
    
    // Look for specific dollar amounts
    const dollarPattern = /\$(\d+)/g;
    const match = dollarPattern.exec(query);
    if (match) {
      constraints.maxCost = parseInt(match[1]);
    }
    
    return constraints;
  }

  private extractServings(query: string): number | undefined {
    const servingPattern = /(\d+)\s*(serving|person|people)/g;
    const match = servingPattern.exec(query);
    return match ? parseInt(match[1]) : undefined;
  }

  private extractDifficulty(tokens: string[]): 'easy' | 'medium' | 'hard' | undefined {
    if (tokens.includes('easy') || tokens.includes('simple') || tokens.includes('basic')) {
      return 'easy';
    } else if (tokens.includes('hard') || tokens.includes('difficult') || tokens.includes('complex') || tokens.includes('advanced')) {
      return 'hard';
    } else if (tokens.includes('medium') || tokens.includes('intermediate')) {
      return 'medium';
    }
    return undefined;
  }

  private extractEquipment(tokens: string[]): string[] {
    return tokens.filter(token => this.equipmentKeywords.has(token));
  }

  private extractCookingMethods(tokens: string[]): string[] {
    return tokens.filter(token => this.cookingMethodKeywords.has(token));
  }

  // Intent scoring adjustments

  private adjustIntentScore(baseScore: number, intent: QueryIntent, query: string, context: UserContext): number {
    let adjustedScore = baseScore;
    
    // Time-based adjustments
    const timeOfDay = context.sessionContext.timeOfDay;
    if (intent === 'meal-planning' && (timeOfDay === 'morning' || timeOfDay === 'evening')) {
      adjustedScore += 0.5;
    }
    
    // Context-based adjustments
    if (intent === 'recipe-recommendation' && context.availableIngredients.length > 0) {
      adjustedScore += 0.3;
    }
    
    if (intent === 'shopping-list' && query.includes('buy') || query.includes('need')) {
      adjustedScore += 0.4;
    }
    
    return adjustedScore;
  }

  private adjustConfidenceForContext(baseConfidence: number, intent: QueryIntent, context: UserContext): number {
    let adjustedConfidence = baseConfidence;
    
    // Boost confidence if user context aligns with intent
    if (intent === 'ingredient-management' && context.availableIngredients.length > 5) {
      adjustedConfidence += 0.1;
    }
    
    if (intent === 'meal-planning' && context.currentMealPlan) {
      adjustedConfidence += 0.1;
    }
    
    return Math.min(adjustedConfidence, 1.0);
  }

  // Initialization methods for keywords and patterns

  private initializeIntentPatterns(): Map<QueryIntent, RegExp[]> {
    return new Map([
      ['recipe-search', [
        /find.*recipe/,
        /search.*recipe/,
        /recipe.*for/,
        /how.*make/,
        /how.*cook/
      ]],
      ['recipe-recommendation', [
        /suggest.*recipe/,
        /recommend.*recipe/,
        /what.*cook/,
        /what.*make/,
        /ideas.*for/,
        /recipe.*recommendation/
      ]],
      ['meal-planning', [
        /meal.*plan/,
        /plan.*meal/,
        /this.*week/,
        /next.*week/,
        /weekly.*plan/,
        /menu.*planning/
      ]],
      ['ingredient-management', [
        /ingredient/,
        /what.*have/,
        /inventory/,
        /expire/,
        /expiring/,
        /use.*up/
      ]],
      ['shopping-list', [
        /shopping.*list/,
        /grocery.*list/,
        /need.*buy/,
        /what.*buy/,
        /add.*list/
      ]],
      ['nutrition-info', [
        /nutrition/,
        /calories/,
        /healthy/,
        /diet/,
        /protein/,
        /vitamins/
      ]],
      ['cooking-tips', [
        /tip/,
        /how.*cook/,
        /technique/,
        /method/,
        /advice/
      ]],
      ['substitution-help', [
        /substitute/,
        /replace/,
        /instead.*of/,
        /alternative/,
        /dont.*have/
      ]],
      ['dietary-guidance', [
        /vegetarian/,
        /vegan/,
        /gluten.*free/,
        /keto/,
        /paleo/,
        /allerg/
      ]]
    ]);
  }

  private initializeIngredientKeywords(): Set<string> {
    return new Set([
      'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp',
      'eggs', 'milk', 'cheese', 'butter', 'yogurt',
      'tomato', 'onion', 'garlic', 'carrot', 'potato', 'bell pepper', 'mushroom',
      'lettuce', 'spinach', 'broccoli', 'cucumber', 'avocado',
      'apple', 'banana', 'orange', 'lemon', 'lime', 'strawberry',
      'rice', 'pasta', 'bread', 'flour', 'sugar', 'salt', 'pepper',
      'olive oil', 'vegetable oil', 'vinegar', 'soy sauce'
    ]);
  }

  private initializeCuisineKeywords(): Map<string, string[]> {
    return new Map([
      ['Italian', ['italian', 'pasta', 'pizza', 'mediterranean']],
      ['Mexican', ['mexican', 'tacos', 'burrito', 'salsa', 'latino']],
      ['Asian', ['asian', 'chinese', 'japanese', 'thai', 'korean', 'vietnamese']],
      ['Indian', ['indian', 'curry', 'spicy', 'tandoori']],
      ['American', ['american', 'bbq', 'burger', 'southern']],
      ['French', ['french', 'classic', 'elegant']],
      ['Greek', ['greek', 'mediterranean', 'feta']],
      ['Middle Eastern', ['middle eastern', 'mediterranean', 'hummus']]
    ]);
  }

  private initializeMealTypeKeywords(): Map<string, string[]> {
    return new Map([
      ['breakfast', ['breakfast', 'morning', 'brunch']],
      ['lunch', ['lunch', 'midday', 'afternoon']],
      ['dinner', ['dinner', 'evening', 'supper']],
      ['snack', ['snack', 'appetizer', 'bite']],
      ['dessert', ['dessert', 'sweet', 'cake', 'cookie']]
    ]);
  }

  private initializeDietaryKeywords(): Map<string, string[]> {
    return new Map([
      ['vegetarian', ['vegetarian', 'veggie']],
      ['vegan', ['vegan', 'plant-based']],
      ['gluten-free', ['gluten-free', 'gluten free', 'celiac']],
      ['keto', ['keto', 'ketogenic', 'low-carb']],
      ['paleo', ['paleo', 'paleolithic']],
      ['dairy-free', ['dairy-free', 'lactose-free', 'no dairy']],
      ['nut-free', ['nut-free', 'no nuts', 'allergy']]
    ]);
  }

  private initializeTimeKeywords(): Map<string, number> {
    return new Map([
      ['quick', 15],
      ['fast', 20],
      ['instant', 5],
      ['slow', 120],
      ['overnight', 480]
    ]);
  }

  private initializeMoodKeywords(): Map<string, { sentiment?: string; energy?: string; urgency?: string; adventurous?: boolean }> {
    return new Map([
      ['excited', { sentiment: 'positive', energy: 'high' }],
      ['tired', { sentiment: 'neutral', energy: 'low' }],
      ['hungry', { urgency: 'high' }],
      ['adventurous', { adventurous: true }],
      ['comfort', { sentiment: 'neutral', energy: 'low' }],
      ['celebration', { sentiment: 'positive', energy: 'high' }],
      ['stressed', { sentiment: 'negative', urgency: 'high' }],
      ['relaxed', { sentiment: 'positive', energy: 'low' }]
    ]);
  }

  private initializeEquipmentKeywords(): Set<string> {
    return new Set([
      'oven', 'stovetop', 'microwave', 'grill', 'slow cooker', 'instant pot',
      'air fryer', 'blender', 'food processor', 'mixer', 'skillet', 'pan'
    ]);
  }

  private initializeCookingMethodKeywords(): Set<string> {
    return new Set([
      'bake', 'fry', 'grill', 'roast', 'steam', 'boil', 'sauté',
      'braise', 'stew', 'poach', 'broil', 'simmer'
    ]);
  }
}