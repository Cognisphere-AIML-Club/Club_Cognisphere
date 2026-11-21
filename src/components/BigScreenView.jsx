import React, { useState, useEffect, useRef } from 'react';
import NumberFlow, { NumberFlowGroup } from '@number-flow/react';
import { useSharedTimer } from '../hooks/useSharedTimer';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { subscribeAllScores } from '../services/scoreService';
import { subscribeToPassConfig } from '../services/passApprovalService';
import { VolumeIcon } from './AnimatedIcons';
import { 
  Maximize, 
  Minimize, 
  Tv, 
  Timer, 
  Megaphone, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  ChevronRight, 
  ChevronLeft, 
  Pause, 
  Play, 
  ArrowLeft,
  CheckCircle2,
  Layers,
  MapPin,
  AlertTriangle,
  Info,
  Trophy,
  Medal
} from 'lucide-react';

/**
 * Single Room Card for Multi-Room Grid in Hall Mode (Crisp Projector Light Theme)
 */
function MultiRoomTimerCard({ activity, onClickRoom }) {
  const { minutes, seconds, status, isLast10Sec, isZero } = useSharedTimer(
    activity.id, 
    activity.defaultDuration || 60
  );

  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isRunning = status === 'running';

  return (
    <div 
      onClick={() => onClickRoom(activity.id)}
      className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-300 relative overflow-hidden group hover:scale-[1.02] shadow-sm ${
        isZero && status === 'finished'
          ? 'bg-rose-50 border-rose-500 shadow-md shadow-rose-100'
          : isLast10Sec
          ? 'bg-amber-50 border-amber-500 shadow-md shadow-amber-100 animate-pulse'
          : isRunning
          ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
          : 'bg-white border-slate-200 hover:border-slate-400'
      }`}
    >
      <div className={`absolute top-0 inset-x-0 h-1.5 transition-colors ${
        isZero ? 'bg-rose-500' : isLast10Sec ? 'bg-amber-500' : isRunning ? 'bg-emerald-500' : 'bg-slate-300'
      }`} />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-800 font-extrabold">{activity.room}</span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-slate-600">{activity.category}</span>
          </span>
          <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors mt-0.5 line-clamp-1 font-arkhip">
            {activity.name}
          </h4>
        </div>

        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${
          isZero
            ? 'bg-rose-100 text-rose-800 border-rose-300'
            : isLast10Sec
            ? 'bg-amber-100 text-amber-900 border-amber-300'
            : isRunning
            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse'
            : status === 'paused'
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-slate-100 text-slate-700 border-slate-200'
        }`}>
          {isZero ? "Time's Up" : status}
        </span>
      </div>

      <div className="flex items-baseline justify-between mt-2 pt-3 border-t border-slate-100">
        <NumberFlowGroup>
          <div className={`font-mono text-3xl sm:text-4xl font-black tracking-tight tabular-nums flex items-center ${
            isZero ? 'text-rose-600' : isLast10Sec ? 'text-amber-600' : isRunning ? 'text-slate-950' : 'text-slate-400'
          }`}>
            <NumberFlow value={minutes} format={{ minimumIntegerDigits: 2 }} />
            <span className="px-0.5">:</span>
            <NumberFlow value={seconds} format={{ minimumIntegerDigits: 2 }} />
          </div>
        </NumberFlowGroup>

        <span className="text-xs text-slate-500 group-hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors">
          <span>Projector</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}

/**
 * Room Projector Mode: Giant Screen Timer with Event Schedule at the Bottom
 */
function BigScreenRoomMode({ activity, onSoundToggle, soundEnabled }) {
  const {
    remainingMs,
    minutes,
    seconds,
    status,
    durationSeconds,
    stageName,
    isLast10Sec,
    isZero
  } = useSharedTimer(activity.id, activity.defaultDuration || 60);

  const isRunning = status === 'running';

  // Determine current active part of the game to display inside the bubble
  const activeStageTitle = (stageName && stageName.trim())
    || activity?.scheduleTimeline?.find(s => s.durationSeconds === durationSeconds)?.stage
    || (activity?.name ? `${activity.name} • Active Round` : 'Round in Progress');

  return (
    <div className="flex-1 flex flex-col justify-between items-center text-center p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none bg-slate-50">
      {/* Dynamic Background Glow Effect (Soft and bright for projector clarity) */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
        isZero
          ? 'bg-gradient-to-b from-rose-100/60 via-transparent to-rose-50 opacity-100'
          : isLast10Sec
          ? 'bg-gradient-to-b from-amber-100/60 via-transparent to-amber-50 opacity-100'
          : isRunning
          ? 'bg-gradient-to-b from-blue-100/40 via-transparent to-slate-50 opacity-100'
          : 'opacity-0'
      }`} />

      {/* Top Header Information: Compact & Elevated */}
      <div className="z-10 w-full max-w-5xl mx-auto flex flex-col items-center gap-1.5 pt-0 sm:pt-1">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-50 text-emerald-800 border-2 border-emerald-400 flex items-center gap-1.5 shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>{activity.room}</span>
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-white text-slate-800 border border-slate-300 shadow-sm">
            {activity.category}
          </span>
          {activity.totalDuration && (
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold text-slate-600 bg-white border border-slate-300 shadow-sm">
              {activity.totalDuration}
            </span>
          )}
        </div>

        {/* Heading in Skate Blade Font */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-950 mt-1 drop-shadow-sm font-skate-blade">
          {activity.name}
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto font-medium">
          {activity.description}
        </p>
      </div>

      {/* Giant Monospace Digital Timer (Screen-Dominant Projector Scale) */}
      <div className="z-10 my-auto py-2 sm:py-6 flex flex-col items-center justify-center">
        {/* Status Pill: Displays the specific active part of the game */}
        <div className="mb-2 sm:mb-4">
          <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider shadow-sm transition-all ${
            isZero
              ? 'bg-rose-100 text-rose-800 border-2 border-rose-400 animate-bounce'
              : isLast10Sec
              ? 'bg-amber-100 text-amber-900 border-2 border-amber-400 animate-pulse'
              : isRunning
              ? 'bg-emerald-100 text-emerald-900 border-2 border-emerald-400'
              : status === 'paused'
              ? 'bg-amber-50 text-amber-800 border-2 border-amber-300'
              : 'bg-white text-slate-700 border-2 border-slate-300'
          }`}>
            {isRunning && <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />}
            {isLast10Sec && <AlertTriangle className="w-4 h-4 text-amber-600" />}
            <span>
              {isZero ? `🚨 TIME'S UP • ${activeStageTitle.toUpperCase()}` : 
               isLast10Sec ? `⚠️ FINAL 10 SECONDS • ${activeStageTitle.toUpperCase()}` : 
               isRunning ? activeStageTitle.toUpperCase() : 
               status === 'paused' ? `PAUSED • ${activeStageTitle.toUpperCase()}` : 
               `READY • ${activeStageTitle.toUpperCase()}`}
            </span>
          </span>
        </div>

        {/* Animated NumberFlow Digits (Screen-Dominant Projector Scale) */}
        <NumberFlowGroup>
          <div 
            className={`font-mono font-black tabular-nums tracking-tighter leading-none transition-colors duration-300 drop-shadow-md select-none flex items-center justify-center ${
              isZero
                ? 'text-rose-600 animate-bounce'
                : isLast10Sec
                ? 'text-amber-600 animate-pulse'
                : isRunning
                ? 'text-slate-950'
                : status === 'paused'
                ? 'text-amber-700'
                : 'text-slate-400'
            }`}
            style={{ fontSize: 'clamp(7rem, 24vw, 26rem)', lineHeight: 0.88 }}
          >
            <NumberFlow value={minutes} format={{ minimumIntegerDigits: 2 }} />
            <span className="mx-1 select-none">:</span>
            <NumberFlow value={seconds} format={{ minimumIntegerDigits: 2 }} />
          </div>
        </NumberFlowGroup>
      </div>
    </div>
  );
}

/**
 * Hall / Stage Carousel Mode (Crisp Projector Light Theme)
 */
function BigScreenHallMode({ activities, onSelectRoom, showLeaderboard = true }) {
  const { announcements } = useAnnouncements();
  const [allScores, setAllScores] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0); // 0: Live Timers, 1: Announcements, 2: Leaderboard
  const [isAutoPlaying, setIsAutoPlaying] = useState(false); // Off by default
  const [slideProgress, setSlideProgress] = useState(0);

  const TOTAL_SLIDES = showLeaderboard ? 3 : 2;
  const SLIDE_DURATION_MS = 12000; // 12 seconds per slide

  // If leaderboard is toggled off while currently viewing slide 2, return immediately to slide 0
  useEffect(() => {
    if (!showLeaderboard && activeSlide >= 2) {
      setActiveSlide(0);
      setSlideProgress(0);
    }
  }, [showLeaderboard, activeSlide]);

  // Subscribe to real-time scores across all activities
  useEffect(() => {
    const unsub = subscribeAllScores((scores) => {
      setAllScores(scores);
    });
    return () => unsub();
  }, []);

  // Auto-slide effect with progress tracking
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = 100; // 100ms ticks
    const step = (interval / SLIDE_DURATION_MS) * 100;

    const timer = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev >= 100) {
          setActiveSlide((curr) => (curr + 1) % TOTAL_SLIDES);
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const handleNextSlide = () => {
    setActiveSlide((curr) => (curr + 1) % TOTAL_SLIDES);
    setSlideProgress(0);
  };

  const handlePrevSlide = () => {
    setActiveSlide((curr) => (curr - 1 + TOTAL_SLIDES) % TOTAL_SLIDES);
    setSlideProgress(0);
  };

  return (
    <div className="flex-1 flex flex-col justify-between pt-3 px-6 pb-6 sm:pt-4 sm:px-10 sm:pb-8 select-none relative overflow-hidden bg-slate-50">
      {/* Slide Content Area: Elevated towards top for optimal vertical balance */}
      <div className="flex-1 flex flex-col justify-start pt-2 sm:pt-4 max-w-6xl w-full mx-auto">
        {/* SLIDE 0: Live Timers Matrix */}
        {activeSlide === 0 && (
          <div className="space-y-6">
            <div className="text-center space-y-1.5">
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight font-skate-blade">
                All 5 Competition Timers
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Synchronized real-time countdowns across all event rooms
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activities.map((act) => (
                <MultiRoomTimerCard 
                  key={act.id} 
                  activity={act} 
                  onClickRoom={onSelectRoom} 
                />
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 1: Announcements Board */}
        {activeSlide === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-1.5">
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight font-skate-blade">
                Event Announcements
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Important organizer notices and real-time updates
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
              {announcements.map((item) => (
                <div 
                  key={item.id} 
                  className={`rounded-2xl p-6 border-2 transition-all shadow-sm ${
                    item.pinned
                      ? 'bg-amber-50/90 border-amber-400 shadow-md shadow-amber-100'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                      {item.pinned && <span>📌 PINNED &bull;</span>}
                      <span>{item.type?.toUpperCase() || 'INFO'}</span>
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-slate-400">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-950 mb-1.5 font-arkhip">
                    {item.title}
                  </h3>

                  <p className="text-sm text-slate-700 leading-relaxed font-normal">
                    {item.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 2: Live Leaderboard & Winners (Rendered only when showLeaderboard is true) */}
        {showLeaderboard && activeSlide === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-1.5">
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight font-skate-blade">
                Competition Leaderboard
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Official winners and podium placements across all games
              </p>
            </div>

            {allScores.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto w-full">
                {activities.map((act) => {
                  const actScores = allScores.filter(s => s.activityId === act.id);
                  const first = actScores.find(s => s.rank === 1);
                  const second = actScores.find(s => s.rank === 2);
                  const third = actScores.find(s => s.rank === 3);

                  return (
                    <div 
                      key={act.id} 
                      className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-3 shadow-md"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-extrabold uppercase text-emerald-700">{act.room}</span>
                        <h4 className="text-sm font-black text-slate-950 truncate max-w-[170px] font-arkhip">{act.name}</h4>
                      </div>

                      {actScores.length > 0 ? (
                        <div className="space-y-2 text-xs">
                          {first && (
                            <div className="flex items-center justify-between bg-amber-50 border-2 border-amber-300 p-2.5 rounded-xl shadow-xs">
                              <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                                <span>🥇 1st:</span>
                                <span className="text-slate-900 truncate max-w-[120px]">{first.participantName}</span>
                              </span>
                              {first.score && <span className="font-mono text-[11px] text-amber-800 font-extrabold">{first.score}</span>}
                            </div>
                          )}
                          {second && (
                            <div className="flex items-center justify-between bg-slate-100 border border-slate-300 p-2 rounded-xl">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span>🥈 2nd:</span>
                                <span className="text-slate-900 truncate max-w-[120px]">{second.participantName}</span>
                              </span>
                              {second.score && <span className="font-mono text-[11px] text-slate-600 font-bold">{second.score}</span>}
                            </div>
                          )}
                          {third && (
                            <div className="flex items-center justify-between bg-amber-50/50 border border-amber-200 p-2 rounded-xl">
                              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                                <span>🥉 3rd:</span>
                                <span className="text-slate-850 truncate max-w-[120px]">{third.participantName}</span>
                              </span>
                              {third.score && <span className="font-mono text-[11px] text-slate-600">{third.score}</span>}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs font-medium text-slate-400">
                          Evaluations in progress
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border-2 border-slate-200 rounded-3xl p-10 text-center max-w-lg mx-auto space-y-2 shadow-md">
                <Trophy className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">Evaluations Underway</h3>
                <p className="text-xs text-slate-600">
                  Judges are scoring classroom performances. Final rankings and podium winners will appear here automatically.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Carousel Controls & Slide Dots (Light Theme) */}
      <div className="w-full max-w-xl mx-auto pt-6 flex flex-col items-center gap-3">
        {/* Progress Bar for Current Slide */}
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-600 transition-all duration-100 ease-linear rounded-full"
            style={{ width: `${slideProgress}%` }}
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevSlide}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm transition-colors"
            title="Previous Slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Auto Play / Pause Toggle (Icon only) */}
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`p-1.5 rounded-lg border transition-all ${
              isAutoPlaying
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title={isAutoPlaying ? "Pause Auto Carousel" : "Start Auto Carousel"}
          >
            {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Slide Indicator Dots (Dynamically matches active slides) */}
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveSlide(idx);
                  setSlideProgress(0);
                }}
                className={`h-2 rounded-full transition-all ${
                  activeSlide === idx
                    ? 'w-6 bg-emerald-600'
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                title={`Slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handleNextSlide}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm transition-colors"
            title="Next Slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Staff-Only Presentation Engine (Forces Light Mode for High Projector Contrast)
 */
export default function BigScreenView({ 
  activities = [], 
  onExit, 
  initialMode = 'hall', 
  initialActivityId = null,
  showLeaderboard: propShowLeaderboard,
  isAdmin = false,
  assignedActivityId = null
}) {
  const isLockedToAssigned = !isAdmin && Boolean(assignedActivityId);

  const [remoteShowLeaderboard, setRemoteShowLeaderboard] = useState(() => {
    if (typeof propShowLeaderboard === 'boolean') return propShowLeaderboard;
    try {
      const cached = localStorage.getItem('cognisphere_pass_config');
      return cached ? JSON.parse(cached).showLeaderboard ?? true : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const unsub = subscribeToPassConfig((cfg) => {
      if (cfg && typeof cfg.showLeaderboard === 'boolean') {
        setRemoteShowLeaderboard(cfg.showLeaderboard);
      }
    });
    return () => unsub();
  }, []);

  const showLeaderboard = typeof propShowLeaderboard === 'boolean' ? propShowLeaderboard : remoteShowLeaderboard;
  const [displayMode, setDisplayMode] = useState(() => {
    if (isLockedToAssigned) return 'room';
    return initialMode;
  }); // 'room' | 'hall'
  const [selectedActivityId, setSelectedActivityId] = useState(() => {
    if (isLockedToAssigned && assignedActivityId) return assignedActivityId;
    return initialActivityId || activities[0]?.id || 'reverse-prompt';
  });

  useEffect(() => {
    if (isLockedToAssigned && assignedActivityId) {
      setSelectedActivityId(assignedActivityId);
    }
  }, [isLockedToAssigned, assignedActivityId]);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const controlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const wakeLockRef = useRef(null);

  // 1. Screen Wake Lock API to prevent display sleep on projectors
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
          wakeLockRef.current.addEventListener('release', () => {
            setWakeLockActive(false);
          });
        } catch (err) {
          console.warn('Wake Lock request error:', err.message);
          setWakeLockActive(false);
        }
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // 2. Fullscreen Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 3. Auto-hiding control bar: Immediately visible when pointer is in control area, immediately hidden when pointer leaves
  useEffect(() => {
    const getControlsBottom = () => {
      if (controlsRef.current) {
        const rect = controlsRef.current.getBoundingClientRect();
        return rect.bottom;
      }
      return 75;
    };

    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
      controlsTimeoutRef.current = null;
    }, 2500);

    const handlePointerMove = (e) => {
      const clientY = e.clientY ?? (e.touches ? e.touches[0]?.clientY : null);
      if (clientY === null || clientY === undefined) return;

      const controlsBottom = getControlsBottom();

      if (clientY <= controlsBottom) {
        setControlsVisible(true);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
          controlsTimeoutRef.current = null;
        }
      } else {
        setControlsVisible(false);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
          controlsTimeoutRef.current = null;
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const handleControlsMouseEnter = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  };

  const handleControlsMouseLeave = () => {
    setControlsVisible(false);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Failed to toggle fullscreen:', err.message);
    }
  };

  const currentActivity = activities.find(a => a.id === selectedActivityId) || activities[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 text-slate-900 flex flex-col font-sans select-none overflow-hidden">
      {/* Reserved Space for Top Controls: Never overlaps with content underneath */}
      <header 
        ref={controlsRef}
        onMouseEnter={handleControlsMouseEnter}
        onMouseLeave={handleControlsMouseLeave}
        className="w-full shrink-0 z-50 px-4 pt-3 pb-2 min-h-[68px] sm:min-h-[76px] flex items-center justify-center relative transition-colors"
      >
        <div 
          className={`w-full max-w-6xl mx-auto flex items-center justify-between gap-3 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl px-4 py-2.5 shadow-xl shadow-slate-200/50 transition-all duration-300 ${
            controlsVisible 
              ? 'opacity-100 translate-y-0 pointer-events-auto scale-100' 
              : 'opacity-0 -translate-y-2 pointer-events-none scale-98'
          }`}
        >
          {/* Left: Back Button & Mode Switcher (Anchored in place to prevent movement) */}
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit Projector</span>
            </button>

            {/* Mode Switcher Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setDisplayMode('hall')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  displayMode === 'hall'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Carousel</span>
              </button>

              <button
                onClick={() => setDisplayMode('room')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  displayMode === 'room'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Projector</span>
              </button>
            </div>
          </div>

          {/* Right Controls: Room Selector (if in Room Mode), Sound & Fullscreen */}
          <div className="flex items-center gap-2">
            {displayMode === 'room' && (
              isLockedToAssigned ? (
                <div className="bg-slate-100 text-slate-900 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold shadow-xs flex items-center gap-1.5">
                  <span className="text-emerald-700 font-extrabold">{currentActivity.room}</span>
                  <span>&bull;</span>
                  <span className="truncate max-w-[140px]">{currentActivity.name}</span>
                </div>
              ) : (
                <select
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                  className="bg-slate-100 text-slate-900 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-emerald-600 cursor-pointer shadow-xs"
                >
                  {activities.map((act) => (
                    <option key={act.id} value={act.id}>
                      {act.room} &bull; {act.name}
                    </option>
                  ))}
                </select>
              )
            )}

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Sound Alerts' : 'Enable Sound Alerts'}
              className={`p-2 rounded-xl border transition-colors ${
                soundEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors shadow-xs"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile View Disallowed Gate: Projector page removed from mobile view */}
      <div className="md:hidden flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-50 select-none">
        <div className="w-14 h-14 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center">
          <Tv className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-900">Projector View (Desktop Only)</h3>
          <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
            The Projector Big Screen is designed for classroom wall projectors and desktop monitors. Please use a laptop or desktop computer to launch this view.
          </p>
        </div>
        <button
          onClick={onExit}
          className="py-2.5 px-5 bg-slate-900 text-white font-bold rounded-xl text-xs shadow-xs active:scale-95"
        >
          Back to App
        </button>
      </div>

      {/* Main View Display Area: Desktop & Large Displays */}
      <main className="hidden md:flex flex-1 flex-col overflow-hidden relative">
        {displayMode === 'room' ? (
          <BigScreenRoomMode 
            activity={currentActivity} 
            soundEnabled={soundEnabled}
            onSoundToggle={() => setSoundEnabled(!soundEnabled)}
          />
        ) : (
          <BigScreenHallMode 
            activities={activities}
            showLeaderboard={showLeaderboard}
            onSelectRoom={(actId) => {
              const target = isLockedToAssigned ? assignedActivityId : actId;
              setSelectedActivityId(target);
              setDisplayMode('room');
            }}
          />
        )}
      </main>
    </div>
  );
}
