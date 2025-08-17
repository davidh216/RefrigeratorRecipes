import React, { useState, useCallback } from 'react';
import { RecipeFormData, RecipeIngredient, RecipeInstruction, Ingredient } from '@/types';
import { 
  Input, 
  Select, 
  Button, 
  Badge, 
  Textarea, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Flex,
  Grid,
  Divider 
} from '@/components/ui';
import { RecipeIngredientSelector } from './RecipeIngredientSelector';

interface RecipeFormProps {
  initialData?: Partial<RecipeFormData>;
  userIngredients?: Ingredient[];
  onSubmit: (data: RecipeFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
  isLoading?: boolean;
}

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const CUISINE_OPTIONS = [
  { value: '', label: 'Select Cuisine' },
  { value: 'american', label: 'American' },
  { value: 'italian', label: 'Italian' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'indian', label: 'Indian' },
  { value: 'thai', label: 'Thai' },
  { value: 'french', label: 'French' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'korean', label: 'Korean' },
  { value: 'greek', label: 'Greek' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'middle-eastern', label: 'Middle Eastern' },
  { value: 'other', label: 'Other' },
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

export const RecipeForm: React.FC<RecipeFormProps> = ({
  initialData,
  userIngredients = [],
  onSubmit,
  onCancel,
  isEditing = false,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<RecipeFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    images: initialData?.images || [],
    difficulty: initialData?.difficulty || 'easy',
    cuisine: initialData?.cuisine || '',
    mealType: initialData?.mealType || [],
    prepTime: initialData?.prepTime || 15,
    cookTime: initialData?.cookTime || 30,
    restTime: initialData?.restTime || 0,
    servingsCount: initialData?.servingsCount || 4,
    servingsNotes: initialData?.servingsNotes || '',
    ingredients: initialData?.ingredients || [{ name: '', amount: 1, unit: 'cups', isOptional: false }],
    instructions: initialData?.instructions || [{ step: 1, instruction: '' }],
    tags: initialData?.tags || [],
    dietary: initialData?.dietary || [],
    isPublic: initialData?.isPublic || false,
    allowComments: initialData?.allowComments || true,
    allowRating: initialData?.allowRating || true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState('');
  const [showIngredientSelector, setShowIngredientSelector] = useState(false);
  const [selectedIngredientIndex, setSelectedIngredientIndex] = useState<number | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Recipe title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Recipe description is required';
    }

    if (formData.prepTime <= 0) {
      newErrors.prepTime = 'Prep time must be greater than 0';
    }

    if (formData.cookTime <= 0) {
      newErrors.cookTime = 'Cook time must be greater than 0';
    }

    if (formData.servingsCount <= 0) {
      newErrors.servingsCount = 'Servings must be greater than 0';
    }

    if (formData.ingredients.length === 0) {
      newErrors.ingredients = 'At least one ingredient is required';
    } else {
      const hasEmptyIngredient = formData.ingredients.some(ing => !ing.name.trim());
      if (hasEmptyIngredient) {
        newErrors.ingredients = 'All ingredients must have a name';
      }
    }

    if (formData.instructions.length === 0) {
      newErrors.instructions = 'At least one instruction is required';
    } else {
      const hasEmptyInstruction = formData.instructions.some(inst => !inst.instruction.trim());
      if (hasEmptyInstruction) {
        newErrors.instructions = 'All instructions must have content';
      }
    }

    if (formData.mealType.length === 0) {
      newErrors.mealType = 'At least one meal type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Calculate total time
      const totalTime = formData.prepTime + formData.cookTime + (formData.restTime || 0);
      
      // Prepare final data
      const finalData: RecipeFormData = {
        ...formData,
        ingredients: formData.ingredients.filter(ing => ing.name.trim()),
        instructions: formData.instructions
          .filter(inst => inst.instruction.trim())
          .map((inst, index) => ({ ...inst, step: index + 1 })),
      };

      onSubmit(finalData);
    }
  };

  const handleInputChange = (field: keyof RecipeFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: 1, unit: 'cups', isOptional: false }],
    }));
  };

  const updateIngredient = (index: number, updates: Partial<RecipeIngredient>) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, ...updates } : ing
      ),
    }));
  };

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const addInstruction = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, { step: prev.instructions.length + 1, instruction: '' }],
    }));
  };

  const updateInstruction = (index: number, updates: Partial<RecipeInstruction>) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => 
        i === index ? { ...inst, ...updates } : inst
      ),
    }));
  };

  const removeInstruction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index),
    }));
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      handleInputChange('tags', [...formData.tags, trimmedTag]);
    }
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const toggleDietary = (dietary: string) => {
    const current = formData.dietary;
    const updated = current.includes(dietary)
      ? current.filter(d => d !== dietary)
      : [...current, dietary];
    handleInputChange('dietary', updated);
  };

  const toggleMealType = (mealType: string) => {
    const current = formData.mealType;
    const updated = current.includes(mealType)
      ? current.filter(m => m !== mealType)
      : [...current, mealType];
    handleInputChange('mealType', updated);
  };

  const openIngredientSelector = (index: number) => {
    setSelectedIngredientIndex(index);
    setShowIngredientSelector(true);
  };

  const handleIngredientSelect = useCallback((selectedIngredient: Ingredient) => {
    if (selectedIngredientIndex !== null) {
      updateIngredient(selectedIngredientIndex, {
        id: selectedIngredient.id,
        name: selectedIngredient.name,
        unit: selectedIngredient.unit,
      });
    }
    setShowIngredientSelector(false);
    setSelectedIngredientIndex(null);
  }, [selectedIngredientIndex]);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Recipe Title *"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            error={errors.title}
            placeholder="e.g., Spaghetti Carbonara"
          />

          <Textarea
            label="Description *"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            error={errors.description}
            placeholder="Describe your recipe..."
            rows={3}
          />

          <Grid className="grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Difficulty *"
              value={formData.difficulty}
              onChange={(e) => handleInputChange('difficulty', e.target.value as any)}
              options={DIFFICULTY_OPTIONS}
            />

            <Select
              label="Cuisine"
              value={formData.cuisine || ''}
              onChange={(e) => handleInputChange('cuisine', e.target.value || undefined)}
              options={CUISINE_OPTIONS}
            />

            <Input
              label="Servings *"
              type="number"
              min="1"
              value={formData.servingsCount}
              onChange={(e) => handleInputChange('servingsCount', parseInt(e.target.value) || 1)}
              error={errors.servingsCount}
            />
          </Grid>

          <Input
            label="Servings Notes"
            value={formData.servingsNotes}
            onChange={(e) => handleInputChange('servingsNotes', e.target.value)}
            placeholder="e.g., serves 4-6 adults"
          />
        </CardContent>
      </Card>

      {/* Timing */}
      <Card>
        <CardHeader>
          <CardTitle>Timing</CardTitle>
        </CardHeader>
        <CardContent>
          <Grid className="grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Prep Time (minutes) *"
              type="number"
              min="1"
              value={formData.prepTime}
              onChange={(e) => handleInputChange('prepTime', parseInt(e.target.value) || 0)}
              error={errors.prepTime}
            />

            <Input
              label="Cook Time (minutes) *"
              type="number"
              min="1"
              value={formData.cookTime}
              onChange={(e) => handleInputChange('cookTime', parseInt(e.target.value) || 0)}
              error={errors.cookTime}
            />

            <Input
              label="Rest Time (minutes)"
              type="number"
              min="0"
              value={formData.restTime || 0}
              onChange={(e) => handleInputChange('restTime', parseInt(e.target.value) || 0)}
              helperText="For rising, marinating, cooling, etc."
            />
          </Grid>

          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">
              Total Time: {formData.prepTime + formData.cookTime + (formData.restTime || 0)} minutes
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Meal Types */}
      <Card>
        <CardHeader>
          <CardTitle>Meal Types *</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={formData.mealType.includes(option.value) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleMealType(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {errors.mealType && (
            <p className="text-sm text-red-600 mt-1">{errors.mealType}</p>
          )}
        </CardContent>
      </Card>

      {/* Ingredients */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredients *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.ingredients.map((ingredient, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <Flex className="items-start gap-3">
                <div className="flex-1">
                  <Input
                    label="Ingredient Name"
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(index, { name: e.target.value })}
                    placeholder="e.g., Tomatoes"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openIngredientSelector(index)}
                  className="mt-6"
                >
                  From Pantry
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeIngredient(index)}
                  className="mt-6 text-red-600"
                  disabled={formData.ingredients.length === 1}
                >
                  Remove
                </Button>
              </Flex>

              <Grid className="grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  label="Amount"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={ingredient.amount}
                  onChange={(e) => updateIngredient(index, { amount: parseFloat(e.target.value) || 1 })}
                />

                <Input
                  label="Unit"
                  value={ingredient.unit}
                  onChange={(e) => updateIngredient(index, { unit: e.target.value })}
                  placeholder="e.g., cups, tbsp, pieces"
                />

                <div className="flex items-center mt-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={ingredient.isOptional}
                      onChange={(e) => updateIngredient(index, { isOptional: e.target.checked })}
                      className="mr-2"
                    />
                    Optional
                  </label>
                </div>
              </Grid>

              <Input
                label="Notes"
                value={ingredient.notes || ''}
                onChange={(e) => updateIngredient(index, { notes: e.target.value })}
                placeholder="e.g., finely chopped, room temperature"
              />
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addIngredient}>
            Add Ingredient
          </Button>

          {errors.ingredients && (
            <p className="text-sm text-red-600">{errors.ingredients}</p>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.instructions.map((instruction, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <Flex className="items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-800">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <Textarea
                    label={`Step ${index + 1}`}
                    value={instruction.instruction}
                    onChange={(e) => updateInstruction(index, { instruction: e.target.value })}
                    placeholder="Describe this step..."
                    rows={2}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeInstruction(index)}
                  className="mt-6 text-red-600"
                  disabled={formData.instructions.length === 1}
                >
                  Remove
                </Button>
              </Flex>

              <Grid className="grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Timer (minutes)"
                  type="number"
                  min="0"
                  value={instruction.timer || ''}
                  onChange={(e) => updateInstruction(index, { timer: parseInt(e.target.value) || undefined })}
                  placeholder="Optional"
                />

                <Input
                  label="Temperature (°F)"
                  type="number"
                  min="0"
                  value={instruction.temperature || ''}
                  onChange={(e) => updateInstruction(index, { temperature: parseInt(e.target.value) || undefined })}
                  placeholder="Optional"
                />
              </Grid>

              <Input
                label="Notes"
                value={instruction.notes || ''}
                onChange={(e) => updateInstruction(index, { notes: e.target.value })}
                placeholder="Additional notes for this step..."
              />
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addInstruction}>
            Add Step
          </Button>

          {errors.instructions && (
            <p className="text-sm text-red-600">{errors.instructions}</p>
          )}
        </CardContent>
      </Card>

      {/* Dietary & Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Dietary Information & Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dietary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dietary Restrictions
            </label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((dietary) => (
                <Button
                  key={dietary}
                  type="button"
                  variant={formData.dietary.includes(dietary) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleDietary(dietary)}
                >
                  {dietary}
                </Button>
              ))}
            </div>
          </div>

          <Divider />

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            
            {/* Current tags */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    removable
                    onRemove={() => removeTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Add new tag */}
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newTag.trim()) addTag(newTag);
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addTag(newTag)}
                disabled={!newTag.trim()}
              >
                Add
              </Button>
            </div>

            {/* Common tags */}
            <div>
              <p className="text-sm text-gray-500 mb-2">Common tags:</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_TAGS.filter(tag => !formData.tags.includes(tag)).map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTag(tag)}
                    className="text-xs"
                  >
                    + {tag}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sharing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sharing Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                className="mr-3"
              />
              <span>Make this recipe public (visible to other users)</span>
            </label>

            {formData.isPublic && (
              <>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.allowComments}
                    onChange={(e) => handleInputChange('allowComments', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Allow comments</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.allowRating}
                    onChange={(e) => handleInputChange('allowRating', e.target.checked)}
                    className="mr-3"
                  />
                  <span>Allow ratings</span>
                </label>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : (isEditing ? 'Update Recipe' : 'Create Recipe')}
        </Button>
      </div>

      {/* Ingredient Selector Modal */}
      {showIngredientSelector && (
        <RecipeIngredientSelector
          ingredients={userIngredients}
          onSelect={handleIngredientSelect}
          onClose={() => {
            setShowIngredientSelector(false);
            setSelectedIngredientIndex(null);
          }}
        />
      )}
    </form>
  );
};