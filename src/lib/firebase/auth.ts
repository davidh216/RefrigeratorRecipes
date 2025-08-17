import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { auth } from './config';

// Check if we're in demo mode
const isDemoMode = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('demoMode') === 'true';
  }
  return !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo_key';
};

// Google provider
const googleProvider = new GoogleAuthProvider();

// Demo user for testing
const demoUser: User = {
  uid: 'demo-user-id',
  email: 'demo@example.com',
  displayName: 'Demo User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {} as any,
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'demo-token',
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
  phoneNumber: null,
  providerId: 'password'
};

// Sign up with email and password
export const signUp = async (email: string, password: string, displayName?: string): Promise<User> => {
  if (isDemoMode()) {
    console.log('Demo mode: Simulating sign up');
    return demoUser;
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    return userCredential.user;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

// Sign in with email and password
export const signIn = async (email: string, password: string): Promise<User> => {
  if (isDemoMode()) {
    console.log('Demo mode: Simulating sign in');
    return demoUser;
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<User> => {
  if (isDemoMode()) {
    console.log('Demo mode: Simulating Google sign in');
    return demoUser;
  }
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  if (isDemoMode()) {
    console.log('Demo mode: Simulating sign out');
    return;
  }
  
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<void> => {
  if (isDemoMode()) {
    console.log('Demo mode: Simulating password reset');
    return;
  }
  
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
};

// Auth state observer
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  if (isDemoMode()) {
    console.log('Demo mode: Setting up demo auth state');
    // Simulate auth state change
    setTimeout(() => callback(demoUser), 1000);
    return () => {}; // Return unsubscribe function
  }
  
  return onAuthStateChanged(auth, callback);
};

// Get current user
export const getCurrentUser = (): User | null => {
  if (isDemoMode()) {
    return demoUser;
  }
  return auth.currentUser;
};