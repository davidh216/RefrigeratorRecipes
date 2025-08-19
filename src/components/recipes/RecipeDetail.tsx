import React, { useState } from 'react';
import { Recipe, Ingredient } from '@/types';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Badge, 
  Button, 
  Flex,
  Grid,
  Divider,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar
} from '@/components/ui';

interface RecipeDetailProps {
  recipe: Recipe;
  userIngredients?: Ingredient[];
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  onToggleFavorite?: (recipe: Recipe) => void;
  onMarkAsCooked?: (recipe: Recipe) => void;
  onRate?: (recipe: Recipe, rating: number) => void;
  showActions?: boolean;
  className?: string;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({
  recipe,
  userIngredients = [],
  onEdit,
  onDelete,
  onToggleFavorite,
  onMarkAsCooked,
  onRate,
  showActions = true,
  className = '',
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [checkedInstructions, setCheckedInstructions] = useState<Set<number>>(new Set());
  const [userRating, setUserRating] = useState(recipe.ratings.userRating || 0);

  // Calculate ingredient availability
  const getIngredientAvailability = () => {
    if (userIngredients.length === 0) return null;
    
    const userIngredientNames = userIngredients.map(ing => ing.name.toLowerCase());
    const availableIngredients = recipe.ingredients.filter(recipeIng => 
      userIngredientNames.includes(recipeIng.name.toLowerCase())
    );
    
    return {
      available: availableIngredients.length,
      total: recipe.ingredients.length,
      percentage: Math.round((availableIngredients.length / recipe.ingredients.length) * 100),
      missingIngredients: recipe.ingredients.filter(recipeIng => 
        !userIngredientNames.includes(recipeIng.name.toLowerCase())
      )
    };
  };

  const availability = getIngredientAvailability();

  const toggleIngredientCheck = (index: number) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  const toggleInstructionCheck = (index: number) => {
    const newChecked = new Set(checkedInstructions);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedInstructions(newChecked);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleRating = (rating: number) => {
    setUserRating(rating);
    if (onRate) {
      onRate(recipe, rating);
    }
  };

  const adjustedServings = recipe.servings * servingsMultiplier;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {recipe.title}
              </h1>
              <p className="text-lg text-gray-600 mb-4">
                {recipe.description}
              </p>
              
              {/* Quick Info */}
              <Flex className="flex-wrap gap-3 mb-4">
                <Badge className={getDifficultyColor(recipe.difficulty)}>
                  {recipe.difficulty}
                </Badge>
                
                {recipe.cuisine && (
                  <Badge variant="outline">
                    {recipe.cuisine}
                  </Badge>
                )}

                <Badge variant="outline">
                  {adjustedServings} servings
                </Badge>

                {recipe.ratings.count > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    <span className="text-sm font-medium">
                      {recipe.ratings.average.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({recipe.ratings.count})
                    </span>
                  </div>
                )}
              </Flex>

              {/* Meal Types */}
              <div className="flex flex-wrap gap-2 mb-4">
                {recipe.mealType.map(type => (
                  <Badge key={type} variant="secondary" size="sm">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex flex-col gap-2 ml-4">
                {onToggleFavorite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleFavorite(recipe)}
                    className={recipe.metadata.isFavorite ? 'text-red-500' : 'text-gray-400'}
                  >
                    <span className="text-xl">
                      {recipe.metadata.isFavorite ? '❤️' : '🤍'}
                    </span>
                  </Button>
                )}
                
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(recipe)}>
                    Edit
                  </Button>
                )}
                
                {onMarkAsCooked && (
                  <Button variant="default" size="sm" onClick={() => onMarkAsCooked(recipe)}>
                    Mark as Cooked
                  </Button>
                )}
                
                {onDelete && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onDelete(recipe)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Timing */}
          <Grid className="grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {formatTime(recipe.prepTime)}
              </div>
              <div className="text-sm text-gray-600">Prep Time</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {formatTime(recipe.cookTime)}
              </div>
              <div className="text-sm text-gray-600">Cook Time</div>
            </div>
            {recipe.restTime && recipe.restTime > 0 && (
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {formatTime(recipe.restTime)}
                </div>
                <div className="text-sm text-gray-600">Rest Time</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {formatTime(recipe.totalTime)}
              </div>
              <div className="text-sm text-gray-600">Total Time</div>
            </div>
          </Grid>

          {/* Ingredient Availability */}
          {availability && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-blue-900">
                  Ingredient Availability
                </span>
                <Badge 
                  variant="outline"
                  className={
                    availability.percentage >= 80 ? 'text-green-600 bg-green-100' :
                    availability.percentage >= 50 ? 'text-yellow-600 bg-yellow-100' :
                    'text-red-600 bg-red-100'
                  }
                >
                  {availability.percentage}%
                </Badge>
              </div>
              <p className="text-sm text-blue-800">
                You have {availability.available} of {availability.total} ingredients
              </p>
              {availability.missingIngredients.length > 0 && (
                <p className="text-xs text-blue-700 mt-1">
                  Missing: {availability.missingIngredients.map(ing => ing.name).join(', ')}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Images */}
      {recipe.images && recipe.images.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="aspect-video overflow-hidden rounded-lg">
              <img
                src={recipe.images[selectedImageIndex]}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            </div>
            {recipe.images.length > 1 && (
              <div className="flex gap-2 p-4 overflow-x-auto">
                {recipe.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                      index === selectedImageIndex ? 'border-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${recipe.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="ingredients" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Ingredients Tab */}
        <TabsContent value="ingredients">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ingredients</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Servings:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setServingsMultiplier(Math.max(0.5, servingsMultiplier - 0.5))}
                      disabled={servingsMultiplier <= 0.5}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center text-sm">
                      {adjustedServings}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setServingsMultiplier(servingsMultiplier + 0.5)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                    <input
                      type="checkbox"
                      checked={checkedIngredients.has(index)}
                      onChange={() => toggleIngredientCheck(index)}
                      className="w-4 h-4"
                    />
                    <div className={`flex-1 ${checkedIngredients.has(index) ? 'line-through text-gray-500' : ''}`}>
                      <span className="font-medium">
                        {(ingredient.amount * servingsMultiplier).toFixed(ingredient.amount % 1 === 0 ? 0 : 1)} {ingredient.unit}
                      </span>
                      <span className="ml-2">{ingredient.name}</span>
                      {ingredient.notes && (
                        <span className="ml-2 text-sm text-gray-600">({ingredient.notes})</span>
                      )}
                    </div>
                    {ingredient.isOptional && (
                      <Badge variant="outline" size="sm">Optional</Badge>
                    )}
                    {ingredient.category && (
                      <Badge variant="secondary" size="sm">{ingredient.category}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instructions Tab */}
        <TabsContent value="instructions">
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recipe.instructions.map((instruction, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checkedInstructions.has(index)}
                        onChange={() => toggleInstructionCheck(index)}
                        className="w-4 h-4 mt-1"
                      />
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-800">
                        {instruction.step}
                      </div>
                    </div>
                    <div className={`flex-1 ${checkedInstructions.has(index) ? 'line-through text-gray-500' : ''}`}>
                      <p className="text-gray-900 mb-2">{instruction.instruction}</p>
                      
                      {(instruction.timer || instruction.temperature || instruction.notes) && (
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          {instruction.timer && (
                            <span className="flex items-center gap-1">
                              ⏱️ {instruction.timer} min
                            </span>
                          )}
                          {instruction.temperature && (
                            <span className="flex items-center gap-1">
                              🌡️ {instruction.temperature}°F
                            </span>
                          )}
                        </div>
                      )}
                      
                      {instruction.notes && (
                        <p className="text-sm text-gray-600 mt-1 italic">
                          Note: {instruction.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <div className="space-y-6">
            {/* Tags and Dietary */}
            <Card>
              <CardHeader>
                <CardTitle>Tags & Dietary Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recipe.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {recipe.tags.map(tag => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {recipe.dietary.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Dietary Information</h4>
                    <div className="flex flex-wrap gap-2">
                      {recipe.dietary.map(diet => (
                        <Badge key={diet} variant="secondary" className="text-green-700 bg-green-100">
                          {diet}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Nutrition */}
            {recipe.nutrition && (
              <Card>
                <CardHeader>
                  <CardTitle>Nutrition Information</CardTitle>
                  <p className="text-sm text-gray-600">Per serving</p>
                </CardHeader>
                <CardContent>
                  <Grid className="grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{recipe.nutrition.perServing.calories}</div>
                      <div className="text-sm text-gray-600">Calories</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{recipe.nutrition.perServing.protein}g</div>
                      <div className="text-sm text-gray-600">Protein</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{recipe.nutrition.perServing.carbs}g</div>
                      <div className="text-sm text-gray-600">Carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{recipe.nutrition.perServing.fat}g</div>
                      <div className="text-sm text-gray-600">Fat</div>
                    </div>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Recipe History */}
            <Card>
              <CardHeader>
                <CardTitle>Recipe Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span>{new Date(recipe.metadata.createdAt).toLocaleDateString()}</span>
                </div>
                
                {recipe.metadata.lastCookedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last cooked:</span>
                    <span>{new Date(recipe.metadata.lastCookedAt).toLocaleDateString()}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Times cooked:</span>
                  <span>{recipe.metadata.cookCount}</span>
                </div>

                {recipe.source && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Source:</span>
                    <span>{recipe.source.type}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rating */}
            {onRate && (
              <Card>
                <CardHeader>
                  <CardTitle>Rate this Recipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => handleRating(star)}
                        className={`text-2xl ${
                          star <= userRating ? 'text-yellow-400' : 'text-gray-300'
                        } hover:text-yellow-400 transition-colors`}
                      >
                        ★
                      </button>
                    ))}
                    {userRating > 0 && (
                      <span className="ml-2 text-sm text-gray-600">
                        You rated this {userRating} star{userRating !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};