import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ACTIVITIES, getActivityById } from '../data/activities';
import { 
  subscribeToAllPassRequests, 
  subscribeToUserPassRequests, 
  requestGamePass, 
  reviewPassRequest, 
  bulkReviewPassRequests 
} from '../services/passApprovalService';
import {
  subscribeToAllAttendance,
  subscribeToUnregisteredParticipants,
  addUnregisteredParticipant,
  addBulkUnregisteredParticipants,
  deleteAttendanceRecord,
  deleteUnregisteredParticipant,
  getOfflineQueue,
  syncOfflineQueue
} from '../services/attendanceService';
import { buildCertificateId } from '../services/certificateService';
import {
  subscribeToParticipantsCollection,
  lookupParticipantProfile
} from '../services/coordinatorConfigService';
import { 
  ClipboardCheck, 
  UserCheck, 
  UserPlus,
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Send, 
  QrCode, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  Loader2, 
  Calendar, 
  MapPin, 
  ChevronRight,
  RefreshCw,
  Users,
  Sparkles,
  LogIn,
  Download,
  Trash2,
  ArrowUpDown,
  FileSpreadsheet,
  Award,
  ExternalLink,
  Mail,
  X
} from 'lucide-react';
import {
  queueApprovalForSheetsSync,
  queueBulkApprovalsForSheetsSync,
  useSheetsBatchSync
} from '../services/sheetsBatchSyncService';
import { pushBulkParticipantsToGoogleSheet } from '../services/googleSheetsService';
import CertificateEmailsModal from './CertificateEmailsModal';

// Format scan timestamp for display
function formatAttendanceTime(timestamp) {
  if (!timestamp) return 'Just now';
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(date.getTime())) return 'Recently';

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + 
    date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Relative time helper
function getRelativeTime(timestamp) {
  if (!timestamp) return null;
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function RegistrationsHub({
  user,
  profile,
  isAdmin = false,
  isCoordinator = false,
  isStaff = false,
  canManageDesk = true,
  onViewPass,
  onSignIn,
  activities = ACTIVITIES
}) {
  const effectiveIsStaff = isAdmin || (isStaff && canManageDesk);
  const allActivities = activities && activities.length > 0 ? activities : ACTIVITIES;
  const getActivity = (id) => allActivities.find(a => a.id === id) || allActivities[0];

  // Staff view mode toggle: 'desk' (Approvals queue) or 'attendance' (Activity attendance records)
  const [activeStaffMode, setActiveStaffMode] = useState('desk');

  // Attendance records state (Staff / Admin): combines registered QR attendance + unregistered walk-ins
  const [registeredAttendance, setRegisteredAttendance] = useState([]);
  const [unregisteredAttendance, setUnregisteredAttendance] = useState([]);
  const [participantsMap, setParticipantsMap] = useState({});
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [selectedAttendanceActivity, setSelectedAttendanceActivity] = useState('all');
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [attendanceSort, setAttendanceSort] = useState('newest'); // 'newest' | 'oldest' | 'name'
  const [deletingAttendanceId, setDeletingAttendanceId] = useState(null);
  const [offlineQueueCount, setOfflineQueueCount] = useState(() => getOfflineQueue().length);
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Add Unregistered (Walk-In) Participant modal state
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInMode, setWalkInMode] = useState('single'); // 'single' | 'bulk'
  const [walkInActivityId, setWalkInActivityId] = useState(() => allActivities[0]?.id || '');
  const [walkInName, setWalkInName] = useState('');
  const [walkInUsn, setWalkInUsn] = useState('');
  const [walkInEmail, setWalkInEmail] = useState('');
  const [walkInBulkText, setWalkInBulkText] = useState('');
  const [addingWalkIn, setAddingWalkIn] = useState(false);
  const [walkInFeedback, setWalkInFeedback] = useState(null);
  const [showEmailsModal, setShowEmailsModal] = useState(false);

  const allAttendance = useMemo(() => {
    const merged = [...registeredAttendance, ...unregisteredAttendance].map((rec) => {
      const prof = lookupParticipantProfile(participantsMap, {
        participantId: rec.participantId,
        usn: rec.participantUsn,
        email: rec.participantEmail,
        name: rec.participantName
      });
      if (!prof) return rec;
      return {
        ...rec,
        participantUsn: rec.participantUsn || prof.usn || '',
        participantEmail: rec.participantEmail || prof.email || ''
      };
    });
    merged.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
      return timeB - timeA;
    });
    return merged;
  }, [registeredAttendance, unregisteredAttendance, participantsMap]);

  // Participant state
  const [userRequests, setUserRequests] = useState({});
  const [requestingActivityId, setRequestingActivityId] = useState(null);
  const [participantFilter, setParticipantFilter] = useState('all'); // 'all' | 'approved' | 'pending'

  // Staff approvals queue state
  const [allRequests, setAllRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [selectedActivityFilter, setSelectedActivityFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('pending'); // default to pending for fast coordinator workflow
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgressId, setActionInProgressId] = useState(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);

  // Subscribe to participant's own pass requests
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToUserPassRequests(user.uid, (map) => {
      setUserRequests(map);
    });
    return () => unsub();
  }, [user?.uid]);

  // Subscribe to all pass requests if user is staff (Admin or Coordinator)
  useEffect(() => {
    if (!effectiveIsStaff) {
      setLoadingRequests(false);
      return;
    }

    setLoadingRequests(true);
    const unsub = subscribeToAllPassRequests((list) => {
      setAllRequests(list);
      setLoadingRequests(false);
    });
    return () => unsub();
  }, [effectiveIsStaff]);

  // Subscribe to registered attendance & unregistered walk-in records if user is staff (Admin or Coordinator)
  useEffect(() => {
    if (!effectiveIsStaff) {
      setLoadingAttendance(false);
      return;
    }

    setLoadingAttendance(true);
    let regLoaded = false;
    let unregLoaded = false;

    const checkLoaded = () => {
      if (regLoaded && unregLoaded) setLoadingAttendance(false);
    };

    const unsubReg = subscribeToAllAttendance((list) => {
      setRegisteredAttendance(list);
      regLoaded = true;
      checkLoaded();
    });

    const unsubUnreg = subscribeToUnregisteredParticipants((list) => {
      setUnregisteredAttendance(list);
      unregLoaded = true;
      checkLoaded();
    });

    const unsubParticipants = subscribeToParticipantsCollection(setParticipantsMap);

    return () => {
      unsubReg();
      unsubUnreg();
      unsubParticipants();
    };
  }, [effectiveIsStaff]);

  // Parse bulk lines ("Name, USN" or "Name | USN" or "Name")
  const parsedBulkWalkIns = useMemo(() => {
    if (!walkInBulkText.trim()) return [];
    return walkInBulkText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split(/[,|\t]+/).map(s => s.trim()).filter(Boolean);
        return {
          participantName: parts[0] || '',
          participantUsn: (parts[1] || '').toUpperCase(),
          participantEmail: parts[2] || ''
        };
      })
      .filter(p => p.participantName.length > 0);
  }, [walkInBulkText]);

  // Add unregistered participant(s) handler
  const handleAddWalkInSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!walkInActivityId) {
      alert('Please select an activity.');
      return;
    }

    const actObj = getActivity(walkInActivityId);
    const addedByEmail = user?.email || 'staff';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    try {
      setAddingWalkIn(true);
      setWalkInFeedback(null);

      if (walkInMode === 'single') {
        if (!walkInName.trim()) {
          alert('Please enter the participant full name.');
          return;
        }
        const res = await addUnregisteredParticipant({
          activityId: walkInActivityId,
          activityName: actObj?.name || walkInActivityId,
          participantName: walkInName,
          participantUsn: walkInUsn,
          participantEmail: walkInEmail,
          addedBy: addedByEmail,
          origin,
          participantsMap
        });

        setWalkInFeedback({
          type: res.status === 'added' ? 'success' : 'info',
          message: res.message,
          certId: res.certId,
          verifyUrl: res.verifyUrl
        });

        if (res.status === 'added') {
          setWalkInName('');
          setWalkInUsn('');
          setWalkInEmail('');
          setSuccessBanner(`Added ${res.record?.participantName} & issued certificate ${res.certId}!`);
        }
      } else {
        if (parsedBulkWalkIns.length === 0) {
          alert('Please enter at least one participant name.');
          return;
        }
        const summary = await addBulkUnregisteredParticipants({
          activityId: walkInActivityId,
          activityName: actObj?.name || walkInActivityId,
          participants: parsedBulkWalkIns,
          addedBy: addedByEmail,
          origin,
          participantsMap
        });

        const addedCount = summary.added.length;
        const skippedCount = summary.alreadyMarked.length;
        const failedCount = summary.failed.length;

        setWalkInFeedback({
          type: addedCount > 0 ? 'success' : 'info',
          message: `Processed ${parsedBulkWalkIns.length}: ${addedCount} added & certificates issued${skippedCount ? `, ${skippedCount} already recorded` : ''}${failedCount ? `, ${failedCount} failed` : ''}.`
        });

        if (addedCount > 0) {
          setWalkInBulkText('');
          setSuccessBanner(`Added ${addedCount} unregistered participant(s) & issued participation certificates!`);
        }
      }
    } catch (err) {
      const msg = err?.code === 'permission-denied' || (err?.message || '').toLowerCase().includes('permission')
        ? 'Permission denied: Please publish the updated firestore.rules in Firebase Console to allow writing to unregisteredParticipants.'
        : (err?.message || 'Failed to add unregistered participant');
      setWalkInFeedback({ type: 'error', message: msg });
    } finally {
      setAddingWalkIn(false);
    }
  };

  // Sync offline queue handler
  const handleSyncOfflineAttendance = async () => {
    try {
      setSyncingOffline(true);
      const res = await syncOfflineQueue();
      setOfflineQueueCount(res.remaining || 0);
      if (res.synced > 0) {
        setSuccessBanner(`Successfully synced ${res.synced} offline attendance scan(s)!`);
      } else {
        alert('Offline queue is already clear.');
      }
    } catch (err) {
      alert(`Sync error: ${err.message}`);
    } finally {
      setSyncingOffline(false);
    }
  };

  // Remove attendance record handler (Admin for registered, Admin/Staff for walk-in)
  const handleDeleteAttendance = async (rec, studentName, eventName) => {
    const canDeleteThis = rec?.isUnregistered ? effectiveIsStaff : isAdmin;
    if (!canDeleteThis) {
      alert('Only administrators can remove registered attendance records.');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove the attendance record for ${studentName || 'this student'} in ${eventName || 'this event'}?`)) {
      return;
    }
    try {
      setDeletingAttendanceId(rec.id);
      if (rec.isUnregistered) {
        await deleteUnregisteredParticipant(rec.id);
      } else {
        await deleteAttendanceRecord(rec.id);
      }
      setSuccessBanner(`Attendance record for ${studentName || 'student'} removed.`);
    } catch (err) {
      alert(err.message || 'Failed to remove attendance record');
    } finally {
      setDeletingAttendanceId(null);
    }
  };

  // Auto-dismiss success toast
  useEffect(() => {
    if (!successBanner) return;
    const timer = setTimeout(() => setSuccessBanner(null), 4000);
    return () => clearTimeout(timer);
  }, [successBanner]);

  // Participant action: Request pass for a game
  const handleRequestPass = async (activityId) => {
    if (!user) {
      if (onSignIn) onSignIn();
      return;
    }
    try {
      setRequestingActivityId(activityId);
      const displayName = profile?.name || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || user.displayName || 'Participant';
      await requestGamePass({
        activityId,
        participantId: user.uid,
        participantName: displayName,
        participantUsn: profile?.usn || '',
      });
      setSuccessBanner(`Pass requested for ${getActivity(activityId)?.name}!`);
    } catch (err) {
      alert(err.message || 'Failed to request pass');
    } finally {
      setRequestingActivityId(null);
    }
  };

  const [syncingToSheets, setSyncingToSheets] = useState(false);
  const {
    hasBatch,
    itemCount: batchQueueCount,
    remainingFormatted: batchRemainingFormatted,
    isSyncing: batchSyncing,
    flushNow: flushSheetsBatchNow
  } = useSheetsBatchSync();

  // Staff action: Approve or reject single request
  const handleReviewRequest = async (requestId, status) => {
    try {
      setActionInProgressId(requestId);
      const req = allRequests.find(r => r.id === requestId);
      await reviewPassRequest(requestId, status, user?.email || 'staff');

      // 10-Minute Debounced Batch Queue: If approved, buffer for single consolidated batch sync
      if (status === 'approved' && req) {
        queueApprovalForSheetsSync({
          activityId: req.activityId,
          participantName: req.participantName,
          participantUsn: req.participantUsn
        });
      }

      setSuccessBanner(
        status === 'approved'
          ? 'Pass Approved & Queued for Google Sheets auto-sync (10m batch)!'
          : 'Pass Declined.'
      );
    } catch (err) {
      alert(err.message || 'Failed to update request');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Staff action: Bulk approve all pending in current filtered list
  const handleBulkApprovePending = async () => {
    const pendingList = filteredRequests.filter(r => r.status === 'pending');
    const pendingIds = pendingList.map(r => r.id);

    if (pendingIds.length === 0) return;

    if (!window.confirm(`Approve all ${pendingIds.length} pending pass requests in this view?`)) {
      return;
    }

    try {
      setBulkActionLoading(true);
      await bulkReviewPassRequests(pendingIds, 'approved', user?.email || 'staff');

      // 10-Minute Debounced Batch Queue: Buffer all approved participants into batch
      queueBulkApprovalsForSheetsSync(
        pendingList.map(r => ({
          activityId: r.activityId,
          participantName: r.participantName,
          participantUsn: r.participantUsn
        }))
      );

      setSuccessBanner(
        `Successfully approved ${pendingIds.length} pass requests & queued for Google Sheets auto-sync (10m batch)!`
      );
    } catch (err) {
      alert(err.message || 'Failed to approve all requests');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Staff action: Immediate manual flush of current 10-minute debounced queue
  const handleFlushBatchToSheets = async () => {
    try {
      setSyncingToSheets(true);
      const result = await flushSheetsBatchNow();
      if (result.success) {
        setSuccessBanner(`Successfully synced ${result.count || 0} queued approvals to Google Sheet tabs!`);
      } else {
        alert(result.error || 'Failed to sync batch to Google Sheets');
      }
    } catch (err) {
      alert(`Google Sheet Sync Error: ${err.message}`);
    } finally {
      setSyncingToSheets(false);
    }
  };

  // Staff action: Force sync all approved pass requests from Firestore to Google Sheets
  const handleForceSyncAllApproved = async () => {
    const approvedList = allRequests.filter(r => r.status === 'approved');
    if (approvedList.length === 0) {
      alert('No approved participants found to sync.');
      return;
    }

    if (!window.confirm(`Force sync all ${approvedList.length} approved participants across event tabs in Google Sheets?`)) {
      return;
    }

    try {
      setSyncingToSheets(true);
      const byActivity = {};
      for (const item of approvedList) {
        if (!byActivity[item.activityId]) byActivity[item.activityId] = [];
        byActivity[item.activityId].push({
          participantName: item.participantName,
          participantUsn: item.participantUsn
        });
      }

      let totalSynced = 0;
      const actIds = Object.keys(byActivity);
      for (const actId of actIds) {
        const res = await pushBulkParticipantsToGoogleSheet({
          activityId: actId,
          participants: byActivity[actId]
        });
        if (res.success) {
          totalSynced += (res.count || byActivity[actId].length);
        }
      }

      setSuccessBanner(
        `Successfully synced ${totalSynced} approved participants to Google Sheets across ${actIds.length} event tabs!`
      );
    } catch (err) {
      alert(`Google Sheet Sync Error: ${err.message}`);
    } finally {
      setSyncingToSheets(false);
    }
  };

  // Attach manual sync helper to window for quick console debugging/execution
  useEffect(() => {
    window.syncApprovedToSheets = handleForceSyncAllApproved;
    return () => {
      delete window.syncApprovedToSheets;
    };
  }, [allRequests]);

  // Filtered requests for Staff Approvals Desk
  const filteredRequests = useMemo(() => {
    return allRequests.filter(req => {
      // Activity filter
      if (selectedActivityFilter !== 'all' && req.activityId !== selectedActivityFilter) {
        return false;
      }
      // Status filter
      if (selectedStatusFilter !== 'all' && req.status !== selectedStatusFilter) {
        return false;
      }
      // Search filter (participant name or USN)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (req.participantName || '').toLowerCase().includes(q);
        const usnMatch = (req.participantUsn || '').toLowerCase().includes(q);
        if (!nameMatch && !usnMatch) return false;
      }
      return true;
    });
  }, [allRequests, selectedActivityFilter, selectedStatusFilter, searchQuery]);

  // Aggregate metrics for Staff (dynamically scoped to selected activity)
  const metrics = useMemo(() => {
    const relevantRequests = selectedActivityFilter === 'all'
      ? allRequests
      : allRequests.filter(r => r.activityId === selectedActivityFilter);

    const total = relevantRequests.length;
    const pending = relevantRequests.filter(r => r.status === 'pending').length;
    const approved = relevantRequests.filter(r => r.status === 'approved').length;
    const rejected = relevantRequests.filter(r => r.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [allRequests, selectedActivityFilter]);

  // Overall desk-wide pending counter for the top navigation switcher
  const totalPendingDesk = useMemo(() => {
    return allRequests.filter(r => r.status === 'pending').length;
  }, [allRequests]);

  // Filtered & sorted attendance records for Activity Attendance Hub
  const filteredAttendance = useMemo(() => {
    let list = allAttendance.filter(item => {
      // Activity filter
      if (selectedAttendanceActivity !== 'all' && item.activityId !== selectedAttendanceActivity) {
        return false;
      }
      // Search filter
      if (attendanceSearchQuery.trim()) {
        const q = attendanceSearchQuery.toLowerCase().trim();
        const nameMatch = (item.participantName || '').toLowerCase().includes(q);
        const usnMatch = (item.participantUsn || '').toLowerCase().includes(q);
        const scannedByMatch = (item.scannedBy || '').toLowerCase().includes(q);
        const act = getActivity(item.activityId);
        const eventMatch = (act?.name || '').toLowerCase().includes(q) || (act?.room || '').toLowerCase().includes(q);
        if (!nameMatch && !usnMatch && !scannedByMatch && !eventMatch) {
          return false;
        }
      }
      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (attendanceSort === 'newest') {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
        return timeB - timeA;
      }
      if (attendanceSort === 'oldest') {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
        return timeA - timeB;
      }
      if (attendanceSort === 'name') {
        return (a.participantName || '').localeCompare(b.participantName || '');
      }
      return 0;
    });

    return list;
  }, [allAttendance, selectedAttendanceActivity, attendanceSearchQuery, attendanceSort]);

  // Aggregate metrics for Activity Attendance
  const attendanceMetrics = useMemo(() => {
    const totalScans = allAttendance.length;
    const uniqueStudents = new Set(
      allAttendance.map(a => (a.participantUsn || a.participantId || '').toLowerCase()).filter(Boolean)
    ).size;

    // Per-activity attendance count map
    const countByActivity = {};
    allActivities.forEach(act => {
      countByActivity[act.id] = 0;
    });
    allAttendance.forEach(att => {
      if (countByActivity[att.activityId] !== undefined) {
        countByActivity[att.activityId]++;
      }
    });

    // Find top activity
    let topAct = null;
    let maxCount = -1;
    allActivities.forEach(act => {
      const count = countByActivity[act.id] || 0;
      if (count > maxCount && count > 0) {
        maxCount = count;
        topAct = act;
      }
    });

    const latestScan = allAttendance[0] || null;

    return {
      totalScans,
      uniqueStudents,
      countByActivity,
      topAct,
      topActCount: maxCount > 0 ? maxCount : 0,
      latestScan
    };
  }, [allAttendance, allActivities]);

  // Export filtered attendance records to CSV
  const handleExportAttendanceCsv = () => {
    if (filteredAttendance.length === 0) {
      alert('No attendance records to export.');
      return;
    }

    const headers = ['#', 'Participant Name', 'USN', 'Email', 'Type', 'Certificate ID', 'Activity Name', 'Room', 'Category', 'Check-In Time', 'Added / Scanned By', 'Status'];
    const rows = filteredAttendance.map((rec, idx) => {
      const act = getActivity(rec.activityId);
      const certId = buildCertificateId({
        activityId: rec.activityId,
        attendanceId: rec.id,
        participantId: rec.participantId,
        certId: rec.certId
      });
      const timeStr = rec.timestamp instanceof Date
        ? rec.timestamp.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : (rec.scannedAt || '');
      return [
        idx + 1,
        `"${(rec.participantName || 'Participant').replace(/"/g, '""')}"`,
        `"${(rec.participantUsn || '').replace(/"/g, '""')}"`,
        `"${(rec.participantEmail || '').replace(/"/g, '""')}"`,
        `"${rec.isUnregistered ? 'Unregistered' : 'Registered'}"`,
        `"${certId.replace(/"/g, '""')}"`,
        `"${(act?.name || rec.activityId).replace(/"/g, '""')}"`,
        `"${(act?.room || '').replace(/"/g, '""')}"`,
        `"${(act?.category || '').replace(/"/g, '""')}"`,
        `"${timeStr.replace(/"/g, '""')}"`,
        `"${(rec.scannedBy || 'coordinator').replace(/"/g, '""')}"`,
        '"Present"'
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const actSlug = selectedAttendanceActivity === 'all' ? 'all-events' : selectedAttendanceActivity;
    link.href = url;
    link.setAttribute('download', `Cognisphere_Attendance_${actSlug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Participant statistics
  const participantStats = useMemo(() => {
    const total = allActivities.length;
    let approved = 0;
    let pending = 0;
    allActivities.forEach(act => {
      const status = userRequests[act.id]?.status;
      if (status === 'approved') approved++;
      else if (status === 'pending') pending++;
    });
    return { total, approved, pending, unrequested: total - (approved + pending) };
  }, [userRequests, allActivities]);

  // Filtered activities for Participant View
  const filteredActivities = useMemo(() => {
    return allActivities.filter(act => {
      const status = userRequests[act.id]?.status;
      if (participantFilter === 'approved') return status === 'approved';
      if (participantFilter === 'pending') return status === 'pending';
      return true;
    });
  }, [userRequests, participantFilter, allActivities]);

  return (
    <>
      {/* Floating Success Notification Toast — Portaled directly to document.body so it NEVER touches component layout or triggers sibling margins */}
      {successBanner && typeof document !== 'undefined' && createPortal(
        <div className="fixed top-20 sm:top-6 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-[calc(100%-2rem)] sm:w-auto pointer-events-none">
          <div className="animate-fadeIn pointer-events-auto bg-surface-container-lowest/95 dark:bg-surface-container-high/95 backdrop-blur-md text-on-surface border border-emerald-500/30 rounded-2xl p-3 sm:px-4 sm:py-2.5 shadow-2xl ring-1 ring-emerald-500/20 flex items-center justify-between gap-3 text-xs font-semibold">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="truncate">{successBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              className="text-secondary hover:text-on-surface hover:bg-surface-container rounded-lg p-1 transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>,
        document.body
      )}

      <div className="space-y-6 animate-fadeIn pb-12">

      {/* Header Banner */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-container text-primary">
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Event Pass & Registrations Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-on-surface">
              {effectiveIsStaff && activeStaffMode === 'desk' 
                ? 'Pass Approvals Desk' 
                : effectiveIsStaff && activeStaffMode === 'attendance'
                ? 'Activity Attendance Records'
                : 'Event Registrations'}
            </h1>
            <p className="text-xs sm:text-sm text-secondary max-w-xl">
              {effectiveIsStaff && activeStaffMode === 'desk'
                ? 'Review, verify, and approve incoming participant pass requests for all upcoming club events.'
                : effectiveIsStaff && activeStaffMode === 'attendance'
                ? 'View, monitor, and export live door attendance check-in records across all club competitions and activities.'
                : 'Select your events, request digital entry passes, and check real-time approval status.'}
            </p>
          </div>

          {/* Staff Mode Switcher (Desk vs Attendance View) */}
          {effectiveIsStaff && (
            <div className="flex items-center bg-surface-container-low p-1 rounded-2xl border border-surface-container self-start sm:self-center shrink-0">
              <button
                onClick={() => setActiveStaffMode('desk')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeStaffMode === 'desk'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Approvals Desk</span>
                {totalPendingDesk > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {totalPendingDesk}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveStaffMode('attendance')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeStaffMode === 'attendance'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Activity Attendance</span>
                {allAttendance.length > 0 && (
                  <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {allAttendance.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Guest Sign-In Notice */}
      {!user && (
        <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-surface-container text-primary flex items-center justify-center mx-auto">
            <LogIn className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-on-surface">Sign In to Request Passes</h3>
            <p className="text-xs text-secondary max-w-md mx-auto">
              Please sign in with your college Google account to submit event pass requests and access your QR entry badges.
            </p>
          </div>
          {onSignIn && (
            <button
              onClick={onSignIn}
              className="py-2.5 px-6 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all inline-flex items-center gap-2 shadow-xs active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Google</span>
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION A: STAFF APPROVALS DESK                                           */}
      {/* ========================================================================= */}
      {effectiveIsStaff && activeStaffMode === 'desk' && (
        <div className="space-y-5">
          {/* Filters & Actions Toolbar (Rock-solid layout with zero height jumping) */}
          <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-4 shadow-xs space-y-3 max-w-full overflow-hidden">
            {/* Top Row: Search input + Activity Filter Dropdown */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 min-w-0">
              {/* Left: Search input */}
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student name or USN..."
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-surface-container text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-high transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary hover:text-on-surface"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Right: Activity Filter Dropdown */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 min-w-0">
                <span className="text-xs text-secondary font-semibold whitespace-nowrap shrink-0">Event:</span>
                <select
                  value={selectedActivityFilter}
                  onChange={(e) => setSelectedActivityFilter(e.target.value)}
                  className="w-full sm:w-auto sm:max-w-xs min-w-0 bg-surface-container border border-surface-container-high text-on-surface text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer truncate"
                >
                  <option value="all">All Activities ({allRequests.length})</option>
                  {allActivities.map(act => {
                    const count = allRequests.filter(r => r.activityId === act.id).length;
                    return (
                      <option key={act.id} value={act.id}>
                        {act.name} — {act.room} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Bottom Row: Status Pills & Action Controls (Independent dedicated row) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-2.5 border-t border-surface-container">
              {/* Status Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full">
                <span className="text-xs text-secondary font-semibold mr-1 shrink-0">Status:</span>
                {[
                  { id: 'all', label: 'All Requests', count: metrics.total },
                  { id: 'pending', label: 'Pending', count: metrics.pending },
                  { id: 'approved', label: 'Approved', count: metrics.approved },
                  { id: 'rejected', label: 'Declined', count: metrics.rejected }
                ].map(pill => (
                  <button
                    key={pill.id}
                    onClick={() => setSelectedStatusFilter(pill.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      selectedStatusFilter === pill.id
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container text-secondary hover:text-on-surface'
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedStatusFilter === pill.id ? 'bg-white/20 text-white' : 'bg-surface-container-high text-secondary'
                    }`}>
                      {pill.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Actions: Sheets Batch Status & Bulk Approve Button */}
              <div className="flex items-center gap-2 flex-wrap sm:shrink-0 w-full sm:w-auto justify-end">
                {hasBatch ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold shadow-xs">
                    <Clock className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${batchSyncing || syncingToSheets ? 'animate-spin' : ''}`} />
                    <span>
                      Sheets: <strong>{batchQueueCount}</strong> &bull; <strong className="font-mono">{batchRemainingFormatted}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleFlushBatchToSheets}
                      disabled={batchSyncing || syncingToSheets}
                      className="ml-1 px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
                      title="Sync queued approvals to Google Sheets immediately"
                    >
                      {batchSyncing || syncingToSheets ? 'Syncing...' : 'Sync Now'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleForceSyncAllApproved}
                    disabled={syncingToSheets}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
                    title="Force sync all approved participants across all events to Google Sheets"
                  >
                    <FileSpreadsheet className={`w-3.5 h-3.5 ${syncingToSheets ? 'animate-spin' : ''}`} />
                    <span>{syncingToSheets ? 'Syncing to Sheets...' : 'Sync Approved to Sheets'}</span>
                  </button>
                )}

                {selectedStatusFilter === 'pending' && filteredRequests.filter(r => r.status === 'pending').length > 0 && (
                  <button
                    onClick={handleBulkApprovePending}
                    disabled={bulkActionLoading}
                    className="py-1.5 px-3.5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap active:scale-95 disabled:opacity-50"
                  >
                    {bulkActionLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Approving All...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve All Pending ({filteredRequests.filter(r => r.status === 'pending').length})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Requests Queue Table / Cards (Stable minimum height prevents collapse jumps) */}
          <div className="bg-surface-container-lowest border border-surface-container rounded-2xl overflow-hidden shadow-xs min-h-[320px]">
            {loadingRequests ? (
              <div className="p-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-xs text-secondary">Loading pass requests from database...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-surface-container text-secondary flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-on-surface">No Requests Found</h4>
                <p className="text-xs text-secondary max-w-sm mx-auto">
                  {selectedStatusFilter === 'pending'
                    ? 'All pending requests have been reviewed. Good job!'
                    : 'No pass requests match the selected filters or search keyword.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-surface-container">
                {filteredRequests.map(req => {
                  const act = getActivity(req.activityId);
                  const isActioning = actionInProgressId === req.id;
                  const isApproved = req.status === 'approved';
                  const isPending = req.status === 'pending';
                  const isRejected = req.status === 'rejected';

                  return (
                    <div 
                      key={req.id} 
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-low transition-colors"
                    >
                      {/* Left: Participant Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-on-surface">{req.participantName}</h4>
                          {req.participantUsn && (
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface-container text-primary border border-surface-container-high">
                              {req.participantUsn}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isApproved
                              ? 'bg-tertiary-container text-on-tertiary-container border-tertiary/20'
                              : isPending
                              ? 'bg-secondary-container text-on-secondary-container border-secondary/20'
                              : 'bg-error-container text-on-error-container border-error/20'
                          }`}>
                            {isApproved && <CheckCircle2 className="w-3 h-3 text-tertiary" />}
                            {isPending && <Clock className="w-3 h-3 text-secondary animate-pulse" />}
                            {isRejected && <XCircle className="w-3 h-3 text-error" />}
                            <span className="capitalize">{req.status}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-secondary flex-wrap">
                          <span className="font-semibold text-on-surface">
                            {act?.name || req.activityId}
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-primary" />
                            {act?.room || 'Room TBD'}
                          </span>
                          {act?.scheduledTime && (
                            <>
                              <span>&bull;</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-secondary" />
                                <span>{act.scheduledTime}</span>
                              </span>
                            </>
                          )}
                          {req.requestedAt && (
                            <>
                              <span>&bull;</span>
                              <span>
                                {new Date(req.requestedAt.seconds ? req.requestedAt.seconds * 1000 : Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          )}
                          {req.reviewedBy && (
                            <>
                              <span>&bull;</span>
                              <span className="text-[11px] opacity-80">
                                Reviewed by: {req.reviewedBy}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleReviewRequest(req.id, 'approved')}
                              disabled={isActioning}
                              className="py-1.5 px-3.5 min-w-[88px] justify-center bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all flex items-center gap-1 shadow-xs active:scale-95 disabled:opacity-50"
                              title="Approve pass request"
                            >
                              {isActioning ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Approve</span>
                            </button>

                            <button
                              onClick={() => handleReviewRequest(req.id, 'rejected')}
                              disabled={isActioning}
                              className="py-1.5 px-3 min-w-[76px] justify-center bg-error-container hover:bg-error/20 text-on-error-container font-bold rounded-xl text-xs transition-all flex items-center gap-1 border border-error/20 active:scale-95 disabled:opacity-50"
                              title="Decline pass request"
                            >
                              <span>Decline</span>
                            </button>
                          </>
                        ) : isApproved ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-tertiary flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Pass Active</span>
                            </span>
                            <button
                              onClick={() => handleReviewRequest(req.id, 'rejected')}
                              disabled={isActioning}
                              className="text-xs text-secondary hover:text-error underline underline-offset-2 ml-1"
                            >
                              Revoke
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-error flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Declined</span>
                            </span>
                            <button
                              onClick={() => handleReviewRequest(req.id, 'approved')}
                              disabled={isActioning}
                              className="py-1 px-3 bg-surface-container hover:bg-surface-container-high text-primary font-bold rounded-lg text-xs transition-all ml-1"
                            >
                              Re-approve
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION B: ACTIVITY ATTENDANCE RECORDS (Admin / Staff)                     */}
      {/* ========================================================================= */}
      {effectiveIsStaff && activeStaffMode === 'attendance' && (
        <div className="space-y-5">
          {/* Top 4 Metrics Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total Verified Attendance Scans */}
            <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                  Total Check-Ins
                </span>
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-on-surface">
                  {loadingAttendance ? (
                    <Loader2 className="w-6 h-6 animate-spin text-secondary" />
                  ) : (
                    attendanceMetrics.totalScans
                  )}
                </div>
                <p className="text-[11px] text-secondary mt-0.5">
                  Across all {allActivities.length} club activities
                </p>
              </div>
            </div>

            {/* Card 2: Unique Participants Present */}
            <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                  Unique Students
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {loadingAttendance ? (
                    <Loader2 className="w-6 h-6 animate-spin text-secondary" />
                  ) : (
                    attendanceMetrics.uniqueStudents
                  )}
                </div>
                <p className="text-[11px] text-secondary mt-0.5">
                  Distinct USNs checked in
                </p>
              </div>
            </div>

            {/* Card 3: Top Event by Attendance */}
            <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                  Top Turnout
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-extrabold text-on-surface truncate">
                  {attendanceMetrics.topAct ? attendanceMetrics.topAct.name : 'No scans yet'}
                </div>
                <p className="text-[11px] text-secondary truncate mt-0.5">
                  {attendanceMetrics.topAct ? (
                    <>
                      <strong>{attendanceMetrics.topActCount}</strong> present &bull; {attendanceMetrics.topAct.room}
                    </>
                  ) : (
                    'Waiting for door scans'
                  )}
                </p>
              </div>
            </div>

            {/* Card 4: Latest Door Scan */}
            <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                  Latest Scan
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-extrabold text-on-surface truncate flex items-center gap-1.5">
                  {attendanceMetrics.latestScan && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                  <span>
                    {attendanceMetrics.latestScan 
                      ? getRelativeTime(attendanceMetrics.latestScan.timestamp) || 'Just now'
                      : 'No scans yet'}
                  </span>
                </div>
                <p className="text-[11px] text-secondary truncate mt-0.5">
                  {attendanceMetrics.latestScan 
                    ? `${attendanceMetrics.latestScan.participantName || 'Participant'} (${getActivity(attendanceMetrics.latestScan.activityId)?.room || 'Entrance'})`
                    : 'Awaiting coordinator scan'}
                </p>
              </div>
            </div>
          </div>

          {/* Activity Breakdown Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-primary" />
                <span>Filter by Competition Activity:</span>
              </span>
              <span className="text-[11px] text-secondary">
                {selectedAttendanceActivity === 'all' 
                  ? `Showing all (${allAttendance.length})` 
                  : `${getActivity(selectedAttendanceActivity)?.name} (${filteredAttendance.length})`}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setSelectedAttendanceActivity('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedAttendanceActivity === 'all'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container-lowest border border-surface-container text-secondary hover:text-on-surface'
                }`}
              >
                <span>All Activities</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedAttendanceActivity === 'all' ? 'bg-white/20 text-white' : 'bg-surface-container text-secondary'
                }`}>
                  {allAttendance.length}
                </span>
              </button>

              {allActivities.map(act => {
                const count = attendanceMetrics.countByActivity[act.id] || 0;
                const isSelected = selectedAttendanceActivity === act.id;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setSelectedAttendanceActivity(act.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                      isSelected
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container-lowest border border-surface-container text-secondary hover:text-on-surface'
                    }`}
                  >
                    <span>{act.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-surface-container text-secondary'
                    }`}>
                      {count}
                    </span>
                    <span className="text-[10px] opacity-75 font-normal">&bull; {act.room}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search, Sort & Export Toolbar */}
          <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 min-w-0">
              {/* Search bar */}
              <div className="relative flex-1 w-full md:max-w-md min-w-0">
                <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={attendanceSearchQuery}
                  onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                  placeholder="Search attendee name, USN, or coordinator..."
                  className="w-full pl-10 pr-8 py-2 rounded-xl bg-surface-container text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary border border-surface-container-high transition-all"
                />
                {attendanceSearchQuery && (
                  <button
                    onClick={() => setAttendanceSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary hover:text-on-surface"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort & Actions */}
              <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
                {/* Sort selector */}
                <div className="flex items-center gap-1.5 bg-surface-container border border-surface-container-high rounded-xl px-2.5 py-1.5 text-xs text-secondary">
                  <ArrowUpDown className="w-3.5 h-3.5 text-primary shrink-0" />
                  <select
                    value={attendanceSort}
                    onChange={(e) => setAttendanceSort(e.target.value)}
                    className="bg-transparent text-on-surface text-xs font-semibold focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="newest">Newest Scans First</option>
                    <option value="oldest">Oldest Scans First</option>
                    <option value="name">Participant Name (A-Z)</option>
                  </select>
                </div>

                {/* Offline Queue Sync Button if queued items exist */}
                {offlineQueueCount > 0 && (
                  <button
                    type="button"
                    onClick={handleSyncOfflineAttendance}
                    disabled={syncingOffline}
                    className="py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                    title="Sync locally cached offline scans to database"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingOffline ? 'animate-spin' : ''}`} />
                    <span>Sync Offline ({offlineQueueCount})</span>
                  </button>
                )}

                {/* Add Unregistered / Walk-In Participant Button */}
                <button
                  type="button"
                  onClick={() => {
                    setWalkInFeedback(null);
                    if (selectedAttendanceActivity && selectedAttendanceActivity !== 'all') {
                      setWalkInActivityId(selectedAttendanceActivity);
                    }
                    setShowWalkInModal(true);
                  }}
                  className="py-2 px-3.5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
                  title="Add unregistered walk-in participants & issue participation certificates"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Unregistered</span>
                </button>

                {/* Certificate Emails & Links Studio Button */}
                <button
                  type="button"
                  onClick={() => setShowEmailsModal(true)}
                  className="py-2 px-3.5 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
                  title="Generate certificate links & club email templates for Participants, Winners & Coordinators"
                >
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>Emails &amp; Links</span>
                </button>

                {/* Export to CSV Button */}
                <button
                  type="button"
                  onClick={handleExportAttendanceCsv}
                  disabled={filteredAttendance.length === 0}
                  className="py-2 px-3.5 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-40"
                  title="Export current attendance records to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span>Export CSV ({filteredAttendance.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Attendance Records Table / Cards */}
          <div className="bg-surface-container-lowest border border-surface-container rounded-3xl overflow-hidden shadow-xs">
            {loadingAttendance ? (
              <div className="p-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-xs text-secondary font-medium">Loading real-time attendance logs...</p>
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="p-12 text-center space-y-3 max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-surface-container text-secondary flex items-center justify-center mx-auto">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-on-surface">
                  {attendanceSearchQuery || selectedAttendanceActivity !== 'all'
                    ? 'No Matching Attendees Found'
                    : 'No Attendance Scans Yet'}
                </h3>
                <p className="text-xs text-secondary leading-relaxed">
                  {attendanceSearchQuery || selectedAttendanceActivity !== 'all'
                    ? 'Try adjusting your search criteria or switch back to "All Activities".'
                    : 'As room coordinators scan student QR entry passes at room doors, verified attendee check-in records will appear here in real-time.'}
                </p>
                {(attendanceSearchQuery || selectedAttendanceActivity !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setAttendanceSearchQuery('');
                      setSelectedAttendanceActivity('all');
                    }}
                    className="py-1.5 px-4 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-xs"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-surface-container">
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3.5 bg-surface-container-low text-[11px] font-bold text-secondary uppercase tracking-wider">
                  <div className="col-span-4">Participant &amp; USN</div>
                  <div className="col-span-3">Activity &amp; Room</div>
                  <div className="col-span-2">Check-In Time</div>
                  <div className="col-span-1">By</div>
                  <div className="col-span-2 text-right">Status &amp; Cert</div>
                </div>

                {/* Records List */}
                {filteredAttendance.map((rec, index) => {
                  const act = getActivity(rec.activityId);
                  const isDeleting = deletingAttendanceId === rec.id;
                  const initial = (rec.participantName || 'P').charAt(0).toUpperCase();
                  const certId = buildCertificateId({
                    activityId: rec.activityId,
                    attendanceId: rec.id,
                    participantId: rec.participantId,
                    certId: rec.certId
                  });
                  const certVerifyPath = `/verify?id=${encodeURIComponent(certId)}`;
                  const canDeleteRow = rec.isUnregistered ? effectiveIsStaff : isAdmin;

                  return (
                    <div
                      key={rec.id || index}
                      className="p-4 sm:px-6 sm:py-3.5 hover:bg-surface-container-low/50 transition-colors flex flex-col md:grid md:grid-cols-12 gap-3 items-start md:items-center"
                    >
                      {/* Col 1: Participant */}
                      <div className="col-span-4 flex items-center gap-3 w-full min-w-0">
                        <div className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 border ${
                          rec.isUnregistered
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}>
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-extrabold text-on-surface truncate">
                              {rec.participantName || 'Participant'}
                            </span>
                            {rec.isUnregistered && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0">
                                Unregistered
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-secondary truncate flex items-center gap-1.5">
                            <span>{rec.participantUsn || 'Walk-In / No USN'}</span>
                            {rec.participantEmail && (
                              <>
                                <span>&bull;</span>
                                <span className="truncate font-sans">{rec.participantEmail}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Col 2: Activity & Room */}
                      <div className="col-span-3 min-w-0 w-full">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-on-surface truncate">
                            {act?.name || rec.activityId}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-secondary mt-0.5">
                          <MapPin className="w-3 h-3 text-primary shrink-0" />
                          <span className="font-semibold text-on-surface">{act?.room || 'Room'}</span>
                          <span>&bull;</span>
                          <span className="text-primary font-medium">{act?.category}</span>
                        </div>
                      </div>

                      {/* Col 3: Check-in Timestamp */}
                      <div className="col-span-2 text-xs text-secondary min-w-0 w-full">
                        <div className="font-semibold text-on-surface flex items-center gap-1">
                          <Clock className="w-3 h-3 text-secondary shrink-0" />
                          <span>{formatAttendanceTime(rec.timestamp)}</span>
                        </div>
                        <div className="text-[10px] text-secondary/80 mt-0.5">
                          {getRelativeTime(rec.timestamp)}
                        </div>
                      </div>

                      {/* Col 4: Scanned / Added By */}
                      <div className="col-span-1 text-[11px] text-secondary min-w-0 w-full truncate">
                        <span className="px-2 py-0.5 rounded-lg bg-surface-container border border-surface-container-high font-mono text-[10px] text-on-surface inline-block truncate max-w-full" title={rec.scannedBy || 'coordinator'}>
                          {rec.scannedBy || 'coordinator'}
                        </span>
                      </div>

                      {/* Col 5: Status Badge, Certificate Link & Admin Action */}
                      <div className="col-span-2 flex items-center justify-between md:justify-end gap-1.5 w-full">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Present</span>
                        </span>

                        <a
                          href={certVerifyPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                          title={`Open Participation Certificate (${certId})`}
                        >
                          <Award className="w-3.5 h-3.5" />
                        </a>

                        {canDeleteRow && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAttendance(rec, rec.participantName, act?.name)}
                            disabled={isDeleting}
                            className="p-1.5 text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                            title="Remove attendance record"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION C: PARTICIPANT VIEW (Pass Requests & Direct Access)               */}
      {/* ========================================================================= */}
      {!effectiveIsStaff && (
        <div className="space-y-5">
          {/* Participant Pass Summary Banner */}
          {user && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">Total Events</span>
                <div className="text-2xl font-black text-on-surface mt-1">{participantStats.total}</div>
              </div>

              <div 
                onClick={() => setParticipantFilter('approved')}
                className={`border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
                  participantFilter === 'approved'
                    ? 'bg-tertiary-container/30 border-tertiary ring-1 ring-tertiary'
                    : 'bg-surface-container-lowest border-surface-container hover:bg-surface-container-low'
                }`}
              >
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">Passes Approved</span>
                <div className="text-2xl font-black text-on-tertiary-container mt-1">{participantStats.approved}</div>
              </div>

              <div 
                onClick={() => setParticipantFilter('pending')}
                className={`border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
                  participantFilter === 'pending'
                    ? 'bg-secondary-container/40 border-secondary ring-1 ring-secondary'
                    : 'bg-surface-container-lowest border-surface-container hover:bg-surface-container-low'
                }`}
              >
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">Awaiting Approval</span>
                <div className="text-2xl font-black text-on-secondary-container mt-1">{participantStats.pending}</div>
              </div>

              <div 
                onClick={() => setParticipantFilter('all')}
                className={`border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
                  participantFilter === 'all'
                    ? 'bg-surface-container-high border-outline ring-1 ring-primary'
                    : 'bg-surface-container-lowest border-surface-container hover:bg-surface-container-low'
                }`}
              >
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">Available to Join</span>
                <div className="text-2xl font-black text-on-surface mt-1">{participantStats.unrequested}</div>
              </div>
            </div>
          )}

          {/* Filter Pills for Participant */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Events (5)' },
              { id: 'approved', label: `My Approved Passes (${participantStats.approved})` },
              { id: 'pending', label: `Pending Review (${participantStats.pending})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setParticipantFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  participantFilter === tab.id
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container-lowest border border-surface-container text-secondary hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Activities Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredActivities.map(act => {
              const req = userRequests[act.id];
              const isApproved = effectiveIsStaff || req?.status === 'approved';
              const isPending = req?.status === 'pending';
              const isRejected = req?.status === 'rejected';
              const isUnrequested = !req && !effectiveIsStaff;
              const isSubmitting = requestingActivityId === act.id;

              return (
                <div 
                  key={act.id}
                  className="bg-surface-container-lowest border border-surface-container rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-surface-container-high transition-all"
                >
                  {/* Top: Header & Badges */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                        {act.category} Competition
                      </span>
                      
                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isApproved
                          ? 'bg-tertiary-container text-on-tertiary-container border-tertiary/20'
                          : isPending
                          ? 'bg-secondary-container text-on-secondary-container border-secondary/20'
                          : isRejected
                          ? 'bg-error-container text-on-error-container border-error/20'
                          : 'bg-surface-container text-secondary border-surface-container-high'
                      }`}>
                        {isApproved && <CheckCircle2 className="w-3 h-3 text-tertiary" />}
                        {isPending && <Clock className="w-3 h-3 text-secondary animate-pulse" />}
                        {isRejected && <XCircle className="w-3 h-3 text-error" />}
                        <span>
                          {isApproved ? 'Pass Approved' : isPending ? 'Pending Review' : isRejected ? 'Declined' : 'Not Registered'}
                        </span>
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-on-surface">
                      {act.name}
                    </h3>

                    <p className="text-xs text-secondary leading-relaxed line-clamp-2">
                      {act.description}
                    </p>

                    {/* Metadata tags */}
                    <div className="flex items-center gap-3 text-xs text-secondary pt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-on-surface">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {act.room}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {act.eventDate || '2026-11-24'}
                      </span>
                      <span>&bull;</span>
                      <span>{act.scheduledTime}</span>
                    </div>
                  </div>

                  {/* Bottom: Action buttons */}
                  <div className="pt-3 border-t border-surface-container flex items-center justify-between gap-2">
                    {isApproved ? (
                      <button
                        onClick={() => onViewPass && onViewPass(act.id)}
                        className="w-full py-2.5 px-4 bg-tertiary-container hover:bg-tertiary text-on-tertiary font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>View Verified QR Pass</span>
                      </button>
                    ) : isPending ? (
                      <div className="w-full flex items-center justify-between text-xs text-secondary bg-surface-container-low p-2.5 rounded-xl border border-surface-container">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-secondary animate-pulse" />
                          <span>Request submitted to coordinator</span>
                        </span>
                        <button
                          onClick={() => onViewPass && onViewPass(act.id)}
                          className="text-primary font-bold hover:underline"
                        >
                          Preview
                        </button>
                      </div>
                    ) : isRejected ? (
                      <div className="w-full text-center text-xs text-error font-medium p-2 bg-error-container/20 rounded-xl border border-error/20">
                        Registration was declined. Inquire with club coordinators.
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRequestPass(act.id)}
                        disabled={isSubmitting}
                        className="w-full py-2.5 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Submitting Pass Request...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Request Entry Pass ({act.room})</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>

      {/* Add Unregistered / Walk-In Participant Modal */}
      {showWalkInModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-container bg-surface-container-low">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-on-surface">Add Unregistered Participant</h3>
                  <p className="text-[11px] text-secondary">
                    Saves to <code className="font-mono text-primary">unregisteredParticipants</code> &amp; issues participation certificate
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="p-1.5 rounded-xl text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddWalkInSubmit} className="p-6 space-y-4">
              {/* Mode Toggle */}
              <div className="flex items-center bg-surface-container p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => { setWalkInMode('single'); setWalkInFeedback(null); }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    walkInMode === 'single'
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-secondary hover:text-on-surface'
                  }`}
                >
                  Single Entry
                </button>
                <button
                  type="button"
                  onClick={() => { setWalkInMode('bulk'); setWalkInFeedback(null); }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    walkInMode === 'bulk'
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-secondary hover:text-on-surface'
                  }`}
                >
                  Bulk Paste ({parsedBulkWalkIns.length})
                </button>
              </div>

              {/* Event Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface">
                  Competition / Activity <span className="text-error">*</span>
                </label>
                <select
                  value={walkInActivityId}
                  onChange={(e) => setWalkInActivityId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-surface-container-high text-on-surface text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  {allActivities.map(act => (
                    <option key={act.id} value={act.id}>
                      {act.name} ({act.room})
                    </option>
                  ))}
                </select>
              </div>

              {walkInMode === 'single' ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-on-surface">
                      Full Name (for Certificate) <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-surface-container-high text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-on-surface">
                        USN <span className="text-secondary font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={walkInUsn}
                        onChange={(e) => setWalkInUsn(e.target.value.toUpperCase())}
                        placeholder="e.g. 1ST23AI001"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-surface-container-high text-on-surface text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-on-surface">
                        Email <span className="text-secondary font-normal">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        value={walkInEmail}
                        onChange={(e) => setWalkInEmail(e.target.value)}
                        placeholder="student@college.edu"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-surface-container-high text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-on-surface">
                    Paste Participants <span className="text-secondary font-normal">(one per line: Name, USN)</span>
                  </label>
                  <textarea
                    rows={5}
                    value={walkInBulkText}
                    onChange={(e) => setWalkInBulkText(e.target.value)}
                    placeholder={"Aarav Sharma, 1ST23AI001\nDiya Rao, 1ST23CS042\nRohan Mehta"}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-surface-container-high text-on-surface text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                  <p className="text-[11px] text-secondary">
                    Detected <strong>{parsedBulkWalkIns.length}</strong> participant{parsedBulkWalkIns.length === 1 ? '' : 's'}. Separate Name and USN with a comma, tab, or pipe (|).
                  </p>
                </div>
              )}

              {/* Result / Feedback Box */}
              {walkInFeedback && (
                <div className={`p-3 rounded-2xl border text-xs space-y-2 ${
                  walkInFeedback.type === 'error'
                    ? 'bg-error/10 border-error/30 text-error'
                    : walkInFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
                }`}>
                  <div className="font-semibold">{walkInFeedback.message}</div>
                  {walkInFeedback.certId && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-current/15">
                      <span className="font-mono text-[11px]">ID: {walkInFeedback.certId}</span>
                      <a
                        href={`/verify?id=${encodeURIComponent(walkInFeedback.certId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold underline underline-offset-2"
                      >
                        <span>Open Certificate</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-secondary hover:text-on-surface font-bold text-xs transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={addingWalkIn}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {addingWalkIn ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Adding &amp; Issuing...</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-3.5 h-3.5" />
                      <span>
                        {walkInMode === 'bulk'
                          ? `Add ${parsedBulkWalkIns.length || ''} & Issue Certificates`
                          : 'Add & Issue Certificate'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Certificate Links & Official Email Studio Modal */}
      {effectiveIsStaff && (
        <CertificateEmailsModal
          isOpen={showEmailsModal}
          onClose={() => setShowEmailsModal(false)}
          activities={allActivities}
        />
      )}
    </>
  );
}

