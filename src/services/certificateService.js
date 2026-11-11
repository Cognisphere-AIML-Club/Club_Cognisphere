import { 
  doc, 
  onSnapshot, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Subscribe to the real-time certificate release switch in Firestore (settings/certificates)
 */
export function subscribeCertificateSettings(callback) {
  try {
    const docRef = doc(db, 'settings', 'certificates');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data());
        } else {
          // Default: locked (disabled)
          callback({ enabled: false });
        }
      },
      (error) => {
        console.warn('Certificate settings snapshot error (defaulting to locked):', error.message);
        callback({ enabled: false });
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to certificate settings:', err);
    callback({ enabled: false });
    return () => {};
  }
}

/**
 * Toggle the global certificate killswitch (Admin only)
 */
export async function toggleCertificateRelease(enabled, adminEmail = 'admin') {
  const docRef = doc(db, 'settings', 'certificates');
  await setDoc(docRef, {
    enabled: Boolean(enabled),
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail
  }, { merge: true });
}

/**
 * Fetch all attendance records for a specific participant
 */
export async function fetchUserAttendance(userId) {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, 'attendance'),
      where('participantId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate ? d.data().timestamp.toDate() : new Date()
    }));
  } catch (err) {
    console.warn('Failed to fetch user attendance for certificates:', err.message);
    return [];
  }
}

/**
 * Fetch all scores/ranks won by a specific participant
 */
export async function fetchUserScores(userId) {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, 'scores'),
      where('participantId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
  } catch (err) {
    console.warn('Failed to fetch user scores for certificates:', err.message);
    return [];
  }
}

