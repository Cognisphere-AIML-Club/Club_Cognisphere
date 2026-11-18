import { pushBulkParticipantsToGoogleSheet } from './googleSheetsService';
import { useState, useEffect } from 'react';

const BATCH_STORAGE_KEY = 'cognisphere_sheets_batch_queue';
const LAST_SYNC_KEY = 'cognisphere_sheets_last_sync_result';
export const SYNC_WINDOW_MS = 10 * 60 * 1000; // 10 minutes from first approval

let isSyncing = false;
const subscribers = new Set();
let runnerInterval = null;

/**
 * Read the current batch queue from localStorage
 */
export function getPendingBatch() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BATCH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.error('Error reading pending sheets batch:', err);
    return null;
  }
}

/**
 * Save the batch object to localStorage
 */
function saveBatch(batch) {
  if (typeof window === 'undefined') return;
  try {
    if (!batch || !batch.items || batch.items.length === 0) {
      localStorage.removeItem(BATCH_STORAGE_KEY);
    } else {
      localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(batch));
    }
  } catch (err) {
    console.error('Error saving pending sheets batch:', err);
  }
  notifySubscribers();
}

/**
 * Read last sync result from storage
 */
export function getLastSyncResult() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Format remaining seconds into MM:SS (e.g. "09:42" or "9m 42s")
 */
export function formatRemainingTime(seconds) {
  if (seconds <= 0) return '0m 00s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/**
 * Get comprehensive batch status for subscribers and UI
 */
export function getBatchStatus() {
  const batch = getPendingBatch();
  if (!batch || !batch.items || batch.items.length === 0) {
    return {
      hasBatch: false,
      itemCount: 0,
      items: [],
      firstApprovalAt: null,
      targetSyncAt: null,
      remainingSeconds: 0,
      remainingFormatted: '0m 00s',
      isSyncing,
      lastSyncResult: getLastSyncResult()
    };
  }

  const now = Date.now();
  const remainingMs = Math.max(0, batch.targetSyncAt - now);
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  return {
    hasBatch: true,
    itemCount: batch.items.length,
    items: batch.items,
    firstApprovalAt: batch.firstApprovalAt,
    targetSyncAt: batch.targetSyncAt,
    remainingSeconds,
    remainingFormatted: formatRemainingTime(remainingSeconds),
    isSyncing,
    lastSyncResult: getLastSyncResult()
  };
}

/**
 * Queue a single approved pass for the 10-minute debounced batch sync.
 * If this is the first approval, starts the 10-minute countdown.
 * If a batch is already pending, retains the original targetSyncAt.
 */
export function queueApprovalForSheetsSync({ activityId, participantName, participantUsn }) {
  if (!activityId) return;

  const now = Date.now();
  let batch = getPendingBatch();

  if (!batch) {
    // First approval in this 10-minute window
    batch = {
      firstApprovalAt: now,
      targetSyncAt: now + SYNC_WINDOW_MS,
      items: []
    };
  }

  const cleanUsn = (participantUsn || '').trim().toUpperCase();
  const cleanName = (participantName || '').trim();
  const dedupKey = `${activityId}:::${cleanUsn || cleanName}`;

  // Check if participant is already in queue for this activity
  const exists = batch.items.some(
    item => `${item.activityId}:::${(item.participantUsn || item.participantName).trim().toUpperCase()}` === dedupKey
  );

  if (!exists) {
    batch.items.push({
      activityId,
      participantName: cleanName,
      participantUsn: cleanUsn,
      approvedAt: now
    });
    saveBatch(batch);
  }

  ensureRunner();
  return getBatchStatus();
}

/**
 * Queue bulk approved passes into the 10-minute debounced batch sync.
 * Retains existing firstApprovalAt and targetSyncAt if batch is already active.
 */
export function queueBulkApprovalsForSheetsSync(approvalsList = []) {
  if (!Array.isArray(approvalsList) || approvalsList.length === 0) return;

  const now = Date.now();
  let batch = getPendingBatch();

  if (!batch) {
    batch = {
      firstApprovalAt: now,
      targetSyncAt: now + SYNC_WINDOW_MS,
      items: []
    };
  }

  const existingKeys = new Set(
    batch.items.map(item => `${item.activityId}:::${(item.participantUsn || item.participantName).trim().toUpperCase()}`)
  );

  let addedCount = 0;
  for (const app of approvalsList) {
    if (!app || !app.activityId) continue;
    const cleanUsn = (app.participantUsn || '').trim().toUpperCase();
    const cleanName = (app.participantName || '').trim();
    const key = `${app.activityId}:::${cleanUsn || cleanName}`;

    if (!existingKeys.has(key)) {
      existingKeys.add(key);
      batch.items.push({
        activityId: app.activityId,
        participantName: cleanName,
        participantUsn: cleanUsn,
        approvedAt: now
      });
      addedCount++;
    }
  }

  if (addedCount > 0) {
    saveBatch(batch);
  }

  ensureRunner();
  return getBatchStatus();
}

/**
 * Flushes all pending approvals in one consolidated batch to Google Sheets.
 * Deduplicates by activity tab and executes pushBulkParticipantsToGoogleSheet.
 */
export async function flushSheetsBatchSync() {
  if (isSyncing) return { success: false, inProgress: true };

  const batch = getPendingBatch();
  if (!batch || !batch.items || batch.items.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    isSyncing = true;
    notifySubscribers();

    // Group queued participants by activityId
    const byActivity = {};
    for (const item of batch.items) {
      if (!byActivity[item.activityId]) byActivity[item.activityId] = [];
      byActivity[item.activityId].push({
        participantName: item.participantName,
        participantUsn: item.participantUsn
      });
    }

    const activityIds = Object.keys(byActivity);
    const syncPromises = activityIds.map(actId =>
      pushBulkParticipantsToGoogleSheet({
        activityId: actId,
        participants: byActivity[actId]
      })
    );

    const results = await Promise.allSettled(syncPromises);
    const totalCount = batch.items.length;

    // Clear batch from queue after sending
    saveBatch(null);

    // Save metadata of last sync
    const lastResult = {
      timestamp: Date.now(),
      count: totalCount,
      activities: activityIds,
      success: true
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(lastResult));
      } catch {}
    }

    return { success: true, count: totalCount, results };
  } catch (err) {
    console.error('Failed to flush sheets batch sync:', err);
    return { success: false, error: err.message };
  } finally {
    isSyncing = false;
    notifySubscribers();
  }
}

/**
 * Internal runner to check countdown and automatically flush when 10 mins pass.
 */
function ensureRunner() {
  if (typeof window === 'undefined') return;
  if (runnerInterval) return;

  runnerInterval = setInterval(() => {
    const batch = getPendingBatch();
    if (!batch) {
      // Nothing in queue, stop runner to save resources
      clearInterval(runnerInterval);
      runnerInterval = null;
      notifySubscribers();
      return;
    }

    const now = Date.now();
    if (now >= batch.targetSyncAt) {
      // 10 minutes have elapsed since first approval! Automatically flush to Google Sheets!
      flushSheetsBatchSync();
    } else {
      // Just notify subscribers so the countdown ticks smoothly
      notifySubscribers();
    }
  }, 1000);
}

/**
 * Notify all subscribed listeners
 */
function notifySubscribers() {
  const status = getBatchStatus();
  subscribers.forEach(cb => {
    try {
      cb(status);
    } catch (e) {
      console.error('Batch sync subscriber error:', e);
    }
  });
}

/**
 * Subscribe to batch sync status updates
 */
export function subscribeToSheetsBatch(callback) {
  subscribers.add(callback);
  // Emit initial state
  callback(getBatchStatus());

  ensureRunner();

  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Hook for React components to display countdown, count, and manual sync action
 */
export function useSheetsBatchSync() {
  const [status, setStatus] = useState(() => getBatchStatus());

  useEffect(() => {
    const unsub = subscribeToSheetsBatch(setStatus);
    return () => unsub();
  }, []);

  return {
    ...status,
    flushNow: flushSheetsBatchSync
  };
}

// Listen for cross-tab storage changes
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === BATCH_STORAGE_KEY) {
      notifySubscribers();
      ensureRunner();
    }
  });

  // Check immediately on script load if a pending batch exists
  if (getPendingBatch()) {
    ensureRunner();
  }
}

