import React, { useState } from 'react';
import { Trophy, Medal, Award, Crown, Plus, Sparkles, ShieldCheck } from 'lucide-react';
import AdminScoreModal from './AdminScoreModal';

export default function LeaderboardPodium({ 
  activity, 
  scores = [], 
  attendees = [], 
  isAdmin = false, 
  onPublishScore, 
  onUnpublishScore, 
  adminEmail = 'admin' 
}) {
  const [showAdminModal, setShowAdminModal] = useState(false);

  const firstPlace = scores.find(s => s.rank === 1);
  const secondPlace = scores.find(s => s.rank === 2);
  const thirdPlace = scores.find(s => s.rank === 3);
  const runnerUps = scores.filter(s => s.rank > 3).sort((a, b) => a.rank - b.rank);

  const hasAnyScores = scores.length > 0;

  return (
    <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-container">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-on-surface tracking-tight flex items-center gap-2">
              <span>Official Leaderboard & Winners</span>
              {hasAnyScores && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-tertiary-container border border-tertiary/30 text-on-tertiary-container">
                  Results Finalized
                </span>
              )}
            </h3>
            <p className="text-xs text-secondary">Top rankings and honorable mentions for {activity.name}</p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAdminModal(true)}
            className="self-start sm:self-auto px-3.5 py-1.5 bg-primary hover:bg-primary-container text-on-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manage Scores & Ranks</span>
          </button>
        )}
      </div>

      {/* When Results Are Published: Olympic Podium */}
      {hasAnyScores ? (
        <div className="space-y-6">
          {/* Top 3 Visual Podium */}
          <div className="pt-8 pb-4 flex items-end justify-center gap-2 sm:gap-4 max-w-xl mx-auto min-h-[220px]">
            {/* 2nd Place (Left) */}
            <div className="flex-1 flex flex-col items-center">
              {secondPlace ? (
                <div className="w-full flex flex-col items-center animate-fadeIn">
                  <div className="w-10 h-10 rounded-full bg-surface-container border border-surface-container-high text-secondary flex items-center justify-center mb-2 shadow-xs">
                    <Medal className="w-5 h-5 text-secondary" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-on-surface text-center line-clamp-1 max-w-[120px]">
                    {secondPlace.participantName}
                  </span>
                  {secondPlace.participantUsn && (
                    <span className="text-[10px] font-mono text-secondary">
                      {secondPlace.participantUsn}
                    </span>
                  )}
                  {secondPlace.score && (
                    <span className="mt-1 text-[11px] font-mono text-on-surface bg-surface-container px-2 py-0.5 rounded-full border border-surface-container-high">
                      {secondPlace.score}
                    </span>
                  )}
                  {/* Podium Block */}
                  <div className="w-full h-24 sm:h-28 mt-3 bg-surface-container-high border-t-2 border-secondary rounded-t-2xl flex flex-col items-center justify-center shadow-xs">
                    <span className="text-2xl font-black text-on-surface font-mono">2</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Silver</span>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center opacity-40">
                  <div className="w-full h-20 mt-auto bg-surface-container border-t border-surface-container-high rounded-t-2xl flex items-center justify-center">
                    <span className="text-xl font-bold text-secondary">2</span>
                  </div>
                </div>
              )}
            </div>

            {/* 1st Place (Center - Tallest) */}
            <div className="flex-1 flex flex-col items-center">
              {firstPlace ? (
                <div className="w-full flex flex-col items-center animate-fadeIn">
                  <div className="relative mb-2">
                    <div className="w-12 h-12 rounded-full bg-surface-container border-2 border-primary text-primary flex items-center justify-center shadow-xs">
                      <Trophy className="w-6 h-6 text-primary" />
                    </div>
                    <Crown className="w-4 h-4 text-primary absolute -top-2.5 left-1/2 -translate-x-1/2" />
                  </div>
                  <span className="text-sm sm:text-base font-extrabold text-primary text-center line-clamp-1 max-w-[130px]">
                    {firstPlace.participantName}
                  </span>
                  {firstPlace.participantUsn && (
                    <span className="text-[11px] font-mono text-secondary">
                      {firstPlace.participantUsn}
                    </span>
                  )}
                  {firstPlace.score && (
                    <span className="mt-1 text-[11px] font-mono text-on-primary font-bold bg-primary px-2.5 py-0.5 rounded-full shadow-xs">
                      {firstPlace.score}
                    </span>
                  )}
                  {/* Podium Block */}
                  <div className="w-full h-32 sm:h-36 mt-3 bg-primary border-t-2 border-primary-container rounded-t-2xl flex flex-col items-center justify-center shadow-xs">
                    <span className="text-3xl font-black text-on-primary font-mono">1</span>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-on-primary">Winner</span>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center opacity-40">
                  <div className="w-full h-28 mt-auto bg-surface-container border-t border-surface-container-high rounded-t-2xl flex items-center justify-center">
                    <span className="text-2xl font-bold text-secondary">1</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3rd Place (Right) */}
            <div className="flex-1 flex flex-col items-center">
              {thirdPlace ? (
                <div className="w-full flex flex-col items-center animate-fadeIn">
                  <div className="w-10 h-10 rounded-full bg-surface-container border border-surface-container-high text-secondary flex items-center justify-center mb-2 shadow-xs">
                    <Medal className="w-5 h-5 text-secondary" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-on-surface text-center line-clamp-1 max-w-[120px]">
                    {thirdPlace.participantName}
                  </span>
                  {thirdPlace.participantUsn && (
                    <span className="text-[10px] font-mono text-secondary">
                      {thirdPlace.participantUsn}
                    </span>
                  )}
                  {thirdPlace.score && (
                    <span className="mt-1 text-[11px] font-mono text-on-surface bg-surface-container px-2 py-0.5 rounded-full border border-surface-container-high">
                      {thirdPlace.score}
                    </span>
                  )}
                  {/* Podium Block */}
                  <div className="w-full h-20 sm:h-24 mt-3 bg-surface-container border-t-2 border-outline-variant rounded-t-2xl flex flex-col items-center justify-center shadow-xs">
                    <span className="text-2xl font-black text-on-surface font-mono">3</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Bronze</span>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center opacity-40">
                  <div className="w-full h-16 mt-auto bg-surface-container border-t border-surface-container-high rounded-t-2xl flex items-center justify-center">
                    <span className="text-xl font-bold text-secondary">3</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Runners-up List (Ranks 4+) */}
          {runnerUps.length > 0 && (
            <div className="pt-4 border-t border-surface-container space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                Honorable Mentions & Finalists:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {runnerUps.map((r) => (
                  <div 
                    key={r.id}
                    className="bg-surface-container-low border border-surface-container rounded-2xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-surface-container text-on-surface font-mono font-bold text-xs flex items-center justify-center">
                        #{r.rank}
                      </span>
                      <div>
                        <div className="font-semibold text-on-surface text-xs">{r.participantName}</div>
                        {r.participantUsn && (
                          <div className="text-[10px] font-mono text-secondary">{r.participantUsn}</div>
                        )}
                      </div>
                    </div>
                    {r.score && (
                      <span className="font-mono text-xs text-primary bg-surface-container px-2 py-0.5 rounded-lg">
                        {r.score}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty / Pending Evaluation State */
        <div className="py-8 px-4 rounded-2xl bg-surface-container-low border border-dashed border-surface-container text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-surface-container text-secondary flex items-center justify-center mx-auto">
            <Trophy className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-on-surface">
            Scores Not Yet Published
          </h4>
          <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed">
            Rounds are currently ongoing in <strong className="text-on-surface">{activity.room}</strong>. Winners and verified rankings will appear here immediately after the organizers finalize evaluations.
          </p>
          {isAdmin && (
            <div className="pt-2">
              <button
                onClick={() => setShowAdminModal(true)}
                className="py-2 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs transition-all shadow-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Publish 1st, 2nd, 3rd Winner Now</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Admin Score Management Modal */}
      {showAdminModal && (
        <AdminScoreModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          activity={activity}
          attendees={attendees}
          existingScores={scores}
          onPublish={onPublishScore}
          onUnpublish={onUnpublishScore}
          adminEmail={adminEmail}
        />
      )}
    </div>
  );
}

