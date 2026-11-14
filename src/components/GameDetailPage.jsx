import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Tag, 
  Sparkles, 
  ShieldCheck, 
  QrCode, 
  Edit3, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Scale,
  Send,
  Loader2,
  Lock,
  Calendar,
  CalendarDays,
  Play,
  Tv,
  LogIn,
  X
} from 'lucide-react';
import PassApprovalManager from './PassApprovalManager';
import LeaderboardPodium from './LeaderboardPodium';
import { requestGamePass, subscribeToUserPassRequests } from '../services/passApprovalService';
import { useScores } from '../hooks/useScores';

/**
 * Inline Activity Editor for Game Detail Page: Tracks position right under the top navigation bar and occupies only required height
 */
function InlineGameDetailPageEditor({ activity, onSave, onCancel }) {
  const [room, setRoom] = useState(activity.room || '');
  const [scheduledTime, setScheduledTime] = useState(activity.scheduledTime || '10:00 AM');
  const [eventDate, setEventDate] = useState(activity.eventDate || '2026-11-24');
  const [status, setStatus] = useState(activity.status || 'Upcoming');
  const [description, setDescription] = useState(activity.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      await onSave(activity.id, {
        room: room.trim(),
        scheduledTime: scheduledTime.trim(),
        eventDate: eventDate.trim(),
        status,
        description: description.trim(),
      });
      onCancel();
    } catch (err) {
      setError(err.message || 'Failed to update activity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-container-lowest border-2 border-primary/40 rounded-3xl p-5 sm:p-6 shadow-md space-y-4 animate-fadeIn"
    >
      <div className="flex items-center justify-between pb-3 border-b border-surface-container">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface">Edit Game Information</h3>
            <p className="text-[11px] text-secondary">Updates venue, timing, round status, and guidelines live</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-xl text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          title="Cancel"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-error-container border border-error/20 text-xs text-on-error-container">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>Event Date</span>
          </label>
          <input
            type="date"
            required
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-secondary" />
            <span>Scheduled Time</span>
          </label>
          <input
            type="text"
            required
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            placeholder="e.g. 10:00 AM – 12:00 PM"
            className="w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>Assigned Room / Venue</span>
          </label>
          <input
            type="text"
            required
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="e.g. Room 204 or Lab 3"
            className="w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-secondary" />
            <span>Round Status</span>
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none cursor-pointer"
          >
            <option value="Upcoming">Upcoming</option>
            <option value="In Progress">In Progress (Live)</option>
            <option value="Paused">Paused</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-on-surface mb-1.5">
          Description &amp; Rules Summary
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the activity guidelines..."
          className="w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none resize-none"
        />
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-container">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="py-2 px-4 rounded-xl border border-surface-container hover:bg-surface-container text-xs font-semibold text-secondary hover:text-on-surface transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="py-2 px-5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2 active:scale-95"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin text-on-primary" />}
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>
    </form>
  );
}

export default function GameDetailPage({ 
  activity, 
  isAdmin, 
  isStaff,
  role,
  roleData,
  user, 
  profile, 
  onBack, 
  onOpenPass, 
  onUpdateActivity,
  onOpenBigScreen,
  onSignIn
}) {
  const [editing, setEditing] = useState(false);
  const [userRequests, setUserRequests] = useState({});
  const [requesting, setRequesting] = useState(false);

  // Subscribe to real-time scores and attendees for leaderboard
  const { scores, attendees, publishScore, unpublishScore } = useScores(activity?.id);

  // Subscribe to participant's pass requests
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToUserPassRequests(user.uid, (map) => {
      setUserRequests(map);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  if (!activity) return null;

  const request = userRequests[activity.id];
  const isApproved = isStaff || request?.status === 'approved';
  const isPending = request?.status === 'pending';
  const isRejected = request?.status === 'rejected';

  const handleRequestPass = async () => {
    if (!user || !profile) return;
    try {
      setRequesting(true);
      await requestGamePass({
        activityId: activity.id,
        participantId: user.uid,
        participantName: profile.name || user.displayName || 'Participant',
        participantUsn: profile.usn || '',
      });
    } catch (err) {
      alert(err.message || 'Failed to submit pass request');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto w-full">
      {/* Top Navigation Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-secondary hover:text-on-surface px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container hover:bg-surface-container-low transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Games</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setEditing(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-surface-container border border-surface-container-high text-primary hover:bg-surface-container-high transition-all"
          >
            {editing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            <span>{editing ? 'Close Editor' : 'Edit This Game Page'}</span>
          </button>
        )}
      </div>

      {/* Inline Activity Editor for Admin (tracks position right under top bar and occupies only required height) */}
      {editing && isAdmin && (
        <InlineGameDetailPageEditor
          activity={activity}
          onSave={onUpdateActivity}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* Hero Banner for this Game */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="space-y-4 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-surface-container border-surface-container-high text-primary">
              <Tag className="w-3 h-3" />
              <span>{activity.category} Competition</span>
            </span>

            {/* Status Pill */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              activity.status === 'In Progress'
                ? 'bg-tertiary-container border-tertiary/30 text-on-tertiary-container'
                : activity.status === 'Completed'
                ? 'bg-surface-container border-surface-container-high text-secondary'
                : 'bg-surface-container-low border-surface-container text-on-surface'
            }`}>
              {activity.status === 'In Progress' && (
                <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container animate-pulse" />
              )}
              <span>{activity.status || 'Upcoming'}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-on-surface leading-tight">
            {activity.name}
          </h1>

          {/* Quick Info Badges */}
          <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
            <div className="flex items-center gap-1.5 font-bold text-primary bg-surface-container px-3 py-1.5 rounded-xl border border-surface-container-high">
              <Calendar className="w-4 h-4 text-primary" />
              <span>
                {activity.eventDate === '2026-11-24' 
                  ? 'Date: Nov 24, 2026 (Day 1)' 
                  : activity.eventDate === '2026-11-25' 
                  ? 'Date: Nov 25, 2026 (Day 2)' 
                  : activity.eventDate === '2026-11-26' 
                  ? 'Date: Nov 26, 2026 (Day 3)' 
                  : `Date: ${activity.eventDate || 'Nov 24, 2026'}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-on-surface bg-surface-container-low px-3 py-1.5 rounded-xl border border-surface-container">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Venue: {activity.room}</span>
            </div>

            <div className="flex items-center gap-1.5 font-medium text-secondary bg-surface-container-low px-3 py-1.5 rounded-xl border border-surface-container">
              <Clock className="w-4 h-4 text-secondary" />
              <span>Schedule: {activity.scheduledTime || 'Announced on Event Day'}</span>
            </div>
          </div>

          {/* Request / Approved Pass Action Box */}
          {user && (
            <div className="pt-2">
              {isApproved ? (
                <button
                  onClick={() => onOpenPass(activity.id)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-xs active:scale-[0.99]"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Pass Approved • Open QR Code for {activity.room}</span>
                </button>
              ) : isPending ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container border border-surface-container-high rounded-2xl text-xs text-primary font-semibold">
                  <Clock className="w-4 h-4 text-primary animate-pulse" />
                  <span>Request Pending Review by Room Coordinator or Admin</span>
                </div>
              ) : isRejected ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-error-container border border-error/30 rounded-2xl text-xs text-on-error-container font-semibold">
                  <AlertCircle className="w-4 h-4 text-error" />
                  <span>Entry Not Approved for this Competition</span>
                </div>
              ) : (
                <button
                  onClick={handleRequestPass}
                  disabled={requesting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-container disabled:opacity-50 text-on-primary font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-xs active:scale-[0.99]"
                >
                  {requesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Request Pass to Participate in {activity.name}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Prompt when not signed in */}
          {!user && (
            <div className="pt-2">
              <button
                onClick={onSignIn}
                className="inline-flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-xs active:scale-[0.99]"
              >
                <LogIn className="w-4 h-4 text-on-primary" />
                <span>Sign Up / Sign In to Join Competition</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Complete Event Schedule Table (when available, e.g. for Reverse Prompt Engineering) */}
      {activity.scheduleTimeline && activity.scheduleTimeline.length > 0 && (
        <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-container">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-on-surface tracking-tight">
                  Complete Event Schedule
                </h3>
                <p className="text-xs text-secondary">Official stage-by-stage timetable</p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-primary bg-surface-container border border-surface-container-high px-3 py-1 rounded-xl self-start sm:self-auto">
              Total: {activity.totalDuration || '120 Minutes'}
            </span>
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-container text-secondary uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Activity / Stage</th>
                  <th className="py-2.5 px-3 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container font-medium">
                {activity.scheduleTimeline.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-primary whitespace-nowrap">
                      {item.time}
                    </td>
                    <td className="py-3 px-3 text-on-surface">
                      {item.stage}
                    </td>
                    <td className="py-3 px-3 text-right text-secondary font-mono whitespace-nowrap">
                      {item.duration}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-surface-container-high font-bold text-xs bg-surface-container-low">
                  <td className="py-3 px-3 text-on-surface uppercase tracking-wider" colSpan={2}>
                    Total Competition Duration
                  </td>
                  <td className="py-3 px-3 text-right text-primary font-mono text-sm">
                    120 Minutes
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Coordinator / Admin Approval Management Panel */}
      {isStaff && (
        <PassApprovalManager 
          activity={activity} 
          reviewerEmail={user?.email} 
        />
      )}

      {/* Official Live Leaderboard & Winners Podium */}
      <LeaderboardPodium 
        activity={activity}
        scores={scores}
        attendees={attendees}
        isAdmin={isAdmin}
        onPublishScore={publishScore}
        onUnpublishScore={unpublishScore}
        adminEmail={user?.email}
      />

      {/* Game Details Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main Content Column (2 spans) */}
        <div className="md:col-span-2 space-y-5">
          {/* Overview & Description Card */}
          <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <FileText className="w-4 h-4" />
              <span>Activity Overview</span>
            </div>
            <p className="text-sm text-on-surface leading-relaxed">
              {activity.description || 'Competition guidelines and briefing for this activity.'}
            </p>
          </div>

          {/* Rules & Competition Format Card */}
          <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Scale className="w-4 h-4" />
              <span>Competition Format & Rules</span>
            </div>
            
            <div className="space-y-2 text-xs text-on-surface leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Single Player:</strong> All challenges in this activity are individual rounds.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Duration:</strong> Follows the official 120-minute stage schedule above.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Judging:</strong> Human judges score each round; synchronized classroom timers regulate each stage.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Pass Required:</strong> Only approved participants with an active pass can scan in.</span>
              </div>
            </div>
          </div>

          {/* Judging Criteria Card */}
          <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Judging & Scoring Criteria</span>
            </div>
            
            <p className="text-xs text-secondary leading-relaxed">
              Scores are evaluated directly by judges in <strong className="text-on-surface">{activity.room}</strong>. Winners and top rankings will be published to the live leaderboard once rounds conclude.
            </p>
          </div>
        </div>

        {/* Sidebar Info Column (1 span) */}
        <div className="space-y-5">
          {/* Room Location Card */}
          <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
              Venue Location
            </h3>
            
            <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container text-center space-y-1">
              <div className="text-xs text-secondary font-medium">Assigned Classroom</div>
              <div className="text-2xl font-black text-on-surface">{activity.room}</div>
              <div className="text-[11px] text-primary font-medium">Check in with coordinator at door</div>
            </div>

            <p className="text-[11px] text-secondary leading-relaxed">
              Present your approved <strong className="text-on-surface">{activity.name}</strong> QR pass to the coordinator stationed at the entrance of {activity.room}.
            </p>
          </div>

          {/* Attendance Requirement Badge */}
          <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <ShieldCheck className="w-4 h-4" />
              <span>Certificate Requirement</span>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              Attendance in {activity.room} is recorded individually. You must be approved and scanned present to receive the digital certificate for this activity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
