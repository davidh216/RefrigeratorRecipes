/**
 * Feature Flags System
 * 
 * Central system for managing feature flags to enable gradual rollout
 * of agent features and other new functionality.
 */

import React from 'react';

// Feature flag configuration
interface FeatureFlags {
  // Agent System Features
  agentSystem: boolean;
  agentIngredientInsights: boolean;
  agentMealPlanSuggestions: boolean;
  agentShoppingOptimization: boolean;
  agentRecipeDiscovery: boolean;
  agentFloatingButton: boolean;
  agentInterface: boolean;
  
  // Performance Features
  virtualizedLists: boolean;
  lazyImageLoading: boolean;
  backgroundSync: boolean;
  
  // UI Features
  enhancedAnimations: boolean;
  darkModeToggle: boolean;
  advancedFilters: boolean;
  
  // Beta Features
  voiceCommands: boolean;
  aiNutritionAnalysis: boolean;
  smartShoppingRoutes: boolean;
}

// Default feature flags configuration
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // Agent System Features - Enabled by default for seamless integration
  agentSystem: true,
  agentIngredientInsights: true,
  agentMealPlanSuggestions: true,
  agentShoppingOptimization: true,
  agentRecipeDiscovery: true,
  agentFloatingButton: true,
  agentInterface: true,
  
  // Performance Features
  virtualizedLists: true,
  lazyImageLoading: true,
  backgroundSync: true,
  
  // UI Features
  enhancedAnimations: true,
  darkModeToggle: false, // Not implemented yet
  advancedFilters: true,
  
  // Beta Features - Disabled by default
  voiceCommands: false,
  aiNutritionAnalysis: false,
  smartShoppingRoutes: false,
};

// Environment-based overrides
const getEnvironmentOverrides = (): Partial<FeatureFlags> => {
  if (typeof window === 'undefined') return {};
  
  // Development environment - enable experimental features
  if (process.env.NODE_ENV === 'development') {
    return {
      voiceCommands: true,
      aiNutritionAnalysis: true,
      smartShoppingRoutes: true,
    };
  }
  
  // Production environment - more conservative defaults
  if (process.env.NODE_ENV === 'production') {
    return {
      // Keep agent features enabled in production
      agentSystem: true,
      agentIngredientInsights: true,
      agentMealPlanSuggestions: true,
      agentShoppingOptimization: true,
      agentRecipeDiscovery: true,
      agentFloatingButton: true,
      agentInterface: true,
    };
  }
  
  return {};
};

// User-based overrides (could be from user preferences or A/B testing)
const getUserOverrides = (): Partial<FeatureFlags> => {
  if (typeof window === 'undefined') return {};
  
  try {
    const userPrefs = localStorage.getItem('feature-flags');
    if (userPrefs) {
      return JSON.parse(userPrefs);
    }
  } catch (error) {
    console.warn('Failed to parse user feature flag preferences:', error);
  }
  
  return {};
};

// A/B Testing overrides (for gradual rollout)
const getABTestOverrides = (): Partial<FeatureFlags> => {
  if (typeof window === 'undefined') return {};
  
  // Simple user bucketing based on user ID hash
  const userId = localStorage.getItem('user-id') || 'anonymous';
  const hash = simpleHash(userId);
  
  // 100% rollout for agent features (since they're ready for production)
  const agentRolloutBucket = hash % 100;
  const enableAgentFeatures = agentRolloutBucket < 100; // 100% rollout
  
  // 50% rollout for beta features
  const betaRolloutBucket = hash % 100;
  const enableBetaFeatures = betaRolloutBucket < 50; // 50% rollout
  
  return {
    // Agent features - 100% rollout
    agentSystem: enableAgentFeatures,
    agentIngredientInsights: enableAgentFeatures,
    agentMealPlanSuggestions: enableAgentFeatures,
    agentShoppingOptimization: enableAgentFeatures,
    agentRecipeDiscovery: enableAgentFeatures,
    agentFloatingButton: enableAgentFeatures,
    agentInterface: enableAgentFeatures,
    
    // Beta features - gradual rollout
    voiceCommands: enableBetaFeatures,
    aiNutritionAnalysis: enableBetaFeatures,
    smartShoppingRoutes: enableBetaFeatures,
  };
};

// Simple hash function for user bucketing
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Merge all feature flag sources
const getFeatureFlags = (): FeatureFlags => {
  const environmentOverrides = getEnvironmentOverrides();
  const userOverrides = getUserOverrides();
  const abTestOverrides = getABTestOverrides();
  
  return {
    ...DEFAULT_FEATURE_FLAGS,
    ...environmentOverrides,
    ...abTestOverrides,
    ...userOverrides, // User preferences take highest priority
  };
};

// Cached feature flags instance
let cachedFeatureFlags: FeatureFlags | null = null;

// Main API
export const useFeatureFlags = () => {
  if (!cachedFeatureFlags) {
    cachedFeatureFlags = getFeatureFlags();
  }
  
  return cachedFeatureFlags;
};

// Individual feature flag checks
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  const flags = useFeatureFlags();
  return flags[feature] ?? false;
};

// Utility for components
export const withFeatureFlag = <T extends {}>(
  feature: keyof FeatureFlags,
  Component: React.ComponentType<T>
): React.ComponentType<T> => {
  return (props: T) => {
    const isEnabled = isFeatureEnabled(feature);
    
    if (!isEnabled) {
      return null;
    }
    
    return React.createElement(Component, props);
  };
};

// Save user preferences
export const saveFeatureFlags = (flags: Partial<FeatureFlags>): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const currentUserFlags = getUserOverrides();
    const updatedFlags = { ...currentUserFlags, ...flags };
    localStorage.setItem('feature-flags', JSON.stringify(updatedFlags));
    
    // Clear cache to pick up new settings
    cachedFeatureFlags = null;
  } catch (error) {
    console.warn('Failed to save feature flag preferences:', error);
  }
};

// Debug utilities for development
export const debugFeatureFlags = (): void => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const flags = useFeatureFlags();
  console.group('🚩 Feature Flags Status');
  Object.entries(flags).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    console.log(`${status} ${key}: ${value}`);
  });
  console.groupEnd();
};

// Agent-specific feature flags (convenience exports)
export const AGENT_FEATURES = {
  get system() { return isFeatureEnabled('agentSystem'); },
  get ingredients() { return isFeatureEnabled('agentIngredientInsights'); },
  get mealPlan() { return isFeatureEnabled('agentMealPlanSuggestions'); },
  get shopping() { return isFeatureEnabled('agentShoppingOptimization'); },
  get recipes() { return isFeatureEnabled('agentRecipeDiscovery'); },
  get floatingButton() { return isFeatureEnabled('agentFloatingButton'); },
  get interface() { return isFeatureEnabled('agentInterface'); },
} as const;

export default useFeatureFlags;