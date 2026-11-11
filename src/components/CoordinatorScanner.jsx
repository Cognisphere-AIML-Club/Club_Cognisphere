import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ACTIVITIES, getActivityById } from '../data/activities';
import { 
  resolveParticipantByQr, 
  markAttendance, 
  getOfflineQueue, 
  syncOfflineQueue, 
  searchParticipantsForCoordinator 
} from '../services/attendanceService';
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  ChevronRight,
  Info
} from 'lucide-react';

export default function CoordinatorScanner({ user }) {
  const [selectedActivityId, setSelectedActivityId] = useState(() => {
    return localStorage.getItem('club_games_selected_activity') || ACTIVITIES[0].id;
  });

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { type: 'success' | 'already' | 'error', title, subtitle, detail, warning }
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Manual fallback search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Offline queue state
  const [offlineCount, setOfflineCount] = useState(() => getOfflineQueue().length);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  const scannerRef = useRef(null);
  const lastScannedQrRef = useRef(null);
  const lastScanTimeRef = useRef(0);

  const handleActivityChange = (e) => {
    const val = e.target.value;
    setSelectedActivityId(val);
    localStorage.setItem('club_games_selected_activity', val);
    setScanResult(null);
  };

  const currentActivity = ACTIVITIES.find(a => a.id === selectedActivityId) || ACTIVITIES[0];

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setOfflineCount(getOfflineQueue().length);
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const res = await syncOfflineQueue();
      setOfflineCount(res.remaining);
      if (res.synced > 0) {
        setScanResult({
          type: 'success',
          title: `Synced ${res.synced} Scans`,
          subtitle: 'All offline attendance records saved to database.',
        });
      }
    } catch (e) {}
    setSyncing(false);
  };

  const startScanner = async () => {
    setCameraError(null);
    setScanResult(null);

    try {
      const html5QrCode = new Html5Qrcode('qr-reader-container');
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        onQrCodeSuccess,
        () => {}
      );

      setScanning(true);
    } catch (err) {
      setCameraError('Unable to open camera. Please grant camera permissions or use the manual search below.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const onQrCodeSuccess = async (decodedText) => {
    const now = Date.now();
    if (lastScannedQrRef.current === decodedText && now - lastScanTimeRef.current < 3000) {
      return;
    }

    lastScannedQrRef.current = decodedText;
    lastScanTimeRef.current = now;

    if (navigator.vibrate) {
      navigator.vibrate(80);
    }

    await processAttendanceScan(decodedText);
  };

  const processAttendanceScan = async (rawQrText, directParticipant = null) => {
    setIsProcessing(true);
    try {
      let participant = directParticipant;

      if (!participant) {
        participant = await resolveParticipantByQr(rawQrText);
      }

      // Check if scanned pass was generated for a different activity
      let passMismatchedNotice = null;
      if (participant.passActivityId && participant.passActivityId !== selectedActivityId) {
        const passAct = getActivityById(participant.passActivityId);
        passMismatchedNotice = `Pass badge was for ${passAct.name} (${passAct.room}), but recorded present for ${currentActivity.name} (${currentActivity.room}).`;
      }

      const res = await markAttendance({
        activityId: selectedActivityId,
        participantId: participant.participantId,
        participantName: participant.name,
        participantUsn: participant.usn,
        scannedBy: user?.email || 'coordinator',
        passActivityId: participant.passActivityId,
      });

      if (res.status === 'marked_present') {
        setScanResult({
          type: 'success',
          title: 'Marked Present!',
          subtitle: participant.name,
          detail: `USN: ${participant.usn || 'N/A'} • ${currentActivity.name} (${currentActivity.room})`,
          warning: passMismatchedNotice,
        });
      } else if (res.status === 'already_marked') {
        setScanResult({
          type: 'already',
          title: 'Already Marked Present',
          subtitle: participant.name,
          detail: `USN: ${participant.usn || 'N/A'} • Already checked in for ${currentActivity.name}`,
        });
      } else if (res.status === 'queued_offline') {
        setOfflineCount(res.queueCount);
        setScanResult({
          type: 'success',
          title: 'Saved to Offline Queue',
          subtitle: participant.name,
          detail: `USN: ${participant.usn || 'N/A'} • Saved locally on device. Will auto-sync when online.`,
        });
      }
    } catch (err) {
      setScanResult({
        type: 'error',
        title: 'Scan Failed',
        subtitle: err.message || 'Unrecognized QR Code',
        detail: 'Please check if participant completed registration.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await searchParticipantsForCoordinator(searchQuery);
      setSearchResults(results);
    } catch (err) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  return (
    <div className="max-w-md mx-auto w-full space-y-5 animate-fadeIn">
      {/* Top Header Card: Activity Selection */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Attendance Scanner</h2>
              <p className="text-[11px] text-slate-400">Coordinator Check-in Desk</p>
            </div>
          </div>

          {/* Network & Offline Status */}
          <div className="flex items-center gap-2">
            {offlineCount > 0 && (
              <button
                onClick={triggerSync}
                disabled={syncing || !isOnline}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-all"
                title="Click to sync offline records"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                <span>{offlineCount} Queued</span>
              </button>
            )}

            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
              isOnline 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Activity Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            Active Room & Activity
          </label>
          <select
            value={selectedActivityId}
            onChange={handleActivityChange}
            className="w-full bg-slate-950 border border-slate-700 text-white font-medium rounded-xl p-3 text-xs focus:outline-none focus:border-emerald-500"
          >
            {ACTIVITIES.map((act) => (
              <option key={act.id} value={act.id}>
                {act.name} — {act.room} ({act.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Camera Viewport Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 overflow-hidden relative">
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col items-center justify-center min-h-[280px]">
          <div 
            id="qr-reader-container" 
            className={`w-full ${scanning ? 'block' : 'hidden'}`}
          />

          {!scanning && (
            <div className="text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto shadow-sm">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Camera is Idle</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Click below to scan participant passes for <span className="text-emerald-400 font-medium">{currentActivity.name}</span>
                </p>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-x-4 bottom-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
              {cameraError}
            </div>
          )}
        </div>

        <button
          onClick={scanning ? stopScanner : startScanner}
          className={`w-full py-3.5 px-4 font-semibold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-xs active:scale-[0.99] ${
            scanning
              ? 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/10'
          }`}
        >
          {scanning ? (
            <>
              <CameraOff className="w-4 h-4" />
              <span>Stop Scanner</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span>Start Camera Scanner</span>
            </>
          )}
        </button>
      </div>

      {/* Real-time Scan Result Banner */}
      {scanResult && (
        <div className={`p-4 rounded-2xl border shadow-xl animate-fadeIn space-y-2 ${
          scanResult.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
            : scanResult.type === 'already'
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              {scanResult.type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
              {scanResult.type === 'already' && <AlertTriangle className="w-6 h-6 text-amber-400" />}
              {scanResult.type === 'error' && <XCircle className="w-6 h-6 text-rose-400" />}
            </div>
            <div className="flex-1 space-y-0.5">
              <h3 className="font-bold text-sm tracking-tight">{scanResult.title}</h3>
              {scanResult.subtitle && (
                <p className="font-semibold text-white text-sm">{scanResult.subtitle}</p>
              )}
              {scanResult.detail && (
                <p className="text-xs opacity-90">{scanResult.detail}</p>
              )}
            </div>
          </div>

          {scanResult.warning && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{scanResult.warning}</span>
            </div>
          )}
        </div>
      )}

      {/* Manual Fallback Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Manual Search Fallback
          </h3>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search USN or Name (e.g. 1ST24 or Srujan)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs transition-colors"
          >
            {searching ? '...' : 'Search'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            {searchResults.map((p) => (
              <div 
                key={p.participantId} 
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-white">{p.name}</div>
                  <div className="text-[11px] font-mono text-emerald-400">USN: {p.usn || 'N/A'}</div>
                </div>

                <button
                  onClick={() => processAttendanceScan(p.qrId, p)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                >
                  <span>Mark Present</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
