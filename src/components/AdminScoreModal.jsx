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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface-container-lowest border border-surface-container rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto text-on-surface">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">Publish Winner & Score</h3>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Mode: From Scanned Attendees OR Manual */}
          <div className="flex items-center gap-2 bg-surface-container-low border border-surface-container p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setSelectedStudentType('attendee')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                selectedStudentType === 'attendee'
                  ? 'bg-primary text-on-primary shadow-xs font-bold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Scanned Attendees ({attendees.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStudentType('manual')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                selectedStudentType === 'manual'
                  ? 'bg-primary text-on-primary shadow-xs font-bold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Manual Entry
            </button>
          </div>

          {/* Attendee Picker */}
          {selectedStudentType === 'attendee' ? (
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
                Select Attendee
              </label>
              {attendees.length > 0 ? (
                <select
                  value={selectedAttendeeUid}
                  onChange={(e) => setSelectedAttendeeUid(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
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
                <div className="p-3 bg-surface-container-low border border-surface-container rounded-xl text-xs text-secondary">
                  No attendance scanned in this room yet. Switch to "Manual Entry" above to publish scores directly.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
                  Participant Full Name
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-surface-container-low border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder-secondary focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
                  College USN
                </label>
                <input
                  type="text"
                  value={manualUsn}
                  onChange={(e) => setManualUsn(e.target.value.toUpperCase())}
                  placeholder="e.g. 1ST24AI045"
                  className="w-full bg-surface-container-low border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface font-mono placeholder-secondary focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* Rank & Score Selection */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
                Podium Rank
              </label>
              <select
                value={rank}
                onChange={(e) => setRank(Number(e.target.value))}
                className="w-full bg-surface-container-low border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface font-bold focus:outline-none focus:border-primary"
              >
                <option value={1}>🥇 1st Place (Winner)</option>
                <option value={2}>🥈 2nd Place (Runner-up)</option>
                <option value={3}>🥉 3rd Place</option>
                <option value={4}>Rank 4 (Finalist)</option>
                <option value={5}>Rank 5 (Finalist)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5">
                Score / Points (Optional)
              </label>
              <input
                type="text"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="e.g. 96 / 100"
                className="w-full bg-surface-container-low border border-surface-container rounded-xl px-3.5 py-2.5 text-sm text-on-surface font-mono placeholder-secondary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-surface-container flex items-center justify-end gap-2.5">
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
              className="px-4 py-2 rounded-xl text-xs font-bold text-on-primary bg-primary hover:bg-primary-container disabled:opacity-50 transition-all shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Publishing...' : 'Publish to Leaderboard'}</span>
            </button>
          </div>
        </form>

        {/* Existing Scores List (for quick removal/editing) */}
        {existingScores.length > 0 && (
          <div className="pt-4 border-t border-surface-container space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
              Published Ranks for {activity.name}:
            </h4>
            <div className="space-y-1.5">
              {existingScores.map((s) => (
                <div 
                  key={s.id} 
                  className="bg-surface-container-low border border-surface-container rounded-xl px-3 py-2 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">
                      {s.rank === 1 ? '🥇 1st' : s.rank === 2 ? '🥈 2nd' : s.rank === 3 ? '🥉 3rd' : `#${s.rank}`}
                    </span>
                    <span className="font-semibold text-on-surface">{s.participantName}</span>
                    {s.participantUsn && (
                      <span className="font-mono text-[11px] text-secondary">({s.participantUsn})</span>
                    )}
                    {s.score && (
                      <span className="font-mono text-[11px] text-primary bg-surface-container px-1.5 py-0.5 rounded">
                        {s.score}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onUnpublish(s.participantId)}
                    title="Remove from Leaderboard"
                    className="p-1 text-secondary hover:text-error transition-colors"
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

