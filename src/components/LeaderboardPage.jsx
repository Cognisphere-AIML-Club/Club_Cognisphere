import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  ChevronDown, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  ArrowRight, 
  Sparkles,
  Award
} from 'lucide-react';
import { ACTIVITIES } from '../data/activities';
import { useScores } from '../hooks/useScores';
import LeaderboardPodium from './LeaderboardPodium';

export default function LeaderboardPage({
  activities = ACTIVITIES,
  initialActivityId = null,
  user = null,
  isAdmin = false,
  isCoordinator = false,
  isStaff = false,
  onBack,
  onNavigateToEvent
}) {
  const allActivities = activities && activities.length > 0 ? activities : ACTIVITIES;

  // Selected Activity ID state, fallback to initialActivityId or first activity
  const [selectedActivityId, setSelectedActivityId] = useState(() => {
    if (initialActivityId && allActivities.some(a => a.id === initialActivityId)) {
      return initialActivityId;
    }
    return allActivities[0]?.id || '';
  });

  // Sync state if initialActivityId changes externally
  useEffect(() => {
    if (initialActivityId && allActivities.some(a => a.id === initialActivityId)) {
      setSelectedActivityId(initialActivityId);
    }
  }, [initialActivityId, allActivities]);

  const currentActivity = allActivities.find(a => a.id === selectedActivityId) || allActivities[0];

  // Subscribe to real-time scores and attendees for the selected activity
  const { scores, attendees, publishScore, unpublishScore } = useScores(currentActivity?.id);

  if (!currentActivity) return null;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Bar with Navigation & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-2xl bg-surface-container-lowest border border-surface-container text-secondary hover:text-on-surface hover:bg-surface-container transition-all active:scale-95 shadow-xs"
              title="Go Back"
              aria-label="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-primary font-bold text-xs tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>IGNITE 2026</span>
              </span>
              <span className="text-outline text-xs">&bull;</span>
              <span className="text-secondary text-xs font-semibold">Live Results</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
              Official Leaderboard
            </h1>
          </div>
        </div>

        {onNavigateToEvent && (
          <button
            type="button"
            onClick={() => onNavigateToEvent(currentActivity.id)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-container bg-surface-container-lowest border border-surface-container px-3.5 py-2 rounded-2xl shadow-xs transition-all active:scale-95 self-start sm:self-auto"
          >
            <span>View Event Briefing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Selector - Exact Match to Participant Pass Page Style */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-4 sm:p-5 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-secondary uppercase tracking-wider px-1">
          <span className="flex items-center gap-1.5 text-primary">
            <Trophy className="w-3.5 h-3.5" />
            <span>Select Competition Event</span>
          </span>
          <span className="font-mono text-[11px] text-secondary">
            {allActivities.length} {allActivities.length === 1 ? 'Event' : 'Events'}
          </span>
        </div>

        <div className="relative">
          <select
            value={selectedActivityId}
            onChange={(e) => setSelectedActivityId(e.target.value)}
            className="w-full bg-surface-container-low border border-surface-container text-on-surface font-bold rounded-2xl px-4 py-3 text-xs sm:text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-all pr-10 shadow-xs"
          >
            {allActivities.map((act) => (
              <option key={act.id} value={act.id}>
                {act.name} — {act.room} ({act.category})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-secondary absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Selected Event Quick Info Strip */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-2xl px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-on-surface">{currentActivity.name}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
            {currentActivity.category}
          </span>
        </div>

        <div className="flex items-center gap-4 text-secondary font-medium">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold text-on-surface">{currentActivity.room}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{currentActivity.scheduledTime || '10:00 AM'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>{currentActivity.eventDate || 'Nov 24, 2026'}</span>
          </div>
        </div>
      </div>

      {/* Complete Leaderboard Podium & Complete Standings Table */}
      <LeaderboardPodium
        activity={currentActivity}
        activities={allActivities}
        scores={scores}
        attendees={attendees}
        isAdmin={isAdmin}
        isCoordinator={isCoordinator}
        isStaff={isStaff}
        onPublishScore={publishScore}
        onUnpublishScore={unpublishScore}
        adminEmail={user?.email}
      />
    </div>
  );
}

