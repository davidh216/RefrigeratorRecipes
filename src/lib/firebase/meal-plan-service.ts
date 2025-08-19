import { where, Timestamp, QueryConstraint, limit } from 'firebase/firestore';
import { BaseFirebaseService, BaseEntity } from './base-service';
import { docToMealPlan, mealPlanToDoc, dateToTimestamp } from './data-converters';
import { MealPlan, MealPlanFormData, MealSlot } from '@/types';

export interface MealPlanEntity extends MealPlan, BaseEntity {}

export class MealPlanService extends BaseFirebaseService<MealPlanEntity, MealPlanFormData, Partial<MealPlanFormData>> {
  protected collectionName = 'mealPlans';
  
  protected docToEntity(doc: any): MealPlanEntity {
    return docToMealPlan(doc);
  }
  
  protected entityToDoc(data: MealPlanFormData) {
    return mealPlanToDoc(data);
  }

  // Get meal plan by week
  async getByWeek(userId: string, weekStart: Date): Promise<MealPlanEntity | null> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const constraints: QueryConstraint[] = [
      where('weekStart', '>=', Timestamp.fromDate(weekStart)),
      where('weekStart', '<=', Timestamp.fromDate(weekEnd)),
      limit(1)
    ];
    
    const mealPlans = await this.getAll(userId, constraints);
    return mealPlans.length > 0 ? mealPlans[0] : null;
  }

  // Get meal plans by date range
  async getByDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<MealPlanEntity[]> {
    const constraints: QueryConstraint[] = [
      where('weekStart', '>=', Timestamp.fromDate(startDate)),
      where('weekStart', '<=', Timestamp.fromDate(endDate)),
    ];
    
    return this.getAll(userId, constraints);
  }

  // Get meal plans by month
  async getByMonth(userId: string, year: number, month: number): Promise<MealPlanEntity[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    
    return this.getByDateRange(userId, startDate, endDate);
  }

  // Create or update week-based meal plan
  async createOrUpdateWeekPlan(
    userId: string, 
    weekStart: Date, 
    meals: MealSlot[]
  ): Promise<string> {
    const existingPlan = await this.getByWeek(userId, weekStart);
    
    if (existingPlan) {
      // Update existing plan
      await this.update(userId, existingPlan.id, { 
        meals: meals.map(meal => ({
          date: meal.date.toISOString(),
          mealType: meal.mealType,
          recipeId: meal.recipeId,
          notes: meal.notes,
          servings: meal.servings
        }))
      });
      return existingPlan.id;
    } else {
      // Create new plan
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const newPlanData: MealPlanFormData = {
        weekStart: weekStart.toISOString(),
        meals: meals.map(meal => ({
          date: meal.date.toISOString(),
          mealType: meal.mealType,
          recipeId: meal.recipeId,
          notes: meal.notes,
          servings: meal.servings
        }))
      };
      
      return await this.create(userId, newPlanData);
    }
  }

  // Get meal slot by ID
  async getMealSlotById(
    userId: string, 
    mealPlanId: string, 
    slotId: string
  ): Promise<MealSlot | null> {
    const mealPlan = await this.getById(userId, mealPlanId);
    if (!mealPlan) return null;
    
    return mealPlan.meals.find(meal => meal.id === slotId) || null;
  }

  // Update meal slot
  async updateMealSlot(
    userId: string, 
    mealPlanId: string, 
    slotId: string, 
    updates: Partial<MealSlot>
  ): Promise<void> {
    const mealPlan = await this.getById(userId, mealPlanId);
    if (!mealPlan) {
      throw new Error('Meal plan not found');
    }
    
    const updatedMeals = mealPlan.meals.map(meal => 
      meal.id === slotId 
        ? { ...meal, ...updates }
        : meal
    );
    
    await this.update(userId, mealPlanId, { meals: updatedMeals });
  }

  // Add meal to plan
  async addMealToPlan(
    userId: string, 
    mealPlanId: string, 
    meal: Omit<MealSlot, 'id'>
  ): Promise<void> {
    const mealPlan = await this.getById(userId, mealPlanId);
    if (!mealPlan) {
      throw new Error('Meal plan not found');
    }
    
    const newMeal: MealSlot = {
      ...meal,
      id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    const updatedMeals = [...mealPlan.meals, newMeal];
    await this.update(userId, mealPlanId, { meals: updatedMeals });
  }

  // Remove meal from plan
  async removeMealFromPlan(
    userId: string, 
    mealPlanId: string, 
    slotId: string
  ): Promise<void> {
    const mealPlan = await this.getById(userId, mealPlanId);
    if (!mealPlan) {
      throw new Error('Meal plan not found');
    }
    
    const updatedMeals = mealPlan.meals.filter(meal => meal.id !== slotId);
    await this.update(userId, mealPlanId, { meals: updatedMeals });
  }

  // Copy meal plan to another week
  async copyMealPlan(
    userId: string, 
    sourcePlanId: string, 
    targetWeekStart: Date
  ): Promise<string> {
    const sourcePlan = await this.getById(userId, sourcePlanId);
    if (!sourcePlan) {
      throw new Error('Source meal plan not found');
    }
    
    // Check if target week already has a plan
    const existingTargetPlan = await this.getByWeek(userId, targetWeekStart);
    if (existingTargetPlan) {
      throw new Error('Target week already has a meal plan');
    }
    
    // Calculate the offset between source and target weeks
    const sourceWeekStart = sourcePlan.weekStart;
    const dayOffset = Math.floor((targetWeekStart.getTime() - sourceWeekStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Copy meals with adjusted dates
    const copiedMeals = sourcePlan.meals.map(meal => ({
      ...meal,
      date: new Date(meal.date.getTime() + dayOffset * 24 * 60 * 60 * 1000)
    }));
    
    return this.createOrUpdateWeekPlan(userId, targetWeekStart, copiedMeals);
  }

  // Get meal plans with specific recipe
  async getPlansWithRecipe(
    userId: string, 
    recipeId: string
  ): Promise<MealPlanEntity[]> {
    const allPlans = await this.getAll(userId);
    return allPlans.filter(plan => 
      plan.meals.some(meal => meal.recipeId === recipeId)
    );
  }

  // Get meal plans by meal type
  async getPlansByMealType(
    userId: string, 
    mealType: string
  ): Promise<MealPlanEntity[]> {
    const allPlans = await this.getAll(userId);
    return allPlans.filter(plan => 
      plan.meals.some(meal => meal.mealType === mealType)
    );
  }

  // Get upcoming meal plans
  async getUpcomingPlans(userId: string, limit = 5): Promise<MealPlanEntity[]> {
    const today = new Date();
    const allPlans = await this.getAll(userId);
    
    return allPlans
      .filter(plan => plan.weekStart >= today)
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
      .slice(0, limit);
  }

  // Get meal plans by date
  async getPlansByDate(userId: string, date: Date): Promise<MealPlanEntity[]> {
    const allPlans = await this.getAll(userId);
    return allPlans.filter(plan => 
      plan.meals.some(meal => {
        const mealDate = new Date(meal.date);
        return mealDate.toDateString() === date.toDateString();
      })
    );
  }

  // Bulk update meal plans
  async bulkUpdate(
    userId: string, 
    mealPlanIds: string[], 
    updates: Partial<MealPlanFormData>
  ): Promise<void> {
    const updatePromises = mealPlanIds.map(id => this.update(userId, id, updates));
    await Promise.all(updatePromises);
  }

  // Bulk delete meal plans
  async bulkDelete(userId: string, mealPlanIds: string[]): Promise<void> {
    const deletePromises = mealPlanIds.map(id => this.delete(userId, id));
    await Promise.all(deletePromises);
  }

  // Get meal slots for a specific week
  async getMealSlotsForWeek(userId: string, weekStart: Date): Promise<MealSlot[]> {
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const mealPlans = await this.getByDateRange(userId, weekStart, weekEnd);
      const slots: MealSlot[] = [];
      
      for (const plan of mealPlans) {
        if (plan.meals) {
          slots.push(...plan.meals);
        }
      }
      
      return slots;
    } catch (error) {
      throw new FirebaseServiceError(
        'Failed to get meal slots for week',
        error,
        'getMealSlotsForWeek',
        'MealPlan'
      );
    }
  }

  // Get favorite recipes for a user
  async getFavoriteRecipes(userId: string): Promise<Recipe[]> {
    try {
      // This would typically come from a user preferences service
      // For now, we'll return recipes that have been cooked frequently
      const allMealPlans = await this.getAll(userId);
      const recipeCounts = new Map<string, { recipe: Recipe; count: number }>();
      
      for (const plan of allMealPlans) {
        if (plan.meals) {
          for (const meal of plan.meals) {
            if (meal.recipe) {
              const existing = recipeCounts.get(meal.recipe.id);
              if (existing) {
                existing.count++;
              } else {
                recipeCounts.set(meal.recipe.id, { recipe: meal.recipe, count: 1 });
              }
            }
          }
        }
      }
      
      // Return recipes sorted by frequency (most cooked first)
      return Array.from(recipeCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // Top 10 favorites
        .map(item => item.recipe);
    } catch (error) {
      throw new FirebaseServiceError(
        'Failed to get favorite recipes',
        error,
        'getFavoriteRecipes',
        'MealPlan'
      );
    }
  }

  // Get user recipes (this would typically come from a recipe service)
  async getUserRecipes(userId: string): Promise<Recipe[]> {
    try {
      // This is a placeholder - in a real implementation, this would call the recipe service
      // For now, we'll return recipes from meal plans
      const allMealPlans = await this.getAll(userId);
      const recipes = new Map<string, Recipe>();
      
      for (const plan of allMealPlans) {
        if (plan.meals) {
          for (const meal of plan.meals) {
            if (meal.recipe) {
              recipes.set(meal.recipe.id, meal.recipe);
            }
          }
        }
      }
      
      return Array.from(recipes.values());
    } catch (error) {
      throw new FirebaseServiceError(
        'Failed to get user recipes',
        error,
        'getUserRecipes',
        'MealPlan'
      );
    }
  }

  // Meal template methods
  async createMealTemplate(userId: string, templateData: any): Promise<any> {
    try {
      const templateRef = collection(db, 'users', userId, 'mealTemplates');
      const docRef = await addDoc(templateRef, {
        ...templateData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { id: docRef.id, ...templateData };
    } catch (error) {
      throw new FirebaseServiceError(
        'Failed to create meal template',
        error,
        'createMealTemplate',
        'MealTemplate'
      );
    }
  }

  async updateMealTemplate(userId: string, templateId: string, updates: any): Promise<void> {
    try {
      const templateRef = doc(db, 'users', userId, 'mealTemplates', templateId);
      await updateDoc(templateRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      throw new FirebaseServiceError(
        'Failed to update meal template',
        error,
        'updateMealTemplate',
        'MealTemplate'
      );
    }
  }

  async deleteMealTemplate(userId: string, templateId: string): Promise<void> {
    try {
      const templateRef = doc(db, 'users', userId, 'mealTemplates', templateId);
      await deleteDoc(templateRef);
    } catch (error) {
      throw new FirebaseServiceError(
        'Failed to delete meal template',
        error,
        'deleteMealTemplate',
        'MealTemplate'
      );
    }
  }

  async getMealTemplates(userId: string): Promise<any[]> {
    try {
      const templateRef = collection(db, 'users', userId, 'mealTemplates');
      const querySnapshot = await getDocs(templateRef);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw new FirebaseServiceError(
        'Failed to get meal templates',
        error,
        'getMealTemplates',
        'MealTemplate'
      );
    }
  }
}

// Export singleton instance
export const mealPlanService = new MealPlanService();
