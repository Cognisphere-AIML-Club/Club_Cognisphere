import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  serverTimestamp, 
  query, 
  where, 
  limit 
} from 'firebase/firestore';
import { db } from '../firebase';
import { ACTIVITIES } from '../data/activities';

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
    // Check if already marked present
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
 * Manual search fallback by USN or Name
 */
export async function searchParticipantsForCoordinator(searchTerm) {
  if (!searchTerm || searchTerm.trim().length < 2) return [];

  const term = searchTerm.trim().toUpperCase();
  const passesSnap = await getDocs(collection(db, 'qrPasses'));
  const results = [];

  passesSnap.forEach(docSnap => {
    const data = docSnap.data();
    const nameUpper = (data.name || '').toUpperCase();
    const usnUpper = (data.usn || '').toUpperCase();

    if (usnUpper.includes(term) || nameUpper.includes(term)) {
      results.push({
        participantId: data.participantId,
        name: data.name,
        usn: data.usn || '',
        qrId: data.qrId
      });
    }
  });

  return results.slice(0, 10);
}
