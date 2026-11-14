import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Generate a unique QR ID for a specific USN and activity
 */
function createUniqueQrId(activityId, usn) {
  const cleanUsn = (usn || 'PART').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanAct = (activityId || 'GAME').toLowerCase().replace(/[^a-z0-9]/g, '');
  const rand = Math.random().toString(36).substring(2, 7);
  const time = Date.now().toString(36);
  return `${cleanAct}_${cleanUsn}_${time}_${rand}`;
}

/**
 * Get or generate the active QR pass for a USN for a specific game.
 * Rule: One USN gets only ONE active QR code per game.
 * If already generated before and forceNew is true:
 * Flags the previous QR pass as expired and generates a new one.
 */
export async function getOrGenerateGamePass({ activityId, usn, participantId, name, forceNew = false }) {
  if (!activityId || !usn || !participantId) {
    throw new Error('Missing activityId, usn, or participantId');
  }

  const cleanUsn = usn.trim().toUpperCase();
  const mappingDocId = `${cleanUsn}_${activityId}`;
  const mappingRef = doc(db, 'activeGamePasses', mappingDocId);
  const cacheKey = `club_games_pass_${cleanUsn}_${activityId}`;

  // Read local cache first for instant offline responsiveness
  let cachedPass = null;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) cachedPass = JSON.parse(raw);
  } catch (_) {}

  // 1. Fetch current active mapping from Firestore
  let existingActiveQrId = null;
  try {
    const mappingSnap = await getDoc(mappingRef);
    if (mappingSnap.exists()) {
      existingActiveQrId = mappingSnap.data().activeQrId;
    }
  } catch (err) {
    console.warn('activeGamePasses lookup notice:', err);
    if (cachedPass && !forceNew) {
      return cachedPass;
    }
  }

  // 2. If existing pass exists and forceNew is false, verify it's still active
  if (existingActiveQrId && !forceNew) {
    try {
      const passRef = doc(db, 'qrPasses', existingActiveQrId);
      const passSnap = await getDoc(passRef);
      if (passSnap.exists()) {
        const passData = passSnap.data();
        if (!passData.isExpired && passData.status !== 'expired') {
          const activeResult = {
            qrId: existingActiveQrId,
            qrValue: `${activityId}_${existingActiveQrId}`,
            activityId,
            usn: cleanUsn,
            participantId,
            name: passData.name || name,
            status: 'active',
            isExpired: false,
          };
          try {
            localStorage.setItem(cacheKey, JSON.stringify(activeResult));
          } catch (_) {}
          return activeResult;
        }
      }
    } catch (e) {
      console.warn('Could not verify existing pass status:', e);
      if (cachedPass) return cachedPass;
    }
  }

  // 3. If a pass was already generated before, FLAG PREVIOUS PASS AS EXPIRED
  if (existingActiveQrId) {
    try {
      const oldPassRef = doc(db, 'qrPasses', existingActiveQrId);
      await setDoc(oldPassRef, {
        status: 'expired',
        isExpired: true,
        expiredReason: `Pass expired: A newer QR pass was generated for USN ${cleanUsn}.`,
        expiredAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('Could not flag previous active pass as expired:', e);
    }
  }

  // Also query any other old passes for this USN + activityId and flag them as expired
  try {
    const oldQuery = query(
      collection(db, 'qrPasses'),
      where('usn', '==', cleanUsn),
      where('activityId', '==', activityId),
      where('status', '==', 'active')
    );
    const oldSnaps = await getDocs(oldQuery);
    const expirePromises = oldSnaps.docs.map((d) => 
      setDoc(doc(db, 'qrPasses', d.id), {
        status: 'expired',
        isExpired: true,
        expiredReason: `Pass expired: A newer QR pass was generated for USN ${cleanUsn}.`,
        expiredAt: serverTimestamp(),
      }, { merge: true })
    );
    await Promise.all(expirePromises);
  } catch (err) {
    console.warn('Batch expire query notice:', err);
  }

  // 4. Generate the NEW active QR pass
  const newQrId = createUniqueQrId(activityId, cleanUsn);
  const newPassData = {
    qrId: newQrId,
    activityId,
    usn: cleanUsn,
    participantId,
    name: name || 'Participant',
    status: 'active',
    isExpired: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Write new pass to qrPasses
  await setDoc(doc(db, 'qrPasses', newQrId), newPassData, { merge: true });

  // Update activeGamePasses pointer for this (USN, game)
  await setDoc(mappingRef, {
    usn: cleanUsn,
    activityId,
    activeQrId: newQrId,
    participantId,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  const result = {
    qrId: newQrId,
    qrValue: `${activityId}_${newQrId}`,
    activityId,
    usn: cleanUsn,
    participantId,
    name: name || 'Participant',
    status: 'active',
    isExpired: false,
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(result));
  } catch (_) {}

  return result;
}

/**
 * Subscribe to the active game pass for a USN
 */
export function subscribeToGamePass(activityId, usn, callback) {
  if (!activityId || !usn) {
    callback(null);
    return () => {};
  }

  const cleanUsn = usn.trim().toUpperCase();
  const mappingRef = doc(db, 'activeGamePasses', `${cleanUsn}_${activityId}`);

  return onSnapshot(mappingRef, async (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const activeQrId = data.activeQrId;
      if (activeQrId) {
        try {
          const passRef = doc(db, 'qrPasses', activeQrId);
          const passSnap = await getDoc(passRef);
          if (passSnap.exists()) {
            const passData = passSnap.data();
            callback({
              qrId: activeQrId,
              qrValue: `${activityId}_${activeQrId}`,
              activityId,
              usn: cleanUsn,
              participantId: data.participantId,
              name: passData.name || '',
              status: passData.status || 'active',
              isExpired: Boolean(passData.isExpired || passData.status === 'expired'),
              expiredReason: passData.expiredReason || null,
            });
            return;
          }
        } catch (_) {}
      }
    }
    callback(null);
  }, () => {
    callback(null);
  });
}

