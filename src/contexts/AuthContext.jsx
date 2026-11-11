import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '../firebase';

const AuthContext = createContext({
  user: null,
  role: null, // 'admin' | 'judge' | 'coordinator' | 'participant'
  roleData: null,
  loading: true,
  error: null,
  isConfigured: false,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [roleData, setRoleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    let roleUnsubscribe = null;

    const authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setLoading(true);
      setError(null);

      // Clean up prior role listener
      if (roleUnsubscribe) {
        roleUnsubscribe();
        roleUnsubscribe = null;
      }

      if (currentUser && currentUser.email) {
        setUser(currentUser);
        const userEmail = currentUser.email.toLowerCase().trim();
        const roleDocRef = doc(db, 'roles', userEmail);

        // Real-time listener on the user's role document
        // This ensures that as soon as the doc is created/edited in Firebase Console, it updates immediately
        roleUnsubscribe = onSnapshot(
          roleDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const rawRole = (data.role || '').toLowerCase().trim();
              setRole(rawRole || 'participant');
              setRoleData(data);
            } else {
              setRole('participant');
              setRoleData(null);
            }
            setLoading(false);
          },
          (err) => {
            // If permission denied, the firestore.rules might need to be published in Firebase Console
            if (err.code === 'permission-denied') {
              setError('Firestore Permission Denied: Please check that you published the rules from firestore.rules in the Firebase Console Rules tab.');
            }
            setRole('participant');
            setRoleData(null);
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setRole(null);
        setRoleData(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (roleUnsubscribe) {
        roleUnsubscribe();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      setError('Firebase is not configured yet. Please check your .env configuration.');
      return;
    }
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);

      // Session Wipe: purge all local storage keys belonging to club_games
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('club_games_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        sessionStorage.clear();
      } catch (storageErr) {
        console.warn('Storage purge warning:', storageErr);
      }

      // Purge any custom cache storage entries (preserving static workbox precache)
      if ('caches' in window) {
        try {
          const cacheKeys = await window.caches.keys();
          await Promise.all(
            cacheKeys
              .filter((name) => !name.startsWith('workbox-precache'))
              .map((name) => window.caches.delete(name))
          );
        } catch (cacheErr) {
          console.warn('Cache purge warning:', cacheErr);
        }
      }

      setUser(null);
      setRole(null);
      setRoleData(null);
    } catch (err) {
      setError('Error signing out');
    }
  };

  const value = {
    user,
    role,
    roleData,
    loading,
    error,
    isConfigured: isFirebaseConfigured,
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
