'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MealSlot, Recipe, RecipeIngredient, Ingredient } from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Flex,
  Badge,
  Checkbox,
  Loading,
} from '@/components/ui';
import { clsx } from 'clsx';

interface WeeklyShoppingListProps {
  meals: MealSlot[];
  userIngredients?: Ingredient[];
  onGenerateShoppingList?: (items?: ShoppingListItem[]) => void;
  onExportMealPlan?: () => void;
  className?: string;
}

interface ShoppingListItem {
  id: string;
  name: string;
  category: string;
  totalAmount: number;
  unit: string;
  isInInventory: boolean;
  inventoryAmount?: number;
  userHasItem: boolean;
  sources: {
    recipeId: string;
    recipeTitle: string;
    amount: number;
  }[];
}

const CATEGORY_ICONS: Record<string, string> = {
  vegetables: '🥕',
  fruits: '🍎',
  protein: '🥩',
  dairy: '🥛',
  grains: '🌾',
  oils: '🫒',
  spices: '🧂',
  herbs: '🌿',
  condiments: '🍯',
  sweeteners: '🍯',
  baking: '🧁',
  nuts: '🥜',
  liquids: '💧',
};

export const WeeklyShoppingList: React.FC<WeeklyShoppingListProps> = ({
  meals,
  userIngredients = [],
  onGenerateShoppingList,
  onExportMealPlan,
  className,
}) => {
  const [userOwnedItems, setUserOwnedItems] = useState<Set<string>>(new Set());

  // Generate shopping list from meals
  const shoppingList = useMemo(() => {
    const ingredientMap = new Map<string, ShoppingListItem>();

    // Process each meal's ingredients
    meals.forEach((meal) => {
      if (!meal.recipe) return;

      meal.recipe.ingredients.forEach((ingredient) => {
        const key = `${ingredient.name.toLowerCase()}-${ingredient.unit}`;
        const servings = meal.servings || meal.recipe!.servings;
        const scaledAmount = (ingredient.amount * servings) / meal.recipe!.servings;

        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          existing.totalAmount += scaledAmount;
          existing.sources.push({
            recipeId: meal.recipe.id,
            recipeTitle: meal.recipe.title,
            amount: scaledAmount,
          });
        } else {
          // Check if user has this ingredient in inventory
          const userIngredient = userIngredients.find(
            (ing) => ing.name.toLowerCase() === ingredient.name.toLowerCase()
          );

          ingredientMap.set(key, {
            id: key,
            name: ingredient.name,
            category: ingredient.category || 'other',
            totalAmount: scaledAmount,
            unit: ingredient.unit,
            isInInventory: !!userIngredient,
            inventoryAmount: userIngredient?.quantity,
            userHasItem: false,
            sources: [{
              recipeId: meal.recipe.id,
              recipeTitle: meal.recipe.title,
              amount: scaledAmount,
            }],
          });
        }
      });
    });

    const sortedList = Array.from(ingredientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    
    // Set items as selected by default unless user has enough in their pantry/refrigerator
    const defaultSelected = new Set(
      sortedList
        .filter(item => {
          // Check if user has enough of this ingredient in inventory
          if (!item.isInInventory) {
            // No inventory at all, need to buy
            return true;
          }
          // Has some inventory - check if it's enough for the total amount needed
          return (item.inventoryAmount || 0) < item.totalAmount;
        })
        .map(item => item.id)
    );
    setUserOwnedItems(defaultSelected);
    
    return sortedList;
  }, [meals, userIngredients]);

  // Count statistics
  const stats = useMemo(() => {
    const totalItems = shoppingList.length;
    const hasEnoughInInventory = shoppingList.filter(item => 
      item.isInInventory && (item.inventoryAmount || 0) >= item.totalAmount
    ).length;
    const needToBuy = shoppingList.filter(item => userOwnedItems.has(item.id)).length;
    const dontNeed = totalItems - needToBuy;

    return { totalItems, hasEnoughInInventory, needToBuy, dontNeed };
  }, [shoppingList, userOwnedItems]);

  const handleToggleUserOwned = (itemId: string) => {
    setUserOwnedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  if (shoppingList.length === 0) {
    return (
      <Card className={clsx('bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200 shadow-lg', className)}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🛒</div>
            <h3 className="text-xl font-semibold text-primary-900 mb-2">
              Shopping List
            </h3>
            <p className="text-primary-700">
              Add recipes to your meal plan to generate a shopping list
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={clsx('bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200 shadow-lg', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-primary-900 flex items-center gap-2">
          🛒 Shopping List
          <Badge variant="secondary" className="bg-primary-200 text-primary-800">
            {stats.needToBuy} to buy
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="font-semibold text-primary-900">{stats.totalItems}</div>
            <div className="text-primary-600">Total Items</div>
          </div>
          <div>
            <div className="font-semibold text-green-700">{stats.hasEnoughInInventory}</div>
            <div className="text-green-600">Have Enough</div>
          </div>
          <div>
            <div className="font-semibold text-orange-700">{stats.needToBuy}</div>
            <div className="text-orange-600">Need to Buy</div>
          </div>
        </div>

        {/* Shopping List Items - 4 Column Grid */}
        <div className="max-h-64 overflow-y-auto">
          <div className="grid grid-cols-4 gap-3">
            <AnimatePresence>
              {shoppingList.map((item, index) => {
                const isSelected = userOwnedItems.has(item.id);
                const hasEnoughInInventory = item.isInInventory && (item.inventoryAmount || 0) >= item.totalAmount;
                const needsToBuy = isSelected;
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={clsx(
                      'flex flex-col gap-2 p-2 rounded-lg border transition-colors relative',
                      hasEnoughInInventory
                        ? 'bg-green-50 border-green-200' 
                        : needsToBuy 
                          ? 'bg-orange-50 border-orange-200' 
                          : 'bg-gray-50 border-gray-200'
                    )}
                  >
                    <div className="flex items-start gap-1">
                      <div className="text-sm">
                        {CATEGORY_ICONS[item.category] || '🛒'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-xs truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {item.totalAmount.toFixed(1)} {item.unit}
                          {item.isInInventory && (
                            <div className={clsx(
                              "text-xs",
                              hasEnoughInInventory ? "text-green-600" : "text-orange-600"
                            )}>
                              Have {item.inventoryAmount} {item.unit}
                              {hasEnoughInInventory ? " ✓" : " (need more)"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {!hasEnoughInInventory && (
                      <div className="flex justify-end">
                        <div 
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleUserOwned(item.id);
                          }}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center text-xs transition-colors ${
                            isSelected 
                              ? 'bg-orange-500 border-orange-500 text-white' 
                              : 'bg-white border-gray-300 hover:border-orange-400'
                          }`}>
                            {isSelected ? '✓' : ''}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Actions */}
        <Flex className="gap-4 pt-4 border-t border-primary-200">
          <Button 
            variant="outline" 
            onClick={() => {
              // Generate shopping list with selected items (checked items that need to be purchased)
              const itemsNeeded = shoppingList.filter(item => 
                userOwnedItems.has(item.id)
              );
              console.log('Shopping list items needed:', itemsNeeded);
              if (onGenerateShoppingList) {
                onGenerateShoppingList(itemsNeeded);
              }
            }}
            className="flex-1 bg-white hover:bg-primary-50"
          >
            📝 Shopping List ({shoppingList.filter(item => userOwnedItems.has(item.id)).length} items)
          </Button>
          <Button 
            variant="primary" 
            onClick={onExportMealPlan}
            className="flex-1"
          >
            📄 Export Plan
          </Button>
        </Flex>
      </CardContent>
    </Card>
  );
};