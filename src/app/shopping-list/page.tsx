'use client';

import React from 'react';
import { ShoppingListDashboard } from '@/components/shopping-list';
import { AppLayout } from '@/components/layout';
import { ProtectedRoute } from '@/components/auth';
import { FloatingAgentButton } from '@/components/agents';

export default function ShoppingListPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <ShoppingListDashboard />
        </div>
        <FloatingAgentButton />
      </AppLayout>
    </ProtectedRoute>
  );
}
