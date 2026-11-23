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
 * Real-time subscription to attendance records for a participant
 * Queries both by participantId (userId) and participantUsn (USN) to ensure 100% coverage
 */
export function subscribeUserAttendance(userId, userUsn, callback) {
  if (!userId && !userUsn) {
    callback([]);
    return () => {};
  }

  const attendanceMap = new Map();

  const updateCallback = () => {
    // Deduplicate by activityId so each activity appears only once (prevents duplicate certificates)
    const eventMap = new Map();
    Array.from(attendanceMap.values()).forEach(record => {
      const actKey = (record.activityId || record.passActivityId || record.id || '').trim().toLowerCase();
      if (!eventMap.has(actKey)) {
        eventMap.set(actKey, record);
      } else {
        const existing = eventMap.get(actKey);
        const timeA = existing.timestamp?.getTime ? existing.timestamp.getTime() : 0;
        const timeB = record.timestamp?.getTime ? record.timestamp.getTime() : 0;
        if (timeB && (!timeA || timeB < timeA)) {
          eventMap.set(actKey, record);
        }
      }
    });

    const list = Array.from(eventMap.values()).sort((a, b) => {
      const timeA = a.timestamp?.getTime ? a.timestamp.getTime() : 0;
      const timeB = b.timestamp?.getTime ? b.timestamp.getTime() : 0;
      return timeB - timeA;
    });
    callback(list);
  };

  const unsubs = [];

  // 1. Primary query by participantId (User UID)
  if (userId) {
    try {
      const qUid = query(
        collection(db, 'attendance'),
        where('participantId', '==', userId)
      );
      const unsubUid = onSnapshot(qUid, (snap) => {
        snap.docs.forEach(d => {
          const data = d.data();
          attendanceMap.set(d.id, {
            id: d.id,
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.scannedAt || Date.now())
          });
        });
        updateCallback();
      }, (err) => {
        console.warn('Attendance subscription (UID) error:', err.message);
      });
      unsubs.push(unsubUid);
    } catch (e) {
      console.warn('Failed to listen to attendance by UID:', e);
    }
  }

  // 2. Query by participantUsn (if available)
  const cleanUsn = userUsn ? userUsn.trim().toUpperCase() : null;
  if (cleanUsn) {
    try {
      const qUsn = query(
        collection(db, 'attendance'),
        where('participantUsn', '==', cleanUsn)
      );
      const unsubUsn = onSnapshot(qUsn, (snap) => {
        snap.docs.forEach(d => {
          const data = d.data();
          attendanceMap.set(d.id, {
            id: d.id,
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.scannedAt || Date.now())
          });
        });
        updateCallback();
      }, (err) => {
        console.warn('Attendance subscription (USN) error:', err.message);
      });
      unsubs.push(unsubUsn);
    } catch (e) {
      console.warn('Failed to listen to attendance by USN:', e);
    }
  }

  return () => {
    unsubs.forEach(u => {
      try { u(); } catch (_) {}
    });
  };
}

/**
 * Real-time subscription to scores/ranks won by a specific participant
 */
export function subscribeUserScores(userId, userUsn, callback) {
  if (!userId && !userUsn) {
    callback([]);
    return () => {};
  }

  const scoresMap = new Map();
  const updateCallback = () => {
    callback(Array.from(scoresMap.values()));
  };

  const unsubs = [];

  if (userId) {
    try {
      const qUid = query(collection(db, 'scores'), where('participantId', '==', userId));
      const unsub = onSnapshot(qUid, (snap) => {
        snap.docs.forEach(d => scoresMap.set(d.id, { id: d.id, ...d.data() }));
        updateCallback();
      }, (err) => console.warn('Scores subscription (UID) error:', err.message));
      unsubs.push(unsub);
    } catch (_) {}
  }

  const cleanUsn = userUsn ? userUsn.trim().toUpperCase() : null;
  if (cleanUsn) {
    try {
      const qUsn = query(collection(db, 'scores'), where('participantUsn', '==', cleanUsn));
      const unsub = onSnapshot(qUsn, (snap) => {
        snap.docs.forEach(d => scoresMap.set(d.id, { id: d.id, ...d.data() }));
        updateCallback();
      }, (err) => console.warn('Scores subscription (USN) error:', err.message));
      unsubs.push(unsub);
    } catch (_) {}
  }

  return () => {
    unsubs.forEach(u => {
      try { u(); } catch (_) {}
    });
  };
}

/**
 * Fetch all attendance records for a specific participant
 */
export async function fetchUserAttendance(userId, userUsn = null) {
  if (!userId && !userUsn) return [];
  try {
    const list = [];
    const seen = new Set();

    if (userId) {
      const q1 = query(
        collection(db, 'attendance'),
        where('participantId', '==', userId)
      );
      const snap1 = await getDocs(q1);
      snap1.docs.forEach(d => {
        seen.add(d.id);
        list.push({
          id: d.id,
          ...d.data(),
          timestamp: d.data().timestamp?.toDate ? d.data().timestamp.toDate() : new Date(d.data().scannedAt || Date.now())
        });
      });
    }

    if (userUsn) {
      const q2 = query(
        collection(db, 'attendance'),
        where('participantUsn', '==', userUsn.trim().toUpperCase())
      );
      const snap2 = await getDocs(q2);
      snap2.docs.forEach(d => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          list.push({
            id: d.id,
            ...d.data(),
            timestamp: d.data().timestamp?.toDate ? d.data().timestamp.toDate() : new Date(d.data().scannedAt || Date.now())
          });
        }
      });
    }

    return list;
  } catch (err) {
    console.warn('Failed to fetch user attendance for certificates:', err.message);
    return [];
  }
}

/**
 * Fetch all scores/ranks won by a specific participant
 */
export async function fetchUserScores(userId, userUsn = null) {
  if (!userId && !userUsn) return [];
  try {
    const list = [];
    const seen = new Set();

    if (userId) {
      const q1 = query(
        collection(db, 'scores'),
        where('participantId', '==', userId)
      );
      const snap1 = await getDocs(q1);
      snap1.docs.forEach(d => {
        seen.add(d.id);
        list.push({ id: d.id, ...d.data() });
      });
    }

    if (userUsn) {
      const q2 = query(
        collection(db, 'scores'),
        where('participantUsn', '==', userUsn.trim().toUpperCase())
      );
      const snap2 = await getDocs(q2);
      snap2.docs.forEach(d => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          list.push({ id: d.id, ...d.data() });
        }
      });
    }

    return list;
  } catch (err) {
    console.warn('Failed to fetch user scores for certificates:', err.message);
    return [];
  }
}

/**
 * Record or verify an issued certificate in Firestore certificates collection
 * Lightweight record containing short metadata for validation.
 */
export async function recordCertificateIssuance({
  certId,
  participantId,
  participantName,
  activityId,
  activityName,
  verifyUrl
}) {
  if (!certId || !participantId) return null;
  try {
    const certRef = doc(db, 'certificates', certId);
    const dataToSave = {
      certId,
      participantId,
      participantName: (participantName || 'Participant').trim(),
      activityId: activityId || '',
      activityName: activityName || '',
      verifyUrl: verifyUrl || '',
      event: 'IGNITE-2026',
      issuer: 'Cognisphere - AI & ML Club, Sambhram Institute of Technology',
      dates: '24 - 25 November, 2026',
      status: 'verified',
      issuedAt: serverTimestamp()
    };
    await setDoc(certRef, dataToSave, { merge: true });
    return dataToSave;
  } catch (err) {
    console.warn('Certificate issuance tracking notice:', err.message);
    return null;
  }
}

/**
 * Verify a certificate by its unique Certificate ID (Public verification)
 */
export async function verifyCertificateById(certId) {
  if (!certId) return { exists: false, error: 'No certificate ID provided' };
  try {
    const { getDoc } = await import('firebase/firestore');
    const certRef = doc(db, 'certificates', certId.trim());
    const snap = await getDoc(certRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        exists: true,
        data: {
          ...data,
          issuedAt: data.issuedAt?.toDate ? data.issuedAt.toDate() : new Date()
        }
      };
    }
    return { exists: false, error: 'Certificate not found in registry' };
  } catch (err) {
    console.warn('Certificate verification lookup failed:', err.message);
    return { exists: false, error: err.message };
  }
}

