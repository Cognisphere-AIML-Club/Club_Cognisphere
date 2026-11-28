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
const IGNITE_COORDINATORS_COLLECTION = 'igniteCoordinators';

function buildIgniteCoordDocId({ email = '', usn = '', name = '' }) {
  if (email) return email.trim().toLowerCase();
  if (usn) return `coord_${usn.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
  const slug = String(name || 'coord').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  let hash = 0;
  for (let i = 0; i < String(name || '').length; i++) {
    hash = ((hash << 5) - hash + String(name).charCodeAt(i)) | 0;
  }
  return `coord_${slug || 'member'}_${Math.abs(hash).toString(36).slice(0, 5)}`;
}

/**
 * Real-time listener for the dedicated IGNITE event coordinators collection (`igniteCoordinators`).
 */
export function subscribeToIgniteCoordinators(callback) {
  try {
    const colRef = collection(db, IGNITE_COORDINATORS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const docId = docSnap.id;
          const isEmailId = docId.includes('@');
          const email = (data.email || (isEmailId ? docId : '')).trim().toLowerCase();
          const uid = data.uid || (!isEmailId && !docId.startsWith('coord_') ? docId : '');
          list.push({
            id: docId,
            email,
            uid,
            ...data
          });
        });
        callback(list);
      },
      (err) => {
        console.warn('igniteCoordinators notice:', err?.message);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('Failed to listen to igniteCoordinators:', err);
    callback([]);
    return () => {};
  }
}

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

function normalizePersonName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function indexNameLookup(map, rawName, item) {
  const norm = normalizePersonName(rawName);
  if (!norm) return;
  const nameKey = `name::${norm}`;
  const existing = map[nameKey];
  if (!existing) {
    map[nameKey] = { ...item };
    return;
  }
  const sameUid = Boolean(existing.uid && item.uid && existing.uid === item.uid);
  const sameEmail = Boolean(existing.email && item.email && existing.email === item.email);
  const sameUsn = Boolean(existing.usn && item.usn && existing.usn === item.usn);
  const diffEmail = Boolean(existing.email && item.email && existing.email !== item.email);
  const diffUsn = Boolean(existing.usn && item.usn && existing.usn !== item.usn);

  if (sameUid || sameEmail || sameUsn || (!diffEmail && !diffUsn)) {
    map[nameKey] = {
      ...existing,
      uid: existing.uid || item.uid || '',
      name: existing.name || item.name || '',
      usn: existing.usn || item.usn || '',
      email: existing.email || item.email || '',
      mobile: existing.mobile || item.mobile || '',
      qrId: existing.qrId || item.qrId || '',
      ambiguous: existing.ambiguous || false
    };
  } else {
    map[nameKey] = { ...existing, ambiguous: true };
  }
}

/**
 * Resolve a participant profile from participantsMap by email, UID, USN, or unambiguous full name.
 */
export function lookupParticipantProfile(participantsMap, { participantId, usn, email, name } = {}) {
  if (!participantsMap) return null;
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanUsn = (usn || '').trim().toUpperCase();
  const cleanUid = (participantId || '').trim();
  const normName = normalizePersonName(name);
  const byName = normName ? participantsMap[`name::${normName}`] : null;

  return (
    (cleanEmail && participantsMap[cleanEmail]) ||
    (cleanUid && (participantsMap[cleanUid] || participantsMap[cleanUid.toLowerCase()])) ||
    (cleanUsn && participantsMap[cleanUsn]) ||
    (byName && !byName.ambiguous ? byName : null) ||
    null
  );
}

/**
 * Real-time listener for Firestore participants collections.
 * Pulls participant profiles mapped by UID (document ID), lowercase email, USN, and normalized name
 * so Name, USN, and Email are always fresh and fully resolved from the database.
 * Supports both 'participants' and 'participents' collections, as well as 'registeredUsns' and 'qrPasses'.
 */
export function subscribeToParticipantsCollection(callback) {
  const map = {};

  const processParticipantDoc = (d) => {
    const data = d.data();
    const uid = d.id; // The document ID in participants is the user's Auth UID
    const resolvedName =
      data.name ||
      data.participantName ||
      `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
      data.displayName ||
      data.certificateName ||
      '';
    const resolvedUsn = (data.usn || data.participantUsn || '').trim().toUpperCase();
    const em = (data.email || data.userEmail || data.participantEmail || '').trim().toLowerCase();

    const prev =
      (uid && map[uid]) ||
      (em && map[em]) ||
      (resolvedUsn && map[resolvedUsn]) ||
      {};

    const item = {
      uid: uid || prev.uid || '',
      name: resolvedName || prev.name || '',
      usn: resolvedUsn || prev.usn || '',
      email: em || prev.email || '',
      mobile: data.mobile || prev.mobile || '',
      qrId: data.qrId || prev.qrId || ''
    };

    // Index by UID (both exact case and lower)
    if (uid) {
      map[uid] = item;
      map[uid.toLowerCase()] = item;
    }
    // Index by email
    if (item.email) {
      map[item.email] = item;
    }
    // Index by USN
    if (item.usn) {
      map[item.usn] = item;
    }
    // Index by unambiguous name variants (helps match walk-in / unregistered records)
    [resolvedName, data.name, data.certificateName, data.displayName].forEach((n) => {
      if (n) indexNameLookup(map, n, item);
    });
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
            if (merged.name) indexNameLookup(map, merged.name, merged);
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
            if (updated.name) indexNameLookup(map, updated.name, updated);
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
export async function getParticipantDetails({ email, uid, usn, name } = {}) {
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const cleanUid = uid ? uid.trim() : '';
  const cleanUsn = usn ? usn.trim().toUpperCase() : '';
  const cleanNormName = normalizePersonName(name);

  // 1. Direct fetch by UID (the document ID in participants / participents)
  if (cleanUid) {
    for (const colName of ['participents', 'participants']) {
      try {
        const docSnap = await getDoc(doc(db, colName, cleanUid));
        if (docSnap.exists()) {
          const d = docSnap.data();
          const resolvedName =
            d.name ||
            d.participantName ||
            `${d.firstName || ''} ${d.lastName || ''}`.trim() ||
            d.displayName ||
            d.certificateName ||
            '';
          return {
            uid: cleanUid,
            name: resolvedName,
            usn: (d.usn || d.participantUsn || '').trim().toUpperCase(),
            email: (d.email || d.userEmail || d.participantEmail || cleanEmail).trim().toLowerCase(),
            mobile: d.mobile || ''
          };
        }
      } catch (e) {}
    }
  }

  // 2. Direct lookup by USN in registeredUsns (fast 1-read link from USN -> Email & UID)
  if (cleanUsn) {
    try {
      const regUsnSnap = await getDoc(doc(db, 'registeredUsns', cleanUsn));
      if (regUsnSnap.exists()) {
        const d = regUsnSnap.data();
        const foundUid = d.uid || '';
        const foundEmail = (d.email || cleanEmail || '').trim().toLowerCase();
        if (foundUid) {
          const detailed = await getParticipantDetails({ uid: foundUid, email: foundEmail, usn: cleanUsn });
          if (detailed && (detailed.email || detailed.usn)) return detailed;
        }
        if (foundEmail) {
          return {
            uid: foundUid,
            name: name || foundEmail.split('@')[0],
            usn: cleanUsn,
            email: foundEmail
          };
        }
      }
    } catch (e) {}
  }

  // 3. Query registeredUsns by email (links email to UID & USN)
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

  // 5. In-memory case-insensitive scan of participents and participants collections (Email, USN, or unique Name)
  let nameMatch = null;
  let nameAmbiguous = false;

  for (const colName of ['participents', 'participants']) {
    try {
      const allSnap = await getDocs(collection(db, colName));
      for (const d of allSnap.docs) {
        const data = d.data();
        const em = (data.email || data.userEmail || data.participantEmail || '').trim().toLowerCase();
        const docUsn = (data.usn || data.participantUsn || '').trim().toUpperCase();
        const docName =
          data.name ||
          data.participantName ||
          `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
          data.displayName ||
          data.certificateName ||
          '';

        if ((cleanEmail && em === cleanEmail) || (cleanUsn && docUsn === cleanUsn)) {
          return {
            uid: d.id,
            name: docName,
            usn: docUsn,
            email: em || cleanEmail,
            mobile: data.mobile || ''
          };
        }

        if (cleanNormName) {
          const candidateNames = [docName, data.name, data.certificateName, data.displayName]
            .map(normalizePersonName)
            .filter(Boolean);
          if (candidateNames.includes(cleanNormName)) {
            const candidate = {
              uid: d.id,
              name: docName,
              usn: docUsn,
              email: em,
              mobile: data.mobile || ''
            };
            if (!nameMatch) {
              nameMatch = candidate;
            } else {
              const diffEmail = Boolean(nameMatch.email && em && nameMatch.email !== em);
              const diffUsn = Boolean(nameMatch.usn && docUsn && nameMatch.usn !== docUsn);
              if (diffEmail || diffUsn) {
                nameAmbiguous = true;
              } else {
                nameMatch = {
                  ...nameMatch,
                  usn: nameMatch.usn || docUsn,
                  email: nameMatch.email || em,
                  name: nameMatch.name || docName
                };
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  if (nameMatch && !nameAmbiguous) {
    return nameMatch;
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

  // 1. If email is available, update or merge into Firestore 'roles/{normEmail}' and 'igniteCoordinators/{normEmail}'
  if (normEmail) {
    const payload = {
      role: state,                 // 'coordinator' or 'participant'
      coordinatorState: state,    // Explicit coordinator state
      baseRole: 'coordinator',    // Remembers that this account is fundamentally a coordinator
      email: normEmail,
      ...(name ? { name: name.trim() } : {}),
      ...(normUsn ? { usn: normUsn } : {}),
      updatedAt: serverTimestamp(),
      updatedBy: updatedBy || 'admin'
    };
    await setDoc(doc(db, 'roles', normEmail), payload, { merge: true });
    await setDoc(doc(db, IGNITE_COORDINATORS_COLLECTION, normEmail), {
      ...payload,
      event: 'IGNITE-2026'
    }, { merge: true });
  } else if (id) {
    try {
      await setDoc(doc(db, IGNITE_COORDINATORS_COLLECTION, id), {
        role: state,
        coordinatorState: state,
        baseRole: 'coordinator',
        event: 'IGNITE-2026',
        updatedAt: serverTimestamp(),
        updatedBy: updatedBy || 'admin'
      }, { merge: true });
    } catch (_) {}
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
 * Add a coordinator for IGNITE 2026 and store in BOTH the dedicated `igniteCoordinators`
 * collection and Firestore `roles/{email}` (so staff auth/permissions work automatically).
 * Automatically pulls missing Name, USN, and UID from participants / participents collections.
 */
export async function addCoordinatorToDatabase({
  email = '',
  name = '',
  usn = '',
  activityId = '',
  assignedEvent = '',
  assignedRoom = '',
  addedBy = 'admin'
}) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const manualName = (name || '').trim();
  const manualUsn = (usn || '').trim().toUpperCase();

  if (!cleanEmail && !manualName) {
    throw new Error('Coordinator email address or name is required');
  }

  // Pull name, USN, and UID from the database (participants / participents or registeredUsns)
  const participant = await getParticipantDetails({
    email: cleanEmail,
    usn: manualUsn,
    name: manualName
  });
  const resolvedEmail = cleanEmail || participant?.email || '';
  const resolvedName = manualName || participant?.name || (resolvedEmail ? resolvedEmail.split('@')[0] : 'Coordinator');
  const resolvedUsn = manualUsn || participant?.usn || '';
  const resolvedUid = participant?.uid || '';
  const cleanActivityId = activityId && activityId.trim() ? activityId.trim() : '';
  const cleanEvent = assignedEvent && assignedEvent.trim() ? assignedEvent.trim() : '';
  const cleanRoom = assignedRoom && assignedRoom.trim() ? assignedRoom.trim() : '';

  const coordRecord = {
    role: 'coordinator',
    coordinatorState: 'coordinator',
    baseRole: 'coordinator',
    event: 'IGNITE-2026',
    ...(resolvedEmail ? { email: resolvedEmail } : {}),
    name: resolvedName,
    usn: resolvedUsn,
    ...(resolvedUid ? { uid: resolvedUid } : {}),
    ...(cleanActivityId ? { activityId: cleanActivityId } : {}),
    ...(cleanEvent ? { assignedEvent: cleanEvent } : {}),
    ...(cleanRoom ? { assignedRoom: cleanRoom } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: addedBy || 'admin'
  };

  // 1. Store in dedicated IGNITE 2026 coordinators database (`igniteCoordinators`)
  const igniteDocId = buildIgniteCoordDocId({
    email: resolvedEmail,
    usn: resolvedUsn,
    name: resolvedName
  });
  await setDoc(doc(db, IGNITE_COORDINATORS_COLLECTION, igniteDocId), coordRecord, { merge: true });

  // 2. Also create/update `roles/{resolvedEmail}` when email is known so login & rules permissions apply
  if (resolvedEmail) {
    await setDoc(doc(db, 'roles', resolvedEmail), coordRecord, { merge: true });
  }

  // 3. Sync to settings/coordinatorConfig activeStates
  const activeUpdates = {};
  if (resolvedEmail) activeUpdates[resolvedEmail] = 'coordinator';
  if (resolvedUsn) activeUpdates[resolvedUsn] = 'coordinator';
  if (resolvedUid) activeUpdates[resolvedUid] = 'coordinator';

  if (Object.keys(activeUpdates).length > 0) {
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
  }

  return {
    id: igniteDocId,
    email: resolvedEmail,
    uid: resolvedUid,
    name: resolvedName,
    usn: resolvedUsn,
    activityId: cleanActivityId,
    assignedEvent: cleanEvent,
    assignedRoom: cleanRoom
  };
}

/**
 * Update an existing coordinator's Name, Email, USN, and Event/Room assignment
 * across both `igniteCoordinators` and `roles` collections.
 */
export async function updateCoordinatorInDatabase({
  id = '',
  prevEmail = '',
  email = '',
  name = '',
  usn = '',
  activityId = '',
  assignedEvent = '',
  assignedRoom = '',
  coordinatorState = 'coordinator',
  updatedBy = 'admin'
}) {
  const newEmail = (email || '').trim().toLowerCase();
  const oldEmail = (prevEmail || '').trim().toLowerCase();
  const cleanName = (name || '').trim();
  const cleanUsn = (usn || '').trim().toUpperCase();
  const cleanActivityId = (activityId || '').trim();
  const cleanEvent = (assignedEvent || '').trim();
  const cleanRoom = (assignedRoom || '').trim();
  const state = coordinatorState === 'participant' ? 'participant' : 'coordinator';

  if (!newEmail && !cleanName) {
    throw new Error('Coordinator name or email is required.');
  }

  const targetIgniteId = newEmail || id || buildIgniteCoordDocId({ email: newEmail, usn: cleanUsn, name: cleanName });
  const payload = {
    role: state,
    coordinatorState: state,
    baseRole: 'coordinator',
    event: 'IGNITE-2026',
    name: cleanName || (newEmail ? newEmail.split('@')[0] : 'Coordinator'),
    usn: cleanUsn,
    activityId: cleanActivityId,
    assignedEvent: cleanEvent,
    assignedRoom: cleanRoom,
    ...(newEmail ? { email: newEmail } : {}),
    updatedAt: serverTimestamp(),
    updatedBy: updatedBy || 'admin'
  };

  await setDoc(doc(db, IGNITE_COORDINATORS_COLLECTION, targetIgniteId), payload, { merge: true });
  if (newEmail) {
    await setDoc(doc(db, 'roles', newEmail), payload, { merge: true });
  }

  // Clean up old doc keys if email or doc ID changed
  if (id && id !== targetIgniteId) {
    try {
      await deleteDoc(doc(db, IGNITE_COORDINATORS_COLLECTION, id));
    } catch (_) {}
  }
  if (oldEmail && newEmail && oldEmail !== newEmail) {
    try {
      await deleteDoc(doc(db, IGNITE_COORDINATORS_COLLECTION, oldEmail));
    } catch (_) {}
    try {
      await deleteDoc(doc(db, 'roles', oldEmail));
    } catch (_) {}
  }

  // Sync activeStates keys if changed
  const cached = getCachedCoordinatorConfig();
  const newActiveStates = { ...(cached.activeStates || {}) };
  if (oldEmail && oldEmail !== newEmail) delete newActiveStates[oldEmail];
  if (newEmail) newActiveStates[newEmail] = state;
  if (cleanUsn) newActiveStates[cleanUsn] = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cached, activeStates: newActiveStates }));
  } catch (_) {}
  try {
    await setDoc(doc(db, 'settings', 'coordinatorConfig'), {
      activeStates: newActiveStates,
      updatedAt: serverTimestamp(),
      updatedBy: updatedBy || 'admin'
    }, { merge: true });
  } catch (_) {}

  return {
    id: targetIgniteId,
    email: newEmail,
    name: payload.name,
    usn: cleanUsn,
    activityId: cleanActivityId,
    assignedEvent: cleanEvent,
    assignedRoom: cleanRoom
  };
}

/**
 * Automatically syncs resolved participant name, USN, and UID to roles & igniteCoordinators in Firestore
 */
export async function syncCoordinatorDetailsInDatabase(coord) {
  const email = (coord.email || (coord.id && coord.id.includes('@') ? coord.id : '')).trim().toLowerCase();
  const uid = coord.uid || (!coord.id?.includes('@') && !coord.id?.startsWith('coord_') ? coord.id : '');
  const docKey = email || uid;
  if (!docKey) return null;

  const details = await getParticipantDetails({ email, uid, usn: coord.usn });
  if (details && (details.name || details.usn)) {
    const syncPatch = {
      ...(details.name ? { name: details.name } : {}),
      ...(details.usn ? { usn: details.usn } : {}),
      ...(details.uid ? { uid: details.uid } : {}),
      updatedAt: serverTimestamp()
    };
    try {
      await setDoc(doc(db, 'roles', docKey), syncPatch, { merge: true });
    } catch (e) {}
    try {
      await setDoc(doc(db, IGNITE_COORDINATORS_COLLECTION, coord.id || docKey), {
        ...syncPatch,
        event: 'IGNITE-2026'
      }, { merge: true });
    } catch (e) {}
    return details;
  }
  return null;
}

/**
 * Remove a coordinator from `igniteCoordinators` and `roles`
 */
export async function removeCoordinatorFromDatabase(emailOrId, removedBy) {
  if (!emailOrId) return;
  const raw = emailOrId.trim();
  const cleanKey = raw.includes('@') ? raw.toLowerCase() : raw;

  try {
    await deleteDoc(doc(db, IGNITE_COORDINATORS_COLLECTION, cleanKey));
  } catch (_) {}

  if (cleanKey.includes('@')) {
    const roleDocRef = doc(db, 'roles', cleanKey);
    try {
      await deleteDoc(roleDocRef);
    } catch (err) {
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
}
