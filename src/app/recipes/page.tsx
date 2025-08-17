'use client';

import { useState } from 'react';
import { RecipeList, RecipeDetail } from '@/components/recipes';
import { ProtectedRoute } from '@/components/auth';
import { AppLayout } from '@/components/layout';
import { Modal } from '@/components/ui';
import { useRecipes } from '@/hooks';
import { Recipe } from '@/types';

export default function RecipesPage() {
  const { recipes, isLoading, error } = useRecipes();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const handleCloseModal = () => {
    setSelectedRecipe(null);
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <RecipeList 
            recipes={recipes}
            isLoading={isLoading}
            error={error}
            onView={handleViewRecipe}
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
      </AppLayout>
    </ProtectedRoute>
  );
}
