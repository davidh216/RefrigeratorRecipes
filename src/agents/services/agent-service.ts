/**
 * Agent Service Integration
 * 
 * This service handles user interaction tracking, preference storage, and agent analytics
 * following the same patterns as the existing Firebase services in the codebase.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  onSnapshot,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  FirestoreError,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BaseFirebaseService, FirebaseServiceError } from '@/lib/firebase/base-service';
import {
  UserInteraction,
  UserAgentPreferences,
  AgentInteractionFirestore,
  AgentPreferencesFirestore,
  AgentRequest,
  AgentResponse
} from '../types';

/**
 * Service for managing agent interactions in Firestore
 * Extends the existing BaseFirebaseService pattern
 */
export class AgentInteractionService extends BaseFirebaseService<
  UserInteraction,
  Omit<UserInteraction, 'id' | 'metadata'>,
  Partial<Omit<UserInteraction, 'id' | 'userId' | 'metadata'>>
> {
  protected collectionName = 'agent-interactions';

  protected docToEntity(doc: QueryDocumentSnapshot<DocumentData>): UserInteraction {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      sessionId: data.sessionId,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      request: {
        ...data.request,
        metadata: {
          ...data.request.metadata,
          timestamp: data.request.metadata.timestamp?.toDate() || new Date()
        }
      },
      response: {
        ...data.response,
        metadata: {
          ...data.response.metadata,
          timestamp: data.response.metadata.timestamp?.toDate() || new Date()
        }
      },
      feedback: data.feedback,
      outcome: data.outcome,
      metadata: {
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        deviceInfo: data.deviceInfo || 'unknown',
        location: data.location
      }
    };
  }

  protected entityToDoc(data: Omit<UserInteraction, 'id' | 'metadata'>): DocumentData {
    return {
      userId: data.userId,
      sessionId: data.sessionId,
      request: {
        ...data.request,
        metadata: {
          ...data.request.metadata,
          timestamp: data.request.metadata.timestamp
        }
      },
      response: {
        ...data.response,
        metadata: {
          ...data.response.metadata,
          timestamp: data.response.metadata.timestamp
        }
      },
      feedback: data.feedback,
      outcome: data.outcome,
      deviceInfo: data.request.context.sessionContext.device || 'unknown',
      location: data.request.context.sessionContext.timezone
    };
  }

  /**
   * Record a user interaction with an agent
   */
  async recordInteraction(
    userId: string,
    sessionId: string,
    request: AgentRequest,
    response: AgentResponse
  ): Promise<string> {
    try {
      const interaction: Omit<UserInteraction, 'id' | 'metadata'> = {
        userId,
        sessionId,
        createdAt: new Date(),
        updatedAt: new Date(),
        request,
        response
      };

      return await this.create(userId, interaction);
    } catch (error) {
      this.handleError(error, 'recording interaction');
    }
  }

  /**
   * Add user feedback to an existing interaction
   */
  async addFeedback(
    userId: string,
    interactionId: string,
    feedback: UserInteraction['feedback']
  ): Promise<void> {
    try {
      await this.update(userId, interactionId, { feedback });
    } catch (error) {
      this.handleError(error, 'adding feedback');
    }
  }

  /**
   * Record the outcome of an interaction
   */
  async recordOutcome(
    userId: string,
    interactionId: string,
    outcome: UserInteraction['outcome']
  ): Promise<void> {
    try {
      await this.update(userId, interactionId, { outcome });
    } catch (error) {
      this.handleError(error, 'recording outcome');
    }
  }

  /**
   * Get interactions for a specific session
   */
  async getSessionInteractions(userId: string, sessionId: string): Promise<UserInteraction[]> {
    try {
      const constraints = [where('sessionId', '==', sessionId)];
      return await this.getAll(userId, constraints);
    } catch (error) {
      this.handleError(error, 'getting session interactions');
    }
  }

  /**
   * Get recent interactions for analytics
   */
  async getRecentInteractions(
    userId: string,
    limitCount: number = 50
  ): Promise<UserInteraction[]> {
    try {
      const constraints = [limit(limitCount)];
      return await this.getAll(userId, constraints);
    } catch (error) {
      this.handleError(error, 'getting recent interactions');
    }
  }

  /**
   * Get interactions by agent type
   */
  async getInteractionsByAgent(
    userId: string,
    agentType: string,
    limitCount: number = 20
  ): Promise<UserInteraction[]> {
    try {
      const q = query(
        this.getCollectionRef(userId),
        where('response.agentType', '==', agentType),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.docToEntity(doc));
    } catch (error) {
      this.handleError(error, 'getting interactions by agent');
    }
  }

  /**
   * Get successful interactions for learning patterns
   */
  async getSuccessfulInteractions(
    userId: string,
    limitCount: number = 100
  ): Promise<UserInteraction[]> {
    try {
      const q = query(
        this.getCollectionRef(userId),
        where('feedback.helpful', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.docToEntity(doc));
    } catch (error) {
      this.handleError(error, 'getting successful interactions');
    }
  }
}

/**
 * Service for managing user agent preferences
 * Extends the existing BaseFirebaseService pattern
 */
export class AgentPreferencesService extends BaseFirebaseService<
  UserAgentPreferences,
  Omit<UserAgentPreferences, 'id' | 'metadata'>,
  Partial<Omit<UserAgentPreferences, 'id' | 'userId' | 'metadata'>>
> {
  protected collectionName = 'agent-preferences';

  protected docToEntity(doc: QueryDocumentSnapshot<DocumentData>): UserAgentPreferences {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      preferences: data.preferences || {
        responseStyle: 'conversational',
        preferredAgents: [],
        disabledAgents: [],
        autoSuggestions: true,
        proactiveHelp: true
      },
      learnedPreferences: data.learnedPreferences || {
        preferredRecipeTypes: [],
        commonIngredients: [],
        cookingPatterns: {},
        timePreferences: {}
      },
      privacy: data.privacy || {
        allowDataCollection: true,
        allowPersonalization: true,
        shareAnonymousData: false
      },
      metadata: {
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        version: data.version || '1.0.0'
      }
    };
  }

  protected entityToDoc(data: Omit<UserAgentPreferences, 'id' | 'metadata'>): DocumentData {
    return {
      userId: data.userId,
      preferences: data.preferences,
      learnedPreferences: data.learnedPreferences,
      privacy: data.privacy,
      version: '1.0.0'
    };
  }

  /**
   * Get or create user preferences
   */
  async getUserPreferences(userId: string): Promise<UserAgentPreferences> {
    try {
      // Try to get existing preferences
      const q = query(
        this.getCollectionRef(userId),
        where('userId', '==', userId),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return this.docToEntity(querySnapshot.docs[0]);
      }

      // Create default preferences if none exist
      const defaultPreferences: Omit<UserAgentPreferences, 'id' | 'metadata'> = {
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: {
          responseStyle: 'conversational',
          preferredAgents: [],
          disabledAgents: [],
          autoSuggestions: true,
          proactiveHelp: true
        },
        learnedPreferences: {
          preferredRecipeTypes: [],
          commonIngredients: [],
          cookingPatterns: {},
          timePreferences: {}
        },
        privacy: {
          allowDataCollection: true,
          allowPersonalization: true,
          shareAnonymousData: false
        }
      };

      const id = await this.create(userId, defaultPreferences);
      return {
        id,
        ...defaultPreferences,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0'
        }
      };
    } catch (error) {
      this.handleError(error, 'getting user preferences');
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    updates: Partial<UserAgentPreferences['preferences']>
  ): Promise<void> {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      await this.update(userId, currentPrefs.id, {
        preferences: { ...currentPrefs.preferences, ...updates }
      });
    } catch (error) {
      this.handleError(error, 'updating user preferences');
    }
  }

  /**
   * Update learned preferences based on user behavior
   */
  async updateLearnedPreferences(
    userId: string,
    updates: Partial<UserAgentPreferences['learnedPreferences']>
  ): Promise<void> {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      await this.update(userId, currentPrefs.id, {
        learnedPreferences: { ...currentPrefs.learnedPreferences, ...updates }
      });
    } catch (error) {
      this.handleError(error, 'updating learned preferences');
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    updates: Partial<UserAgentPreferences['privacy']>
  ): Promise<void> {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      await this.update(userId, currentPrefs.id, {
        privacy: { ...currentPrefs.privacy, ...updates }
      });
    } catch (error) {
      this.handleError(error, 'updating privacy settings');
    }
  }
}

/**
 * Analytics service for agent performance tracking
 */
export class AgentAnalyticsService {
  private interactionService: AgentInteractionService;
  private preferencesService: AgentPreferencesService;

  constructor() {
    this.interactionService = new AgentInteractionService();
    this.preferencesService = new AgentPreferencesService();
  }

  /**
   * Get agent performance metrics
   */
  async getAgentMetrics(userId: string, agentType: string, days: number = 30): Promise<{
    totalInteractions: number;
    successfulInteractions: number;
    averageRating: number;
    averageProcessingTime: number;
    commonIntents: Record<string, number>;
    successRate: number;
  }> {
    try {
      const interactions = await this.interactionService.getInteractionsByAgent(
        userId,
        agentType,
        1000 // Get more data for analytics
      );

      // Filter by date range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const recentInteractions = interactions.filter(
        interaction => interaction.metadata.createdAt >= cutoffDate
      );

      const totalInteractions = recentInteractions.length;
      const successfulInteractions = recentInteractions.filter(
        interaction => interaction.feedback?.helpful === true
      ).length;

      const ratingsSum = recentInteractions
        .filter(interaction => interaction.feedback?.rating)
        .reduce((sum, interaction) => sum + (interaction.feedback?.rating || 0), 0);
      
      const ratingsCount = recentInteractions.filter(
        interaction => interaction.feedback?.rating
      ).length;

      const processingTimes = recentInteractions.map(
        interaction => interaction.response.metadata.processingTime
      );

      const intentCounts = recentInteractions.reduce((acc, interaction) => {
        const intent = interaction.request.intent || 'unknown';
        acc[intent] = (acc[intent] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalInteractions,
        successfulInteractions,
        averageRating: ratingsCount > 0 ? ratingsSum / ratingsCount : 0,
        averageProcessingTime: processingTimes.length > 0 
          ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
          : 0,
        commonIntents: intentCounts,
        successRate: totalInteractions > 0 ? successfulInteractions / totalInteractions : 0
      };
    } catch (error) {
      console.error('Error getting agent metrics:', error);
      throw new FirebaseServiceError(
        `Error getting agent metrics: ${error}`,
        error,
        'getting agent metrics',
        'agent-analytics'
      );
    }
  }

  /**
   * Learn from user interactions to improve recommendations
   */
  async updateLearningFromInteractions(userId: string): Promise<void> {
    try {
      const successfulInteractions = await this.interactionService.getSuccessfulInteractions(
        userId,
        100
      );

      // Analyze patterns
      const preferredRecipeTypes = this.analyzeRecipePreferences(successfulInteractions);
      const commonIngredients = this.analyzeIngredientUsage(successfulInteractions);
      const cookingPatterns = this.analyzeCookingPatterns(successfulInteractions);
      const timePreferences = this.analyzeTimePreferences(successfulInteractions);

      // Update learned preferences
      await this.preferencesService.updateLearnedPreferences(userId, {
        preferredRecipeTypes,
        commonIngredients,
        cookingPatterns,
        timePreferences
      });
    } catch (error) {
      console.error('Error updating learning from interactions:', error);
      throw new FirebaseServiceError(
        `Error updating learning: ${error}`,
        error,
        'updating learning',
        'agent-analytics'
      );
    }
  }

  private analyzeRecipePreferences(interactions: UserInteraction[]): string[] {
    const recipeTypes = new Map<string, number>();
    
    interactions.forEach(interaction => {
      if (interaction.response.data?.recipes) {
        interaction.response.data.recipes.forEach(recipe => {
          recipe.mealType.forEach(type => {
            recipeTypes.set(type, (recipeTypes.get(type) || 0) + 1);
          });
          recipe.tags.forEach(tag => {
            recipeTypes.set(tag, (recipeTypes.get(tag) || 0) + 1);
          });
        });
      }
    });

    return Array.from(recipeTypes.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([type]) => type);
  }

  private analyzeIngredientUsage(interactions: UserInteraction[]): string[] {
    const ingredients = new Map<string, number>();
    
    interactions.forEach(interaction => {
      if (interaction.request.context.availableIngredients) {
        interaction.request.context.availableIngredients.forEach(ingredient => {
          ingredients.set(ingredient.name, (ingredients.get(ingredient.name) || 0) + 1);
        });
      }
    });

    return Array.from(ingredients.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([ingredient]) => ingredient);
  }

  private analyzeCookingPatterns(interactions: UserInteraction[]): Record<string, any> {
    const patterns: Record<string, any> = {};
    
    // Analyze preferred cooking times
    const cookingTimes = interactions
      .filter(interaction => interaction.response.data?.recipes)
      .flatMap(interaction => interaction.response.data!.recipes!)
      .map(recipe => recipe.cookTime);

    if (cookingTimes.length > 0) {
      patterns.averageCookTime = cookingTimes.reduce((a, b) => a + b, 0) / cookingTimes.length;
      patterns.maxCookTime = Math.max(...cookingTimes);
      patterns.minCookTime = Math.min(...cookingTimes);
    }

    // Analyze difficulty preferences
    const difficulties = interactions
      .filter(interaction => interaction.response.data?.recipes)
      .flatMap(interaction => interaction.response.data!.recipes!)
      .map(recipe => recipe.difficulty);

    const difficultyCount = difficulties.reduce((acc, diff) => {
      acc[diff] = (acc[diff] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    patterns.preferredDifficulty = Object.entries(difficultyCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'medium';

    return patterns;
  }

  private analyzeTimePreferences(interactions: UserInteraction[]): Record<string, string> {
    const timePreferences: Record<string, string> = {};
    
    // Analyze when user typically asks for different meal types
    const mealTimePatterns = new Map<string, string[]>();
    
    interactions.forEach(interaction => {
      const timeOfDay = interaction.request.context.sessionContext.timeOfDay;
      const intent = interaction.request.intent;
      
      if (intent && timeOfDay) {
        if (!mealTimePatterns.has(intent)) {
          mealTimePatterns.set(intent, []);
        }
        mealTimePatterns.get(intent)!.push(timeOfDay);
      }
    });

    mealTimePatterns.forEach((times, intent) => {
      const mostCommonTime = times.reduce((acc, time) => {
        acc[time] = (acc[time] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      timePreferences[intent] = Object.entries(mostCommonTime)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'any';
    });

    return timePreferences;
  }
}

// Singleton instances for easy import
export const agentInteractionService = new AgentInteractionService();
export const agentPreferencesService = new AgentPreferencesService();
export const agentAnalyticsService = new AgentAnalyticsService();