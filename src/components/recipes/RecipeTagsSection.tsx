import React from 'react';
import { Badge, Button, Grid } from '@/components/ui';
import { RecipeFormData } from '@/types';

interface RecipeTagsSectionProps {
  formData: RecipeFormData;
  onFormDataChange: (updates: Partial<RecipeFormData>) => void;
}

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

export const RecipeTagsSection: React.FC<RecipeTagsSectionProps> = ({
  formData,
  onFormDataChange,
}) => {
  const handleMealTypeToggle = (mealType: string) => {
    const currentMealTypes = formData.mealType || [];
    const updatedMealTypes = currentMealTypes.includes(mealType)
      ? currentMealTypes.filter(type => type !== mealType)
      : [...currentMealTypes, mealType];
    
    onFormDataChange({ mealType: updatedMealTypes });
  };

  const handleDietaryToggle = (dietary: string) => {
    const currentDietary = formData.dietary || [];
    const updatedDietary = currentDietary.includes(dietary)
      ? currentDietary.filter(item => item !== dietary)
      : [...currentDietary, dietary];
    
    onFormDataChange({ dietary: updatedDietary });
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = formData.tags || [];
    const updatedTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    onFormDataChange({ tags: updatedTags });
  };

  return (
    <Grid cols={1} md={2} gap={6}>
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Meal Types</h4>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={formData.mealType?.includes(option.value) ? "primary" : "outline"}
              size="sm"
              onClick={() => handleMealTypeToggle(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Dietary Restrictions</h4>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((dietary) => (
            <Button
              key={dietary}
              variant={formData.dietary?.includes(dietary) ? "primary" : "outline"}
              size="sm"
              onClick={() => handleDietaryToggle(dietary)}
            >
              {dietary}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="md:col-span-2 space-y-4">
        <h4 className="font-medium text-gray-900">Tags</h4>
        <div className="flex flex-wrap gap-2">
          {COMMON_TAGS.map((tag) => (
            <Button
              key={tag}
              variant={formData.tags?.includes(tag) ? "primary" : "outline"}
              size="sm"
              onClick={() => handleTagToggle(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
        
        {formData.tags && formData.tags.length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Selected Tags:</h5>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="primary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Grid>
  );
};
