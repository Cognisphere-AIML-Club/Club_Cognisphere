import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc,
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

const DISMISSED_KEY = 'club_games_dismissed_announcements';
const PINNED_DEFAULTS_KEY = 'club_games_pinned_defaults';

// Default announcements if collection is empty
export const DEFAULT_ANNOUNCEMENTS = [
  {
    id: 'default-welcome',
    title: 'Welcome to Club Games 2026!',
    message: 'Please ensure your attendance QR pass is scanned by the room coordinator at the entrance before each competition starts.',
    type: 'info', // 'info' | 'urgent' | 'success'
    pinned: true,
    createdAt: new Date()
  },
  {
    id: 'default-schedule',
    title: 'Room Timers are Live',
    message: 'Track synchronized countdowns for all 5 rooms live on your phone or classroom projectors.',
    type: 'success',
    pinned: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15)
  }
];

export function getDismissedAnnouncementIds() {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

export function addDismissedAnnouncementId(id) {
  try {
    const list = getDismissedAnnouncementIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(list));
    }
  } catch (e) {}
}

export function getPinnedDefaults() {
  try {
    return JSON.parse(localStorage.getItem(PINNED_DEFAULTS_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

export function setPinnedDefault(id, isPinned) {
  try {
    const map = getPinnedDefaults();
    map[id] = isPinned;
    localStorage.setItem(PINNED_DEFAULTS_KEY, JSON.stringify(map));
  } catch (e) {}
}

export function getFilteredDefaultAnnouncements() {
  const dismissed = getDismissedAnnouncementIds();
  const pinnedMap = getPinnedDefaults();
  return DEFAULT_ANNOUNCEMENTS
    .filter(a => !dismissed.includes(a.id))
    .map(a => ({
      ...a,
      pinned: pinnedMap[a.id] !== undefined ? Boolean(pinnedMap[a.id]) : Boolean(a.pinned)
    }));
}

export function sortAnnouncements(list) {
  return [...list].sort((a, b) => {
    const pinA = Boolean(a.pinned);
    const pinB = Boolean(b.pinned);
    if (pinA !== pinB) {
      return pinA ? -1 : 1;
    }
    const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
    const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
    return tB - tA;
  });
}

/**
 * Subscribe to real-time announcements from Firestore
 * Uses single collection query without compound order to avoid Firestore composite index requirements
 */
export function subscribeAnnouncements(callback) {
  try {
    const q = query(collection(db, 'announcements'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt?.toDate ? docSnap.data().createdAt.toDate() : (docSnap.data().createdAt ? new Date(docSnap.data().createdAt) : new Date())
          }));
          callback(sortAnnouncements(list));
        } else {
          callback(sortAnnouncements(getFilteredDefaultAnnouncements()));
        }
      },
      (error) => {
        console.warn('Announcements snapshot error (using fallback):', error.message);
        callback(sortAnnouncements(getFilteredDefaultAnnouncements()));
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to announcements:', err);
    callback(sortAnnouncements(getFilteredDefaultAnnouncements()));
    return () => {};
  }
}

/**
 * Post a new announcement (Admin only)
 */
export async function createAnnouncement({ title, message, type = 'info', pinned = false, authorEmail = 'admin' }) {
  const colRef = collection(db, 'announcements');
  const docRef = await addDoc(colRef, {
    title: title.trim(),
    message: message.trim(),
    type,
    pinned: Boolean(pinned),
    authorEmail,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Delete an announcement (Admin only)
 */
export async function deleteAnnouncement(announcementId) {
  if (!announcementId) return;

  if (announcementId.startsWith('default-')) {
    addDismissedAnnouncementId(announcementId);
    return;
  }

  try {
    const docRef = doc(db, 'announcements', announcementId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting announcement in Firestore:', err);
    addDismissedAnnouncementId(announcementId);
    throw err;
  }
}

/**
 * Toggle pin status of an announcement (Admin only)
 */
export async function updateAnnouncementPin(announcementId, currentPinned, fallbackItem = null) {
  if (!announcementId) return;

  if (announcementId.startsWith('default-')) {
    setPinnedDefault(announcementId, !currentPinned);
    // Also attempt to push to Firestore
    try {
      const itemToSave = fallbackItem || DEFAULT_ANNOUNCEMENTS.find(a => a.id === announcementId);
      if (itemToSave) {
        const colRef = collection(db, 'announcements');
        await addDoc(colRef, {
          title: itemToSave.title,
          message: itemToSave.message,
          type: itemToSave.type || 'info',
          pinned: !currentPinned,
          authorEmail: 'admin',
          createdAt: serverTimestamp()
        });
        addDismissedAnnouncementId(announcementId);
      }
    } catch (e) {
      console.warn('Saved default pin state locally:', e);
    }
    return;
  }

  const docRef = doc(db, 'announcements', announcementId);
  await updateDoc(docRef, { pinned: !currentPinned });
}

/**
 * Update an existing announcement (Admin only)
 */
export async function updateAnnouncement(announcementId, { title, message, type = 'info', pinned = false }) {
  if (!announcementId) return;

  if (announcementId.startsWith('default-')) {
    const colRef = collection(db, 'announcements');
    await addDoc(colRef, {
      title: title.trim(),
      message: message.trim(),
      type,
      pinned: Boolean(pinned),
      authorEmail: 'admin',
      createdAt: serverTimestamp()
    });
    addDismissedAnnouncementId(announcementId);
    return;
  }

  const docRef = doc(db, 'announcements', announcementId);
  await updateDoc(docRef, {
    title: title.trim(),
    message: message.trim(),
    type,
    pinned: Boolean(pinned),
    updatedAt: serverTimestamp()
  });
}
