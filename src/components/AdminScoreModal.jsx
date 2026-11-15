import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  X, 
  Check, 
  Trash2, 
  AlertCircle, 
  Search, 
  UserCheck, 
  CheckCircle2, 
  Sparkles,
  FileSpreadsheet,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { subscribeToAllPassRequests } from '../services/passApprovalService';
import { pushScoreToGoogleSheet } from '../services/googleSheetsService';

export default function AdminScoreModal({
  isOpen,
  onClose,
  activity,
  attendees = [],
  existingScores = [],
  effectiveSheetUrl = '',
  effectiveSheetName = '',
  webAppUrl = null,
  onPublish,
  onUnpublish,
  adminEmail = 'admin'
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [manualName, setManualName] = useState('');
  const [manualUsn, setManualUsn] = useState('');
  const [score, setScore] = useState('');
  const [rank, setRank] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [approvedRequests, setApprovedRequests] = useState([]);

  // Subscribe to approved pass requests for this activity for live USN search
  useEffect(() => {
    if (!isOpen || !activity?.id) return;
    const unsub = subscribeToAllPassRequests((requests) => {
      const filtered = requests.filter(r => r.activityId === activity.id && r.status === 'approved');
      setApprovedRequests(filtered);
    });
    return () => unsub();
  }, [isOpen, activity?.id]);

  // Aggregate candidate participant records for USN search
  const candidates = useMemo(() => {
    const map = new Map();

    // 1. From existing scores
    existingScores.forEach(s => {
      const usn = (s.participantUsn || '').trim().toUpperCase();
      const name = (s.participantName || '').trim();
      const key = usn || name.toLowerCase();
      if (key) {
        map.set(key, {
          usn,
          name,
          participantId: s.participantId || s.id,
          source: 'Current Standings',
          currentScore: s.score || '',
          currentRank: s.rank || null
        });
      }
    });

    // 2. From approved pass requests
    approvedRequests.forEach(r => {
      const usn = (r.participantUsn || '').trim().toUpperCase();
      const name = (r.participantName || '').trim();
      const key = usn || name.toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, {
          usn,
          name,
          participantId: r.participantId || r.userId || `req_${r.id}`,
          source: 'Approved Pass',
          currentScore: '',
          currentRank: null
        });
      }
    });

    // 3. From scanned attendees
    attendees.forEach(a => {
      const usn = (a.participantUsn || a.usn || '').trim().toUpperCase();
      const name = (a.participantName || a.name || '').trim();
      const key = usn || name.toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, {
          usn,
          name,
          participantId: a.participantId || a.id,
          source: 'Room Attendee',
          currentScore: '',
          currentRank: null
        });
      }
    });

    return Array.from(map.values());
  }, [existingScores, approvedRequests, attendees]);

  // Search filtered candidates matching USN or Name
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return candidates.filter(c => 
      c.usn.toLowerCase().includes(q) || 
      c.name.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [candidates, searchQuery]);

  if (!isOpen) return null;

  const handleSelectCandidate = (candidate) => {
    setSelectedStudent(candidate);
    setManualName(candidate.name);
    setManualUsn(candidate.usn);
    if (candidate.currentScore) {
      setScore(String(candidate.currentScore));
    } else {
      setScore('');
    }
    if (candidate.currentRank) {
      setRank(candidate.currentRank);
    }
    setSearchQuery('');
  };

  const handleClearSelection = () => {
    setSelectedStudent(null);
    setManualName('');
    setManualUsn('');
    setScore('');
    setSearchQuery('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessToast('');

    const targetName = (selectedStudent?.name || manualName || '').trim();
    const targetUsn = (selectedStudent?.usn || manualUsn || '').trim().toUpperCase();
    const cleanScore = score.trim();

    if (!targetUsn && !targetName) {
      setError('Please search a participant by USN or enter their details.');
      return;
    }

    if (!cleanScore) {
      setError('Please enter a score/marks for this participant.');
      return;
    }

    const participantId = selectedStudent?.participantId || 
      (targetUsn ? targetUsn.replace(/[^A-Z0-9]/gi, '_').toLowerCase() : `manual_${Date.now()}`);

    try {
      setSubmitting(true);

      // 1. Publish / Update score in Firestore
      await onPublish({
        activityId: activity.id,
        participantId,
        participantName: targetName || targetUsn,
        participantUsn: targetUsn,
        score: cleanScore,
        rank: Number(rank) || 1,
        adminEmail
      });

      // 2. 2-Way Sync: Push updated score to Google Sheet (finds by USN, updates score only, auto-sorts)
      try {
        await pushScoreToGoogleSheet({
          activityId: activity.id,
          sheetName: effectiveSheetName,
          participantName: targetName,
          participantUsn: targetUsn,
          score: cleanScore,
          webAppUrl
        });
      } catch (sheetErr) {
        console.warn('Google Sheet score push notice:', sheetErr);
      }

      setSuccessToast(`Score updated to ${cleanScore} for ${targetUsn || targetName}! Sheet auto-sorted.`);
      setTimeout(() => {
        setSuccessToast('');
        handleClearSelection();
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Failed to publish score:', err);
      setError(err.message || 'Failed to publish score');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-6 sm:pt-14 bg-black/50 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-surface-container-lowest border border-surface-container rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl space-y-5 my-auto sm:my-0 text-on-surface">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">Manual Score Entry & Update</h3>
              <p className="text-xs text-secondary">{activity.name} &bull; {activity.room}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-error-container border border-error/20 text-on-error-container text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-error" />
            <span>{error}</span>
          </div>
        )}

        {successToast && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successToast}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* USN Live Search Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wider flex items-center justify-between">
              <span>Search Participant by USN or Name</span>
              <span className="text-[10px] text-secondary font-mono">{candidates.length} Available</span>
            </label>

            <div className="relative">
              <Search className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type USN (e.g. 1ST24AI045) or Name..."
                className="w-full bg-surface-container-low border border-surface-container rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-on-surface placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary shadow-xs font-medium"
              />
            </div>

            {/* Live Autocomplete Suggestions */}
            {searchResults.length > 0 && (
              <div className="bg-surface-container-lowest border border-surface-container rounded-2xl shadow-lg overflow-hidden divide-y divide-surface-container z-20">
                {searchResults.map((cand, idx) => (
                  <button
                    key={`${cand.usn}_${idx}`}
                    type="button"
                    onClick={() => handleSelectCandidate(cand)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-surface-container-low flex items-center justify-between transition-colors text-xs"
                  >
                    <div>
                      <div className="font-bold text-on-surface flex items-center gap-1.5">
                        <span>{cand.name}</span>
                        {cand.usn && (
                          <span className="font-mono text-[11px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {cand.usn}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-secondary">{cand.source}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {cand.currentScore ? (
                        <span className="font-mono text-[11px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                          Score: {cand.currentScore}
                        </span>
                      ) : (
                        <span className="text-[10px] text-secondary italic">No score yet</span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-secondary" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Selection Chip */}
          {selectedStudent ? (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-on-surface">{selectedStudent.name}</span>
                  {selectedStudent.usn && (
                    <span className="font-mono text-xs font-bold text-primary bg-surface-container px-2 py-0.5 rounded-md border border-surface-container-high">
                      {selectedStudent.usn}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-secondary">
                  Ready to update score. Sheet auto-sort will recalculate ranking.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs font-bold text-secondary hover:text-on-surface px-2 py-1 rounded-lg hover:bg-surface-container transition-colors"
              >
                Change
              </button>
            </div>
          ) : (
            /* Manual Fallback Inputs if student is not found */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">
                  Participant USN
                </label>
                <input
                  type="text"
                  value={manualUsn}
                  onChange={(e) => setManualUsn(e.target.value.toUpperCase())}
                  placeholder="e.g. 1ST24AI045"
                  className="w-full bg-surface-container-low border border-surface-container rounded-xl px-3 py-2 text-xs text-on-surface font-mono placeholder-secondary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase tracking-wider mb-1">
                  Participant Name
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-surface-container-low border border-surface-container rounded-xl px-3 py-2 text-xs text-on-surface placeholder-secondary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Primary Action: Update ONLY the Score */}
          <div className="bg-surface-container-low border border-surface-container rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Enter / Update Score</span>
              </label>
              <span className="text-[11px] text-secondary font-mono">Column 4 (Points)</span>
            </div>

            <input
              type="text"
              required
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="e.g. 95 or 88.5"
              className="w-full bg-surface-container-lowest border-2 border-primary/30 focus:border-primary rounded-xl px-4 py-3 text-lg font-mono font-bold text-primary placeholder-secondary/50 focus:outline-none shadow-xs"
              autoFocus
            />

            <p className="text-[11px] text-secondary leading-relaxed">
              Updating the score pushes directly to Firestore and Google Sheets. The sheet script automatically sorts descending and recalculates exact ranks.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-surface-container flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-on-primary bg-primary hover:bg-primary-container disabled:opacity-50 transition-all shadow-xs flex items-center gap-2 active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Score...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Update Score & Auto-Sort</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Existing Scores List (for quick removal/editing) */}
        {existingScores.length > 0 && (
          <div className="pt-4 border-t border-surface-container space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-secondary">
              <span>Published Scores ({existingScores.length})</span>
              <span className="text-[10px] text-secondary lowercase font-normal">Click participant to edit score</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {existingScores.map((s) => (
                <div 
                  key={s.id} 
                  className="bg-surface-container-low hover:bg-surface-container border border-surface-container rounded-xl px-3 py-2 text-xs flex items-center justify-between transition-colors"
                >
                  <div 
                    onClick={() => handleSelectCandidate({
                      usn: s.participantUsn || '',
                      name: s.participantName || '',
                      participantId: s.participantId || s.id,
                      source: 'Current Standings',
                      currentScore: s.score || '',
                      currentRank: s.rank || null
                    })}
                    className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                  >
                    <span className="font-bold text-primary font-mono text-[11px] shrink-0">
                      #{s.rank}
                    </span>
                    <span className="font-semibold text-on-surface truncate">{s.participantName}</span>
                    {s.participantUsn && (
                      <span className="font-mono text-[10px] text-secondary shrink-0">({s.participantUsn})</span>
                    )}
                    {s.score && (
                      <span className="font-mono text-[11px] text-primary bg-surface-container px-1.5 py-0.5 rounded font-bold shrink-0">
                        {s.score}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnpublish(s.participantId)}
                    title="Remove from Leaderboard"
                    className="p-1 text-secondary hover:text-error transition-colors shrink-0 ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
