import React from 'react';
import { Checkbox, Grid } from '@/components/ui';
import { RecipeFormData } from '@/types';

interface RecipeSharingSectionProps {
  formData: RecipeFormData;
  onFormDataChange: (updates: Partial<RecipeFormData>) => void;
}

export const RecipeSharingSection: React.FC<RecipeSharingSectionProps> = ({
  formData,
  onFormDataChange,
}) => {
  return (
    <Grid cols={1} md={2} gap={6}>
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Sharing Settings</h4>
        
        <Checkbox
          label="Make this recipe public"
          checked={formData.isPublic || false}
          onChange={(checked) => onFormDataChange({ isPublic: checked })}
        />
        
        <div className="text-sm text-gray-600">
          Public recipes can be discovered by other users and shared in the community.
        </div>
      </div>
      
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Interaction Settings</h4>
        
        <Checkbox
          label="Allow comments"
          checked={formData.allowComments !== false}
          onChange={(checked) => onFormDataChange({ allowComments: checked })}
        />
        
        <Checkbox
          label="Allow ratings"
          checked={formData.allowRating !== false}
          onChange={(checked) => onFormDataChange({ allowRating: checked })}
        />
        
        <div className="text-sm text-gray-600">
          These settings only apply if the recipe is public.
        </div>
      </div>
    </Grid>
  );
};
