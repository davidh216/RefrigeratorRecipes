import React from 'react';
import { Input, Grid } from '@/components/ui';
import { RecipeFormData } from '@/types';

interface RecipeTimingSectionProps {
  formData: RecipeFormData;
  onFormDataChange: (updates: Partial<RecipeFormData>) => void;
}

export const RecipeTimingSection: React.FC<RecipeTimingSectionProps> = ({
  formData,
  onFormDataChange,
}) => {
  return (
    <Grid cols={1} md={2} gap={6}>
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Timing</h4>
        <Grid cols={2} gap={4}>
          <Input
            label="Prep Time (min)"
            type="number"
            value={formData.prepTime}
            onChange={(e) => onFormDataChange({ prepTime: parseInt(e.target.value) || 0 })}
            min={0}
          />
          <Input
            label="Cook Time (min)"
            type="number"
            value={formData.cookTime}
            onChange={(e) => onFormDataChange({ cookTime: parseInt(e.target.value) || 0 })}
            min={0}
          />
        </Grid>
        <Input
          label="Rest Time (min)"
          type="number"
          value={formData.restTime || 0}
          onChange={(e) => onFormDataChange({ restTime: parseInt(e.target.value) || 0 })}
          min={0}
        />
        <div className="text-sm text-gray-600">
          Total Time: {formData.prepTime + formData.cookTime + (formData.restTime || 0)} minutes
        </div>
      </div>
      
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Servings</h4>
        <Input
          label="Number of Servings"
          type="number"
          value={formData.servingsCount}
          onChange={(e) => onFormDataChange({ servingsCount: parseInt(e.target.value) || 1 })}
          min={1}
        />
        <Input
          label="Serving Notes (optional)"
          value={formData.servingsNotes || ''}
          onChange={(e) => onFormDataChange({ servingsNotes: e.target.value })}
          placeholder="e.g., 1 serving = 1 cup"
        />
      </div>
    </Grid>
  );
};
