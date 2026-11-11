import { useState, useEffect, useRef } from 'react';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  Timestamp, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { playWarningBeep, playTimesUpBuzzer } from '../services/timerSound';

export function useSharedTimer(activityId, defaultDurationSeconds = 60) {
  const [timerDoc, setTimerDoc] = useState(null);
  const [remainingMs, setRemainingMs] = useState(defaultDurationSeconds * 1000);
  const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'paused' | 'finished'
  const [durationSeconds, setDurationSeconds] = useState(defaultDurationSeconds);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const warned10SecRef = useRef(false);
  const buzzerFiredRef = useRef(false);

  // 1. Subscribe to Firestore timer document for this activity
  useEffect(() => {
    if (!activityId) return;

    const docRef = doc(db, 'timers', activityId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTimerDoc(data);
          setStatus(data.status || 'idle');
          setDurationSeconds(data.durationSeconds || defaultDurationSeconds);

          if (data.status === 'paused' || data.status === 'idle') {
            setRemainingMs(data.remainingMs ?? (data.durationSeconds || defaultDurationSeconds) * 1000);
          } else if (data.status === 'finished') {
            setRemainingMs(0);
          }
        } else {
          // Document does not exist yet: initialize state as idle
          setTimerDoc(null);
          setStatus('idle');
          setRemainingMs(defaultDurationSeconds * 1000);
          setDurationSeconds(defaultDurationSeconds);
        }
      },
      () => {
        // Fallback on error
        setStatus('idle');
        setRemainingMs(defaultDurationSeconds * 1000);
      }
    );

    return () => unsubscribe();
  }, [activityId, defaultDurationSeconds]);

  // 2. High-precision drift-free local countdown rendering loop
  useEffect(() => {
    let animId = null;

    const tick = () => {
      if (status === 'running' && timerDoc?.endsAt) {
        const endsAtMs = timerDoc.endsAt.toMillis ? timerDoc.endsAt.toMillis() : timerDoc.endsAt;
        const now = Date.now();
        const diff = Math.max(0, endsAtMs - now);

        setRemainingMs(diff);

        // Sound cue at <= 10 seconds
        if (diff <= 10000 && diff > 9000 && !warned10SecRef.current) {
          warned10SecRef.current = true;
          if (soundEnabled) playWarningBeep();
        }

        // Final buzzer cue at 0
        if (diff <= 100 && !buzzerFiredRef.current) {
          buzzerFiredRef.current = true;
          if (soundEnabled) playTimesUpBuzzer();
          setStatus('finished');
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [status, timerDoc, soundEnabled]);

  // Reset audio flags when timer resets or starts
  useEffect(() => {
    if (status === 'idle' || (status === 'running' && remainingMs > 12000)) {
      warned10SecRef.current = false;
      buzzerFiredRef.current = false;
    }
  }, [status, remainingMs]);

  // === ROOM COORDINATOR / ADMIN TIMER CONTROLS ===

  const startTimer = async (customSeconds = null, operatorEmail = 'coordinator') => {
    const durSec = customSeconds || durationSeconds;
    const now = Date.now();
    const endsAt = Timestamp.fromMillis(now + durSec * 1000);

    warned10SecRef.current = false;
    buzzerFiredRef.current = false;

    const docRef = doc(db, 'timers', activityId);
    await setDoc(docRef, {
      activityId,
      status: 'running',
      durationSeconds: durSec,
      endsAt,
      remainingMs: durSec * 1000,
      updatedAt: serverTimestamp(),
      updatedBy: operatorEmail,
    }, { merge: true });
  };

  const pauseTimer = async (operatorEmail = 'coordinator') => {
    let currentRemaining = remainingMs;
    if (timerDoc?.endsAt) {
      const endsAtMs = timerDoc.endsAt.toMillis ? timerDoc.endsAt.toMillis() : timerDoc.endsAt;
      currentRemaining = Math.max(0, endsAtMs - Date.now());
    }

    const docRef = doc(db, 'timers', activityId);
    await setDoc(docRef, {
      activityId,
      status: 'paused',
      endsAt: null,
      remainingMs: currentRemaining,
      updatedAt: serverTimestamp(),
      updatedBy: operatorEmail,
    }, { merge: true });
  };

  const resumeTimer = async (operatorEmail = 'coordinator') => {
    const currentRemaining = remainingMs > 0 ? remainingMs : durationSeconds * 1000;
    const now = Date.now();
    const endsAt = Timestamp.fromMillis(now + currentRemaining);

    const docRef = doc(db, 'timers', activityId);
    await setDoc(docRef, {
      activityId,
      status: 'running',
      endsAt,
      remainingMs: currentRemaining,
      updatedAt: serverTimestamp(),
      updatedBy: operatorEmail,
    }, { merge: true });
  };

  const resetTimer = async (customSeconds = null, operatorEmail = 'coordinator') => {
    const durSec = customSeconds || durationSeconds;
    warned10SecRef.current = false;
    buzzerFiredRef.current = false;

    const docRef = doc(db, 'timers', activityId);
    await setDoc(docRef, {
      activityId,
      status: 'idle',
      durationSeconds: durSec,
      endsAt: null,
      remainingMs: durSec * 1000,
      updatedAt: serverTimestamp(),
      updatedBy: operatorEmail,
    }, { merge: true });
  };

  const adjustTime = async (deltaSeconds, operatorEmail = 'coordinator') => {
    let newRemaining = remainingMs + (deltaSeconds * 1000);
    if (newRemaining < 0) newRemaining = 0;

    const docRef = doc(db, 'timers', activityId);

    if (status === 'running') {
      const now = Date.now();
      const newEndsAt = Timestamp.fromMillis(now + newRemaining);
      await setDoc(docRef, {
        endsAt: newEndsAt,
        remainingMs: newRemaining,
        updatedAt: serverTimestamp(),
        updatedBy: operatorEmail,
      }, { merge: true });
    } else {
      await setDoc(docRef, {
        remainingMs: newRemaining,
        updatedAt: serverTimestamp(),
        updatedBy: operatorEmail,
      }, { merge: true });
    }
  };

  // Convert milliseconds into display minutes and seconds
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isLast10Sec = totalSeconds <= 10 && totalSeconds > 0 && status === 'running';
  const isZero = totalSeconds === 0;

  return {
    remainingMs,
    totalSeconds,
    minutes,
    seconds,
    status,
    durationSeconds,
    isLast10Sec,
    isZero,
    soundEnabled,
    setSoundEnabled,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    adjustTime,
  };
}

