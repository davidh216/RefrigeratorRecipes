'use client';

import React, { useState } from 'react';
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

  const totalTime = recipe.prepTime + recipe.cookTime;
  const isQuickMeal = totalTime <= 20;

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
          'cursor-pointer transition-all duration-200 hover:shadow-xl',
          'relative overflow-hidden group border-2 border-gray-100 hover:border-primary-200',
          isDragging && 'opacity-50 scale-95 rotate-2',
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
        {/* Recipe Image Background (if available) */}
        {recipe.images && recipe.images.length > 0 && (
          <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
            <img 
              src={recipe.images[0]} 
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Quick Meal Badge */}
        {isQuickMeal && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-3 right-3 z-10"
          >
            <Badge className="bg-green-500 text-white text-xs px-2 py-1 shadow-lg">
              ⚡ Quick
            </Badge>
          </motion.div>
        )}

        <CardContent className="p-4 relative z-10">
          <div className="space-y-3">
            {/* Recipe Header */}
            <div className="space-y-2">
              <motion.h3 
                className="font-semibold text-gray-900 line-clamp-2 text-base"
                animate={{ color: isHovered ? '#3b82f6' : '#111827' }}
                transition={{ duration: 0.2 }}
              >
                {recipe.title}
              </motion.h3>
              <p className="text-sm text-gray-600 line-clamp-2">
                {recipe.description}
              </p>
            </div>

            {/* Recipe Stats */}
            <div className="flex flex-wrap gap-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Badge variant="outline" className="hover:bg-blue-50 text-xs px-2 py-1">
                  ⏱️ {totalTime} min
                </Badge>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Badge variant="outline" className="hover:bg-green-50 text-xs px-2 py-1">
                  👥 {recipe.servings} servings
                </Badge>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Badge className={clsx(getDifficultyColor(recipe.difficulty), "text-xs px-2 py-1")}>
                  {recipe.difficulty}
                </Badge>
              </motion.div>
            </div>

            {/* Recipe Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
              <motion.div 
                className="flex flex-wrap gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {recipe.tags.slice(0, 3).map((tag, index) => (
                  <motion.div
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    whileHover={{ scale: 1.1 }}
                  >
                    <Badge variant="secondary" className="text-xs px-2 py-1">
                      {tag}
                    </Badge>
                  </motion.div>
                ))}
                {recipe.tags.length > 3 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Badge variant="secondary" className="text-xs px-2 py-1">
                      +{recipe.tags.length - 3}
                    </Badge>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Drag Indicator */}
            <motion.div
              className="flex items-center justify-between pt-2 border-t border-gray-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-xs text-gray-500">
                {recipe.ingredients?.length || 0} ingredients
              </span>
              <motion.div
                className="flex items-center gap-1 text-xs text-gray-400"
                animate={{ 
                  x: isHovered ? [0, 5, 0] : 0,
                  opacity: isHovered ? 1 : 0.7
                }}
                transition={{ duration: 0.3 }}
              >
                <span>⋮⋮</span>
                <span>Drag to add...</span>
              </motion.div>
            </motion.div>
          </div>
        </CardContent>

        {/* Hover Overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none"
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
  searchQuery = '',
  className,
}) => {
  return (
    <Card className={clsx('h-fit shadow-lg', className)}>
      <CardHeader className="pb-6">
        <CardTitle className="text-xl font-semibold">Recipe Library</CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Drag recipes to meal slots or click to view details
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Search Input */}
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Recipe List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="h-24 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : recipes.length === 0 ? (
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
                className="space-y-4 max-h-96 overflow-y-auto pr-2"
              >
                {recipes.map((recipe, index) => (
                  <motion.div
                    key={recipe.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ 
                      duration: 0.3, 
                      delay: index * 0.05 
                    }}
                  >
                    <RecipeCard
                      recipe={recipe}
                      onSelect={() => onRecipeSelect?.(recipe)}
                      isDraggable={true}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Quick Actions */}
        {recipes.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} found
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};