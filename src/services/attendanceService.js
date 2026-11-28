import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  serverTimestamp, 
  query, 
  where, 
  limit,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { ACTIVITIES } from '../data/activities';
import { buildCertificateId, recordCertificateIssuance } from './certificateService';
import { getParticipantDetails, lookupParticipantProfile } from './coordinatorConfigService';

const QUEUE_STORAGE_KEY = 'club_games_offline_attendance_queue';

/**
 * Get locally queued offline attendance scans
 */
export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save record to offline queue
 */
function queueScanOffline(record) {
  try {
    const currentQueue = getOfflineQueue();
    const exists = currentQueue.some(
      item => item.activityId === record.activityId && item.participantId === record.participantId
    );
    if (!exists) {
      currentQueue.push({
        ...record,
        queuedAt: new Date().toISOString()
      });
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(currentQueue));
    }
    return currentQueue.length;
  } catch (e) {
    return 0;
  }
}

/**
 * Resolve participant by QR code ID.
 * Supports both game-specific passes (`{activityId}_{qrId}`) and universal pass IDs (`{qrId}`).
 */
export async function resolveParticipantByQr(rawQrText) {
  if (!rawQrText) throw new Error('Invalid QR code');

  const text = rawQrText.trim();
  let cleanQrId = text;
  let passActivityId = null;

  // Check if QR is formatted as {activityId}_{qrId}
  if (text.includes('_')) {
    const firstUnderscoreIdx = text.indexOf('_');
    const potentialActivityId = text.substring(0, firstUnderscoreIdx);
    const matchesActivity = ACTIVITIES.some(a => a.id === potentialActivityId);

    if (matchesActivity) {
      passActivityId = potentialActivityId;
      cleanQrId = text.substring(firstUnderscoreIdx + 1);
    }
  }

  // 1. Look up in qrPasses collection (public for coordinators, no PII)
  const passDocRef = doc(db, 'qrPasses', cleanQrId);
  const passSnap = await getDoc(passDocRef);

  if (passSnap.exists()) {
    const data = passSnap.data();
    const isExpired = Boolean(data.isExpired || data.status === 'expired');
    return {
      participantId: data.participantId,
      name: data.name,
      usn: data.usn || '',
      qrId: cleanQrId,
      passActivityId: data.activityId || passActivityId,
      isExpired,
      expiredReason: data.expiredReason || (isExpired ? `Pass expired: A newer QR pass was generated for USN ${data.usn || 'this participant'}.` : null),
      status: isExpired ? 'expired' : 'active',
    };
  }

  // 2. Fallback query on participants (for legacy passes)
  try {
    const q = query(collection(db, 'participants'), where('qrId', '==', cleanQrId), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const pDoc = snap.docs[0];
      const pData = pDoc.data();

      // Check if a newer pass exists for this USN + game in activeGamePasses
      let isExpired = false;
      let expiredReason = null;
      if (pData.usn && passActivityId) {
        try {
          const mapSnap = await getDoc(doc(db, 'activeGamePasses', `${pData.usn}_${passActivityId}`));
          if (mapSnap.exists() && mapSnap.data().activeQrId !== cleanQrId) {
            isExpired = true;
            expiredReason = `Pass expired: A newer QR pass was generated for USN ${pData.usn}.`;
          }
        } catch (_) {}
      }

      return {
        participantId: pDoc.id,
        name: pData.name || `${pData.firstName || ''} ${pData.lastName || ''}`.trim(),
        usn: pData.usn || '',
        qrId: cleanQrId,
        passActivityId,
        isExpired,
        expiredReason,
        status: isExpired ? 'expired' : 'active',
      };
    }
  } catch (e) {}

  throw new Error('Unregistered QR pass. Participant not found.');
}

/**
 * Record attendance for a participant in an activity
 * Enforces atomic deduplication key: {activityId}_{participantId}
 */
export async function markAttendance({ activityId, participantId, participantName, participantUsn, scannedBy, passActivityId = null }) {
  if (!activityId || !participantId) {
    throw new Error('Activity ID and Participant ID are required');
  }

  const attendanceDocId = `${activityId}_${participantId}`;
  const docRef = doc(db, 'attendance', attendanceDocId);

  // If offline, queue directly
  if (!navigator.onLine) {
    const record = {
      id: attendanceDocId,
      activityId,
      participantId,
      participantName: participantName || 'Participant',
      participantUsn: participantUsn || '',
      scannedBy: scannedBy || 'coordinator',
      clientTimestamp: new Date().toISOString()
    };
    const queueCount = queueScanOffline(record);
    return {
      status: 'queued_offline',
      message: 'Network offline. Attendance saved to device queue.',
      queueCount,
      participantName,
      participantUsn
    };
  }

  try {
    // Check if already marked present by document ID
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      return {
        status: 'already_marked',
        message: 'Already marked present for this activity.',
        record: data,
        participantName: data.participantName || participantName,
        participantUsn: data.participantUsn || participantUsn
      };
    }

    // Also check if already marked with participantUsn (prevents UID vs USN duplicate records)
    if (participantUsn) {
      try {
        const qUsn = query(
          collection(db, 'attendance'),
          where('activityId', '==', activityId),
          where('participantUsn', '==', participantUsn.trim().toUpperCase()),
          limit(1)
        );
        const usnSnap = await getDocs(qUsn);
        if (!usnSnap.empty) {
          const data = usnSnap.docs[0].data();
          return {
            status: 'already_marked',
            message: 'Already marked present for this activity.',
            record: data,
            participantName: data.participantName || participantName,
            participantUsn: data.participantUsn || participantUsn
          };
        }
      } catch (err) {
        console.warn('USN attendance duplicate check notice:', err);
      }
    }

    // Atomic insert
    const newRecord = {
      id: attendanceDocId,
      activityId,
      participantId,
      participantName: participantName || 'Participant',
      participantUsn: participantUsn || '',
      scannedBy: scannedBy || 'coordinator',
      passActivityId: passActivityId || activityId,
      timestamp: serverTimestamp(),
      scannedAt: new Date().toISOString()
    };

    await setDoc(docRef, newRecord);

    return {
      status: 'marked_present',
      message: 'Marked present successfully!',
      record: newRecord,
      participantName: newRecord.participantName,
      participantUsn: newRecord.participantUsn,
      passActivityId
    };
  } catch (err) {
    // If network dropped during write, queue offline
    const record = {
      id: attendanceDocId,
      activityId,
      participantId,
      participantName: participantName || 'Participant',
      participantUsn: participantUsn || '',
      scannedBy: scannedBy || 'coordinator',
      clientTimestamp: new Date().toISOString()
    };
    const queueCount = queueScanOffline(record);
    return {
      status: 'queued_offline',
      message: 'Connection interrupted. Attendance saved to offline queue.',
      queueCount,
      participantName,
      participantUsn
    };
  }
}

/**
 * Flush all offline scans when internet connectivity returns
 */
export async function syncOfflineQueue() {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  const remaining = [];
  let synced = 0;

  for (const item of queue) {
    try {
      const docRef = doc(db, 'attendance', item.id);
      const existingSnap = await getDoc(docRef);
      if (!existingSnap.exists()) {
        await setDoc(docRef, {
          id: item.id,
          activityId: item.activityId,
          participantId: item.participantId,
          participantName: item.participantName,
          participantUsn: item.participantUsn,
          scannedBy: item.scannedBy,
          timestamp: serverTimestamp(),
          scannedAt: item.clientTimestamp || new Date().toISOString()
        });
      }
      synced++;
    } catch (err) {
      remaining.push(item);
    }
  }

  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remaining));
  } catch (e) {}

  return { synced, remaining: remaining.length };
}

/**
 * Manual search fallback by USN or Name for Coordinator desk.
 * Strictly verifies that the participant belongs to the room & activity selected in the top dropdown.
 * If they do not belong to selectedActivityId, they are not returned.
 */
export async function searchParticipantsForCoordinator(searchTerm, selectedActivityId = null) {
  if (!searchTerm || searchTerm.trim().length < 2) return [];

  const term = searchTerm.trim().toUpperCase();
  const participantMap = new Map();

  // 1. Primary lookup: passRequests for the selected activity
  // This indexes all participants who registered or were approved for THIS activity/room.
  if (selectedActivityId) {
    try {
      const q = query(
        collection(db, 'passRequests'),
        where('activityId', '==', selectedActivityId)
      );
      const reqSnap = await getDocs(q);

      reqSnap.forEach(docSnap => {
        const data = docSnap.data();
        // Ignore rejected requests
        if (data.status === 'rejected') return;

        const nameUpper = (data.participantName || '').toUpperCase();
        const usnUpper = (data.participantUsn || '').toUpperCase();

        if (usnUpper.includes(term) || nameUpper.includes(term)) {
          const participantId = data.participantId;
          participantMap.set(participantId, {
            participantId,
            name: data.participantName || 'Participant',
            usn: data.participantUsn || '',
            qrId: `${selectedActivityId}_${participantId}`,
            passActivityId: selectedActivityId,
            status: data.status || 'pending',
          });
        }
      });
    } catch (err) {
      console.warn('passRequests query notice in coordinator search:', err);
    }
  }

  // 2. Secondary lookup: qrPasses collection
  // Only include passes that belong to selectedActivityId (or resolve their active qrId)
  try {
    const passesSnap = await getDocs(collection(db, 'qrPasses'));

    passesSnap.forEach(docSnap => {
      const data = docSnap.data();

      // If an activity is selected, STRICTLY exclude passes from another activity
      if (selectedActivityId && data.activityId && data.activityId !== selectedActivityId) {
        return;
      }

      // Ignore expired passes
      if (data.isExpired || data.status === 'expired') {
        return;
      }

      const nameUpper = (data.name || '').toUpperCase();
      const usnUpper = (data.usn || '').toUpperCase();

      if (usnUpper.includes(term) || nameUpper.includes(term)) {
        const pId = data.participantId;
        if (participantMap.has(pId)) {
          // Update existing with the exact active qrId from qrPasses
          const existing = participantMap.get(pId);
          if (data.qrId) existing.qrId = data.qrId;
          if (data.status) existing.status = data.status;
        } else if (!selectedActivityId || data.activityId === selectedActivityId) {
          // Only add if it explicitly matches selectedActivityId
          participantMap.set(pId, {
            participantId: pId,
            name: data.name || 'Participant',
            usn: data.usn || '',
            qrId: data.qrId || docSnap.id,
            passActivityId: data.activityId || selectedActivityId,
            status: data.status || 'active',
          });
        }
      }
    });
  } catch (err) {
    console.warn('qrPasses query notice in coordinator search:', err);
  }

  return Array.from(participantMap.values()).slice(0, 10);
}

/**
 * Real-time listener for attendance records of a specific participant
 */
export function subscribeToUserAttendance(participantId, callback) {
  if (!participantId) {
    callback({});
    return () => {};
  }

  const q = query(
    collection(db, 'attendance'),
    where('participantId', '==', participantId)
  );

  return onSnapshot(q, (snapshot) => {
    const map = {};
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      map[data.activityId] = { id: docSnap.id, ...data };
    });
    callback(map);
  }, (err) => {
    console.warn('subscribeToUserAttendance notice:', err);
    callback({});
  });
}

/**
 * Shared real-time snapshot helper for attendance collections
 */
function subscribeAttendanceCollection(colName, callback, extraFields = {}) {
  const colRef = collection(db, colName);
  return onSnapshot(colRef, (snapshot) => {
    const list = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let ts = null;
      if (data.timestamp?.toDate) {
        ts = data.timestamp.toDate();
      } else if (data.scannedAt) {
        ts = new Date(data.scannedAt);
      } else if (data.clientTimestamp) {
        ts = new Date(data.clientTimestamp);
      } else {
        ts = new Date();
      }

      list.push({
        id: docSnap.id,
        ...data,
        ...extraFields,
        timestamp: ts
      });
    });

    list.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
      return timeB - timeA;
    });

    callback(list);
  }, (err) => {
    console.warn(`subscribe(${colName}) notice:`, err);
    callback([]);
  });
}

/**
 * Real-time listener for all registered attendance records across all activities
 */
export function subscribeToAllAttendance(callback) {
  return subscribeAttendanceCollection('attendance', callback);
}

/**
 * Real-time listener for all unregistered / walk-in participant records
 */
export function subscribeToUnregisteredParticipants(callback) {
  return subscribeAttendanceCollection('unregisteredParticipants', callback, {
    isUnregistered: true
  });
}

/**
 * Deterministic short hash for walk-in names lacking a USN
 */
function shortNameHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
}

/**
 * Add an unregistered (walk-in) participant to the separate `unregisteredParticipants`
 * collection AND immediately issue their verifiable certificate record.
 */
export async function addUnregisteredParticipant({
  activityId,
  activityName = '',
  participantName,
  participantUsn = '',
  participantEmail = '',
  addedBy = 'admin',
  origin = '',
  participantsMap = null
}) {
  const cleanName = (participantName || '').trim();
  let cleanUsn = (participantUsn || '').trim().toUpperCase();
  let cleanEmail = (participantEmail || '').trim().toLowerCase();

  if (!activityId) throw new Error('Activity selection is required.');
  if (!cleanName) throw new Error('Participant name is required.');

  // Pull missing USN or email from `participents` / `participants` collections if available
  if (!cleanUsn || !cleanEmail) {
    let matched = lookupParticipantProfile(participantsMap, {
      usn: cleanUsn,
      email: cleanEmail,
      name: cleanName
    });
    if (!matched || (!matched.usn && !cleanUsn) || (!matched.email && !cleanEmail)) {
      const dbMatch = await getParticipantDetails({
        usn: cleanUsn || matched?.usn || '',
        email: cleanEmail || matched?.email || '',
        name: cleanName
      });
      if (dbMatch) {
        matched = {
          ...(matched || {}),
          ...dbMatch,
          usn: matched?.usn || dbMatch.usn || '',
          email: matched?.email || dbMatch.email || ''
        };
      }
    }
    if (matched) {
      if (!cleanUsn && matched.usn) cleanUsn = String(matched.usn).trim().toUpperCase();
      if (!cleanEmail && matched.email) cleanEmail = String(matched.email).trim().toLowerCase();
    }
  }

  const actObj = ACTIVITIES.find(a => a.id === activityId);
  const resolvedActivityName = (activityName || actObj?.name || activityId).trim();

  const key = cleanUsn
    ? cleanUsn.replace(/[^A-Z0-9]/g, '')
    : `${cleanName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'WALKIN'}${shortNameHash(cleanName.toUpperCase())}`;

  const docId = `${activityId}_WALKIN_${key}`;
  const participantId = `walkin_${key}`;
  const docRef = doc(db, 'unregisteredParticipants', docId);

  // Check if already recorded in unregisteredParticipants
  const existingUnregSnap = await getDoc(docRef);
  if (existingUnregSnap.exists()) {
    const existing = existingUnregSnap.data();
    return {
      status: 'already_marked',
      message: `${cleanName} (${cleanUsn || 'Walk-In'}) is already recorded for ${resolvedActivityName}.`,
      record: existing,
      certId: existing.certId
    };
  }

  // Also check if already checked in as a registered participant (when USN is provided)
  if (cleanUsn) {
    const qReg = query(
      collection(db, 'attendance'),
      where('activityId', '==', activityId),
      where('participantUsn', '==', cleanUsn),
      limit(1)
    );
    const regSnap = await getDocs(qReg);
    if (!regSnap.empty) {
      const regData = regSnap.docs[0].data();
      return {
        status: 'already_marked',
        message: `${cleanUsn} is already present in registered attendance for ${resolvedActivityName}.`,
        record: regData
      };
    }
  }

  const certId = buildCertificateId({
    activityId,
    attendanceId: docId,
    participantId
  });
  const baseOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const verifyUrl = `${baseOrigin}/verify?id=${encodeURIComponent(certId)}`;

  const newRecord = {
    id: docId,
    activityId,
    activityName: resolvedActivityName,
    participantId,
    participantName: cleanName,
    participantUsn: cleanUsn,
    participantEmail: cleanEmail,
    scannedBy: addedBy || 'admin',
    passActivityId: activityId,
    isUnregistered: true,
    source: 'unregistered',
    certId,
    verifyUrl,
    timestamp: serverTimestamp(),
    scannedAt: new Date().toISOString()
  };

  await setDoc(docRef, newRecord);

  // Immediately record verifiable certificate document so /verify?id=... & PNG/PDF download work right away
  await recordCertificateIssuance({
    certId,
    participantId,
    participantName: cleanName,
    participantUsn: cleanUsn,
    participantEmail: cleanEmail,
    activityId,
    activityName: resolvedActivityName,
    verifyUrl
  });

  return {
    status: 'added',
    message: `Added ${cleanName} and issued certificate ${certId}.`,
    record: newRecord,
    certId,
    verifyUrl
  };
}

/**
 * Bulk add multiple unregistered participants for an activity
 */
export async function addBulkUnregisteredParticipants({
  activityId,
  activityName = '',
  participants = [],
  addedBy = 'admin',
  origin = '',
  participantsMap = null
}) {
  const results = { added: [], alreadyMarked: [], failed: [] };

  for (const p of participants) {
    const name = (p.participantName || p.name || '').trim();
    if (!name) continue;
    try {
      const res = await addUnregisteredParticipant({
        activityId,
        activityName,
        participantName: name,
        participantUsn: p.participantUsn || p.usn || '',
        participantEmail: p.participantEmail || p.email || '',
        addedBy,
        origin,
        participantsMap
      });
      if (res.status === 'added') {
        results.added.push(res);
      } else {
        results.alreadyMarked.push(res);
      }
    } catch (err) {
      results.failed.push({ participantName: name, error: err.message });
    }
  }

  return results;
}

/**
 * Delete an attendance record (Admin only)
 */
export async function deleteAttendanceRecord(attendanceId) {
  if (!attendanceId) return;
  const docRef = doc(db, 'attendance', attendanceId);
  await deleteDoc(docRef);
}

/**
 * Delete an unregistered / walk-in participant record (Admin/Coordinator)
 */
export async function deleteUnregisteredParticipant(docId) {
  if (!docId) return;
  const docRef = doc(db, 'unregisteredParticipants', docId);
  await deleteDoc(docRef);
}

