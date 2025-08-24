// Existing hooks
export { useIngredients } from './useIngredients';
export { useRecipes } from './useRecipes';
export { useMealPlan } from './useMealPlan';
export { useShoppingList } from './useShoppingList';
export { useRecipeRecommendations } from './useRecipeRecommendations';
export { useDebounce } from './useDebounce';
export { useMealTemplates } from './useMealTemplates';
export { useMealPlanningShortcuts } from './useMealPlanningShortcuts';
export { useMealPlanningToast as useToast } from './useToast';

// New refactored hooks
export { useMealPlanningState } from './useMealPlanningState';
export { useMealPlanningQuickActions } from './useMealPlanningQuickActions';

// New performance optimization hooks
export { useVirtualScroll } from './useVirtualScroll';
export { useDebouncedSearch } from './useDebouncedSearch';
export { useLazyLoad, useLazyImage } from './useLazyLoad';
export { 
  useMemoizedCallback, 
  useMemoizedValue, 
  useMemoizedSelector, 
  useDebouncedMemo 
} from './useMemoizedCallback';
export { 
  usePerformanceMonitor, 
  useRenderPerformance, 
  useAsyncPerformance 
} from './usePerformanceMonitor';

// Sous Chef Agent System hooks
export { useAgent, useAgentAnalytics } from './useAgent';
export { useEnhancedRecipeRecommendations } from './useEnhancedRecipeRecommendations';