import React, { useState } from 'react';
import { ACTIVITIES } from '../data/activities';
import JudgeTimer from './JudgeTimer';

export default function TimersHub({ activities = ACTIVITIES, role, roleData, user, onOpenBigScreen }) {
  const [selectedActivityId, setSelectedActivityId] = useState(ACTIVITIES[0].id);

  const selectedActivity = activities.find(a => a.id === selectedActivityId) || activities[0];
  const isAdmin = role === 'admin';
  const isCoordinator = role === 'coordinator';
  const canControl = isAdmin || isCoordinator;

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn">
      {/* Activity Room Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {activities.map((act) => {
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
              <div className="flex items-center justify-between mt-2 text-[10px]">
                <span className={`font-mono ${isSelected ? 'text-on-primary font-bold' : 'text-secondary'}`}>
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
