import React, { useState, useEffect } from 'react';
import { useSharedTimer } from '../hooks/useSharedTimer';
import TimerDurationPicker from './TimerDurationPicker';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Timer,
  Lock,
  CalendarDays,
  Tv
} from 'lucide-react';

export default function JudgeTimer({
  activity,
  canControl = false,
  userEmail = 'coordinator',
  onOpenBigScreen
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
  } = useSharedTimer(activity?.id, defaultSec);

  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  const isRunning = status === 'running';

  const timelinePresets = activity?.scheduleTimeline?.map((item, idx) => ({
    id: `stage-${idx}`,
    label: item.duration.replace(' Minutes', 'm'),
    seconds: item.durationSeconds,
    desc: item.stage
  })) || null;

  // Single active preset button tracking for Round Stage Presets
  const [activePresetId, setActivePresetId] = useState(() => {
    if (timelinePresets && timelinePresets.length > 0) {
      const match = timelinePresets.find(p => p.seconds === defaultSec);
      return match ? match.id : timelinePresets[0].id;
    }
    return null;
  });

  // Keep single active preset in sync when switching activities
  useEffect(() => {
    if (timelinePresets && timelinePresets.length > 0) {
      const match = timelinePresets.find(p => p.seconds === defaultSec);
      setActivePresetId(match ? match.id : (timelinePresets[0]?.id || null));
    } else {
      setActivePresetId(null);
    }
  }, [activity?.id, defaultSec]);

  const handleCustomDurationChange = (newSeconds) => {
    setActivePresetId(null);
    const mins = Math.floor(newSeconds / 60);
    const secs = newSeconds % 60;
    const label = mins > 0
      ? (secs > 0 ? `${mins}m ${secs}s Custom Round` : `${mins}m Custom Round`)
      : `${secs}s Custom Round`;
    resetTimer(newSeconds, userEmail, label);
  };

  const currentActiveStage = timelinePresets?.find(p => p.id === activePresetId)?.desc
    || activity?.name || 'Active Round';

  return (
    <div className={`rounded-3xl border p-6 sm:p-8 transition-all shadow-xs relative overflow-hidden ${isZero && status === 'finished'
        ? 'bg-error-container/20 border-error'
        : isLast10Sec
          ? 'bg-error-container/10 border-error/50'
          : isRunning
            ? 'bg-surface-container-lowest border-primary'
            : 'bg-surface-container-lowest border-surface-container'
      }`}>
      {/* Top Accent Line */}
      <div className={`absolute top-0 inset-x-0 h-1.5 transition-colors ${isZero ? 'bg-error' : isLast10Sec ? 'bg-error' : isRunning ? 'bg-primary' : 'bg-surface-container-high'
        }`} />

      {/* Timer Header */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-container">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-colors ${isRunning
              ? 'bg-surface-container border-primary/30 text-primary'
              : 'bg-surface-container-low border-surface-container text-secondary'
            }`}>
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-secondary block">
              {activity?.room} {activity?.scheduledTime ? `• ${activity.scheduledTime}` : ''}
            </span>
            <h3 className="text-sm font-extrabold text-on-surface">
              {activity?.name}
            </h3>
          </div>
        </div>

        {/* Status Pill, Launch Big Screen, and Sound Toggle */}
        <div className="flex items-center gap-2">
          {canControl && onOpenBigScreen && (
            <button
              onClick={onOpenBigScreen}
              className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Launch Big Screen Projector Mode"
            >
              <Tv className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Launch Big Screen</span>
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Sound alerts enabled' : 'Sound alerts muted'}
            className={`p-2 rounded-xl border transition-all ${soundEnabled
                ? 'bg-surface-container border-surface-container-high text-primary'
                : 'bg-surface-container-low border-surface-container text-secondary'
              }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${isZero
              ? 'bg-error-container border-error/30 text-on-error-container'
              : isLast10Sec
                ? 'bg-error-container border-error/30 text-on-error-container'
                : isRunning
                  ? 'bg-surface-container border-primary/30 text-primary'
                  : status === 'paused'
                    ? 'bg-secondary-container border-secondary/30 text-on-secondary-container'
                    : 'bg-surface-container-low border-surface-container text-secondary'
            }`}>
            {isRunning && (
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            )}
            <span>{isZero ? "Time's Up!" : status}</span>
          </span>
        </div>
      </div>

      {/* Big High-Contrast Digital Display */}
      <div className="py-8 sm:py-12 text-center select-none space-y-2">
        <div className={`font-mono text-6xl sm:text-8xl md:text-9xl font-black tracking-tight transition-colors ${isZero
            ? 'text-error'
            : isLast10Sec
              ? 'text-error'
              : isRunning
                ? 'text-primary'
                : 'text-on-surface'
          }`}>
          {formattedMinutes}:{formattedSeconds}
        </div>

        {/* Sub-label under clock */}
        <p className="text-xs font-medium text-secondary">
          {isRunning && !isLast10Sec && 'Synchronized across all phones and projector'}
          {isLast10Sec && '⚠️ Final 10 Seconds — Prepare to Wrap Up'}
          {isZero && '🚨 Round Finished — Coordinator Recording Attendance'}
          {status === 'paused' && 'Clock is paused'}
          {status === 'idle' && `Ready (${durationSeconds >= 60 ? `${Math.round(durationSeconds / 60)} min` : `${durationSeconds}s`} duration)`}
        </p>
      </div>

      {/* Control Panel (For Room Coordinators and Admins) */}
      {canControl ? (
        <div className="space-y-4 pt-4 border-t border-surface-container">
          {/* Main Action Buttons: When running, ONLY Pause and Reset are active */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {isRunning ? (
              <button
                onClick={() => pauseTimer(userEmail)}
                className="py-3 px-4 bg-secondary hover:bg-secondary/90 text-on-secondary font-bold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs col-span-2 sm:col-span-2"
              >
                <Pause className="w-4 h-4" />
                <span>Pause Timer</span>
              </button>
            ) : status === 'paused' ? (
              <button
                onClick={() => resumeTimer(userEmail)}
                className="py-3 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs col-span-2 sm:col-span-2"
              >
                <Play className="w-4 h-4" />
                <span>Resume Timer</span>
              </button>
            ) : (
              <button
                onClick={() => startTimer(null, userEmail, currentActiveStage)}
                className="py-3 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs col-span-2 sm:col-span-2"
              >
                <Play className="w-4 h-4" />
                <span>Start Clock</span>
              </button>
            )}

            {/* Reset Button: Always available to reset or stop */}
            <button
              onClick={() => resetTimer(null, userEmail, currentActiveStage)}
              className="py-3 px-4 bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-on-surface font-semibold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 col-span-2 sm:col-span-2 shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>

          {/* Schedule Stage Presets: Disabled when running to prevent accidental mid-round changes */}
          {timelinePresets && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-primary">
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Round Stage Presets:</span>
                </span>
                {isRunning && (
                  <span className="text-[10px] text-secondary font-normal">
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
                        resetTimer(p.seconds, userEmail, p.desc);
                      }}
                      title={p.desc}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors border flex items-center gap-1.5 ${isRunning
                          ? 'opacity-35 cursor-not-allowed bg-surface-container-low border-surface-container text-secondary'
                          : isSelected
                            ? 'bg-primary text-on-primary border-primary shadow-xs'
                            : 'bg-surface-container-low text-on-surface border-surface-container hover:bg-surface-container hover:border-surface-container-high'
                        }`}
                    >
                      <span className="font-extrabold">{p.label}</span>
                      <span className={`text-[10px] truncate max-w-[90px] font-sans ${isSelected && !isRunning ? 'text-on-primary font-medium' : 'text-secondary'
                        }`}>
                        {p.desc.split('–')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Time Selector (MUI TimePicker): Disabled when running */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-surface-container">
            <span className="text-[11px] font-semibold text-secondary mr-0.5">
              Time Selector:
            </span>
            <TimerDurationPicker
              durationSeconds={durationSeconds}
              onChangeDuration={handleCustomDurationChange}
              disabled={isRunning}
            />
          </div>
        </div>
      ) : (
        <div className="pt-4 border-t border-surface-container flex items-center justify-center gap-2 text-xs text-secondary">
          <Lock className="w-3.5 h-3.5 text-secondary" />
          <span>Synchronized Classroom Timer &bull; Controlled by Room Coordinator / Admin</span>
        </div>
      )}
    </div>
  );
}
