import { where, QueryConstraint } from 'firebase/firestore';
import { BaseFirebaseService, BaseEntity } from './base-service';
import { docToShoppingList, shoppingListToDoc } from './data-converters';
import { ShoppingList, ShoppingListFormData, ShoppingListItem, MealPlan, Ingredient } from '@/types';
import { recipeService } from './recipe-service';
import { ingredientService } from './ingredient-service';

export interface ShoppingListEntity extends ShoppingList, BaseEntity {}

export class ShoppingListService extends BaseFirebaseService<ShoppingListEntity, ShoppingListFormData, Partial<ShoppingListFormData>> {
  protected collectionName = 'shoppingLists';
  
  protected docToEntity(doc: any): ShoppingListEntity {
    return docToShoppingList(doc);
  }
  
  protected entityToDoc(data: ShoppingListFormData) {
    return shoppingListToDoc(data);
  }

  // Get completed shopping lists
  async getCompleted(userId: string): Promise<ShoppingListEntity[]> {
    const constraints: QueryConstraint[] = [
      where('isCompleted', '==', true),
    ];
    
    return this.getAll(userId, constraints);
  }

  // Get active (incomplete) shopping lists
  async getActive(userId: string): Promise<ShoppingListEntity[]> {
    const constraints: QueryConstraint[] = [
      where('isCompleted', '==', false),
    ];
    
    return this.getAll(userId, constraints);
  }

  // Mark shopping list as completed
  async markAsCompleted(userId: string, shoppingListId: string): Promise<void> {
    await this.update(userId, shoppingListId, { isCompleted: true });
  }

  // Mark shopping list as incomplete
  async markAsIncomplete(userId: string, shoppingListId: string): Promise<void> {
    await this.update(userId, shoppingListId, { isCompleted: false });
  }

  // Toggle item purchase status
  async toggleItemPurchase(
    userId: string, 
    shoppingListId: string, 
    itemId: string
  ): Promise<void> {
    const shoppingList = await this.getById(userId, shoppingListId);
    if (!shoppingList) {
      throw new Error('Shopping list not found');
    }
    
    const updatedItems = shoppingList.items.map(item => 
      item.id === itemId 
        ? { ...item, isPurchased: !item.isPurchased }
        : item
    );
    
    await this.update(userId, shoppingListId, { items: updatedItems });
  }

  // Add item to shopping list
  async addItem(
    userId: string, 
    shoppingListId: string, 
    item: Omit<ShoppingListItem, 'id'>
  ): Promise<void> {
    const shoppingList = await this.getById(userId, shoppingListId);
    if (!shoppingList) {
      throw new Error('Shopping list not found');
    }
    
    const newItem: ShoppingListItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    const updatedItems = [...shoppingList.items, newItem];
    await this.update(userId, shoppingListId, { items: updatedItems });
  }

  // Remove item from shopping list
  async removeItem(
    userId: string, 
    shoppingListId: string, 
    itemId: string
  ): Promise<void> {
    const shoppingList = await this.getById(userId, shoppingListId);
    if (!shoppingList) {
      throw new Error('Shopping list not found');
    }
    
    const updatedItems = shoppingList.items.filter(item => item.id !== itemId);
    await this.update(userId, shoppingListId, { items: updatedItems });
  }

  // Update item in shopping list
  async updateItem(
    userId: string, 
    shoppingListId: string, 
    itemId: string, 
    updates: Partial<ShoppingListItem>
  ): Promise<void> {
    const shoppingList = await this.getById(userId, shoppingListId);
    if (!shoppingList) {
      throw new Error('Shopping list not found');
    }
    
    const updatedItems = shoppingList.items.map(item => 
      item.id === itemId 
        ? { ...item, ...updates }
        : item
    );
    
    await this.update(userId, shoppingListId, { items: updatedItems });
  }

  // Generate shopping list from meal plan
  async generateFromMealPlan(userId: string, weekStart: Date): Promise<ShoppingListEntity> {
    try {
      // Get meal plans for the week
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const mealPlans = await this.getByDateRange(userId, weekStart, weekEnd);
      
      // Collect all ingredients from meals
      const ingredientsMap = new Map<string, { amount: number; unit: string; recipes: string[] }>();
      
      for (const plan of mealPlans) {
        if (plan.meals) {
          for (const meal of plan.meals) {
            if (meal.recipe && meal.recipe.ingredients) {
              const servingsMultiplier = (meal.servings || 1) / (meal.recipe.servingsCount || 1);
              
              for (const ingredient of meal.recipe.ingredients) {
                const key = ingredient.name.toLowerCase();
                const existing = ingredientsMap.get(key);
                
                if (existing) {
                  existing.amount += (ingredient.amount || 0) * servingsMultiplier;
                  if (!existing.recipes.includes(meal.recipe.title)) {
                    existing.recipes.push(meal.recipe.title);
                  }
                } else {
                  ingredientsMap.set(key, {
                    amount: (ingredient.amount || 0) * servingsMultiplier,
                    unit: ingredient.unit || '',
                    recipes: [meal.recipe.title]
                  });
                }
              }
            }
          }
        }
      }
      
      // Convert to shopping list items
      const items = Array.from(ingredientsMap.entries()).map(([name, data]) => ({
        name,
        amount: Math.round(data.amount * 100) / 100,
        unit: data.unit,
        category: this.categorizeIngredient(name),
        isChecked: false,
        notes: `From: ${data.recipes.join(', ')}`
      }));
      
      // Create shopping list
      const shoppingListData: ShoppingListFormData = {
        name: `Shopping List - ${weekStart.toLocaleDateString()}`,
        items,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        isActive: true
      };
      
      return await this.create(userId, shoppingListData);
    } catch (error) {
      throw new FirebaseServiceError(
        'Failed to generate shopping list from meal plan',
        error,
        'generateFromMealPlan',
        'ShoppingList'
      );
    }
  }

  // Categorize ingredients for better organization
  private categorizeIngredient(ingredientName: string): string {
    const name = ingredientName.toLowerCase();
    
    if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt') || name.includes('cream')) {
      return 'Dairy';
    }
    if (name.includes('chicken') || name.includes('beef') || name.includes('pork') || name.includes('fish') || name.includes('meat')) {
      return 'Meat & Seafood';
    }
    if (name.includes('apple') || name.includes('banana') || name.includes('orange') || name.includes('berry') || name.includes('fruit')) {
      return 'Fruits';
    }
    if (name.includes('carrot') || name.includes('lettuce') || name.includes('tomato') || name.includes('onion') || name.includes('vegetable')) {
      return 'Vegetables';
    }
    if (name.includes('bread') || name.includes('pasta') || name.includes('rice') || name.includes('flour') || name.includes('grain')) {
      return 'Grains & Bread';
    }
    if (name.includes('oil') || name.includes('vinegar') || name.includes('sauce') || name.includes('spice') || name.includes('seasoning')) {
      return 'Pantry';
    }
    if (name.includes('egg')) {
      return 'Dairy';
    }
    if (name.includes('nut') || name.includes('seed')) {
      return 'Nuts & Seeds';
    }
    
    return 'Other';
  }

  // Merge multiple shopping lists
  async mergeLists(userId: string, listIds: string[]): Promise<ShoppingListEntity> {
    try {
      const lists = await Promise.all(listIds.map(id => this.getById(userId, id)));
      
      // Combine all items
      const itemsMap = new Map<string, { amount: number; unit: string; notes: string[] }>();
      
      for (const list of lists) {
        if (list.items) {
          for (const item of list.items) {
            const key = item.name.toLowerCase();
            const existing = itemsMap.get(key);
            
            if (existing) {
              existing.amount += item.amount || 0;
              if (item.notes && !existing.notes.includes(item.notes)) {
                existing.notes.push(item.notes);
              }
            } else {
              itemsMap.set(key, {
                amount: item.amount || 0,
                unit: item.unit || '',
                notes: item.notes ? [item.notes] : []
              });
            }
          }
        }
      }
      
      // Convert to shopping list items
      const mergedItems = Array.from(itemsMap.entries()).map(([name, data]) => ({
        name,
        amount: Math.round(data.amount * 100) / 100,
        unit: data.unit,
        category: this.categorizeIngredient(name),
        isChecked: false,
        notes: data.notes.join('; ')
      }));
      
      // Create merged list
      const mergedListData: ShoppingListFormData = {
        name: `Merged Shopping List - ${new Date().toLocaleDateString()}`,
        items: mergedItems,
        isActive: true
      };
      
      return await this.create(userId, mergedListData);
    } catch (error) {
      throw new FirebaseServiceError(
        'Failed to merge shopping lists',
        error,
        'mergeLists',
        'ShoppingList'
      );
    }
  }

  // Get shopping lists by category
  async getByCategory(userId: string, category: string): Promise<ShoppingListEntity[]> {
    const allLists = await this.getAll(userId);
    return allLists.filter(list => 
      list.items.some(item => item.category === category)
    );
  }

  // Get shopping lists with estimated cost range
  async getByCostRange(
    userId: string, 
    minCost: number, 
    maxCost: number
  ): Promise<ShoppingListEntity[]> {
    const allLists = await this.getAll(userId);
    return allLists.filter(list => 
      list.totalEstimatedCost >= minCost && list.totalEstimatedCost <= maxCost
    );
  }

  // Search shopping lists by name
  async searchByName(userId: string, searchTerm: string): Promise<ShoppingListEntity[]> {
    const allLists = await this.getAll(userId);
    const lowercaseSearch = searchTerm.toLowerCase();
    
    return allLists.filter(list => 
      list.name.toLowerCase().includes(lowercaseSearch) ||
      list.items.some(item => item.name.toLowerCase().includes(lowercaseSearch))
    );
  }

  // Bulk update shopping lists
  async bulkUpdate(
    userId: string, 
    shoppingListIds: string[], 
    updates: Partial<ShoppingListFormData>
  ): Promise<void> {
    const updatePromises = shoppingListIds.map(id => this.update(userId, id, updates));
    await Promise.all(updatePromises);
  }

  // Bulk delete shopping lists
  async bulkDelete(userId: string, shoppingListIds: string[]): Promise<void> {
    const deletePromises = shoppingListIds.map(id => this.delete(userId, id));
    await Promise.all(deletePromises);
  }
}

// Export singleton instance
export const shoppingListService = new ShoppingListService();
