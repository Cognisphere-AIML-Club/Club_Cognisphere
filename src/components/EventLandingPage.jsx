import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, 
  MapPin, 
  Clock, 
  Tag, 
  Edit3, 
  QrCode, 
  ShieldCheck, 
  ChevronRight, 
  ChevronDown,
  Calendar,
  Radio, 
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  Lock,
  Compass,
  Megaphone,
  Plus,
  Trash2,
  Pin,
  PinOff,
  LogIn,
  X,
  Loader2
} from 'lucide-react';
import { subscribeToUserPassRequests } from '../services/passApprovalService';
import { useAnnouncements } from '../hooks/useAnnouncements';

/**
 * Inline Announcement Editor: Tracks position inside announcements feed and occupies only required height
 */
function InlineAnnouncementEditor({ initialData = null, onSave, onCancel }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [message, setMessage] = useState(initialData?.message || '');
  const [type, setType] = useState(initialData?.type || 'info');
  const [pinned, setPinned] = useState(Boolean(initialData?.pinned));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Please provide both a title and message.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await onSave({
        title: title.trim(),
        message: message.trim(),
        type,
        pinned
      });
    } catch (err) {
      setError(err.message || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-surface-container-low border-2 border-primary/40 space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between pb-2 border-b border-surface-container">
        <span className="text-xs font-bold text-primary flex items-center gap-1.5">
          {initialData ? <Edit3 className="w-3.5 h-3.5 text-primary" /> : <Megaphone className="w-3.5 h-3.5 text-primary" />}
          <span>{initialData ? 'Edit Announcement' : 'Post Announcement'}</span>
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-secondary hover:text-on-surface p-1 rounded-lg transition-colors"
          title="Cancel"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-error-container border border-error/20 text-on-error-container text-xs">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <input
          type="text"
          placeholder="Announcement Title (e.g. Schedule Update / Final Call)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-surface-container border border-surface-container-high focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none"
          required
        />
        <textarea
          rows={3}
          placeholder="Write announcement message broadcast to all participants..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-surface-container border border-surface-container-high focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none resize-none"
          required
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-secondary font-medium">Type:</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="bg-surface-container border border-surface-container-high text-on-surface rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="info">Info</option>
              <option value="urgent">Urgent</option>
              <option value="success">Success</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-secondary hover:text-on-surface">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-primary focus:ring-primary cursor-pointer"
            />
            <span className="text-[11px] font-semibold">Pin to top</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="py-1.5 px-3 rounded-xl border border-surface-container text-xs font-semibold text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="py-1.5 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{saving ? 'Saving...' : initialData ? 'Save Changes' : 'Post Announcement'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}

/**
 * Inline Activity Card Editor: Replaces the card directly in the grid, tracking its position and occupying only required height
 */
function InlineActivityCardEditor({ activity, onSave, onCancel }) {
  const [eventDate, setEventDate] = useState(activity.eventDate || '2026-11-24');
  const [scheduledTime, setScheduledTime] = useState(activity.scheduledTime || '10:00 AM');
  const [room, setRoom] = useState(activity.room || '');
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
      className="bg-surface-container-low border-2 border-primary/50 rounded-3xl p-5 sm:p-6 shadow-md flex flex-col justify-between space-y-4 animate-fadeIn"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center">
              <Edit3 className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-on-surface">Edit Activity Info</span>
              <p className="text-[10px] text-secondary font-medium">{activity.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-secondary hover:text-on-surface transition-colors"
            title="Cancel edit"
            aria-label="Cancel edit"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-error-container border border-error/20 text-on-error-container text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-on-surface mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-primary" />
              <span>Event Date</span>
            </label>
            <input
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full bg-surface-container border border-surface-container-high focus:border-primary rounded-xl py-1.5 px-2.5 text-xs text-on-surface focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-on-surface mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-secondary" />
              <span>Scheduled Time</span>
            </label>
            <input
              type="text"
              required
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              placeholder="e.g. 10:00 AM – 12:00 PM"
              className="w-full bg-surface-container border border-surface-container-high focus:border-primary rounded-xl py-1.5 px-2.5 text-xs text-on-surface focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-on-surface mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-primary" />
              <span>Room / Venue</span>
            </label>
            <input
              type="text"
              required
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. Lab 301"
              className="w-full bg-surface-container border border-surface-container-high focus:border-primary rounded-xl py-1.5 px-2.5 text-xs text-on-surface focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-on-surface mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-secondary" />
              <span>Round Status</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-surface-container border border-surface-container-high focus:border-primary rounded-xl py-1.5 px-2.5 text-xs text-on-surface focus:outline-none cursor-pointer"
            >
              <option value="Upcoming">Upcoming</option>
              <option value="In Progress">In Progress (Live)</option>
              <option value="Paused">Paused</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-on-surface mb-1">
            Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-surface-container border border-surface-container-high focus:border-primary rounded-xl py-1.5 px-2.5 text-xs text-on-surface focus:outline-none resize-none"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-surface-container flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="py-1.5 px-3 rounded-xl border border-surface-container text-xs font-semibold text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="py-1.5 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>
    </form>
  );
}

export default function EventLandingPage({ 
  activities = [], 
  isAdmin = false, 
  user = null, 
  profile = null, 
  onViewPass, 
  onSelectGame,
  onUpdateActivity,
  onSignIn
}) {
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [showAnnouncementEditor, setShowAnnouncementEditor] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
  const [userRequests, setUserRequests] = useState({});
  const { announcements, postAnnouncement, editAnnouncement, removeAnnouncement, togglePinAnnouncement } = useAnnouncements();
  const competitionsHeadingRef = useRef(null);
  const longPressTimerRef = useRef(null);

  // Latest event determination (latest event "IGNITE" expanded by default, others collapsed)
  const [expandedEventId, setExpandedEventId] = useState('ignite');

  const handleTouchStart = (item) => {
    if (!isAdmin) return;
    longPressTimerRef.current = setTimeout(() => {
      togglePinAnnouncement(item.id, item.pinned);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(50); } catch (_) {}
      }
    }, 550);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Subscribe to real-time pass approval statuses for this participant
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToUserPassRequests(user.uid, (map) => {
      setUserRequests(map);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Priority Logic for Current Game
  const approvedInProgress = activities.find(
    a => userRequests[a.id]?.status === 'approved' && a.status === 'In Progress'
  );
  const approvedUpcoming = activities.find(
    a => userRequests[a.id]?.status === 'approved' && a.status !== 'Completed'
  );
  const generalLive = activities.find(a => a.status === 'In Progress');
  const generalUpcoming = activities.find(a => a.status !== 'Completed');

  let targetGame = null;
  let targetMode = 'unregistered';

  if (approvedInProgress) {
    targetGame = approvedInProgress;
    targetMode = 'approved_live';
  } else if (approvedUpcoming) {
    targetGame = approvedUpcoming;
    targetMode = 'approved_upcoming';
  } else if (generalLive) {
    targetGame = generalLive;
    targetMode = 'unapproved_live';
  } else if (generalUpcoming) {
    targetGame = generalUpcoming;
    targetMode = 'unregistered';
  }

  const scrollToCompetitions = () => {
    if (competitionsHeadingRef.current) {
      const navOffset = 90;
      const elementPosition = competitionsHeadingRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto w-full">
      {/* Hero Banner with Dynamic Current Game Selection */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="space-y-4">
          {targetGame?.status === 'In Progress' && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-error-container text-on-error-container animate-pulse self-start">
              <Radio className="w-3.5 h-3.5 text-error" />
              <span>Round in Progress</span>
            </div>
          )}

          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-on-surface leading-tight">
              Events Hub
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed max-w-xl">
              Technical and Non-Technical activities across different topics. Select any game below to view dedicated rules and request your participation pass.
            </p>
          </div>

          {/* New User Callout */}
          {!user && (
            <div className="bg-surface-container-low border border-surface-container rounded-2xl p-4 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-container text-primary flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span>New Participant?</span>
                    </span>
                    <span className="text-xs text-secondary">• 1-Tap Google Sign-In</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-on-surface">
                    Sign Up to Join &amp; Get Your Event Pass
                  </h3>
                  <p className="text-xs text-on-surface-variant max-w-lg leading-relaxed">
                    Sign up with your college Google account to claim your unique attendance QR pass, enter classrooms, and view live timers and leaderboards.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={onSignIn}
                    className="py-3 px-5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
                  >
                    <LogIn className="w-4 h-4 text-on-primary" />
                    <span>Sign Up / Register</span>
                  </button>

                  <button
                    onClick={scrollToCompetitions}
                    className="py-3 px-3 bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container-high font-medium rounded-xl text-xs transition-all flex items-center gap-1"
                    title="Browse Competitions"
                  >
                    <span>Browse</span>
                    <ArrowDown className="w-3.5 h-3.5 text-secondary" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Personalized Spotlight Card */}
          {user && (
            (targetMode === 'approved_live' || targetMode === 'approved_upcoming') ? (
              <div className="bg-surface-container-low border border-tertiary/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-tertiary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-tertiary animate-ping" />
                    Where You Should Be Right Now
                  </span>

                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                    targetGame.status === 'In Progress' 
                      ? 'bg-error-container text-on-error-container' 
                      : 'bg-tertiary-container text-on-tertiary-container'
                  }`}>
                    {targetGame.status === 'In Progress' ? 'LIVE NOW' : (targetGame.scheduledTime || 'Approved • Upcoming')}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
                      <span>{targetGame.name}</span>
                      <span className="text-[11px] font-medium text-tertiary bg-tertiary-fixed/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-tertiary" />
                        <span>Pass Approved</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-secondary">
                      <span className="flex items-center gap-1 font-bold text-on-surface">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {targetGame.room}
                      </span>
                      <span>•</span>
                      <span>{targetGame.category} Competition</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewPass(targetGame.id)}
                      className="py-2.5 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                    >
                      <QrCode className="w-3.5 h-3.5 text-on-primary" />
                      <span>Open {targetGame.room} Pass</span>
                    </button>

                    <button
                      onClick={() => onSelectGame(targetGame)}
                      className="py-2.5 px-3 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface font-medium rounded-xl text-xs transition-all flex items-center gap-1"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5 text-secondary" />
                    </button>
                  </div>
                </div>
              </div>
            ) : targetMode === 'unapproved_live' ? (
              <div className="bg-surface-container-low border border-primary/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
                    Currently Live on Campus
                  </span>

                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-error-container text-on-error-container">
                    LIVE NOW
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-base sm:text-lg font-bold text-on-surface">
                      {targetGame.name} in {targetGame.room}
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      You need an approved pass to enter this room.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectGame(targetGame)}
                      className="py-2.5 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                    >
                      <span>Request Pass to Join</span>
                      <ArrowRight className="w-3.5 h-3.5 text-on-primary" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface-container-low border border-surface-container rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-secondary">
                  <Compass className="w-4 h-4 text-primary" />
                  <span>Get Started: Choose Your Competitions</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm sm:text-base font-bold text-on-surface">
                      You are not registered for any games yet
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      Explore the 5 activities below and request your participation pass for approval.
                    </p>
                  </div>

                  <button
                    onClick={scrollToCompetitions}
                    className="py-2.5 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
                  >
                    <span>Browse Competitions</span>
                    <ArrowDown className="w-3.5 h-3.5 text-on-primary" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Live Event Announcements Feed */}
      {((announcements && announcements.length > 0) || isAdmin) && (
        <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-surface-container">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Megaphone className="w-4 h-4 text-primary" />
              <span>Live Event Announcements</span>
              {isAdmin && (
                <span className="hidden sm:inline-block text-[10px] text-secondary font-normal lowercase">
                  (right-click or hold to pin)
                </span>
              )}
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  setEditingAnnouncementId(null);
                  setShowAnnouncementEditor(prev => !prev);
                }}
                className="px-2.5 py-1 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-bold text-xs flex items-center gap-1 transition-colors"
              >
                {showAnnouncementEditor ? <X className="w-3.5 h-3.5 text-primary" /> : <Plus className="w-3.5 h-3.5 text-primary" />}
                <span>{showAnnouncementEditor ? 'Cancel' : 'Post Announcement'}</span>
              </button>
            )}
          </div>

          {/* Inline Post Announcement Form */}
          {showAnnouncementEditor && isAdmin && (
            <InlineAnnouncementEditor
              onSave={async (data) => {
                await postAnnouncement({ ...data, authorEmail: user?.email || 'admin' });
                setShowAnnouncementEditor(false);
              }}
              onCancel={() => setShowAnnouncementEditor(false)}
            />
          )}

          {(!announcements || announcements.length === 0) && isAdmin && !showAnnouncementEditor && (
            <div className="py-3 text-center text-xs text-secondary">
              No active announcements yet. Click <span className="font-bold text-primary">Post Announcement</span> above to broadcast updates.
            </div>
          )}

          <div className="space-y-2.5">
            {announcements.map((item) => {
              if (editingAnnouncementId === item.id && isAdmin) {
                return (
                  <InlineAnnouncementEditor
                    key={item.id}
                    initialData={item}
                    onSave={async (data) => {
                      await editAnnouncement(item.id, data);
                      setEditingAnnouncementId(null);
                    }}
                    onCancel={() => setEditingAnnouncementId(null)}
                  />
                );
              }

              return (
                <div 
                  key={item.id} 
                  onContextMenu={(e) => {
                    if (!isAdmin) return;
                    e.preventDefault();
                    togglePinAnnouncement(item.id, item.pinned);
                  }}
                  onTouchStart={() => handleTouchStart(item)}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  className={`p-3.5 rounded-2xl border text-xs flex items-start justify-between gap-3 transition-colors ${
                    item.pinned 
                      ? 'bg-surface-container border-primary/30 text-on-surface' 
                      : 'bg-surface-container-low border-surface-container text-on-surface-variant'
                  } ${isAdmin ? 'cursor-pointer select-none' : ''}`}
                  title={isAdmin ? 'Right-click on desktop or press & hold on mobile to pin/unpin' : undefined}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface text-sm">
                        {item.title}
                      </span>
                      {item.pinned && (
                        <span className="text-[10px] font-bold uppercase text-primary bg-primary-container/20 px-1.5 py-0.5 rounded border border-primary/30 flex items-center gap-1">
                          <Pin className="w-2.5 h-2.5 text-primary" />
                          <span>Pinned</span>
                        </span>
                      )}
                    </div>
                    <p className="text-on-surface-variant leading-relaxed text-xs">
                      {item.message}
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinAnnouncement(item.id, item.pinned);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          item.pinned 
                            ? 'text-primary bg-surface-container' 
                            : 'text-secondary hover:text-primary hover:bg-surface-container'
                        }`}
                        title={item.pinned ? 'Unpin Announcement' : 'Pin Announcement'}
                        aria-label={item.pinned ? 'Unpin announcement' : 'Pin announcement'}
                      >
                        {item.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAnnouncementEditor(false);
                          setEditingAnnouncementId(item.id);
                        }}
                        className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-container transition-colors"
                        title="Edit Announcement Details"
                        aria-label="Edit announcement"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAnnouncement(item.id);
                        }}
                        className="p-1.5 rounded-lg text-secondary hover:text-error hover:bg-error-container/30 transition-colors"
                        title="Delete Announcement"
                        aria-label="Delete announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Event Dropdown Section (Event: IGNITE with Activities inside as Cards) */}
      <div className="space-y-4 pt-2">
        <div ref={competitionsHeadingRef} className="flex items-center justify-between scroll-mt-24">
          <div>
            <h2 className="text-lg font-bold text-on-surface tracking-tight">Events &amp; Competitions Schedule</h2>
            <p className="text-xs text-secondary">Browse upcoming club events. The latest event is expanded by default.</p>
          </div>

          {isAdmin && (
            <span className="text-[11px] font-bold text-primary bg-surface-container border border-surface-container-high px-2.5 py-1 rounded-lg">
              Admin Mode: Editable
            </span>
          )}
        </div>

        {/* Main Event Dropdown: IGNITE */}
        <div className="w-full bg-surface-container-lowest border border-surface-container rounded-3xl overflow-hidden shadow-xs transition-all hover:border-surface-container-high">
          {/* IGNITE Full-Width Dropdown Header Bar */}
          <div
            onClick={() => setExpandedEventId(prev => prev === 'ignite' ? null : 'ignite')}
            className={`w-full p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer select-none transition-colors ${
              expandedEventId === 'ignite' ? 'bg-surface-container-low border-b border-surface-container' : 'hover:bg-surface-container-low'
            }`}
          >
            {/* Left: Event Title, Date & Badges */}
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary text-on-primary shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>IGNITE 2026</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-container text-primary font-mono border border-surface-container-high">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Nov 24 – 26, 2026 (3 Days)</span>
                </span>

                <span className="text-xs text-secondary font-semibold">
                  5 Activities • Finale &amp; Prizes Nov 26
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
                IGNITE — Annual Technical &amp; Non-Technical Championship
              </h3>
              <p className="text-xs text-secondary leading-relaxed max-w-2xl">
                The flagship 3-day championship (Nov 24 – 26, 2026). Days 1 &amp; 2 feature AI Prompting, UI/UX Makeover, Tech Quiz, Product Pitching, and JAM; Day 3 concludes with the Grand Finale &amp; Final Prize Distribution!
              </p>
            </div>

            {/* Right: Expand/Collapse indicator */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-secondary hidden sm:inline-block">
                {expandedEventId === 'ignite' ? 'Hide Activities' : 'Show Activities (5)'}
              </span>
              <div className="w-10 h-10 rounded-2xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-secondary transition-colors">
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${expandedEventId === 'ignite' ? 'rotate-180 text-primary' : ''}`} />
              </div>
            </div>
          </div>

          {/* Activities as Cards Inside the Main Event Dropdown */}
          {expandedEventId === 'ignite' && (
            <div className="p-5 sm:p-6 bg-surface-container-lowest space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activities.map((act) => {
                  if (editingActivityId === act.id && isAdmin) {
                    return (
                      <InlineActivityCardEditor
                        key={act.id}
                        activity={act}
                        onSave={onUpdateActivity}
                        onCancel={() => setEditingActivityId(null)}
                      />
                    );
                  }

                  const req = userRequests[act.id];
                  const isApproved = req?.status === 'approved';
                  const isPending = req?.status === 'pending';

                  return (
                    <div
                      key={act.id}
                      className="bg-surface-container-low border border-surface-container hover:border-surface-container-high rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-all group relative overflow-hidden space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            act.category === 'Technical'
                              ? 'bg-surface-container border-surface-container-high text-primary'
                              : 'bg-secondary-container/40 border-secondary/20 text-secondary'
                          }`}>
                            <Tag className="w-3 h-3" />
                            <span>{act.category}</span>
                          </span>

                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-tertiary-container text-on-tertiary-container">
                              <CheckCircle2 className="w-3 h-3 text-on-tertiary" />
                              <span>Pass Approved</span>
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container text-on-secondary-container">
                              <Clock className="w-3 h-3 text-secondary" />
                              <span>Pending</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              act.status === 'In Progress'
                                ? 'bg-error-container text-on-error-container'
                                : 'bg-surface-container text-secondary'
                            }`}>
                              {act.status === 'In Progress' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                              )}
                              <span>{act.status || 'Upcoming'}</span>
                            </span>
                          )}
                        </div>

                        {/* Activity Name */}
                        <h4
                          onClick={() => onSelectGame(act)}
                          className="text-base sm:text-lg font-bold text-on-surface group-hover:text-primary transition-colors cursor-pointer"
                        >
                          {act.name}
                        </h4>

                        {/* Specific Date Along with Room and Scheduled Time */}
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-secondary">
                          <div className="flex items-center gap-1.5 font-bold text-primary bg-surface-container px-2 py-0.5 rounded-lg border border-surface-container-high">
                            <Calendar className="w-3 h-3 text-primary" />
                            <span>
                              {act.eventDate === '2026-11-24' 
                                ? 'Nov 24, 2026' 
                                : act.eventDate === '2026-11-25' 
                                ? 'Nov 25, 2026' 
                                : act.eventDate === '2026-11-26' 
                                ? 'Nov 26, 2026' 
                                : act.eventDate || 'Nov 24, 2026'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 font-semibold text-on-surface">
                            <Clock className="w-3.5 h-3.5 text-secondary" />
                            <span>{act.scheduledTime || 'TBD'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-secondary font-medium">
                            <MapPin className="w-3.5 h-3.5 text-secondary" />
                            <span>{act.room}</span>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                          {act.description}
                        </p>
                      </div>

                      {/* Bottom Actions Row */}
                      <div className="pt-4 border-t border-surface-container flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectGame(act)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-container transition-colors py-1 px-2.5 rounded-lg bg-surface-container"
                          >
                            <span>Enter Arena</span>
                            <ChevronRight className="w-3.5 h-3.5 text-primary" />
                          </button>
                        </div>

                        {isAdmin && (
                          <button
                            onClick={() => setEditingActivityId(act.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-surface-container hover:bg-surface-container-high text-primary transition-all border border-surface-container-high"
                          >
                            <Edit3 className="w-3 h-3 text-primary" />
                            <span>Edit</span>
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
      </div>
    </div>
  );
}
