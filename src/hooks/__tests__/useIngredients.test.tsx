import { renderHook, act, waitFor } from '@testing-library/react'
import { useIngredients } from '../useIngredients'
import { mockAuthContextValue, mockIngredient } from '@/utils/test-utils'
import { AuthContext } from '@/contexts/AuthContext'
import {
  createIngredient,
  getUserIngredients,
  updateIngredient,
  deleteIngredient,
  subscribeToUserIngredients,
} from '@/lib/firebase/firestore'

// Mock Firebase functions
jest.mock('@/lib/firebase/firestore')
jest.mock('@/contexts/AuthContext', () => ({
  AuthContext: {
    Provider: ({ children, value }: any) => children,
  },
  useAuth: () => mockAuthContextValue,
}))

const mockCreateIngredient = createIngredient as jest.MockedFunction<typeof createIngredient>
const mockGetUserIngredients = getUserIngredients as jest.MockedFunction<typeof getUserIngredients>
const mockUpdateIngredient = updateIngredient as jest.MockedFunction<typeof updateIngredient>
const mockDeleteIngredient = deleteIngredient as jest.MockedFunction<typeof deleteIngredient>
const mockSubscribeToUserIngredients = subscribeToUserIngredients as jest.MockedFunction<typeof subscribeToUserIngredients>

describe('useIngredients', () => {
  const mockUnsubscribe = jest.fn()
  const mockCallback = jest.fn()
  const mockOnError = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockSubscribeToUserIngredients.mockReturnValue(mockUnsubscribe)
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={mockAuthContextValue}>
      {children}
    </AuthContext.Provider>
  )

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useIngredients(), { wrapper })

      expect(result.current.ingredients).toEqual([])
      expect(result.current.filteredIngredients).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.filters).toEqual({
        search: '',
        location: 'all',
        category: '',
        tags: [],
        expirationStatus: 'all',
      })
      expect(result.current.sortOptions).toEqual({
        field: 'name',
        direction: 'asc',
      })
    })

    it('should set up real-time subscription when user is available', () => {
      renderHook(() => useIngredients(), { wrapper })

      expect(mockSubscribeToUserIngredients).toHaveBeenCalledWith(
        mockAuthContextValue.user.uid,
        expect.any(Function),
        expect.any(Function)
      )
    })

    it('should not set up subscription when user is not available', () => {
      const authContextWithoutUser = {
        ...mockAuthContextValue,
        user: null,
      }

      const wrapperWithoutUser = ({ children }: { children: React.ReactNode }) => (
        <AuthContext.Provider value={authContextWithoutUser}>
          {children}
        </AuthContext.Provider>
      )

      renderHook(() => useIngredients(), { wrapper: wrapperWithoutUser })

      expect(mockSubscribeToUserIngredients).not.toHaveBeenCalled()
    })
  })

  describe('Real-time Subscription', () => {
    it('should update ingredients when subscription callback is called', () => {
      const { result } = renderHook(() => useIngredients(), { wrapper })

      // Simulate subscription callback
      const subscriptionCallback = mockSubscribeToUserIngredients.mock.calls[0][1]
      const mockIngredients = [mockIngredient]

      act(() => {
        subscriptionCallback(mockIngredients)
      })

      expect(result.current.ingredients).toEqual(mockIngredients)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle subscription errors', () => {
      const { result } = renderHook(() => useIngredients(), { wrapper })

      // Simulate subscription error
      const subscriptionErrorCallback = mockSubscribeToUserIngredients.mock.calls[0][2]
      const mockError = new Error('Subscription failed')

      act(() => {
        subscriptionErrorCallback(mockError)
      })

      expect(result.current.error).toBe('Failed to load ingredients: Subscription failed')
      expect(result.current.isLoading).toBe(false)
    })

    it('should clean up subscription on unmount', () => {
      const { unmount } = renderHook(() => useIngredients(), { wrapper })

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('CRUD Operations', () => {
    describe('addIngredient', () => {
      it('should add ingredient successfully', async () => {
        const { result } = renderHook(() => useIngredients(), { wrapper })
        const ingredientData = {
          name: 'New Ingredient',
          quantity: 1,
          unit: 'piece',
          location: 'fridge',
          category: 'Vegetables',
        }

        mockCreateIngredient.mockResolvedValue('new-ingredient-id')

        await act(async () => {
          await result.current.addIngredient(ingredientData)
        })

        expect(mockCreateIngredient).toHaveBeenCalledWith(
          mockAuthContextValue.user.uid,
          ingredientData
        )
        expect(result.current.error).toBeNull()
      })

      it('should handle add ingredient error', async () => {
        const { result } = renderHook(() => useIngredients(), { wrapper })
        const ingredientData = {
          name: 'New Ingredient',
          quantity: 1,
          unit: 'piece',
          location: 'fridge',
          category: 'Vegetables',
        }

        const error = new Error('Add failed')
        mockCreateIngredient.mockRejectedValue(error)

        await act(async () => {
          await result.current.addIngredient(ingredientData)
        })

        expect(result.current.error).toBe('Failed to add ingredient: Add failed')
      })

      it('should handle add ingredient when user is not authenticated', async () => {
        const authContextWithoutUser = {
          ...mockAuthContextValue,
          user: null,
        }

        const wrapperWithoutUser = ({ children }: { children: React.ReactNode }) => (
          <AuthContext.Provider value={authContextWithoutUser}>
            {children}
          </AuthContext.Provider>
        )

        const { result } = renderHook(() => useIngredients(), { wrapper: wrapperWithoutUser })
        const ingredientData = {
          name: 'New Ingredient',
          quantity: 1,
          unit: 'piece',
          location: 'fridge',
          category: 'Vegetables',
        }

        await act(async () => {
          await result.current.addIngredient(ingredientData)
        })

        expect(result.current.error).toBe('User not authenticated')
        expect(mockCreateIngredient).not.toHaveBeenCalled()
      })
    })

    describe('updateIngredient', () => {
      it('should update ingredient successfully', async () => {
        const { result } = renderHook(() => useIngredients(), { wrapper })
        const updates = {
          name: 'Updated Ingredient',
          quantity: 2,
        }

        mockUpdateIngredient.mockResolvedValue(undefined)

        await act(async () => {
          await result.current.updateIngredient('test-id', updates)
        })

        expect(mockUpdateIngredient).toHaveBeenCalledWith(
          mockAuthContextValue.user.uid,
          'test-id',
          updates
        )
        expect(result.current.error).toBeNull()
      })

      it('should handle update ingredient error', async () => {
        const { result } = renderHook(() => useIngredients(), { wrapper })
        const updates = {
          name: 'Updated Ingredient',
          quantity: 2,
        }

        const error = new Error('Update failed')
        mockUpdateIngredient.mockRejectedValue(error)

        await act(async () => {
          await result.current.updateIngredient('test-id', updates)
        })

        expect(result.current.error).toBe('Failed to update ingredient: Update failed')
      })
    })

    describe('deleteIngredient', () => {
      it('should delete ingredient successfully', async () => {
        const { result } = renderHook(() => useIngredients(), { wrapper })

        mockDeleteIngredient.mockResolvedValue(undefined)

        await act(async () => {
          await result.current.deleteIngredient('test-id')
        })

        expect(mockDeleteIngredient).toHaveBeenCalledWith(
          mockAuthContextValue.user.uid,
          'test-id'
        )
        expect(result.current.error).toBeNull()
      })

      it('should handle delete ingredient error', async () => {
        const { result } = renderHook(() => useIngredients(), { wrapper })

        const error = new Error('Delete failed')
        mockDeleteIngredient.mockRejectedValue(error)

        await act(async () => {
          await result.current.deleteIngredient('test-id')
        })

        expect(result.current.error).toBe('Failed to delete ingredient: Delete failed')
      })
    })
  })

  describe('Filtering and Sorting', () => {
    it('should filter ingredients by search term', () => {
      const { result } = renderHook(() => useIngredients(), { wrapper })

      // Set up ingredients
      const subscriptionCallback = mockSubscribeToUserIngredients.mock.calls[0][1]
      const mockIngredients = [
        { ...mockIngredient, name: 'Apple' },
        { ...mockIngredient, id: '2', name: 'Banana' },
      ]

      act(() => {
        subscriptionCallback(mockIngredients)
      })

      // Set search filter
      act(() => {
        result.current.setFilters({ search: 'apple' })
      })

      expect(result.current.filteredIngredients).toHaveLength(1)
      expect(result.current.filteredIngredients[0].name).toBe('Apple')
    })

    it('should filter ingredients by location', () => {
      const { result } = renderHook(() => useIngredients(), { wrapper })

      // Set up ingredients
      const subscriptionCallback = mockSubscribeToUserIngredients.mock.calls[0][1]
      const mockIngredients = [
        { ...mockIngredient, location: 'fridge' },
        { ...mockIngredient, id: '2', location: 'pantry' },
      ]

      act(() => {
        subscriptionCallback(mockIngredients)
      })

      // Set location filter
      act(() => {
        result.current.setFilters({ location: 'fridge' })
      })

      expect(result.current.filteredIngredients).toHaveLength(1)
      expect(result.current.filteredIngredients[0].location).toBe('fridge')
    })

    it('should filter ingredients by category', () => {
      const { result } = renderHook(() => useIngredients(), { wrapper })

      // Set up ingredients
      const subscriptionCallback = mockSubscribeToUserIngredients.mock.calls[0][1]
      const mockIngredients = [
        { ...mockIngredient, category: 'Vegetables' },
        { ...mockIngredient, id: '2', category: 'Fruits' },
      ]

      act(() => {
        subscriptionCallback(mockIngredients)
      })

      // Set category filter
      act(() => {
        result.current.setFilters({ category: 'Vegetables' })
      })

      expect(result.current.filteredIngredients).toHaveLength(1)
      expect(result.current.filteredIngredients[0].category).toBe('Vegetables')
    })

    it('should sort ingredients by name', () => {
      const { result } = renderHook(() => useIngredients(), { wrapper })

      // Set up ingredients
      const subscriptionCallback = mockSubscribeToUserIngredients.mock.calls[0][1]
      const mockIngredients = [
        { ...mockIngredient, name: 'Zucchini' },
        { ...mockIngredient, id: '2', name: 'Apple' },
      ]

      act(() => {
        subscriptionCallback(mockIngredients)
      })

      // Set sort options
      act(() => {
        result.current.setSortOptions({ field: 'name', direction: 'asc' })
      })

      expect(result.current.filteredIngredients[0].name).toBe('Apple')
      expect(result.current.filteredIngredients[1].name).toBe('Zucchini')
    })

    it('should clear filters', () => {
      const { result } = renderHook(() => useIngredients(), { wrapper })

      // Set filters
      act(() => {
        result.current.setFilters({ search: 'test', location: 'fridge' })
      })

      expect(result.current.filters.search).toBe('test')
      expect(result.current.filters.location).toBe('fridge')

      // Clear filters
      act(() => {
        result.current.clearFilters()
      })

      expect(result.current.filters.search).toBe('')
      expect(result.current.filters.location).toBe('all')
    })
  })

  describe('Manual Loading', () => {
    it('should load ingredients manually', async () => {
      const { result } = renderHook(() => useIngredients(), { wrapper })
      const mockIngredients = [mockIngredient]

      mockGetUserIngredients.mockResolvedValue(mockIngredients)

      await act(async () => {
        await result.current.loadIngredients()
      })

      expect(mockGetUserIngredients).toHaveBeenCalledWith(mockAuthContextValue.user.uid)
      expect(result.current.ingredients).toEqual(mockIngredients)
      expect(result.current.error).toBeNull()
    })

    it('should handle manual loading error', async () => {
      const { result } = renderHook(() => useIngredients(), { wrapper })

      const error = new Error('Load failed')
      mockGetUserIngredients.mockRejectedValue(error)

      await act(async () => {
        await result.current.loadIngredients()
      })

      expect(result.current.error).toBe('Failed to load ingredients: Load failed')
    })

    it('should refresh ingredients', () => {
      const { result } = renderHook(() => useIngredients(), { wrapper })

      act(() => {
        result.current.refreshIngredients()
      })

      // Should call subscribeToUserIngredients again
      expect(mockSubscribeToUserIngredients).toHaveBeenCalledTimes(2)
    })
  })
})
