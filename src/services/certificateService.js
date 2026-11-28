import { 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteField,
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Deterministic short hash helper for email/name based IDs
 */
function shortStableHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
}

/**
 * Deterministic Certificate ID builder shared across participation, winner, and coordinator certificates.
 */
export function buildCertificateId({
  activityId = 'EVT',
  attendanceId = '',
  participantId = '',
  certId = '',
  certType = 'participation',
  email = '',
  usn = ''
}) {
  if (certId && typeof certId === 'string' && certId.trim()) {
    return certId.trim();
  }
  if (certType === 'coordinator') {
    const cleanUsn = (usn || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const seed = (email || participantId || attendanceId || 'COORD').trim().toLowerCase();
    const suffix = cleanUsn ? cleanUsn.slice(-6).padStart(6, '0') : shortStableHash(seed);
    return `IGNITE26-COORD-${suffix}`;
  }
  const actCode = (activityId || 'EVT').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'EVT';
  if (certType === 'winner') {
    const cleanUsn = (usn || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const seed = `${activityId}_${participantId || attendanceId || email || 'WIN'}`.trim().toLowerCase();
    const suffix = cleanUsn ? cleanUsn.slice(-6).padStart(6, '0') : shortStableHash(seed);
    return `IGNITE26-WIN-${actCode}-${suffix}`;
  }
  const rawId = attendanceId || participantId || usn || email || 'USER';
  const userSuffix = rawId.replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase() || shortStableHash(String(rawId));
  return `IGNITE26-${actCode}-${userSuffix}`;
}

/**
 * Build an "Add to LinkedIn Profile" (Licenses & Certifications) URL
 */
export function buildAddToLinkedInProfileUrl({
  certName,
  certId,
  verifyUrl,
  issueYear = 2026,
  issueMonth = 11
}) {
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: certName || 'IGNITE 2026 Official Certificate',
    organizationName: 'Cognisphere - AI & ML Club, Sambhram Institute of Technology',
    issueYear: String(issueYear),
    issueMonth: String(issueMonth),
    ...(verifyUrl ? { certUrl: verifyUrl } : {}),
    ...(certId ? { certId } : {})
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

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
 * Generate a 32-character cryptographically strong API secret key for Apps Script
 */
export function generateMailerApiKey() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`.slice(0, 32);
}

/**
 * Subscribe to private Club Gmail Apps Script credentials (Admin/Coordinator only in Firestore rules)
 */
export function subscribePrivateMailerConfig(callback) {
  try {
    const docRef = doc(db, 'privateSettings', 'mailer');
    return onSnapshot(
      docRef,
      (snap) => {
        callback(snap.exists() ? snap.data() : {});
      },
      (err) => {
        console.warn('Private mailer config notice:', err?.message);
        callback({});
      }
    );
  } catch (err) {
    callback({});
    return () => {};
  }
}

/**
 * Save Club Official Gmail Apps Script Web App URL, Secret API Key & Public Site Domain in privateSettings/mailer
 */
export async function savePrivateMailerConfig({ mailerWebAppUrl, mailerApiKey, publicBaseUrl = '' }, adminEmail = 'admin') {
  const cleanUrl = (mailerWebAppUrl || '').trim();
  const cleanKey = (mailerApiKey || '').trim();
  const cleanSiteUrl = (publicBaseUrl || '').trim().replace(/\/+$/, '');
  if (!cleanKey) {
    throw new Error('API Secret Key is required.');
  }

  const privateRef = doc(db, 'privateSettings', 'mailer');
  await setDoc(privateRef, {
    mailerWebAppUrl: cleanUrl,
    mailerApiKey: cleanKey,
    ...(cleanSiteUrl ? { publicBaseUrl: cleanSiteUrl } : {}),
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail
  }, { merge: true });

  // Clean up any legacy unauthenticated URL stored in public settings/certificates
  try {
    await setDoc(doc(db, 'settings', 'certificates'), {
      mailerWebAppUrl: deleteField()
    }, { merge: true });
  } catch (_) {}

  return { mailerWebAppUrl: cleanUrl, mailerApiKey: cleanKey, publicBaseUrl: cleanSiteUrl };
}

/**
 * Mark a certificate record as emailed in Firestore
 */
export async function markCertificateEmailSent(certId, sentToEmail = '') {
  if (!certId) return;
  try {
    const certRef = doc(db, 'certificates', certId);
    await setDoc(certRef, {
      emailSentAt: serverTimestamp(),
      ...(sentToEmail ? { emailSentTo: sentToEmail.trim().toLowerCase() } : {})
    }, { merge: true });
  } catch (err) {
    console.warn('Email sent status update notice:', err?.message);
  }
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

  // 2. Query by participantUsn across both attendance & unregisteredParticipants (if available)
  const cleanUsn = userUsn ? userUsn.trim().toUpperCase() : null;
  if (cleanUsn) {
    ['attendance', 'unregisteredParticipants'].forEach((colName) => {
      try {
        const qUsn = query(
          collection(db, colName),
          where('participantUsn', '==', cleanUsn)
        );
        const unsubUsn = onSnapshot(qUsn, (snap) => {
          snap.docs.forEach(d => {
            const data = d.data();
            attendanceMap.set(`${colName}_${d.id}`, {
              id: d.id,
              ...data,
              timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.scannedAt || Date.now())
            });
          });
          updateCallback();
        }, (err) => {
          console.warn(`${colName} subscription (USN) error:`, err.message);
        });
        unsubs.push(unsubUsn);
      } catch (e) {
        console.warn(`Failed to listen to ${colName} by USN:`, e);
      }
    });
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
      const cleanUsn = userUsn.trim().toUpperCase();
      for (const colName of ['attendance', 'unregisteredParticipants']) {
        const q2 = query(
          collection(db, colName),
          where('participantUsn', '==', cleanUsn)
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
  participantUsn = '',
  participantEmail = '',
  activityId = '',
  activityName = '',
  verifyUrl = '',
  certType = 'participation',
  rank = null,
  rankLabel = ''
}) {
  if (!certId || !participantId) return null;
  try {
    const certRef = doc(db, 'certificates', certId);
    const dataToSave = {
      certId,
      certType: certType || 'participation',
      participantId,
      participantName: (participantName || 'Participant').trim(),
      ...(participantUsn ? { participantUsn: participantUsn.trim().toUpperCase() } : {}),
      ...(participantEmail ? { participantEmail: participantEmail.trim().toLowerCase() } : {}),
      activityId: activityId || '',
      activityName: activityName || '',
      ...(rank ? { rank } : {}),
      ...(rankLabel ? { rankLabel } : {}),
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
 * Real-time subscription to Coordinator certificates issued for the logged-in user
 * Matches by participantId (UID), participantEmail, or participantUsn.
 */
export function subscribeUserCoordinatorCertificates({ userId, userEmail, userUsn } = {}, callback) {
  const cleanUid = (userId || '').trim();
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  const cleanUsn = (userUsn || '').trim().toUpperCase();

  if (!cleanUid && !cleanEmail && !cleanUsn) {
    callback([]);
    return () => {};
  }

  const certMap = new Map();
  const emit = () => callback(Array.from(certMap.values()));
  const unsubs = [];

  const attachQuery = (field, value) => {
    try {
      const q = query(collection(db, 'certificates'), where(field, '==', value));
      const unsub = onSnapshot(q, (snap) => {
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data.certType === 'coordinator') {
            certMap.set(d.id, {
              id: d.id,
              ...data,
              issuedAt: data.issuedAt?.toDate ? data.issuedAt.toDate() : null
            });
          }
        });
        emit();
      }, (err) => console.warn(`Coordinator cert subscription (${field}) notice:`, err?.message));
      unsubs.push(unsub);
    } catch (_) {}
  };

  if (cleanUid) attachQuery('participantId', cleanUid);
  if (cleanEmail) attachQuery('participantEmail', cleanEmail);
  if (cleanUsn) attachQuery('participantUsn', cleanUsn);

  return () => {
    unsubs.forEach((u) => {
      try { u(); } catch (_) {}
    });
  };
}

/**
 * Subscribe to all issued certificates in the registry (Admin / Staff lookup)
 */
export function subscribeAllIssuedCertificates(callback) {
  try {
    const colRef = collection(db, 'certificates');
    return onSnapshot(colRef, (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        map[d.id] = { id: d.id, ...d.data() };
      });
      callback(map);
    }, (err) => {
      console.warn('All certificates subscription notice:', err?.message);
      callback({});
    });
  } catch (err) {
    callback({});
    return () => {};
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

