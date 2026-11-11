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
      collection(db, 'pass_requests'),
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
      const ref = doc(db, 'pass_requests', requestId);
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
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Participant Approvals</h3>
            <p className="text-[11px] text-slate-400">Coordinators & Admins can approve entry to {activity.name}</p>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs self-start sm:self-auto">
          <button
            onClick={() => setFilter('pending')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              filter === 'pending' 
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Pending</span>
            <span className="w-4 h-4 rounded-full bg-amber-500/30 text-amber-300 text-[10px] flex items-center justify-center font-mono">
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('approved')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              filter === 'approved' 
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Approved</span>
            <span className="w-4 h-4 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] flex items-center justify-center font-mono">
              {approvedCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filter === 'all' 
                ? 'bg-slate-800 text-white font-bold' 
                : 'text-slate-400 hover:text-white'
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
          className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl py-2 px-3 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none"
        />
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/60">
          No {filter} pass requests found for {activity.name}.
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {filteredRequests.map((req) => {
            const isProcessing = processingId === req.id;
            return (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-white">{req.participantName}</div>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-emerald-400 font-bold">{req.participantUsn || 'N/A'}</span>
                    <span className="text-slate-600">&bull;</span>
                    <span className={`capitalize font-sans font-medium ${
                      req.status === 'approved' ? 'text-emerald-400' :
                      req.status === 'rejected' ? 'text-rose-400' :
                      'text-amber-400'
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
                      className="p-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl font-bold transition-all flex items-center gap-1 active:scale-95"
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
                      className="p-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 rounded-xl transition-all flex items-center gap-1 active:scale-95"
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
