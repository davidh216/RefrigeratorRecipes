'use client';

import React, { useState } from 'react';
import { Recipe } from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Button,
  Badge,
  Flex,
  Grid,
  Loading,
} from '@/components/ui';
import { clsx } from 'clsx';

interface RecipeSelectorProps {
  recipes: Recipe[];
  isLoading?: boolean;
  onRecipeSelect?: (recipe: Recipe) => void;
  onSearchChange?: (query: string) => void;
  searchQuery?: string;
  className?: string;
}

interface RecipeCardProps {
  recipe: Recipe;
  onSelect?: () => void;
  isDraggable?: boolean;
  className?: string;
}

const getDifficultyColor = (difficulty: Recipe['difficulty']): string => {
  const colors = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800', 
    hard: 'bg-red-100 text-red-800',
  };
  return colors[difficulty];
};

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onSelect,
  isDraggable = true,
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return;
    
    setIsDragging(true);
    
    // Set drag data
    const dragData = {
      recipeId: recipe.id,
      recipe: recipe,
    };
    
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const totalTime = recipe.prepTime + recipe.cookTime;

  return (
    <Card
      className={clsx(
        'cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105',
        isDragging && 'opacity-50 scale-95',
        isDraggable && 'cursor-grab active:cursor-grabbing',
        className
      )}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onSelect}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-2 sm:space-y-3">
          {/* Recipe Header */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 line-clamp-2">
              {recipe.title}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              {recipe.description}
            </p>
          </div>

          {/* Recipe Stats */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">
              ⏱️ {totalTime} min
            </Badge>
            <Badge variant="outline">
              👥 {recipe.servings} servings
            </Badge>
            <Badge className={getDifficultyColor(recipe.difficulty)}>
              {recipe.difficulty}
            </Badge>
          </div>

          {/* Recipe Tags */}
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {recipe.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{recipe.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Drag Indicator */}
          {isDraggable && (
            <div className="flex items-center justify-center pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <span className="text-gray-300">⋮⋮</span>
                Drag to add to meal plan
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const RecipeSelector: React.FC<RecipeSelectorProps> = ({
  recipes,
  isLoading = false,
  onRecipeSelect,
  onSearchChange,
  searchQuery = '',
  className,
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  const handleSearchChange = (value: string) => {
    setLocalSearchQuery(value);
    onSearchChange?.(value);
  };

  const clearSearch = () => {
    setLocalSearchQuery('');
    onSearchChange?.('');
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Loading className="h-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Recipe Library</CardTitle>
        
        {/* Search Input */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Search recipes..."
            value={localSearchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pr-10"
          />
          {localSearchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              ×
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {recipes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchQuery ? 
                `No recipes found for "${searchQuery}"` : 
                'No recipes available'
              }
            </p>
            {searchQuery && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearSearch}
                className="mt-2"
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Flex align="center" justify="between">
              <p className="text-sm text-gray-600">
                {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} found
              </p>
              {searchQuery && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearSearch}
                >
                  Clear search
                </Button>
              )}
            </Flex>

            <Grid cols={1} className="gap-3 sm:gap-4 max-h-80 sm:max-h-96 overflow-y-auto">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onSelect={() => onRecipeSelect?.(recipe)}
                />
              ))}
            </Grid>
          </div>
        )}
      </CardContent>
    </Card>
  );
};