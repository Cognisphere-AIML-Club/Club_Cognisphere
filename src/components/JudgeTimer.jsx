import React, { useState, useEffect } from 'react';
import { useSharedTimer } from '../hooks/useSharedTimer';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Timer, 
  Plus, 
  Minus,
  Lock,
  CalendarDays
} from 'lucide-react';

export default function JudgeTimer({ 
  activity, 
  canControl = false, 
  userEmail = 'coordinator' 
}) {
  const defaultSec = activity?.defaultDuration || 60;
  const {
    minutes,
    seconds,
    status,
    durationSeconds,
    isLast10Sec,
    isZero,
    soundEnabled,
    setSoundEnabled,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    adjustTime,
  } = useSharedTimer(activity?.id, defaultSec);

  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  const isRunning = status === 'running';

  const defaultPresets = [
    { id: 'def-60', label: '1:00', seconds: 60 },
    { id: 'def-120', label: '2:00', seconds: 120 },
    { id: 'def-180', label: '3:00', seconds: 180 },
    { id: 'def-300', label: '5:00', seconds: 300 },
    { id: 'def-900', label: '15:00', seconds: 900 },
  ];

  const timelinePresets = activity?.scheduleTimeline?.map((item, idx) => ({
    id: `stage-${idx}`,
    label: item.duration.replace(' Minutes', 'm'),
    seconds: item.durationSeconds,
    desc: item.stage
  })) || null;

  // Single active preset button tracking (ensures only 1 button highlights even if multiple stages share the same duration)
  const [activePresetId, setActivePresetId] = useState(() => {
    if (timelinePresets && timelinePresets.length > 0) {
      const match = timelinePresets.find(p => p.seconds === defaultSec);
      return match ? match.id : timelinePresets[0].id;
    }
    const defMatch = defaultPresets.find(p => p.seconds === defaultSec);
    return defMatch ? defMatch.id : defaultPresets[0].id;
  });

  // Keep single active preset in sync when switching activities
  useEffect(() => {
    if (timelinePresets && timelinePresets.length > 0) {
      const match = timelinePresets.find(p => p.seconds === defaultSec);
      setActivePresetId(match ? match.id : timelinePresets[0].id);
    } else {
      const defMatch = defaultPresets.find(p => p.seconds === defaultSec);
      setActivePresetId(defMatch ? defMatch.id : defaultPresets[0].id);
    }
  }, [activity?.id, defaultSec]);

  return (
    <div className={`rounded-3xl border p-6 sm:p-8 transition-all shadow-2xl relative overflow-hidden ${
      isZero && status === 'finished'
        ? 'bg-rose-950/40 border-rose-500 shadow-rose-500/20 animate-pulse'
        : isLast10Sec
        ? 'bg-amber-950/40 border-amber-500 shadow-amber-500/20'
        : isRunning
        ? 'bg-slate-900 border-emerald-500/50 shadow-emerald-500/10'
        : 'bg-slate-900 border-slate-800'
    }`}>
      {/* Top Ambient Glow */}
      <div className={`absolute top-0 inset-x-0 h-1.5 transition-colors ${
        isZero ? 'bg-rose-500' : isLast10Sec ? 'bg-amber-400' : isRunning ? 'bg-emerald-400' : 'bg-slate-700'
      }`} />

      {/* Timer Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-colors ${
            isRunning
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Coordinator Timer &bull; {activity?.room}
            </span>
            <h3 className="text-sm font-extrabold text-white">
              {activity?.name}
            </h3>
          </div>
        </div>

        {/* Status Pill and Sound Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Sound alerts enabled' : 'Sound alerts muted'}
            className={`p-2 rounded-xl border transition-all ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
            isZero
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              : isLast10Sec
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : isRunning
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : status === 'paused'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            {isRunning && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
            <span>{isZero ? "Time's Up!" : status}</span>
          </span>
        </div>
      </div>

      {/* Big High-Contrast Digital Display */}
      <div className="py-8 sm:py-12 text-center select-none space-y-2">
        <div className={`font-mono text-6xl sm:text-8xl md:text-9xl font-black tracking-tight transition-colors ${
          isZero
            ? 'text-rose-400 drop-shadow-[0_0_35px_rgba(244,63,94,0.4)]'
            : isLast10Sec
            ? 'text-amber-400 drop-shadow-[0_0_35px_rgba(251,191,36,0.3)] animate-pulse'
            : isRunning
            ? 'text-white drop-shadow-[0_0_25px_rgba(16,185,129,0.2)]'
            : 'text-slate-300'
        }`}>
          {formattedMinutes}:{formattedSeconds}
        </div>

        {/* Sub-label under clock */}
        <p className="text-xs font-medium text-slate-400">
          {isRunning && !isLast10Sec && 'Synchronized across all phones and projector'}
          {isLast10Sec && '⚠️ Final 10 Seconds — Prepare to Wrap Up'}
          {isZero && '🚨 Round Finished — Coordinator Recording Attendance'}
          {status === 'paused' && 'Clock is paused'}
          {status === 'idle' && `Ready (${Math.round(durationSeconds / 60)} min preset)`}
        </p>
      </div>

      {/* Control Panel (For Room Coordinators and Admins) */}
      {canControl ? (
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          {/* Main Action Buttons: When running, ONLY Pause and Reset are active */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {isRunning ? (
              <button
                onClick={() => pauseTimer(userEmail)}
                className="py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm col-span-2 sm:col-span-2"
              >
                <Pause className="w-4 h-4" />
                <span>Pause Timer</span>
              </button>
            ) : status === 'paused' ? (
              <button
                onClick={() => resumeTimer(userEmail)}
                className="py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 col-span-2 sm:col-span-2"
              >
                <Play className="w-4 h-4" />
                <span>Resume Timer</span>
              </button>
            ) : (
              <button
                onClick={() => startTimer(null, userEmail)}
                className="py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 col-span-2 sm:col-span-2"
              >
                <Play className="w-4 h-4" />
                <span>Start Clock</span>
              </button>
            )}

            {/* Reset Button: Always available to reset or stop */}
            <button
              onClick={() => resetTimer(null, userEmail)}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-semibold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 col-span-2 sm:col-span-2 shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>

          {/* Schedule Stage Presets: Disabled when running to prevent accidental mid-round changes */}
          {timelinePresets && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Round Stage Presets:</span>
                </span>
                {isRunning && (
                  <span className="text-[10px] text-amber-400 font-normal">
                    (Locked while timer is running)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {timelinePresets.map((p) => {
                  const isSelected = activePresetId === p.id && durationSeconds === p.seconds;
                  return (
                    <button
                      key={p.id}
                      disabled={isRunning}
                      onClick={() => {
                        setActivePresetId(p.id);
                        resetTimer(p.seconds, userEmail);
                      }}
                      title={p.desc}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors border flex items-center gap-1.5 ${
                        isRunning
                          ? 'opacity-35 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
                          : isSelected
                          ? 'bg-slate-100 text-slate-950 border-white shadow-sm'
                          : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-750 hover:text-white'
                      }`}
                    >
                      <span className="font-extrabold">{p.label}</span>
                      <span className={`text-[10px] truncate max-w-[90px] font-sans ${
                        isSelected && !isRunning ? 'text-slate-800 font-medium' : 'text-slate-400'
                      }`}>
                        {p.desc.split('–')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Standard Presets & Quick +/- 30s Buttons: Disabled when running */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Presets:</span>
              {defaultPresets.map((p) => {
                const isSelected = activePresetId === p.id && durationSeconds === p.seconds;
                return (
                  <button
                    key={p.id}
                    disabled={isRunning}
                    onClick={() => {
                      setActivePresetId(p.id);
                      resetTimer(p.seconds, userEmail);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-colors border ${
                      isRunning
                        ? 'opacity-35 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
                        : isSelected
                        ? 'bg-slate-100 text-slate-950 border-white shadow-sm'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-750 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Quick +/- 30s Buttons: Disabled when running */}
            <div className="flex items-center gap-1">
              <button
                disabled={isRunning}
                onClick={() => {
                  setActivePresetId(null);
                  adjustTime(-30, userEmail);
                }}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-0.5 transition-colors ${
                  isRunning
                    ? 'opacity-35 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-750 hover:text-white'
                }`}
                title="Subtract 30 seconds"
              >
                <Minus className="w-3 h-3" />
                <span className="text-[10px] font-mono">30s</span>
              </button>
              <button
                disabled={isRunning}
                onClick={() => {
                  setActivePresetId(null);
                  adjustTime(30, userEmail);
                }}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-0.5 transition-colors ${
                  isRunning
                    ? 'opacity-35 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-750 hover:text-white'
                }`}
                title="Add 30 seconds"
              >
                <Plus className="w-3 h-3" />
                <span className="text-[10px] font-mono">30s</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Synchronized Classroom Timer &bull; Controlled by Room Coordinator / Admin</span>
        </div>
      )}
    </div>
  );
}
