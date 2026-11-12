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
  Info,
  SwitchCamera
} from 'lucide-react';

export default function CoordinatorScanner({ user }) {
  const [selectedActivityId, setSelectedActivityId] = useState(() => {
    return localStorage.getItem('club_games_selected_activity') || ACTIVITIES[0].id;
  });

  const [scanning, setScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
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

  const startScanner = async (targetCameraId = null) => {
    setCameraError(null);
    setScanResult(null);
    setIsStarting(true);

    try {
      // 1. Ensure any existing scanner instance is completely stopped & cleared
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (e) {}
        scannerRef.current = null;
      }

      // Check if container element exists in DOM
      const container = document.getElementById('qr-reader-container');
      if (!container) {
        throw new Error('Scanner container element not found in DOM.');
      }

      // 2. Discover available cameras
      let chosenCamId = targetCameraId || selectedCameraId;
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          if (!chosenCamId) {
            // Prefer back/rear environment camera if available on mobile
            const backCam = devices.find((d) => /back|rear|environment/i.test(d.label));
            chosenCamId = backCam ? backCam.id : devices[0].id;
            setSelectedCameraId(chosenCamId);
          }
        }
      } catch (listErr) {
        console.warn('Could not enumerate cameras:', listErr);
      }

      // 3. Initialize scanner on the visible container
      const html5QrCode = new Html5Qrcode('qr-reader-container');
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(minEdge * 0.72);
          return {
            width: Math.max(size, 180),
            height: Math.max(size, 180),
          };
        },
      };

      // 4. Start camera stream with multi-tier fallback
      let started = false;

      // Tier 1: If specific camera ID chosen, try that
      if (chosenCamId) {
        try {
          await html5QrCode.start(chosenCamId, config, onQrCodeSuccess, () => {});
          started = true;
        } catch (camErr) {
          console.warn('Failed with chosen camera ID, attempting ideal environment constraint:', camErr);
        }
      }

      // Tier 2: Try ideal environment (back camera on mobile, doesn't throw OverconstrainedError on Mac)
      if (!started) {
        try {
          await html5QrCode.start({ facingMode: { ideal: 'environment' } }, config, onQrCodeSuccess, () => {});
          started = true;
        } catch (envErr) {
          console.warn('Ideal environment camera failed, attempting user camera fallback:', envErr);
        }
      }

      // Tier 3: Try front / user camera (macOS FaceTime HD / laptop webcams)
      if (!started) {
        try {
          await html5QrCode.start({ facingMode: 'user' }, config, onQrCodeSuccess, () => {});
          started = true;
        } catch (userErr) {
          console.warn('User camera fallback failed, attempting basic stream:', userErr);
        }
      }

      // Tier 4: Fallback to exact environment as final try
      if (!started) {
        await html5QrCode.start({ facingMode: 'environment' }, config, onQrCodeSuccess, () => {});
      }

      // Ensure video element plays and has correct attributes
      setTimeout(() => {
        const videoEl = container.querySelector('video');
        if (videoEl) {
          videoEl.setAttribute('playsinline', 'true');
          videoEl.setAttribute('muted', 'true');
          if (videoEl.paused) {
            videoEl.play().catch((e) => console.warn('Video play catch:', e));
          }
        }
      }, 300);

      setScanning(true);
      setIsStarting(false);
    } catch (err) {
      console.error('Camera startup error:', err);
      setCameraError('Unable to open camera feed. Please check camera permissions in your browser or use the manual search below.');
      setScanning(false);
      setIsStarting(false);
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
    setIsStarting(false);
  };

  const handleFlipCamera = async () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    if (scanning) {
      await startScanner(nextCamera.id);
    }
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
          scannerRef.current.stop().catch(() => {});
        } catch (e) {}
      }
    };
  }, []);

  return (
    <div className="max-w-md mx-auto w-full space-y-5 animate-fadeIn">
      {/* Top Header Card: Activity Selection */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-surface-container text-primary flex items-center justify-center">
              <Camera className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-on-surface tracking-tight">Attendance Scanner</h2>
              <p className="text-[11px] text-secondary">Coordinator Check-in Desk</p>
            </div>
          </div>

          {/* Network & Offline Status */}
          <div className="flex items-center gap-2">
            {offlineCount > 0 && (
              <button
                onClick={triggerSync}
                disabled={syncing || !isOnline}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 transition-all"
                title="Click to sync offline records"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                <span>{offlineCount} Queued</span>
              </button>
            )}

            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isOnline 
                ? 'bg-tertiary-container text-on-tertiary-container border-tertiary-container' 
                : 'bg-error-container text-on-error-container border-error-container'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Activity Selector */}
        <div>
          <label className="block text-[11px] font-bold text-secondary mb-1.5 uppercase tracking-wider">
            Active Room &amp; Activity
          </label>
          <select
            value={selectedActivityId}
            onChange={handleActivityChange}
            className="w-full bg-surface-container-low border border-surface-container text-on-surface font-semibold rounded-xl p-3 text-xs focus:outline-none focus:border-primary cursor-pointer"
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
      <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-5 shadow-xs space-y-4 overflow-hidden relative">
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-surface-container-high flex flex-col items-center justify-center min-h-[300px]">
          {/* Always rendered in DOM with non-zero dimensions so Html5Qrcode calculates true width & height */}
          <div 
            id="qr-reader-container" 
            className="w-full min-h-[300px]"
          />

          {/* Idle / Loading State Overlay */}
          {(!scanning || isStarting) && (
            <div className="absolute inset-0 z-10 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
              {isStarting ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-surface-container-low text-primary flex items-center justify-center mx-auto shadow-xs">
                    <RefreshCw className="w-7 h-7 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Opening Camera...</p>
                    <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                      Please allow camera permission in your browser if prompted.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-xs">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Camera is Idle</p>
                    <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                      Click below to scan participant passes for <span className="text-primary-fixed font-bold">{currentActivity.name}</span>
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Live Scanner Active Indicator */}
          {scanning && !isStarting && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 text-[10px] font-bold text-white">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-ping" />
              <span>Scanning Active</span>
            </div>
          )}

          {/* Camera Error Banner */}
          {cameraError && (
            <div className="absolute inset-x-4 bottom-4 z-20 p-3 rounded-xl bg-error-container text-on-error-container text-xs text-center font-bold">
              {cameraError}
            </div>
          )}
        </div>

        {/* Controls: Start/Stop & Camera Flip */}
        <div className="flex gap-2">
          <button
            onClick={scanning ? stopScanner : () => startScanner()}
            disabled={isStarting}
            className={`flex-1 py-3.5 px-4 font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 text-xs active:scale-[0.99] ${
              scanning
                ? 'bg-error-container hover:bg-error-container/80 text-on-error-container border border-error/30'
                : 'bg-primary hover:bg-primary-container text-on-primary'
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
                <span>{isStarting ? 'Starting Camera...' : 'Start Camera Scanner'}</span>
              </>
            )}
          </button>

          {/* Camera Flip Button */}
          {cameras.length > 1 && scanning && (
            <button
              onClick={handleFlipCamera}
              className="p-3.5 rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container transition-colors"
              title="Flip Camera (Front/Back)"
              aria-label="Flip Camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Real-time Scan Result Banner */}
      {scanResult && (
        <div className={`p-4 rounded-2xl border shadow-xs animate-fadeIn space-y-2 ${
          scanResult.type === 'success' 
            ? 'bg-tertiary-container text-on-tertiary-container border-tertiary-container' 
            : scanResult.type === 'already'
            ? 'bg-secondary-container text-on-secondary-container border-secondary-container' 
            : 'bg-error-container text-on-error-container border-error-container'
        }`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              {scanResult.type === 'success' && <CheckCircle2 className="w-6 h-6 text-on-tertiary" />}
              {scanResult.type === 'already' && <AlertTriangle className="w-6 h-6 text-on-secondary" />}
              {scanResult.type === 'error' && <XCircle className="w-6 h-6 text-on-error" />}
            </div>
            <div className="flex-1 space-y-0.5">
              <h3 className="font-extrabold text-sm tracking-tight">{scanResult.title}</h3>
              {scanResult.subtitle && (
                <p className="font-bold text-sm">{scanResult.subtitle}</p>
              )}
              {scanResult.detail && (
                <p className="text-xs opacity-90">{scanResult.detail}</p>
              )}
            </div>
          </div>

          {scanResult.warning && (
            <div className="p-2.5 rounded-xl bg-surface-container text-on-surface text-[11px] font-semibold flex items-center gap-2">
              <Info className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
              <span>{scanResult.warning}</span>
            </div>
          )}
        </div>
      )}

      {/* Manual Fallback Search */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
            Manual Search Fallback
          </h3>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search USN or Name (e.g. 1ST24 or Srujan)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-surface-container-low border border-surface-container focus:border-primary rounded-xl px-3 py-2.5 text-xs text-on-surface placeholder:text-outline focus:outline-none"
          />
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="px-4 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold rounded-xl text-xs transition-colors"
          >
            {searching ? '...' : 'Search'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-surface-container">
            {searchResults.map((p) => (
              <div 
                key={p.participantId} 
                className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-surface-container hover:bg-surface-container transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-on-surface">{p.name}</div>
                  <div className="text-[11px] font-mono text-primary font-bold">USN: {p.usn || 'N/A'}</div>
                </div>

                <button
                  onClick={() => processAttendanceScan(p.qrId, p)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-lg text-xs flex items-center gap-1 transition-all active:scale-95 shadow-xs"
                >
                  <span>Mark Present</span>
                  <ChevronRight className="w-3 h-3 text-on-primary" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
