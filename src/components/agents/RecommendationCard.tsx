'use client';

import React, { useState } from 'react';
import { cn } from '@/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Flex,
  Divider
} from '@/components/ui';
import { AgentResponse, AgentResponseData } from '@/agents/types';
import { Recipe, MealSlot } from '@/types';

// Icons
const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg 
    className={cn("h-4 w-4", filled && "fill-current text-red-500")} 
    fill={filled ? "currentColor" : "none"} 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 000-6.364 4.5 4.5 0 00-6.364 0L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg 
    className={cn("h-4 w-4", filled && "fill-current text-yellow-500")} 
    fill={filled ? "currentColor" : "none"} 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ShoppingCartIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
  </svg>
);

const InfoIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export interface RecommendationCardProps {
  response: AgentResponse;
  onAccept?: (recommendation: any) => void;
  onDecline?: (recommendation: any) => void;
  onRate?: (recommendation: any, rating: number) => void;
  onViewDetails?: (recommendation: any) => void;
  className?: string;
  showActions?: boolean;
  compact?: boolean;
}

interface RecommendationItemProps {
  type: 'recipe' | 'meal-plan' | 'shopping' | 'tip' | 'nutrition';
  data: any;
  onAction?: (action: string, data: any) => void;
  compact?: boolean;
}

const RecommendationItem: React.FC<RecommendationItemProps> = ({
  type,
  data,
  onAction,
  compact = false
}) => {
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState(false);

  const handleAction = (action: string) => {
    onAction?.(action, data);
  };

  const handleRating = (newRating: number) => {
    setRating(newRating);
    onAction?.('rate', { ...data, rating: newRating });
  };

  // Recipe recommendation
  if (type === 'recipe' && data as Recipe) {
    const recipe = data as Recipe;
    return (
      <div className={cn("space-y-3", compact && "space-y-2")}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-sm">{recipe.name}</h4>
            {recipe.description && !compact && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {recipe.description}
              </p>
            )}
          </div>
          <Badge variant="outline" className="ml-2 text-xs">
            {recipe.category || 'Recipe'}
          </Badge>
        </div>

        {!compact && (
          <Flex gap="lg" align="center" className="text-xs text-muted-foreground">
            {recipe.prepTime && (
              <Flex gap="xs" align="center">
                <ClockIcon />
                <span>{recipe.prepTime}min</span>
              </Flex>
            )}
            {recipe.servings && (
              <span>{recipe.servings} servings</span>
            )}
            {recipe.difficulty && (
              <Badge variant="ghost" className="text-xs">
                {recipe.difficulty}
              </Badge>
            )}
          </Flex>
        )}

        <Flex gap="sm" justify="between" align="center">
          <Flex gap="xs">
            <Button
              size="xs"
              variant="outline"
              onClick={() => handleAction('view')}
            >
              <InfoIcon />
              View
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setLiked(!liked);
                handleAction(liked ? 'unlike' : 'like');
              }}
            >
              <HeartIcon filled={liked} />
            </Button>
          </Flex>

          <Flex gap="xs">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                className="text-muted-foreground hover:text-yellow-500"
              >
                <StarIcon filled={star <= rating} />
              </button>
            ))}
          </Flex>
        </Flex>
      </div>
    );
  }

  // Meal plan recommendation
  if (type === 'meal-plan' && data as MealSlot) {
    const mealSlot = data as MealSlot;
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-sm">
              {mealSlot.meal} for {mealSlot.date?.toLocaleDateString()}
            </h4>
            {mealSlot.recipe && (
              <p className="text-xs text-muted-foreground mt-1">
                {mealSlot.recipe.name}
              </p>
            )}
          </div>
          <Badge variant="outline" className="ml-2 text-xs capitalize">
            {mealSlot.meal}
          </Badge>
        </div>

        <Flex gap="sm">
          <Button
            size="xs"
            variant="outline"
            onClick={() => handleAction('add-to-plan')}
          >
            <CalendarIcon />
            Add to Plan
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => handleAction('view-recipe')}
          >
            <InfoIcon />
            Recipe
          </Button>
        </Flex>
      </div>
    );
  }

  // Shopping list recommendation
  if (type === 'shopping' && Array.isArray(data)) {
    const items = data as Array<{
      name: string;
      category: string;
      amount?: number;
      unit?: string;
      notes?: string;
    }>;

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Shopping List ({items.length} items)</h4>
        
        {!compact && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {items.slice(0, 5).map((item, index) => (
              <div key={index} className="flex justify-between items-center text-xs">
                <span>{item.name}</span>
                <span className="text-muted-foreground">
                  {item.amount && item.unit ? `${item.amount} ${item.unit}` : ''}
                </span>
              </div>
            ))}
            {items.length > 5 && (
              <div className="text-xs text-muted-foreground">
                +{items.length - 5} more items
              </div>
            )}
          </div>
        )}

        <Flex gap="sm">
          <Button
            size="xs"
            variant="outline"
            onClick={() => handleAction('add-to-shopping')}
          >
            <ShoppingCartIcon />
            Add All
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => handleAction('view-list')}
          >
            <InfoIcon />
            View All
          </Button>
        </Flex>
      </div>
    );
  }

  // Cooking tip recommendation
  if (type === 'tip') {
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-sm">{data.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{data.description}</p>
          </div>
          <Badge variant="outline" className="ml-2 text-xs capitalize">
            {data.difficulty || 'Tip'}
          </Badge>
        </div>

        {data.tags && (
          <Flex gap="xs" wrap>
            {data.tags.slice(0, 3).map((tag: string, index: number) => (
              <Badge key={index} variant="ghost" className="text-xs">
                {tag}
              </Badge>
            ))}
          </Flex>
        )}

        <Button
          size="xs"
          variant="ghost"
          onClick={() => {
            setLiked(!liked);
            handleAction(liked ? 'unlike-tip' : 'like-tip');
          }}
        >
          <HeartIcon filled={liked} />
          {liked ? 'Liked' : 'Like'}
        </Button>
      </div>
    );
  }

  // Nutrition info
  if (type === 'nutrition' && data.nutrition) {
    const nutrition = data.nutrition;
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Nutrition Information</h4>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span>Calories:</span>
            <span className="font-medium">{nutrition.calories}</span>
          </div>
          <div className="flex justify-between">
            <span>Protein:</span>
            <span className="font-medium">{nutrition.protein}g</span>
          </div>
          <div className="flex justify-between">
            <span>Carbs:</span>
            <span className="font-medium">{nutrition.carbs}g</span>
          </div>
          <div className="flex justify-between">
            <span>Fat:</span>
            <span className="font-medium">{nutrition.fat}g</span>
          </div>
        </div>

        <Button
          size="xs"
          variant="outline"
          onClick={() => handleAction('view-nutrition')}
        >
          <InfoIcon />
          Full Details
        </Button>
      </div>
    );
  }

  return <div>Unknown recommendation type</div>;
};

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  response,
  onAccept,
  onDecline,
  onRate,
  onViewDetails,
  className,
  showActions = true,
  compact = false
}) => {
  const [userRating, setUserRating] = useState(0);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const handleAccept = () => {
    setFeedbackGiven(true);
    onAccept?.(response);
  };

  const handleDecline = () => {
    setFeedbackGiven(true);
    onDecline?.(response);
  };

  const handleRating = (rating: number) => {
    setUserRating(rating);
    setFeedbackGiven(true);
    onRate?.(response, rating);
  };

  const handleItemAction = (action: string, data: any) => {
    switch (action) {
      case 'view':
      case 'view-recipe':
      case 'view-list':
      case 'view-nutrition':
        onViewDetails?.(data);
        break;
      case 'add-to-plan':
        onAccept?.(data);
        break;
      case 'add-to-shopping':
        onAccept?.(data);
        break;
      case 'rate':
        onRate?.(data, data.rating);
        break;
      default:
        console.log('Action:', action, 'Data:', data);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'very-high': return 'text-green-600';
      case 'high': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-orange-600';
      case 'very-low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const hasRecommendations = response.data && (
    response.data.recipes?.length ||
    response.data.mealPlans?.length ||
    response.data.shoppingItems?.length ||
    response.data.cookingTips?.length ||
    response.data.nutrition
  );

  return (
    <Card className={cn("w-full", className)} hover={!compact}>
      <CardHeader padding={compact ? "sm" : "md"}>
        <Flex justify="between" align="start">
          <div className="flex-1">
            <CardTitle className={cn("text-lg", compact && "text-base")}>
              Agent Recommendation
            </CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              Based on your {response.intent.replace('-', ' ')} request
            </div>
          </div>
          
          <Flex gap="xs" align="center">
            <Badge 
              variant="outline" 
              className={cn("text-xs", getConfidenceColor(response.confidence))}
            >
              {response.confidence.replace('-', ' ')} confidence
            </Badge>
            
            {response.priority === 'high' && (
              <Badge variant="destructive" className="text-xs">
                High Priority
              </Badge>
            )}
          </Flex>
        </Flex>
      </CardHeader>

      <CardContent padding={compact ? "sm" : "md"}>
        {/* Main response message */}
        <div className="text-sm mb-4 whitespace-pre-wrap">
          {response.message}
        </div>

        {/* Structured recommendations */}
        {hasRecommendations && (
          <div className="space-y-4">
            {/* Recipes */}
            {response.data?.recipes?.map((recipe, index) => (
              <div key={`recipe-${index}`}>
                <RecommendationItem
                  type="recipe"
                  data={recipe}
                  onAction={handleItemAction}
                  compact={compact}
                />
                {index < (response.data?.recipes?.length || 0) - 1 && <Divider className="mt-4" />}
              </div>
            ))}

            {/* Meal Plans */}
            {response.data?.mealPlans?.map((mealSlot, index) => (
              <div key={`meal-${index}`}>
                <RecommendationItem
                  type="meal-plan"
                  data={mealSlot}
                  onAction={handleItemAction}
                  compact={compact}
                />
                {index < (response.data?.mealPlans?.length || 0) - 1 && <Divider className="mt-4" />}
              </div>
            ))}

            {/* Shopping Items */}
            {response.data?.shoppingItems && response.data.shoppingItems.length > 0 && (
              <RecommendationItem
                type="shopping"
                data={response.data.shoppingItems}
                onAction={handleItemAction}
                compact={compact}
              />
            )}

            {/* Cooking Tips */}
            {response.data?.cookingTips?.map((tip, index) => (
              <div key={`tip-${index}`}>
                <RecommendationItem
                  type="tip"
                  data={tip}
                  onAction={handleItemAction}
                  compact={compact}
                />
                {index < (response.data?.cookingTips?.length || 0) - 1 && <Divider className="mt-4" />}
              </div>
            ))}

            {/* Nutrition */}
            {response.data?.nutrition && (
              <RecommendationItem
                type="nutrition"
                data={response.data}
                onAction={handleItemAction}
                compact={compact}
              />
            )}
          </div>
        )}

        {/* Follow-up suggestions */}
        {response.followUpSuggestions && response.followUpSuggestions.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <div className="text-sm font-medium mb-2">You might also want to:</div>
            <div className="space-y-1">
              {response.followUpSuggestions.map((suggestion, index) => (
                <div key={index} className="text-sm text-muted-foreground">
                  • {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter padding={compact ? "sm" : "md"}>
          <Flex justify="between" align="center" className="w-full">
            {!feedbackGiven ? (
              <Flex gap="sm">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAccept}
                >
                  <CheckIcon />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDecline}
                >
                  <XIcon />
                  Decline
                </Button>
              </Flex>
            ) : (
              <div className="text-sm text-muted-foreground">
                Thank you for your feedback!
              </div>
            )}

            {/* Rating stars */}
            <Flex gap="xs" align="center">
              <span className="text-xs text-muted-foreground mr-1">Rate:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className="text-muted-foreground hover:text-yellow-500 transition-colors"
                >
                  <StarIcon filled={star <= userRating} />
                </button>
              ))}
            </Flex>
          </Flex>
        </CardFooter>
      )}
    </Card>
  );
};