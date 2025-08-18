import { renderHook, act } from '@testing-library/react'
import { useRecipeRecommendations } from '../useRecipeRecommendations'
import { mockAuthContextValue, mockRecipe, mockIngredient } from '@/utils/test-utils'
import { AuthContext } from '@/contexts/AuthContext'
import { getUserRecipes } from '@/lib/firebase/firestore'

// Mock Firebase functions
jest.mock('@/lib/firebase/firestore')
jest.mock('@/contexts/AuthContext', () => ({
  AuthContext: {
    Provider: ({ children, value }: any) => children,
  },
  useAuth: () => mockAuthContextValue,
}))

const mockGetUserRecipes = getUserRecipes as jest.MockedFunction<typeof getUserRecipes>

describe('useRecipeRecommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={mockAuthContextValue}>
      {children}
    </AuthContext.Provider>
  )

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      expect(result.current.recommendations).toEqual([])
      expect(result.current.filteredRecommendations).toEqual([])
      expect(result.current.filters).toEqual({
        maxMissingIngredients: 5,
        minMatchPercentage: 50,
        difficulty: 'all',
        cuisine: '',
        mealType: [],
        dietary: [],
        maxPrepTime: undefined,
        maxCookTime: undefined,
      })
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('generateRecommendations', () => {
    it('should generate recommendations successfully', async () => {
      const mockRecipes = [mockRecipe]
      mockGetUserRecipes.mockResolvedValue(mockRecipes)
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      const userIngredients = [mockIngredient]

      await act(async () => {
        await result.current.generateRecommendations(userIngredients)
      })

      expect(mockGetUserRecipes).toHaveBeenCalledWith(mockAuthContextValue.user.uid)
      expect(result.current.recommendations).toHaveLength(1)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle error when generating recommendations', async () => {
      const error = new Error('Failed to load recipes')
      mockGetUserRecipes.mockRejectedValue(error)
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      const userIngredients = [mockIngredient]

      await act(async () => {
        await result.current.generateRecommendations(userIngredients)
      })

      expect(result.current.error).toBe('Failed to generate recommendations: Failed to load recipes')
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle empty user ingredients', async () => {
      const mockRecipes = [mockRecipe]
      mockGetUserRecipes.mockResolvedValue(mockRecipes)
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      const userIngredients: any[] = []

      await act(async () => {
        await result.current.generateRecommendations(userIngredients)
      })

      expect(result.current.recommendations).toHaveLength(1)
      // Recipe should have 0% match when no ingredients are available
      expect(result.current.recommendations[0].matchPercentage).toBe(0)
    })

    it('should calculate ingredient match correctly', async () => {
      const recipeWithIngredients = {
        ...mockRecipe,
        ingredients: [
          { name: 'Tomato', amount: 2, unit: 'pieces', category: 'Vegetables', notes: null },
          { name: 'Onion', amount: 1, unit: 'piece', category: 'Vegetables', notes: null },
        ],
      }
      const mockRecipes = [recipeWithIngredients]
      mockGetUserRecipes.mockResolvedValue(mockRecipes)
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      const userIngredients = [
        { ...mockIngredient, name: 'Tomato', quantity: 3 },
        { ...mockIngredient, name: 'Onion', quantity: 1 },
      ]

      await act(async () => {
        await result.current.generateRecommendations(userIngredients)
      })

      expect(result.current.recommendations).toHaveLength(1)
      expect(result.current.recommendations[0].matchPercentage).toBe(100)
      expect(result.current.recommendations[0].availableIngredients).toBe(2)
      expect(result.current.recommendations[0].missingIngredients).toHaveLength(0)
    })

    it('should calculate partial ingredient match correctly', async () => {
      const recipeWithIngredients = {
        ...mockRecipe,
        ingredients: [
          { name: 'Tomato', amount: 2, unit: 'pieces', category: 'Vegetables', notes: null },
          { name: 'Onion', amount: 1, unit: 'piece', category: 'Vegetables', notes: null },
          { name: 'Garlic', amount: 3, unit: 'cloves', category: 'Vegetables', notes: null },
        ],
      }
      const mockRecipes = [recipeWithIngredients]
      mockGetUserRecipes.mockResolvedValue(mockRecipes)
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      const userIngredients = [
        { ...mockIngredient, name: 'Tomato', quantity: 3 },
        { ...mockIngredient, name: 'Onion', quantity: 1 },
      ]

      await act(async () => {
        await result.current.generateRecommendations(userIngredients)
      })

      expect(result.current.recommendations).toHaveLength(1)
      expect(result.current.recommendations[0].matchPercentage).toBe(67)
      expect(result.current.recommendations[0].availableIngredients).toBe(2)
      expect(result.current.recommendations[0].missingIngredients).toHaveLength(1)
      expect(result.current.recommendations[0].missingIngredients[0].name).toBe('Garlic')
    })
  })

  describe('Filtering', () => {
    it('should filter recommendations by max missing ingredients', async () => {
      const recipeWithIngredients = {
        ...mockRecipe,
        ingredients: [
          { name: 'Tomato', amount: 2, unit: 'pieces', category: 'Vegetables', notes: null },
          { name: 'Onion', amount: 1, unit: 'piece', category: 'Vegetables', notes: null },
          { name: 'Garlic', amount: 3, unit: 'cloves', category: 'Vegetables', notes: null },
        ],
      }
      const mockRecipes = [recipeWithIngredients]
      mockGetUserRecipes.mockResolvedValue(mockRecipes)
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      const userIngredients = [
        { ...mockIngredient, name: 'Tomato', quantity: 3 },
      ]

      await act(async () => {
        await result.current.generateRecommendations(userIngredients)
      })

      // Set filter to only show recipes with max 1 missing ingredient
      act(() => {
        result.current.setFilters({ maxMissingIngredients: 1 })
      })

      expect(result.current.filteredRecommendations).toHaveLength(0)

      // Set filter to show recipes with max 2 missing ingredients
      act(() => {
        result.current.setFilters({ maxMissingIngredients: 2 })
      })

      expect(result.current.filteredRecommendations).toHaveLength(1)
    })

    it('should filter recommendations by min match percentage', async () => {
      const recipeWithIngredients = {
        ...mockRecipe,
        ingredients: [
          { name: 'Tomato', amount: 2, unit: 'pieces', category: 'Vegetables', notes: null },
          { name: 'Onion', amount: 1, unit: 'piece', category: 'Vegetables', notes: null },
        ],
      }
      const mockRecipes = [recipeWithIngredients]
      mockGetUserRecipes.mockResolvedValue(mockRecipes)
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      const userIngredients = [
        { ...mockIngredient, name: 'Tomato', quantity: 3 },
      ]

      await act(async () => {
        await result.current.generateRecommendations(userIngredients)
      })

      // Set filter to only show recipes with at least 60% match
      act(() => {
        result.current.setFilters({ minMatchPercentage: 60 })
      })

      expect(result.current.filteredRecommendations).toHaveLength(0)

      // Set filter to show recipes with at least 40% match
      act(() => {
        result.current.setFilters({ minMatchPercentage: 40 })
      })

      expect(result.current.filteredRecommendations).toHaveLength(1)
    })

    it('should filter recommendations by difficulty', async () => {
      const easyRecipe = { ...mockRecipe, difficulty: 'easy' }
      const hardRecipe = { ...mockRecipe, difficulty: 'hard' }
      const mockRecipes = [easyRecipe, hardRecipe]
      mockGetUserRecipes.mockResolvedValue(mockRecipes)
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      const userIngredients = [mockIngredient]

      await act(async () => {
        await result.current.generateRecommendations(userIngredients)
      })

      // Filter by easy difficulty
      act(() => {
        result.current.setFilters({ difficulty: 'easy' })
      })

      expect(result.current.filteredRecommendations).toHaveLength(1)
      expect(result.current.filteredRecommendations[0].recipe.difficulty).toBe('easy')
    })

    it('should filter recommendations by cuisine', async () => {
      const italianRecipe = { ...mockRecipe, cuisine: 'Italian' }
      const mexicanRecipe = { ...mockRecipe, cuisine: 'Mexican' }
      const mockRecipes = [italianRecipe, mexicanRecipe]
      mockGetUserRecipes.mockResolvedValue(mockRecipes)
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      const userIngredients = [mockIngredient]

      await act(async () => {
        await result.current.generateRecommendations(userIngredients)
      })

      // Filter by Italian cuisine
      act(() => {
        result.current.setFilters({ cuisine: 'Italian' })
      })

      expect(result.current.filteredRecommendations).toHaveLength(1)
      expect(result.current.filteredRecommendations[0].recipe.cuisine).toBe('Italian')
    })

    it('should clear filters', async () => {
      const mockRecipes = [mockRecipe]
      mockGetUserRecipes.mockResolvedValue(mockRecipes)
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      const userIngredients = [mockIngredient]

      await act(async () => {
        await result.current.generateRecommendations(userIngredients)
      })

      // Set some filters
      act(() => {
        result.current.setFilters({ difficulty: 'easy', cuisine: 'Italian' })
      })

      // Clear filters
      act(() => {
        result.current.clearFilters()
      })

      expect(result.current.filters).toEqual({
        maxMissingIngredients: 5,
        minMatchPercentage: 50,
        difficulty: 'all',
        cuisine: '',
        mealType: [],
        dietary: [],
        maxPrepTime: undefined,
        maxCookTime: undefined,
      })
    })
  })

  describe('Helper Functions', () => {
    it('should get recommendation by ID', async () => {
      const mockRecipes = [mockRecipe]
      mockGetUserRecipes.mockResolvedValue(mockRecipes)
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      const userIngredients = [mockIngredient]

      await act(async () => {
        await result.current.generateRecommendations(userIngredients)
      })

      const recommendation = result.current.getRecommendationById(mockRecipe.id)
      expect(recommendation).toBeDefined()
      expect(recommendation?.recipe.id).toBe(mockRecipe.id)

      const nonExistentRecommendation = result.current.getRecommendationById('non-existent-id')
      expect(nonExistentRecommendation).toBeUndefined()
    })

    it('should get top recommendations', async () => {
      const recipe1 = { ...mockRecipe, id: 'recipe-1' }
      const recipe2 = { ...mockRecipe, id: 'recipe-2' }
      const recipe3 = { ...mockRecipe, id: 'recipe-3' }
      const mockRecipes = [recipe1, recipe2, recipe3]
      mockGetUserRecipes.mockResolvedValue(mockRecipes)
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      const userIngredients = [mockIngredient]

      await act(async () => {
        await result.current.generateRecommendations(userIngredients)
      })

      const topRecommendations = result.current.getTopRecommendations(2)
      expect(topRecommendations).toHaveLength(2)
    })

    it('should get recommendations by category', async () => {
      const italianRecipe = { ...mockRecipe, cuisine: 'Italian' }
      const mexicanRecipe = { ...mockRecipe, cuisine: 'Mexican' }
      const mockRecipes = [italianRecipe, mexicanRecipe]
      mockGetUserRecipes.mockResolvedValue(mockRecipes)
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      const userIngredients = [mockIngredient]

      await act(async () => {
        await result.current.generateRecommendations(userIngredients)
      })

      const italianRecommendations = result.current.getRecommendationsByCategory('Italian')
      expect(italianRecommendations).toHaveLength(1)
      expect(italianRecommendations[0].recipe.cuisine).toBe('Italian')
    })
  })

  describe('Recommendation Reasons', () => {
    it('should generate reasons for high match percentage', async () => {
      const recipeWithIngredients = {
        ...mockRecipe,
        ingredients: [
          { name: 'Tomato', amount: 2, unit: 'pieces', category: 'Vegetables', notes: null },
          { name: 'Onion', amount: 1, unit: 'piece', category: 'Vegetables', notes: null },
        ],
      }
      const mockRecipes = [recipeWithIngredients]
      mockGetUserRecipes.mockResolvedValue(mockRecipes)
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      const userIngredients = [
        { ...mockIngredient, name: 'Tomato', quantity: 3 },
        { ...mockIngredient, name: 'Onion', quantity: 1 },
      ]

      await act(async () => {
        await result.current.generateRecommendations(userIngredients)
      })

      expect(result.current.recommendations).toHaveLength(1)
      expect(result.current.recommendations[0].reasons).toContain('Perfect match! You have all the ingredients')
    })

    it('should generate reasons for partial match', async () => {
      const recipeWithIngredients = {
        ...mockRecipe,
        ingredients: [
          { name: 'Tomato', amount: 2, unit: 'pieces', category: 'Vegetables', notes: null },
          { name: 'Onion', amount: 1, unit: 'piece', category: 'Vegetables', notes: null },
        ],
      }
      const mockRecipes = [recipeWithIngredients]
      mockGetUserRecipes.mockResolvedValue(mockRecipes)
      const { result } = renderHook(() => useRecipeRecommendations(), { wrapper })

      const userIngredients = [
        { ...mockIngredient, name: 'Tomato', quantity: 3 },
      ]

      await act(async () => {
        await result.current.generateRecommendations(userIngredients)
      })

      expect(result.current.recommendations).toHaveLength(1)
      expect(result.current.recommendations[0].reasons).toContain('You have 50% of the ingredients')
    })
  })
})
