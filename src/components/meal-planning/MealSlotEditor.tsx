'use client';

import React, { useState, useEffect } from 'react';
import { MealSlot, Recipe, MealType } from '@/types';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Select,
  Badge,
  Flex,
  Card,
  CardContent,
  Divider,
} from '@/components/ui';
import { clsx } from 'clsx';

interface MealSlotEditorProps {
  isOpen: boolean;
  onClose: () => void;
  mealSlot: MealSlot | null;
  availableRecipes: Recipe[];
  onSave: (slotId: string, updates: Partial<MealSlot>) => void;
  onRemoveRecipe: (slotId: string) => void;
}

interface RecipeSelectCardProps {
  recipe: Recipe;
  isSelected: boolean;
  onSelect: () => void;
}

const MEAL_TYPE_INFO = {
  breakfast: { label: 'Breakfast', emoji: '🍳' },
  lunch: { label: 'Lunch', emoji: '🥗' },
  dinner: { label: 'Dinner', emoji: '🍽️' },
  snack: { label: 'Snack', emoji: '🍎' },
};

const RecipeSelectCard: React.FC<RecipeSelectCardProps> = ({
  recipe,
  isSelected,
  onSelect,
}) => {
  const totalTime = recipe.prepTime + recipe.cookTime;

  return (
    <Card
      className={clsx(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : 'hover:bg-gray-50'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-gray-900">{recipe.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{recipe.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              ⏱️ {totalTime} min
            </Badge>
            <Badge variant="outline" className="text-xs">
              👥 {recipe.servings.count} servings
            </Badge>
            <Badge 
              className={clsx(
                'text-xs',
                recipe.difficulty === 'easy' && 'bg-green-100 text-green-800',
                recipe.difficulty === 'medium' && 'bg-yellow-100 text-yellow-800',
                recipe.difficulty === 'hard' && 'bg-red-100 text-red-800'
              )}
            >
              {recipe.difficulty}
            </Badge>
          </div>

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
        </div>
      </CardContent>
    </Card>
  );
};

export const MealSlotEditor: React.FC<MealSlotEditorProps> = ({
  isOpen,
  onClose,
  mealSlot,
  availableRecipes,
  onSave,
  onRemoveRecipe,
}) => {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [servings, setServings] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (mealSlot) {
      setSelectedRecipeId(mealSlot.recipeId || '');
      setServings(mealSlot.servings || mealSlot.recipe?.servings || 1);
      setNotes(mealSlot.notes || '');
    }
  }, [mealSlot]);

  const handleSave = () => {
    if (!mealSlot) return;

    const selectedRecipe = availableRecipes.find(r => r.id === selectedRecipeId);
    
    const updates: Partial<MealSlot> = {
      recipeId: selectedRecipeId || undefined,
      recipe: selectedRecipe || undefined,
      servings: selectedRecipeId ? servings : undefined,
      notes: notes.trim() || undefined,
    };

    onSave(mealSlot.id, updates);
    onClose();
  };

  const handleRemoveRecipe = () => {
    if (!mealSlot) return;
    onRemoveRecipe(mealSlot.id);
    onClose();
  };

  const handleRecipeSelect = (recipeId: string) => {
    const recipe = availableRecipes.find(r => r.id === recipeId);
    setSelectedRecipeId(recipeId);
    if (recipe) {
              setServings(recipe.servings.count);
    }
  };

  const filteredRecipes = availableRecipes.filter(recipe => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      recipe.title.toLowerCase().includes(query) ||
      recipe.description.toLowerCase().includes(query) ||
      recipe.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  if (!mealSlot) return null;

  const mealTypeInfo = MEAL_TYPE_INFO[mealSlot.mealType];
  const selectedRecipe = availableRecipes.find(r => r.id === selectedRecipeId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>
          Edit {mealTypeInfo.label} - {mealSlot.date.toLocaleDateString()}
        </ModalTitle>
      </ModalHeader>

      <ModalBody className="space-y-6">
        {/* Meal Slot Info */}
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <Flex align="center" className="gap-3">
              <span className="text-2xl">{mealTypeInfo.emoji}</span>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {mealTypeInfo.label}
                </h3>
                <p className="text-sm text-gray-600">
                  {mealSlot.date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </Flex>
          </CardContent>
        </Card>

        {/* Recipe Selection */}
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Select Recipe</h4>
            
            {/* Search */}
            <Input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />

            {/* Recipe List */}
            <div className="max-h-64 overflow-y-auto space-y-3">
              {/* No Recipe Option */}
              <Card
                className={clsx(
                  'cursor-pointer transition-all duration-200 hover:shadow-md',
                  selectedRecipeId === '' ? 'ring-2 ring-primary-500 bg-primary-50' : 'hover:bg-gray-50'
                )}
                onClick={() => setSelectedRecipeId('')}
              >
                <CardContent className="p-4">
                  <div className="text-center text-gray-500">
                    <p className="font-medium">No Recipe</p>
                    <p className="text-sm">Leave this meal slot empty</p>
                  </div>
                </CardContent>
              </Card>

              {filteredRecipes.map((recipe) => (
                <RecipeSelectCard
                  key={recipe.id}
                  recipe={recipe}
                  isSelected={selectedRecipeId === recipe.id}
                  onSelect={() => handleRecipeSelect(recipe.id)}
                />
              ))}
            </div>

            {filteredRecipes.length === 0 && searchQuery && (
              <div className="text-center py-8 text-gray-500">
                <p>No recipes found for "{searchQuery}"</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Selected Recipe Details */}
        {selectedRecipe && (
          <div className="space-y-4">
            <Divider />
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Recipe Details</h4>
              
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-semibold text-blue-900">{selectedRecipe.title}</h5>
                      <p className="text-sm text-blue-700">{selectedRecipe.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-blue-800">Prep Time:</span>
                        <span className="text-blue-700 ml-1">{selectedRecipe.prepTime} min</span>
                      </div>
                      <div>
                        <span className="font-medium text-blue-800">Cook Time:</span>
                        <span className="text-blue-700 ml-1">{selectedRecipe.cookTime} min</span>
                      </div>
                    </div>

                    <div>
                      <h6 className="font-medium text-blue-800 mb-1">Ingredients:</h6>
                      <p className="text-sm text-blue-700">
                        {selectedRecipe.ingredients.slice(0, 3).join(', ')}
                        {selectedRecipe.ingredients.length > 3 && 
                          ` (+${selectedRecipe.ingredients.length - 3} more)`
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Servings Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Servings
              </label>
              <Input
                type="number"
                min="1"
                max="20"
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                className="w-24"
              />
              <p className="text-xs text-gray-500 mt-1">
                Original recipe serves {selectedRecipe.servings.count}
              </p>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes for this meal..."
            rows={3}
          />
        </div>
      </ModalBody>

      <ModalFooter>
        <Flex justify="between" className="w-full">
          <div>
            {mealSlot.recipeId && (
              <Button 
                variant="destructive" 
                onClick={handleRemoveRecipe}
              >
                Remove Recipe
              </Button>
            )}
          </div>
          
          <Flex className="gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save Changes
            </Button>
          </Flex>
        </Flex>
      </ModalFooter>
    </Modal>
  );
};