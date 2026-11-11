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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Classroom Timers Desk</h2>
            <p className="text-xs text-slate-400">Synchronized digital clocks across venue rooms</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {canControl && onOpenBigScreen && (
            <button
              onClick={() => onOpenBigScreen(selectedActivityId)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Launch Big Screen Projector Mode"
            >
              <Tv className="w-3.5 h-3.5 text-emerald-400" />
              <span>Launch Big Screen</span>
            </button>
          )}

          {canControl ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 border border-blue-500/30 text-blue-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Coordinator Controls Active</span>
            </span>
          ) : (
            <span className="text-xs text-slate-500 font-medium px-2">
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
                  ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              <div className="text-xs truncate font-bold">{act.name}</div>
              <div className="flex items-center justify-between mt-2 text-[10px]">
                <span className={`font-mono ${isSelected ? 'text-slate-950 font-bold' : 'text-slate-400'}`}>
                  {act.room}
                </span>
                {userCanControlThis && (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                    isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-blue-500/20 text-blue-300'
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
