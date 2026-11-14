import { 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Submit a request to participate in a specific game/activity
 */
export async function requestGamePass({ activityId, participantId, participantName, participantUsn }) {
  if (!activityId || !participantId) throw new Error('Missing activityId or participantId');

  const requestId = `${activityId}_${participantId}`;
  const docRef = doc(db, 'passRequests', requestId);

  const requestData = {
    id: requestId,
    activityId,
    participantId,
    participantName: participantName || 'Participant',
    participantUsn: participantUsn || '',
    status: 'pending',
    requestedAt: serverTimestamp(),
  };

  await setDoc(docRef, requestData, { merge: true });
  return requestData;
}

/**
 * Real-time listener for all pass requests submitted by a specific participant
 */
export function subscribeToUserPassRequests(participantId, callback) {
  if (!participantId) return () => {};

  const q = query(
    collection(db, 'passRequests'),
    where('participantId', '==', participantId)
  );

  return onSnapshot(q, (snapshot) => {
    const map = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      map[data.activityId] = data;
    });
    callback(map);
  }, () => {
    callback({});
  });
}

/**
 * Real-time listener for all requests for a specific activity (for Coordinators & Admins)
 */
export function subscribeToActivityRequests(activityId, callback) {
  if (!activityId) return () => {};

  const q = query(
    collection(db, 'passRequests'),
    where('activityId', '==', activityId)
  );

  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback(list);
  }, () => {
    callback([]);
  });
}

/**
 * Real-time listener for ALL requests across ALL activities (for Registrations Hub)
 */
export function subscribeToAllPassRequests(callback) {
  const colRef = collection(db, 'passRequests');

  return onSnapshot(colRef, (snapshot) => {
    const list = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    // In-memory sort: latest first
    list.sort((a, b) => {
      const timeA = a.requestedAt?.seconds || 0;
      const timeB = b.requestedAt?.seconds || 0;
      return timeB - timeA;
    });
    callback(list);
  }, (err) => {
    console.warn('Pass requests subscription notice:', err?.message);
    callback([]);
  });
}

/**
 * Coordinator or Admin approves or rejects a participant's pass request
 */
export async function reviewPassRequest(requestId, status, reviewerEmail) {
  if (!requestId) throw new Error('Missing requestId');
  if (status !== 'approved' && status !== 'rejected') throw new Error('Invalid status');

  const docRef = doc(db, 'passRequests', requestId);
  await updateDoc(docRef, {
    status,
    reviewedBy: reviewerEmail || 'coordinator',
    reviewedAt: serverTimestamp(),
  });
}

/**
 * Bulk approve or reject a list of pass requests
 */
export async function bulkReviewPassRequests(requestIds, status, reviewerEmail) {
  if (!Array.isArray(requestIds) || requestIds.length === 0) return;
  const promises = requestIds.map(id => reviewPassRequest(id, status, reviewerEmail));
  await Promise.all(promises);
}

/**
 * Real-time listener for Pass Page layout configuration
 */
export function subscribeToPassConfig(callback) {
  const docRef = doc(db, 'settings', 'passConfig');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      callback(null);
    }
  }, (err) => {
    console.warn('Pass config notice:', err?.message);
    callback(null);
  });
}

/**
 * Update Pass Page layout configuration (Admin only)
 */
export async function updatePassConfig(configData, updatedBy) {
  const docRef = doc(db, 'settings', 'passConfig');
  await setDoc(docRef, {
    ...configData,
    updatedBy: updatedBy || 'admin',
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

