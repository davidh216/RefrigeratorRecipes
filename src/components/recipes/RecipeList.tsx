import React, { useState, useMemo } from 'react';
import { Recipe, RecipeSortOptions, Ingredient } from '@/types';
import { 
  Grid, 
  Select, 
  Button, 
  Flex,
  Loading,
  Alert,
  AlertDescription
} from '@/components/ui';
import { RecipeCard } from './RecipeCard';

interface RecipeListProps {
  recipes: Recipe[];
  userIngredients?: Ingredient[];
  isLoading?: boolean;
  error?: string | null;
  onView?: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  onToggleFavorite?: (recipe: Recipe) => void;
  showActions?: boolean;
  sortOptions?: RecipeSortOptions;
  onSortChange?: (options: RecipeSortOptions) => void;
  emptyMessage?: string;
  className?: string;
}

const SORT_OPTIONS = [
  { value: 'title-asc', label: 'Title A-Z', field: 'title' as const, direction: 'asc' as const },
  { value: 'title-desc', label: 'Title Z-A', field: 'title' as const, direction: 'desc' as const },
  { value: 'difficulty-asc', label: 'Difficulty: Easy to Hard', field: 'difficulty' as const, direction: 'asc' as const },
  { value: 'difficulty-desc', label: 'Difficulty: Hard to Easy', field: 'difficulty' as const, direction: 'desc' as const },
  { value: 'prepTime-asc', label: 'Prep Time: Shortest First', field: 'prepTime' as const, direction: 'asc' as const },
  { value: 'prepTime-desc', label: 'Prep Time: Longest First', field: 'prepTime' as const, direction: 'desc' as const },
  { value: 'cookTime-asc', label: 'Cook Time: Shortest First', field: 'cookTime' as const, direction: 'asc' as const },
  { value: 'cookTime-desc', label: 'Cook Time: Longest First', field: 'cookTime' as const, direction: 'desc' as const },
  { value: 'totalTime-asc', label: 'Total Time: Shortest First', field: 'totalTime' as const, direction: 'asc' as const },
  { value: 'totalTime-desc', label: 'Total Time: Longest First', field: 'totalTime' as const, direction: 'desc' as const },
  { value: 'rating-desc', label: 'Highest Rated', field: 'rating' as const, direction: 'desc' as const },
  { value: 'rating-asc', label: 'Lowest Rated', field: 'rating' as const, direction: 'asc' as const },
  { value: 'createdAt-desc', label: 'Newest First', field: 'createdAt' as const, direction: 'desc' as const },
  { value: 'createdAt-asc', label: 'Oldest First', field: 'createdAt' as const, direction: 'asc' as const },
  { value: 'lastCookedAt-desc', label: 'Recently Cooked', field: 'lastCookedAt' as const, direction: 'desc' as const },
  { value: 'cookCount-desc', label: 'Most Cooked', field: 'cookCount' as const, direction: 'desc' as const },
];

export const RecipeList: React.FC<RecipeListProps> = React.memo(({
  recipes,
  userIngredients = [],
  isLoading = false,
  error = null,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  showActions = true,
  sortOptions = { field: 'title', direction: 'asc' },
  onSortChange,
  emptyMessage = "No recipes found. Try adjusting your filters or create your first recipe!",
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');

  // Sort recipes
  const sortedRecipes = useMemo(() => {
    if (!recipes.length) return [];

    return [...recipes].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOptions.field) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'difficulty':
          const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
          aValue = difficultyOrder[a.difficulty];
          bValue = difficultyOrder[b.difficulty];
          break;
        case 'prepTime':
          aValue = a.prepTime;
          bValue = b.prepTime;
          break;
        case 'cookTime':
          aValue = a.cookTime;
          bValue = b.cookTime;
          break;
        case 'totalTime':
          aValue = a.totalTime;
          bValue = b.totalTime;
          break;
        case 'rating':
          aValue = a.ratings.average;
          bValue = b.ratings.average;
          break;
        case 'createdAt':
          aValue = new Date(a.metadata.createdAt).getTime();
          bValue = new Date(b.metadata.createdAt).getTime();
          break;
        case 'lastCookedAt':
          aValue = a.metadata.lastCookedAt ? new Date(a.metadata.lastCookedAt).getTime() : 0;
          bValue = b.metadata.lastCookedAt ? new Date(b.metadata.lastCookedAt).getTime() : 0;
          break;
        case 'cookCount':
          aValue = a.metadata.cookCount;
          bValue = b.metadata.cookCount;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOptions.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOptions.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [recipes, sortOptions]);

  const handleSortChange = (value: string) => {
    const option = SORT_OPTIONS.find(opt => opt.value === value);
    if (option && onSortChange) {
      onSortChange({
        field: option.field,
        direction: option.direction,
      });
    }
  };

  const currentSortValue = `${sortOptions.field}-${sortOptions.direction}`;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Controls */}
      <Flex className="items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {isLoading ? 'Loading...' : `${sortedRecipes.length} recipe${sortedRecipes.length !== 1 ? 's' : ''}`}
          </span>
          
          {/* View Mode Toggle */}
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('compact')}
              className="rounded-l-none border-l"
            >
              Compact
            </Button>
          </div>
        </div>

        {/* Sort Options */}
        {onSortChange && (
          <Select
            value={currentSortValue}
            onChange={(e) => handleSortChange(e.target.value)}
            options={[
              { value: '', label: 'Sort by...' },
              ...SORT_OPTIONS.map(option => ({
                value: option.value,
                label: option.label
              }))
            ]}
            className="min-w-48"
          />
        )}
      </Flex>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loading size="lg" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && sortedRecipes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🍽️</div>
          <p className="text-gray-600 text-lg mb-2">No recipes found</p>
          <p className="text-gray-500 text-sm">{emptyMessage}</p>
        </div>
      )}

      {/* Recipe Grid */}
      {!isLoading && sortedRecipes.length > 0 && (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {sortedRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              userIngredients={userIngredients}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
              showActions={showActions}
              className={viewMode === 'compact' ? 'flex flex-row' : ''}
            />
          ))}
        </div>
      )}

      {/* Recipe Count Summary */}
      {!isLoading && sortedRecipes.length > 0 && (
        <div className="text-center pt-6">
          <p className="text-sm text-gray-500">
            Showing {sortedRecipes.length} of {recipes.length} recipes
          </p>
        </div>
      )}
    </div>
  );
});