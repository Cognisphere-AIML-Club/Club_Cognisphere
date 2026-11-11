import { 
  doc, 
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

