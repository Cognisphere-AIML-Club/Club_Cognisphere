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
  Calendar,
  CalendarDays,
  LogIn,
  X,
  Trophy,
  ArrowRight,
  Target,
  Layers,
  GraduationCap,
  Users,
  AlertTriangle,
  Flame,
  Check,
  Swords,
  ScrollText
} from 'lucide-react';
import { requestGamePass, subscribeToUserPassRequests } from '../services/passApprovalService';
import { GAME_GUIDES } from '../data/gameGuides';
import AdminTimePicker from './AdminTimePicker';
import AdminDatePicker from './AdminDatePicker';
import { useActivityStatus } from '../utils/activityStatus';

/**
 * SquareText Icon (Lucide official square-text SVG)
 */
function SquareText({ className = "w-4 h-4", ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 8h10" />
      <path d="M7 12h10" />
      <path d="M7 16h6" />
    </svg>
  );
}

const VENUE_ROOM_OPTIONS = [
  'Room A107',
  'Room A108',
  'AIML Lab',
];

function parseTimeRange(str) {
  if (!str) return { startTime: '10:00', endTime: '11:30' };
  const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)?/gi;
  const matches = [...str.matchAll(timeRegex)];

  function to24h(h, m, meridiem) {
    let hours = parseInt(h, 10);
    const isPM = meridiem && meridiem.toUpperCase() === 'PM';
    const isAM = meridiem && meridiem.toUpperCase() === 'AM';
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return String(hours).padStart(2, '0') + ':' + m;
  }

  let startTime = '10:00';
  let endTime = '11:30';

  if (matches.length >= 1) {
    startTime = to24h(matches[0][1], matches[0][2], matches[0][3] || 'AM');
  }
  if (matches.length >= 2) {
    endTime = to24h(matches[1][1], matches[1][2], matches[1][3] || 'AM');
  }
  return { startTime, endTime };
}

function formatTimeRange(start24, end24) {
  function to12h(time24) {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const meridiem = h >= 12 ? 'PM' : 'AM';
    const hours = h % 12 || 12;
    return `${hours}:${String(m).padStart(2, '0')} ${meridiem}`;
  }
  if (start24 && end24) {
    return `${to12h(start24)} – ${to12h(end24)}`;
  }
  if (start24) {
    return to12h(start24);
  }
  return '';
}

/**
 * Inline Activity Editor for Game Detail Page:
 * Allows Admin to update date, scheduled time via time picker, venue room via dropdown, and round status.
 * Description editing option is removed from admin controls as requested.
 */
function InlineGameDetailPageEditor({ activity, onSave, onCancel }) {
  const [eventDate, setEventDate] = useState(activity.eventDate || '2026-11-24');

  // Time Picker states
  const initialTimes = parseTimeRange(activity.scheduledTime);
  const [startTime, setStartTime] = useState(initialTimes.startTime);
  const [endTime, setEndTime] = useState(initialTimes.endTime);

  // Room / Venue Dropdown states
  const isCustom = activity.room && !VENUE_ROOM_OPTIONS.includes(activity.room);
  const [room, setRoom] = useState(isCustom ? 'CUSTOM_OTHER' : (activity.room || VENUE_ROOM_OPTIONS[0]));
  const [isCustomRoom, setIsCustomRoom] = useState(isCustom);
  const [customRoomValue, setCustomRoomValue] = useState(isCustom ? activity.room : '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const formattedTime = formatTimeRange(startTime, endTime);
  const effectiveRoom = isCustomRoom ? customRoomValue.trim() : room;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!effectiveRoom) {
      setError('Please select or specify a room/venue');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await onSave(activity.id, {
        room: effectiveRoom,
        scheduledTime: formattedTime,
        eventDate: eventDate.trim()
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
            <p className="text-[11px] text-secondary">Updates venue and schedule live; status calculates automatically</p>
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

      {/* Top Row: Left is Date Picker (MUI), Right is Room/Venue Dropdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>Event Date</span>
          </label>
          <AdminDatePicker
            value={eventDate}
            onChange={setEventDate}
            label="Select Date"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>Assigned Room / Venue</span>
          </label>
          <select
            value={isCustomRoom ? 'CUSTOM_OTHER' : room}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'CUSTOM_OTHER') {
                setIsCustomRoom(true);
              } else {
                setIsCustomRoom(false);
                setRoom(val);
              }
            }}
            className="w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none cursor-pointer"
          >
            {VENUE_ROOM_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
            <option value="CUSTOM_OTHER">+ Other / Custom Room...</option>
          </select>

          {isCustomRoom && (
            <input
              type="text"
              required
              value={customRoomValue}
              onChange={(e) => setCustomRoomValue(e.target.value)}
              placeholder="Enter custom room / venue name..."
              className="mt-2 w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none animate-fadeIn"
              autoFocus
            />
          )}
        </div>
      </div>

      {/* Entire Bottom Half: Scheduled Time Selection with MUI TimePicker */}
      <div className="pt-1">
        <label className="block text-xs font-semibold text-on-surface mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-secondary" />
            <span>Scheduled Time (Start &amp; End)</span>
          </span>
          <span className="text-[10px] text-primary font-mono font-bold">
            {formattedTime}
          </span>
        </label>
        <AdminTimePicker
          startTime={startTime}
          endTime={endTime}
          onChangeStart={setStartTime}
          onChangeEnd={setEndTime}
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
  isCoordinator = false,
  role,
  roleData,
  user,
  profile,
  onBack,
  onOpenPass,
  onOpenLeaderboard,
  onUpdateActivity,
  onOpenBigScreen,
  onSignIn,
  showLeaderboard = true
}) {
  const [editing, setEditing] = useState(false);
  const [userRequests, setUserRequests] = useState({});
  const [requesting, setRequesting] = useState(false);

  // Subscribe to participant's pass requests
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToUserPassRequests(user.uid, (map) => {
      setUserRequests(map);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  if (!activity) return null;

  // Retrieve comprehensive guide data
  const guide = activity.guide || GAME_GUIDES[activity.id] || null;

  const request = userRequests[activity.id];
  // Coordinators have NO testing bypass modes: only genuinely approved passes are approved
  const isApproved = Boolean(request?.status === 'approved' || (isAdmin && !isCoordinator));
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

  const scheduleList = activity.scheduleTimeline || [];

  // Dynamic Real-Time Status & Countdown calculated based on time and date
  const statusInfo = useActivityStatus(activity);

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto w-full pb-10">
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

      {/* Inline Activity Editor for Admin */}
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

            {guide?.theme && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-surface-container-low border-surface-container text-secondary">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{guide.theme}</span>
              </span>
            )}

            {/* Dynamic Status Pill: Calculated based on time & date */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusInfo.isLive
                ? 'bg-tertiary-container border-tertiary/30 text-on-tertiary-container'
                : statusInfo.status === 'Completed'
                  ? 'bg-surface-container border-surface-container-high text-secondary'
                  : statusInfo.isCountdown
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 font-extrabold'
                    : 'bg-surface-container-low border-surface-container text-on-surface'
              }`}>
              {statusInfo.isLive && (
                <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container animate-pulse" />
              )}
              {statusInfo.isCountdown && (
                <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
              )}
              <span>{statusInfo.label}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-on-surface leading-tight">
            {activity.name}
          </h1>

          {/* Quick Info Badges */}
          <div className="space-y-2 pt-1 text-xs">
            {/* Date and Schedule */}
            <div className="flex flex-wrap items-center gap-2.5">
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

              <div className="flex items-center gap-1.5 font-medium text-secondary bg-surface-container-low px-3 py-1.5 rounded-xl border border-surface-container">
                <Clock className="w-4 h-4 text-secondary" />
                <span>Schedule: {activity.scheduledTime || 'Announced on Event Day'}</span>
              </div>
            </div>

            {/* Venue on Next Line */}
            <div className="flex items-center gap-1.5 font-bold text-on-surface bg-surface-container-low px-3 py-1.5 rounded-xl border border-surface-container w-fit">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Venue: {activity.room}</span>
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

      {/* Dedicated Leaderboard & Standings Banner */}
      {showLeaderboard && (
        <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-on-surface">Official Standings & Leaderboard</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  Live
                </span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                View the real-time winners podium, complete participant standings, and synced scores for <strong className="text-on-surface">{activity.name}</strong>.
              </p>
            </div>
          </div>

          {onOpenLeaderboard && (
            <button
              type="button"
              onClick={() => onOpenLeaderboard(activity.id)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-2xl text-xs transition-all active:scale-95 shadow-xs whitespace-nowrap self-start sm:self-auto shrink-0"
            >
              <span>View Leaderboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* =========================================================================
          COMPLETE EVENT GUIDE (Following Document Order)
          - Event Description
          - Objectives
          - Challenge Brief
          - Event Structure (Rounds / Stages / Rules)
          - Complete Event Schedule
          - Rules & Regulations
          - Expected Learning Outcomes
          - Event Summary
          - Bottom Row: Judging Criteria Card (Left) + Attendance Badge (Right)
         ========================================================================= */}

      {/* EVENT DESCRIPTION */}
      <section className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-7 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5 pb-3 border-b border-surface-container">
          <div className="w-8 h-8 rounded-xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
              Event Description
            </h2>
            <p className="text-xs text-secondary">Purpose and vision of this challenge</p>
          </div>
        </div>

        <p className="text-sm text-on-surface leading-relaxed pt-1">
          {guide?.description || activity.description}
        </p>
      </section>

      {/* OBJECTIVES */}
      {guide?.objectives && guide.objectives.length > 0 && (
        <section className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-7 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 pb-3 border-b border-surface-container">
            <div className="w-8 h-8 rounded-xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                Objectives
              </h2>
              <p className="text-xs text-secondary">Core goals and proficiencies targeted</p>
            </div>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {guide.objectives.map((obj, idx) => (
              <li
                key={idx}
                className="p-3 rounded-2xl bg-surface-container-low border border-surface-container flex items-start gap-2.5 text-xs text-on-surface leading-relaxed"
              >
                <div className="w-5 h-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CHALLENGE BRIEF */}
      {guide?.challengeBrief && (
        <section className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-surface-container">
            <div className="w-8 h-8 rounded-xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                Challenge Brief
              </h2>
              <p className="text-xs text-secondary">Operational expectations, focus areas & examples</p>
            </div>
          </div>

          {guide.challengeBrief.summary && (
            <p className="text-xs sm:text-sm text-on-surface leading-relaxed">
              {guide.challengeBrief.summary}
            </p>
          )}

          {/* Strict Rule Warning if present */}
          {guide.challengeBrief.strictRule && (
            <div className="p-3.5 rounded-2xl bg-error-container/20 border border-error/30 flex items-start gap-2.5 text-xs text-on-surface">
              <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <div>
                <strong className="text-error font-semibold">Strict Rule: </strong>
                <span>{guide.challengeBrief.strictRule}</span>
              </div>
            </div>
          )}

          {/* 3 Cardinal Rules for JAM */}
          {guide.challengeBrief.threeCardinalRules && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                The Three Cardinal JAM Rules
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {guide.challengeBrief.threeCardinalRules.map((cr, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container space-y-1">
                    <span className="font-extrabold text-xs text-on-surface flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>{cr.rule}</span>
                    </span>
                    <p className="text-[11px] text-secondary leading-relaxed">{cr.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Focus Areas if present */}
          {guide.challengeBrief.focusAreas && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                Primary Focus Areas
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {guide.challengeBrief.focusAreas.map((fa, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container text-xs text-on-surface flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>{fa}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Improvement Areas for UI/UX */}
          {guide.challengeBrief.keyImprovementAreas && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                Target Improvement Areas
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {guide.challengeBrief.keyImprovementAreas.map((area, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container text-xs text-on-surface flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>{area}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scenario Example for UI/UX */}
          {guide.challengeBrief.scenarioExample && (
            <div className="p-4 rounded-2xl bg-surface-container border border-surface-container-high space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                Challenge Scenario Context
              </span>
              <p className="text-xs text-on-surface leading-relaxed">
                {guide.challengeBrief.scenarioExample}
              </p>
            </div>
          )}

          {/* Reference Portals for UI/UX */}
          {guide.challengeBrief.exampleReferenceSites && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">
                Example Reference Portals
              </span>
              <div className="flex flex-wrap gap-2">
                {guide.challengeBrief.exampleReferenceSites.map((site, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl text-xs font-medium bg-surface-container-low border border-surface-container text-on-surface"
                  >
                    {site}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Example Mystery Products for Sell Me This Product */}
          {guide.challengeBrief.exampleProducts && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">
                Sample Everyday Mystery Products
              </span>
              <div className="flex flex-wrap gap-1.5">
                {guide.challengeBrief.exampleProducts.map((p, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-surface-container-low border border-surface-container text-on-surface"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Concept Example for Sell Me This Product */}
          {guide.challengeBrief.conceptExample && (
            <div className="p-4 rounded-2xl bg-surface-container border border-surface-container-high space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                Creative Concept Illustration
              </span>
              <p className="text-xs text-on-surface leading-relaxed">
                {guide.challengeBrief.conceptExample}
              </p>
            </div>
          )}

          {/* Sample Topics for JAM / Tech Quiz */}
          {(guide.challengeBrief.sampleTopics || guide.challengeBrief.topics) && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider block">
                Sample Topics & Discussion Prompts
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(guide.challengeBrief.sampleTopics || guide.challengeBrief.topics).map((topic, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container text-xs text-on-surface flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 shrink-0" />
                    <span>"{topic}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* EVENT STRUCTURE */}
      {guide?.eventStructure && guide.eventStructure.length > 0 && (
        <section className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-surface-container">
            <div className="w-8 h-8 rounded-xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                Event Structure
              </h2>
              <p className="text-xs text-secondary">Step-by-step round format and mechanics</p>
            </div>
          </div>

          <div className="space-y-4">
            {guide.eventStructure.map((rnd, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-surface-container-low border border-surface-container space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-container pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-primary text-on-primary">
                      {rnd.roundNumber}
                    </span>
                    <h3 className="text-sm font-bold text-on-surface">
                      {rnd.name}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-primary bg-surface-container px-2.5 py-1 rounded-lg border border-surface-container-high">
                    {rnd.duration}
                  </span>
                </div>

                {rnd.objective && (
                  <p className="text-xs text-secondary leading-relaxed">
                    <strong className="text-on-surface font-semibold">Objective: </strong>
                    {rnd.objective}
                  </p>
                )}

                {/* Procedure */}
                {rnd.procedure && rnd.procedure.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                      Round Procedure
                    </span>
                    <ul className="space-y-1 text-xs text-on-surface">
                      {rnd.procedure.map((step, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-2">
                          <span className="text-primary font-bold">{sIdx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Stages (for Prompt Decode) */}
                {rnd.stages && rnd.stages.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                      Stage Breakdown
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {rnd.stages.map((stg, stIdx) => (
                        <div key={stIdx} className="p-3 rounded-xl bg-surface-container border border-surface-container-high space-y-1">
                          <span className="text-xs font-bold text-on-surface block">
                            {stg.stageName}
                          </span>
                          <p className="text-xs text-secondary leading-relaxed">
                            {stg.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Round Rules */}
                {rnd.rules && rnd.rules.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-secondary block">
                      Round Guidelines
                    </span>
                    <ul className="space-y-1 text-xs text-secondary">
                      {rnd.rules.map((rule, rIdx) => (
                        <li key={rIdx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 shrink-0" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* COMPLETE EVENT SCHEDULE */}
      {scheduleList.length > 0 && (
        <section className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-container">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                  Complete Event Schedule
                </h2>
                <p className="text-xs text-secondary">Official stage-by-stage timetable</p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-primary bg-surface-container border border-surface-container-high px-3 py-1 rounded-xl self-start sm:self-auto">
              Total: {activity.totalDuration || guide?.totalDuration || '90 Minutes'}
            </span>
          </div>

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
                {scheduleList.map((item, idx) => (
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
                    {activity.totalDuration || guide?.totalDuration || '90 Minutes'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* RULES AND REGULATIONS */}
      {guide?.rulesAndRegulations && guide.rulesAndRegulations.length > 0 && (
        <section className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-surface-container">
            <div className="w-8 h-8 rounded-xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
              <SquareText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                Rules &amp; Regulations
              </h2>
              <p className="text-xs text-secondary">Mandatory guidelines and integrity standards</p>
            </div>
          </div>

          <ul className="space-y-2.5 text-xs text-on-surface leading-relaxed pt-1">
            {guide.rulesAndRegulations.map((rule, idx) => (
              <li key={idx} className="p-3 rounded-2xl bg-surface-container-low border border-surface-container flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-lg bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* EXPECTED LEARNING OUTCOMES */}
      {guide?.expectedLearningOutcomes && guide.expectedLearningOutcomes.length > 0 && (
        <section className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-surface-container">
            <div className="w-8 h-8 rounded-xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                Expected Learning Outcomes
              </h2>
              <p className="text-xs text-secondary">Key skills and intellectual takeaways</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {guide.expectedLearningOutcomes.map((outcome, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container flex items-start gap-2.5 text-xs text-on-surface leading-relaxed"
              >
                <div className="w-5 h-5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>{outcome}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* EVENT SUMMARY */}
      {guide?.eventSummary && (
        <section className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-7 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center gap-2.5 pb-3 border-b border-surface-container">
            <div className="w-8 h-8 rounded-xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
              <ScrollText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                Event Summary
              </h2>
              <p className="text-xs text-secondary">Official motto and key takeaway</p>
            </div>
          </div>
          <p className="text-sm sm:text-base font-semibold text-on-surface italic leading-relaxed pt-1">
            "{guide.eventSummary}"
          </p>
        </section>
      )}

      {/* =========================================================================
          BOTTOM ROW:
          Judging Criteria Card (Left) + Attendance Requirement Badge (Right)
          Kept together at the end in a single row as specifically requested.
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {/* Judging Criteria Card */}
        <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Scale className="w-4 h-4" />
              <span>Judging Criteria &amp; Scoring</span>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              Performance in <strong className="text-on-surface">{activity.name}</strong> is evaluated directly by judges in <strong className="text-on-surface">{activity.room}</strong> adhering to round guidelines, timing constraints, and quality benchmarks. Verified scores and podium rankings are synchronized to the live leaderboard.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-surface-container-low border border-surface-container text-[11px] text-secondary">
            Coordinator &amp; judge decisions are verified and final across all rounds.
          </div>
        </div>

        {/* Attendance Requirement Badge */}
        <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Attendance Requirement &amp; Certificate</span>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              Attendance in <strong className="text-on-surface">{activity.room}</strong> is verified through individual QR pass scanning at the door. You must be approved and scanned present by the room coordinator to receive the official digital certificate of participation.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-surface-container-low border border-surface-container text-[11px] text-secondary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Digital certificate issued upon confirmed presence &amp; round completion.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
