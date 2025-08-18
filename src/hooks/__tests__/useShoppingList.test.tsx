import { renderHook, act } from '@testing-library/react'
import { useShoppingList } from '../useShoppingList'
import { mockAuthContextValue, mockShoppingList } from '@/utils/test-utils'
import { AuthContext } from '@/contexts/AuthContext'
import {
  createShoppingList,
  getUserShoppingLists,
  updateShoppingList as updateFirestoreShoppingList,
  deleteShoppingList as deleteFirestoreShoppingList,
  subscribeToUserShoppingLists,
  generateShoppingListFromMealPlan,
} from '@/lib/firebase/firestore'

// Mock Firebase functions
jest.mock('@/lib/firebase/firestore')
jest.mock('@/contexts/AuthContext', () => ({
  AuthContext: {
    Provider: ({ children, value }: any) => children,
  },
  useAuth: () => mockAuthContextValue,
}))

const mockCreateShoppingList = createShoppingList as jest.MockedFunction<typeof createShoppingList>
const mockGetUserShoppingLists = getUserShoppingLists as jest.MockedFunction<typeof getUserShoppingLists>
const mockUpdateFirestoreShoppingList = updateFirestoreShoppingList as jest.MockedFunction<typeof updateFirestoreShoppingList>
const mockDeleteFirestoreShoppingList = deleteFirestoreShoppingList as jest.MockedFunction<typeof deleteFirestoreShoppingList>
const mockSubscribeToUserShoppingLists = subscribeToUserShoppingLists as jest.MockedFunction<typeof subscribeToUserShoppingLists>
const mockGenerateShoppingListFromMealPlan = generateShoppingListFromMealPlan as jest.MockedFunction<typeof generateShoppingListFromMealPlan>

describe('useShoppingList', () => {
  const mockUnsubscribe = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockSubscribeToUserShoppingLists.mockReturnValue(mockUnsubscribe)
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={mockAuthContextValue}>
      {children}
    </AuthContext.Provider>
  )

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useShoppingList(), { wrapper })

      expect(result.current.shoppingLists).toEqual([])
      expect(result.current.filteredShoppingLists).toEqual([])
      expect(result.current.currentList).toBeNull()
      expect(result.current.filters).toEqual({
        search: '',
        category: '',
        isPurchased: 'all',
      })
      expect(result.current.sortOptions).toEqual({
        field: 'name',
        direction: 'asc',
      })
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should set up real-time subscription when user is available', () => {
      renderHook(() => useShoppingList(), { wrapper })

      expect(mockSubscribeToUserShoppingLists).toHaveBeenCalledWith(
        mockAuthContextValue.user.uid,
        expect.any(Function),
        expect.any(Function)
      )
    })
  })

  describe('Real-time Subscription', () => {
    it('should update shopping lists when subscription callback is called', () => {
      const { result } = renderHook(() => useShoppingList(), { wrapper })

      // Simulate subscription callback
      const subscriptionCallback = mockSubscribeToUserShoppingLists.mock.calls[0][1]
      const mockShoppingLists = [mockShoppingList]

      act(() => {
        subscriptionCallback(mockShoppingLists)
      })

      expect(result.current.shoppingLists).toEqual(mockShoppingLists)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle subscription error', () => {
      const { result } = renderHook(() => useShoppingList(), { wrapper })

      // Simulate subscription error
      const errorCallback = mockSubscribeToUserShoppingLists.mock.calls[0][2]
      const error = new Error('Failed to load shopping lists')

      act(() => {
        errorCallback(error)
      })

      expect(result.current.error).toBe('Failed to load shopping lists: Failed to load shopping lists')
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('CRUD Operations', () => {
    describe('addShoppingList', () => {
      it('should create shopping list successfully', async () => {
        mockCreateShoppingList.mockResolvedValue('new-shopping-list-id')
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        const shoppingListData = {
          name: 'Test Shopping List',
          items: [],
        }

        await act(async () => {
          await result.current.addShoppingList(shoppingListData)
        })

        expect(mockCreateShoppingList).toHaveBeenCalledWith(
          mockAuthContextValue.user.uid,
          shoppingListData
        )
      })

      it('should handle create shopping list error', async () => {
        const error = new Error('Failed to create shopping list')
        mockCreateShoppingList.mockRejectedValue(error)
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        const shoppingListData = {
          name: 'Test Shopping List',
          items: [],
        }

        await act(async () => {
          await expect(result.current.addShoppingList(shoppingListData)).rejects.toThrow('Failed to create shopping list')
        })
      })
    })

    describe('updateShoppingList', () => {
      it('should update shopping list successfully', async () => {
        mockUpdateFirestoreShoppingList.mockResolvedValue()
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        const updateData = {
          name: 'Updated Shopping List',
        }

        await act(async () => {
          await result.current.updateShoppingList('shopping-list-id', updateData)
        })

        expect(mockUpdateFirestoreShoppingList).toHaveBeenCalledWith('shopping-list-id', updateData)
      })

      it('should handle update shopping list error', async () => {
        const error = new Error('Failed to update shopping list')
        mockUpdateFirestoreShoppingList.mockRejectedValue(error)
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        const updateData = {
          name: 'Updated Shopping List',
        }

        await act(async () => {
          await expect(result.current.updateShoppingList('shopping-list-id', updateData)).rejects.toThrow('Failed to update shopping list')
        })
      })
    })

    describe('deleteShoppingList', () => {
      it('should delete shopping list successfully', async () => {
        mockDeleteFirestoreShoppingList.mockResolvedValue()
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        await act(async () => {
          await result.current.deleteShoppingList('shopping-list-id')
        })

        expect(mockDeleteFirestoreShoppingList).toHaveBeenCalledWith('shopping-list-id')
      })

      it('should handle delete shopping list error', async () => {
        const error = new Error('Failed to delete shopping list')
        mockDeleteFirestoreShoppingList.mockRejectedValue(error)
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        await act(async () => {
          await expect(result.current.deleteShoppingList('shopping-list-id')).rejects.toThrow('Failed to delete shopping list')
        })
      })
    })
  })

  describe('Item Operations', () => {
    describe('addItemToList', () => {
      it('should add item to list successfully', async () => {
        mockUpdateFirestoreShoppingList.mockResolvedValue()
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        const item = {
          id: 'item-1',
          name: 'Test Item',
          category: 'Vegetables',
          totalAmount: 2,
          unit: 'pieces',
          estimatedCost: 5.99,
          isPurchased: false,
          notes: 'Test item',
          sources: [],
        }

        await act(async () => {
          await result.current.addItemToList('shopping-list-id', item)
        })

        expect(mockUpdateFirestoreShoppingList).toHaveBeenCalledWith('shopping-list-id', {
          items: expect.arrayContaining([item]),
        })
      })
    })

    describe('removeItemFromList', () => {
      it('should remove item from list successfully', async () => {
        mockUpdateFirestoreShoppingList.mockResolvedValue()
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        await act(async () => {
          await result.current.removeItemFromList('shopping-list-id', 'item-1')
        })

        expect(mockUpdateFirestoreShoppingList).toHaveBeenCalledWith('shopping-list-id', {
          items: expect.not.arrayContaining([expect.objectContaining({ id: 'item-1' })]),
        })
      })
    })

    describe('updateItemInList', () => {
      it('should update item in list successfully', async () => {
        mockUpdateFirestoreShoppingList.mockResolvedValue()
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        const updatedItem = {
          name: 'Updated Item',
          totalAmount: 3,
        }

        await act(async () => {
          await result.current.updateItemInList('shopping-list-id', 'item-1', updatedItem)
        })

        expect(mockUpdateFirestoreShoppingList).toHaveBeenCalledWith('shopping-list-id', {
          items: expect.arrayContaining([expect.objectContaining(updatedItem)]),
        })
      })
    })

    describe('toggleItemPurchased', () => {
      it('should toggle item purchased status successfully', async () => {
        mockUpdateFirestoreShoppingList.mockResolvedValue()
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        await act(async () => {
          await result.current.toggleItemPurchased('shopping-list-id', 'item-1')
        })

        expect(mockUpdateFirestoreShoppingList).toHaveBeenCalledWith('shopping-list-id', {
          items: expect.arrayContaining([expect.objectContaining({ isPurchased: true })]),
        })
      })
    })

    describe('updateItemQuantity', () => {
      it('should update item quantity successfully', async () => {
        mockUpdateFirestoreShoppingList.mockResolvedValue()
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        await act(async () => {
          await result.current.updateItemQuantity('shopping-list-id', 'item-1', 5)
        })

        expect(mockUpdateFirestoreShoppingList).toHaveBeenCalledWith('shopping-list-id', {
          items: expect.arrayContaining([expect.objectContaining({ totalAmount: 5 })]),
        })
      })
    })

    describe('updateItemPrice', () => {
      it('should update item price successfully', async () => {
        mockUpdateFirestoreShoppingList.mockResolvedValue()
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        await act(async () => {
          await result.current.updateItemPrice('shopping-list-id', 'item-1', 10.99)
        })

        expect(mockUpdateFirestoreShoppingList).toHaveBeenCalledWith('shopping-list-id', {
          items: expect.arrayContaining([expect.objectContaining({ estimatedCost: 10.99 })]),
        })
      })
    })
  })

  describe('Filtering and Sorting', () => {
    describe('setFilters', () => {
      it('should update filters', () => {
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        act(() => {
          result.current.setFilters({ search: 'test', category: 'Vegetables' })
        })

        expect(result.current.filters).toEqual({
          search: 'test',
          category: 'Vegetables',
          isPurchased: 'all',
        })
      })
    })

    describe('setSortOptions', () => {
      it('should update sort options', () => {
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        act(() => {
          result.current.setSortOptions({ field: 'estimatedCost', direction: 'desc' })
        })

        expect(result.current.sortOptions).toEqual({
          field: 'estimatedCost',
          direction: 'desc',
        })
      })
    })

    describe('clearFilters', () => {
      it('should clear all filters', () => {
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        // Set some filters first
        act(() => {
          result.current.setFilters({ search: 'test', category: 'Vegetables' })
        })

        // Clear filters
        act(() => {
          result.current.clearFilters()
        })

        expect(result.current.filters).toEqual({
          search: '',
          category: '',
          isPurchased: 'all',
        })
      })
    })
  })

  describe('Utility Functions', () => {
    describe('getItemsByCategory', () => {
      it('should return items grouped by category', () => {
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        const itemsByCategory = result.current.getItemsByCategory('shopping-list-id')

        expect(itemsByCategory).toEqual({})
      })
    })

    describe('getTotalCost', () => {
      it('should return total cost of shopping list', () => {
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        const totalCost = result.current.getTotalCost('shopping-list-id')

        expect(totalCost).toBe(0)
      })
    })

    describe('getPurchasedCount', () => {
      it('should return purchased count', () => {
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        const purchasedCount = result.current.getPurchasedCount('shopping-list-id')

        expect(purchasedCount).toEqual({ purchased: 0, total: 0 })
      })
    })

    describe('generateFromMealPlan', () => {
      it('should generate shopping list from meal plan successfully', async () => {
        mockGenerateShoppingListFromMealPlan.mockResolvedValue()
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        const mealPlan = {
          id: 'meal-plan-id',
          userId: 'user-id',
          weekStart: new Date('2023-01-01'),
          weekEnd: new Date('2023-01-07'),
          meals: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const ingredients = []

        await act(async () => {
          await result.current.generateFromMealPlan(mealPlan, ingredients)
        })

        expect(mockGenerateShoppingListFromMealPlan).toHaveBeenCalledWith(
          mockAuthContextValue.user.uid,
          mealPlan,
          ingredients
        )
      })

      it('should handle generate from meal plan error', async () => {
        const error = new Error('Failed to generate shopping list')
        mockGenerateShoppingListFromMealPlan.mockRejectedValue(error)
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        const mealPlan = {
          id: 'meal-plan-id',
          userId: 'user-id',
          weekStart: new Date('2023-01-01'),
          weekEnd: new Date('2023-01-07'),
          meals: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const ingredients = []

        await act(async () => {
          await expect(result.current.generateFromMealPlan(mealPlan, ingredients)).rejects.toThrow('Failed to generate shopping list')
        })
      })
    })

    describe('loadShoppingLists', () => {
      it('should load shopping lists successfully', async () => {
        const mockShoppingLists = [mockShoppingList]
        mockGetUserShoppingLists.mockResolvedValue(mockShoppingLists)
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        await act(async () => {
          await result.current.loadShoppingLists()
        })

        expect(mockGetUserShoppingLists).toHaveBeenCalledWith(mockAuthContextValue.user.uid)
      })
    })

    describe('refreshShoppingLists', () => {
      it('should refresh shopping lists', () => {
        const { result } = renderHook(() => useShoppingList(), { wrapper })

        act(() => {
          result.current.refreshShoppingLists()
        })

        // This function should trigger a re-subscription
        expect(mockSubscribeToUserShoppingLists).toHaveBeenCalled()
      })
    })
  })

  describe('Cleanup', () => {
    it('should cleanup subscription on unmount', () => {
      const { unmount } = renderHook(() => useShoppingList(), { wrapper })

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})
