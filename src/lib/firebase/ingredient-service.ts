import { where, Timestamp, QueryConstraint } from 'firebase/firestore';
import { BaseFirebaseService, BaseEntity } from './base-service';
import { docToIngredient, ingredientToDoc } from './data-converters';
import { Ingredient, IngredientFormData } from '@/types';

export interface IngredientEntity extends Ingredient, BaseEntity {}

export class IngredientService extends BaseFirebaseService<IngredientEntity, IngredientFormData, Partial<IngredientFormData>> {
  protected collectionName = 'ingredients';
  
  protected docToEntity(doc: any): IngredientEntity {
    return docToIngredient(doc);
  }
  
  protected entityToDoc(data: IngredientFormData) {
    return ingredientToDoc(data);
  }

  // Get ingredients expiring soon
  async getExpiringIngredients(userId: string, daysFromNow = 3): Promise<IngredientEntity[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysFromNow);
    
    const constraints: QueryConstraint[] = [
      where('expirationDate', '<=', Timestamp.fromDate(futureDate)),
      where('expirationDate', '>', Timestamp.fromDate(new Date())),
    ];
    
    return this.getAll(userId, constraints);
  }

  // Filter ingredients by location
  async getByLocation(
    userId: string, 
    location: 'fridge' | 'pantry' | 'freezer'
  ): Promise<IngredientEntity[]> {
    const constraints: QueryConstraint[] = [
      where('location', '==', location),
    ];
    
    return this.getAll(userId, constraints);
  }

  // Get ingredients by category
  async getByCategory(userId: string, category: string): Promise<IngredientEntity[]> {
    const constraints: QueryConstraint[] = [
      where('category', '==', category),
    ];
    
    return this.getAll(userId, constraints);
  }

  // Search ingredients by name
  async searchByName(userId: string, searchTerm: string): Promise<IngredientEntity[]> {
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation - consider using Algolia or similar for production
    const allIngredients = await this.getAll(userId);
    const lowercaseSearch = searchTerm.toLowerCase();
    
    return allIngredients.filter(ingredient => 
      ingredient.name.toLowerCase().includes(lowercaseSearch) ||
      (ingredient.customName && ingredient.customName.toLowerCase().includes(lowercaseSearch)) ||
      ingredient.tags.some(tag => tag.toLowerCase().includes(lowercaseSearch))
    );
  }

  // Get ingredients by tags
  async getByTags(userId: string, tags: string[]): Promise<IngredientEntity[]> {
    const constraints: QueryConstraint[] = [
      where('tags', 'array-contains-any', tags),
    ];
    
    return this.getAll(userId, constraints);
  }

  // Bulk update ingredients
  async bulkUpdate(
    userId: string, 
    ingredientIds: string[], 
    updates: Partial<IngredientFormData>
  ): Promise<void> {
    const updatePromises = ingredientIds.map(id => this.update(userId, id, updates));
    await Promise.all(updatePromises);
  }

  // Bulk delete ingredients
  async bulkDelete(userId: string, ingredientIds: string[]): Promise<void> {
    const deletePromises = ingredientIds.map(id => this.delete(userId, id));
    await Promise.all(deletePromises);
  }
}

// Export singleton instance
export const ingredientService = new IngredientService();
