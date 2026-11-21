import { 
  doc, 
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
          const email = (data.email || docId || '').trim().toLowerCase();
          roles.push({
            id: docId,
            email,
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
 * Real-time listener for the Firestore 'participants' collection.
 * Pulls participant profiles mapped by lowercase email so Name and USN are always fresh from the database.
 */
export function subscribeToParticipantsCollection(callback) {
  try {
    const col = collection(db, 'participants');
    return onSnapshot(
      col,
      (snapshot) => {
        const mapByEmail = {};
        snapshot.forEach((d) => {
          const data = d.data();
          const em = (data.email || '').trim().toLowerCase();
          if (em) {
            const resolvedName = data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.displayName || '';
            const resolvedUsn = (data.usn || '').trim().toUpperCase();
            mapByEmail[em] = {
              name: resolvedName,
              usn: resolvedUsn,
              mobile: data.mobile || '',
              uid: d.id
            };
          }
        });
        callback(mapByEmail);
      },
      (err) => {
        console.warn('Participants collection listener notice:', err?.message);
        callback({});
      }
    );
  } catch (err) {
    console.warn('Failed to listen to participants collection:', err);
    callback({});
    return () => {};
  }
}

/**
 * Look up participant name and USN from the database by email
 */
export async function getParticipantDetailsByEmail(email) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Check participants collection
    const qPart = query(
      collection(db, 'participants'),
      where('email', '==', cleanEmail)
    );
    const snapPart = await getDocs(qPart);
    if (!snapPart.empty) {
      const data = snapPart.docs[0].data();
      const resolvedName = data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || '';
      return {
        name: resolvedName,
        usn: (data.usn || '').trim().toUpperCase(),
        mobile: data.mobile || '',
        uid: snapPart.docs[0].id
      };
    }

    // 2. Fallback check in registeredUsns
    const qUsn = query(
      collection(db, 'registeredUsns'),
      where('email', '==', cleanEmail)
    );
    const snapUsn = await getDocs(qUsn);
    if (!snapUsn.empty) {
      const data = snapUsn.docs[0].data();
      return {
        name: cleanEmail.split('@')[0],
        usn: (data.usn || '').trim().toUpperCase(),
        uid: data.uid || ''
      };
    }
  } catch (err) {
    console.warn('Error querying participant by email:', err?.message);
  }

  return null;
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
 * Automatically pulls their Name and USN from the participants collection in the database.
 */
export async function addCoordinatorToDatabase({ email, activityId, assignedEvent, assignedRoom, addedBy }) {
  if (!email || !email.trim()) {
    throw new Error('Coordinator email address is required');
  }

  const cleanEmail = email.trim().toLowerCase();

  // Pull name and USN from the database (participants or registeredUsns)
  const participant = await getParticipantDetailsByEmail(cleanEmail);
  const resolvedName = participant?.name || cleanEmail.split('@')[0];
  const resolvedUsn = participant?.usn || '';
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
    name: resolvedName, 
    usn: resolvedUsn, 
    activityId: cleanActivityId, 
    assignedEvent: cleanEvent, 
    assignedRoom: cleanRoom 
  };
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
