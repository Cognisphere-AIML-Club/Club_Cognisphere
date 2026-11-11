import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ACTIVITIES as DEFAULT_ACTIVITIES } from '../data/activities';

export function useActivities() {
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activitiesRef = collection(db, 'activities');

    const unsubscribe = onSnapshot(
      activitiesRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteMap = {};
          snapshot.forEach(docSnap => {
            remoteMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
          });

          // Merge defaults with remote edits
          const merged = DEFAULT_ACTIVITIES.map(def => {
            if (remoteMap[def.id]) {
              return { ...def, ...remoteMap[def.id] };
            }
            return def;
          });
          setActivities(merged);
        } else {
          setActivities(DEFAULT_ACTIVITIES);
        }
        setLoading(false);
      },
      (err) => {
        // Fallback to static defaults if offline or permission pending
        setActivities(DEFAULT_ACTIVITIES);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateActivity = async (activityId, fields) => {
    const docRef = doc(db, 'activities', activityId);
    await setDoc(docRef, {
      ...fields,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  };

  return { activities, loading, updateActivity };
}

