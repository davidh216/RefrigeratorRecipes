import React, { useState } from 'react';
import { IngredientList } from './IngredientList';
import { ExpirationTracker } from './ExpirationTracker';
import { Button } from '@/components/ui';
import { LazyFloatingAgentButton } from '@/components/agents/LazyAgentInterface';
import { AGENT_FEATURES } from '@/lib/feature-flags';
import { useIngredients } from '@/hooks';

interface IngredientDashboardProps {
  className?: string;
}

type ViewMode = 'dashboard' | 'list' | 'expiration';

export const IngredientDashboard: React.FC<IngredientDashboardProps> = ({ 
  className 
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [showExpirationTracker, setShowExpirationTracker] = useState(false);
  const { 
    ingredients, 
    filteredIngredients, 
    deleteIngredient, 
    agentSuggestions, 
    expirationInsights,
    dismissSuggestion,
    enableAgentFeatures 
  } = useIngredients();

  const handleRemoveIngredients = async (ingredientIds: string[]) => {
    try {
      // Remove ingredients in sequence
      for (const id of ingredientIds) {
        await deleteIngredient(id);
      }
    } catch (error) {
      console.error('Failed to remove ingredients:', error);
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'list':
        return <IngredientList />;
      case 'expiration':
        return <ExpirationTracker ingredients={ingredients} onRemoveIngredients={handleRemoveIngredients} />;
      case 'dashboard':
      default:
        return (
          <div className="space-y-8">
            {/* Agent Insights - Show if there are suggestions */}
            {enableAgentFeatures && agentSuggestions.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <span className="mr-2">🤖</span>
                    Agent Insights
                  </h3>
                  <span className="text-sm text-gray-500">
                    {agentSuggestions.length} suggestion{agentSuggestions.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-3">
                  {agentSuggestions.slice(0, 3).map((suggestion) => (
                    <div key={suggestion.id} className="flex items-start justify-between bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {suggestion.type === 'expiration-alert' && <span className="text-red-500">⚠️</span>}
                          {suggestion.type === 'usage-suggestion' && <span className="text-yellow-500">💡</span>}
                          {suggestion.type === 'purchase-recommendation' && <span className="text-green-500">🛒</span>}
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {suggestion.type.replace('-', ' ')}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm">{suggestion.message}</p>
                        {suggestion.action && (
                          <button
                            onClick={suggestion.action}
                            className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Take Action
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => dismissSuggestion(suggestion.id)}
                        className="text-gray-400 hover:text-gray-600 ml-4"
                        title="Dismiss suggestion"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                {agentSuggestions.length > 3 && (
                  <div className="mt-4 text-center">
                    <span className="text-sm text-gray-500">
                      {agentSuggestions.length - 3} more suggestions available
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🥘</span>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{ingredients.length}</p>
                    <p className="text-gray-600 text-sm">Total Ingredients</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🧊</span>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {ingredients.filter(i => i.location === 'fridge').length}
                    </p>
                    <p className="text-gray-600 text-sm">In Fridge</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🏠</span>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {ingredients.filter(i => i.location === 'pantry').length}
                    </p>
                    <p className="text-gray-600 text-sm">In Pantry</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">❄️</span>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {ingredients.filter(i => i.location === 'freezer').length}
                    </p>
                    <p className="text-gray-600 text-sm">In Freezer</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expiration Tracker Toggle */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Expiration Tracking</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExpirationTracker(!showExpirationTracker)}
              >
                {showExpirationTracker ? 'Hide Expiration Tracker' : 'Show Expiration Tracker'}
              </Button>
            </div>

            {/* Collapsible Expiration Tracker */}
            {showExpirationTracker && (
              <div className="transition-all duration-200 h-96 overflow-hidden">
                <ExpirationTracker ingredients={ingredients} onRemoveIngredients={handleRemoveIngredients} />
              </div>
            )}

            {/* Recent Ingredients */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recently Added</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  View All
                </Button>
              </div>
              
              {ingredients.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-3">📦</div>
                  <h4 className="text-lg font-medium text-gray-700 mb-2">No ingredients yet</h4>
                  <p className="text-gray-500">
                    Start tracking your kitchen inventory by adding your first ingredient.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ingredients
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                    .slice(0, 6)
                    .map((ingredient) => (
                      <div
                        key={ingredient.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">
                            {ingredient.customName || ingredient.name}
                          </h4>
                          <span className="text-sm text-gray-500 capitalize">
                            {ingredient.location}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {ingredient.quantity} {ingredient.unit}
                        </p>
                        {ingredient.expirationDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Expires: {ingredient.expirationDate.toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Enhanced Expiration Insights */}
            {enableAgentFeatures && (expirationInsights.expiringSoon.length > 0 || expirationInsights.expired.length > 0) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">⏰</span>
                  Expiration Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {expirationInsights.expired.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-600 mb-2 flex items-center">
                        <span className="mr-1">🚨</span>
                        Expired Items ({expirationInsights.expired.length})
                      </h4>
                      <div className="space-y-2">
                        {expirationInsights.expired.slice(0, 3).map((ingredient) => (
                          <div key={ingredient.id} className="flex items-center justify-between text-sm bg-red-50 p-2 rounded">
                            <span className="font-medium">{ingredient.customName || ingredient.name}</span>
                            <span className="text-red-600">
                              {ingredient.expirationDate?.toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                        {expirationInsights.expired.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{expirationInsights.expired.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {expirationInsights.expiringSoon.length > 0 && (
                    <div>
                      <h4 className="font-medium text-yellow-600 mb-2 flex items-center">
                        <span className="mr-1">⚠️</span>
                        Expiring Soon ({expirationInsights.expiringSoon.length})
                      </h4>
                      <div className="space-y-2">
                        {expirationInsights.expiringSoon.slice(0, 3).map((ingredient) => (
                          <div key={ingredient.id} className="flex items-center justify-between text-sm bg-yellow-50 p-2 rounded">
                            <span className="font-medium">{ingredient.customName || ingredient.name}</span>
                            <span className="text-yellow-600">
                              {ingredient.expirationDate?.toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                        {expirationInsights.expiringSoon.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{expirationInsights.expiringSoon.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
    }
  };


  return (
    <>
      <div className={`h-full flex flex-col ${className}`}>
      {/* Navigation */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setViewMode('dashboard')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              viewMode === 'dashboard'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Ingredients
          </button>
          <button
            onClick={() => setViewMode('expiration')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              viewMode === 'expiration'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Expiration Tracker
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {renderContent()}
      </div>
    </div>

    {/* Floating Agent Button - Only show on dashboard view and when agent features are enabled */}
    {enableAgentFeatures && AGENT_FEATURES.floatingButton && viewMode === 'dashboard' && (
      <LazyFloatingAgentButton
        initialContext="ingredients"
        notificationCount={agentSuggestions.length}
        showNotifications={true}
      />
    )}
    </>
  );
};