import React, { useState, useEffect } from 'react';
import { Ingredient, IngredientSortOptions, IngredientFormData } from '@/types';
import { Button, Select, Modal } from '@/components/ui';
import { IngredientCard } from './IngredientCard';
import { IngredientFiltersComponent } from './IngredientFilters';
import { IngredientForm } from './IngredientForm';
import { useIngredients } from '@/hooks';

interface IngredientListProps {
  className?: string;
}

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'dateBought-desc', label: 'Recently Bought' },
  { value: 'dateBought-asc', label: 'Oldest First' },
  { value: 'expirationDate-asc', label: 'Expiring Soon' },
  { value: 'expirationDate-desc', label: 'Expiring Last' },
  { value: 'category-asc', label: 'Category (A-Z)' },
  { value: 'quantity-desc', label: 'Quantity (High-Low)' },
  { value: 'quantity-asc', label: 'Quantity (Low-High)' },
];

export const IngredientList: React.FC<IngredientListProps> = React.memo(({ className }) => {
  const {
    ingredients,
    filteredIngredients,
    filters,
    sortOptions,
    isLoading,
    error,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    setFilters,
    setSortOptions,
    clearFilters,
  } = useIngredients();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [visibleItems, setVisibleItems] = useState(10);

  // Get available categories and tags for filters
  const availableCategories = Array.from(new Set(ingredients.map(i => i.category))).sort();
  const availableTags = Array.from(new Set(ingredients.flatMap(i => i.tags))).sort();

  const handleSortChange = (value: string) => {
    const [field, direction] = value.split('-') as [any, 'asc' | 'desc'];
    setSortOptions({ field, direction });
  };

  const handleAddIngredient = (data: IngredientFormData) => {
    addIngredient(data);
    setIsAddModalOpen(false);
  };

  const handleEditIngredient = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
  };

  const handleUpdateIngredient = (data: IngredientFormData) => {
    if (editingIngredient) {
      updateIngredient(editingIngredient.id, data);
      setEditingIngredient(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm(id);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      deleteIngredient(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleShowMore = () => {
    setVisibleItems(prev => prev + 10);
  };

  // Reset visible items when filters change
  useEffect(() => {
    setVisibleItems(10);
  }, [filters, sortOptions]);

  const currentSortValue = `${sortOptions.field}-${sortOptions.direction}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading ingredients...</div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Filters */}
      <IngredientFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
        availableCategories={availableCategories}
        availableTags={availableTags}
      />

      {/* Sort Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
          <Select
            value={currentSortValue}
            onChange={(e) => handleSortChange(e.target.value)}
            options={SORT_OPTIONS}
            className="w-48"
          />
        </div>
      </div>

      {/* Ingredients Grid */}
      {filteredIngredients.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🥘</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {ingredients.length === 0 ? 'No ingredients yet' : 'No ingredients match your filters'}
          </h3>
          <p className="text-gray-500 mb-4">
            {ingredients.length === 0 
              ? 'Start by adding your first ingredient to track your kitchen inventory.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
          {ingredients.length === 0 && (
            <Button onClick={() => setIsAddModalOpen(true)}>
              Add Your First Ingredient
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-3">
            {filteredIngredients.slice(0, visibleItems).map((ingredient) => (
              <IngredientCard
                key={ingredient.id}
                ingredient={ingredient}
                onEdit={handleEditIngredient}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
          
          {/* Show More Button */}
          {filteredIngredients.length > visibleItems && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleShowMore}
                className="px-6 py-2"
              >
                Show More ({filteredIngredients.length - visibleItems} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add Ingredient Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Ingredient"
        size="xl"
      >
        <IngredientForm
          onSubmit={handleAddIngredient}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* Edit Ingredient Modal */}
      <Modal
        isOpen={!!editingIngredient}
        onClose={() => setEditingIngredient(null)}
        title="Edit Ingredient"
        size="xl"
      >
        {editingIngredient && (
          <IngredientForm
            initialData={{
              name: editingIngredient.name,
              customName: editingIngredient.customName,
              quantity: editingIngredient.quantity,
              unit: editingIngredient.unit,
              dateBought: editingIngredient.dateBought.toISOString().split('T')[0],
              expirationDate: editingIngredient.expirationDate?.toISOString().split('T')[0],
              location: editingIngredient.location,
              category: editingIngredient.category,
              tags: editingIngredient.tags,
              notes: editingIngredient.notes,
            }}
            onSubmit={handleUpdateIngredient}
            onCancel={() => setEditingIngredient(null)}
            isEditing
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Ingredient"
        size="sm"
      >
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <p className="text-gray-700 mb-6">
            Are you sure you want to delete this ingredient? This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleConfirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Add Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Button>
      </div>
    </div>
  );
});