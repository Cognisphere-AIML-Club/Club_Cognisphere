import React, { useState, useEffect, useRef } from 'react';
import { useSharedTimer } from '../hooks/useSharedTimer';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { subscribeAllScores } from '../services/scoreService';
import { 
  Maximize, 
  Minimize, 
  Tv, 
  Timer, 
  Megaphone, 
  CalendarDays, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  ChevronRight, 
  ChevronLeft, 
  Pause, 
  Play, 
  ArrowLeft,
  SunMedium,
  CheckCircle2,
  Clock,
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
          <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors mt-0.5 line-clamp-1">
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
        <div className={`font-mono text-3xl sm:text-4xl font-black tracking-tight tabular-nums ${
          isZero ? 'text-rose-600' : isLast10Sec ? 'text-amber-600' : isRunning ? 'text-slate-950' : 'text-slate-400'
        }`}>
          {formattedTime}
        </div>

        <span className="text-xs text-slate-500 group-hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors">
          <span>Projector Mode</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}

/**
 * Room Projector Mode: Giant Screen Timer (Bright High-Contrast Projector Light Theme)
 */
function BigScreenRoomMode({ activity, onSoundToggle, soundEnabled }) {
  const {
    minutes,
    seconds,
    status,
    durationSeconds,
    isLast10Sec,
    isZero
  } = useSharedTimer(activity.id, activity.defaultDuration || 60);

  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');
  const isRunning = status === 'running';

  // Active stage matching for Reverse Prompt 120-min schedule
  const activeTimeline = activity.scheduleTimeline || null;

  return (
    <div className="flex-1 flex flex-col justify-between items-center text-center p-6 sm:p-10 relative overflow-hidden select-none bg-slate-50">
      {/* Dynamic Background Glow Effect (Soft and bright for projector clarity) */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
        isZero
          ? 'bg-gradient-to-b from-rose-100/60 via-transparent to-rose-50 opacity-100'
          : isLast10Sec
          ? 'bg-gradient-to-b from-amber-100/60 via-transparent to-amber-50 opacity-100'
          : isRunning
          ? 'bg-gradient-to-b from-emerald-100/40 via-transparent to-slate-50 opacity-100'
          : 'opacity-0'
      }`} />

      {/* Top Header Information */}
      <div className="z-10 w-full max-w-5xl mx-auto flex flex-col items-center gap-2 pt-2 sm:pt-4">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <span className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest bg-emerald-50 text-emerald-800 border-2 border-emerald-400 flex items-center gap-1.5 shadow-sm">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>{activity.room}</span>
          </span>
          <span className="px-3.5 py-1 rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest bg-white text-slate-800 border border-slate-300 shadow-sm">
            {activity.category}
          </span>
          {activity.totalDuration && (
            <span className="px-3.5 py-1 rounded-full text-xs sm:text-sm font-mono font-bold text-slate-600 bg-white border border-slate-300 shadow-sm">
              {activity.totalDuration}
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-950 mt-1 drop-shadow-sm">
          {activity.name}
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-medium">
          {activity.description}
        </p>
      </div>

      {/* Giant Monospace Timer (Maximum Projector Contrast: Deep Pitch Black / Alert Red) */}
      <div className="z-10 my-auto py-4 sm:py-8 flex flex-col items-center justify-center">
        <div 
          className={`font-mono font-black tracking-tighter tabular-nums transition-all duration-300 drop-shadow-sm ${
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
          style={{ fontSize: 'clamp(5rem, 16vw, 18rem)', lineHeight: 0.9 }}
        >
          {formattedMinutes}:{formattedSeconds}
        </div>

        {/* Dynamic Status Banner */}
        <div className="mt-4 sm:mt-6">
          <div className={`inline-flex items-center gap-2.5 px-6 py-2.5 rounded-2xl border-2 text-sm sm:text-lg font-black uppercase tracking-wider shadow-md ${
            isZero
              ? 'bg-rose-100 text-rose-800 border-rose-400 animate-bounce'
              : isLast10Sec
              ? 'bg-amber-100 text-amber-900 border-amber-400'
              : isRunning
              ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
              : status === 'paused'
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : 'bg-white text-slate-700 border-slate-300'
          }`}>
            {isRunning && <span className="w-3 h-3 rounded-full bg-emerald-600 animate-ping" />}
            {isLast10Sec && <AlertTriangle className="w-5 h-5 text-amber-600" />}
            <span>
              {isZero ? "🚨 TIME'S UP — PENS DOWN / SUBMIT" : 
               isLast10Sec ? "⚠️ FINAL 10 SECONDS — WRAP UP" : 
               isRunning ? "ROUND IN PROGRESS" : 
               status === 'paused' ? "TIMER PAUSED" : 
               "READY — AWAITING COORDINATOR START"}
            </span>
          </div>
        </div>
      </div>

      {/* Reverse Prompt Stage Timeline (if available) */}
      {activeTimeline && (
        <div className="z-10 w-full max-w-4xl mx-auto pt-4 border-t border-slate-200">
          <div className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 mb-2 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Complete 120-Minute Stage Schedule</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-left">
            {activeTimeline.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-white border-2 border-slate-200 rounded-xl p-2.5 flex flex-col justify-between shadow-sm"
              >
                <div className="font-mono text-[10px] text-emerald-700 font-extrabold">{item.time}</div>
                <div className="text-[11px] text-slate-900 font-bold line-clamp-2 my-1 leading-snug">{item.stage}</div>
                <div className="text-[9px] font-mono font-semibold text-slate-500">{item.duration}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Quiet Room Bar */}
      <div className="z-10 w-full max-w-5xl mx-auto pt-3 flex items-center justify-between text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
          <span className="font-bold text-slate-700">Room Coordinator Controlled Synchronous Timer</span>
        </div>
        <div className="font-mono text-slate-400">
          Strict Privacy Guaranteed &bull; Projector High-Contrast Mode
        </div>
      </div>
    </div>
  );
}

/**
 * Hall / Stage Carousel Mode (Crisp Projector Light Theme)
 */
function BigScreenHallMode({ activities, onSelectRoom }) {
  const { announcements } = useAnnouncements();
  const [allScores, setAllScores] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0); // 0: Live Timers, 1: Announcements, 2: Leaderboard, 3: Schedule
  const [isAutoPlaying, setIsAutoPlaying] = useState(false); // Off by default
  const [slideProgress, setSlideProgress] = useState(0);

  const TOTAL_SLIDES = 4;
  const SLIDE_DURATION_MS = 12000; // 12 seconds per slide

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
    <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden bg-slate-50">
      {/* Slide Content Area */}
      <div className="flex-1 flex flex-col justify-center max-w-6xl w-full mx-auto my-auto">
        {/* SLIDE 0: Live Timers Matrix */}
        {activeSlide === 0 && (
          <div className="space-y-6">
            <div className="text-center space-y-1.5">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5 shadow-sm">
                <Timer className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live Multi-Room Matrix</span>
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
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
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1.5 shadow-sm">
                <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                <span>Live Official Feed</span>
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
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

                  <h3 className="text-lg font-bold text-slate-950 mb-1.5">
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

        {/* SLIDE 2: Live Leaderboard & Winners */}
        {activeSlide === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-1.5">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1.5 shadow-sm">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>Live Event Champions</span>
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
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
                        <h4 className="text-sm font-black text-slate-950 truncate max-w-[170px]">{act.name}</h4>
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

        {/* SLIDE 3: Schedule & Room Directory */}
        {activeSlide === 3 && (
          <div className="space-y-6">
            <div className="text-center space-y-1.5">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-blue-100 text-blue-800 border border-blue-300 inline-flex items-center gap-1.5 shadow-sm">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                <span>Venue & Schedule</span>
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
                Event Schedule & Rooms
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Locate your assigned room and check start timings
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto w-full">
              {activities.map((act) => (
                <div 
                  key={act.id} 
                  onClick={() => onSelectRoom(act.id)}
                  className="bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-2xl p-5 cursor-pointer transition-all group shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>{act.room}</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">{act.scheduledTime}</span>
                  </div>
                  <h3 className="text-base font-black text-slate-950 group-hover:text-emerald-700 transition-colors">
                    {act.name}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {act.description}
                  </p>
                </div>
              ))}
            </div>
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

          {/* Slide Indicator Dots */}
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map((idx) => (
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
  initialActivityId = null 
}) {
  const [displayMode, setDisplayMode] = useState(initialMode); // 'room' | 'hall'
  const [selectedActivityId, setSelectedActivityId] = useState(
    initialActivityId || activities[0]?.id || 'reverse-prompt'
  );
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
          {/* Left: Branding & Back Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit Projector</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-3">
              <Tv className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800 tracking-tight">Projector / Big Screen Mode</span>
            </div>
          </div>

          {/* Center: Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setDisplayMode('hall')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                displayMode === 'hall'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Hall Carousel</span>
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
              <span>Room Projector</span>
            </button>
          </div>

          {/* Right Controls: Room Selector (if in Room Mode), Wake Lock, Sound & Fullscreen */}
          <div className="flex items-center gap-2">
            {displayMode === 'room' && (
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
            )}

            {/* Wake Lock Indicator */}
            {wakeLockActive && (
              <span 
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-[11px] font-mono font-bold text-emerald-800"
                title="Screen will not turn off or sleep"
              >
                <SunMedium className="w-3.5 h-3.5 text-emerald-600" />
                <span>Wake Lock Active</span>
              </span>
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

      {/* Main View Display Area: Starts directly underneath the reserved control space */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {displayMode === 'room' ? (
          <BigScreenRoomMode 
            activity={currentActivity} 
            soundEnabled={soundEnabled}
            onSoundToggle={() => setSoundEnabled(!soundEnabled)}
          />
        ) : (
          <BigScreenHallMode 
            activities={activities}
            onSelectRoom={(actId) => {
              setSelectedActivityId(actId);
              setDisplayMode('room');
            }}
          />
        )}
      </main>
    </div>
  );
}
