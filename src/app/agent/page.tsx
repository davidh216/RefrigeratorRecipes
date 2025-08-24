'use client';

import { AgentInterface } from '@/components/agents';
import { ProtectedRoute } from '@/components/auth';
import { AppLayout } from '@/components/layout';

export default function AgentPage() {
  return (
    <ProtectedRoute>
      <AppLayout hideFooter={true}>
        <div className="h-screen p-6">
          <div className="max-w-4xl mx-auto h-full">
            <div className="h-full bg-white rounded-lg shadow-lg">
              <AgentInterface 
                className="h-full"
                showHistory={true}
                compact={false}
              />
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}