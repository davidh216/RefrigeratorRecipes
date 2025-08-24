/**
 * Agent UI Components
 * 
 * Comprehensive UI components for the Sous Chef Agent system that integrate
 * with existing design patterns and component architecture.
 */

// Main Agent Interface Components
export { AgentInterface } from './AgentInterface';
export type { AgentInterfaceProps } from './AgentInterface';

export { RecommendationCard } from './RecommendationCard';
export type { RecommendationCardProps } from './RecommendationCard';

export { QuickActions } from './QuickActions';
export type { QuickActionsProps } from './QuickActions';

export { AgentInsights } from './AgentInsights';
export type { AgentInsightsProps } from './AgentInsights';

export { FloatingAgentButton, useFloatingAgent } from './FloatingAgentButton';
export type { FloatingAgentButtonProps } from './FloatingAgentButton';

// Lazy-loaded components for performance
export { 
  LazyAgentInterface,
  LazyFloatingAgentButton,
  LazyAgentInsights,
  AgentLoadingSkeleton,
  loadAgentComponents
} from './LazyAgentInterface';
export type { 
  LazyAgentInterfaceProps,
  LazyFloatingAgentButtonProps,
  LazyAgentInsightsProps
} from './LazyAgentInterface';

// Demo Component for showcasing all agent UI components
export { AgentDemo } from './AgentDemo';
export type { AgentDemoProps } from './AgentDemo';

// Re-export types from agents system for convenience
export type {
  AgentResponse,
  AgentRequest,
  QueryIntent,
  UserContext,
  AgentResponseData,
  UseAgentReturn
} from '@/agents/types';