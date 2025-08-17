'use client';

import React, { useEffect } from 'react';
import { IngredientDashboard } from '@/components/ingredients';
import { useIngredients } from '@/hooks';

export default function DemoPage() {
  const { addIngredient } = useIngredients();

  // Add some sample ingredients for demonstration
  useEffect(() => {
    const sampleIngredients = [
      {
        name: 'Tomatoes',
        customName: 'Cherry Tomatoes',
        quantity: 2,
        unit: 'cups',
        dateBought: '2025-01-10',
        expirationDate: '2025-01-20',
        location: 'fridge' as const,
        category: 'produce',
        tags: ['fresh', 'organic'],
        notes: 'Sweet cherry tomatoes from farmers market',
      },
      {
        name: 'Chicken Breast',
        quantity: 1.5,
        unit: 'lbs',
        dateBought: '2025-01-12',
        expirationDate: '2025-01-16',
        location: 'fridge' as const,
        category: 'meat',
        tags: ['fresh', 'protein'],
        notes: 'Boneless, skinless',
      },
      {
        name: 'Rice',
        customName: 'Jasmine Rice',
        quantity: 5,
        unit: 'lbs',
        dateBought: '2025-01-05',
        location: 'pantry' as const,
        category: 'grains',
        tags: ['whole-grain', 'gluten-free'],
      },
      {
        name: 'Milk',
        customName: 'Organic Whole Milk',
        quantity: 1,
        unit: 'gal',
        dateBought: '2025-01-13',
        expirationDate: '2025-01-18',
        location: 'fridge' as const,
        category: 'dairy',
        tags: ['organic'],
      },
      {
        name: 'Frozen Peas',
        quantity: 1,
        unit: 'lbs',
        dateBought: '2025-01-08',
        expirationDate: '2025-06-01',
        location: 'freezer' as const,
        category: 'frozen',
        tags: ['frozen', 'vegetarian'],
      },
    ];

    // Only add sample data if no ingredients exist
    const timeout = setTimeout(() => {
      sampleIngredients.forEach(ingredient => {
        addIngredient(ingredient);
      });
    }, 100);

    return () => clearTimeout(timeout);
  }, [addIngredient]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ingredient Management System Demo
          </h1>
          <p className="text-gray-600">
            This demo showcases the complete ingredient tracking system with sample data.
          </p>
        </div>
        
        <IngredientDashboard />
      </div>
    </div>
  );
}