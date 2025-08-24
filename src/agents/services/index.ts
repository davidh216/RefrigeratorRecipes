/**
 * Agent Services Exports
 * 
 * This module exports all agent-related services that integrate with Firebase
 * and follow the existing service patterns in the codebase.
 */

export {
  AgentInteractionService,
  AgentPreferencesService,
  AgentAnalyticsService,
  agentInteractionService,
  agentPreferencesService,
  agentAnalyticsService
} from './agent-service';

// Data integration service
export { AgentDataService } from './AgentDataService';
export type {
  IngredientAnalysis,
  RecipeMatchResult,
  MealPlanAnalysis,
  ShoppingOptimization
} from './AgentDataService';