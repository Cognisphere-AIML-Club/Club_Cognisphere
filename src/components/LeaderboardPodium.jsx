import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Medal, 
  Award, 
  Crown, 
  Plus, 
  Sparkles, 
  ShieldCheck, 
  FileSpreadsheet, 
  RefreshCw, 
  Settings2, 
  Check 
} from 'lucide-react';
import AdminScoreModal from './AdminScoreModal';
import GoogleSheetsSyncModal from './GoogleSheetsSyncModal';
import { 
  subscribeActivitySheetConfig, 
  subscribeMasterSheetConfig,
  extractSheetInfo, 
  fetchGoogleSheetData, 
  syncGoogleSheetToScores,
  DEFAULT_SHEET_TABS
} from '../services/googleSheetsService';

export default function LeaderboardPodium({ 
  activity, 
  scores = [], 
  attendees = [], 
  isAdmin = false, 
  isCoordinator = false,
  isStaff = false,
  onPublishScore, 
  onUnpublishScore, 
  adminEmail = 'admin',
  activities = []
}) {
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [sheetConfig, setSheetConfig] = useState(null);
  const [masterConfig, setMasterConfig] = useState(null);
  const [quickSyncing, setQuickSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState('');

  // Subscribe to activity-specific sheet config
  useEffect(() => {
    if (!activity?.id) return;
    const unsub = subscribeActivitySheetConfig(activity.id, (cfg) => {
      setSheetConfig(cfg);
    });
    return () => unsub();
  }, [activity?.id]);

  // Subscribe to Master Workbook config (shared across all activities)
  useEffect(() => {
    const unsub = subscribeMasterSheetConfig((mCfg) => {
      setMasterConfig(mCfg);
    });
    return () => unsub();
  }, []);

  // Effective sheet file URL and tracked sheet tab name for this activity
  const effectiveSheetUrl = sheetConfig?.sheetUrl || masterConfig?.masterSheetUrl || '';
  const effectiveSheetName = sheetConfig?.sheetName || masterConfig?.sheetTabs?.[activity?.id] || DEFAULT_SHEET_TABS[activity?.id] || activity?.name || '';
  const effectiveAutoSync = sheetConfig?.autoSyncEnabled || masterConfig?.autoSyncEnabled || false;
  const canViewSyncInfo = (isAdmin || isCoordinator || isStaff) && Boolean(effectiveSheetUrl);

  // 1-Click Fast Sync from linked Google Sheet tab
  const handleQuickSync = async () => {
    if (!effectiveSheetUrl) {
      setShowSheetsModal(true);
      return;
    }

    try {
      setQuickSyncing(true);
      setSyncToast('');
      const info = extractSheetInfo(effectiveSheetUrl);
      const rows = await fetchGoogleSheetData({
        sheetId: info.sheetId,
        sheetName: effectiveSheetName || info.sheetName,
        gid: info.gid,
        publishedUrl: info.publishedUrl
      });

      const res = await syncGoogleSheetToScores({
        activityId: activity.id,
        sheetRows: rows,
        adminEmail,
        purgeUnlisted: false
      });

      setSyncToast(`Synced ${res.syncedCount} scores from tab "${effectiveSheetName}"!`);
      setTimeout(() => setSyncToast(''), 4000);
    } catch (err) {
      console.error('Quick sync failed:', err);
      alert(`Google Sheet Sync Error (Tab "${effectiveSheetName}"): ${err.message}`);
    } finally {
      setQuickSyncing(false);
    }
  };

  // Background Auto-Sync if enabled
  useEffect(() => {
    if (!isAdmin || !effectiveAutoSync || !effectiveSheetUrl) return;

    const interval = setInterval(() => {
      handleQuickSync();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [isAdmin, effectiveAutoSync, effectiveSheetUrl, effectiveSheetName, activity?.id]);

  // Normalize scores: safely parse integer rank and fallback to array order
  // "If no score is found in the sheet - hold the display of that participant from leaderboard, make it visible only once the score is uploaded"
  const normalizedScores = React.useMemo(() => {
    if (!Array.isArray(scores)) return [];

    // Filter: Hold participants with no score from display on the leaderboard
    const withScoresOnly = scores.filter(s => {
      if (s.score === null || s.score === undefined) return false;
      const str = String(s.score).trim();
      return str !== '' && str !== '-' && str !== '—';
    });

    return withScoresOnly.map((s, idx) => {
      const parsedRank = parseInt(s.rank, 10);
      return {
        ...s,
        numericRank: !isNaN(parsedRank) && parsedRank > 0 ? parsedRank : idx + 1
      };
    }).sort((a, b) => a.numericRank - b.numericRank);
  }, [scores]);

  const firstPlace = normalizedScores.find(s => s.numericRank === 1) || (normalizedScores.length > 0 ? normalizedScores[0] : null);
  const secondPlace = normalizedScores.find(s => s.numericRank === 2) || (normalizedScores.length > 1 && normalizedScores[0] === firstPlace ? normalizedScores[1] : null);
  const thirdPlace = normalizedScores.find(s => s.numericRank === 3) || (normalizedScores.length > 2 ? normalizedScores[2] : null);

  const hasAnyScores = normalizedScores.length > 0;

  return (
    <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-container">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
              Official Leaderboard &amp; Winners
            </h3>
            <p className="text-xs text-secondary">Top rankings and standings for {activity.name}</p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {effectiveSheetUrl ? (
              <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={handleQuickSync}
                  disabled={quickSyncing}
                  title={`Sync latest scores from sheet tab "${effectiveSheetName}"`}
                  className="px-2.5 py-1 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${quickSyncing ? 'animate-spin' : ''}`} />
                  <span>{quickSyncing ? 'Syncing...' : `Sync Tab "${effectiveSheetName}"`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSheetsModal(true)}
                  title="Open Google Sheets Sync Manager & Settings"
                  className="p-1 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 rounded-lg transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSheetsModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                title="Connect Google Sheet for fast score entry"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Connect Google Sheet</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manual Entry</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick Sync Notification Banner */}
      {syncToast && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 font-medium animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncToast}</span>
        </div>
      )}

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

          {/* Full Leaderboard Table (All Synced Participants) */}
          <div className="pt-4 border-t border-surface-container space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-on-surface">
              <span>Complete Standings ({normalizedScores.length} Participants)</span>
              {canViewSyncInfo && (
                <span className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Synced with "{effectiveSheetName}"
                </span>
              )}
            </div>

            <div className="border border-surface-container rounded-2xl overflow-hidden bg-surface-container-lowest">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container text-secondary text-[10px] uppercase font-bold border-b border-surface-container">
                  <tr>
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Participant Name</th>
                    <th className="py-2.5 px-3">USN</th>
                    <th className="py-2.5 px-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container font-medium">
                  {normalizedScores.map((s) => (
                    <tr 
                      key={s.id || s.participantId} 
                      className={`hover:bg-surface-container-low transition-colors ${
                        s.numericRank === 1 ? 'bg-amber-500/5 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                          s.numericRank === 1 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                          s.numericRank === 2 ? 'bg-slate-300/30 text-slate-700 dark:text-slate-200' :
                          s.numericRank === 3 ? 'bg-amber-700/20 text-amber-800 dark:text-amber-300' :
                          'text-secondary bg-surface-container'
                        }`}>
                          #{s.numericRank}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-on-surface">
                        {s.participantName}
                      </td>
                      <td className="py-2.5 px-3 text-secondary font-mono text-[11px]">
                        {s.participantUsn || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-primary font-mono font-bold">
                        {s.score || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
            Rounds are currently ongoing in <strong className="text-on-surface">{activity.room}</strong>. Winners and verified rankings will appear here immediately after organizers finalize evaluations.
          </p>
          {isAdmin && (
            <div className="pt-3 flex flex-wrap items-center justify-center gap-2.5">
              {effectiveSheetUrl ? (
                <button
                  type="button"
                  onClick={handleQuickSync}
                  disabled={quickSyncing}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs inline-flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <RefreshCw className={`w-3.5 h-3.5 ${quickSyncing ? 'animate-spin' : ''}`} />
                  <span>{quickSyncing ? 'Reading Sheet...' : `Sync Tab "${effectiveSheetName}" Now`}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSheetsModal(true)}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs inline-flex items-center gap-2 active:scale-95"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Connect Google Sheet (Fast Entry)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAdminModal(true)}
                className="py-2.5 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-primary font-bold text-xs transition-all shadow-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Manual 1-by-1 Entry</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Google Sheets Live Sync Modal */}
      {showSheetsModal && (
        <GoogleSheetsSyncModal
          isOpen={showSheetsModal}
          onClose={() => setShowSheetsModal(false)}
          activity={activity}
          activities={activities}
          existingConfig={{
            ...sheetConfig,
            sheetUrl: effectiveSheetUrl,
            sheetName: effectiveSheetName
          }}
          adminEmail={adminEmail}
          onSyncSuccess={(res) => {
            setSyncToast(`Synced ${res.syncedCount} entries from Google Sheet!`);
            setTimeout(() => setSyncToast(''), 4000);
            setShowSheetsModal(false);
          }}
        />
      )}

      {/* Admin Score Management Modal (Manual entry with USN search & 2-way Google Sheet push) */}
      {showAdminModal && (
        <AdminScoreModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          activity={activity}
          attendees={attendees}
          existingScores={scores}
          effectiveSheetUrl={effectiveSheetUrl}
          effectiveSheetName={effectiveSheetName}
          webAppUrl={masterConfig?.webAppUrl || sheetConfig?.webAppUrl}
          onPublish={onPublishScore}
          onUnpublish={onUnpublishScore}
          adminEmail={adminEmail}
        />
      )}
    </div>
  );
}
