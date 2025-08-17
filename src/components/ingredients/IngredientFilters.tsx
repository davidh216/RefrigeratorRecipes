import React from 'react';
import { IngredientFilters } from '@/types';
import { Input, Select, Button, Badge } from '@/components/ui';
import { capitalizeFirst } from '@/utils';

interface IngredientFiltersProps {
  filters: IngredientFilters;
  onFiltersChange: (filters: Partial<IngredientFilters>) => void;
  onClearFilters: () => void;
  availableCategories: string[];
  availableTags: string[];
}

const LOCATION_OPTIONS = [
  { value: 'all', label: 'All Locations' },
  { value: 'fridge', label: 'Refrigerator' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'freezer', label: 'Freezer' },
];

const EXPIRATION_OPTIONS = [
  { value: 'all', label: 'All Items' },
  { value: 'fresh', label: 'Fresh' },
  { value: 'expiring-soon', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
];

export const IngredientFiltersComponent: React.FC<IngredientFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  availableCategories,
  availableTags,
}) => {
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...availableCategories.map(category => ({
      value: category,
      label: capitalizeFirst(category),
    })),
  ];

  const removeTag = (tagToRemove: string) => {
    onFiltersChange({
      tags: filters.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      onFiltersChange({
        tags: [...filters.tags, tag],
      });
    }
  };

  const hasActiveFilters = 
    filters.search || 
    filters.location !== 'all' || 
    filters.category || 
    filters.tags.length > 0 || 
    filters.expirationStatus !== 'all';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filter Ingredients</h3>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
          >
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Input
          placeholder="Search ingredients..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ search: e.target.value })}
        />

        <Select
          value={filters.location}
          onChange={(e) => onFiltersChange({ location: e.target.value as any })}
          options={LOCATION_OPTIONS}
        />

        <Select
          value={filters.category}
          onChange={(e) => onFiltersChange({ category: e.target.value })}
          options={categoryOptions}
        />

        <Select
          value={filters.expirationStatus}
          onChange={(e) => onFiltersChange({ expirationStatus: e.target.value as any })}
          options={EXPIRATION_OPTIONS}
        />
      </div>

      {/* Selected Tags */}
      {filters.tags.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selected Tags:
          </label>
          <div className="flex flex-wrap gap-2">
            {filters.tags.map((tag) => (
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
        </div>
      )}

      {/* Available Tags */}
      {availableTags.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Tags:
          </label>
          <div className="flex flex-wrap gap-2">
            {availableTags
              .filter(tag => !filters.tags.includes(tag))
              .slice(0, 10)
              .map((tag) => (
                <Button
                  key={tag}
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(tag)}
                  className="text-xs"
                >
                  + {tag}
                </Button>
              ))}
            {availableTags.filter(tag => !filters.tags.includes(tag)).length > 10 && (
              <span className="text-sm text-gray-500 self-center">
                +{availableTags.filter(tag => !filters.tags.includes(tag)).length - 10} more...
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};