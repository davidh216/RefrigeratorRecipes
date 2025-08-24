'use client';

import { AgentInterface } from '@/components/agents';
import { ProtectedRoute } from '@/components/auth';
import { AppLayout } from '@/components/layout';

export default function AgentsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sous Chef Assistant</h1>
              <p className="text-gray-600">Your intelligent cooking companion for recipes, meal planning, and more</p>
            </div>
            <AgentInterface />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}