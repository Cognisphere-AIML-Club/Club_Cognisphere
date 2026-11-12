import React, { useState } from 'react';
import { ACTIVITIES } from '../data/activities';
import JudgeTimer from './JudgeTimer';
import { Timer, MapPin, Tag, ShieldCheck, Tv } from 'lucide-react';

export default function TimersHub({ activities = ACTIVITIES, role, roleData, user, onOpenBigScreen }) {
  const [selectedActivityId, setSelectedActivityId] = useState(ACTIVITIES[0].id);

  const selectedActivity = activities.find(a => a.id === selectedActivityId) || activities[0];
  const isAdmin = role === 'admin';
  const isCoordinator = role === 'coordinator';
  const canControl = isAdmin || isCoordinator;

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest border border-surface-container rounded-3xl p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-surface-container text-primary border border-surface-container-high flex items-center justify-center">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-on-surface tracking-tight">Classroom Timers Desk</h2>
            <p className="text-xs text-secondary">Synchronized digital clocks across venue rooms</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {canControl && onOpenBigScreen && (
            <button
              onClick={() => onOpenBigScreen(selectedActivityId)}
              className="px-3.5 py-1.5 bg-surface-container-low hover:bg-surface-container border border-surface-container text-on-surface rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Launch Big Screen Projector Mode"
            >
              <Tv className="w-3.5 h-3.5 text-primary" />
              <span>Launch Big Screen</span>
            </button>
          )}

          {canControl ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-container border border-surface-container-high text-primary">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Coordinator Controls Active</span>
            </span>
          ) : (
            <span className="text-xs text-secondary font-medium px-2">
              Live Viewer Mode
            </span>
          )}
        </div>
      </div>

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
      />
    </div>
  );
}
