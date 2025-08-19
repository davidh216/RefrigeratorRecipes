import React, { useState } from 'react';
import { RecipeFilters as RecipeFiltersType } from '@/types';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Input, 
  Select, 
  Button, 
  Badge,
  Flex,
  Grid,
  Divider
} from '@/components/ui';

interface RecipeFiltersProps {
  filters: RecipeFiltersType;
  onFiltersChange: (filters: Partial<RecipeFiltersType>) => void;
  onClearFilters: () => void;
  availableCuisines?: string[];
  availableTags?: string[];
  className?: string;
}

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'All Difficulties' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const MEAL_TYPE_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'appetizer', label: 'Appetizer' },
];

const DIETARY_OPTIONS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 
  'egg-free', 'soy-free', 'keto', 'paleo', 'low-carb', 'low-fat', 
  'high-protein', 'whole30', 'mediterranean', 'pescatarian'
];

const COMMON_TAGS = [
  'quick', 'easy', 'healthy', 'comfort-food', 'family-friendly', 
  'one-pot', 'make-ahead', 'freezer-friendly', 'budget-friendly', 
  'holiday', 'summer', 'winter', 'spicy', 'sweet', 'savory'
];

export const RecipeFilters: React.FC<RecipeFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  availableCuisines = [],
  availableTags = [],
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleInputChange = (field: keyof RecipeFiltersType, value: any) => {
    onFiltersChange({ [field]: value });
  };

  const toggleMealType = (mealType: string) => {
    const current = filters.mealType;
    const updated = current.includes(mealType)
      ? current.filter(m => m !== mealType)
      : [...current, mealType];
    handleInputChange('mealType', updated);
  };

  const toggleDietary = (dietary: string) => {
    const current = filters.dietary;
    const updated = current.includes(dietary)
      ? current.filter(d => d !== dietary)
      : [...current, dietary];
    handleInputChange('dietary', updated);
  };

  const toggleTag = (tag: string) => {
    const current = filters.tags;
    const updated = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag];
    handleInputChange('tags', updated);
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', filters.tags.filter(tag => tag !== tagToRemove));
  };

  const removeDietary = (dietaryToRemove: string) => {
    handleInputChange('dietary', filters.dietary.filter(d => d !== dietaryToRemove));
  };

  const removeMealType = (mealTypeToRemove: string) => {
    handleInputChange('mealType', filters.mealType.filter(m => m !== mealTypeToRemove));
  };

  // Combine available tags with common tags
  const allTags = [...new Set([...COMMON_TAGS, ...availableTags])];
  
  // Create cuisine options from available cuisines
  const cuisineOptions = [
    { value: '', label: 'All Cuisines' },
    ...availableCuisines.map(cuisine => ({
      value: cuisine,
      label: cuisine.charAt(0).toUpperCase() + cuisine.slice(1)
    }))
  ];

  const hasActiveFilters = 
    filters.search ||
    filters.difficulty !== 'all' ||
    filters.cuisine ||
    filters.mealType.length > 0 ||
    filters.dietary.length > 0 ||
    filters.tags.length > 0 ||
    filters.maxPrepTime ||
    filters.maxCookTime ||
    filters.maxTotalTime ||
    filters.minRating ||
    filters.isFavorite ||
    filters.hasIngredients;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filter Recipes</CardTitle>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
              >
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Less Filters' : 'More Filters'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Basic Filters - Always Visible */}
        <div className="space-y-4">
          {/* Search */}
          <Input
            label="Search Recipes"
            placeholder="Search by title, description, or ingredients..."
            value={filters.search}
            onChange={(e) => handleInputChange('search', e.target.value)}
            className="w-full"
          />

          {/* Quick Filters */}
          <Grid className="grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Difficulty"
              value={filters.difficulty}
              onChange={(e) => handleInputChange('difficulty', e.target.value as any)}
              options={DIFFICULTY_OPTIONS}
            />

            <Select
              label="Cuisine"
              value={filters.cuisine}
              onChange={(e) => handleInputChange('cuisine', e.target.value)}
              options={cuisineOptions}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Quick Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.isFavorite || false}
                    onChange={(e) => handleInputChange('isFavorite', e.target.checked || undefined)}
                    className="mr-2"
                  />
                  <span className="text-sm">Favorites only</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.hasIngredients || false}
                    onChange={(e) => handleInputChange('hasIngredients', e.target.checked || undefined)}
                    className="mr-2"
                  />
                  <span className="text-sm">I have ingredients</span>
                </label>
              </div>
            </div>
          </Grid>

          {/* Selected Meal Types */}
          {filters.mealType.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meal Types
              </label>
              <div className="flex flex-wrap gap-2">
                {filters.mealType.map(mealType => (
                  <Badge
                    key={mealType}
                    variant="default"
                    removable
                    onRemove={() => removeMealType(mealType)}
                  >
                    {mealType}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Selected Dietary */}
          {filters.dietary.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dietary Restrictions
              </label>
              <div className="flex flex-wrap gap-2">
                {filters.dietary.map(dietary => (
                  <Badge
                    key={dietary}
                    variant="secondary"
                    removable
                    onRemove={() => removeDietary(dietary)}
                  >
                    {dietary}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Selected Tags */}
          {filters.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {filters.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="outline"
                    removable
                    onRemove={() => removeTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Extended Filters - Collapsible */}
        {isExpanded && (
          <div className="space-y-6 mt-6">
            <Divider />

            {/* Time Filters */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Time Limits</h4>
              <Grid className="grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Max Prep Time (min)"
                  type="number"
                  min="1"
                  placeholder="e.g., 30"
                  value={filters.maxPrepTime || ''}
                  onChange={(e) => handleInputChange('maxPrepTime', parseInt(e.target.value) || undefined)}
                />

                <Input
                  label="Max Cook Time (min)"
                  type="number"
                  min="1"
                  placeholder="e.g., 60"
                  value={filters.maxCookTime || ''}
                  onChange={(e) => handleInputChange('maxCookTime', parseInt(e.target.value) || undefined)}
                />

                <Input
                  label="Max Total Time (min)"
                  type="number"
                  min="1"
                  placeholder="e.g., 90"
                  value={filters.maxTotalTime || ''}
                  onChange={(e) => handleInputChange('maxTotalTime', parseInt(e.target.value) || undefined)}
                />
              </Grid>
            </div>

            {/* Rating Filter */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Minimum Rating</h4>
              <Select
                value={filters.minRating?.toString() || ''}
                onChange={(e) => handleInputChange('minRating', e.target.value ? parseFloat(e.target.value) : undefined)}
                options={[
                  { value: '', label: 'Any Rating' },
                  { value: '4', label: '4+ Stars' },
                  { value: '3.5', label: '3.5+ Stars' },
                  { value: '3', label: '3+ Stars' },
                  { value: '2.5', label: '2.5+ Stars' },
                ]}
              />
            </div>

            {/* Meal Type Selection */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Meal Types</h4>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPE_OPTIONS.map(option => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={filters.mealType.includes(option.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleMealType(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Dietary Restrictions */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Dietary Restrictions</h4>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map(dietary => (
                  <Button
                    key={dietary}
                    type="button"
                    variant={filters.dietary.includes(dietary) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDietary(dietary)}
                  >
                    {dietary}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {allTags.filter(tag => !filters.tags.includes(tag)).map(tag => (
                  <Button
                    key={tag}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleTag(tag)}
                    className="text-xs"
                  >
                    + {tag}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filter Summary */}
        {hasActiveFilters && (
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">
              {[
                filters.search && `"${filters.search}"`,
                filters.difficulty !== 'all' && filters.difficulty,
                filters.cuisine && filters.cuisine,
                filters.mealType.length > 0 && `${filters.mealType.length} meal types`,
                filters.dietary.length > 0 && `${filters.dietary.length} dietary restrictions`,
                filters.tags.length > 0 && `${filters.tags.length} tags`,
                filters.isFavorite && 'favorites',
                filters.hasIngredients && 'has ingredients',
              ].filter(Boolean).join(' • ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};