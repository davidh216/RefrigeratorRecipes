/**
 * Sous Chef Agent Module Exports
 * 
 * Central export point for all Sous Chef Agent components including
 * the main agent, intelligence engines, and related types.
 */

// Main Agent
export { SousChefAgent } from './SousChefAgent';

// Intelligence Engines
export { QueryProcessor } from './QueryProcessor';
export { RecommendationEngine } from './RecommendationEngine';
export { PersonalizationEngine } from './PersonalizationEngine';
export { ContextEngine } from './ContextEngine';

// Types and Interfaces
export type {
  QueryAnalysis
} from './QueryProcessor';

export type {
  EnhancedRecommendation,
  MealPlanRecommendation,
  ShoppingOptimization
} from './RecommendationEngine';

export type {
  CookingPattern,
  FlavorProfile,
  SkillAssessment,
  PersonalizationInsights
} from './PersonalizationEngine';

export type {
  EnvironmentalContext,
  ContextualRecommendations,
  KitchenStateAnalysis,
  ContextualScoring
} from './ContextEngine';