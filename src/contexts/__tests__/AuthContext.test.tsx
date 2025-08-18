import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { onAuthStateChange } from '@/lib/firebase/auth'

// Mock Firebase auth
jest.mock('@/lib/firebase/auth')

const mockOnAuthStateChange = onAuthStateChange as jest.MockedFunction<typeof onAuthStateChange>

// Test component to use the auth context
const TestComponent = () => {
  const { user, loading, error, isDemoMode, enableDemoMode, disableDemoMode } = useAuth()
  
  return (
    <div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="demo-mode">{isDemoMode.toString()}</div>
      <button data-testid="enable-demo" onClick={enableDemoMode}>
        Enable Demo
      </button>
      <button data-testid="disable-demo" onClick={disableDemoMode}>
        Disable Demo
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  const mockUnsubscribe = jest.fn()
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: jest.fn(),
    getIdToken: jest.fn(),
    getIdTokenResult: jest.fn(),
    reload: jest.fn(),
    toJSON: jest.fn(),
    phoneNumber: null,
    providerId: 'password',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockOnAuthStateChange.mockReturnValue(mockUnsubscribe)
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear()
    }
    
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: {
        reload: jest.fn(),
      },
      writable: true,
    })
  })

  describe('AuthProvider', () => {
    it('should provide initial auth state', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
      expect(screen.getByTestId('loading')).toHaveTextContent('true')
      expect(screen.getByTestId('error')).toHaveTextContent('no-error')
      expect(screen.getByTestId('demo-mode')).toHaveTextContent('false')
    })

    it('should set up auth state listener on mount', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should update auth state when user signs in', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Get the callback function passed to onAuthStateChange
      const authCallback = mockOnAuthStateChange.mock.calls[0][0]

      // Simulate user sign in
      act(() => {
        authCallback(mockUser)
      })

      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
      expect(screen.getByTestId('error')).toHaveTextContent('no-error')
    })

    it('should update auth state when user signs out', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Get the callback function passed to onAuthStateChange
      const authCallback = mockOnAuthStateChange.mock.calls[0][0]

      // First simulate user sign in
      act(() => {
        authCallback(mockUser)
      })

      // Then simulate user sign out
      act(() => {
        authCallback(null)
      })

      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    it('should detect demo mode from localStorage', () => {
      // Set demo mode in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('demoMode', 'true')
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('demo-mode')).toHaveTextContent('true')
    })

    it('should enable demo mode', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const enableDemoButton = screen.getByTestId('enable-demo')
      
      act(() => {
        enableDemoButton.click()
      })

      expect(localStorage.getItem('demoMode')).toBe('true')
      expect(window.location.reload).toHaveBeenCalled()
    })

    it('should disable demo mode', () => {
      // Start with demo mode enabled
      if (typeof window !== 'undefined') {
        localStorage.setItem('demoMode', 'true')
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const disableDemoButton = screen.getByTestId('disable-demo')
      
      act(() => {
        disableDemoButton.click()
      })

      expect(localStorage.getItem('demoMode')).toBeNull()
      expect(window.location.reload).toHaveBeenCalled()
    })

    it('should cleanup auth listener on unmount', () => {
      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('useAuth', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useAuth must be used within an AuthProvider')

      consoleSpy.mockRestore()
    })

    it('should provide auth context when used within AuthProvider', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('user')).toBeInTheDocument()
      expect(screen.getByTestId('loading')).toBeInTheDocument()
      expect(screen.getByTestId('error')).toBeInTheDocument()
      expect(screen.getByTestId('demo-mode')).toBeInTheDocument()
    })
  })

  describe('Demo Mode Integration', () => {
    it('should handle demo mode state changes', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Initially demo mode should be false
      expect(screen.getByTestId('demo-mode')).toHaveTextContent('false')

      // Enable demo mode
      act(() => {
        screen.getByTestId('enable-demo').click()
      })

      // Demo mode should be enabled in localStorage
      expect(localStorage.getItem('demoMode')).toBe('true')
    })

    it('should handle demo mode persistence', () => {
      // Set demo mode before rendering
      if (typeof window !== 'undefined') {
        localStorage.setItem('demoMode', 'true')
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Demo mode should be detected from localStorage
      expect(screen.getByTestId('demo-mode')).toHaveTextContent('true')
    })
  })

  describe('Error Handling', () => {
    it('should handle auth state change errors gracefully', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Get the callback function passed to onAuthStateChange
      const authCallback = mockOnAuthStateChange.mock.calls[0][0]

      // Simulate an error by passing a non-user object
      act(() => {
        authCallback('invalid-user' as any)
      })

      // Should handle gracefully without crashing
      expect(screen.getByTestId('user')).toBeInTheDocument()
    })
  })
})
