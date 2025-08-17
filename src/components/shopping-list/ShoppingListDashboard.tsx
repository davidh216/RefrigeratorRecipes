import React, { useState, useEffect } from 'react';
import { useShoppingList } from '@/hooks';
import { useIngredients } from '@/hooks';
import { useMealPlan } from '@/hooks';
import { useDebounce } from '@/hooks';
import { ShoppingList, ShoppingListItem } from '@/types';
import { Card, Button, Input, Select, Badge, Loading, Alert } from '@/components/ui';


interface ShoppingListDashboardProps {
  className?: string;
}

export const ShoppingListDashboard: React.FC<ShoppingListDashboardProps> = ({ className }) => {
  const {
    shoppingLists,
    filteredShoppingLists,
    filters,
    sortOptions,
    isLoading,
    error,
    addShoppingList,
    updateShoppingList,
    deleteShoppingList,
    addItemToList,
    removeItemFromList,
    toggleItemPurchased,
    updateItemQuantity,
    updateItemPrice,
    generateFromMealPlan,
    setFilters,
    setSortOptions,
    clearFilters,
    getItemsByCategory,
    getTotalCost,
    getPurchasedCount,
  } = useShoppingList();

  const { ingredients } = useIngredients();
  const { mealPlan } = useMealPlan();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Other',
    totalAmount: 1,
    unit: 'piece',
    userPrice: 0,
    notes: ''
  });

  // Generate shopping list from current meal plan
  const handleGenerateFromMealPlan = async () => {
    if (!mealPlan) {
      alert('No meal plan available. Please create a meal plan first.');
      return;
    }

    try {
      await generateFromMealPlan(mealPlan, ingredients);
      alert('Shopping list generated successfully!');
    } catch (error) {
      console.error('Failed to generate shopping list:', error);
    }
  };

  // Create new shopping list
  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    try {
      await addShoppingList({
        name: newListName,
        items: [],
      });
      setNewListName('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create shopping list:', error);
    }
  };

  // Delete shopping list
  const handleDeleteList = async (listId: string) => {
    if (confirm('Are you sure you want to delete this shopping list?')) {
      try {
        await deleteShoppingList(listId);
        if (selectedList?.id === listId) {
          setSelectedList(null);
        }
      } catch (error) {
        console.error('Failed to delete shopping list:', error);
      }
    }
  };

  // Toggle item purchased status
  const handleToggleItem = async (listId: string, itemId: string) => {
    try {
      await toggleItemPurchased(listId, itemId);
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  // Update item quantity
  const handleUpdateQuantity = async (listId: string, itemId: string, quantity: number) => {
    try {
      await updateItemQuantity(listId, itemId, quantity);
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  // Update item price
  const handleUpdatePrice = async (listId: string, itemId: string, price: number) => {
    try {
      await updateItemPrice(listId, itemId, price);
    } catch (error) {
      console.error('Failed to update price:', error);
    }
  };

  // Add new item to list
  const handleAddItem = async () => {
    if (!selectedList || !newItem.name.trim()) return;

    try {
      const itemToAdd: Partial<ShoppingListItem> = {
        id: `item-${Date.now()}`,
        name: newItem.name,
        category: newItem.category,
        totalAmount: newItem.totalAmount,
        unit: newItem.unit,
        userPrice: newItem.userPrice > 0 ? newItem.userPrice : undefined,
        priceSource: newItem.userPrice > 0 ? 'user' as const : 'unknown' as const,
        isPurchased: false,
        notes: newItem.notes || undefined,
        sources: []
      };

      await addItemToList(selectedList.id, itemToAdd as ShoppingListItem);
      
      // Reset form
      setNewItem({
        name: '',
        category: 'Other',
        totalAmount: 1,
        unit: 'piece',
        userPrice: 0,
        notes: ''
      });
      setShowAddItemForm(false);
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  // Remove item from list
  const handleRemoveItem = async (listId: string, itemId: string) => {
    try {
      await removeItemFromList(listId, itemId);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Shopping Lists</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateFromMealPlan}
            disabled={!mealPlan}
          >
            Generate from Meal Plan
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <span className="mr-2">➕</span>
            New List
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Create Form */}
      {showCreateForm && (
        <Card className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Shopping list name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateList()}
            />
            <Button onClick={handleCreateList} disabled={!newListName.trim()}>
              Create
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Input
              placeholder="Search shopping lists..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>
          <Select
            value={filters.isPurchased}
            onChange={(value) => setFilters({ isPurchased: value as any })}
          >
            <option value="all">All Items</option>
            <option value="purchased">Purchased</option>
            <option value="unpurchased">Unpurchased</option>
          </Select>
          <Select
            value={sortOptions.field}
            onChange={(value) => setSortOptions({ field: value as any, direction: sortOptions.direction })}
          >
            <option value="name">Name</option>
            <option value="category">Category</option>
            <option value="totalAmount">Total Amount</option>
            <option value="estimatedCost">Estimated Cost</option>
          </Select>
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Shopping Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShoppingLists.map((list) => {
          const { purchased, total } = getPurchasedCount(list.id);
          const totalCost = getTotalCost(list.id);
          const itemsByCategory = getItemsByCategory(list.id);

          return (
            <Card
              key={list.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedList?.id === list.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedList(list)}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">{list.name}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteList(list.id);
                  }}
                >
                  <span>🗑️</span>
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{list.items.length} items</span>
                  <span>{purchased}/{total} purchased</span>
                </div>

                {totalCost > 0 && (
                  <div className="text-sm text-gray-600">
                    Estimated cost: ${totalCost.toFixed(2)}
                  </div>
                )}

                <div className="flex gap-1 flex-wrap">
                  {Object.keys(itemsByCategory).slice(0, 3).map((category) => (
                    <Badge key={category} variant="secondary" size="sm">
                      {category}
                    </Badge>
                  ))}
                  {Object.keys(itemsByCategory).length > 3 && (
                    <Badge variant="secondary" size="sm">
                      +{Object.keys(itemsByCategory).length - 3} more
                    </Badge>
                  )}
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${total > 0 ? (purchased / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Selected List Details */}
      {selectedList && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{selectedList.name}</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAddItemForm(true)}
                size="sm"
              >
                Add Item
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedList(null)}
              >
                Close
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(getItemsByCategory(selectedList.id)).map(([category, items]) => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-2">{category}</h3>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        item.isPurchased ? 'bg-gray-50' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleItem(selectedList.id, item.id)}
                          className="text-gray-400 hover:text-green-500"
                        >
                          {item.isPurchased ? (
                            <span className="text-green-500">✅</span>
                          ) : (
                            <span>⭕</span>
                          )}
                        </button>
                        <div>
                          <div className={`font-medium ${item.isPurchased ? 'line-through text-gray-500' : ''}`}>
                            {item.name}
                          </div>
                          {item.notes && (
                            <div className="text-sm text-gray-500">{item.notes}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={item.totalAmount}
                            onChange={(e) => handleUpdateQuantity(selectedList.id, item.id, parseFloat(e.target.value) || 0)}
                            className="w-20"
                            min="0"
                            step="0.1"
                          />
                          <span className="text-sm text-gray-500">{item.unit}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">$</span>
                          <Input
                            type="number"
                            value={item.userPrice ?? item.estimatedCost ?? ''}
                            onChange={(e) => handleUpdatePrice(selectedList.id, item.id, parseFloat(e.target.value) || 0)}
                            className="w-20"
                            min="0"
                            step="0.01"
                            placeholder="Price"
                          />
                        </div>
                        {item.priceSource === 'system' && !item.userPrice && item.estimatedCost && (
                          <span className="text-xs text-gray-400">(est.)</span>
                        )}
                        <button
                          onClick={() => handleRemoveItem(selectedList.id, item.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove item"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedList.items.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No items in this shopping list
            </div>
          )}

          {/* Add Item Form */}
          {showAddItemForm && (
            <Card className="p-4 mt-4 bg-gray-50">
              <h3 className="font-semibold mb-3">Add New Item</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Input
                  placeholder="Item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({...prev, name: e.target.value}))}
                />
                <Input
                  placeholder="Category"
                  value={newItem.category}
                  onChange={(e) => setNewItem(prev => ({...prev, category: e.target.value}))}
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Quantity"
                    value={newItem.totalAmount}
                    onChange={(e) => setNewItem(prev => ({...prev, totalAmount: parseFloat(e.target.value) || 1}))}
                    className="flex-1"
                    min="0"
                    step="0.1"
                  />
                  <Input
                    placeholder="Unit"
                    value={newItem.unit}
                    onChange={(e) => setNewItem(prev => ({...prev, unit: e.target.value}))}
                    className="w-20"
                  />
                </div>
                <Input
                  type="number"
                  placeholder="Price ($)"
                  value={newItem.userPrice}
                  onChange={(e) => setNewItem(prev => ({...prev, userPrice: parseFloat(e.target.value) || 0}))}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="mt-3">
                <Input
                  placeholder="Notes (optional)"
                  value={newItem.notes}
                  onChange={(e) => setNewItem(prev => ({...prev, notes: e.target.value}))}
                />
              </div>
              <div className="flex gap-2 mt-3">
                <Button onClick={handleAddItem} disabled={!newItem.name.trim()}>
                  Add Item
                </Button>
                <Button variant="outline" onClick={() => setShowAddItemForm(false)}>
                  Cancel
                </Button>
              </div>
            </Card>
          )}
        </Card>
      )}

      {filteredShoppingLists.length === 0 && !isLoading && (
        <div className="text-center text-gray-500 py-8">
          No shopping lists found. Create your first shopping list or generate one from your meal plan.
        </div>
      )}
    </div>
  );
};
