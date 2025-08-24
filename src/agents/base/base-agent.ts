/**
 * Base Agent Architecture
 * 
 * Abstract base classes that establish the foundation for all Sous Chef agents.
 * This follows the same patterns as the existing Firebase services in the codebase.
 */

import {
  AgentRequest,
  AgentResponse,
  AgentConfig,
  QueryIntent,
  UserContext,
  AgentError,
  AgentTimeoutError,
  ConfidenceLevel,
  ResponsePriority
} from '../types';

/**
 * Abstract base class for all Sous Chef agents
 * 
 * This class provides the core infrastructure that all agents must implement,
 * following the same patterns as BaseFirebaseService.
 */
export abstract class BaseSousChefAgent {
  protected abstract config: AgentConfig;

  /**
   * Abstract method that each agent must implement to process requests
   */
  protected abstract processRequest(request: AgentRequest): Promise<AgentResponse>;

  /**
   * Abstract method to validate if this agent can handle the request
   */
  protected abstract canHandle(request: AgentRequest): boolean;

  /**
   * Get the agent's configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Check if the agent is enabled and can handle the request
   */
  isAvailable(request: AgentRequest): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Check if agent supports the detected intent
    if (request.intent && !this.config.supportedIntents.includes(request.intent)) {
      return false;
    }

    return this.canHandle(request);
  }

  /**
   * Main entry point for processing agent requests
   * Includes error handling, timeout management, and response validation
   */
  async handle(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      // Validate request
      this.validateRequest(request);

      // Check if agent can handle this request
      if (!this.isAvailable(request)) {
        throw new AgentError(
          `Agent ${this.config.name} cannot handle this request`,
          'AGENT_CANNOT_HANDLE',
          this.config.id
        );
      }

      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new AgentTimeoutError(this.config.id, this.config.maxProcessingTime));
        }, this.config.maxProcessingTime);
      });

      // Process request with timeout
      const response = await Promise.race([
        this.processRequest(request),
        timeoutPromise
      ]);

      // Validate response
      this.validateResponse(response);

      // Add processing time to metadata
      response.metadata.processingTime = Date.now() - startTime;

      return response;

    } catch (error) {
      return this.handleError(error, request, Date.now() - startTime);
    }
  }

  /**
   * Validate incoming request structure
   */
  protected validateRequest(request: AgentRequest): void {
    if (!request.id || typeof request.id !== 'string') {
      throw new AgentError('Invalid request: missing or invalid id', 'INVALID_REQUEST', this.config.id);
    }

    if (!request.query || typeof request.query !== 'string') {
      throw new AgentError('Invalid request: missing or invalid query', 'INVALID_REQUEST', this.config.id);
    }

    if (!request.context || typeof request.context !== 'object') {
      throw new AgentError('Invalid request: missing or invalid context', 'INVALID_REQUEST', this.config.id);
    }

    if (!request.metadata || !request.metadata.timestamp) {
      throw new AgentError('Invalid request: missing or invalid metadata', 'INVALID_REQUEST', this.config.id);
    }
  }

  /**
   * Validate outgoing response structure
   */
  protected validateResponse(response: AgentResponse): void {
    if (!response.id || typeof response.id !== 'string') {
      throw new AgentError('Invalid response: missing or invalid id', 'INVALID_RESPONSE', this.config.id);
    }

    if (!response.message || typeof response.message !== 'string') {
      throw new AgentError('Invalid response: missing or invalid message', 'INVALID_RESPONSE', this.config.id);
    }

    if (!response.agentType || response.agentType !== this.config.id) {
      throw new AgentError('Invalid response: incorrect agentType', 'INVALID_RESPONSE', this.config.id);
    }
  }

  /**
   * Create a standardized error response
   */
  protected handleError(error: any, request: AgentRequest, processingTime: number): AgentResponse {
    console.error(`Error in agent ${this.config.name}:`, error);

    const errorMessage = error instanceof AgentError 
      ? error.message 
      : `I encountered an error while processing your request. Please try again.`;

    return {
      id: `error-${Date.now()}`,
      agentType: this.config.id,
      message: errorMessage,
      intent: request.intent || 'general-help',
      confidence: 'very-low' as ConfidenceLevel,
      priority: 'medium' as ResponsePriority,
      followUpSuggestions: [
        "Try rephrasing your question",
        "Check if you have the necessary ingredients",
        "Contact support if the problem persists"
      ],
      metadata: {
        processingTime,
        timestamp: new Date(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Helper method to create successful responses with consistent structure
   */
  protected createResponse(
    request: AgentRequest,
    message: string,
    confidence: ConfidenceLevel = 'medium',
    priority: ResponsePriority = 'medium',
    additionalData?: Partial<AgentResponse>
  ): AgentResponse {
    return {
      id: `${this.config.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentType: this.config.id,
      message,
      intent: request.intent || 'general-help',
      confidence,
      priority,
      metadata: {
        processingTime: 0, // Will be set by handle method
        timestamp: new Date(),
        version: '1.0.0'
      },
      ...additionalData
    };
  }

  /**
   * Helper method to extract relevant context for the agent's domain
   */
  protected extractRelevantContext(context: UserContext): Partial<UserContext> {
    // Base implementation returns full context
    // Specific agents can override to filter relevant information
    return context;
  }

  /**
   * Helper method to determine confidence level based on various factors
   */
  protected calculateConfidence(
    queryMatch: number,
    dataAvailability: number,
    contextRelevance: number
  ): ConfidenceLevel {
    const overallScore = (queryMatch + dataAvailability + contextRelevance) / 3;

    if (overallScore >= 0.9) return 'very-high';
    if (overallScore >= 0.7) return 'high';
    if (overallScore >= 0.5) return 'medium';
    if (overallScore >= 0.3) return 'low';
    return 'very-low';
  }

  /**
   * Helper method to determine response priority
   */
  protected determinePriority(intent: QueryIntent, context: UserContext): ResponsePriority {
    // High priority for safety and dietary restriction queries
    if (intent === 'dietary-guidance' || 
        intent === 'substitution-help' ||
        context.dietaryPreferences.allergens.length > 0) {
      return 'high';
    }

    // Medium priority for planning and recommendations
    if (intent === 'meal-planning' || intent === 'recipe-recommendation') {
      return 'medium';
    }

    // Low priority for general information
    return 'low';
  }

  /**
   * Helper method to generate follow-up suggestions based on intent
   */
  protected generateFollowUpSuggestions(intent: QueryIntent, context: UserContext): string[] {
    const suggestions: string[] = [];

    switch (intent) {
      case 'recipe-search':
        suggestions.push("Would you like me to suggest similar recipes?");
        suggestions.push("Do you want to add any of these to your meal plan?");
        break;

      case 'meal-planning':
        suggestions.push("Should I create a shopping list for this meal plan?");
        suggestions.push("Would you like recipe suggestions for the empty slots?");
        break;

      case 'ingredient-management':
        suggestions.push("Do you want recipe suggestions using these ingredients?");
        suggestions.push("Should I check what's expiring soon?");
        break;

      case 'recipe-recommendation':
        suggestions.push("Would you like to see the full recipe details?");
        suggestions.push("Should I add this to your favorites?");
        break;

      default:
        suggestions.push("Is there anything else I can help you with?");
    }

    return suggestions;
  }
}

/**
 * Agent Registry - manages all available agents
 * Follows singleton pattern like other service classes
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, BaseSousChefAgent> = new Map();

  private constructor() {}

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Register a new agent
   */
  register(agent: BaseSousChefAgent): void {
    const config = agent.getConfig();
    this.agents.set(config.id, agent);
    console.log(`Registered agent: ${config.name} (${config.id})`);
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: string): void {
    if (this.agents.delete(agentId)) {
      console.log(`Unregistered agent: ${agentId}`);
    }
  }

  /**
   * Get all registered agents
   */
  getAll(): BaseSousChefAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by ID
   */
  getById(agentId: string): BaseSousChefAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get agents that can handle a specific request
   */
  getAvailableAgents(request: AgentRequest): BaseSousChefAgent[] {
    return Array.from(this.agents.values())
      .filter(agent => agent.isAvailable(request))
      .sort((a, b) => b.getConfig().priority - a.getConfig().priority); // Higher priority first
  }

  /**
   * Get the best agent for a request (highest priority available agent)
   */
  getBestAgent(request: AgentRequest): BaseSousChefAgent | null {
    const availableAgents = this.getAvailableAgents(request);
    return availableAgents.length > 0 ? availableAgents[0] : null;
  }

  /**
   * Get agent configurations for UI display
   */
  getAgentConfigs(): AgentConfig[] {
    return Array.from(this.agents.values()).map(agent => agent.getConfig());
  }
}