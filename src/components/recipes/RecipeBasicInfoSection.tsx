import React from 'react';
import { Input, Select, Textarea, Grid } from '@/components/ui';
import { RecipeFormData } from '@/types';

interface RecipeBasicInfoSectionProps {
  formData: RecipeFormData;
  onFormDataChange: (updates: Partial<RecipeFormData>) => void;
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

export const RecipeBasicInfoSection: React.FC<RecipeBasicInfoSectionProps> = ({
  formData,
  onFormDataChange,
}) => {
  return (
    <Grid cols={1} md={2} gap={6}>
      <div className="space-y-4">
        <Input
          label="Recipe Title"
          value={formData.title}
          onChange={(e) => onFormDataChange({ title: e.target.value })}
          placeholder="Enter recipe title"
          required
        />
        
        <Select
          label="Difficulty Level"
          value={formData.difficulty}
          onChange={(value) => onFormDataChange({ difficulty: value })}
          options={DIFFICULTY_OPTIONS}
        />
        
        <Select
          label="Cuisine Type"
          value={formData.cuisine}
          onChange={(value) => onFormDataChange({ cuisine: value })}
          options={CUISINE_OPTIONS}
        />
      </div>
      
      <div className="space-y-4">
        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => onFormDataChange({ description: e.target.value })}
          placeholder="Describe your recipe..."
          rows={4}
        />
      </div>
    </Grid>
  );
};
