import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Subscribe in real time to scores/leaderboard for a single activity
 */
export function subscribeScoresForActivity(activityId, callback) {
  if (!activityId) return () => {};

  try {
    const q = query(
      collection(db, 'scores'),
      where('activityId', '==', activityId),
      orderBy('rank', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
          publishedAt: d.data().publishedAt?.toDate ? d.data().publishedAt.toDate() : new Date()
        }));
        callback(list);
      },
      (error) => {
        console.warn(`Scores snapshot error for ${activityId}:`, error.message);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to scores:', err);
    callback([]);
    return () => {};
  }
}

/**
 * Subscribe to all published scores across all activities
 */
export function subscribeAllScores(callback) {
  try {
    const q = query(
      collection(db, 'scores'),
      orderBy('rank', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
          publishedAt: d.data().publishedAt?.toDate ? d.data().publishedAt.toDate() : new Date()
        }));
        callback(list);
      },
      (error) => {
        console.warn('All scores snapshot error:', error.message);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to all scores:', err);
    callback([]);
    return () => {};
  }
}

/**
 * Publish or update a participant's score/rank (Admin only)
 */
export async function publishScore({
  activityId,
  participantId,
  participantName,
  participantUsn = '',
  score = '',
  rank = 1,
  rankLabel = '',
  adminEmail = 'admin'
}) {
  const docId = `${activityId}_${participantId}`;
  const docRef = doc(db, 'scores', docId);

  // Standardize rank labels
  let label = rankLabel;
  if (!label) {
    if (rank === 1) label = '1st Place (Winner)';
    else if (rank === 2) label = '2nd Place (Runner-up)';
    else if (rank === 3) label = '3rd Place';
    else label = `Rank #${rank}`;
  }

  await setDoc(docRef, {
    activityId,
    participantId,
    participantName: participantName.trim(),
    participantUsn: participantUsn.trim(),
    score: score !== '' ? String(score).trim() : null,
    rank: Number(rank) || 1,
    rankLabel: label,
    publishedBy: adminEmail,
    publishedAt: serverTimestamp()
  }, { merge: true });

  return docId;
}

/**
 * Remove/unpublish a score (Admin only)
 */
export async function unpublishScore(activityId, participantId) {
  const docId = `${activityId}_${participantId}`;
  const docRef = doc(db, 'scores', docId);
  await deleteDoc(docRef);
}

/**
 * Fetch attendees who attended this activity from attendance collection
 */
export async function fetchActivityAttendees(activityId) {
  try {
    const q = query(
      collection(db, 'attendance'),
      where('activityId', '==', activityId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      attendanceId: d.id,
      ...d.data()
    }));
  } catch (err) {
    console.warn('Failed to fetch activity attendees:', err.message);
    return [];
  }
}

