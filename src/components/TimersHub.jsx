import React, { useState } from 'react';
import { ACTIVITIES } from '../data/activities';
import JudgeTimer from './JudgeTimer';

export default function TimersHub({ activities = ACTIVITIES, role, roleData, user, onOpenBigScreen }) {
  const allActivities = activities && activities.length > 0 ? activities : ACTIVITIES;
  const [selectedActivityId, setSelectedActivityId] = useState(() => allActivities[0]?.id || ACTIVITIES[0].id);

  const selectedActivity = allActivities.find(a => a.id === selectedActivityId) || allActivities[0];
  const isAdmin = role === 'admin';
  const isCoordinator = role === 'coordinator';
  const canControl = isAdmin || isCoordinator;

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn">
      {/* Activity Room Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {allActivities.map((act) => {
          const isSelected = act.id === selectedActivityId;
          const userCanControlThis = isAdmin || isCoordinator;

          return (
            <button
              key={act.id}
              onClick={() => setSelectedActivityId(act.id)}
              className={`p-3 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                isSelected
                  ? 'bg-primary text-on-primary font-bold border-primary shadow-xs'
                  : 'bg-surface-container-lowest hover:bg-surface-container-low border-surface-container text-on-surface'
              }`}
            >
              <div className="text-xs truncate font-bold">{act.name}</div>
              <div className={`text-[10px] truncate font-medium mt-0.5 ${isSelected ? 'text-on-primary/80' : 'text-secondary'}`}>
                {act.scheduledTime ? act.scheduledTime.split('–')[0].trim() : ''}
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px]">
                <span className={`font-mono truncate ${isSelected ? 'text-on-primary font-bold' : 'text-secondary'}`}>
                  {act.room}
                </span>
                {userCanControlThis && (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                    isSelected ? 'bg-surface-container-lowest/20 text-on-primary' : 'bg-surface-container text-primary'
                  }`}>
                    Coord
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Timer Display */}
      <JudgeTimer
        activity={selectedActivity}
        canControl={canControl}
        userEmail={user?.email}
        onOpenBigScreen={onOpenBigScreen ? () => onOpenBigScreen(selectedActivityId) : undefined}
      />
    </div>
  );
}
