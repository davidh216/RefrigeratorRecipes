import React, { useState } from 'react';
import { IngredientList } from './IngredientList';
import { ExpirationTracker } from './ExpirationTracker';
import { Button } from '@/components/ui';
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
  const { ingredients, filteredIngredients, deleteIngredient } = useIngredients();

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
          </div>
        );
    }
  };


  return (
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
  );
};