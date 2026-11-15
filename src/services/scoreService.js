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
    // Single equality filter - NEVER requires a Firestore composite index
    const q = query(
      collection(db, 'scores'),
      where('activityId', '==', activityId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(d => {
          const data = d.data();
          const parsedRank = parseInt(data.rank, 10);
          return {
            id: d.id,
            ...data,
            rank: !isNaN(parsedRank) && parsedRank > 0 ? parsedRank : 999,
            publishedAt: data.publishedAt?.toDate ? data.publishedAt.toDate() : new Date()
          };
        });
        // Sort in memory by rank ascending
        list.sort((a, b) => a.rank - b.rank);
        callback(list);
      },
      (error) => {
        console.error(`Scores snapshot error for ${activityId}:`, error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to scores:', err);
    callback([]);
    return () => {};
  }
}

/**
 * Subscribe to all published scores across all activities
 */
export function subscribeAllScores(callback) {
  try {
    const q = collection(db, 'scores');

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(d => {
          const data = d.data();
          const parsedRank = parseInt(data.rank, 10);
          return {
            id: d.id,
            ...data,
            rank: !isNaN(parsedRank) && parsedRank > 0 ? parsedRank : 999,
            publishedAt: data.publishedAt?.toDate ? data.publishedAt.toDate() : new Date()
          };
        });
        list.sort((a, b) => a.rank - b.rank);
        callback(list);
      },
      (error) => {
        console.error('All scores snapshot error:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to all scores:', err);
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

