import { renderHook, act } from '@testing-library/react'
import { useMealPlan } from '../useMealPlan'
import { mockAuthContextValue, mockMealPlan } from '@/utils/test-utils'
import { AuthContext } from '@/contexts/AuthContext'
import {
  createMealPlan,
  getUserMealPlans,
  updateMealPlan as updateFirestoreMealPlan,
  deleteMealPlan as deleteFirestoreMealPlan,
  subscribeToUserMealPlans,
} from '@/lib/firebase/firestore'

// Mock Firebase functions
jest.mock('@/lib/firebase/firestore')
jest.mock('@/contexts/AuthContext', () => ({
  AuthContext: {
    Provider: ({ children, value }: any) => children,
  },
  useAuth: () => mockAuthContextValue,
}))

const mockCreateMealPlan = createMealPlan as jest.MockedFunction<typeof createMealPlan>
const mockGetUserMealPlans = getUserMealPlans as jest.MockedFunction<typeof getUserMealPlans>
const mockUpdateFirestoreMealPlan = updateFirestoreMealPlan as jest.MockedFunction<typeof updateFirestoreMealPlan>
const mockDeleteFirestoreMealPlan = deleteFirestoreMealPlan as jest.MockedFunction<typeof deleteFirestoreMealPlan>
const mockSubscribeToUserMealPlans = subscribeToUserMealPlans as jest.MockedFunction<typeof subscribeToUserMealPlans>

describe('useMealPlan', () => {
  const mockUnsubscribe = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockSubscribeToUserMealPlans.mockReturnValue(mockUnsubscribe)
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={mockAuthContextValue}>
      {children}
    </AuthContext.Provider>
  )

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useMealPlan(), { wrapper })

      expect(result.current.mealPlans).toEqual([])
      expect(result.current.currentWeekPlan).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should set up real-time subscription when user is available', () => {
      renderHook(() => useMealPlan(), { wrapper })

      expect(mockSubscribeToUserMealPlans).toHaveBeenCalledWith(
        mockAuthContextValue.user.uid,
        expect.any(Function),
        expect.any(Function)
      )
    })
  })

  describe('Real-time Subscription', () => {
    it('should update meal plans when subscription callback is called', () => {
      const { result } = renderHook(() => useMealPlan(), { wrapper })

      // Simulate subscription callback
      const subscriptionCallback = mockSubscribeToUserMealPlans.mock.calls[0][1]
      const mockMealPlans = [mockMealPlan]

      act(() => {
        subscriptionCallback(mockMealPlans)
      })

      expect(result.current.mealPlans).toEqual(mockMealPlans)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle subscription error', () => {
      const { result } = renderHook(() => useMealPlan(), { wrapper })

      // Simulate subscription error
      const errorCallback = mockSubscribeToUserMealPlans.mock.calls[0][2]
      const error = new Error('Failed to load meal plans')

      act(() => {
        errorCallback(error)
      })

      expect(result.current.error).toBe('Failed to load meal plans: Failed to load meal plans')
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Current Week Plan', () => {
    it('should find current week plan', () => {
      const { result } = renderHook(() => useMealPlan(), { wrapper })

      // Create a meal plan for current week (Sunday start)
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday is day 0
      startOfWeek.setHours(0, 0, 0, 0)

      const currentWeekMealPlan = {
        ...mockMealPlan,
        weekStart: startOfWeek,
        weekEnd: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000),
      }

      // Simulate subscription callback with current week plan
      const subscriptionCallback = mockSubscribeToUserMealPlans.mock.calls[0][1]
      act(() => {
        subscriptionCallback([currentWeekMealPlan])
      })

      expect(result.current.currentWeekPlan).toEqual(currentWeekMealPlan)
    })

    it('should return null when no current week plan exists', () => {
      const { result } = renderHook(() => useMealPlan(), { wrapper })

      // Create a meal plan for a different week
      const differentWeekMealPlan = {
        ...mockMealPlan,
        weekStart: new Date('2023-01-01'),
        weekEnd: new Date('2023-01-07'),
      }

      // Simulate subscription callback with different week plan
      const subscriptionCallback = mockSubscribeToUserMealPlans.mock.calls[0][1]
      act(() => {
        subscriptionCallback([differentWeekMealPlan])
      })

      expect(result.current.currentWeekPlan).toBeNull()
    })
  })

  describe('CRUD Operations', () => {
    describe('createMealPlan', () => {
      it('should create meal plan successfully', async () => {
        mockCreateMealPlan.mockResolvedValue('new-meal-plan-id')
        const { result } = renderHook(() => useMealPlan(), { wrapper })

        const mealPlanData = {
          weekStart: new Date('2023-01-01'),
          weekEnd: new Date('2023-01-07'),
          meals: [],
        }

        await act(async () => {
          await result.current.createMealPlan(mealPlanData)
        })

        expect(mockCreateMealPlan).toHaveBeenCalledWith(
          mockAuthContextValue.user.uid,
          mealPlanData
        )
      })

      it('should handle create meal plan error', async () => {
        const error = new Error('Failed to create meal plan')
        mockCreateMealPlan.mockRejectedValue(error)
        const { result } = renderHook(() => useMealPlan(), { wrapper })

        const mealPlanData = {
          weekStart: new Date('2023-01-01'),
          weekEnd: new Date('2023-01-07'),
          meals: [],
        }

        await act(async () => {
          await expect(result.current.createMealPlan(mealPlanData)).rejects.toThrow('Failed to create meal plan')
        })
      })
    })

    describe('updateMealPlan', () => {
      it('should update meal plan successfully', async () => {
        mockUpdateFirestoreMealPlan.mockResolvedValue()
        const { result } = renderHook(() => useMealPlan(), { wrapper })

        const updateData = {
          weekStart: new Date('2023-01-02'),
          weekEnd: new Date('2023-01-08'),
        }

        await act(async () => {
          await result.current.updateMealPlan('meal-plan-id', updateData)
        })

        expect(mockUpdateFirestoreMealPlan).toHaveBeenCalledWith('meal-plan-id', updateData)
      })

      it('should handle update meal plan error', async () => {
        const error = new Error('Failed to update meal plan')
        mockUpdateFirestoreMealPlan.mockRejectedValue(error)
        const { result } = renderHook(() => useMealPlan(), { wrapper })

        const updateData = {
          weekStart: new Date('2023-01-02'),
          weekEnd: new Date('2023-01-08'),
        }

        await act(async () => {
          await expect(result.current.updateMealPlan('meal-plan-id', updateData)).rejects.toThrow('Failed to update meal plan')
        })
      })
    })

    describe('deleteMealPlan', () => {
      it('should delete meal plan successfully', async () => {
        mockDeleteFirestoreMealPlan.mockResolvedValue()
        const { result } = renderHook(() => useMealPlan(), { wrapper })

        await act(async () => {
          await result.current.deleteMealPlan('meal-plan-id')
        })

        expect(mockDeleteFirestoreMealPlan).toHaveBeenCalledWith('meal-plan-id')
      })

      it('should handle delete meal plan error', async () => {
        const error = new Error('Failed to delete meal plan')
        mockDeleteFirestoreMealPlan.mockRejectedValue(error)
        const { result } = renderHook(() => useMealPlan(), { wrapper })

        await act(async () => {
          await expect(result.current.deleteMealPlan('meal-plan-id')).rejects.toThrow('Failed to delete meal plan')
        })
      })
    })
  })

  describe('Meal Operations', () => {
    describe('addMealToPlan', () => {
      it('should add meal to plan successfully', async () => {
        mockUpdateFirestoreMealPlan.mockResolvedValue()
        const { result } = renderHook(() => useMealPlan(), { wrapper })

        const meal = {
          id: 'meal-1',
          date: new Date('2023-01-01'),
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeTitle: 'Test Recipe',
          servings: 2,
          notes: 'Test meal',
        }

        await act(async () => {
          await result.current.addMealToPlan('meal-plan-id', meal)
        })

        expect(mockUpdateFirestoreMealPlan).toHaveBeenCalledWith('meal-plan-id', {
          meals: expect.arrayContaining([meal]),
        })
      })
    })

    describe('removeMealFromPlan', () => {
      it('should remove meal from plan successfully', async () => {
        mockUpdateFirestoreMealPlan.mockResolvedValue()
        const { result } = renderHook(() => useMealPlan(), { wrapper })

        await act(async () => {
          await result.current.removeMealFromPlan('meal-plan-id', 'meal-1')
        })

        expect(mockUpdateFirestoreMealPlan).toHaveBeenCalledWith('meal-plan-id', {
          meals: expect.not.arrayContaining([expect.objectContaining({ id: 'meal-1' })]),
        })
      })
    })

    describe('updateMealInPlan', () => {
      it('should update meal in plan successfully', async () => {
        mockUpdateFirestoreMealPlan.mockResolvedValue()
        const { result } = renderHook(() => useMealPlan(), { wrapper })

        const updatedMeal = {
          id: 'meal-1',
          date: new Date('2023-01-01'),
          mealType: 'lunch',
          recipeId: 'recipe-1',
          recipeTitle: 'Updated Recipe',
          servings: 4,
          notes: 'Updated meal',
        }

        await act(async () => {
          await result.current.updateMealInPlan('meal-plan-id', 'meal-1', updatedMeal)
        })

        expect(mockUpdateFirestoreMealPlan).toHaveBeenCalledWith('meal-plan-id', {
          meals: expect.arrayContaining([updatedMeal]),
        })
      })
    })
  })

  describe('Utility Functions', () => {
    describe('getWeeklySummary', () => {
      it('should return weekly summary', () => {
        const { result } = renderHook(() => useMealPlan(), { wrapper })

        const summary = result.current.getWeeklySummary()

        expect(summary).toEqual({
          totalMeals: 0,
          mealsByDay: {},
          totalRecipes: 0,
          uniqueRecipes: [],
          estimatedCost: 0,
          nutritionSummary: {
            totalCalories: 0,
            totalProtein: 0,
            totalCarbs: 0,
            totalFat: 0,
          },
        })
      })
    })

    describe('loadMealPlans', () => {
      it('should load meal plans successfully', async () => {
        const mockMealPlans = [mockMealPlan]
        mockGetUserMealPlans.mockResolvedValue(mockMealPlans)
        const { result } = renderHook(() => useMealPlan(), { wrapper })

        await act(async () => {
          await result.current.loadMealPlans()
        })

        expect(mockGetUserMealPlans).toHaveBeenCalledWith(mockAuthContextValue.user.uid)
      })
    })

    describe('refreshMealPlans', () => {
      it('should refresh meal plans', () => {
        const { result } = renderHook(() => useMealPlan(), { wrapper })

        act(() => {
          result.current.refreshMealPlans()
        })

        // This function should trigger a re-subscription
        expect(mockSubscribeToUserMealPlans).toHaveBeenCalled()
      })
    })
  })

  describe('Cleanup', () => {
    it('should cleanup subscription on unmount', () => {
      const { unmount } = renderHook(() => useMealPlan(), { wrapper })

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})
