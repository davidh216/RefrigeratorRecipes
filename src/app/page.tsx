'use client';

import { Button } from '@/components/ui';
import { UserProfile } from '@/components/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

// Force demo mode for agent features
if (typeof window !== 'undefined') {
  localStorage.setItem('demoMode', 'true');
}

export default function Home() {
  const { user, isDemoMode } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-purple-100 border-b border-purple-200 px-4 py-2">
          <div className="container mx-auto flex items-center justify-center text-sm text-purple-800">
            <span className="mr-2">🚀</span>
            <span className="font-medium">Demo Mode Active</span>
            <span className="mx-2">•</span>
            <span>All features are simulated for testing purposes</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Refrigerator Recipes</h1>
          <UserProfile />
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
            Refrigerator Recipes
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Turn the ingredients in your refrigerator into delicious meals. 
            Never wonder &ldquo;what should I cook?&rdquo; again!
          </p>
          
          <div className="flex gap-4 justify-center flex-col sm:flex-row max-w-md mx-auto">
            <Button 
              size="lg" 
              className="w-full sm:w-auto"
              onClick={() => window.location.href = user ? '/ingredients' : '/auth/signin'}
            >
              {user ? 'View My Ingredients' : 'Get Started'}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto"
              onClick={() => window.location.href = user ? '/ingredients' : '/auth/signup'}
            >
              {user ? 'Add Ingredients' : 'Sign Up'}
            </Button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">🥗</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Smart Recipe Matching
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Our algorithm finds recipes that match the ingredients you have available.
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">⏱️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quick & Easy
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Find recipes based on prep time, difficulty level, and your preferences.
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">♻️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Reduce Food Waste
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Use up ingredients before they expire and minimize food waste.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
