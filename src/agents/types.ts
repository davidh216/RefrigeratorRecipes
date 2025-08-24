/**
 * Core type system for the Sous Chef Agent architecture
 * 
 * This module defines comprehensive TypeScript interfaces for the entire agent system,
 * building on existing types from the main application while establishing a consistent
 * foundation for all agent interactions.
 */

import { 
  Recipe, 
  Ingredient, 
  MealPlan, 
  ShoppingList, 
  User,
  RecipeRecommendation,
  MealSlot,
  MealType
} from '@/types';

// ============================================================================
// Core Agent System Types
// ============================================================================

/**
 * Represents the different types of queries/intents that users can have
 */
export type QueryIntent = 
  | 'recipe-search'
  | 'recipe-recommendation' 
  | 'meal-planning'
  | 'ingredient-management'
  | 'shopping-list'
  | 'nutrition-info'
  | 'cooking-tips'
  | 'substitution-help'
  | 'dietary-guidance'
  | 'general-help';

/**
 * Priority levels for agent responses
 */
export type ResponsePriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Status of agent processing
 */
export type AgentStatus = 'idle' | 'thinking' | 'processing' | 'responding' | 'error';

/**
 * Confidence levels for agent responses
 */
export type ConfidenceLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high';

/**
 * Context about the user's current state and preferences
 */
export interface UserContext {
  /** Current authenticated user */
  user: User;
  
  /** User's current ingredients */
  availableIngredients: Ingredient[];

  /** User's available recipes */
  availableRecipes?: Recipe[];
  
  /** User's current meal plans */
  currentMealPlan?: MealPlan;

  /** User's current shopping list */
  currentShoppingList?: any[];
  
  /** User's dietary restrictions and preferences */
  dietaryPreferences: {
    restrictions: string[];
    favoriteCategories: string[];
    allergens: string[];
    preferredCuisines: string[];
  };
  
  /** User's cooking skill level */
  cookingSkillLevel: 'beginner' | 'intermediate' | 'advanced';
  
  /** Recent user activity for context */
  recentActivity: {
    lastViewedRecipes: string[];
    recentSearches: string[];
    lastCookedRecipes: string[];
    frequentIngredients: string[];
  };
  
  /** Current session context */
  sessionContext: {
    currentPage: string;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    timezone: string;
    device: 'mobile' | 'tablet' | 'desktop';
  };
}

/**
 * Structured data that agents can include in responses
 */
export interface AgentResponseData {
  /** Recommended recipes */
  recipes?: Recipe[];
  
  /** Ingredient suggestions */
  ingredients?: Ingredient[];
  
  /** Meal plan suggestions */
  mealPlans?: MealSlot[];
  
  /** Shopping list items */
  shoppingItems?: Array<{
    name: string;
    category: string;
    amount?: number;
    unit?: string;
    notes?: string;
  }>;
  
  /** Nutritional information */
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    vitamins?: Record<string, number>;
    minerals?: Record<string, number>;
  };
  
  /** Cooking tips and guidance */
  cookingTips?: Array<{
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    tags: string[];
  }>;
  
  /** Substitution suggestions */
  substitutions?: Array<{
    original: string;
    alternatives: string[];
    ratio: string;
    notes?: string;
  }>;
}

/**
 * Core response structure from any Sous Chef agent
 */
export interface AgentResponse {
  /** Unique identifier for this response */
  id: string;
  
  /** The agent that generated this response */
  agentType: string;
  
  /** Main response message */
  message: string;
  
  /** Identified user intent */
  intent: QueryIntent;
  
  /** Confidence in the response */
  confidence: ConfidenceLevel;
  
  /** Priority of this response */
  priority: ResponsePriority;
  
  /** Structured data included in response */
  data?: AgentResponseData;
  
  /** Follow-up suggestions for the user */
  followUpSuggestions?: string[];
  
  /** Actions the user can take */
  suggestedActions?: Array<{
    label: string;
    action: string;
    data?: Record<string, any>;
  }>;
  
  /** Sources or reasoning for the response */
  sources?: string[];
  
  /** Response metadata */
  metadata: {
    processingTime: number;
    timestamp: Date;
    version: string;
  };
}

/**
 * Configuration for how agents should behave
 */
export interface AgentConfig {
  /** Agent identifier */
  id: string;
  
  /** Human-readable agent name */
  name: string;
  
  /** Agent description */
  description: string;
  
  /** Which intents this agent can handle */
  supportedIntents: QueryIntent[];
  
  /** Agent's priority for handling requests */
  priority: number;
  
  /** Maximum processing time in milliseconds */
  maxProcessingTime: number;
  
  /** Whether this agent is enabled */
  enabled: boolean;
  
  /** Agent-specific configuration */
  settings: Record<string, any>;
}

/**
 * Request object passed to agents for processing
 */
export interface AgentRequest {
  /** Unique request identifier */
  id: string;
  
  /** User's query or input */
  query: string;
  
  /** Detected or specified intent */
  intent?: QueryIntent;
  
  /** User context for personalized responses */
  context: UserContext;
  
  /** Additional parameters for the request */
  parameters?: Record<string, any>;
  
  /** Request metadata */
  metadata: {
    timestamp: Date;
    source: 'chat' | 'voice' | 'form' | 'api';
    sessionId: string;
  };
}

// ============================================================================
// Agent State Management Types
// ============================================================================

/**
 * State for tracking agent operations
 */
export interface AgentState {
  /** Current processing status */
  status: AgentStatus;
  
  /** Currently active request */
  currentRequest?: AgentRequest;
  
  /** Last generated response */
  lastResponse?: AgentResponse;
  
  /** Error information if any */
  error?: {
    message: string;
    code: string;
    timestamp: Date;
  };
  
  /** Processing metrics */
  metrics: {
    totalRequests: number;
    successfulResponses: number;
    averageProcessingTime: number;
    lastActivity: Date;
  };
}

/**
 * Configuration for agent interactions and UI
 */
export interface AgentUIConfig {
  /** Whether to show typing indicators */
  showTypingIndicator: boolean;
  
  /** Whether to show confidence scores */
  showConfidence: boolean;
  
  /** Whether to show processing time */
  showProcessingTime: boolean;
  
  /** Maximum messages to keep in history */
  maxHistorySize: number;
  
  /** Auto-scroll behavior */
  autoScroll: boolean;
  
  /** Theme preferences */
  theme: {
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
  };
}

// ============================================================================
// Agent Service Integration Types
// ============================================================================

/**
 * User interaction tracking for agent learning
 */
export interface UserInteraction {
  id: string;
  userId: string;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  
  /** The original request */
  request: AgentRequest;
  
  /** The agent's response */
  response: AgentResponse;
  
  /** User's feedback on the response */
  feedback?: {
    helpful: boolean;
    rating: number; // 1-5 scale
    comments?: string;
    followedSuggestions: string[];
  };
  
  /** Outcome tracking */
  outcome?: {
    taskCompleted: boolean;
    actionsTaken: string[];
    timeToCompletion?: number;
  };
  
  /** Metadata */
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    deviceInfo: string;
    location?: string;
  };
}

/**
 * Agent preference storage
 */
export interface UserAgentPreferences {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  
  /** Preferred agent behaviors */
  preferences: {
    responseStyle: 'concise' | 'detailed' | 'conversational';
    preferredAgents: string[];
    disabledAgents: string[];
    autoSuggestions: boolean;
    proactiveHelp: boolean;
  };
  
  /** Learning from interactions */
  learnedPreferences: {
    preferredRecipeTypes: string[];
    commonIngredients: string[];
    cookingPatterns: Record<string, any>;
    timePreferences: Record<string, string>;
  };
  
  /** Privacy settings */
  privacy: {
    allowDataCollection: boolean;
    allowPersonalization: boolean;
    shareAnonymousData: boolean;
  };
  
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
  };
}

// ============================================================================
// Firebase Integration Types
// ============================================================================

/**
 * Firestore document structure for agent interactions
 */
export interface AgentInteractionFirestore {
  id: string;
  userId: string;
  agentType: string;
  query: string;
  intent: QueryIntent;
  response: string;
  confidence: ConfidenceLevel;
  successful: boolean;
  processingTime: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Firestore document structure for agent preferences
 */
export interface AgentPreferencesFirestore {
  id: string;
  userId: string;
  preferences: Record<string, any>;
  learnedBehaviors: Record<string, any>;
  privacySettings: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Hook Integration Types
// ============================================================================

/**
 * Return type for the main agent hook
 */
export interface UseAgentReturn {
  /** Send a query to the agent system */
  sendQuery: (query: string, intent?: QueryIntent) => Promise<AgentResponse>;
  
  /** Current agent state */
  state: AgentState;
  
  /** Chat history */
  history: Array<{
    request: AgentRequest;
    response: AgentResponse;
    timestamp: Date;
  }>;
  
  /** Clear chat history */
  clearHistory: () => void;
  
  /** Provide feedback on a response */
  provideFeedback: (responseId: string, feedback: UserInteraction['feedback']) => Promise<void>;
  
  /** Get user preferences */
  preferences: UserAgentPreferences | null;
  
  /** Update user preferences */
  updatePreferences: (updates: Partial<UserAgentPreferences['preferences']>) => Promise<void>;
  
  /** Loading states */
  isLoading: boolean;
  isProcessing: boolean;
  
  /** Error handling */
  error: string | null;
  clearError: () => void;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Specific error types for the agent system
 */
export class AgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public agentType: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export class AgentTimeoutError extends AgentError {
  constructor(agentType: string, timeout: number) {
    super(
      `Agent ${agentType} timed out after ${timeout}ms`,
      'AGENT_TIMEOUT',
      agentType
    );
  }
}

export class AgentConfigurationError extends AgentError {
  constructor(agentType: string, configIssue: string) {
    super(
      `Agent ${agentType} configuration error: ${configIssue}`,
      'AGENT_CONFIG_ERROR',
      agentType
    );
  }
}

// ============================================================================
// Type Guards and Validation
// ============================================================================

export const isAgentResponse = (obj: any): obj is AgentResponse => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.agentType === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.intent === 'string' &&
    typeof obj.confidence === 'string' &&
    typeof obj.priority === 'string' &&
    obj.metadata &&
    typeof obj.metadata.processingTime === 'number' &&
    obj.metadata.timestamp instanceof Date
  );
};

export const isUserContext = (obj: any): obj is UserContext => {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.user &&
    Array.isArray(obj.availableIngredients) &&
    obj.dietaryPreferences &&
    Array.isArray(obj.dietaryPreferences.restrictions) &&
    obj.sessionContext &&
    typeof obj.sessionContext.currentPage === 'string'
  );
};

export const isAgentRequest = (obj: any): obj is AgentRequest => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.query === 'string' &&
    isUserContext(obj.context) &&
    obj.metadata &&
    obj.metadata.timestamp instanceof Date
  );
};