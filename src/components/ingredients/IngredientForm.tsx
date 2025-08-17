import React, { useState } from 'react';
import { IngredientFormData } from '@/types';
import { Input, Select, Button, Badge } from '@/components/ui';

interface IngredientFormProps {
  initialData?: Partial<IngredientFormData>;
  onSubmit: (data: IngredientFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const UNIT_OPTIONS = [
  { value: 'pieces', label: 'Pieces' },
  { value: 'cups', label: 'Cups' },
  { value: 'tbsp', label: 'Tablespoons' },
  { value: 'tsp', label: 'Teaspoons' },
  { value: 'lbs', label: 'Pounds' },
  { value: 'oz', label: 'Ounces' },
  { value: 'g', label: 'Grams' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'ml', label: 'Milliliters' },
  { value: 'l', label: 'Liters' },
  { value: 'fl oz', label: 'Fluid Ounces' },
  { value: 'qt', label: 'Quarts' },
  { value: 'pt', label: 'Pints' },
  { value: 'gal', label: 'Gallons' },
];

const LOCATION_OPTIONS = [
  { value: 'fridge', label: 'Refrigerator' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'freezer', label: 'Freezer' },
];

const CATEGORY_OPTIONS = [
  { value: 'produce', label: 'Produce' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'meat', label: 'Meat' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'grains', label: 'Grains' },
  { value: 'canned', label: 'Canned Goods' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'spices', label: 'Spices & Seasonings' },
  { value: 'condiments', label: 'Condiments' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'baking', label: 'Baking' },
  { value: 'other', label: 'Other' },
];

const COMMON_TAGS = [
  'organic', 'gluten-free', 'vegetarian', 'vegan', 'low-sodium',
  'sugar-free', 'keto', 'paleo', 'whole-grain', 'fresh', 'frozen',
  'canned', 'dried', 'raw', 'cooked', 'leftover'
];

export const IngredientForm: React.FC<IngredientFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
}) => {
  const [formData, setFormData] = useState<IngredientFormData>({
    name: initialData?.name || '',
    customName: initialData?.customName || '',
    quantity: initialData?.quantity || 1,
    unit: initialData?.unit || 'pieces',
    dateBought: initialData?.dateBought || new Date().toISOString().split('T')[0],
    expirationDate: initialData?.expirationDate || '',
    location: initialData?.location || 'fridge',
    category: initialData?.category || 'other',
    tags: initialData?.tags || [],
    notes: initialData?.notes || '',
  });

  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Ingredient name is required';
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (formData.expirationDate) {
      const expDate = new Date(formData.expirationDate);
      const boughtDate = new Date(formData.dateBought);
      if (expDate < boughtDate) {
        newErrors.expirationDate = 'Expiration date cannot be before purchase date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof IngredientFormData, value: any) => {
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (newTag.trim()) {
        addTag(newTag);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Ingredient Name *"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          error={errors.name}
          placeholder="e.g., Tomatoes, Milk, Chicken Breast"
        />

        <Input
          label="Custom Name (Optional)"
          value={formData.customName}
          onChange={(e) => handleInputChange('customName', e.target.value)}
          placeholder="e.g., Cherry Tomatoes, Organic Milk"
          helperText="Give this ingredient a specific name"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Quantity *"
          type="number"
          min="0.1"
          step="0.1"
          value={formData.quantity}
          onChange={(e) => handleInputChange('quantity', parseFloat(e.target.value) || 0)}
          error={errors.quantity}
        />

        <Select
          label="Unit *"
          value={formData.unit}
          onChange={(e) => handleInputChange('unit', e.target.value)}
          options={UNIT_OPTIONS}
        />

        <Select
          label="Location *"
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value as any)}
          options={LOCATION_OPTIONS}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Date Bought *"
          type="date"
          value={formData.dateBought}
          onChange={(e) => handleInputChange('dateBought', e.target.value)}
        />

        <Input
          label="Expiration Date (Optional)"
          type="date"
          value={formData.expirationDate}
          onChange={(e) => handleInputChange('expirationDate', e.target.value)}
          error={errors.expirationDate}
          helperText="Leave empty if no expiration date"
        />
      </div>

      <Select
        label="Category *"
        value={formData.category}
        onChange={(e) => handleInputChange('category', e.target.value)}
        options={CATEGORY_OPTIONS}
      />

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
            onKeyPress={handleKeyPress}
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

      <Input
        label="Notes (Optional)"
        value={formData.notes}
        onChange={(e) => handleInputChange('notes', e.target.value)}
        placeholder="Any additional notes about this ingredient..."
        className="h-20"
      />

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {isEditing ? 'Update Ingredient' : 'Add Ingredient'}
        </Button>
      </div>
    </form>
  );
};