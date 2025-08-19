'use client';

import { IngredientDashboard } from '@/components/ingredients';
import { ProtectedRoute } from '@/components/auth';
import { AppLayout } from '@/components/layout';

export default function IngredientsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="container mx-auto px-4 py-8 h-full">
          <IngredientDashboard />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}