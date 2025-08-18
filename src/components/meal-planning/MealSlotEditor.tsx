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
  isLoading?: boolean;
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
              👥 {recipe.servings} servings
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
  isLoading = false,
}) => {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [servings, setServings] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset form when meal slot changes
  useEffect(() => {
    if (mealSlot) {
      setSelectedRecipeId(mealSlot.recipeId || '');
      setServings(mealSlot.servings || 1);
      setNotes(mealSlot.notes || '');
    }
  }, [mealSlot]);

  const selectedRecipe = availableRecipes.find(r => r.id === selectedRecipeId);
  const mealTypeInfo = MEAL_TYPE_INFO[mealSlot?.mealType || 'breakfast'];
  
  const filteredRecipes = availableRecipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleRecipeSelect = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    if (recipeId) {
      const recipe = availableRecipes.find(r => r.id === recipeId);
      if (recipe) {
        setServings(recipe.servings || 1);
      }
    }
  };

  const handleSave = () => {
    if (!mealSlot) return;
    
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle className="flex items-center gap-3">
          <span className="text-2xl">{mealTypeInfo?.emoji}</span>
          <div>
            <div className="text-xl font-semibold">
              {mealTypeInfo?.label} - {mealSlot?.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </ModalTitle>
      </ModalHeader>
      
      <ModalBody className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Recipe Selection */}
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 text-lg mb-3">Select Recipe</h4>
            
            {/* Search */}
            <Input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />

            {/* Recipe List */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
              {/* No Recipe Option */}
              <Card
                className={clsx(
                  'cursor-pointer transition-all duration-200 hover:shadow-md border-2',
                  selectedRecipeId === '' 
                    ? 'ring-2 ring-primary-500 bg-primary-50 border-primary-300' 
                    : 'hover:bg-gray-50 border-gray-200'
                )}
                onClick={() => setSelectedRecipeId('')}
              >
                <CardContent className="p-4">
                  <div className="text-center text-gray-500">
                    <div className="text-2xl mb-2">🍽️</div>
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
              <div className="text-center py-6 text-gray-500">
                <div className="text-3xl mb-3">🔍</div>
                <p>No recipes found for "{searchQuery}"</p>
                <Button 
                  variant="outline" 
                  onClick={() => setSearchQuery('')}
                  className="mt-3"
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
              <h4 className="font-semibold text-gray-900 text-lg mb-3">Recipe Details</h4>
              
              <Card className="bg-blue-50 border-blue-200 shadow-md">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-semibold text-blue-900">{selectedRecipe.title}</h5>
                      <p className="text-blue-700 text-sm mt-1">{selectedRecipe.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white rounded p-2 border border-blue-200">
                        <span className="font-medium text-blue-800">Prep Time:</span>
                        <span className="text-blue-700 ml-1">{selectedRecipe.prepTime} min</span>
                      </div>
                      <div className="bg-white rounded p-2 border border-blue-200">
                        <span className="font-medium text-blue-800">Cook Time:</span>
                        <span className="text-blue-700 ml-1">{selectedRecipe.cookTime} min</span>
                      </div>
                    </div>

                    <div className="bg-white rounded p-2 border border-blue-200">
                      <h6 className="font-medium text-blue-800 mb-1">Ingredients:</h6>
                      <p className="text-sm text-blue-700">
                        {selectedRecipe.ingredients?.slice(0, 3).map(ing => ing.name).join(', ')}
                        {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 3 && 
                          ` (+${selectedRecipe.ingredients.length - 3} more)`
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Meal Details */}
        <div className="space-y-4">
          <Divider />
          
          <div>
            <h4 className="font-semibold text-gray-900 text-lg mb-3">Meal Details</h4>
            
            <div className="space-y-4">
              {/* Servings */}
              {selectedRecipe && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Servings
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={servings}
                    onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                    className="w-32"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <Textarea
                  placeholder="Add any special instructions or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>
      </ModalBody>
      
      <ModalFooter className="gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        
        {mealSlot?.recipe && (
          <Button 
            variant="destructive" 
            onClick={handleRemoveRecipe}
            disabled={isLoading}
          >
            Remove Recipe
          </Button>
        )}
        
        <Button 
          variant="primary" 
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};