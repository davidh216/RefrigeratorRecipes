import React, { useEffect } from 'react';
import { useRecipeRecommendations } from '@/hooks';
import { useIngredients } from '@/hooks';
import { RecipeRecommendation } from '@/types';
import { Card, Button, Input, Select, Badge, Loading, Alert } from '@/components/ui';

interface RecipeRecommendationsProps {
  className?: string;
  onRecipeSelect?: (recipe: RecipeRecommendation) => void;
}

export const RecipeRecommendations: React.FC<RecipeRecommendationsProps> = ({ 
  className,
  onRecipeSelect 
}) => {
  const {
    recommendations,
    filteredRecommendations,
    filters,
    isLoading,
    error,
    generateRecommendations,
    setFilters,
    clearFilters,
    getTopRecommendations,
  } = useRecipeRecommendations();

  const { ingredients } = useIngredients();

  // Generate recommendations when ingredients change
  useEffect(() => {
    if (ingredients.length > 0) {
      generateRecommendations(ingredients);
    }
  }, [ingredients, generateRecommendations]);

  const handleRecipeSelect = (recommendation: RecipeRecommendation) => {
    if (onRecipeSelect) {
      onRecipeSelect(recommendation);
    }
  };

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-100';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Recipe Recommendations</h1>
          <p className="text-gray-600">
            Based on your available ingredients ({ingredients.length} items)
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => generateRecommendations(ingredients)}
          disabled={ingredients.length === 0}
        >
          Refresh Recommendations
        </Button>
      </div>

      {/* Error Display */}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Missing Ingredients
            </label>
            <Input
              type="number"
              value={filters.maxMissingIngredients}
              onChange={(e) => setFilters({ maxMissingIngredients: parseInt(e.target.value) || 0 })}
              min="0"
              max="10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Match %
            </label>
            <Input
              type="number"
              value={filters.minMatchPercentage}
              onChange={(e) => setFilters({ minMatchPercentage: parseInt(e.target.value) || 0 })}
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty
            </label>
            <Select
              value={filters.difficulty}
              onChange={(value) => setFilters({ difficulty: value as any })}
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Prep Time (min)
            </label>
            <Input
              type="number"
              value={filters.maxPrepTime || ''}
              onChange={(e) => setFilters({ maxPrepTime: parseInt(e.target.value) || undefined })}
              placeholder="No limit"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecommendations.map((recommendation) => (
          <Card
            key={recommendation.recipe.id}
            className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleRecipeSelect(recommendation)}
          >
            {/* Recipe Image */}
            {recommendation.recipe.images.length > 0 && (
              <div className="mb-4">
                <img
                  src={recommendation.recipe.images[0]}
                  alt={recommendation.recipe.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Recipe Header */}
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg line-clamp-2">
                {recommendation.recipe.title}
              </h3>
              <Badge className={getMatchColor(recommendation.matchPercentage)}>
                {recommendation.matchPercentage}% match
              </Badge>
            </div>

            {/* Recipe Description */}
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {recommendation.recipe.description}
            </p>

            {/* Recipe Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <div className="flex items-center gap-1">
                <span>⏱️</span>
                <span>{recommendation.recipe.timing.totalTime}min</span>
              </div>
              <div className="flex items-center gap-1">
                <span>👨‍🍳</span>
                <span className="capitalize">{recommendation.recipe.difficulty}</span>
              </div>
              {recommendation.recipe.ratings.average > 0 && (
                <div className="flex items-center gap-1">
                  <span>⭐</span>
                  <span>{recommendation.recipe.ratings.average.toFixed(1)}</span>
                </div>
              )}
              {recommendation.recipe.metadata.isFavorite && (
                <span className="text-red-500">❤️</span>
              )}
            </div>

            {/* Ingredient Match */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>Ingredients:</span>
                <span>
                  {recommendation.availableIngredients}/{recommendation.totalIngredients} available
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${recommendation.matchPercentage}%` }}
                />
              </div>
            </div>

            {/* Missing Ingredients */}
            {recommendation.missingIngredients.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-1">Missing ingredients:</p>
                <div className="flex flex-wrap gap-1">
                  {recommendation.missingIngredients.slice(0, 3).map((ingredient, index) => (
                    <Badge key={index} variant="secondary" size="sm">
                      {ingredient.name}
                    </Badge>
                  ))}
                  {recommendation.missingIngredients.length > 3 && (
                    <Badge variant="secondary" size="sm">
                      +{recommendation.missingIngredients.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Recommendation Reasons */}
            {recommendation.reasons.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-1">Why recommended:</p>
                <div className="flex flex-wrap gap-1">
                  {recommendation.reasons.slice(0, 2).map((reason, index) => (
                    <Badge key={index} variant="outline" size="sm">
                      {reason}
                    </Badge>
                  ))}
                  {recommendation.reasons.length > 2 && (
                    <Badge variant="outline" size="sm">
                      +{recommendation.reasons.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Recipe Tags */}
            <div className="flex flex-wrap gap-1">
              {recommendation.recipe.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" size="sm">
                  {tag}
                </Badge>
              ))}
              {recommendation.recipe.tags.length > 3 && (
                <Badge variant="secondary" size="sm">
                  +{recommendation.recipe.tags.length - 3} more
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredRecommendations.length === 0 && !isLoading && (
        <div className="text-center text-gray-500 py-12">
          <span className="text-6xl mx-auto mb-4 block text-gray-300">👨‍🍳</span>
          <h3 className="text-lg font-medium mb-2">No recommendations found</h3>
          <p className="text-sm">
            {ingredients.length === 0 
              ? 'Add some ingredients to your inventory to get recipe recommendations.'
              : 'Try adjusting your filters or add more ingredients to get better recommendations.'
            }
          </p>
        </div>
      )}

      {/* Top Recommendations Section */}
      {recommendations.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Top Recommendations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {getTopRecommendations(4).map((recommendation, index) => (
              <Card
                key={recommendation.recipe.id}
                className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleRecipeSelect(recommendation)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-gray-300">#{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-1">
                      {recommendation.recipe.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{recommendation.matchPercentage}% match</span>
                      <span>•</span>
                      <span>{recommendation.recipe.timing.totalTime}min</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
