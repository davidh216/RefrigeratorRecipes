'use client';

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
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
import { usePaginatedRecipes } from '@/hooks/usePaginatedRecipes';

interface OptimizedRecipeListProps {
  userIngredients?: Ingredient[];
  onView?: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
  onToggleFavorite?: (recipe: Recipe) => void;
  showActions?: boolean;
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

export const OptimizedRecipeList: React.FC<OptimizedRecipeListProps> = React.memo(({
  userIngredients = [],
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  showActions = true,
  emptyMessage = "No recipes found. Try adjusting your filters or create your first recipe!",
  className = '',
}) => {
  const [viewMode, setViewMode] = React.useState<'grid' | 'compact'>('grid');
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Use the paginated recipes hook
  const {
    recipes,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    filters,
    sortOptions,
    isLoading,
    isError,
    error,
    setSortOptions,
  } = usePaginatedRecipes();

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Memoized sorted recipes
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
          aValue = a.timing.prepTime;
          bValue = b.timing.prepTime;
          break;
        case 'cookTime':
          aValue = a.timing.cookTime;
          bValue = b.timing.cookTime;
          break;
        case 'totalTime':
          aValue = a.timing.totalTime;
          bValue = b.timing.totalTime;
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

  const handleSortChange = useCallback((value: string) => {
    const option = SORT_OPTIONS.find(opt => opt.value === value);
    if (option) {
      setSortOptions({
        field: option.field,
        direction: option.direction,
      });
    }
  }, [setSortOptions]);

  const currentSortValue = `${sortOptions.field}-${sortOptions.direction}`;

  // Memoized recipe cards to prevent unnecessary re-renders
  const recipeCards = useMemo(() => {
    return sortedRecipes.map((recipe) => (
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
    ));
  }, [sortedRecipes, userIngredients, onView, onEdit, onDelete, onToggleFavorite, showActions, viewMode]);

  if (isError) {
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
        <>
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {recipeCards}
          </div>

          {/* Load More Trigger */}
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isFetchingNextPage && (
              <Loading size="md" />
            )}
            {hasNextPage && !isFetchingNextPage && (
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                className="mt-4"
              >
                Load More Recipes
              </Button>
            )}
          </div>
        </>
      )}

      {/* Recipe Count Summary */}
      {!isLoading && sortedRecipes.length > 0 && (
        <div className="text-center pt-6">
          <p className="text-sm text-gray-500">
            Showing {sortedRecipes.length} recipes
            {hasNextPage && ' (scroll to load more)'}
          </p>
        </div>
      )}
    </div>
  );
});

OptimizedRecipeList.displayName = 'OptimizedRecipeList';
