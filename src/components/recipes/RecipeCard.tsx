import React from 'react';
import { Recipe, Ingredient } from '@/types';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter,
  Badge, 
  Button,
  Flex,
  Avatar
} from '@/components/ui';

interface RecipeCardProps {
  recipe: Recipe;
  userIngredients?: Ingredient[];
  onView?: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  onToggleFavorite?: (recipe: Recipe) => void;
  showActions?: boolean;
  className?: string;
}

export const RecipeCard: React.FC<RecipeCardProps> = React.memo(({
  recipe,
  userIngredients = [],
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  showActions = true,
  className = '',
}) => {
  // Calculate how many ingredients the user has for this recipe
  const { hasCount, totalCount, percentage } = React.useMemo(() => {
    if (userIngredients.length === 0 || recipe.ingredients.length === 0) {
      return { hasCount: 0, totalCount: recipe.ingredients.length, percentage: 0 };
    }

    const userIngredientNames = userIngredients.map(ing => ing.name.toLowerCase());
    const hasCount = recipe.ingredients.filter(recipeIng => 
      userIngredientNames.includes(recipeIng.name.toLowerCase())
    ).length;
    
    const totalCount = recipe.ingredients.length;
    const percentage = Math.round((hasCount / totalCount) * 100);
    
    return { hasCount, totalCount, percentage };
  }, [userIngredients, recipe.ingredients]);

  const getDifficultyColor = React.useCallback((difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }, []);

  const getIngredientMatchColor = React.useCallback((percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-100';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  }, []);

  const formatTime = React.useCallback((minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }, []);

  const primaryImage = recipe.images && recipe.images.length > 0 ? recipe.images[0] : null;

  return (
    <Card className={`hover:shadow-lg transition-shadow duration-200 ${className}`}>
      {/* Recipe Image */}
      {primaryImage && (
        <div className="h-48 overflow-hidden rounded-t-lg">
          <img
            src={primaryImage}
            alt={recipe.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
          />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
              {recipe.title}
            </h3>
            {recipe.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {recipe.description}
              </p>
            )}
          </div>
          
          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleFavorite(recipe)}
              className={`ml-2 ${recipe.metadata.isFavorite ? 'text-red-500' : 'text-gray-400'}`}
            >
              <span className="text-lg">
                {recipe.metadata.isFavorite ? '❤️' : '🤍'}
              </span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Recipe Info */}
        <Flex className="flex-wrap gap-2">
          <Badge 
            variant="outline" 
            className={getDifficultyColor(recipe.difficulty)}
          >
            {recipe.difficulty}
          </Badge>
          
          {recipe.cuisine && (
            <Badge variant="outline">
              {recipe.cuisine}
            </Badge>
          )}

          <Badge variant="outline">
            {recipe.servings.count} servings
          </Badge>
        </Flex>

        {/* Timing */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>⏱️ Prep: {formatTime(recipe.timing.prepTime)}</span>
          <span>🍳 Cook: {formatTime(recipe.timing.cookTime)}</span>
          <span>⏰ Total: {formatTime(recipe.timing.totalTime)}</span>
        </div>

        {/* Meal Types */}
        {recipe.mealType.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.mealType.map(type => (
              <Badge key={type} variant="secondary" size="sm">
                {type}
              </Badge>
            ))}
          </div>
        )}

        {/* Ingredient Match */}
        {userIngredients.length > 0 && (
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
            <span className="text-sm text-gray-600">
              You have {hasCount} of {totalCount} ingredients
            </span>
            <Badge 
              variant="outline" 
              size="sm"
              className={getIngredientMatchColor(percentage)}
            >
              {percentage}%
            </Badge>
          </div>
        )}

        {/* Rating */}
        {recipe.ratings.count > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <span className="text-yellow-400">★</span>
              <span className="text-sm font-medium ml-1">
                {recipe.ratings.average.toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              ({recipe.ratings.count} reviews)
            </span>
          </div>
        )}

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" size="sm">
                {tag}
              </Badge>
            ))}
            {recipe.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{recipe.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Dietary Info */}
        {recipe.dietary.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.dietary.slice(0, 2).map(diet => (
              <Badge key={diet} variant="secondary" size="sm" className="text-green-700 bg-green-100">
                {diet}
              </Badge>
            ))}
            {recipe.dietary.length > 2 && (
              <span className="text-xs text-gray-500">
                +{recipe.dietary.length - 2} more
              </span>
            )}
          </div>
        )}

        {/* Last Cooked / Cook Count */}
        {recipe.metadata.cookCount > 0 && (
          <div className="text-xs text-gray-500">
            Cooked {recipe.metadata.cookCount} times
            {recipe.metadata.lastCookedAt && (
              <span> • Last made {new Date(recipe.metadata.lastCookedAt).toLocaleDateString()}</span>
            )}
          </div>
        )}
      </CardContent>

      {/* Actions */}
      {showActions && (
        <CardFooter className="pt-3">
          <div className="flex gap-2 w-full">
            {onView && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => onView(recipe)}
                className="flex-1"
              >
                View Recipe
              </Button>
            )}
            
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onEdit(recipe)}
              >
                Edit
              </Button>
            )}
            
            {onDelete && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onDelete(recipe)}
                className="text-red-600 hover:text-red-700 hover:border-red-300"
              >
                Delete
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
});