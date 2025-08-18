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
  Grid,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  Badge,
  Input,
  Checkbox,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Loading,
  Alert,
  AlertTitle,
  AlertDescription,
  Select,
} from '@/components/ui';

interface ShoppingListGeneratorProps {
  meals: MealSlot[];
  userIngredients?: Ingredient[];
  onGenerateList: (items: ShoppingListItem[]) => Promise<void>;
  onExportToShoppingList: (items: ShoppingListItem[]) => Promise<void>;
  onShareViaEmail: (items: ShoppingListItem[]) => Promise<void>;
  onShareViaSMS: (items: ShoppingListItem[]) => Promise<void>;
  className?: string;
}

interface ShoppingListItem {
  id: string;
  name: string;
  category: string;
  totalAmount: number;
  unit: string;
  estimatedCost?: number;
  userPrice?: number;
  priceSource?: 'user' | 'system' | 'unknown';
  isPurchased: boolean;
  notes?: string;
  sources: {
    recipeId: string;
    recipeTitle: string;
    amount: number;
    servings: number;
  }[];
  isInInventory?: boolean;
  inventoryAmount?: number;
}

interface StoreSection {
  name: string;
  items: ShoppingListItem[];
  totalCost: number;
}

const STORE_SECTIONS = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Pantry',
  'Frozen',
  'Beverages',
  'Snacks',
  'Household',
  'Other'
];

const INGREDIENT_CATEGORIES: Record<string, string> = {
  'tomato': 'Produce',
  'onion': 'Produce',
  'garlic': 'Produce',
  'carrot': 'Produce',
  'lettuce': 'Produce',
  'spinach': 'Produce',
  'chicken': 'Meat & Seafood',
  'beef': 'Meat & Seafood',
  'pork': 'Meat & Seafood',
  'fish': 'Meat & Seafood',
  'shrimp': 'Meat & Seafood',
  'milk': 'Dairy & Eggs',
  'cheese': 'Dairy & Eggs',
  'eggs': 'Dairy & Eggs',
  'butter': 'Dairy & Eggs',
  'yogurt': 'Dairy & Eggs',
  'rice': 'Pantry',
  'pasta': 'Pantry',
  'flour': 'Pantry',
  'oil': 'Pantry',
  'sauce': 'Pantry',
  'spice': 'Pantry',
  'herb': 'Pantry',
  'bread': 'Pantry',
  'frozen': 'Frozen',
  'ice cream': 'Frozen',
  'water': 'Beverages',
  'juice': 'Beverages',
  'soda': 'Beverages',
  'chips': 'Snacks',
  'crackers': 'Snacks',
  'nuts': 'Snacks',
  'cleaning': 'Household',
  'paper': 'Household',
};

const getIngredientCategory = (ingredientName: string): string => {
  const lowerName = ingredientName.toLowerCase();
  
  for (const [keyword, category] of Object.entries(INGREDIENT_CATEGORIES)) {
    if (lowerName.includes(keyword)) {
      return category;
    }
  }
  
  return 'Other';
};

const normalizeUnit = (unit: string): string => {
  const unitMap: Record<string, string> = {
    'tbsp': 'tablespoon',
    'tbs': 'tablespoon',
    'tbsp.': 'tablespoon',
    'tsp': 'teaspoon',
    'tsp.': 'teaspoon',
    'cup': 'cup',
    'cups': 'cup',
    'c': 'cup',
    'oz': 'ounce',
    'ounces': 'ounce',
    'lb': 'pound',
    'lbs': 'pound',
    'pounds': 'pound',
    'g': 'gram',
    'grams': 'gram',
    'kg': 'kilogram',
    'kilograms': 'kilogram',
    'ml': 'milliliter',
    'milliliters': 'milliliter',
    'l': 'liter',
    'liters': 'liter',
    'piece': 'piece',
    'pieces': 'piece',
    'pcs': 'piece',
    'whole': 'whole',
    'clove': 'clove',
    'cloves': 'clove',
    'bunch': 'bunch',
    'bunches': 'bunch',
    'can': 'can',
    'cans': 'can',
    'jar': 'jar',
    'jars': 'jar',
    'package': 'package',
    'packages': 'package',
    'pkg': 'package',
  };
  
  return unitMap[unit.toLowerCase()] || unit.toLowerCase();
};

const convertUnit = (amount: number, fromUnit: string, toUnit: string): number => {
  // Simple conversion logic - in a real app, this would be more comprehensive
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  
  if (from === to) return amount;
  
  // Basic conversions
  if (from === 'tablespoon' && to === 'teaspoon') return amount * 3;
  if (from === 'teaspoon' && to === 'tablespoon') return amount / 3;
  if (from === 'cup' && to === 'tablespoon') return amount * 16;
  if (from === 'tablespoon' && to === 'cup') return amount / 16;
  if (from === 'pound' && to === 'ounce') return amount * 16;
  if (from === 'ounce' && to === 'pound') return amount / 16;
  
  return amount; // Return original if no conversion found
};

export const ShoppingListGenerator: React.FC<ShoppingListGeneratorProps> = ({
  meals,
  userIngredients = [],
  onGenerateList,
  onExportToShoppingList,
  onShareViaEmail,
  onShareViaSMS,
  className,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMethod, setShareMethod] = useState<'email' | 'sms'>('email');
  const [shareEmail, setShareEmail] = useState('');
  const [sharePhone, setSharePhone] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});

  // Generate shopping list items from meals
  const shoppingListItems = useMemo(() => {
    const itemMap = new Map<string, ShoppingListItem>();
    
    meals.forEach(meal => {
      if (!meal.recipe) return;
      
      meal.recipe.ingredients.forEach(ingredient => {
        const key = `${ingredient.name.toLowerCase()}-${normalizeUnit(ingredient.unit)}`;
        const category = getIngredientCategory(ingredient.name);
        
        // Check if user has this ingredient in inventory
        const inventoryItem = userIngredients.find(
          inv => inv.name.toLowerCase() === ingredient.name.toLowerCase()
        );
        
        const inventoryAmount = inventoryItem?.quantity || 0;
        const inventoryUnit = inventoryItem?.unit || ingredient.unit;
        
        // Convert inventory amount to ingredient unit if needed
        const convertedInventoryAmount = convertUnit(inventoryAmount, inventoryUnit, ingredient.unit);
        const neededAmount = Math.max(0, ingredient.amount - convertedInventoryAmount);
        
        if (neededAmount <= 0) return; // Skip if we have enough
        
        if (itemMap.has(key)) {
          const existing = itemMap.get(key)!;
          existing.totalAmount += neededAmount;
          existing.sources.push({
            recipeId: meal.recipe!.id,
            recipeTitle: meal.recipe!.title,
            amount: ingredient.amount,
            servings: meal.servings || meal.recipe!.servings,
          });
        } else {
          itemMap.set(key, {
            id: key,
            name: ingredient.name,
            category,
            totalAmount: neededAmount,
            unit: ingredient.unit,
            estimatedCost: ingredient.amount * 0.5, // Rough estimate
            isPurchased: false,
            notes: ingredient.notes,
            sources: [{
              recipeId: meal.recipe!.id,
              recipeTitle: meal.recipe!.title,
              amount: ingredient.amount,
              servings: meal.servings || meal.recipe!.servings,
            }],
            isInInventory: inventoryAmount > 0,
            inventoryAmount: convertedInventoryAmount,
          });
        }
      });
    });
    
    return Array.from(itemMap.values());
  }, [meals, userIngredients]);

  // Group items by store section
  const storeSections = useMemo(() => {
    const sections = new Map<string, StoreSection>();
    
    STORE_SECTIONS.forEach(sectionName => {
      sections.set(sectionName, {
        name: sectionName,
        items: [],
        totalCost: 0,
      });
    });
    
    shoppingListItems.forEach(item => {
      const section = sections.get(item.category) || sections.get('Other')!;
      section.items.push(item);
      section.totalCost += item.estimatedCost || 0;
    });
    
    return Array.from(sections.values()).filter(section => section.items.length > 0);
  }, [shoppingListItems]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalItems = shoppingListItems.length;
    const totalCost = shoppingListItems.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
    const itemsInInventory = shoppingListItems.filter(item => item.isInInventory).length;
    
    return { totalItems, totalCost, itemsInInventory };
  }, [shoppingListItems]);

  // Handle quantity changes
  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    setItemQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, newQuantity),
    }));
  };

  // Handle item selection
  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Handle select all/none
  const handleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedItems(new Set(shoppingListItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  // Generate final shopping list
  const generateFinalList = (): ShoppingListItem[] => {
    return shoppingListItems.map(item => ({
      ...item,
      totalAmount: itemQuantities[item.id] || item.totalAmount,
      notes: itemNotes[item.id] || item.notes,
      isPurchased: false,
    }));
  };

  // Handle export
  const handleExport = async () => {
    setIsGenerating(true);
    try {
      const finalList = generateFinalList();
      await onExportToShoppingList(finalList);
      setShowPreview(false);
    } catch (error) {
      console.error('Error exporting shopping list:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle share
  const handleShare = async () => {
    setIsGenerating(true);
    try {
      const finalList = generateFinalList();
      
      if (shareMethod === 'email') {
        await onShareViaEmail(finalList);
      } else {
        await onShareViaSMS(finalList);
      }
      
      setShowShareModal(false);
    } catch (error) {
      console.error('Error sharing shopping list:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (shoppingListItems.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-12">
          <div className="text-4xl mb-4">🛒</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No ingredients needed
          </h3>
          <p className="text-gray-500">
            All ingredients for your planned meals are already in your inventory!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <Flex align="center" justify="between" className="flex-col sm:flex-row gap-4">
            <div>
              <CardTitle className="text-2xl">Shopping List Generator</CardTitle>
              <p className="text-gray-600 mt-1">
                Generate shopping lists from your meal plan
              </p>
            </div>
            <Flex className="gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(true)}
              >
                👁️ Preview List
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowPreview(true)}
              >
                🛒 Generate List
              </Button>
            </Flex>
          </Flex>
        </CardHeader>

        <CardContent>
          {/* Summary Stats */}
          <Grid cols={3} className="gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{totals.totalItems}</p>
              <p className="text-sm text-blue-700">Items Needed</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">${totals.totalCost.toFixed(2)}</p>
              <p className="text-sm text-green-700">Estimated Cost</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{totals.itemsInInventory}</p>
              <p className="text-sm text-orange-700">In Inventory</p>
            </div>
          </Grid>

          {/* Store Sections Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Organized by Store Section</h3>
            <Grid cols={1} responsive={{ md: 2, lg: 3 }} className="gap-4">
              {storeSections.map(section => (
                <Card key={section.name} className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{section.name}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {section.items.length} items • ${section.totalCost.toFixed(2)}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {section.items.slice(0, 3).map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="truncate">{item.name}</span>
                          <span className="text-gray-600">
                            {item.totalAmount} {item.unit}
                          </span>
                        </div>
                      ))}
                      {section.items.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{section.items.length - 3} more items
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </Grid>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} size="lg">
        <ModalHeader>
          <ModalTitle>Shopping List Preview</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            {/* Summary */}
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold">{totals.totalItems} items</p>
                <p className="text-sm text-gray-600">Estimated total: ${totals.totalCost.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(true)}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(false)}
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* Items by Section */}
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All Items</TabsTrigger>
                {storeSections.map(section => (
                  <TabsTrigger key={section.name} value={section.name}>
                    {section.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {shoppingListItems.map(item => (
                  <ShoppingListItemRow
                    key={item.id}
                    item={item}
                    isSelected={selectedItems.has(item.id)}
                    quantity={itemQuantities[item.id] || item.totalAmount}
                    notes={itemNotes[item.id] || item.notes}
                    onToggle={() => handleItemToggle(item.id)}
                    onQuantityChange={(qty) => handleQuantityChange(item.id, qty)}
                    onNotesChange={(notes) => setItemNotes(prev => ({ ...prev, [item.id]: notes }))}
                  />
                ))}
              </TabsContent>

              {storeSections.map(section => (
                <TabsContent key={section.name} value={section.name} className="space-y-4">
                  {section.items.map(item => (
                    <ShoppingListItemRow
                      key={item.id}
                      item={item}
                      isSelected={selectedItems.has(item.id)}
                      quantity={itemQuantities[item.id] || item.totalAmount}
                      notes={itemNotes[item.id] || item.notes}
                      onToggle={() => handleItemToggle(item.id)}
                      onQuantityChange={(qty) => handleQuantityChange(item.id, qty)}
                      onNotesChange={(notes) => setItemNotes(prev => ({ ...prev, [item.id]: notes }))}
                    />
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </ModalBody>
        <ModalFooter>
          <Flex className="gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => setShowShareModal(true)}
              className="flex-1"
            >
              📧 Share
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? <Loading className="w-4 h-4" /> : 'Export to Shopping List'}
            </Button>
          </Flex>
        </ModalFooter>
      </Modal>

      {/* Share Modal */}
      <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)}>
        <ModalHeader>
          <ModalTitle>Share Shopping List</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share Method
              </label>
              <Select
                value={shareMethod}
                onValueChange={(value) => setShareMethod(value as 'email' | 'sms')}
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </Select>
            </div>

            {shareMethod === 'email' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={sharePhone}
                  onChange={(e) => setSharePhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Flex className="gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => setShowShareModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleShare}
              disabled={isGenerating || (!shareEmail && !sharePhone)}
              className="flex-1"
            >
              {isGenerating ? <Loading className="w-4 h-4" /> : 'Share'}
            </Button>
          </Flex>
        </ModalFooter>
      </Modal>
    </>
  );
};

interface ShoppingListItemRowProps {
  item: ShoppingListItem;
  isSelected: boolean;
  quantity: number;
  notes?: string;
  onToggle: () => void;
  onQuantityChange: (quantity: number) => void;
  onNotesChange: (notes: string) => void;
}

const ShoppingListItemRow: React.FC<ShoppingListItemRowProps> = ({
  item,
  isSelected,
  quantity,
  notes,
  onToggle,
  onQuantityChange,
  onNotesChange,
}) => {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
      <Checkbox
        checked={isSelected}
        onChange={onToggle}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.name}</span>
          {item.isInInventory && (
            <Badge variant="outline" className="text-xs">
              In Stock
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{item.category}</span>
          <span>${(item.estimatedCost || 0).toFixed(2)}</span>
          {item.sources.length > 0 && (
            <span>{item.sources.length} recipe{item.sources.length > 1 ? 's' : ''}</span>
          )}
        </div>
        
        {notes && (
          <p className="text-xs text-gray-500 italic mt-1">{notes}</p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={quantity}
          onChange={(e) => onQuantityChange(parseFloat(e.target.value) || 0)}
          className="w-20"
          min="0"
          step="0.1"
        />
        <span className="text-sm text-gray-600 w-12">{item.unit}</span>
      </div>
    </div>
  );
};
