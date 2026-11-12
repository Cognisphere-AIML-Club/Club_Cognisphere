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
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-surface-container text-primary">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Campus Games Championship 2026</span>
            </div>

            {targetGame?.status === 'In Progress' && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-error-container text-on-error-container animate-pulse">
                <Radio className="w-3.5 h-3.5 text-error" />
                <span>Round in Progress</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-on-surface leading-tight">
              Club Games 2026
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed max-w-xl">
              5 single-player technical and non-technical activities across classrooms. Select any game below to view dedicated rules and request your participation pass.
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
      {announcements && announcements.length > 0 && (
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
                  setEditingAnnouncement(null);
                  setShowAnnouncementModal(true);
                }}
                className="px-2.5 py-1 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
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
                        setEditingAnnouncement(item);
                        setShowAnnouncementModal(true);
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
            ))}
          </div>
        </div>
      )}

      {/* Activities Grid */}
      <div className="space-y-4 pt-2">
        <div ref={competitionsHeadingRef} className="flex items-center justify-between scroll-mt-24">
          <div>
            <h2 className="text-lg font-bold text-on-surface tracking-tight">All 5 Competitions</h2>
            <p className="text-xs text-secondary">Select any game to read guidelines and request an attendance pass</p>
          </div>

          {isAdmin && (
            <span className="text-[11px] font-bold text-primary bg-surface-container border border-surface-container-high px-2.5 py-1 rounded-lg">
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
                className="bg-surface-container-lowest border border-surface-container hover:border-surface-container-high hover:bg-surface-container-low rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between transition-all group relative overflow-hidden"
              >
                <div className="space-y-3">
                  {/* Top badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      act.category === 'Technical'
                        ? 'bg-surface-container border-surface-container-high text-primary'
                        : 'bg-secondary-container/40 border-secondary/20 text-secondary'
                    }`}>
                      <Tag className="w-3 h-3" />
                      <span>{act.category}</span>
                    </span>

                    {/* Pass Status or Event Status */}
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
                          : act.status === 'Completed'
                          ? 'bg-surface-container text-secondary'
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
                  <h3 
                    onClick={() => onSelectGame(act)}
                    className="text-base sm:text-lg font-bold text-on-surface group-hover:text-primary transition-colors cursor-pointer"
                  >
                    {act.name}
                  </h3>

                  {/* Location and Schedule */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-secondary">
                    <div className="flex items-center gap-1.5 font-bold text-on-surface">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>{act.room}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-secondary">
                      <Clock className="w-3.5 h-3.5 text-secondary" />
                      <span>{act.scheduledTime || 'TBD'}</span>
                    </div>
                  </div>

                  {/* Description snippet */}
                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                    {act.description}
                  </p>
                </div>

                {/* Bottom Actions: View Details & Edit */}
                <div className="pt-4 mt-4 border-t border-surface-container flex items-center justify-between">
                  <button
                    onClick={() => onSelectGame(act)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-container transition-colors"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-3.5 h-3.5 text-primary" />
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => setEditingActivity(act)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-surface-container hover:bg-surface-container-high text-primary transition-all"
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

      {/* Guidelines Summary Banner */}
      <div className="bg-surface-container-low border border-surface-container rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-on-surface-variant shadow-xs">
        <div className="space-y-1.5">
          <div className="w-8 h-8 rounded-xl bg-surface-container text-primary flex items-center justify-center mb-2">
            <QrCode className="w-4 h-4 text-primary" />
          </div>
          <h4 className="font-bold text-on-surface text-sm">Room QR Check-in</h4>
          <p className="leading-relaxed">
            Attendance is recorded separately per room. Present your approved pass when you enter.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="w-8 h-8 rounded-xl bg-surface-container text-secondary flex items-center justify-center mb-2">
            <Timer className="w-4 h-4 text-secondary" />
          </div>
          <h4 className="font-bold text-on-surface text-sm">Synced Timers</h4>
          <p className="leading-relaxed">
            Every room uses a synchronized digital timer to maintain equal fairness.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="w-8 h-8 rounded-xl bg-surface-container text-primary flex items-center justify-center mb-2">
            <Award className="w-4 h-4 text-primary" />
          </div>
          <h4 className="font-bold text-on-surface text-sm">Instant Certificates</h4>
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
