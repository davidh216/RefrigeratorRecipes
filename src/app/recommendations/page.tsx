'use client';

import React, { useState } from 'react';
import { RecipeRecommendations, RecipeDetail } from '@/components/recipes';
import { AppLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { Modal } from '@/components/ui';
import { RecipeRecommendation } from '@/types';

export default function RecommendationsPage() {
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecipeRecommendation | null>(null);

  const handleRecipeSelect = (recommendation: RecipeRecommendation) => {
    setSelectedRecommendation(recommendation);
  };

  const handleCloseModal = () => {
    setSelectedRecommendation(null);
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <RecipeRecommendations onRecipeSelect={handleRecipeSelect} />

          {/* Recipe Detail Modal */}
          <Modal
            isOpen={!!selectedRecommendation}
            onClose={handleCloseModal}
            size="full"
          >
            {selectedRecommendation && (
              <div className="p-6 max-h-[90vh] overflow-auto">
                <RecipeDetail recipe={selectedRecommendation.recipe} />
              </div>
            )}
          </Modal>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
