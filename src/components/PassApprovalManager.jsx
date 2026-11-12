import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ShieldCheck, 
  Check, 
  X, 
  Clock, 
  Search, 
  Filter, 
  UserCheck, 
  AlertCircle,
  Loader2 
} from 'lucide-react';

export default function PassApprovalManager({ activity, reviewerEmail = 'admin' }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'pending' | 'approved' | 'all'
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (!activity?.id) return;

    const q = query(
      collection(db, 'passRequests'),
      where('activityId', '==', activity.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort: pending first, then by timestamp descending
      items.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setRequests(items);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching pass requests:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activity?.id]);

  const handleReview = async (requestId, newStatus) => {
    try {
      setProcessingId(requestId);
      const ref = doc(db, 'passRequests', requestId);
      await updateDoc(ref, {
        status: newStatus,
        reviewedAt: serverTimestamp(),
        reviewedBy: reviewerEmail
      });
    } catch (err) {
      console.error('Error reviewing request:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesSearch = !search || 
      (r.participantName && r.participantName.toLowerCase().includes(search.toLowerCase())) ||
      (r.participantUsn && r.participantUsn.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  return (
    <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface tracking-tight">Participant Approvals</h3>
            <p className="text-[11px] text-secondary">Coordinators & Admins can approve entry to {activity.name}</p>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 bg-surface-container-low border border-surface-container p-1 rounded-xl text-xs self-start sm:self-auto">
          <button
            onClick={() => setFilter('pending')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              filter === 'pending' 
                ? 'bg-surface-container text-primary font-bold border border-surface-container-high' 
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            <span>Pending</span>
            <span className="w-4 h-4 rounded-full bg-surface-container-high text-primary text-[10px] flex items-center justify-center font-mono">
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('approved')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              filter === 'approved' 
                ? 'bg-tertiary-container text-on-tertiary-container font-bold border border-tertiary/30' 
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            <span>Approved</span>
            <span className="w-4 h-4 rounded-full bg-tertiary text-on-tertiary text-[10px] flex items-center justify-center font-mono">
              {approvedCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filter === 'all' 
                ? 'bg-surface-container text-on-surface font-bold border border-surface-container-high' 
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            <span>All ({requests.length})</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <input
          type="text"
          placeholder="Filter by student name or USN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-2 px-3 pl-9 text-xs text-on-surface placeholder-secondary focus:outline-none"
        />
        <Search className="w-3.5 h-3.5 text-secondary absolute left-3 top-2.5" />
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="py-8 text-center text-xs text-secondary bg-surface-container-low rounded-2xl border border-surface-container">
          No {filter} pass requests found for {activity.name}.
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {filteredRequests.map((req) => {
            const isProcessing = processingId === req.id;
            return (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-3 text-xs hover:border-surface-container-high transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-on-surface">{req.participantName}</div>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-primary font-bold">{req.participantUsn || 'N/A'}</span>
                    <span className="text-outline-variant">&bull;</span>
                    <span className={`capitalize font-sans font-medium ${
                      req.status === 'approved' ? 'text-tertiary font-bold' :
                      req.status === 'rejected' ? 'text-error font-bold' :
                      'text-primary font-semibold'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  {req.status !== 'approved' && (
                    <button
                      onClick={() => handleReview(req.id, 'approved')}
                      disabled={isProcessing}
                      title="Approve Pass"
                      className="p-2 bg-tertiary hover:bg-tertiary/90 text-on-tertiary rounded-xl font-bold transition-all flex items-center gap-1 active:scale-95 shadow-xs"
                    >
                      {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span className="text-[11px] hidden sm:inline">Approve</span>
                    </button>
                  )}

                  {req.status !== 'rejected' && (
                    <button
                      onClick={() => handleReview(req.id, 'rejected')}
                      disabled={isProcessing}
                      title="Reject Pass"
                      className="p-2 bg-error hover:bg-error/90 text-on-error rounded-xl font-semibold transition-all flex items-center gap-1 active:scale-95 shadow-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span className="text-[11px] hidden sm:inline">Reject</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
