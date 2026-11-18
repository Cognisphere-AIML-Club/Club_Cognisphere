import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  X, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  Copy, 
  CheckCheck, 
  HelpCircle,
  Table,
  Layers,
  CheckCircle2,
  FolderSync,
  Settings,
  Settings2
} from 'lucide-react';
import { 
  extractSheetInfo, 
  fetchGoogleSheetData, 
  saveActivitySheetConfig, 
  saveMasterSheetConfig,
  saveMasterWebAppUrl,
  syncGoogleSheetToScores,
  syncAllActivitiesFromMasterSheet,
  subscribeMasterSheetConfig,
  DEFAULT_SHEET_TABS,
  detectAvailableSheetTabs,
  COMPLETE_APPS_SCRIPT_CODE
} from '../services/googleSheetsService';
import { ACTIVITIES } from '../data/activities';

export default function GoogleSheetsSyncModal({
  isOpen,
  onClose,
  activity,
  activities = ACTIVITIES,
  existingConfig = null,
  adminEmail = 'admin',
  onSyncSuccess,
  initialViewMode = 'single'
}) {
  const allActivities = activities && activities.length > 0 ? activities : ACTIVITIES;
  const [activeViewMode, setActiveViewMode] = useState(initialViewMode); // 'settings' | 'single' | 'all_tabs' | 'two_way'

  useEffect(() => {
    if (isOpen && initialViewMode) {
      setActiveViewMode(initialViewMode);
    }
  }, [isOpen, initialViewMode]);

  // Master Sheet & current tab state
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [webAppUrl, setWebAppUrl] = useState('');
  const [savingWebApp, setSavingWebApp] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [sheetTabsMap, setSheetTabsMap] = useState({ ...DEFAULT_SHEET_TABS });
  const [autoSync, setAutoSync] = useState(false);
  const [detectedTabs, setDetectedTabs] = useState([]);
  const [detectingTabs, setDetectingTabs] = useState(false);

  // Preview state
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewError, setPreviewError] = useState('');

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');
  const [syncAllResults, setSyncAllResults] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Subscribe to Master Sheet config
  useEffect(() => {
    const unsub = subscribeMasterSheetConfig((master) => {
      if (master) {
        if (master.masterSheetUrl && !sheetUrl) {
          setSheetUrl(master.masterSheetUrl);
        }
        if (master.webAppUrl && !webAppUrl) {
          setWebAppUrl(master.webAppUrl);
        }
        if (master.sheetTabs) {
          setSheetTabsMap(prev => ({ ...DEFAULT_SHEET_TABS, ...master.sheetTabs }));
        }
        if (typeof master.autoSyncEnabled === 'boolean') {
          setAutoSync(master.autoSyncEnabled);
        }
      }
    });
    return () => unsub();
  }, []);

  // Initialize current activity tab name
  useEffect(() => {
    if (activity?.id) {
      const currentTab = existingConfig?.sheetName || sheetTabsMap[activity.id] || DEFAULT_SHEET_TABS[activity.id] || activity.name;
      setSheetName(currentTab);
      if (existingConfig?.sheetUrl) {
        setSheetUrl(existingConfig.sheetUrl);
      }
    }
  }, [activity?.id, existingConfig]);

  if (!isOpen || !activity) return null;

  // Auto-detect available tabs in the spreadsheet
  const handleAutoDetectTabs = async () => {
    if (!sheetUrl.trim()) {
      setPreviewError('Please paste your Google Sheet URL first.');
      return;
    }
    const info = extractSheetInfo(sheetUrl);
    if (!info.isValid || !info.sheetId) {
      setPreviewError('Invalid Google Sheet URL.');
      return;
    }

    try {
      setDetectingTabs(true);
      setPreviewError('');
      const candidates = [
        ...Object.values(sheetTabsMap),
        ...allActivities.map(a => a.name)
      ];
      const tabs = await detectAvailableSheetTabs({ sheetId: info.sheetId, candidateNames: candidates });
      setDetectedTabs(tabs);
    } catch (err) {
      console.warn('Tab detection error:', err);
    } finally {
      setDetectingTabs(false);
    }
  };

  const handleTestAndPreview = async (tabToTest = null) => {
    const targetTab = tabToTest || sheetName;
    if (!sheetUrl.trim()) {
      setPreviewError('Please paste your Google Sheet URL or ID.');
      return;
    }

    try {
      setLoadingPreview(true);
      setPreviewError('');
      setSyncSuccessMsg('');

      const info = extractSheetInfo(sheetUrl);
      if (!info.isValid) {
        throw new Error('Invalid Google Sheet URL. Please copy the full link from your browser address bar.');
      }

      const rows = await fetchGoogleSheetData({
        sheetId: info.sheetId,
        sheetName: targetTab.trim(),
        gid: info.gid,
        publishedUrl: info.publishedUrl
      });

      if (!rows || rows.length === 0) {
        throw new Error(`Sheet tab "${targetTab}" was opened, but no participant rows were found. Make sure row 1 has headers (Rank, Name, USN, Score) and scores start on row 2.`);
      }

      setPreviewRows(rows);
    } catch (err) {
      console.error('Error fetching Google Sheet:', err);
      setPreviewError(err.message || 'Failed to read Google Sheet.');
      setPreviewRows([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSyncCurrentActivity = async (purgeUnlisted = false) => {
    if (!previewRows || previewRows.length === 0) {
      setPreviewError('Please click "Test & Preview Sheet Tab" first to verify rows.');
      return;
    }

    try {
      setSyncing(true);
      setPreviewError('');
      setSyncSuccessMsg('');

      // Update mapping
      const updatedTabs = { ...sheetTabsMap, [activity.id]: sheetName.trim() };
      setSheetTabsMap(updatedTabs);

      // Save master configuration
      await saveMasterSheetConfig({
        masterSheetUrl: sheetUrl,
        webAppUrl,
        sheetTabs: updatedTabs,
        adminEmail,
        autoSyncEnabled: autoSync
      });

      // Sync parsed rows to scores
      const result = await syncGoogleSheetToScores({
        activityId: activity.id,
        sheetRows: previewRows,
        adminEmail,
        purgeUnlisted
      });

      setSyncSuccessMsg(`Synced ${result.syncedCount} scores for "${activity.name}" from tab "${sheetName}"!`);
      if (onSyncSuccess) {
        onSyncSuccess(result);
      }
    } catch (err) {
      console.error('Failed to sync scores:', err);
      setPreviewError(err.message || 'Failed to sync to live leaderboard.');
    } finally {
      setSyncing(false);
    }
  };

  // 1-Click Sync ALL 5 Event Activities
  const handleSyncAllActivities = async () => {
    if (!sheetUrl.trim()) {
      setPreviewError('Please provide the Google Sheet URL.');
      return;
    }

    try {
      setSyncingAll(true);
      setPreviewError('');
      setSyncAllResults(null);

      // Save master config first
      await saveMasterSheetConfig({
        masterSheetUrl: sheetUrl,
        webAppUrl,
        sheetTabs: sheetTabsMap,
        adminEmail,
        autoSyncEnabled: autoSync
      });

      const res = await syncAllActivitiesFromMasterSheet({
        masterSheetUrl: sheetUrl,
        sheetTabs: sheetTabsMap,
        activities: allActivities,
        adminEmail
      });

      setSyncAllResults(res);
      setSyncSuccessMsg(`All-In-One Sync Complete: ${res.totalCount} scores updated across ${res.results.filter(r => r.status === 'success').length} activities!`);
      if (onSyncSuccess) {
        onSyncSuccess({ syncedCount: res.totalCount });
      }
    } catch (err) {
      console.error('Failed to sync all activities:', err);
      setPreviewError(err.message || 'Failed to sync all event activities.');
    } finally {
      setSyncingAll(false);
    }
  };

  const copyTemplateToClipboard = () => {
    const csvContent = `Rank,Participant Name,USN,Score,Notes\n1,Participant One,1ST24AI001,98.5,Round 1 Winner\n2,Participant Two,1ST24AI015,95.0,High accuracy\n3,Participant Three,1ST24CS042,92.0,Fast completion\n4,Participant Four,1ST24IS018,88.5,Finalist`;
    navigator.clipboard.writeText(csvContent);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  const currentTabName = sheetTabsMap[activity.id] || DEFAULT_SHEET_TABS[activity.id] || activity.name;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-6 sm:pt-14 bg-black/50 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-surface-container-lowest border border-surface-container rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl space-y-5 my-auto sm:my-0 text-on-surface">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-on-surface">
                Google Sheets Live Sync
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode Toggle: Current Activity Tab | All Event Tabs | Settings */}
        <div className="flex items-center gap-1.5 bg-surface-container-low border border-surface-container p-1 rounded-2xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveViewMode('single')}
            className={`flex-1 py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeViewMode === 'single'
                ? 'bg-surface-container text-primary font-bold shadow-2xs border border-surface-container-high'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>This Event Tab: {activity.name}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('all_tabs')}
            className={`flex-1 py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeViewMode === 'all_tabs'
                ? 'bg-surface-container text-primary font-bold shadow-2xs border border-surface-container-high'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All 5 Event Sheet Tabs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('settings')}
            className={`py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeViewMode === 'settings'
                ? 'bg-surface-container text-primary font-bold shadow-2xs border border-surface-container-high'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>

        {/* Success Banner */}
        {syncSuccessMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5 animate-fadeIn font-semibold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncSuccessMsg}</span>
          </div>
        )}

        {/* Error Banner */}
        {previewError && (
          <div className="p-3.5 rounded-2xl bg-error-container border border-error/30 text-on-error-container text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Sync Error:</span>
              <p>{previewError}</p>
            </div>
          </div>
        )}

        {/* MODE 0: SETTINGS & URLS */}
        {activeViewMode === 'settings' && (
          <div className="space-y-4 pt-1 animate-fadeIn">
            {/* Google Spreadsheet File URL */}
            <div className="bg-surface-container-low border border-surface-container rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Google Spreadsheet File URL</span>
                  </h4>
                  <p className="text-[11px] text-secondary">
                    Master spreadsheet containing sheet tabs for all competition activities
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelp(prev => !prev)}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Sharing guide</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="flex-1 bg-surface-container border border-surface-container-high focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!sheetUrl.trim()) return;
                    try {
                      await saveMasterSheetConfig({
                        masterSheetUrl: sheetUrl.trim(),
                        webAppUrl: webAppUrl.trim(),
                        sheetTabs: sheetTabsMap,
                        adminEmail,
                        autoSyncEnabled: autoSync
                      });
                      setSyncSuccessMsg('Spreadsheet File URL saved successfully!');
                    } catch (err) {
                      setPreviewError(err.message || 'Failed to save spreadsheet URL');
                    }
                  }}
                  disabled={!sheetUrl.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs disabled:opacity-50 shrink-0"
                >
                  Save File URL
                </button>
              </div>

              {/* Quick Sharing Guide Collapsible */}
              {showHelp && (
                <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container text-xs space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between font-bold text-primary">
                    <span>Workbook Setup Guide</span>
                    <button
                      type="button"
                      onClick={copyTemplateToClipboard}
                      className="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      {copiedTemplate ? <CheckCheck className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedTemplate ? 'Copied CSV' : 'Copy Header CSV'}</span>
                    </button>
                  </div>

                  <ol className="list-decimal list-inside space-y-1 text-secondary text-[11px] leading-relaxed">
                    <li>
                      <strong className="text-on-surface">Share Permission:</strong> In Google Sheets, click <strong className="text-on-surface">Share</strong> &rarr; General Access: <strong className="text-on-surface">"Anyone with the link can view"</strong>.
                    </li>
                    <li>
                      <strong className="text-on-surface">Multiple Tabs:</strong> At bottom of your file, click <strong className="text-on-surface">+ (Add Sheet)</strong> to create a tab for each event (e.g. <em>Reverse Prompt Engineering</em>, <em>Tech Quiz</em>, etc.).
                    </li>
                    <li>
                      <strong className="text-on-surface">Header Columns:</strong> In each sheet tab, row 1 should be: <code className="text-primary font-mono text-[10px]">Rank | Participant Name | USN | Score | Notes</code>.
                    </li>
                  </ol>
                </div>
              )}
            </div>

            {/* 2-Way Auto-Sort Google Apps Script & Web App URL (Moved inside Settings) */}
            <div className="bg-surface-container-low border border-surface-container rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>2-Way Auto-Sort Google Apps Script</span>
                  </h4>
                  <p className="text-[11px] text-secondary leading-relaxed">
                    Auto-sorts scores descending, calculates exact ranks in Column 1, and syncs approved student Name &amp; USN automatically.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(COMPLETE_APPS_SCRIPT_CODE);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 3000);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0 self-start sm:self-auto"
                >
                  {copiedScript ? <CheckCheck className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? 'Copied Full Script!' : 'Copy Complete Apps Script'}</span>
                </button>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="p-3.5 bg-surface-container-lowest border border-surface-container rounded-xl text-xs space-y-2 text-secondary leading-relaxed">
                <div className="font-bold text-on-surface text-[11px]">Quick Setup (2 Minutes):</div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px]">
                  <li>In your Google Sheet, click <strong className="text-on-surface">Extensions &rarr; Apps Script</strong>.</li>
                  <li>Replace any existing code with the copied script and click <strong className="text-on-surface">Save</strong> (💾).</li>
                  <li>In the function dropdown, select <strong className="text-on-surface">setupAutoSort</strong> and click <strong className="text-on-surface">Run</strong> (grants permissions &amp; sets 1-min trigger).</li>
                  <li>Click <strong className="text-on-surface">Deploy &rarr; New deployment</strong> &rarr; Select <strong className="text-on-surface">Web app</strong> &rarr; Execute as: <strong className="text-on-surface">Me</strong> &rarr; Who has access: <strong className="text-on-surface">"Anyone"</strong> &rarr; Click <strong className="text-on-surface">Deploy</strong>.</li>
                  <li>Copy the <strong className="text-on-surface">Web App URL</strong> and paste it below.</li>
                </ol>
              </div>

              {/* Web App URL Input */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider">
                  Google Apps Script Web App URL
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="flex-1 bg-surface-container border border-surface-container-high focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!webAppUrl.trim()) return;
                      try {
                        setSavingWebApp(true);
                        await saveMasterWebAppUrl({ webAppUrl: webAppUrl.trim(), adminEmail });
                        setSyncSuccessMsg('Web App URL saved! 2-way sync and score updates are active.');
                      } catch (err) {
                        setPreviewError(err.message || 'Failed to save Web App URL');
                      } finally {
                        setSavingWebApp(false);
                      }
                    }}
                    disabled={savingWebApp || !webAppUrl.trim()}
                    className="px-4 py-2 bg-primary text-on-primary font-bold rounded-xl text-xs transition-all shadow-xs disabled:opacity-50 shrink-0"
                  >
                    {savingWebApp ? 'Saving...' : 'Save Web App URL'}
                  </button>
                </div>
                <span className="text-[10px] text-secondary">
                  When saved, approving passes automatically adds participant Name &amp; USN to the sheet, manual score entry updates the sheet and auto-sorts immediately, and participants without scores are held from the leaderboard until scored.
                </span>
              </div>
            </div>

            {/* Background Auto-Sync Setting */}
            <div className="bg-surface-container-low border border-surface-container rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-on-surface block">Automated Background Polling</span>
                <span className="text-[11px] text-secondary block">
                  Automatically refresh leaderboard scores from the Google Sheet every 30 seconds when admin is viewing.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={async (e) => {
                    const val = e.target.checked;
                    setAutoSync(val);
                    if (sheetUrl.trim()) {
                      await saveMasterSheetConfig({
                        masterSheetUrl: sheetUrl.trim(),
                        webAppUrl: webAppUrl.trim(),
                        sheetTabs: sheetTabsMap,
                        adminEmail,
                        autoSyncEnabled: val
                      });
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        )}

        {/* MODE 1: SINGLE EVENT TAB TRACKING & PREVIEW */}
        {activeViewMode === 'single' && (
          <div className="space-y-4 pt-1 border-t border-surface-container animate-fadeIn">
            {/* Sheet URL Quick Indicator */}
            {sheetUrl ? (
              <div className="flex items-center justify-between text-xs bg-surface-container-low px-3.5 py-2 rounded-2xl border border-surface-container text-secondary">
                <div className="flex items-center gap-2 truncate max-w-md">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-mono text-xs text-on-surface truncate">{sheetUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveViewMode('settings')}
                  className="text-primary hover:underline text-xs font-semibold shrink-0 ml-2 flex items-center gap-1"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Change in Settings</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>No Google Sheet URL connected yet.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveViewMode('settings')}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Configure in Settings</span>
                </button>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-on-surface">
                  Tracked Sheet Tab Name for <span className="text-primary">"{activity.name}"</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoDetectTabs}
                  disabled={detectingTabs || !sheetUrl.trim()}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold disabled:opacity-40"
                >
                  <RefreshCw className={`w-3 h-3 ${detectingTabs ? 'animate-spin' : ''}`} />
                  <span>Scan Available Tabs</span>
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Reverse Prompt Engineering or AI Prompting"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  className="flex-1 bg-surface-container border border-surface-container-high focus:border-primary rounded-xl py-2 px-3 text-xs text-on-surface focus:outline-none font-semibold"
                />
                <button
                  type="button"
                  onClick={() => handleTestAndPreview()}
                  disabled={loadingPreview || !sheetUrl.trim() || !sheetName.trim()}
                  className="py-2 px-4 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-primary font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPreview ? 'animate-spin' : ''}`} />
                  <span>{loadingPreview ? 'Testing...' : 'Test & Preview Tab'}</span>
                </button>
              </div>

              {/* Quick Tab Selection Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-secondary font-medium">Quick suggestions:</span>
                {[
                  DEFAULT_SHEET_TABS[activity.id] || activity.name,
                  activity.name,
                  activity.room,
                  'Sheet1'
                ].filter((v, i, a) => a.indexOf(v) === i).map((chipName) => (
                  <button
                    key={chipName}
                    type="button"
                    onClick={() => {
                      setSheetName(chipName);
                      handleTestAndPreview(chipName);
                    }}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-all ${
                      sheetName === chipName
                        ? 'bg-primary text-on-primary border-primary font-bold'
                        : 'bg-surface-container hover:bg-surface-container-high text-secondary border-surface-container-high'
                    }`}
                  >
                    {chipName}
                  </button>
                ))}

                {detectedTabs.map((dt) => (
                  <button
                    key={dt.name}
                    type="button"
                    onClick={() => {
                      setSheetName(dt.name);
                      handleTestAndPreview(dt.name);
                    }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    <span>{dt.name} ({dt.rowCount} rows)</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview of Parsed Rows */}
            {previewRows.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-on-surface flex items-center gap-1.5">
                    <Table className="w-4 h-4 text-primary" />
                    <span>Preview: {previewRows.length} Participants from Tab "{sheetName}"</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    Ready to Push Live
                  </span>
                </div>

                {/* Table */}
                <div className="border border-surface-container rounded-2xl overflow-hidden max-h-48 overflow-y-auto no-scrollbar bg-surface-container-lowest">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container text-secondary text-[10px] uppercase font-bold sticky top-0 border-b border-surface-container">
                      <tr>
                        <th className="py-2 px-3">Rank</th>
                        <th className="py-2 px-3">Participant Name</th>
                        <th className="py-2 px-3">USN</th>
                        <th className="py-2 px-3 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container font-medium">
                      {previewRows.map((r, idx) => (
                        <tr 
                          key={idx} 
                          className={`hover:bg-surface-container-low transition-colors ${
                            r.rank === 1 ? 'bg-amber-500/5 font-semibold' : ''
                          }`}
                        >
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                              r.rank === 1 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                              r.rank === 2 ? 'bg-slate-300/30 text-slate-700 dark:text-slate-200' :
                              r.rank === 3 ? 'bg-amber-700/20 text-amber-800 dark:text-amber-300' :
                              'text-secondary'
                            }`}>
                              #{r.rank}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-on-surface">
                            {r.participantName}
                          </td>
                          <td className="py-2 px-3 text-secondary font-mono text-[11px]">
                            {r.participantUsn || '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-primary font-mono font-bold">
                            {r.score || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-secondary font-medium">
                    Olympic Podium will update immediately
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSyncCurrentActivity(false)}
                    disabled={syncing}
                    className="py-2.5 px-5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{syncing ? 'Pushing...' : `Sync Tab "${sheetName}" to Leaderboard`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: ALL 5 EVENT SHEET TABS MANAGER */}
        {activeViewMode === 'all_tabs' && (
          <div className="space-y-4 pt-1 border-t border-surface-container animate-fadeIn">
            {/* Sheet URL Quick Indicator */}
            {sheetUrl ? (
              <div className="flex items-center justify-between text-xs bg-surface-container-low px-3.5 py-2 rounded-2xl border border-surface-container text-secondary">
                <div className="flex items-center gap-2 truncate max-w-md">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-mono text-xs text-on-surface truncate">{sheetUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveViewMode('settings')}
                  className="text-primary hover:underline text-xs font-semibold shrink-0 ml-2 flex items-center gap-1"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Change in Settings</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>No Google Sheet URL connected yet.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveViewMode('settings')}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Configure in Settings</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Event Sheet Tabs Mapping (All 5 Activities)
                </h4>
                <p className="text-[11px] text-secondary">
                  Specify the sheet tab name inside your workbook for each competition room
                </p>
              </div>

              <button
                type="button"
                onClick={handleSyncAllActivities}
                disabled={syncingAll || !sheetUrl.trim()}
                className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <FolderSync className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
                <span>{syncingAll ? 'Syncing All...' : 'Sync All 5 Sheets Now'}</span>
              </button>
            </div>

            {/* List of 5 activities with their sheet name inputs */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {allActivities.map((act) => {
                const assignedTab = sheetTabsMap[act.id] || DEFAULT_SHEET_TABS[act.id] || act.name;
                const result = syncAllResults?.results?.find(r => r.activityId === act.id);

                return (
                  <div 
                    key={act.id} 
                    className="p-3 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="min-w-[160px]">
                      <div className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                        <span>{act.name}</span>
                        {act.id === activity.id && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-primary/20 text-primary">Current</span>
                        )}
                      </div>
                      <span className="text-[10px] text-secondary font-mono">{act.room} &bull; {act.category}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-1 max-w-sm">
                      <span className="text-[11px] text-secondary font-medium shrink-0">Tab Name:</span>
                      <input
                        type="text"
                        value={assignedTab}
                        onChange={(e) => {
                          setSheetTabsMap(prev => ({
                            ...prev,
                            [act.id]: e.target.value
                          }));
                        }}
                        placeholder={act.name}
                        className="flex-1 bg-surface-container border border-surface-container-high focus:border-primary rounded-xl py-1.5 px-2.5 text-xs text-on-surface font-semibold"
                      />
                    </div>

                    {result && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        result.status === 'success' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' :
                        result.status === 'empty' ? 'bg-amber-500/15 text-amber-700' :
                        'bg-error-container text-on-error-container'
                      }`}>
                        {result.status === 'success' ? `✓ ${result.syncedCount} synced` : result.status}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-secondary">
              <span>All 5 tabs will be read in a single batch from the file above.</span>
              <button
                type="button"
                onClick={async () => {
                  await saveMasterSheetConfig({
                    masterSheetUrl: sheetUrl,
                    webAppUrl,
                    sheetTabs: sheetTabsMap,
                    adminEmail,
                    autoSyncEnabled: autoSync
                  });
                  setSyncSuccessMsg('Workbook sheet tab names saved successfully!');
                }}
                className="font-bold text-primary hover:underline"
              >
                Save Tab Names Only
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
