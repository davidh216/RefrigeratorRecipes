'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  onToggleFavorite?: (recipeId: string) => void;
  searchQuery?: string;
  className?: string;
}

interface RecipeCardProps {
  recipe: Recipe;
  onSelect?: () => void;
  onToggleFavorite?: () => void;
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
  onToggleFavorite,
  isDraggable = true,
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={clsx(
          'w-20 h-20 cursor-pointer transition-all duration-200 hover:shadow-lg',
          'relative overflow-hidden group border border-gray-200 hover:border-primary-300',
          isDragging && 'opacity-50 scale-95 rotate-1',
          isDraggable && 'cursor-grab active:cursor-grabbing',
          className
        )}
        draggable={isDraggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={onSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-2 relative z-10 h-full flex items-center justify-center">
          <motion.h3 
            className="font-medium text-gray-900 text-xs text-center leading-tight w-full flex items-center justify-center h-full"
            animate={{ color: isHovered ? '#3b82f6' : '#111827' }}
            transition={{ duration: 0.2 }}
          >
            {recipe.title.split(' ').map(word => 
              word.length > 8 ? word.substring(0, 3) : word
            ).join(' ')}
          </motion.h3>
        </CardContent>

        {/* Favorite Toggle Button - positioned outside CardContent */}
        {onToggleFavorite && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="absolute top-0.5 right-0.5 w-4 h-4 text-xs bg-white/90 backdrop-blur-sm rounded-full p-0 opacity-100 z-30 flex items-center justify-center shadow-sm"
            title={recipe.metadata.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {recipe.metadata.isFavorite ? '❤️' : '🤍'}
          </motion.button>
        )}

        {/* Hover Overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none"
            />
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export const RecipeSelector: React.FC<RecipeSelectorProps> = ({
  recipes,
  isLoading = false,
  onRecipeSelect,
  onSearchChange,
  onToggleFavorite,
  searchQuery = '',
  className,
}) => {
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  
  const RECIPES_PER_PAGE = 12; // 3 columns × 4 rows
  
  // Filter recipes based on favorites toggle
  const filteredRecipes = useMemo(() => {
    if (showOnlyFavorites) {
      return recipes.filter(recipe => recipe.metadata.isFavorite);
    }
    return recipes;
  }, [recipes, showOnlyFavorites]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredRecipes.length / RECIPES_PER_PAGE);
  const startIndex = currentPage * RECIPES_PER_PAGE;
  const paginatedRecipes = filteredRecipes.slice(startIndex, startIndex + RECIPES_PER_PAGE);
  
  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(0);
  }, [filteredRecipes.length]);
  return (
    <div 
      className={clsx('space-y-4 border border-gray-300 rounded-lg p-4 h-[575px] overflow-hidden flex flex-col', className)}
    >
      {/* Header */}
      <div className="border-b border-gray-200 pb-3">
        <h2 className="text-lg font-semibold text-gray-800 text-center">Recommended Recipes</h2>
      </div>

      {/* Search Input and Favorites Toggle */}
      <div className="flex items-center gap-2 w-full px-4">
        <Input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="flex-1 h-8"
          style={{ width: 'calc(288px - 60px)' }} // Decrease by half the heart toggle width (40px / 2 = 20px, so 40px + 20px = 60px)
        />
        <button
          onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
          className={`px-2 py-1 rounded-lg text-sm font-medium transition-colors flex-shrink-0 h-8 w-10 flex items-center justify-center ${
            showOnlyFavorites 
              ? 'bg-red-100 text-red-700 border border-red-300' 
              : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
          }`}
          title={showOnlyFavorites ? 'Show all recipes' : 'Show only favorites'}
        >
          {showOnlyFavorites ? '✓' : '❤️'}
        </button>
      </div>

      {/* Recipe List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div 
            className="grid grid-cols-3 gap-4 justify-center w-full px-4"
          >
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-gray-500">No recipes found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting your search terms
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              layout
              className="grid grid-cols-3 gap-4 justify-center w-full px-4"
            >
              {paginatedRecipes.map((recipe, index) => (
                <motion.div
                  key={recipe.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ 
                    duration: 0.2, 
                    delay: index * 0.02 
                  }}
                >
                  <RecipeCard
                    recipe={recipe}
                    onSelect={() => onRecipeSelect?.(recipe)}
                    onToggleFavorite={() => onToggleFavorite?.(recipe.id)}
                    isDraggable={true}
                  />
                </motion.div>
              ))}
              {/* Fill empty slots to maintain grid structure */}
              {Array.from({ length: Math.max(0, RECIPES_PER_PAGE - paginatedRecipes.length) }).map((_, index) => (
                <div key={`empty-${index}`} className="w-20 h-20 border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-xs">Empty</span>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className={clsx(
              'px-3 py-1 rounded text-sm font-medium transition-colors',
              currentPage === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            )}
          >
            ← Prev
          </button>
          
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">
              Page {currentPage + 1} of {totalPages}
            </span>
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className={clsx(
              'px-3 py-1 rounded text-sm font-medium transition-colors',
              currentPage >= totalPages - 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            )}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};