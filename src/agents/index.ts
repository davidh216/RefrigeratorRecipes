/**
 * Sous Chef Agent System - Main Export Module
 * 
 * This module provides the main entry point for the entire Sous Chef Agent system,
 * exporting all the foundational architecture components that other agents will build upon.
 */

// Core Types
export type {
  // Core Agent Types
  UserContext,
  AgentResponse,
  AgentRequest,
  AgentConfig,
  AgentState,
  QueryIntent,
  ConfidenceLevel,
  ResponsePriority,
  AgentStatus,
  
  // Response Data Types
  AgentResponseData,
  
  // User Management Types
  UserInteraction,
  UserAgentPreferences,
  
  // Firebase Integration Types
  AgentInteractionFirestore,
  AgentPreferencesFirestore,
  
  // Hook Types
  UseAgentReturn,
  
  // Error Types
  AgentError,
  AgentTimeoutError,
  AgentConfigurationError
} from './types';

// Base Architecture
export {
  BaseSousChefAgent,
  AgentRegistry
} from './base';

// Services
export {
  AgentInteractionService,
  AgentPreferencesService,
  AgentAnalyticsService,
  agentInteractionService,
  agentPreferencesService,
  agentAnalyticsService
} from './services';

// Sous Chef Agent Implementation
export {
  SousChefAgent,
  QueryProcessor,
  RecommendationEngine,
  PersonalizationEngine,
  ContextEngine
} from './sous-chef';

export type {
  QueryAnalysis,
  EnhancedRecommendation,
  MealPlanRecommendation,
  ShoppingOptimization,
  CookingPattern,
  FlavorProfile,
  SkillAssessment,
  PersonalizationInsights,
  EnvironmentalContext,
  ContextualRecommendations,
  KitchenStateAnalysis,
  ContextualScoring
} from './sous-chef';

// Agent Initialization
export {
  initializeAgents,
  getAgentRegistry,
  getAgent,
  getSousChefAgent
} from './initialize';

// Type Guards and Utilities
export {
  isAgentResponse,
  isUserContext,
  isAgentRequest
} from './types';