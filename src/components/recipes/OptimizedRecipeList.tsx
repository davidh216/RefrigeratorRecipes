'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Recipe } from '@/types';
import { VirtualList } from '@/components/ui/VirtualList';
import { OptimizedSearch } from '@/components/ui/OptimizedSearch';
import { RecipeCard } from './RecipeCard';
import { RecipeFilters } from './RecipeFilters';

interface OptimizedRecipeListProps {
  recipes: Recipe[];
  className?: string;
  onRecipeClick?: (recipe: Recipe) => void;
  onRecipeEdit?: (recipe: Recipe) => void;
  onRecipeDelete?: (recipe: Recipe) => void;
}

const ITEM_HEIGHT = 200; // Height of each recipe card
const CONTAINER_HEIGHT = 600; // Height of the virtual list container

export const OptimizedRecipeList: React.FC<OptimizedRecipeListProps> = React.memo(({
  recipes,
  className = '',
  onRecipeClick,
  onRecipeEdit,
  onRecipeDelete,
}) => {
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>(recipes);
  const [sortBy, setSortBy] = useState<string>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Memoized sorted recipes
  const sortedRecipes = useMemo(() => {
    return [...filteredRecipes].sort((a, b) => {
      let aValue: any = a[sortBy as keyof Recipe];
      let bValue: any = b[sortBy as keyof Recipe];

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredRecipes, sortBy, sortOrder]);

  // Handle sort change
  const handleSortChange = useCallback((value: string) => {
    const [field, order] = value.split('-');
    setSortBy(field);
    setSortOrder(order as 'asc' | 'desc');
  }, []);

  // Render individual recipe item
  const renderRecipeItem = useCallback((recipe: Recipe, index: number) => (
    <div className="p-2">
      <RecipeCard
        recipe={recipe}
        onClick={() => onRecipeClick?.(recipe)}
        onEdit={() => onRecipeEdit?.(recipe)}
        onDelete={() => onRecipeDelete?.(recipe)}
      />
    </div>
  ), [onRecipeClick, onRecipeEdit, onRecipeDelete]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar - Full Width */}
      <div className="w-full">
        <OptimizedSearch
          items={recipes}
          searchKeys={['title', 'description', 'cuisine', 'tags']}
          onResultsChange={setFilteredRecipes}
          placeholder="Search recipes..."
          debounceMs={300}
          minSearchLength={2}
          className="w-full"
        />
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <RecipeFilters
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {sortedRecipes.length} of {recipes.length} recipes
      </div>

      {/* Virtual List */}
      {sortedRecipes.length > 0 ? (
        <VirtualList
          items={sortedRecipes}
          itemHeight={ITEM_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          overscan={3}
          renderItem={renderRecipeItem}
          className="border rounded-lg"
        />
      ) : (
        <div className="text-center py-8 text-gray-500">
          No recipes found. Try adjusting your search or filters.
        </div>
      )}
    </div>
  );
});
