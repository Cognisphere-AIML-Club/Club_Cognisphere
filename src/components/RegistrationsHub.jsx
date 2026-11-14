import React, { useState, useEffect, useMemo } from 'react';
import { ACTIVITIES, getActivityById } from '../data/activities';
import { 
  subscribeToAllPassRequests, 
  subscribeToUserPassRequests, 
  requestGamePass, 
  reviewPassRequest, 
  bulkReviewPassRequests 
} from '../services/passApprovalService';
import { 
  ClipboardCheck, 
  UserCheck, 
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
  LogIn
} from 'lucide-react';

export default function RegistrationsHub({
  user,
  profile,
  isAdmin = false,
  isCoordinator = false,
  isStaff = false,
  onViewPass,
  onSignIn
}) {
  // Staff view mode toggle: 'desk' (Approvals queue) or 'participant' (Student Pass view)
  const [activeStaffMode, setActiveStaffMode] = useState('desk');

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
    if (!isStaff) {
      setLoadingRequests(false);
      return;
    }

    setLoadingRequests(true);
    const unsub = subscribeToAllPassRequests((list) => {
      setAllRequests(list);
      setLoadingRequests(false);
    });
    return () => unsub();
  }, [isStaff]);

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
      setSuccessBanner(`Pass requested for ${getActivityById(activityId)?.name}!`);
    } catch (err) {
      alert(err.message || 'Failed to request pass');
    } finally {
      setRequestingActivityId(null);
    }
  };

  // Staff action: Approve or reject single request
  const handleReviewRequest = async (requestId, status) => {
    try {
      setActionInProgressId(requestId);
      await reviewPassRequest(requestId, status, user?.email || 'staff');
      setSuccessBanner(status === 'approved' ? 'Pass Approved!' : 'Pass Declined.');
    } catch (err) {
      alert(err.message || 'Failed to update request');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Staff action: Bulk approve all pending in current filtered list
  const handleBulkApprovePending = async () => {
    const pendingIds = filteredRequests
      .filter(r => r.status === 'pending')
      .map(r => r.id);

    if (pendingIds.length === 0) return;

    if (!window.confirm(`Approve all ${pendingIds.length} pending pass requests in this view?`)) {
      return;
    }

    try {
      setBulkActionLoading(true);
      await bulkReviewPassRequests(pendingIds, 'approved', user?.email || 'staff');
      setSuccessBanner(`Successfully approved ${pendingIds.length} pass requests!`);
    } catch (err) {
      alert(err.message || 'Failed to approve all requests');
    } finally {
      setBulkActionLoading(false);
    }
  };

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

  // Aggregate metrics for Staff
  const metrics = useMemo(() => {
    const total = allRequests.length;
    const pending = allRequests.filter(r => r.status === 'pending').length;
    const approved = allRequests.filter(r => r.status === 'approved').length;
    const rejected = allRequests.filter(r => r.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [allRequests]);

  // Participant statistics
  const participantStats = useMemo(() => {
    const total = ACTIVITIES.length;
    let approved = 0;
    let pending = 0;
    ACTIVITIES.forEach(act => {
      const status = userRequests[act.id]?.status;
      if (status === 'approved') approved++;
      else if (status === 'pending') pending++;
    });
    return { total, approved, pending, unrequested: total - (approved + pending) };
  }, [userRequests]);

  // Filtered activities for Participant View
  const filteredActivities = useMemo(() => {
    return ACTIVITIES.filter(act => {
      const status = userRequests[act.id]?.status;
      if (participantFilter === 'approved') return status === 'approved';
      if (participantFilter === 'pending') return status === 'pending';
      return true;
    });
  }, [userRequests, participantFilter]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="bg-tertiary-container text-on-tertiary-container border border-tertiary/20 rounded-2xl p-4 text-xs font-semibold flex items-center justify-between shadow-xs transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-tertiary" />
            <span>{successBanner}</span>
          </div>
          <button 
            onClick={() => setSuccessBanner(null)}
            className="text-on-tertiary-container hover:opacity-75 font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-container text-primary">
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Event Pass & Registrations Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-on-surface">
              {isStaff && activeStaffMode === 'desk' 
                ? 'Pass Approvals Desk' 
                : 'Event Registrations'}
            </h1>
            <p className="text-xs sm:text-sm text-secondary max-w-xl">
              {isStaff && activeStaffMode === 'desk'
                ? 'Review, verify, and approve incoming participant pass requests for all upcoming club events.'
                : 'Select your events, request digital entry passes, and check real-time approval status.'}
            </p>
          </div>

          {/* Staff Mode Switcher (Desk vs Student View) */}
          {isStaff && (
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
                {metrics.pending > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {metrics.pending}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveStaffMode('participant')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeStaffMode === 'participant'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Participant View</span>
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
      {isStaff && activeStaffMode === 'desk' && (
        <div className="space-y-5">
          {/* Filters & Actions Toolbar */}
          <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Left: Search input */}
              <div className="relative flex-1 max-w-md">
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

              {/* Center: Activity Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-secondary font-semibold whitespace-nowrap">Event:</span>
                <select
                  value={selectedActivityFilter}
                  onChange={(e) => setSelectedActivityFilter(e.target.value)}
                  className="bg-surface-container border border-surface-container-high text-on-surface text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="all">All Activities (5)</option>
                  {ACTIVITIES.map(act => (
                    <option key={act.id} value={act.id}>
                      {act.name} ({act.room})
                    </option>
                  ))}
                </select>
              </div>

              {/* Right: Bulk Action button */}
              {selectedStatusFilter === 'pending' && filteredRequests.filter(r => r.status === 'pending').length > 0 && (
                <button
                  onClick={handleBulkApprovePending}
                  disabled={bulkActionLoading}
                  className="py-2 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap active:scale-95 disabled:opacity-50"
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

            {/* Status Pills Bar */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-surface-container overflow-x-auto no-scrollbar">
              <span className="text-xs text-secondary font-semibold mr-1">Status:</span>
              {[
                { id: 'all', label: 'All Requests', count: metrics.total },
                { id: 'pending', label: 'Pending Only', count: metrics.pending },
                { id: 'approved', label: 'Approved Only', count: metrics.approved },
                { id: 'rejected', label: 'Declined Only', count: metrics.rejected }
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
          </div>

          {/* Requests Queue Table / Cards */}
          <div className="bg-surface-container-lowest border border-surface-container rounded-2xl overflow-hidden shadow-xs">
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
                  const act = getActivityById(req.activityId);
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
                              className="py-1.5 px-3.5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all flex items-center gap-1 shadow-xs active:scale-95 disabled:opacity-50"
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
                              className="py-1.5 px-3 bg-error-container hover:bg-error/20 text-on-error-container font-bold rounded-xl text-xs transition-all flex items-center gap-1 border border-error/20 active:scale-95 disabled:opacity-50"
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
      {/* SECTION B: PARTICIPANT VIEW (Pass Requests & Direct Access)               */}
      {/* ========================================================================= */}
      {(!isStaff || activeStaffMode === 'participant') && (
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
              const isApproved = isStaff || req?.status === 'approved';
              const isPending = req?.status === 'pending';
              const isRejected = req?.status === 'rejected';
              const isUnrequested = !req && !isStaff;
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
                        {act.eventDate || '2026-11-14'}
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
  );
}

