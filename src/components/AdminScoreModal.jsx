import React, { useState } from 'react';
import { Award, X, Check, Trash2, AlertCircle, UserCheck } from 'lucide-react';

export default function AdminScoreModal({
  isOpen,
  onClose,
  activity,
  attendees = [],
  onPublish,
  onUnpublish,
  existingScores = [],
  adminEmail = 'admin'
}) {
  const [selectedStudentType, setSelectedStudentType] = useState('attendee'); // 'attendee' | 'manual'
  const [selectedAttendeeUid, setSelectedAttendeeUid] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualUsn, setManualUsn] = useState('');
  const [rank, setRank] = useState(1);
  const [score, setScore] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let participantId = '';
    let participantName = '';
    let participantUsn = '';

    if (selectedStudentType === 'attendee') {
      const att = attendees.find(a => (a.participantId || a.id) === selectedAttendeeUid);
      if (!att) {
        setError('Please select an attendee from the list.');
        return;
      }
      participantId = att.participantId || att.id;
      participantName = att.participantName || att.name || 'Participant';
      participantUsn = att.participantUsn || att.usn || '';
    } else {
      if (!manualName.trim()) {
        setError('Please provide the participant name.');
        return;
      }
      participantId = `manual_${manualName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
      participantName = manualName.trim();
      participantUsn = manualUsn.trim();
    }

    try {
      setSubmitting(true);
      await onPublish({
        activityId: activity.id,
        participantId,
        participantName,
        participantUsn,
        score: score.trim(),
        rank: Number(rank),
        adminEmail
      });

      // Reset form
      setManualName('');
      setManualUsn('');
      setScore('');
      setSelectedAttendeeUid('');
      onClose();
    } catch (err) {
      console.error('Failed to publish score:', err);
      setError(err.message || 'Failed to publish score');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Publish Winner & Score</h3>
              <p className="text-xs text-slate-400">{activity.name} &bull; {activity.room}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Mode: From Scanned Attendees OR Manual */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setSelectedStudentType('attendee')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                selectedStudentType === 'attendee'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Scanned Attendees ({attendees.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStudentType('manual')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                selectedStudentType === 'manual'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Manual Entry
            </button>
          </div>

          {/* Attendee Picker */}
          {selectedStudentType === 'attendee' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Select Attendee
              </label>
              {attendees.length > 0 ? (
                <select
                  value={selectedAttendeeUid}
                  onChange={(e) => setSelectedAttendeeUid(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">-- Choose from present attendees --</option>
                  {attendees.map((att) => {
                    const id = att.participantId || att.id;
                    const name = att.participantName || att.name || 'Participant';
                    const usn = att.participantUsn || att.usn ? `(${att.participantUsn || att.usn})` : '';
                    return (
                      <option key={id} value={id}>
                        {name} {usn}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400">
                  No attendance scanned in this room yet. Switch to "Manual Entry" above to publish scores directly.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Participant Full Name
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  College USN
                </label>
                <input
                  type="text"
                  value={manualUsn}
                  onChange={(e) => setManualUsn(e.target.value.toUpperCase())}
                  placeholder="e.g. 1ST24AI045"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Rank & Score Selection */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Podium Rank
              </label>
              <select
                value={rank}
                onChange={(e) => setRank(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>🥇 1st Place (Winner)</option>
                <option value={2}>🥈 2nd Place (Runner-up)</option>
                <option value={3}>🥉 3rd Place</option>
                <option value={4}>Rank 4 (Finalist)</option>
                <option value={5}>Rank 5 (Finalist)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Score / Points (Optional)
              </label>
              <input
                type="text"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="e.g. 96 / 100"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Publishing...' : 'Publish to Leaderboard'}</span>
            </button>
          </div>
        </form>

        {/* Existing Scores List (for quick removal/editing) */}
        {existingScores.length > 0 && (
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Published Ranks for {activity.name}:
            </h4>
            <div className="space-y-1.5">
              {existingScores.map((s) => (
                <div 
                  key={s.id} 
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400">
                      {s.rank === 1 ? '🥇 1st' : s.rank === 2 ? '🥈 2nd' : s.rank === 3 ? '🥉 3rd' : `#${s.rank}`}
                    </span>
                    <span className="font-semibold text-white">{s.participantName}</span>
                    {s.participantUsn && (
                      <span className="font-mono text-[11px] text-slate-400">({s.participantUsn})</span>
                    )}
                    {s.score && (
                      <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        {s.score}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onUnpublish(s.participantId)}
                    title="Remove from Leaderboard"
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
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

