import {
  createIngredient,
  getUserIngredients,
  getIngredient,
  updateIngredient,
  deleteIngredient,
  subscribeToUserIngredients,
  getExpiringIngredients,
  getIngredientsByLocation,
  createRecipe,
  getUserRecipes,
  getRecipe,
  updateRecipe,
  deleteRecipe,
  subscribeToUserRecipes,
  getRecipesByIngredient,
  getRecipesByCategory,
  searchRecipes,
  createMealPlan,
  getUserMealPlans,
  getMealPlan,
  updateMealPlan,
  deleteMealPlan,
  subscribeToUserMealPlans,
  getMealPlanByWeek,
  getMealPlansByDateRange,
  createShoppingList,
  getUserShoppingLists,
  getShoppingList,
  updateShoppingList,
  deleteShoppingList,
  subscribeToUserShoppingLists,
  generateShoppingListFromMealPlan,
  createUserProfile,
  COLLECTIONS,
} from '../firestore'
import {
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  collection,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { mockIngredient, mockRecipe, mockMealPlan, mockShoppingList } from '@/utils/test-utils'

// Mock Firebase Firestore
jest.mock('firebase/firestore')
jest.mock('../config', () => ({
  db: {},
}))

const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>
const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>
const mockQuery = query as jest.MockedFunction<typeof query>
const mockWhere = where as jest.MockedFunction<typeof where>
const mockOrderBy = orderBy as jest.MockedFunction<typeof orderBy>
const mockLimit = limit as jest.MockedFunction<typeof limit>
const mockOnSnapshot = onSnapshot as jest.MockedFunction<typeof onSnapshot>
const mockDoc = doc as jest.MockedFunction<typeof doc>
const mockCollection = collection as jest.MockedFunction<typeof collection>
const mockServerTimestamp = serverTimestamp as jest.MockedFunction<typeof serverTimestamp>
const mockTimestamp = Timestamp as jest.MockedFunction<typeof Timestamp>

describe('Firestore Functions', () => {
  const userId = 'test-user-id'
  const ingredientId = 'test-ingredient-id'
  const recipeId = 'test-recipe-id'
  const mealPlanId = 'test-meal-plan-id'
  const shoppingListId = 'test-shopping-list-id'

  beforeEach(() => {
    jest.clearAllMocks()
    mockServerTimestamp.mockReturnValue({ seconds: Date.now() / 1000, nanoseconds: 0 })
    mockTimestamp.fromDate = jest.fn((date) => ({ 
      seconds: date.getTime() / 1000, 
      nanoseconds: 0,
      toDate: jest.fn(() => date)
    }))
    mockTimestamp.toDate = jest.fn((timestamp) => new Date(timestamp.seconds * 1000))
  })

  describe('Ingredient Functions', () => {
    describe('createIngredient', () => {
      it('should create an ingredient successfully', async () => {
        const ingredientData = {
          name: 'Test Ingredient',
          quantity: 1,
          unit: 'piece',
          location: 'fridge',
          category: 'Vegetables',
        }

        mockAddDoc.mockResolvedValue({ id: ingredientId })

        const result = await createIngredient(userId, ingredientData)

        expect(result).toBe(ingredientId)
        expect(mockAddDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            name: ingredientData.name,
            quantity: ingredientData.quantity,
            unit: ingredientData.unit,
            location: ingredientData.location,
            category: ingredientData.category,
          })
        )
      })

      it('should throw error when creation fails', async () => {
        const ingredientData = {
          name: 'Test Ingredient',
          quantity: 1,
          unit: 'piece',
          location: 'fridge',
          category: 'Vegetables',
        }

        const error = new Error('Firestore error')
        mockAddDoc.mockRejectedValue(error)

        await expect(createIngredient(userId, ingredientData)).rejects.toThrow('Firestore error')
      })
    })

    describe('getUserIngredients', () => {
      it('should get user ingredients successfully', async () => {
                 const mockQuerySnapshot = {
           docs: [
             {
               id: ingredientId,
               data: () => ({
                 name: 'Test Ingredient',
                 quantity: 1,
                 unit: 'piece',
                 dateBought: { 
                   seconds: Date.now() / 1000, 
                   nanoseconds: 0,
                   toDate: jest.fn(() => new Date())
                 },
                 expirationDate: { 
                   seconds: Date.now() / 1000, 
                   nanoseconds: 0,
                   toDate: jest.fn(() => new Date())
                 },
                 location: 'fridge',
                 category: 'Vegetables',
                 tags: [],
                 notes: null,
                 createdAt: { 
                   seconds: Date.now() / 1000, 
                   nanoseconds: 0,
                   toDate: jest.fn(() => new Date())
                 },
                 updatedAt: { 
                   seconds: Date.now() / 1000, 
                   nanoseconds: 0,
                   toDate: jest.fn(() => new Date())
                 },
               }),
             },
           ],
         }

        mockQuery.mockReturnValue({} as any)
        mockOrderBy.mockReturnValue({} as any)
        mockGetDocs.mockResolvedValue(mockQuerySnapshot as any)

        const result = await getUserIngredients(userId)

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(ingredientId)
        expect(result[0].name).toBe('Test Ingredient')
      })

      it('should throw error when getting ingredients fails', async () => {
        const error = new Error('Firestore error')
        mockQuery.mockReturnValue({} as any)
        mockOrderBy.mockReturnValue({} as any)
        mockGetDocs.mockRejectedValue(error)

        await expect(getUserIngredients(userId)).rejects.toThrow('Firestore error')
      })
    })

    describe('getIngredient', () => {
      it('should get a single ingredient successfully', async () => {
                 const mockDocSnapshot = {
           exists: () => true,
           id: ingredientId,
           data: () => ({
             name: 'Test Ingredient',
             quantity: 1,
             unit: 'piece',
             dateBought: { 
               seconds: Date.now() / 1000, 
               nanoseconds: 0,
               toDate: jest.fn(() => new Date())
             },
             expirationDate: { 
               seconds: Date.now() / 1000, 
               nanoseconds: 0,
               toDate: jest.fn(() => new Date())
             },
             location: 'fridge',
             category: 'Vegetables',
             tags: [],
             notes: null,
             createdAt: { 
               seconds: Date.now() / 1000, 
               nanoseconds: 0,
               toDate: jest.fn(() => new Date())
             },
             updatedAt: { 
               seconds: Date.now() / 1000, 
               nanoseconds: 0,
               toDate: jest.fn(() => new Date())
             },
           }),
         }

        mockDoc.mockReturnValue({} as any)
        mockGetDoc.mockResolvedValue(mockDocSnapshot as any)

        const result = await getIngredient(userId, ingredientId)

        expect(result).not.toBeNull()
        expect(result?.id).toBe(ingredientId)
        expect(result?.name).toBe('Test Ingredient')
      })

      it('should return null when ingredient does not exist', async () => {
        const mockDocSnapshot = {
          exists: () => false,
        }

        mockDoc.mockReturnValue({} as any)
        mockGetDoc.mockResolvedValue(mockDocSnapshot as any)

        const result = await getIngredient(userId, ingredientId)

        expect(result).toBeNull()
      })
    })

    describe('updateIngredient', () => {
      it('should update an ingredient successfully', async () => {
        const updates = {
          name: 'Updated Ingredient',
          quantity: 2,
        }

        mockDoc.mockReturnValue({} as any)
        mockUpdateDoc.mockResolvedValue(undefined)

        await updateIngredient(userId, ingredientId, updates)

        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            name: updates.name,
            quantity: updates.quantity,
            updatedAt: expect.anything(),
          })
        )
      })
    })

    describe('deleteIngredient', () => {
      it('should delete an ingredient successfully', async () => {
        mockDoc.mockReturnValue({} as any)
        mockDeleteDoc.mockResolvedValue(undefined)

        await deleteIngredient(userId, ingredientId)

        expect(mockDeleteDoc).toHaveBeenCalledWith(expect.anything())
      })
    })

    describe('subscribeToUserIngredients', () => {
      it('should set up real-time listener', () => {
        const callback = jest.fn()
        const onError = jest.fn()
        const unsubscribe = jest.fn()

        mockQuery.mockReturnValue({} as any)
        mockOrderBy.mockReturnValue({} as any)
        mockOnSnapshot.mockReturnValue(unsubscribe)

        const result = subscribeToUserIngredients(userId, callback, onError)

        expect(mockOnSnapshot).toHaveBeenCalledWith(
          expect.anything(),
          expect.any(Function),
          expect.any(Function)
        )
        expect(result).toBe(unsubscribe)
      })
    })

    describe('getExpiringIngredients', () => {
      it('should get expiring ingredients successfully', async () => {
        const mockQuerySnapshot = {
          docs: [
            {
              id: ingredientId,
              data: () => ({
                name: 'Expiring Ingredient',
                expirationDate: { seconds: Date.now() / 1000, nanoseconds: 0 },
              }),
            },
          ],
        }

        mockQuery.mockReturnValue({} as any)
        mockWhere.mockReturnValue({} as any)
        mockOrderBy.mockReturnValue({} as any)
        mockGetDocs.mockResolvedValue(mockQuerySnapshot as any)

        const result = await getExpiringIngredients(userId, 3)

        expect(result).toHaveLength(1)
        expect(result[0].name).toBe('Expiring Ingredient')
      })
    })

    describe('getIngredientsByLocation', () => {
      it('should get ingredients by location successfully', async () => {
        const mockQuerySnapshot = {
          docs: [
            {
              id: ingredientId,
              data: () => ({
                name: 'Fridge Ingredient',
                location: 'fridge',
              }),
            },
          ],
        }

        mockQuery.mockReturnValue({} as any)
        mockWhere.mockReturnValue({} as any)
        mockOrderBy.mockReturnValue({} as any)
        mockGetDocs.mockResolvedValue(mockQuerySnapshot as any)

        const result = await getIngredientsByLocation(userId, 'fridge')

        expect(result).toHaveLength(1)
        expect(result[0].location).toBe('fridge')
      })
    })
  })

  describe('Recipe Functions', () => {
    describe('createRecipe', () => {
      it('should create a recipe successfully', async () => {
        const recipeData = {
          title: 'Test Recipe',
          description: 'A test recipe',
          prepTime: 15,
          cookTime: 30,
          servingsCount: 4,
          ingredients: [],
          instructions: [],
        }

        mockAddDoc.mockResolvedValue({ id: recipeId })

        const result = await createRecipe(userId, recipeData)

        expect(result).toBe(recipeId)
        expect(mockAddDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            title: recipeData.title,
            description: recipeData.description,
          })
        )
      })
    })

    describe('getUserRecipes', () => {
      it('should get user recipes successfully', async () => {
        const mockQuerySnapshot = {
          docs: [
            {
              id: recipeId,
              data: () => ({
                title: 'Test Recipe',
                description: 'A test recipe',
                metadata: {
                  createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                  updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                },
              }),
            },
          ],
        }

        mockQuery.mockReturnValue({} as any)
        mockOrderBy.mockReturnValue({} as any)
        mockGetDocs.mockResolvedValue(mockQuerySnapshot as any)

        const result = await getUserRecipes(userId)

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(recipeId)
        expect(result[0].title).toBe('Test Recipe')
      })
    })

    describe('searchRecipes', () => {
      it('should search recipes successfully', async () => {
        const mockRecipes = [
          {
            id: recipeId,
            title: 'Pasta Recipe',
            description: 'Delicious pasta',
            ingredients: [{ name: 'pasta' }],
            tags: ['italian'],
          },
        ]

        // Mock getUserRecipes to return test data
        jest.spyOn(require('../firestore'), 'getUserRecipes').mockResolvedValue(mockRecipes)

        const result = await searchRecipes(userId, 'pasta')

        expect(result).toHaveLength(1)
        expect(result[0].title).toBe('Pasta Recipe')
      })
    })
  })

  describe('Meal Plan Functions', () => {
    describe('createMealPlan', () => {
      it('should create a meal plan successfully', async () => {
        const mealPlanData = {
          weekStart: new Date('2023-01-01'),
          meals: [],
        }

        mockAddDoc.mockResolvedValue({ id: mealPlanId })

        const result = await createMealPlan(userId, mealPlanData)

        expect(result).toBe(mealPlanId)
        expect(mockAddDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            weekStart: expect.anything(),
          })
        )
      })
    })

    describe('getUserMealPlans', () => {
      it('should get user meal plans successfully', async () => {
        const mockQuerySnapshot = {
          docs: [
            {
              id: mealPlanId,
              data: () => ({
                weekStart: { seconds: Date.now() / 1000, nanoseconds: 0 },
                weekEnd: { seconds: Date.now() / 1000, nanoseconds: 0 },
                meals: [],
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
              }),
            },
          ],
        }

        mockQuery.mockReturnValue({} as any)
        mockOrderBy.mockReturnValue({} as any)
        mockGetDocs.mockResolvedValue(mockQuerySnapshot as any)

        const result = await getUserMealPlans(userId)

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(mealPlanId)
      })
    })
  })

  describe('Shopping List Functions', () => {
    describe('createShoppingList', () => {
      it('should create a shopping list successfully', async () => {
        const shoppingListData = {
          name: 'Test Shopping List',
          items: [],
        }

        mockAddDoc.mockResolvedValue({ id: shoppingListId })

        const result = await createShoppingList(userId, shoppingListData)

        expect(result).toBe(shoppingListId)
        expect(mockAddDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            name: shoppingListData.name,
          })
        )
      })
    })

    describe('getUserShoppingLists', () => {
      it('should get user shopping lists successfully', async () => {
        const mockQuerySnapshot = {
          docs: [
            {
              id: shoppingListId,
              data: () => ({
                name: 'Test Shopping List',
                items: [],
                totalEstimatedCost: 0,
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                isCompleted: false,
              }),
            },
          ],
        }

        mockQuery.mockReturnValue({} as any)
        mockOrderBy.mockReturnValue({} as any)
        mockGetDocs.mockResolvedValue(mockQuerySnapshot as any)

        const result = await getUserShoppingLists(userId)

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(shoppingListId)
        expect(result[0].name).toBe('Test Shopping List')
      })
    })
  })

  describe('generateShoppingListFromMealPlan', () => {
    it('should generate shopping list from meal plan successfully', async () => {
      const mealPlan = {
        id: mealPlanId,
        weekStart: new Date('2023-01-01'),
        weekEnd: new Date('2023-01-07'),
        meals: [
          {
            id: 'meal-1',
            recipeId: recipeId,
            recipeTitle: 'Test Recipe',
            date: new Date('2023-01-01'),
            mealType: 'dinner',
            servings: 2,
            notes: '',
          },
        ],
      }

      const userIngredients = [
        {
          id: 'existing-ingredient',
          name: 'Existing Ingredient',
          quantity: 1,
          unit: 'piece',
        },
      ]

      // Mock getRecipe to return a recipe with ingredients
      jest.spyOn(require('../firestore'), 'getRecipe').mockResolvedValue({
        id: recipeId,
        title: 'Test Recipe',
        ingredients: [
          {
            name: 'Test Ingredient',
            amount: 2,
            unit: 'pieces',
            category: 'Vegetables',
          },
        ],
        servings: { count: 4 },
      })

      // Mock createShoppingList
      jest.spyOn(require('../firestore'), 'createShoppingList').mockResolvedValue(shoppingListId)

      const result = await generateShoppingListFromMealPlan(userId, mealPlan as any, userIngredients as any)

      expect(result.id).toBe(shoppingListId)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].name).toBe('Test Ingredient')
    })
  })

  describe('createUserProfile', () => {
    it('should create user profile successfully', async () => {
      const userData = {
        displayName: 'Test User',
        email: 'test@example.com',
      }

      mockDoc.mockReturnValue({} as any)
      mockUpdateDoc.mockResolvedValue(undefined)

      await createUserProfile(userId, userData)

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...userData,
          updatedAt: expect.anything(),
        })
      )
    })
  })
})
