import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB5m2YUUitGtOaA-8elOlhqSuBy-hndFlQ',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'cognisphere-56148.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'cognisphere-56148',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'cognisphere-56148.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '325611672186',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:325611672186:web:95458a4ae0821e456c21c3',
};

// Check if Firebase config is populated with valid values
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'your_api_key_here' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'your_project_id'
);

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
}

export { app, auth, db, googleProvider };

