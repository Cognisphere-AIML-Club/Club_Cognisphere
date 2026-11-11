import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  MapPin, 
  Clock, 
  Tag, 
  Edit3, 
  QrCode, 
  ShieldCheck, 
  Timer, 
  Award, 
  ChevronRight, 
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
  LogIn
} from 'lucide-react';
import AdminEditActivityModal from './AdminEditActivityModal';
import AdminAnnouncementModal from './AdminAnnouncementModal';
import { subscribeToUserPassRequests } from '../services/passApprovalService';
import { useAnnouncements } from '../hooks/useAnnouncements';

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
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [userRequests, setUserRequests] = useState({});
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const { announcements, postAnnouncement, editAnnouncement, removeAnnouncement, togglePinAnnouncement } = useAnnouncements();
  const competitionsHeadingRef = useRef(null);
  const longPressTimerRef = useRef(null);

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

  // Priority Logic for Current Game:
  // 1. Student has an approved game currently 'In Progress'
  const approvedInProgress = activities.find(
    a => userRequests[a.id]?.status === 'approved' && a.status === 'In Progress'
  );

  // 2. Student has an approved game that is 'Upcoming'
  const approvedUpcoming = activities.find(
    a => userRequests[a.id]?.status === 'approved' && a.status !== 'Completed'
  );

  // 3. General game currently 'In Progress' across campus
  const generalLive = activities.find(a => a.status === 'In Progress');

  // 4. Next upcoming game on schedule
  const generalUpcoming = activities.find(a => a.status !== 'Completed');

  // Determine active target and state
  let targetGame = null;
  let targetMode = 'unregistered'; // 'approved_live' | 'approved_upcoming' | 'unapproved_live' | 'unregistered'

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
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-5 relative z-10">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Campus Games Championship 2026</span>
            </div>

            {targetGame?.status === 'In Progress' && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300 animate-pulse">
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                <span>Round in Progress</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Club Games 2026
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
              5 single-player technical and non-technical activities across classrooms. Select any game below to view dedicated rules and request your participation pass.
            </p>
          </div>

          {/* New User Callout: Quick Registration / Sign Up Button */}
          {!user && (
            <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-blue-950/60 border border-cyan-500/30 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span>New Participant?</span>
                    </span>
                    <span className="text-xs text-slate-400">&bull; 1-Tap Google Sign-In</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Sign Up to Join & Get Your Event Pass
                  </h3>
                  <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
                    Sign up with your college Google account to claim your unique attendance QR pass, enter classrooms, and view live timers and leaderboards.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={onSignIn}
                    className="py-3 px-5 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
                  >
                    <LogIn className="w-4 h-4 text-slate-950" />
                    <span>Sign Up / Register</span>
                  </button>

                  <button
                    onClick={scrollToCompetitions}
                    className="py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-xl text-xs transition-all flex items-center gap-1"
                    title="Browse Competitions"
                  >
                    <span>Browse</span>
                    <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Personalized "Where You Should Be Right Now" Spotlight Card */}
          {user && (
            (targetMode === 'approved_live' || targetMode === 'approved_upcoming') ? (
              /* State 1: Participant has an Approved Game */
              <div className="bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Where You Should Be Right Now
                  </span>

                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                    targetGame.status === 'In Progress' 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {targetGame.status === 'In Progress' ? 'LIVE NOW' : (targetGame.scheduledTime || 'Approved • Upcoming')}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <span>{targetGame.name}</span>
                      <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Pass Approved</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-bold text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        {targetGame.room}
                      </span>
                      <span>&bull;</span>
                      <span>{targetGame.category} Competition</span>
                    </div>
                  </div>

                  {/* 1-tap Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewPass(targetGame.id)}
                      className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Open {targetGame.room} Pass</span>
                    </button>

                    <button
                      onClick={() => onSelectGame(targetGame)}
                      className="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white font-medium rounded-xl text-xs transition-all flex items-center gap-1"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            ) : targetMode === 'unapproved_live' ? (
              /* State 2: Campus round is Live, but participant is not yet approved */
              <div className="bg-slate-950/90 border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    Currently Live on Campus
                  </span>

                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    LIVE NOW
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-base sm:text-lg font-bold text-white">
                      {targetGame.name} in {targetGame.room}
                    </div>
                    <p className="text-xs text-amber-200/80">
                      You need an approved pass to enter this room.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectGame(targetGame)}
                      className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                    >
                      <span>Request Pass to Join</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* State 3: No approved pass -> Prompt to browse and register */
              <div className="bg-slate-950/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>Get Started: Choose Your Competitions</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm sm:text-base font-bold text-white">
                      You are not registered for any games yet
                    </div>
                    <p className="text-xs text-slate-400">
                      Explore the 5 activities below and request your participation pass for approval.
                    </p>
                  </div>

                  <button
                    onClick={scrollToCompetitions}
                    className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
                  >
                    <span>Browse Competitions</span>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Live Event Announcements Feed */}
      {announcements && announcements.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Megaphone className="w-4 h-4 text-amber-400" />
              <span>Live Event Announcements</span>
              {isAdmin && (
                <span className="hidden sm:inline-block text-[10px] text-slate-400 font-normal lowercase">
                  (right-click or hold to pin)
                </span>
              )}
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  setEditingAnnouncement(null);
                  setShowAnnouncementModal(true);
                }}
                className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Announcement</span>
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {announcements.map((item) => (
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
                    ? 'bg-amber-950/20 border-amber-500/30 text-slate-200' 
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                } ${isAdmin ? 'cursor-pointer select-none' : ''}`}
                title={isAdmin ? 'Right-click on desktop or press & hold on mobile to pin/unpin' : undefined}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {item.title}
                    </span>
                    {item.pinned && (
                      <span className="text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5" />
                        <span>Pinned</span>
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
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
                          ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10' 
                          : 'text-slate-500 hover:text-amber-300 hover:bg-slate-800'
                      }`}
                      title={item.pinned ? 'Unpin Announcement (Right-click or hold)' : 'Pin Announcement (Right-click or hold)'}
                      aria-label={item.pinned ? 'Unpin announcement' : 'Pin announcement'}
                    >
                      {item.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAnnouncement(item);
                        setShowAnnouncementModal(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
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
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Delete Announcement"
                      aria-label="Delete announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activities Grid (Section Target for Scroll) */}
      <div className="space-y-4 pt-2">
        <div ref={competitionsHeadingRef} className="flex items-center justify-between scroll-mt-24">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">All 5 Competitions</h2>
            <p className="text-xs text-slate-400">Select any game to read guidelines and request an attendance pass</p>
          </div>

          {isAdmin && (
            <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
              Admin Mode: Editable
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activities.map((act) => {
            const req = userRequests[act.id];
            const isApproved = req?.status === 'approved';
            const isPending = req?.status === 'pending';

            return (
              <div
                key={act.id}
                className="bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between transition-all group relative overflow-hidden"
              >
                <div className="space-y-3">
                  {/* Top badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      act.category === 'Technical'
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                    }`}>
                      <Tag className="w-3 h-3" />
                      <span>{act.category}</span>
                    </span>

                    {/* Pass Status or Event Status */}
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Pass Approved</span>
                      </span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                        <Clock className="w-3 h-3" />
                        <span>Pending</span>
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        act.status === 'In Progress'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : act.status === 'Completed'
                          ? 'bg-slate-800 border-slate-700 text-slate-400'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                      }`}>
                        {act.status === 'In Progress' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                        <span>{act.status || 'Upcoming'}</span>
                      </span>
                    )}
                  </div>

                  {/* Activity Name */}
                  <h3 
                    onClick={() => onSelectGame(act)}
                    className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    {act.name}
                  </h3>

                  {/* Location and Schedule */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 font-bold text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{act.room}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{act.scheduledTime || 'TBD'}</span>
                    </div>
                  </div>

                  {/* Description snippet */}
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {act.description}
                  </p>
                </div>

                {/* Bottom Actions: View Details & Edit */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => onSelectGame(act)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => setEditingActivity(act)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-750 border border-slate-700 text-amber-300 transition-all"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guidelines Summary Banner */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-400">
        <div className="space-y-1.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
            <QrCode className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-white text-sm">Room QR Check-in</h4>
          <p className="leading-relaxed">
            Attendance is recorded separately per room. Present your approved pass when you enter.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
            <Timer className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-white text-sm">Synced Timers</h4>
          <p className="leading-relaxed">
            Every room uses a synchronized digital timer to maintain equal fairness.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-2">
            <Award className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-white text-sm">Instant Certificates</h4>
          <p className="leading-relaxed">
            Certificates will be available for download once the admin releases them.
          </p>
        </div>
      </div>

      {/* Admin Edit Modal */}
      {editingActivity && (
        <AdminEditActivityModal
          isOpen={Boolean(editingActivity)}
          activity={editingActivity}
          onClose={() => setEditingActivity(null)}
          onSave={onUpdateActivity}
        />
      )}

      {/* Admin Announcement Modal */}
      {showAnnouncementModal && (
        <AdminAnnouncementModal
          isOpen={showAnnouncementModal}
          initialAnnouncement={editingAnnouncement}
          onClose={() => {
            setShowAnnouncementModal(false);
            setEditingAnnouncement(null);
          }}
          onPost={postAnnouncement}
          onUpdate={editAnnouncement}
          authorEmail={user?.email}
        />
      )}
    </div>
  );
}
