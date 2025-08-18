import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Mock Firebase modules
jest.mock('firebase/app')
jest.mock('firebase/auth')
jest.mock('firebase/firestore')
jest.mock('firebase/storage')

const mockInitializeApp = initializeApp as jest.MockedFunction<typeof initializeApp>
const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>
const mockGetFirestore = getFirestore as jest.MockedFunction<typeof getFirestore>
const mockGetStorage = getStorage as jest.MockedFunction<typeof getStorage>

describe('Firebase Config', () => {
  const mockApp = {}
  const mockAuth = {}
  const mockDb = {}
  const mockStorage = {}

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    delete process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    delete process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    // Reset localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear()
    }
    // Clear console mocks
    jest.spyOn(console, 'warn').mockImplementation()
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Firebase Initialization', () => {
    it('should initialize Firebase with environment variables', async () => {
      // Set environment variables
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com'
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com'
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789'
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'test-app-id'
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = 'test-measurement-id'

      mockInitializeApp.mockReturnValue(mockApp)
      mockGetAuth.mockReturnValue(mockAuth)
      mockGetFirestore.mockReturnValue(mockDb)
      mockGetStorage.mockReturnValue(mockStorage)

      // Re-import the module to trigger initialization
      const { auth, db, storage } = await import('../config')

      expect(mockInitializeApp).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project',
        storageBucket: 'test-project.appspot.com',
        messagingSenderId: '123456789',
        appId: 'test-app-id',
        measurementId: 'test-measurement-id',
      })
      expect(mockGetAuth).toHaveBeenCalledWith(mockApp)
      expect(mockGetFirestore).toHaveBeenCalledWith(mockApp)
      expect(mockGetStorage).toHaveBeenCalledWith(mockApp)
      expect(auth).toBe(mockAuth)
      expect(db).toBe(mockDb)
      expect(storage).toBe(mockStorage)
    })

    it('should use default values when environment variables are not set', async () => {
      mockInitializeApp.mockReturnValue(mockApp)
      mockGetAuth.mockReturnValue(mockAuth)
      mockGetFirestore.mockReturnValue(mockDb)
      mockGetStorage.mockReturnValue(mockStorage)

      // Re-import the module to trigger initialization
      const { auth, db, storage } = await import('../config')

      expect(mockInitializeApp).toHaveBeenCalledWith({
        apiKey: 'demo_key',
        authDomain: 'demo.firebaseapp.com',
        projectId: 'demo-project',
        storageBucket: 'demo-project.appspot.com',
        messagingSenderId: '123456789',
        appId: 'demo_app_id',
        measurementId: 'demo_measurement_id',
      })
      expect(auth).toBe(mockAuth)
      expect(db).toBe(mockDb)
      expect(storage).toBe(mockStorage)
    })

    it('should handle Firebase initialization error in demo mode', async () => {
      // Set demo mode
      if (typeof window !== 'undefined') {
        localStorage.setItem('demoMode', 'true')
      }

      const error = new Error('Firebase initialization failed')
      mockInitializeApp.mockImplementation(() => {
        throw error
      })

      // Re-import the module to trigger initialization
      const { auth, db, storage } = await import('../config')

      expect(console.error).toHaveBeenCalledWith('Firebase initialization error:', error)
      expect(console.log).toHaveBeenCalledWith('Creating mock Firebase services for demo mode...')
      expect(auth).toEqual({})
      expect(db).toEqual({})
      expect(storage).toEqual({})
    })

    it('should throw error when Firebase initialization fails in non-demo mode', async () => {
      const error = new Error('Firebase initialization failed')
      mockInitializeApp.mockImplementation(() => {
        throw error
      })

      // Re-import the module to trigger initialization
      await expect(import('../config')).rejects.toThrow('Firebase initialization failed')
    })

    it('should detect demo mode from localStorage', async () => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('demoMode', 'true')
      }

      mockInitializeApp.mockReturnValue(mockApp)
      mockGetAuth.mockReturnValue(mockAuth)
      mockGetFirestore.mockReturnValue(mockDb)
      mockGetStorage.mockReturnValue(mockStorage)

      // Re-import the module to trigger initialization
      await import('../config')

      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Running in demo mode with placeholder Firebase configuration. For full functionality, please set up a real Firebase project.'
      )
    })

    it('should detect demo mode from missing API key', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = undefined

      mockInitializeApp.mockReturnValue(mockApp)
      mockGetAuth.mockReturnValue(mockAuth)
      mockGetFirestore.mockReturnValue(mockDb)
      mockGetStorage.mockReturnValue(mockStorage)

      // Re-import the module to trigger initialization
      await import('../config')

      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Running in demo mode with placeholder Firebase configuration. For full functionality, please set up a real Firebase project.'
      )
    })

    it('should detect demo mode from demo API key', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'demo_key'

      mockInitializeApp.mockReturnValue(mockApp)
      mockGetAuth.mockReturnValue(mockAuth)
      mockGetFirestore.mockReturnValue(mockDb)
      mockGetStorage.mockReturnValue(mockStorage)

      // Re-import the module to trigger initialization
      await import('../config')

      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Running in demo mode with placeholder Firebase configuration. For full functionality, please set up a real Firebase project.'
      )
    })
  })
})
