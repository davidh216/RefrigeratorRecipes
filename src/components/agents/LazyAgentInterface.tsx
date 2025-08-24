import React, { lazy, Suspense } from 'react';
import { Loading } from '@/components/ui';
import { isFeatureEnabled } from '@/lib/feature-flags';

// Lazy load the AgentInterface component
const AgentInterface = lazy(() => 
  import('./AgentInterface').then(module => ({ default: module.AgentInterface }))
);

// Lazy load the FloatingAgentButton component
const FloatingAgentButton = lazy(() => 
  import('./FloatingAgentButton').then(module => ({ default: module.FloatingAgentButton }))
);

export interface LazyAgentInterfaceProps {
  className?: string;
  initialContext?: string;
  onClose?: () => void;
  compact?: boolean;
}

export interface LazyFloatingAgentButtonProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  initialContext?: string;
  showNotifications?: boolean;
  notificationCount?: number;
}

// Lazy Agent Interface wrapper
export const LazyAgentInterface: React.FC<LazyAgentInterfaceProps> = (props) => {
  // Check if agent features are enabled
  if (!isFeatureEnabled('agentInterface') || !isFeatureEnabled('agentSystem')) {
    return null;
  }

  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      }
    >
      <AgentInterface {...props} />
    </Suspense>
  );
};

// Lazy Floating Agent Button wrapper
export const LazyFloatingAgentButton: React.FC<LazyFloatingAgentButtonProps> = (props) => {
  // Check if floating button and agent features are enabled
  if (!isFeatureEnabled('agentFloatingButton') || !isFeatureEnabled('agentSystem')) {
    return null;
  }

  return (
    <Suspense 
      fallback={
        <div className="fixed bottom-6 right-6 w-14 h-14 bg-gray-200 rounded-full animate-pulse" />
      }
    >
      <FloatingAgentButton {...props} />
    </Suspense>
  );
};

// Performance-optimized AgentInsights lazy wrapper
const AgentInsights = lazy(() => 
  import('./AgentInsights').then(module => ({ default: module.AgentInsights }))
);

export interface LazyAgentInsightsProps {
  data?: any;
  className?: string;
}

export const LazyAgentInsights: React.FC<LazyAgentInsightsProps> = (props) => {
  if (!isFeatureEnabled('agentSystem')) {
    return null;
  }

  return (
    <Suspense 
      fallback={
        <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      }
    >
      <AgentInsights {...props} />
    </Suspense>
  );
};

// Enhanced loading states for better UX
export const AgentLoadingSkeleton: React.FC<{ variant?: 'interface' | 'insights' | 'button' }> = ({ 
  variant = 'interface' 
}) => {
  switch (variant) {
    case 'interface':
      return (
        <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="w-6 h-6 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-100 rounded-lg"></div>
            <div className="h-32 bg-gray-100 rounded-lg"></div>
            <div className="flex justify-end space-x-2">
              <div className="h-10 w-20 bg-gray-200 rounded"></div>
              <div className="h-10 w-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      );

    case 'insights':
      return (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="h-16 bg-white rounded-lg shadow-sm p-3">
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-16 bg-white rounded-lg shadow-sm p-3">
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      );

    case 'button':
    default:
      return (
        <div className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full animate-pulse shadow-lg">
          <div className="absolute inset-0 bg-gray-300 rounded-full animate-ping opacity-20"></div>
        </div>
      );
  }
};

// Bundle splitting helper for agent components
export const loadAgentComponents = async () => {
  const [
    { AgentInterface },
    { FloatingAgentButton },
    { AgentInsights },
    { QuickActions },
    { RecommendationCard }
  ] = await Promise.all([
    import('./AgentInterface'),
    import('./FloatingAgentButton'), 
    import('./AgentInsights'),
    import('./QuickActions'),
    import('./RecommendationCard')
  ]);

  return {
    AgentInterface,
    FloatingAgentButton,
    AgentInsights,
    QuickActions,
    RecommendationCard
  };
};

export default {
  LazyAgentInterface,
  LazyFloatingAgentButton,
  LazyAgentInsights,
  AgentLoadingSkeleton,
  loadAgentComponents
};