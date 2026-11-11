import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Tag, 
  Sparkles, 
  ShieldCheck, 
  QrCode, 
  Edit3, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Scale,
  Send,
  Loader2,
  Lock,
  CalendarDays,
  Play,
  Tv,
  LogIn
} from 'lucide-react';
import AdminEditActivityModal from './AdminEditActivityModal';
import PassApprovalManager from './PassApprovalManager';
import JudgeTimer from './JudgeTimer';
import LeaderboardPodium from './LeaderboardPodium';
import { requestGamePass, subscribeToUserPassRequests } from '../services/passApprovalService';
import { useScores } from '../hooks/useScores';

export default function GameDetailPage({ 
  activity, 
  isAdmin, 
  isStaff,
  role,
  roleData,
  user, 
  profile, 
  onBack, 
  onOpenPass, 
  onUpdateActivity,
  onOpenBigScreen,
  onSignIn
}) {
  const [editing, setEditing] = useState(false);
  const [userRequests, setUserRequests] = useState({});
  const [requesting, setRequesting] = useState(false);

  // Subscribe to real-time scores and attendees for leaderboard
  const { scores, attendees, publishScore, unpublishScore } = useScores(activity?.id);

  // Subscribe to participant's pass requests
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToUserPassRequests(user.uid, (map) => {
      setUserRequests(map);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  if (!activity) return null;

  const request = userRequests[activity.id];
  const isApproved = isStaff || request?.status === 'approved';
  const isPending = request?.status === 'pending';
  const isRejected = request?.status === 'rejected';

  // Room Coordinators and Admins control the room timer
  const canControlTimer = isAdmin || role === 'coordinator';

  const handleRequestPass = async () => {
    if (!user || !profile) return;
    try {
      setRequesting(true);
      await requestGamePass({
        activityId: activity.id,
        participantId: user.uid,
        participantName: profile.name || user.displayName || 'Participant',
        participantUsn: profile.usn || '',
      });
    } catch (err) {
      alert(err.message || 'Failed to submit pass request');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto w-full">
      {/* Top Navigation Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Games</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit This Game Page</span>
          </button>
        )}
      </div>

      {/* Hero Banner for this Game */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-4 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
              activity.category === 'Technical'
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
            }`}>
              <Tag className="w-3 h-3" />
              <span>{activity.category} Competition</span>
            </span>

            {/* Status Pill */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              activity.status === 'In Progress'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : activity.status === 'Completed'
                ? 'bg-slate-800 border-slate-700 text-slate-400'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
            }`}>
              {activity.status === 'In Progress' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
              <span>{activity.status || 'Upcoming'}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {activity.name}
          </h1>

          {/* Quick Info Badges */}
          <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
            <div className="flex items-center gap-1.5 font-bold text-white bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Venue: {activity.room}</span>
            </div>

            <div className="flex items-center gap-1.5 font-medium text-slate-300 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Schedule: {activity.scheduledTime || 'Announced on Event Day'}</span>
            </div>
          </div>

          {/* Request / Approved Pass Action Box */}
          {user && (
            <div className="pt-2">
              {isApproved ? (
                <button
                  onClick={() => onOpenPass(activity.id)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md active:scale-[0.99]"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Pass Approved • Open QR Code for {activity.room}</span>
                </button>
              ) : isPending ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-xs text-amber-300 font-semibold">
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Request Pending Review by Room Coordinator or Admin</span>
                </div>
              ) : isRejected ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-xs text-rose-300 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>Entry Not Approved for this Competition</span>
                </div>
              ) : (
                <button
                  onClick={handleRequestPass}
                  disabled={requesting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md active:scale-[0.99]"
                >
                  {requesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Request Pass to Participate in {activity.name}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Prompt when not signed in */}
          {!user && (
            <div className="pt-2">
              <button
                onClick={onSignIn}
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-lg active:scale-[0.99]"
              >
                <LogIn className="w-4 h-4 text-slate-950" />
                <span>Sign Up / Sign In to Join Competition</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Synchronized Classroom Live Timer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span>Room Live Countdown</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {isStaff && (
            <button
              onClick={() => onOpenBigScreen(activity.id)}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Projector Big-Screen View</span>
            </button>
          )}
        </div>

        <JudgeTimer 
          activity={activity} 
          canControl={canControlTimer}
          userEmail={user?.email}
        />
      </div>

      {/* Complete Event Schedule Table (when available, e.g. for Reverse Prompt Engineering) */}
      {activity.scheduleTimeline && activity.scheduleTimeline.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Complete Event Schedule
                </h3>
                <p className="text-xs text-slate-400">Official stage-by-stage timetable</p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl self-start sm:self-auto">
              Total: {activity.totalDuration || '120 Minutes'}
            </span>
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Activity / Stage</th>
                  <th className="py-2.5 px-3 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {activity.scheduleTimeline.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                      {item.time}
                    </td>
                    <td className="py-3 px-3 text-slate-200">
                      {item.stage}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400 font-mono whitespace-nowrap">
                      {item.duration}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-700 font-bold text-xs bg-slate-950/40">
                  <td className="py-3 px-3 text-white uppercase tracking-wider" colSpan={2}>
                    Total Competition Duration
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-mono text-sm">
                    120 Minutes
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Coordinator / Admin Approval Management Panel */}
      {isStaff && (
        <PassApprovalManager 
          activity={activity} 
          reviewerEmail={user?.email} 
        />
      )}

      {/* Official Live Leaderboard & Winners Podium */}
      <LeaderboardPodium 
        activity={activity}
        scores={scores}
        attendees={attendees}
        isAdmin={isAdmin}
        onPublishScore={publishScore}
        onUnpublishScore={unpublishScore}
        adminEmail={user?.email}
      />

      {/* Game Details Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main Content Column (2 spans) */}
        <div className="md:col-span-2 space-y-5">
          {/* Overview & Description Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <FileText className="w-4 h-4" />
              <span>Activity Overview</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {activity.description || 'Competition guidelines and briefing for this activity.'}
            </p>
          </div>

          {/* Rules & Competition Format Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Scale className="w-4 h-4" />
              <span>Competition Format & Rules</span>
            </div>
            
            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <span><strong>Single Player:</strong> All challenges in this activity are individual rounds.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <span><strong>Duration:</strong> Follows the official 120-minute stage schedule above.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <span><strong>Judging:</strong> Human judges score each round; synchronized classroom timers regulate each stage.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <span><strong>Pass Required:</strong> Only approved participants with an active pass can scan in.</span>
              </div>
            </div>
          </div>

          {/* Judging Criteria Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Judging & Scoring Criteria</span>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Scores are evaluated directly by judges in <strong className="text-white">{activity.room}</strong>. Winners and top rankings will be published to the live leaderboard once rounds conclude.
            </p>
          </div>
        </div>

        {/* Sidebar Info Column (1 span) */}
        <div className="space-y-5">
          {/* Room Location Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Venue Location
            </h3>
            
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
              <div className="text-xs text-slate-500 font-medium">Assigned Classroom</div>
              <div className="text-2xl font-black text-white">{activity.room}</div>
              <div className="text-[11px] text-emerald-400 font-medium">Check in with coordinator at door</div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Present your approved <strong className="text-white">{activity.name}</strong> QR pass to the coordinator stationed at the entrance of {activity.room}.
            </p>
          </div>

          {/* Attendance Requirement Badge */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Certificate Requirement</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Attendance in {activity.room} is recorded individually. You must be approved and scanned present to receive the digital certificate for this activity.
            </p>
          </div>
        </div>
      </div>

      {/* Admin Edit Modal */}
      {editing && (
        <AdminEditActivityModal
          isOpen={editing}
          activity={activity}
          onClose={() => setEditing(false)}
          onSave={onUpdateActivity}
        />
      )}
    </div>
  );
}
