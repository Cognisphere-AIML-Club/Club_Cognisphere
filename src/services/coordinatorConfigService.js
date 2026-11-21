import { 
  doc, 
  getDoc,
  onSnapshot, 
  setDoc, 
  serverTimestamp, 
  collection, 
  deleteDoc, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../firebase';

export const DEFAULT_COORDINATOR_PERMISSIONS = {
  scanner: true,            // Attendance QR Scanner
  timerHub: true,           // Timers Hub & Stage Countdown Controls
  bigScreen: true,          // Projector Big Screen Mode
  registrationDesk: true,   // Registrations & Approvals Desk
  leaderboardEntries: true  // Leaderboard Score Entries & Sheets Sync
};

export const DEFAULT_ACTIVE_STATES = {};

export const DEFAULT_COORDINATOR_CONFIG = {
  permissions: { ...DEFAULT_COORDINATOR_PERMISSIONS },
  activeStates: {}
};

const STORAGE_KEY = 'cognisphere_coordinator_config';

/**
 * Get cached coordinator configuration from localStorage
 */
export function getCachedCoordinatorConfig() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        permissions: { ...DEFAULT_COORDINATOR_PERMISSIONS, ...(parsed.permissions || {}) },
        activeStates: { ...(parsed.activeStates || {}) }
      };
    }
  } catch (err) {
    console.warn('Error reading coordinator config cache:', err);
  }
  return DEFAULT_COORDINATOR_CONFIG;
}

/**
 * Real-time listener for Coordinator access & permissions configuration
 */
export function subscribeToCoordinatorConfig(callback) {
  const docRef = doc(db, 'settings', 'coordinatorConfig');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const merged = {
          permissions: { ...DEFAULT_COORDINATOR_PERMISSIONS, ...(data.permissions || {}) },
          activeStates: { ...(data.activeStates || {}) }
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch (e) {}
        callback(merged);
      } else {
        callback(getCachedCoordinatorConfig());
      }
    },
    (err) => {
      console.warn('Coordinator config notice:', err?.message);
      callback(getCachedCoordinatorConfig());
    }
  );
}

/**
 * Real-time listener for the Firestore 'roles' collection.
 * Admin pulls all roles and coordinators dynamically from the database.
 */
export function subscribeToRolesCollection(callback) {
  try {
    const rolesCol = collection(db, 'roles');
    return onSnapshot(
      rolesCol,
      (snapshot) => {
        const roles = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const docId = docSnap.id;
          const isEmailId = docId.includes('@');
          const email = (data.email || (isEmailId ? docId : '')).trim().toLowerCase();
          const uid = data.uid || (!isEmailId ? docId : '');
          roles.push({
            id: docId,
            email,
            uid,
            ...data
          });
        });
        callback(roles);
      },
      (err) => {
        console.warn('Roles collection notice (needs admin or rules permission):', err?.message);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('Failed to listen to roles collection:', err);
    callback([]);
    return () => {};
  }
}

/**
 * Real-time listener for Firestore participants collections.
 * Pulls participant profiles mapped by UID (document ID), lowercase email, and USN
 * so Name and USN are always fresh and fully resolved from the database.
 * Supports both 'participants' and 'participents' collections, as well as 'registeredUsns' and 'qrPasses'.
 */
export function subscribeToParticipantsCollection(callback) {
  const map = {};

  const processParticipantDoc = (d) => {
    const data = d.data();
    const uid = d.id; // The document ID in participants is the user's Auth UID
    const resolvedName = 
      data.name || 
      `${data.firstName || ''} ${data.lastName || ''}`.trim() || 
      data.displayName || 
      data.certificateName || 
      '';
    const resolvedUsn = (data.usn || '').trim().toUpperCase();
    const em = (data.email || data.userEmail || '').trim().toLowerCase();

    const item = {
      uid,
      name: resolvedName,
      usn: resolvedUsn,
      email: em,
      mobile: data.mobile || '',
      qrId: data.qrId || ''
    };

    // Index by UID (both exact case and lower)
    if (uid) {
      map[uid] = item;
      map[uid.toLowerCase()] = item;
    }
    // Index by email
    if (em) {
      map[em] = item;
    }
    // Index by USN
    if (resolvedUsn) {
      map[resolvedUsn] = item;
    }
  };

  const handleSnapshot = (snapshot) => {
    snapshot.forEach(processParticipantDoc);
    callback({ ...map });
  };

  const unsubs = [];

  // 1. Listen to 'participants' collection
  try {
    const unsubPart = onSnapshot(
      collection(db, 'participants'),
      handleSnapshot,
      (err) => console.warn('participants collection notice:', err?.message)
    );
    unsubs.push(unsubPart);
  } catch (e) {}

  // 2. Listen to 'participents' collection (user's Firestore collection spelling)
  try {
    const unsubParticipents = onSnapshot(
      collection(db, 'participents'),
      handleSnapshot,
      (err) => console.warn('participents collection notice:', err?.message)
    );
    unsubs.push(unsubParticipents);
  } catch (e) {}

  // 3. Listen to 'registeredUsns' (links email <-> USN <-> UID)
  try {
    const unsubReg = onSnapshot(
      collection(db, 'registeredUsns'),
      (snapshot) => {
        snapshot.forEach((d) => {
          const data = d.data();
          const usn = (data.usn || d.id || '').trim().toUpperCase();
          const em = (data.email || '').trim().toLowerCase();
          const uid = data.uid || '';

          if (uid || em || usn) {
            const existing = map[uid] || map[em] || map[usn] || {};
            const merged = {
              uid: uid || existing.uid || '',
              name: existing.name || (em ? em.split('@')[0] : ''),
              usn: usn || existing.usn || '',
              email: em || existing.email || ''
            };
            if (uid) map[uid] = { ...(map[uid] || {}), ...merged };
            if (em) map[em] = { ...(map[em] || {}), ...merged };
            if (usn) map[usn] = { ...(map[usn] || {}), ...merged };
          }
        });
        callback({ ...map });
      },
      (err) => console.warn('registeredUsns listener notice:', err?.message)
    );
    unsubs.push(unsubReg);
  } catch (e) {}

  // 4. Listen to 'qrPasses' (links participantId <-> real Name <-> USN)
  try {
    const unsubQr = onSnapshot(
      collection(db, 'qrPasses'),
      (snapshot) => {
        snapshot.forEach((d) => {
          const data = d.data();
          const uid = data.participantId || '';
          const name = data.name || '';
          const usn = (data.usn || '').trim().toUpperCase();

          if (uid && (name || usn)) {
            const existing = map[uid] || {};
            const updated = {
              ...existing,
              uid,
              name: name || existing.name || '',
              usn: usn || existing.usn || ''
            };
            map[uid] = updated;
            if (updated.email) map[updated.email] = updated;
            if (usn) map[usn] = updated;
          }
        });
        callback({ ...map });
      },
      (err) => console.warn('qrPasses listener notice:', err?.message)
    );
    unsubs.push(unsubQr);
  } catch (e) {}

  return () => {
    unsubs.forEach((u) => {
      try {
        if (typeof u === 'function') u();
      } catch (e) {}
    });
  };
}

/**
 * Look up participant name, USN, and UID from the database.
 * Supports direct document lookup by UID (document ID in participants / participents)
 * as well as by Email or USN across collections.
 */
export async function getParticipantDetails({ email, uid, usn } = {}) {
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const cleanUid = uid ? uid.trim() : '';
  const cleanUsn = usn ? usn.trim().toUpperCase() : '';

  // 1. Direct fetch by UID (the document ID in participants / participents)
  if (cleanUid) {
    for (const colName of ['participents', 'participants']) {
      try {
        const docSnap = await getDoc(doc(db, colName, cleanUid));
        if (docSnap.exists()) {
          const d = docSnap.data();
          const resolvedName = 
            d.name || 
            `${d.firstName || ''} ${d.lastName || ''}`.trim() || 
            d.displayName || 
            d.certificateName || 
            '';
          return {
            uid: cleanUid,
            name: resolvedName,
            usn: (d.usn || '').trim().toUpperCase(),
            email: (d.email || d.userEmail || cleanEmail).trim().toLowerCase(),
            mobile: d.mobile || ''
          };
        }
      } catch (e) {}
    }
  }

  // 2. Query registeredUsns (links email to UID & USN)
  if (cleanEmail) {
    try {
      const q = query(collection(db, 'registeredUsns'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0].data();
        const foundUid = d.uid;
        const foundUsn = (d.usn || snap.docs[0].id || '').trim().toUpperCase();

        if (foundUid) {
          // Fetch the full participant profile by the discovered UID
          const detailed = await getParticipantDetails({ uid: foundUid, email: cleanEmail, usn: foundUsn });
          if (detailed && detailed.name) return detailed;
        }

        return {
          uid: foundUid || '',
          name: cleanEmail.split('@')[0],
          usn: foundUsn,
          email: cleanEmail
        };
      }
    } catch (e) {}
  }

  // 3. Query participants and participents by email
  if (cleanEmail) {
    for (const colName of ['participents', 'participants']) {
      try {
        const q = query(collection(db, colName), where('email', '==', cleanEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const d = docSnap.data();
          const resolvedName = 
            d.name || 
            `${d.firstName || ''} ${d.lastName || ''}`.trim() || 
            d.displayName || 
            '';
          return {
            uid: docSnap.id,
            name: resolvedName,
            usn: (d.usn || '').trim().toUpperCase(),
            email: cleanEmail,
            mobile: d.mobile || ''
          };
        }
      } catch (e) {}
    }
  }

  // 4. Query qrPasses by participantId (UID)
  if (cleanUid) {
    try {
      const q = query(collection(db, 'qrPasses'), where('participantId', '==', cleanUid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0].data();
        return {
          uid: cleanUid,
          name: d.name || '',
          usn: (d.usn || '').trim().toUpperCase(),
          email: cleanEmail
        };
      }
    } catch (e) {}
  }

  // 5. In-memory case-insensitive scan of participants and participents collections
  for (const colName of ['participents', 'participants']) {
    try {
      const allSnap = await getDocs(collection(db, colName));
      for (const d of allSnap.docs) {
        const data = d.data();
        const em = (data.email || data.userEmail || '').trim().toLowerCase();
        const docUsn = (data.usn || '').trim().toUpperCase();
        if ((cleanEmail && em === cleanEmail) || (cleanUsn && docUsn === cleanUsn)) {
          return {
            uid: d.id,
            name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.displayName || '',
            usn: docUsn,
            email: em || cleanEmail,
            mobile: data.mobile || ''
          };
        }
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Backwards compatibility helper
 */
export async function getParticipantDetailsByEmail(email) {
  return getParticipantDetails({ email });
}

/**
 * Update Coordinator access configuration (Admin only)
 */
export async function updateCoordinatorConfig(configData, updatedBy) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configData));
  } catch (e) {}

  const docRef = doc(db, 'settings', 'coordinatorConfig');
  await setDoc(
    docRef,
    {
      ...configData,
      updatedBy: updatedBy || 'admin',
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

/**
 * Set coordinator active state in both Firestore 'roles/{email}' AND 'settings/coordinatorConfig'.
 * When an Admin flips a coordinator's toggle between 'coordinator' and 'participant',
 * this updates the user's role document in Firestore and syncs activeStates.
 */
export async function setCoordinatorRoleInDatabase({ email, usn, id, name, nextState, updatedBy }) {
  const normEmail = email ? email.trim().toLowerCase() : '';
  const normUsn = usn ? usn.trim().toUpperCase() : '';
  const state = nextState === 'participant' ? 'participant' : 'coordinator';

  // 1. If email is available, update or merge into Firestore 'roles/{normEmail}'
  if (normEmail) {
    const roleDocRef = doc(db, 'roles', normEmail);
    await setDoc(
      roleDocRef,
      {
        role: state,                 // 'coordinator' or 'participant'
        coordinatorState: state,    // Explicit coordinator state
        baseRole: 'coordinator',    // Remembers that this account is fundamentally a coordinator
        email: normEmail,
        ...(name ? { name: name.trim() } : {}),
        ...(normUsn ? { usn: normUsn } : {}),
        updatedAt: serverTimestamp(),
        updatedBy: updatedBy || 'admin'
      },
      { merge: true }
    );
  }

  // 2. Update 'settings/coordinatorConfig' activeStates with all available keys
  const activeUpdates = {};
  if (normEmail) activeUpdates[normEmail] = state;
  if (normUsn) activeUpdates[normUsn] = state;
  if (id) activeUpdates[id] = state;

  // Update local cache
  const cached = getCachedCoordinatorConfig();
  const newActiveStates = { ...(cached.activeStates || {}), ...activeUpdates };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cached, activeStates: newActiveStates }));
  } catch (e) {}

  // Write to settings/coordinatorConfig doc
  const configDocRef = doc(db, 'settings', 'coordinatorConfig');
  await setDoc(
    configDocRef,
    {
      activeStates: newActiveStates,
      updatedAt: serverTimestamp(),
      updatedBy: updatedBy || 'admin'
    },
    { merge: true }
  );

  return { email: normEmail, usn: normUsn, state };
}

/**
 * Add a new coordinator directly by Email and store it in Firestore 'roles/{email}'.
 * Automatically pulls their Name, USN, and UID from the participants / participents collection in the database.
 */
export async function addCoordinatorToDatabase({ email, activityId, assignedEvent, assignedRoom, addedBy }) {
  if (!email || !email.trim()) {
    throw new Error('Coordinator email address is required');
  }

  const cleanEmail = email.trim().toLowerCase();

  // Pull name, USN, and UID from the database (participants / participents or registeredUsns)
  const participant = await getParticipantDetails({ email: cleanEmail });
  const resolvedName = participant?.name || cleanEmail.split('@')[0];
  const resolvedUsn = participant?.usn || '';
  const resolvedUid = participant?.uid || '';
  const cleanActivityId = activityId && activityId.trim() ? activityId.trim() : '';
  const cleanEvent = assignedEvent && assignedEvent.trim() ? assignedEvent.trim() : '';
  const cleanRoom = assignedRoom && assignedRoom.trim() ? assignedRoom.trim() : '';

  // 1. Create or update roles/{cleanEmail} in database
  const roleDocRef = doc(db, 'roles', cleanEmail);
  await setDoc(
    roleDocRef,
    {
      role: 'coordinator',
      coordinatorState: 'coordinator',
      baseRole: 'coordinator',
      email: cleanEmail,
      name: resolvedName,
      usn: resolvedUsn,
      ...(resolvedUid ? { uid: resolvedUid } : {}),
      ...(cleanActivityId ? { activityId: cleanActivityId } : {}),
      ...(cleanEvent ? { assignedEvent: cleanEvent } : {}),
      ...(cleanRoom ? { assignedRoom: cleanRoom } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: addedBy || 'admin'
    },
    { merge: true }
  );

  // 2. Sync to settings/coordinatorConfig activeStates
  const activeUpdates = {
    [cleanEmail]: 'coordinator'
  };
  if (resolvedUsn) activeUpdates[resolvedUsn] = 'coordinator';
  if (resolvedUid) activeUpdates[resolvedUid] = 'coordinator';

  const cached = getCachedCoordinatorConfig();
  const newActiveStates = { ...(cached.activeStates || {}), ...activeUpdates };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cached, activeStates: newActiveStates }));
  } catch (e) {}

  const configDocRef = doc(db, 'settings', 'coordinatorConfig');
  await setDoc(
    configDocRef,
    {
      activeStates: newActiveStates,
      updatedAt: serverTimestamp(),
      updatedBy: addedBy || 'admin'
    },
    { merge: true }
  );

  return { 
    email: cleanEmail, 
    uid: resolvedUid,
    name: resolvedName, 
    usn: resolvedUsn, 
    activityId: cleanActivityId, 
    assignedEvent: cleanEvent, 
    assignedRoom: cleanRoom 
  };
}

/**
 * Automatically syncs resolved participant name, USN, and UID to roles in Firestore
 */
export async function syncCoordinatorDetailsInDatabase(coord) {
  const email = (coord.email || (coord.id && coord.id.includes('@') ? coord.id : '')).trim().toLowerCase();
  const uid = coord.uid || (!coord.id?.includes('@') ? coord.id : '');
  const docKey = email || uid;
  if (!docKey) return null;

  const details = await getParticipantDetails({ email, uid, usn: coord.usn });
  if (details && (details.name || details.usn)) {
    try {
      const roleRef = doc(db, 'roles', docKey);
      await setDoc(roleRef, {
        ...(details.name ? { name: details.name } : {}),
        ...(details.usn ? { usn: details.usn } : {}),
        ...(details.uid ? { uid: details.uid } : {}),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {}
    return details;
  }
  return null;
}

/**
 * Remove a coordinator from database roles or delete doc
 */
export async function removeCoordinatorFromDatabase(email, removedBy) {
  if (!email) return;
  const cleanEmail = email.trim().toLowerCase();
  const roleDocRef = doc(db, 'roles', cleanEmail);
  try {
    await deleteDoc(roleDocRef);
  } catch (err) {
    // If delete fails, set role to participant
    await setDoc(
      roleDocRef,
      {
        role: 'participant',
        coordinatorState: 'participant',
        updatedAt: serverTimestamp(),
        updatedBy: removedBy || 'admin'
      },
      { merge: true }
    );
  }
}
