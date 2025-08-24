'use client';

import React, { useMemo } from 'react';
import { cn } from '@/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Flex,
  Badge,
  Grid
} from '@/components/ui';
import { useAgent } from '@/hooks/useAgent';
import { useAuth } from '@/contexts/AuthContext';
import { useIngredients } from '@/hooks/useIngredients';
import { useMealPlan } from '@/hooks/useMealPlan';
import { QueryIntent } from '@/agents/types';

// Icons
const ClockIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChefHatIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4a2 2 0 00-4 0v2M8 6V4a2 2 0 00-4 0v2M4 10h16l-1 10H5L4 10z" />
  </svg>
);

const ShoppingCartIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const LightBulbIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const HeartIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 000-6.364 4.5 4.5 0 00-6.364 0L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const AlertIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.831-.833-2.598 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

interface QuickAction {
  id: string;
  label: string;
  query: string;
  intent: QueryIntent;
  icon: React.ReactNode;
  description?: string;
  badge?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  disabled?: boolean;
  contextual?: boolean;
}

interface QuickActionsProps {
  onActionClick?: (action: QuickAction) => void;
  className?: string;
  showContextual?: boolean;
  compact?: boolean;
  maxActions?: number;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onActionClick,
  className,
  showContextual = true,
  compact = false,
  maxActions = 12
}) => {
  const { sendQuery, isProcessing } = useAgent();
  const { user, isDemoMode } = useAuth();
  const { ingredients } = useIngredients();
  const { currentMealPlan } = useMealPlan();

  // Base quick actions - always available
  const baseActions: QuickAction[] = [
    {
      id: 'whats-for-dinner',
      label: "What's for dinner?",
      query: "What should I make for dinner tonight?",
      intent: 'recipe-recommendation',
      icon: <ChefHatIcon />,
      description: 'Get dinner suggestions',
      variant: 'primary'
    },
    {
      id: 'quick-meal',
      label: 'Quick Meal Ideas',
      query: 'Show me quick and easy meals I can make in 30 minutes or less',
      intent: 'recipe-search',
      icon: <ClockIcon />,
      description: 'Fast recipes under 30 minutes'
    },
    {
      id: 'healthy-options',
      label: 'Healthy Options',
      query: 'What are some healthy recipe options for today?',
      intent: 'recipe-recommendation',
      icon: <HeartIcon />,
      description: 'Nutritious meal suggestions'
    },
    {
      id: 'meal-plan-week',
      label: 'Plan This Week',
      query: 'Help me plan my meals for this week',
      intent: 'meal-planning',
      icon: <CalendarIcon />,
      description: 'Weekly meal planning'
    },
    {
      id: 'shopping-list',
      label: 'Generate Shopping List',
      query: 'Create a shopping list based on my meal plan',
      intent: 'shopping-list',
      icon: <ShoppingCartIcon />,
      description: 'Auto-generate shopping list'
    },
    {
      id: 'cooking-tips',
      label: 'Cooking Tips',
      query: 'Give me some useful cooking tips and techniques',
      intent: 'cooking-tips',
      icon: <LightBulbIcon />,
      description: 'Learn new cooking skills'
    },
    {
      id: 'trending-recipes',
      label: 'Trending Recipes',
      query: 'What are some popular recipes right now?',
      intent: 'recipe-search',
      icon: <TrendingUpIcon />,
      description: 'Popular recipe suggestions'
    },
    {
      id: 'recipe-search',
      label: 'Find Recipe',
      query: 'Help me find a specific recipe',
      intent: 'recipe-search',
      icon: <SearchIcon />,
      description: 'Search for specific recipes'
    }
  ];

  // Generate contextual actions based on user state
  const contextualActions = useMemo((): QuickAction[] => {
    if (!showContextual) return [];

    const actions: QuickAction[] = [];

    // Expiring ingredients action
    const expiringIngredients = ingredients?.filter(ingredient => {
      if (!ingredient.expirationDate) return false;
      const daysUntilExpiry = Math.ceil(
        (new Date(ingredient.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
    });

    if (expiringIngredients && expiringIngredients.length > 0) {
      actions.push({
        id: 'use-expiring',
        label: 'Use Expiring Ingredients',
        query: `I have ${expiringIngredients.map(i => i.name).join(', ')} that will expire soon. What recipes can I make?`,
        intent: 'recipe-recommendation',
        icon: <AlertIcon />,
        description: `${expiringIngredients.length} ingredients expiring soon`,
        badge: 'urgent',
        variant: 'outline',
        contextual: true
      });
    }

    // Available ingredients action
    if (ingredients && ingredients.length > 0) {
      const availableIngredients = ingredients.slice(0, 5).map(i => i.name).join(', ');
      actions.push({
        id: 'use-available',
        label: 'Cook with Available',
        query: `What can I cook with: ${availableIngredients}${ingredients.length > 5 ? ' and more' : ''}?`,
        intent: 'recipe-recommendation',
        icon: <ChefHatIcon />,
        description: `Use your ${ingredients.length} ingredients`,
        contextual: true
      });
    }

    // Time-based suggestions
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) {
      actions.push({
        id: 'breakfast-ideas',
        label: 'Breakfast Ideas',
        query: 'What are some good breakfast options for this morning?',
        intent: 'recipe-recommendation',
        icon: <ClockIcon />,
        description: 'Perfect for morning',
        contextual: true
      });
    } else if (hour >= 11 && hour < 14) {
      actions.push({
        id: 'lunch-ideas',
        label: 'Lunch Ideas',
        query: 'What should I have for lunch today?',
        intent: 'recipe-recommendation',
        icon: <ClockIcon />,
        description: 'Midday meal suggestions',
        contextual: true
      });
    } else if (hour >= 17 && hour < 21) {
      actions.push({
        id: 'dinner-tonight',
        label: 'Tonight\'s Dinner',
        query: 'What should I cook for dinner tonight?',
        intent: 'recipe-recommendation',
        icon: <ChefHatIcon />,
        description: 'Evening dinner ideas',
        contextual: true
      });
    }

    // Meal plan suggestions
    if (!currentMealPlan || (currentMealPlan && Object.keys(currentMealPlan).length === 0)) {
      actions.push({
        id: 'start-meal-planning',
        label: 'Start Meal Planning',
        query: 'Help me start planning my weekly meals',
        intent: 'meal-planning',
        icon: <CalendarIcon />,
        description: 'Plan your week ahead',
        badge: 'new',
        contextual: true
      });
    }

    // Weekend special suggestions
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 6 || dayOfWeek === 0) { // Saturday or Sunday
      actions.push({
        id: 'weekend-cooking',
        label: 'Weekend Cooking',
        query: 'What are some good weekend cooking projects or special meals?',
        intent: 'recipe-recommendation',
        icon: <LightBulbIcon />,
        description: 'Special weekend recipes',
        contextual: true
      });
    }

    return actions;
  }, [ingredients, currentMealPlan, showContextual]);

  // Combine and limit actions
  const allActions = [...contextualActions, ...baseActions].slice(0, maxActions);

  const handleActionClick = async (action: QuickAction) => {
    if (action.disabled || isProcessing) return;

    // Call the provided callback first
    onActionClick?.(action);

    // Then send the query to the agent
    try {
      await sendQuery(action.query, action.intent);
    } catch (error) {
      console.error('Error executing quick action:', error);
    }
  };

  const getBadgeVariant = (badge: string | undefined) => {
    switch (badge) {
      case 'urgent': return 'destructive';
      case 'new': return 'primary';
      default: return 'secondary';
    }
  };

  if (compact) {
    return (
      <div className={cn("flex gap-2 overflow-x-auto pb-2", className)}>
        {allActions.slice(0, 6).map((action) => (
          <Button
            key={action.id}
            variant={action.variant || 'outline'}
            size="sm"
            onClick={() => handleActionClick(action)}
            disabled={action.disabled || isProcessing}
            className="flex-shrink-0 whitespace-nowrap"
          >
            <span className="mr-2">{action.icon}</span>
            {action.label}
            {action.badge && (
              <Badge 
                variant={getBadgeVariant(action.badge)} 
                className="ml-2 text-xs"
              >
                {action.badge}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader padding="md">
        <Flex justify="between" align="center">
          <CardTitle className="flex items-center gap-2">
            <LightBulbIcon />
            Quick Actions
          </CardTitle>
          {contextualActions.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {contextualActions.length} contextual
            </Badge>
          )}
        </Flex>
      </CardHeader>

      <CardContent padding="md">
        <Grid cols={{ base: 1, sm: 2, lg: 3 }} gap="md">
          {allActions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              size="lg"
              onClick={() => handleActionClick(action)}
              disabled={action.disabled || isProcessing}
              className={cn(
                "h-auto p-4 text-left justify-start flex-col items-start gap-2",
                action.contextual && "border-primary/20 bg-primary/5"
              )}
            >
              <Flex align="center" gap="sm" className="w-full">
                <span className="text-lg">{action.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{action.label}</div>
                  {action.description && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {action.description}
                    </div>
                  )}
                </div>
                {action.badge && (
                  <Badge 
                    variant={getBadgeVariant(action.badge)}
                    className="text-xs"
                  >
                    {action.badge}
                  </Badge>
                )}
              </Flex>
            </Button>
          ))}
        </Grid>

        {allActions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshIcon />
            <div className="mt-2 text-sm">No quick actions available</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};