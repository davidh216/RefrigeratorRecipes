import {
  signUp,
  signIn,
  signInWithGoogle,
  signOut,
  resetPassword,
  onAuthStateChange,
  getCurrentUser,
} from '../auth'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
} from 'firebase/auth'
import { auth } from '../config'

// Mock Firebase Auth
jest.mock('firebase/auth')
jest.mock('../config', () => ({
  auth: {},
}))

const mockCreateUserWithEmailAndPassword = createUserWithEmailAndPassword as jest.MockedFunction<typeof createUserWithEmailAndPassword>
const mockSignInWithEmailAndPassword = signInWithEmailAndPassword as jest.MockedFunction<typeof signInWithEmailAndPassword>
const mockSignInWithPopup = signInWithPopup as jest.MockedFunction<typeof signInWithPopup>
const mockFirebaseSignOut = firebaseSignOut as jest.MockedFunction<typeof firebaseSignOut>
const mockOnAuthStateChanged = onAuthStateChanged as jest.MockedFunction<typeof onAuthStateChanged>
const mockUpdateProfile = updateProfile as jest.MockedFunction<typeof updateProfile>
const mockSendPasswordResetEmail = sendPasswordResetEmail as jest.MockedFunction<typeof sendPasswordResetEmail>

// Mock GoogleAuthProvider
jest.mock('firebase/auth', () => ({
  ...jest.requireActual('firebase/auth'),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({
    addScope: jest.fn(),
  })),
}))

describe('Firebase Auth Functions', () => {
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

  const mockUserCredential = {
    user: mockUser,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear()
    }
    // Reset environment variables
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  })

  describe('Demo Mode Detection', () => {
    it('should detect demo mode from localStorage', () => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('demoMode', 'true')
        const result = signUp('test@example.com', 'password')
        expect(result).resolves.toEqual(expect.objectContaining({
          uid: 'demo-user-id',
          email: 'demo@example.com',
        }))
      }
    })

    it('should detect demo mode from missing API key', () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = undefined
      const result = signUp('test@example.com', 'password')
      expect(result).resolves.toEqual(expect.objectContaining({
        uid: 'demo-user-id',
        email: 'demo@example.com',
      }))
    })

    it('should detect demo mode from demo API key', () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'demo_key'
      const result = signUp('test@example.com', 'password')
      expect(result).resolves.toEqual(expect.objectContaining({
        uid: 'demo-user-id',
        email: 'demo@example.com',
      }))
    })
  })

  describe('signUp', () => {
    it('should create user with email and password successfully', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValue(mockUserCredential)
      mockUpdateProfile.mockResolvedValue()

      const result = await signUp('test@example.com', 'password', 'Test User')

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'test@example.com', 'password')
      expect(mockUpdateProfile).toHaveBeenCalledWith(mockUser, { displayName: 'Test User' })
      expect(result).toEqual(mockUser)
    })

    it('should create user without display name', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValue(mockUserCredential)

      const result = await signUp('test@example.com', 'password')

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'test@example.com', 'password')
      expect(mockUpdateProfile).not.toHaveBeenCalled()
      expect(result).toEqual(mockUser)
    })

    it('should handle sign up error', async () => {
      const error = new Error('Email already in use')
      mockCreateUserWithEmailAndPassword.mockRejectedValue(error)

      await expect(signUp('test@example.com', 'password')).rejects.toThrow('Email already in use')
    })

    it('should handle profile update error', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValue(mockUserCredential)
      mockUpdateProfile.mockRejectedValue(new Error('Profile update failed'))

      await expect(signUp('test@example.com', 'password', 'Test User')).rejects.toThrow('Profile update failed')
    })
  })

  describe('signIn', () => {
    it('should sign in with email and password successfully', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValue(mockUserCredential)

      const result = await signIn('test@example.com', 'password')

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'test@example.com', 'password')
      expect(result).toEqual(mockUser)
    })

    it('should handle sign in error', async () => {
      const error = new Error('Invalid credentials')
      mockSignInWithEmailAndPassword.mockRejectedValue(error)

      await expect(signIn('test@example.com', 'password')).rejects.toThrow('Invalid credentials')
    })
  })

  describe('signInWithGoogle', () => {
    it('should sign in with Google successfully', async () => {
      mockSignInWithPopup.mockResolvedValue(mockUserCredential)

      const result = await signInWithGoogle()

      expect(mockSignInWithPopup).toHaveBeenCalledWith(auth, expect.any(GoogleAuthProvider))
      expect(result).toEqual(mockUser)
    })

    it('should handle Google sign in error', async () => {
      const error = new Error('Popup closed')
      mockSignInWithPopup.mockRejectedValue(error)

      await expect(signInWithGoogle()).rejects.toThrow('Popup closed')
    })
  })

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockFirebaseSignOut.mockResolvedValue()

      await signOut()

      expect(mockFirebaseSignOut).toHaveBeenCalledWith(auth)
    })

    it('should handle sign out error', async () => {
      const error = new Error('Sign out failed')
      mockFirebaseSignOut.mockRejectedValue(error)

      await expect(signOut()).rejects.toThrow('Sign out failed')
    })
  })

  describe('resetPassword', () => {
    it('should send password reset email successfully', async () => {
      mockSendPasswordResetEmail.mockResolvedValue()

      await resetPassword('test@example.com')

      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(auth, 'test@example.com')
    })

    it('should handle password reset error', async () => {
      const error = new Error('User not found')
      mockSendPasswordResetEmail.mockRejectedValue(error)

      await expect(resetPassword('test@example.com')).rejects.toThrow('User not found')
    })
  })

  describe('onAuthStateChange', () => {
    it('should set up auth state observer successfully', () => {
      const mockUnsubscribe = jest.fn()
      mockOnAuthStateChanged.mockReturnValue(mockUnsubscribe)
      const callback = jest.fn()

      const unsubscribe = onAuthStateChange(callback)

      expect(mockOnAuthStateChanged).toHaveBeenCalledWith(auth, callback)
      expect(unsubscribe).toBe(mockUnsubscribe)
    })

    it('should return unsubscribe function for demo mode', () => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('demoMode', 'true')
      }
      const callback = jest.fn()

      const unsubscribe = onAuthStateChange(callback)

      expect(typeof unsubscribe).toBe('function')
      expect(mockOnAuthStateChanged).not.toHaveBeenCalled()
    })
  })

  describe('getCurrentUser', () => {
    it('should return current user from Firebase', () => {
      const mockCurrentUser = { ...mockUser, uid: 'current-user-id' }
      ;(auth as any).currentUser = mockCurrentUser

      const result = getCurrentUser()

      expect(result).toEqual(mockCurrentUser)
    })

    it('should return null when no current user', () => {
      ;(auth as any).currentUser = null

      const result = getCurrentUser()

      expect(result).toBeNull()
    })

    it('should return demo user in demo mode', () => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('demoMode', 'true')
      }

      const result = getCurrentUser()

      expect(result).toEqual(expect.objectContaining({
        uid: 'demo-user-id',
        email: 'demo@example.com',
      }))
    })
  })
})
