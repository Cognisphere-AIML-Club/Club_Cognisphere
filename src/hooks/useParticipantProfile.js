import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export function validateUSN(rawUsn) {
  if (!rawUsn) return { valid: false, message: 'USN is required' };
  const usn = rawUsn.trim().toUpperCase();
  if (usn.length !== 10) {
    return { valid: false, message: 'USN must be exactly 10 characters (e.g. 1ST24AI045)' };
  }
  // 1ST + year (22-26, e.g. 24, 25, 26) + 2 letters branch + 3 digits roll number
  const usnRegex = /^1ST(2[2-6])[A-Z]{2}\d{3}$/;
  if (!usnRegex.test(usn)) {
    return { 
      valid: false, 
      message: 'Invalid USN format. Must be 1ST[YY][BRANCH][ROLL] (e.g. 1ST24AI045, where year is 24/25/26 and last 3 are digits)' 
    };
  }
  return { valid: true, usn };
}

export function useParticipantProfile(user) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !user.uid) {
      setProfile(null);
      setLoading(false);
      setNeedsProfileCompletion(false);
      return;
    }

    setLoading(true);
    const docRef = doc(db, 'participants', user.uid);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setProfile(data);

          if (data.qrId) {
            try {
              localStorage.setItem('club_games_qr_id', data.qrId);
              localStorage.setItem('club_games_cached_profile', JSON.stringify(data));
            } catch (e) {}
          }

          // Check if profile is complete
          const hasName = Boolean(data.firstName && data.firstName.trim().length > 0);
          const hasUsn = Boolean(data.usn && validateUSN(data.usn).valid);
          const hasMobile = Boolean(data.mobile && data.mobile.trim().length === 10);

          if (!hasName || !hasUsn || !hasMobile) {
            setNeedsProfileCompletion(true);
          } else {
            setNeedsProfileCompletion(false);
          }
        } else {
          // Document does not exist yet
          let existingQrId = null;
          try {
            existingQrId = localStorage.getItem('club_games_qr_id');
          } catch (e) {}

          const generatedQrId = existingQrId || (crypto.randomUUID ? crypto.randomUUID() : `qr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
          
          // Split display name if available
          const nameParts = (user.displayName || '').trim().split(' ');
          const initialFirst = nameParts[0] || '';
          const initialLast = nameParts.slice(1).join(' ') || '';

          setProfile({
            uid: user.uid,
            firstName: initialFirst,
            lastName: initialLast,
            name: user.displayName || '',
            usn: '',
            email: user.email || '',
            qrId: generatedQrId,
            mobile: user.phoneNumber ? user.phoneNumber.replace(/\D/g, '').slice(-10) : '',
          });

          setNeedsProfileCompletion(true);
        }
        setLoading(false);
      },
      (err) => {
        // Fallback for offline mode: load cached profile & qrId from localStorage
        const cachedRaw = localStorage.getItem('club_games_cached_profile');
        const cachedQrId = localStorage.getItem('club_games_qr_id');

        if (cachedRaw) {
          try {
            const parsed = JSON.parse(cachedRaw);
            setProfile(parsed);
            setNeedsProfileCompletion(false);
            setLoading(false);
            return;
          } catch (e) {}
        }

        if (cachedQrId) {
          setProfile({
            uid: user.uid,
            firstName: user.displayName || 'Participant',
            lastName: '',
            name: user.displayName || 'Participant',
            usn: 'CACHED',
            email: user.email || '',
            qrId: cachedQrId,
            mobile: '',
          });
          setNeedsProfileCompletion(false);
        } else {
          setError('Unable to load profile. Please check your internet connection.');
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const saveProfile = async ({ firstName, lastName, usn, mobile }) => {
    if (!user) throw new Error('User not authenticated');

    const cleanFirst = (firstName || '').trim();
    if (!cleanFirst) {
      throw new Error('First name is required');
    }

    const cleanLast = (lastName || '').trim();
    const fullName = cleanLast ? `${cleanFirst} ${cleanLast}` : cleanFirst;

    const usnCheck = validateUSN(usn);
    if (!usnCheck.valid) {
      throw new Error(usnCheck.message);
    }

    const cleanMobile = (mobile || '').replace(/\D/g, '').slice(-10);
    if (!/^\d{10}$/.test(cleanMobile)) {
      throw new Error('Please enter a valid 10-digit mobile number');
    }

    const qrIdToSave = profile?.qrId || localStorage.getItem('club_games_qr_id') || crypto.randomUUID();

    // 1. Private participant document (sensitive: contains email and phone)
    const participantData = {
      uid: user.uid,
      firstName: cleanFirst,
      lastName: cleanLast,
      name: fullName,
      usn: usnCheck.usn,
      email: user.email || '',
      mobile: cleanMobile,
      qrId: qrIdToSave,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    // 2. Privacy-preserving public QR pass index (NO email, NO phone)
    const qrPassData = {
      participantId: user.uid,
      name: fullName,
      usn: usnCheck.usn,
      qrId: qrIdToSave,
      updatedAt: serverTimestamp(),
    };

    try {
      localStorage.setItem('club_games_qr_id', qrIdToSave);
      localStorage.setItem('club_games_cached_profile', JSON.stringify({
        ...participantData,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }));
    } catch (e) {}

    // Save both atomically
    await setDoc(doc(db, 'participants', user.uid), participantData, { merge: true });
    await setDoc(doc(db, 'qrPasses', qrIdToSave), qrPassData, { merge: true });

    setNeedsProfileCompletion(false);
    return participantData;
  };

  return {
    profile,
    loading,
    needsProfileCompletion,
    error,
    saveProfile,
  };
}
