import { where, QueryConstraint } from 'firebase/firestore';
import { BaseFirebaseService, BaseEntity } from './base-service';
import { docToRecipe, recipeToDoc } from './data-converters';
import { Recipe, RecipeFormData } from '@/types';

export interface RecipeEntity extends Recipe, BaseEntity {}

export class RecipeService extends BaseFirebaseService<RecipeEntity, RecipeFormData, Partial<RecipeFormData>> {
  protected collectionName = 'recipes';
  
  protected docToEntity(doc: any): RecipeEntity {
    return docToRecipe(doc);
  }
  
  protected entityToDoc(data: RecipeFormData) {
    return recipeToDoc(data);
  }

  // Get recipes by ingredient
  async getByIngredient(userId: string, ingredientName: string): Promise<RecipeEntity[]> {
    const constraints: QueryConstraint[] = [
      where('ingredients', 'array-contains', { name: ingredientName }),
    ];
    
    return this.getAll(userId, constraints);
  }

  // Get recipes by category/tag
  async getByCategory(userId: string, category: string): Promise<RecipeEntity[]> {
    const constraints: QueryConstraint[] = [
      where('tags', 'array-contains', category),
    ];
    
    return this.getAll(userId, constraints);
  }

  // Get recipes by cuisine
  async getByCuisine(userId: string, cuisine: string): Promise<RecipeEntity[]> {
    const constraints: QueryConstraint[] = [
      where('cuisine', '==', cuisine),
    ];
    
    return this.getAll(userId, constraints);
  }

  // Get recipes by meal type
  async getByMealType(userId: string, mealType: string): Promise<RecipeEntity[]> {
    const constraints: QueryConstraint[] = [
      where('mealType', 'array-contains', mealType),
    ];
    
    return this.getAll(userId, constraints);
  }

  // Get recipes by difficulty
  async getByDifficulty(userId: string, difficulty: string): Promise<RecipeEntity[]> {
    const constraints: QueryConstraint[] = [
      where('difficulty', '==', difficulty),
    ];
    
    return this.getAll(userId, constraints);
  }

  // Get favorite recipes
  async getFavorites(userId: string): Promise<RecipeEntity[]> {
    const constraints: QueryConstraint[] = [
      where('metadata.isFavorite', '==', true),
    ];
    
    return this.getAll(userId, constraints);
  }

  // Search recipes
  async search(userId: string, searchTerm: string): Promise<RecipeEntity[]> {
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation - consider using Algolia or similar for production
    const allRecipes = await this.getAll(userId);
    const lowercaseSearch = searchTerm.toLowerCase();
    
    return allRecipes.filter(recipe => 
      recipe.title.toLowerCase().includes(lowercaseSearch) ||
      recipe.description.toLowerCase().includes(lowercaseSearch) ||
      recipe.ingredients.some(ing => ing.name.toLowerCase().includes(lowercaseSearch)) ||
      recipe.tags.some(tag => tag.toLowerCase().includes(lowercaseSearch))
    );
  }

  // Get recipes by dietary restrictions
  async getByDietary(userId: string, dietary: string[]): Promise<RecipeEntity[]> {
    const constraints: QueryConstraint[] = [
      where('dietary', 'array-contains-any', dietary),
    ];
    
    return this.getAll(userId, constraints);
  }

  // Get recently cooked recipes
  async getRecentlyCooked(userId: string, limit = 10): Promise<RecipeEntity[]> {
    const constraints: QueryConstraint[] = [
      where('metadata.lastCookedAt', '!=', null),
    ];
    
    const recipes = await this.getAll(userId, constraints);
    return recipes
      .filter(recipe => recipe.metadata.lastCookedAt)
      .sort((a, b) => {
        const dateA = a.metadata.lastCookedAt || new Date(0);
        const dateB = b.metadata.lastCookedAt || new Date(0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit);
  }

  // Get most cooked recipes
  async getMostCooked(userId: string, limit = 10): Promise<RecipeEntity[]> {
    const allRecipes = await this.getAll(userId);
    return allRecipes
      .filter(recipe => recipe.metadata.cookCount > 0)
      .sort((a, b) => b.metadata.cookCount - a.metadata.cookCount)
      .slice(0, limit);
  }

  // Mark recipe as cooked
  async markAsCooked(userId: string, recipeId: string): Promise<void> {
    const recipe = await this.getById(userId, recipeId);
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    await this.update(userId, recipeId, {
      'metadata.lastCookedAt': new Date().toISOString(),
      'metadata.cookCount': recipe.metadata.cookCount + 1,
    });
  }

  // Toggle favorite status
  async toggleFavorite(userId: string, recipeId: string): Promise<void> {
    const recipe = await this.getById(userId, recipeId);
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    await this.update(userId, recipeId, {
      'metadata.isFavorite': !recipe.metadata.isFavorite,
    });
  }

  // Archive/unarchive recipe
  async toggleArchive(userId: string, recipeId: string): Promise<void> {
    const recipe = await this.getById(userId, recipeId);
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    await this.update(userId, recipeId, {
      'metadata.isArchived': !recipe.metadata.isArchived,
    });
  }

  // Get public recipes
  async getPublicRecipes(userId: string): Promise<RecipeEntity[]> {
    const constraints: QueryConstraint[] = [
      where('sharing.isPublic', '==', true),
    ];
    
    return this.getAll(userId, constraints);
  }

  // Bulk update recipes
  async bulkUpdate(
    userId: string, 
    recipeIds: string[], 
    updates: Partial<RecipeFormData>
  ): Promise<void> {
    const updatePromises = recipeIds.map(id => this.update(userId, id, updates));
    await Promise.all(updatePromises);
  }

  // Bulk delete recipes
  async bulkDelete(userId: string, recipeIds: string[]): Promise<void> {
    const deletePromises = recipeIds.map(id => this.delete(userId, id));
    await Promise.all(deletePromises);
  }
}

// Export singleton instance
export const recipeService = new RecipeService();
