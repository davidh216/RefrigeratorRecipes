import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo_key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'demo_app_id',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'demo_measurement_id'
};

// Check if we're using demo configuration
const isDemoMode = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('demoMode') === 'true';
  }
  return !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'demo_key';
};

if (isDemoMode()) {
  console.warn('⚠️ Running in demo mode with placeholder Firebase configuration. For full functionality, please set up a real Firebase project.');
}

// Initialize Firebase
let app;
let auth;
let db;
let storage;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error('Firebase initialization error:', error);
  
  // Create mock objects for demo mode
  if (isDemoMode()) {
    console.log('Creating mock Firebase services for demo mode...');
    auth = {} as any;
    db = {} as any;
    storage = {} as any;
  } else {
    throw error;
  }
}

export { auth, db, storage };
export default app;