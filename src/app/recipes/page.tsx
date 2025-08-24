'use client';

import { useState } from 'react';
import { RecipeList, RecipeDetail } from '@/components/recipes';
import { ProtectedRoute } from '@/components/auth';
import { AppLayout } from '@/components/layout';
import { Modal, Input } from '@/components/ui';
import { FloatingAgentButton } from '@/components/agents';
import { useRecipes } from '@/hooks';
import { Recipe } from '@/types';

export default function RecipesPage() {
  const { recipes, filteredRecipes, isLoading, error, setFilters, filters, toggleFavorite } = useRecipes();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const handleCloseModal = () => {
    setSelectedRecipe(null);
  };

  const handleSearchChange = (searchQuery: string) => {
    setFilters({ search: searchQuery });
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          {/* Search Bar - Full Width */}
          <div className="mb-6">
            <Input
              placeholder="Search recipes..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full"
            />
          </div>

          <RecipeList 
            recipes={filteredRecipes}
            isLoading={isLoading}
            error={error}
            onView={handleViewRecipe}
            onToggleFavorite={toggleFavorite}
          />

          {/* Recipe Detail Modal */}
          <Modal
            isOpen={!!selectedRecipe}
            onClose={handleCloseModal}
            size="full"
          >
            {selectedRecipe && (
              <div className="p-6 max-h-[90vh] overflow-auto">
                <RecipeDetail recipe={selectedRecipe} />
              </div>
            )}
          </Modal>
        </div>
        <FloatingAgentButton />
      </AppLayout>
    </ProtectedRoute>
  );
}
