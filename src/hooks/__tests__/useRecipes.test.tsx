import { renderHook, act } from '@testing-library/react'
import { useRecipes } from '../useRecipes'
import { mockAuthContextValue, mockRecipe, mockIngredient } from '@/utils/test-utils'
import { AuthContext } from '@/contexts/AuthContext'
import {
  createRecipe,
  getUserRecipes,
  updateRecipe,
  deleteRecipe,
  subscribeToUserRecipes,
  getRecipesByIngredient,
  getRecipesByCategory,
  searchRecipes,
} from '@/lib/firebase/firestore'

// Mock Firebase functions
jest.mock('@/lib/firebase/firestore')
jest.mock('@/contexts/AuthContext', () => ({
  AuthContext: {
    Provider: ({ children, value }: any) => children,
  },
  useAuth: () => mockAuthContextValue,
}))

const mockCreateRecipe = createRecipe as jest.MockedFunction<typeof createRecipe>
const mockGetUserRecipes = getUserRecipes as jest.MockedFunction<typeof getUserRecipes>
const mockUpdateRecipe = updateRecipe as jest.MockedFunction<typeof updateRecipe>
const mockDeleteRecipe = deleteRecipe as jest.MockedFunction<typeof deleteRecipe>
const mockSubscribeToUserRecipes = subscribeToUserRecipes as jest.MockedFunction<typeof subscribeToUserRecipes>
const mockGetRecipesByIngredient = getRecipesByIngredient as jest.MockedFunction<typeof getRecipesByIngredient>
const mockGetRecipesByCategory = getRecipesByCategory as jest.MockedFunction<typeof getRecipesByCategory>
const mockSearchRecipes = searchRecipes as jest.MockedFunction<typeof searchRecipes>

describe('useRecipes', () => {
  const mockUnsubscribe = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockSubscribeToUserRecipes.mockReturnValue(mockUnsubscribe)
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={mockAuthContextValue}>
      {children}
    </AuthContext.Provider>
  )

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })

      expect(result.current.recipes).toEqual([])
      expect(result.current.filteredRecipes).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.filters).toEqual({
        search: '',
        difficulty: 'all',
        cuisine: '',
        mealType: [],
        dietary: [],
        tags: [],
        maxPrepTime: undefined,
        maxCookTime: undefined,
        maxTotalTime: undefined,
        minRating: undefined,
        isFavorite: undefined,
        hasIngredients: undefined,
      })
      expect(result.current.sortOptions).toEqual({
        field: 'title',
        direction: 'asc',
      })
    })

    it('should set up real-time subscription when user is available', () => {
      renderHook(() => useRecipes(), { wrapper })

      expect(mockSubscribeToUserRecipes).toHaveBeenCalledWith(
        mockAuthContextValue.user.uid,
        expect.any(Function),
        expect.any(Function)
      )
    })
  })

  describe('Real-time Subscription', () => {
    it('should update recipes when subscription callback is called', () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })

      // Simulate subscription callback
      const subscriptionCallback = mockSubscribeToUserRecipes.mock.calls[0][1]
      const mockRecipes = [mockRecipe]

      act(() => {
        subscriptionCallback(mockRecipes)
      })

      expect(result.current.recipes).toEqual(mockRecipes)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle subscription errors', () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })

      // Simulate subscription error
      const subscriptionErrorCallback = mockSubscribeToUserRecipes.mock.calls[0][2]
      const mockError = new Error('Subscription failed')

      act(() => {
        subscriptionErrorCallback(mockError)
      })

      expect(result.current.error).toBe('Failed to load recipes: Subscription failed')
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('CRUD Operations', () => {
    describe('addRecipe', () => {
      it('should add recipe successfully', async () => {
        const { result } = renderHook(() => useRecipes(), { wrapper })
        const recipeData = {
          title: 'New Recipe',
          description: 'A new recipe',
          prepTime: 15,
          cookTime: 30,
          servingsCount: 4,
          ingredients: [],
          instructions: [],
        }

        mockCreateRecipe.mockResolvedValue('new-recipe-id')

        await act(async () => {
          await result.current.addRecipe(recipeData)
        })

        expect(mockCreateRecipe).toHaveBeenCalledWith(
          mockAuthContextValue.user.uid,
          recipeData
        )
        expect(result.current.error).toBeNull()
      })

      it('should handle add recipe error', async () => {
        const { result } = renderHook(() => useRecipes(), { wrapper })
        const recipeData = {
          title: 'New Recipe',
          description: 'A new recipe',
          prepTime: 15,
          cookTime: 30,
          servingsCount: 4,
          ingredients: [],
          instructions: [],
        }

        const error = new Error('Add failed')
        mockCreateRecipe.mockRejectedValue(error)

        await act(async () => {
          await result.current.addRecipe(recipeData)
        })

        expect(result.current.error).toBe('Failed to add recipe: Add failed')
      })
    })

    describe('updateRecipe', () => {
      it('should update recipe successfully', async () => {
        const { result } = renderHook(() => useRecipes(), { wrapper })
        const updates = {
          title: 'Updated Recipe',
          description: 'Updated description',
        }

        mockUpdateRecipe.mockResolvedValue(undefined)

        await act(async () => {
          await result.current.updateRecipe('test-id', updates)
        })

        expect(mockUpdateRecipe).toHaveBeenCalledWith(
          mockAuthContextValue.user.uid,
          'test-id',
          updates
        )
        expect(result.current.error).toBeNull()
      })
    })

    describe('deleteRecipe', () => {
      it('should delete recipe successfully', async () => {
        const { result } = renderHook(() => useRecipes(), { wrapper })

        mockDeleteRecipe.mockResolvedValue(undefined)

        await act(async () => {
          await result.current.deleteRecipe('test-id')
        })

        expect(mockDeleteRecipe).toHaveBeenCalledWith(
          mockAuthContextValue.user.uid,
          'test-id'
        )
        expect(result.current.error).toBeNull()
      })
    })
  })

  describe('Filtering and Sorting', () => {
    it('should filter recipes by search term', () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })

      // Set up recipes
      const subscriptionCallback = mockSubscribeToUserRecipes.mock.calls[0][1]
      const mockRecipes = [
        { ...mockRecipe, title: 'Pasta Recipe' },
        { ...mockRecipe, id: '2', title: 'Salad Recipe' },
      ]

      act(() => {
        subscriptionCallback(mockRecipes)
      })

      // Set search filter
      act(() => {
        result.current.setFilters({ search: 'pasta' })
      })

      expect(result.current.filteredRecipes).toHaveLength(1)
      expect(result.current.filteredRecipes[0].title).toBe('Pasta Recipe')
    })

    it('should filter recipes by difficulty', () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })

      // Set up recipes
      const subscriptionCallback = mockSubscribeToUserRecipes.mock.calls[0][1]
      const mockRecipes = [
        { ...mockRecipe, difficulty: 'easy' },
        { ...mockRecipe, id: '2', difficulty: 'hard' },
      ]

      act(() => {
        subscriptionCallback(mockRecipes)
      })

      // Set difficulty filter
      act(() => {
        result.current.setFilters({ difficulty: 'easy' })
      })

      expect(result.current.filteredRecipes).toHaveLength(1)
      expect(result.current.filteredRecipes[0].difficulty).toBe('easy')
    })

    it('should filter recipes by cuisine', () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })

      // Set up recipes
      const subscriptionCallback = mockSubscribeToUserRecipes.mock.calls[0][1]
      const mockRecipes = [
        { ...mockRecipe, cuisine: 'Italian' },
        { ...mockRecipe, id: '2', cuisine: 'Mexican' },
      ]

      act(() => {
        subscriptionCallback(mockRecipes)
      })

      // Set cuisine filter
      act(() => {
        result.current.setFilters({ cuisine: 'Italian' })
      })

      expect(result.current.filteredRecipes).toHaveLength(1)
      expect(result.current.filteredRecipes[0].cuisine).toBe('Italian')
    })

    it('should sort recipes by title', () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })

      // Set up recipes
      const subscriptionCallback = mockSubscribeToUserRecipes.mock.calls[0][1]
      const mockRecipes = [
        { ...mockRecipe, title: 'Zucchini Recipe' },
        { ...mockRecipe, id: '2', title: 'Apple Recipe' },
      ]

      act(() => {
        subscriptionCallback(mockRecipes)
      })

      // Set sort options
      act(() => {
        result.current.setSortOptions({ field: 'title', direction: 'asc' })
      })

      expect(result.current.filteredRecipes[0].title).toBe('Apple Recipe')
      expect(result.current.filteredRecipes[1].title).toBe('Zucchini Recipe')
    })

    it('should clear filters', () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })

      // Set filters
      act(() => {
        result.current.setFilters({ search: 'test', difficulty: 'easy' })
      })

      expect(result.current.filters.search).toBe('test')
      expect(result.current.filters.difficulty).toBe('easy')

      // Clear filters
      act(() => {
        result.current.clearFilters()
      })

      expect(result.current.filters.search).toBe('')
      expect(result.current.filters.difficulty).toBe('all')
    })
  })

  describe('Helper Functions', () => {
    it('should get recipe by ID', () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })

      // Set up recipes
      const subscriptionCallback = mockSubscribeToUserRecipes.mock.calls[0][1]
      const mockRecipes = [
        { ...mockRecipe, id: 'recipe-1' },
        { ...mockRecipe, id: 'recipe-2' },
      ]

      act(() => {
        subscriptionCallback(mockRecipes)
      })

      const foundRecipe = result.current.getRecipeById('recipe-1')
      expect(foundRecipe).toEqual(mockRecipes[0])
    })

    it('should get recipes by ingredient', async () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })
      const mockRecipes = [{ ...mockRecipe, title: 'Pasta Recipe' }]

      mockGetRecipesByIngredient.mockResolvedValue(mockRecipes)

      const recipes = await result.current.getRecipesByIngredient('pasta')

      expect(mockGetRecipesByIngredient).toHaveBeenCalledWith(
        mockAuthContextValue.user.uid,
        'pasta'
      )
      expect(recipes).toEqual(mockRecipes)
    })

    it('should get recipes by category', async () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })
      const mockRecipes = [{ ...mockRecipe, title: 'Quick Recipe' }]

      mockGetRecipesByCategory.mockResolvedValue(mockRecipes)

      const recipes = await result.current.getRecipesByCategory('quick')

      expect(mockGetRecipesByCategory).toHaveBeenCalledWith(
        mockAuthContextValue.user.uid,
        'quick'
      )
      expect(recipes).toEqual(mockRecipes)
    })

    it('should search recipes', async () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })
      const mockRecipes = [{ ...mockRecipe, title: 'Search Result' }]

      mockSearchRecipes.mockResolvedValue(mockRecipes)

      const recipes = await result.current.searchRecipes('search')

      expect(mockSearchRecipes).toHaveBeenCalledWith(
        mockAuthContextValue.user.uid,
        'search'
      )
      expect(recipes).toEqual(mockRecipes)
    })

    it('should get available cuisines', () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })

      // Set up recipes
      const subscriptionCallback = mockSubscribeToUserRecipes.mock.calls[0][1]
      const mockRecipes = [
        { ...mockRecipe, cuisine: 'Italian' },
        { ...mockRecipe, id: '2', cuisine: 'Mexican' },
        { ...mockRecipe, id: '3', cuisine: 'Italian' }, // Duplicate
      ]

      act(() => {
        subscriptionCallback(mockRecipes)
      })

      const cuisines = result.current.getAvailableCuisines()
      expect(cuisines).toEqual(['Italian', 'Mexican'])
    })

    it('should get available tags', () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })

      // Set up recipes
      const subscriptionCallback = mockSubscribeToUserRecipes.mock.calls[0][1]
      const mockRecipes = [
        { ...mockRecipe, tags: ['quick', 'healthy'] },
        { ...mockRecipe, id: '2', tags: ['vegetarian', 'quick'] }, // Duplicate 'quick'
      ]

      act(() => {
        subscriptionCallback(mockRecipes)
      })

      const tags = result.current.getAvailableTags()
      expect(tags).toEqual(['healthy', 'quick', 'vegetarian'])
    })

    it('should check ingredient availability', () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })

      const recipe = {
        ...mockRecipe,
        ingredients: [
          { name: 'Tomato', amount: 2, unit: 'pieces' },
          { name: 'Onion', amount: 1, unit: 'piece' },
          { name: 'Garlic', amount: 3, unit: 'cloves' },
        ],
      }

      const userIngredients = [
        { ...mockIngredient, name: 'Tomato' },
        { ...mockIngredient, id: '2', name: 'Onion' },
      ]

      const availability = result.current.checkIngredientAvailability(recipe, userIngredients)

      expect(availability.available).toBe(2)
      expect(availability.total).toBe(3)
      expect(availability.percentage).toBe(67)
      expect(availability.missing).toHaveLength(1)
      expect(availability.missing[0].name).toBe('Garlic')
    })

    it('should handle ingredient availability with no user ingredients', () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })

      const recipe = {
        ...mockRecipe,
        ingredients: [
          { name: 'Tomato', amount: 2, unit: 'pieces' },
        ],
      }

      const availability = result.current.checkIngredientAvailability(recipe, [])

      expect(availability.available).toBe(0)
      expect(availability.total).toBe(1)
      expect(availability.percentage).toBe(0)
      expect(availability.missing).toHaveLength(1)
    })
  })

  describe('Manual Loading', () => {
    it('should load recipes manually', async () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })
      const mockRecipes = [mockRecipe]

      mockGetUserRecipes.mockResolvedValue(mockRecipes)

      await act(async () => {
        await result.current.loadRecipes()
      })

      expect(mockGetUserRecipes).toHaveBeenCalledWith(mockAuthContextValue.user.uid)
      expect(result.current.recipes).toEqual(mockRecipes)
      expect(result.current.error).toBeNull()
    })

    it('should refresh recipes', () => {
      const { result } = renderHook(() => useRecipes(), { wrapper })

      act(() => {
        result.current.refreshRecipes()
      })

      // Should call subscribeToUserRecipes again
      expect(mockSubscribeToUserRecipes).toHaveBeenCalledTimes(2)
    })
  })
})
