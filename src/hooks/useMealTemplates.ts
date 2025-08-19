import { useState, useCallback, useMemo } from 'react';
import { MealSlot, Recipe, MealType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { mealPlanService } from '@/lib/firebase';
import { useToast } from './useToast';

export interface MealTemplate {
  id: string;
  name: string;
  description: string;
  category: 'pre-built' | 'user-created' | 'shared';
  meals: MealSlot[];
  tags: string[];
  estimatedPrepTime: number;
  estimatedCost: number;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  isPublic?: boolean;
  shareLink?: string;
}

export interface TemplatePreview {
  template: MealTemplate;
  mealsByType: Record<MealType, number>;
  totalRecipes: number;
  uniqueRecipes: number;
  avgPrepTime: number;
  estimatedTotalCost: number;
}

export interface UseMealTemplatesReturn {
  templates: MealTemplate[];
  isLoading: boolean;
  error: string | null;
  
  // Template management
  createTemplate: (name: string, description: string, meals: MealSlot[], tags?: string[]) => Promise<string>;
  updateTemplate: (id: string, updates: Partial<MealTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (id: string, newName: string) => Promise<string>;
  
  // Template operations
  applyTemplate: (templateId: string, targetWeekStart: Date) => Promise<MealSlot[]>;
  getTemplatePreview: (templateId: string) => TemplatePreview | null;
  generateShareLink: (templateId: string) => Promise<string>;
  importSharedTemplate: (shareLink: string) => Promise<string>;
  
  // Pre-built templates
  getPreBuiltTemplates: () => MealTemplate[];
  getTemplatesByCategory: (category: MealTemplate['category']) => MealTemplate[];
  searchTemplates: (query: string) => MealTemplate[];
}

// Pre-built templates
const PRE_BUILT_TEMPLATES: Omit<MealTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Quick & Easy',
    description: 'All recipes under 30 minutes for busy weekdays',
    category: 'pre-built',
    meals: [], // Will be populated with actual meals
    tags: ['quick', 'easy', 'weekday', '30-min'],
    estimatedPrepTime: 25,
    estimatedCost: 45,
    difficulty: 'easy',
  },
  {
    name: 'Meal Prep Sunday',
    description: 'Batch cooking focused for efficient meal prep',
    category: 'pre-built',
    meals: [],
    tags: ['meal-prep', 'batch-cooking', 'sunday', 'efficient'],
    estimatedPrepTime: 120,
    estimatedCost: 65,
    difficulty: 'medium',
  },
  {
    name: 'Family Favorites',
    description: 'Most cooked recipes that everyone loves',
    category: 'pre-built',
    meals: [],
    tags: ['family', 'favorites', 'crowd-pleaser', 'comfort'],
    estimatedPrepTime: 45,
    estimatedCost: 55,
    difficulty: 'medium',
  },
  {
    name: 'Healthy Week',
    description: 'Balanced nutrition with wholesome ingredients',
    category: 'pre-built',
    meals: [],
    tags: ['healthy', 'balanced', 'nutrition', 'wholesome'],
    estimatedPrepTime: 40,
    estimatedCost: 60,
    difficulty: 'medium',
  },
  {
    name: 'Budget Friendly',
    description: 'Delicious meals under $50 per week',
    category: 'pre-built',
    meals: [],
    tags: ['budget', 'affordable', 'economical', 'value'],
    estimatedPrepTime: 35,
    estimatedCost: 35,
    difficulty: 'easy',
  },
];

export function useMealTemplates(): UseMealTemplatesReturn {
  const { user, isDemoMode } = useAuth();
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize pre-built templates
  const preBuiltTemplates = useMemo(() => {
    return PRE_BUILT_TEMPLATES.map((template, index) => ({
      ...template,
      id: `pre-built-${index}`,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }));
  }, []);

  // Get all templates including pre-built
  const allTemplates = useMemo(() => {
    return [...preBuiltTemplates, ...templates];
  }, [preBuiltTemplates, templates]);

  // Create template
  const createTemplate = useCallback(async (
    name: string, 
    description: string, 
    meals: MealSlot[], 
    tags: string[] = []
  ): Promise<string> => {
    if (isDemoMode) {
      const newTemplate: MealTemplate = {
        id: `template-${Date.now()}`,
        name,
        description,
        category: 'user-created',
        meals,
        tags,
        estimatedPrepTime: meals.reduce((total, meal) => total + (meal.recipe?.prepTime || 0), 0) / meals.length || 0,
        estimatedCost: meals.reduce((total, meal) => total + (meal.recipe?.metadata?.estimatedCost || 0), 0),
        difficulty: meals.some(meal => meal.recipe?.difficulty === 'hard') ? 'hard' : 
                  meals.some(meal => meal.recipe?.difficulty === 'medium') ? 'medium' : 'easy',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user?.uid,
      };

      setTemplates(prev => [...prev, newTemplate]);
      return newTemplate.id;
    }

    // TODO: Implement Firebase storage for templates
    setIsLoading(true);
    try {
      // Firebase implementation would go here
      const templateId = `template-${Date.now()}`;
      setError(null);
      return templateId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isDemoMode]);

  // Update template
  const updateTemplate = useCallback(async (
    id: string, 
    updates: Partial<MealTemplate>
  ): Promise<void> => {
    if (isDemoMode) {
      setTemplates(prev => prev.map(template => 
        template.id === id 
          ? { ...template, ...updates, updatedAt: new Date() }
          : template
      ));
      return;
    }

    // TODO: Implement Firebase update
    setIsLoading(true);
    try {
      // Firebase implementation would go here
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode]);

  // Delete template
  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    if (isDemoMode) {
      setTemplates(prev => prev.filter(template => template.id !== id));
      return;
    }

    // TODO: Implement Firebase delete
    setIsLoading(true);
    try {
      // Firebase implementation would go here
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete template';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode]);

  // Duplicate template
  const duplicateTemplate = useCallback(async (
    id: string, 
    newName: string
  ): Promise<string> => {
    const template = allTemplates.find(t => t.id === id);
    if (!template) {
      throw new Error('Template not found');
    }

    const duplicatedMeals = template.meals.map(meal => ({
      ...meal,
      id: `${meal.id}-copy-${Date.now()}`,
    }));

    return createTemplate(
      newName,
      `${template.description} (Copy)`,
      duplicatedMeals,
      [...template.tags, 'duplicate']
    );
  }, [allTemplates, createTemplate]);

  // Apply template
  const applyTemplate = useCallback(async (
    templateId: string, 
    targetWeekStart: Date
  ): Promise<MealSlot[]> => {
    const template = allTemplates.find(t => t.id === templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Transform template meals to target week
    const transformedMeals = template.meals.map((meal, index) => {
      const targetDate = new Date(targetWeekStart);
      targetDate.setDate(targetWeekStart.getDate() + (index % 7));
      
      return {
        ...meal,
        id: `${targetDate.toISOString().split('T')[0]}-${meal.mealType}`,
        date: targetDate,
      };
    });

    return transformedMeals;
  }, [allTemplates]);

  // Get template preview
  const getTemplatePreview = useCallback((templateId: string): TemplatePreview | null => {
    const template = allTemplates.find(t => t.id === templateId);
    if (!template) return null;

    const mealsByType = template.meals.reduce((acc, meal) => {
      acc[meal.mealType] = (acc[meal.mealType] || 0) + 1;
      return acc;
    }, {} as Record<MealType, number>);

    const uniqueRecipes = new Set(template.meals.map(meal => meal.recipeId).filter(Boolean)).size;
    const avgPrepTime = template.meals.reduce((total, meal) => total + (meal.recipe?.prepTime || 0), 0) / template.meals.length || 0;

    return {
      template,
      mealsByType,
      totalRecipes: template.meals.length,
      uniqueRecipes,
      avgPrepTime,
      estimatedTotalCost: template.estimatedCost,
    };
  }, [allTemplates]);

  // Generate share link
  const generateShareLink = useCallback(async (templateId: string): Promise<string> => {
    const template = allTemplates.find(t => t.id === templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // In a real implementation, this would create a shareable link
    const shareLink = `${window.location.origin}/templates/share/${templateId}`;
    
    // Update template with share link
    await updateTemplate(templateId, { shareLink, isPublic: true });
    
    return shareLink;
  }, [allTemplates, updateTemplate]);

  // Import shared template
  const importSharedTemplate = useCallback(async (shareLink: string): Promise<string> => {
    // In a real implementation, this would fetch the shared template
    const templateId = shareLink.split('/').pop();
    if (!templateId) {
      throw new Error('Invalid share link');
    }

    // For demo purposes, create a placeholder template
    const importedTemplate: MealTemplate = {
      id: `imported-${Date.now()}`,
      name: 'Imported Template',
      description: 'Template imported from share link',
      category: 'shared',
      meals: [],
      tags: ['imported', 'shared'],
      estimatedPrepTime: 0,
      estimatedCost: 0,
      difficulty: 'easy',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user?.uid,
      isPublic: false,
    };

    setTemplates(prev => [...prev, importedTemplate]);
    return importedTemplate.id;
  }, [user?.uid]);

  // Get pre-built templates
  const getPreBuiltTemplates = useCallback(() => {
    return preBuiltTemplates;
  }, [preBuiltTemplates]);

  // Get templates by category
  const getTemplatesByCategory = useCallback((category: MealTemplate['category']) => {
    return allTemplates.filter(template => template.category === category);
  }, [allTemplates]);

  // Search templates
  const searchTemplates = useCallback((query: string) => {
    if (!query.trim()) return allTemplates;
    
    const lowercaseQuery = query.toLowerCase();
    return allTemplates.filter(template => 
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }, [allTemplates]);

  return {
    templates: allTemplates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    applyTemplate,
    getTemplatePreview,
    generateShareLink,
    importSharedTemplate,
    getPreBuiltTemplates,
    getTemplatesByCategory,
    searchTemplates,
  };
}
