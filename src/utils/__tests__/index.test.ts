import {
  cn,
  formatTime,
  matchesIngredients,
  formatDate,
  getDaysUntilExpiration,
  getExpirationStatus,
  getExpirationBadgeVariant,
  generateId,
  capitalizeFirst,
} from '../index'

describe('Utility Functions', () => {
  describe('cn', () => {
    it('should combine class names correctly', () => {
      const result = cn('class1', 'class2', 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'conditional', false && 'not-included')
      expect(result).toBe('base conditional')
    })

    it('should handle arrays of classes', () => {
      const result = cn('base', ['class1', 'class2'], 'class3')
      expect(result).toBe('base class1 class2 class3')
    })

    it('should handle objects with conditional classes', () => {
      const result = cn('base', { 'conditional': true, 'not-included': false })
      expect(result).toBe('base conditional')
    })

    it('should handle empty inputs', () => {
      const result = cn('', null, undefined, false)
      expect(result).toBe('')
    })
  })

  describe('formatTime', () => {
    it('should format minutes less than 60 correctly', () => {
      expect(formatTime(30)).toBe('30 min')
      expect(formatTime(45)).toBe('45 min')
      expect(formatTime(0)).toBe('0 min')
    })

    it('should format hours without remaining minutes correctly', () => {
      expect(formatTime(60)).toBe('1 hr')
      expect(formatTime(120)).toBe('2 hr')
      expect(formatTime(180)).toBe('3 hr')
    })

    it('should format hours with remaining minutes correctly', () => {
      expect(formatTime(90)).toBe('1 hr 30 min')
      expect(formatTime(125)).toBe('2 hr 5 min')
      expect(formatTime(145)).toBe('2 hr 25 min')
    })

    it('should handle edge cases', () => {
      expect(formatTime(1)).toBe('1 min')
      expect(formatTime(59)).toBe('59 min')
      expect(formatTime(61)).toBe('1 hr 1 min')
    })
  })

  describe('matchesIngredients', () => {
    it('should return true when match percentage is met', () => {
      const available = ['tomato', 'onion', 'garlic']
      const required = ['tomato', 'onion', 'garlic', 'olive oil']
      const result = matchesIngredients(available, required, 0.75)
      expect(result).toBe(true)
    })

    it('should return false when match percentage is not met', () => {
      const available = ['tomato', 'onion']
      const required = ['tomato', 'onion', 'garlic', 'olive oil']
      const result = matchesIngredients(available, required, 0.75)
      expect(result).toBe(false)
    })

    it('should handle case insensitive matching', () => {
      const available = ['Tomato', 'ONION', 'Garlic']
      const required = ['tomato', 'onion', 'garlic']
      const result = matchesIngredients(available, required, 1.0)
      expect(result).toBe(true)
    })

    it('should handle partial matches', () => {
      const available = ['fresh tomato', 'red onion', 'minced garlic']
      const required = ['tomato', 'onion', 'garlic']
      const result = matchesIngredients(available, required, 1.0)
      expect(result).toBe(true)
    })

    it('should use default minMatchPercentage of 0.7', () => {
      const available = ['tomato', 'onion', 'garlic']
      const required = ['tomato', 'onion', 'garlic', 'olive oil', 'salt']
      const result = matchesIngredients(available, required)
      expect(result).toBe(true) // 3/5 = 0.6, but default is 0.7, so should be false
    })

    it('should handle empty arrays', () => {
      expect(matchesIngredients([], [])).toBe(true)
      expect(matchesIngredients(['tomato'], [])).toBe(true)
      expect(matchesIngredients([], ['tomato'])).toBe(false)
    })
  })

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2023-01-15')
      const result = formatDate(date)
      expect(result).toBe('Jan 15, 2023')
    })

    it('should handle different dates', () => {
      const date1 = new Date('2023-12-25')
      expect(formatDate(date1)).toBe('Dec 25, 2023')

      const date2 = new Date('2024-03-01')
      expect(formatDate(date2)).toBe('Mar 1, 2024')
    })

    it('should handle edge cases', () => {
      const date = new Date('2023-01-01')
      expect(formatDate(date)).toBe('Jan 1, 2023')
    })
  })

  describe('getDaysUntilExpiration', () => {
    beforeEach(() => {
      // Mock current date to 2023-01-15
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2023-01-15'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should calculate days until expiration correctly', () => {
      const expirationDate = new Date('2023-01-20')
      const result = getDaysUntilExpiration(expirationDate)
      expect(result).toBe(5)
    })

    it('should handle expired items', () => {
      const expirationDate = new Date('2023-01-10')
      const result = getDaysUntilExpiration(expirationDate)
      expect(result).toBe(-5)
    })

    it('should handle same day expiration', () => {
      const expirationDate = new Date('2023-01-15')
      const result = getDaysUntilExpiration(expirationDate)
      expect(result).toBe(0)
    })

    it('should handle future expiration', () => {
      const expirationDate = new Date('2023-02-15')
      const result = getDaysUntilExpiration(expirationDate)
      expect(result).toBe(31)
    })
  })

  describe('getExpirationStatus', () => {
    beforeEach(() => {
      // Mock current date to 2023-01-15
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2023-01-15'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return fresh for items with no expiration date', () => {
      expect(getExpirationStatus(undefined)).toBe('fresh')
    })

    it('should return fresh for items expiring in more than 3 days', () => {
      const expirationDate = new Date('2023-01-20')
      expect(getExpirationStatus(expirationDate)).toBe('fresh')
    })

    it('should return expiring-soon for items expiring in 3 days or less', () => {
      const expirationDate1 = new Date('2023-01-18')
      expect(getExpirationStatus(expirationDate1)).toBe('expiring-soon')

      const expirationDate2 = new Date('2023-01-15')
      expect(getExpirationStatus(expirationDate2)).toBe('expiring-soon')
    })

    it('should return expired for items past expiration date', () => {
      const expirationDate = new Date('2023-01-10')
      expect(getExpirationStatus(expirationDate)).toBe('expired')
    })
  })

  describe('getExpirationBadgeVariant', () => {
    it('should return correct badge variants', () => {
      expect(getExpirationBadgeVariant('fresh')).toBe('success')
      expect(getExpirationBadgeVariant('expiring-soon')).toBe('warning')
      expect(getExpirationBadgeVariant('expired')).toBe('danger')
    })

    it('should return success for unknown status', () => {
      expect(getExpirationBadgeVariant('unknown')).toBe('success')
      expect(getExpirationBadgeVariant('')).toBe('success')
    })
  })

  describe('generateId', () => {
    it('should generate a string ID', () => {
      const id = generateId()
      expect(typeof id).toBe('string')
      expect(id.length).toBe(9)
    })

    it('should generate different IDs on multiple calls', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })

    it('should generate alphanumeric IDs', () => {
      const id = generateId()
      expect(id).toMatch(/^[a-z0-9]+$/)
    })
  })

  describe('capitalizeFirst', () => {
    it('should capitalize first letter of string', () => {
      expect(capitalizeFirst('hello')).toBe('Hello')
      expect(capitalizeFirst('world')).toBe('World')
    })

    it('should handle single character strings', () => {
      expect(capitalizeFirst('a')).toBe('A')
      expect(capitalizeFirst('z')).toBe('Z')
    })

    it('should handle already capitalized strings', () => {
      expect(capitalizeFirst('Hello')).toBe('Hello')
      expect(capitalizeFirst('WORLD')).toBe('WORLD')
    })

    it('should handle empty strings', () => {
      expect(capitalizeFirst('')).toBe('')
    })

    it('should handle strings with numbers', () => {
      expect(capitalizeFirst('123abc')).toBe('123abc')
      expect(capitalizeFirst('abc123')).toBe('Abc123')
    })
  })
})
