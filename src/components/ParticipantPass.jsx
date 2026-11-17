import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { ACTIVITIES } from '../data/activities';
import { 
  CheckCircle2, 
  Download, 
  Loader2, 
  Check, 
  Lock, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Calendar,
  CalendarDays,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { 
  subscribeToUserPassRequests, 
  subscribeToPassConfig 
} from '../services/passApprovalService';
import { getOrGenerateGamePass } from '../services/gamePassService';
import { subscribeToUserAttendance } from '../services/attendanceService';

const DEFAULT_PASS_CONFIG = {
  passSystemEnabled: true, // Master disable toggle: if false, displays "No events taking place currently"
  showDownloadButton: true,
  hidePassAfterAttendance: true, // Hide active QR pass once attendance has been scanned & marked
  hiddenActivityIds: [], // Activity IDs toggled OFF (taken out of participant pass selection dropdown)
  panelDismissedActivityIds: [], // Activity IDs dismissed with '✕' from admin control panel (searchable to restore)
};

export default function ParticipantPass({ 
  profile, 
  onEditProfile, 
  onGoToEvents,
  initialActivityId = null, 
  user = null, 
  isStaff = false,
  isAdmin = false,
  activities = ACTIVITIES
}) {
  const allActivities = activities && activities.length > 0 ? activities : ACTIVITIES;

  const [userRequests, setUserRequests] = useState({});
  const [userAttendance, setUserAttendance] = useState({});

  const qrCanvasRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [gamePass, setGamePass] = useState(null);

  // Admin Customization Config State
  const [passConfig, setPassConfig] = useState(() => {
    try {
      const cached = localStorage.getItem('cognisphere_pass_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...DEFAULT_PASS_CONFIG,
          ...parsed,
          hiddenActivityIds: Array.isArray(parsed.hiddenActivityIds) ? parsed.hiddenActivityIds : [],
          panelDismissedActivityIds: Array.isArray(parsed.panelDismissedActivityIds) ? parsed.panelDismissedActivityIds : []
        };
      }
      return DEFAULT_PASS_CONFIG;
    } catch (e) {
      return DEFAULT_PASS_CONFIG;
    }
  });

  // Calculate visible activities for participants (excluding hiddenActivityIds AND panelDismissedActivityIds)
  const hiddenIds = Array.isArray(passConfig.hiddenActivityIds) ? passConfig.hiddenActivityIds : [];
  const dismissedIds = Array.isArray(passConfig.panelDismissedActivityIds) ? passConfig.panelDismissedActivityIds : [];
  const visibleActivities = allActivities.filter(a => !hiddenIds.includes(a.id) && !dismissedIds.includes(a.id));

  // Selection dropdown displays all activities where participant has an approved pass (ALWAYS accessible!),
  // plus requested pending passes that are visible.
  // Staff/Admins can preview all enabled activities for testing.
  const displayActivities = allActivities.filter(act => {
    if (isStaff) return !hiddenIds.includes(act.id) && !dismissedIds.includes(act.id);
    const req = userRequests[act.id];
    // APPROVED passes are ALWAYS displayed for the attendee
    if (req?.status === 'approved') return true;
    // PENDING passes are displayed as long as activity is not hidden
    if (req?.status === 'pending') {
      return !hiddenIds.includes(act.id) && !dismissedIds.includes(act.id);
    }
    return false;
  });

  const [selectedActivityId, setSelectedActivityId] = useState(() => {
    if (initialActivityId && displayActivities.some(a => a.id === initialActivityId)) {
      return initialActivityId;
    }
    return displayActivities[0]?.id || visibleActivities[0]?.id || allActivities[0]?.id || '';
  });
  // Keep selectedActivityId valid when displayActivities change
  useEffect(() => {
    if (displayActivities.length > 0) {
      const isCurrentVisible = displayActivities.some(a => a.id === selectedActivityId);
      if (!isCurrentVisible) {
        const matchInitial = initialActivityId && displayActivities.find(a => a.id === initialActivityId);
        const matchApproved = displayActivities.find(a => userRequests[a.id]?.status === 'approved');
        const nextId = matchInitial?.id || matchApproved?.id || displayActivities[0]?.id;
        if (nextId) setSelectedActivityId(nextId);
      }
    }
  }, [displayActivities, selectedActivityId, initialActivityId, userRequests]);

  useEffect(() => {
    if (initialActivityId) {
      setSelectedActivityId(initialActivityId);
    }
  }, [initialActivityId]);

  const currentUserId = user?.uid || profile?.uid;

  // Subscribe to real-time pass approval statuses
  useEffect(() => {
    if (!currentUserId) {
      setUserRequests({});
      return;
    }
    const unsubscribe = subscribeToUserPassRequests(currentUserId, (map) => {
      setUserRequests(map);
    });
    return () => unsubscribe();
  }, [currentUserId]);

  // Subscribe to real-time attendance records for this participant
  useEffect(() => {
    if (!currentUserId) {
      setUserAttendance({});
      return;
    }
    const unsubscribe = subscribeToUserAttendance(currentUserId, (map) => {
      setUserAttendance(map);
    });
    return () => unsubscribe();
  }, [currentUserId]);

  // Subscribe to remote pass layout config in Firestore
  useEffect(() => {
    const unsub = subscribeToPassConfig((remoteConfig) => {
      if (remoteConfig) {
        const merged = { 
          ...DEFAULT_PASS_CONFIG, 
          ...remoteConfig,
          hiddenActivityIds: Array.isArray(remoteConfig.hiddenActivityIds) ? remoteConfig.hiddenActivityIds : [],
          panelDismissedActivityIds: Array.isArray(remoteConfig.panelDismissedActivityIds) ? remoteConfig.panelDismissedActivityIds : []
        };
        setPassConfig(merged);
        try {
          localStorage.setItem('cognisphere_pass_config', JSON.stringify(merged));
        } catch (e) {}
      }
    });
    return () => unsub();
  }, []);

  const currentActivity = (displayActivities.length > 0
    ? (displayActivities.find(a => a.id === selectedActivityId) || displayActivities[0])
    : (visibleActivities[0] || allActivities[0])) || null;

  const displayName = profile?.name || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || user?.displayName || 'Participant';

  // Request status for this game
  const request = currentActivity?.id ? userRequests[currentActivity.id] : null;
  const isApproved = Boolean(isStaff || request?.status === 'approved');
  const isPending = Boolean(!isStaff && request?.status === 'pending');
  const isRejected = Boolean(!isStaff && request?.status === 'rejected');
  const isUnrequested = Boolean(!request && !isStaff);

  // Attendance status for this game
  const attendanceRecord = currentActivity?.id ? userAttendance[currentActivity.id] : null;
  const isAttendanceMarked = Boolean(attendanceRecord);
  const shouldHideForAttendance = Boolean((passConfig.hidePassAfterAttendance ?? true) && isAttendanceMarked);

  // Automatically load or generate single active pass for this USN & game (ONLY when approved or staff preview)
  useEffect(() => {
    if (!currentUserId || !currentActivity?.id) return;
    if (!isApproved) {
      setGamePass(null);
      return;
    }
    let isMounted = true;
    const currentUsn = profile?.usn || request?.participantUsn || '';

    const loadGamePass = async () => {
      try {
        const p = await getOrGenerateGamePass({
          activityId: currentActivity?.id,
          usn: currentUsn || `PART_${currentUserId.slice(0, 6)}`,
          participantId: currentUserId,
          name: displayName,
          forceNew: false,
        });
        if (isMounted && p) {
          setGamePass(p);
        }
      } catch (err) {
        console.warn('Game pass load error:', err);
      }
    };

    loadGamePass();
    return () => { isMounted = false; };
  }, [currentActivity?.id, profile?.usn, request?.participantUsn, currentUserId, displayName, isApproved]);

  if (!user && !profile) {
    return null;
  }

  // Date expiration check: compare today (YYYY-MM-DD) vs activeEventDate
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const activeEventDate = currentActivity?.eventDate || '2026-11-24';
  const todayStr = getTodayStr();
  const isExpired = Boolean(activeEventDate && todayStr > activeEventDate);

  // Active game pass for this USN (One USN gets only one active QR per game)
  const actId = currentActivity?.id || 'pass';
  const fallbackQrId = profile?.qrId || (currentUserId ? `qr_${currentUserId.slice(0, 8)}_${actId}` : 'pass_guest');
  const activeQrId = gamePass?.qrId || fallbackQrId;
  const activityQrValue = gamePass?.qrValue || `${actId}_${activeQrId}`;
  const passIdSnippet = `${actId.slice(0, 3).toUpperCase()}-${activeQrId.slice(-6).toUpperCase()}`;

  const isSystemActive = passConfig.passSystemEnabled ?? true;

  const handleDownload = async () => {
    if (!currentActivity) return;
    if (!isApproved) {
      alert('Only approved passes can be downloaded.');
      return;
    }
    if (shouldHideForAttendance) {
      alert('Attendance has already been marked for this event. Entry pass has been redeemed.');
      return;
    }
    try {
      setDownloading(true);

      // 1. Resolve QR code drawable source with multi-tier fallback
      let qrSource = null;

      // Method 1: Check hidden offscreen canvas
      const hiddenCanvas = document.querySelector('#pass-hidden-qr-canvas canvas');
      if (hiddenCanvas && hiddenCanvas.width > 0) {
        qrSource = hiddenCanvas;
      }

      // Method 2: Convert visible or offscreen SVG to Image
      if (!qrSource) {
        const svgEl = document.getElementById('participant-visible-qr-svg');
        if (svgEl) {
          try {
            const svgData = new XMLSerializer().serializeToString(svgEl);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = url;
            });
            qrSource = img;
          } catch (e) {
            console.warn('SVG capture fallback error:', e);
          }
        }
      }

      // Method 3: Wait a short tick and re-check canvas
      if (!qrSource) {
        await new Promise(r => setTimeout(r, 80));
        const retryCanvas = document.querySelector('#pass-hidden-qr-canvas canvas');
        if (retryCanvas && retryCanvas.width > 0) {
          qrSource = retryCanvas;
        }
      }

      if (!qrSource) {
        throw new Error('QR code element is still generating. Please try again in a moment.');
      }

      // 2. Create high-resolution export canvas (800 x 1040 px) - 80% QR Code Width
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1040;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize canvas context');

      // Helper for clean rounded rectangle across all browser engines
      const drawRoundRect = (x, y, width, height, radius) => {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      // 1. Surface Background (#ffffff)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Card Outer Border (#e5eeff)
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#e5eeff';
      drawRoundRect(30, 30, canvas.width - 60, canvas.height - 60, 24);
      ctx.stroke();

      // 3. Top Accent Line (Primary #004ac6 or Error #ba1a1a if expired)
      ctx.fillStyle = isExpired ? '#ba1a1a' : '#004ac6';
      ctx.fillRect(32, 30, canvas.width - 64, 10);

      // 4. Header: Event Title
      const eventHeaderTitle = 'COGNISPHERE • CLUB GAMES 2026';
      ctx.fillStyle = '#565e74';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(eventHeaderTitle, canvas.width / 2, 70);

      // 5. Activity Name
      ctx.fillStyle = isExpired ? '#ba1a1a' : '#004ac6';
      ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(currentActivity?.name ? currentActivity.name.toUpperCase() : 'EVENT PASS', canvas.width / 2, 106);

      // 6. Participant Name
      ctx.fillStyle = '#0b1c30';
      ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(displayName, canvas.width / 2, 146);

      // 7. Status Pill (Flag if expired)
      const statusPillWidth = 300;
      const statusPillHeight = 32;
      const statusPillX = (canvas.width - statusPillWidth) / 2;
      const statusPillY = 168;

      if (isExpired) {
        ctx.fillStyle = '#ba1a1a';
      } else if (isApproved) {
        ctx.fillStyle = '#007d55';
      } else if (isPending) {
        ctx.fillStyle = '#565e74';
      } else {
        ctx.fillStyle = '#004ac6';
      }

      drawRoundRect(statusPillX, statusPillY, statusPillWidth, statusPillHeight, 16);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const statusText = isExpired
        ? '⚠ EXPIRED PASS • EVENT CONCLUDED'
        : isApproved 
        ? '✓ APPROVED ENTRY PASS' 
        : isPending 
        ? '⏳ PENDING REVIEW' 
        : 'PARTICIPANT ENTRY PASS';
      ctx.fillText(statusText, canvas.width / 2, statusPillY + 21);

      // 8. White QR Code Container - Occupies 80% of canvas width (640px)
      const qrBoxSize = 640; // 80% of 800px
      const qrBoxX = (canvas.width - qrBoxSize) / 2; // 80px
      const qrBoxY = 215;

      ctx.fillStyle = '#f8f9ff';
      drawRoundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
      ctx.fill();
      ctx.strokeStyle = isExpired ? '#ffdad6' : '#e5eeff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw QR Image inside container (592 x 592 px)
      const qrPadding = 24;
      const qrDrawSize = qrBoxSize - (qrPadding * 2);
      ctx.drawImage(qrSource, qrBoxX + qrPadding, qrBoxY + qrPadding, qrDrawSize, qrDrawSize);

      // 9. Venue, Time & Date Container (Replaces bottom instructional text)
      const infoY = qrBoxY + qrBoxSize + 18; // 873px
      const infoWidth = qrBoxSize; // 640px
      const infoHeight = 120;
      const infoX = qrBoxX; // 80px

      ctx.fillStyle = '#f1f4fb';
      drawRoundRect(infoX, infoY, infoWidth, infoHeight, 20);
      ctx.fill();
      ctx.strokeStyle = isExpired ? '#ffdad6' : '#dbe2f1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Venue / Room Location Line
      ctx.fillStyle = '#565e74';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VENUE / ROOM LOCATION', canvas.width / 2, infoY + 25);

      ctx.fillStyle = '#0b1c30';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(currentActivity?.room || 'Main Venue', canvas.width / 2, infoY + 52);

      // Divider Line between Venue and Schedule
      ctx.strokeStyle = '#dbe2f1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(infoX + 30, infoY + 64);
      ctx.lineTo(infoX + infoWidth - 30, infoY + 64);
      ctx.stroke();

      // Date & Time Schedule Line
      ctx.fillStyle = '#565e74';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('SCHEDULE (DATE & TIME)', canvas.width / 2, infoY + 82);

      ctx.fillStyle = '#004ac6';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const scheduleStr = `DATE: ${activeEventDate}  •  TIME: ${currentActivity?.scheduledTime || 'Event Hours'}`;
      ctx.fillText(scheduleStr, canvas.width / 2, infoY + 105);

      // 11. Trigger Download with Blob & dataURL fallback
      const filename = `Pass_${currentActivity?.id || 'event'}_${displayName.replace(/[^a-zA-Z0-9]/g, '_')}${isExpired ? '_EXPIRED' : ''}.png`;

      await new Promise((resolve) => {
        if (canvas.toBlob) {
          canvas.toBlob((blob) => {
            if (!blob) {
              const dataUrl = canvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.download = filename;
              link.href = dataUrl;
              document.body.appendChild(link);
              link.click();
              setTimeout(() => {
                document.body.removeChild(link);
                resolve();
              }, 500);
              return;
            }
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = filename;
            link.href = blobUrl;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
              URL.revokeObjectURL(blobUrl);
              resolve();
            }, 1000);
          }, 'image/png');
        } else {
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = filename;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            resolve();
          }, 500);
        }
      });

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Download pass error:', err);
      alert(err.message || 'Unable to generate pass image. Please take a screenshot as a backup.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full space-y-5 animate-fadeIn">
      {/* Hidden off-screen Canvas unconditionally mounted to source high-res QR for badge download */}
      <div 
        id="pass-hidden-qr-canvas" 
        style={{ 
          position: 'fixed', 
          left: '-9999px', 
          top: '-9999px', 
          width: '700px', 
          height: '700px', 
          opacity: 0, 
          pointerEvents: 'none',
          zIndex: -9999
        }} 
        aria-hidden="true"
      >
        <QRCodeCanvas
          value={activityQrValue}
          size={700}
          level="M"
          includeMargin={true}
        />
      </div>

      {/* ========================================================================= */}
      {/* DISABLED STATE: If Pass System is full-disabled by Admin                  */}
      {/* ========================================================================= */}
      {!isSystemActive ? (
        <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-8 sm:p-10 text-center space-y-5 shadow-xs animate-fadeIn">
          <div className="w-16 h-16 rounded-3xl bg-surface-container text-secondary flex items-center justify-center mx-auto shadow-xs">
            <CalendarDays className="w-8 h-8 text-secondary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              No events taking place currently
            </h2>
            <p className="text-xs sm:text-sm text-secondary leading-relaxed max-w-xs mx-auto">
              Entry passes are currently closed. Explore our upcoming competitions, schedules, and club initiatives on the Events Hub.
            </p>
          </div>

          {onGoToEvents && (
            <button
              onClick={onGoToEvents}
              className="py-3 px-6 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-2xl text-xs sm:text-sm transition-all inline-flex items-center gap-2 shadow-xs active:scale-95"
            >
              <CalendarDays className="w-4 h-4 text-on-primary" />
              <span>Go to Events and Hub</span>
              <ArrowRight className="w-4 h-4 text-on-primary" />
            </button>
          )}

          {isAdmin && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-700 font-semibold text-center">
              Admin Notice: The pass system is toggled off. Click &ldquo;Edit Layout&rdquo; above to re-enable it.
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* ACTIVE PASS SYSTEM STATE                                                  */
        /* ========================================================================= */
        <>
          {/* Date Expiration Flag Warning */}
          {isExpired && (
            <div className="bg-error-container text-on-error-container border border-error/30 rounded-2xl p-4 text-xs flex items-start gap-3 shadow-xs animate-fadeIn">
              <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">Pass Concluded & Expired ({activeEventDate})</span>
                <p className="opacity-90 leading-relaxed">
                  The scheduled date for this event has passed. This QR code is preserved for your records but is no longer valid for room check-in.
                </p>
              </div>
            </div>
          )}

          {/* If no requested/approved passes, show clean empty state; else show dropdown + pass card */}
          {displayActivities.length === 0 ? (
            <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-8 sm:p-10 text-center space-y-4 shadow-xs animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl bg-surface-container text-secondary flex items-center justify-center mx-auto shadow-xs">
                <CalendarDays className="w-7 h-7 text-secondary" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-on-surface">
                  No Passes Requested Yet
                </h3>
                <p className="text-xs text-secondary max-w-xs mx-auto leading-relaxed">
                  You haven&apos;t requested any event passes yet. Browse competitions and events on the Events Hub to request participation passes.
                </p>
              </div>
              {onGoToEvents && (
                <button
                  onClick={onGoToEvents}
                  className="py-2.5 px-5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-2xl text-xs inline-flex items-center gap-2 shadow-xs active:scale-95 transition-all mx-auto"
                >
                  <CalendarDays className="w-4 h-4 text-on-primary" />
                  <span>Browse Events Hub</span>
                  <ArrowRight className="w-4 h-4 text-on-primary" />
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Full-Width Dropdown to select a specific requested/approved event pass */}
              <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-4 sm:p-5 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-secondary uppercase tracking-wider px-1">
                  <span className="flex items-center gap-1.5 text-primary">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>My Event Passes</span>
                  </span>
                  <span className="font-mono text-[11px] text-secondary">
                    {displayActivities.length} {displayActivities.length === 1 ? 'Pass' : 'Passes'}
                  </span>
                </div>

                <div className="relative">
                  <select
                    value={selectedActivityId}
                    onChange={(e) => {
                      setSelectedActivityId(e.target.value);
                      setDownloadSuccess(false);
                    }}
                    className="w-full bg-surface-container-low border border-surface-container text-on-surface font-bold rounded-2xl px-4 py-3 text-xs sm:text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-all pr-10 shadow-xs"
                  >
                    {displayActivities.map((act) => {
                      const actReq = userRequests[act.id];
                      const actApproved = isStaff || actReq?.status === 'approved';
                      const actPending = actReq?.status === 'pending';
                      const actDate = act.eventDate || '2026-11-24';
                      const statusLabel = actApproved ? '✓ Approved' : actPending ? '⏳ Pending' : 'Locked';

                      return (
                        <option key={act.id} value={act.id}>
                          {act.name} — {actDate} ({statusLabel})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-secondary absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Wallet Pass Container for Selected Activity */}
          <div className={`bg-surface-container-lowest border rounded-3xl p-4 sm:p-7 shadow-xs relative overflow-hidden ${
            isExpired ? 'border-error/40' : 'border-surface-container'
          }`}>
            {/* Pass Header: Activity & Date Title (No room/venue info) */}
            <div className="flex items-center justify-between pb-4 border-b border-surface-container">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary block">
                  {currentActivity?.category} Activity
                </span>
                <h3 className="text-base font-extrabold text-on-surface leading-tight">
                  {currentActivity?.name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-secondary font-medium">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Event Date: <strong className="text-on-surface">{activeEventDate}</strong></span>
                </div>
              </div>

              {/* Status Badge (Flagged if expired or attendance marked) */}
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border flex-shrink-0 ${
                isExpired
                  ? 'bg-error-container text-on-error-container border-error/30'
                  : shouldHideForAttendance
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : isApproved 
                  ? 'bg-tertiary-container text-on-tertiary-container border-tertiary-container' 
                  : isPending 
                  ? 'bg-secondary-container text-on-secondary-container border-secondary-container' 
                  : isRejected 
                  ? 'bg-error-container text-on-error-container border-error-container' 
                  : 'bg-surface-container text-secondary border-surface-container-high'
              }`}>
                {isExpired && <AlertTriangle className="w-3 h-3 text-error" />}
                {!isExpired && shouldHideForAttendance && <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                {!isExpired && !shouldHideForAttendance && isApproved && <CheckCircle2 className="w-3 h-3 text-on-tertiary" />}
                {!isExpired && isPending && <Clock className="w-3 h-3 text-secondary animate-pulse" />}
                {!isExpired && isRejected && <XCircle className="w-3 h-3 text-on-error" />}
                {!isExpired && isUnrequested && <Lock className="w-3 h-3 text-secondary" />}
                <span>
                  {isExpired 
                    ? 'Expired' 
                    : shouldHideForAttendance
                    ? 'Attended & Redeemed'
                    : isApproved 
                    ? 'Approved' 
                    : isPending 
                    ? 'Pending Approval' 
                    : isRejected 
                    ? 'Declined' 
                    : 'Locked'}
                </span>
              </div>
            </div>

            {/* Participant Name & Pass ID (No USN badge) */}
            <div className="py-4 text-center space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-on-surface">
                {displayName}
              </h2>
              <span className="text-[11px] text-secondary font-mono block">
                #{passIdSnippet}
              </span>
            </div>

            {/* Dynamic Pass Content Based on Attendance Check-in, Approval Status & Expiration */}
            {shouldHideForAttendance ? (
              <div className="p-6 sm:p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4 my-2 animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2 max-w-sm mx-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Attendance Verified</span>
                  </div>
                  <h4 className="text-base font-bold text-on-surface">
                    Pass Checked In &amp; Redeemed
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Your attendance for <strong className="text-on-surface">{currentActivity?.name}</strong> was scanned and marked by the room coordinator. The active QR code has been redeemed to avoid duplicate check-in.
                  </p>
                </div>
                <div className="p-2.5 rounded-2xl bg-surface-container-low border border-surface-container text-[11px] text-secondary font-mono inline-block">
                  Verified Pass: #{passIdSnippet}
                </div>
              </div>
            ) : isApproved ? (
              <div className="space-y-4">
                <div className={`p-3 sm:p-4 rounded-3xl border mx-auto w-[80vw] max-w-[340px] aspect-square flex flex-col items-center justify-center my-2 shadow-xs animate-fadeIn ${
                  isExpired ? 'bg-error-container/10 border-error/30' : 'bg-white border-surface-container'
                }`}>
                  <QRCodeSVG
                    id="participant-visible-qr-svg"
                    value={activityQrValue}
                    size={320}
                    level="M"
                    includeMargin={true}
                    className={`w-full h-full ${isExpired ? 'opacity-85' : ''}`}
                  />
                  {isExpired && (
                    <div className="mt-1 text-[11px] font-bold text-error uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Pass Concluded</span>
                    </div>
                  )}
                </div>

                <p className="text-center text-xs text-on-surface-variant leading-relaxed font-medium">
                  {isExpired ? (
                    <span className="text-error font-semibold">
                      This pass was valid until {activeEventDate}. Event has concluded.
                    </span>
                  ) : (
                    <>Present this pass at the entrance to mark attendance for <span className="text-on-surface font-semibold">{currentActivity?.name}</span>.</>
                  )}
                </p>
              </div>
            ) : isPending ? (
              <div className="p-6 sm:p-8 rounded-3xl bg-secondary-container/20 border border-secondary/30 text-center space-y-4 my-2 animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-secondary-container text-secondary flex items-center justify-center mx-auto shadow-xs border border-secondary/40">
                  <Clock className="w-8 h-8 animate-pulse text-secondary" />
                </div>
                <div className="space-y-2 max-w-sm mx-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-secondary-container text-secondary">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>Approval Request Pending</span>
                  </div>
                  <h4 className="text-base font-bold text-on-surface">
                    Pass Awaiting Coordinator Approval
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Your request for <strong className="text-primary">{currentActivity?.name}</strong> has been submitted. Your active QR entry pass will be automatically unlocked and displayed here once approved by the event coordinator.
                  </p>
                </div>
                <div className="p-2.5 rounded-2xl bg-surface-container-low border border-surface-container text-[11px] text-secondary font-mono inline-block">
                  Request Reference: #{passIdSnippet}
                </div>
              </div>
            ) : isRejected ? (
              <div className="p-6 rounded-2xl bg-error-container/30 border border-error/20 text-center space-y-4 my-2 animate-fadeIn">
                <div className="w-12 h-12 rounded-2xl bg-error-container text-error flex items-center justify-center mx-auto">
                  <XCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-on-surface">Not Registered for this Activity</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed max-w-xs mx-auto">
                    Your registration was not approved for {currentActivity?.name}. Please contact the event coordinator.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-low border border-surface-container text-center space-y-4 my-2 animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-surface-container text-secondary flex items-center justify-center mx-auto shadow-xs border border-surface-container-high">
                  <Lock className="w-8 h-8 text-secondary" />
                </div>
                <div className="space-y-2 max-w-sm mx-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-container text-secondary">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Pass Locked</span>
                  </div>
                  <h4 className="text-base font-bold text-on-surface">
                    {currentActivity?.name}
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {isStaff ? 'Staff Preview: Pass is unrequested.' : 'You have not registered for this event yet. Visit the Events Hub to request participation.'}
                  </p>
                </div>
                {onGoToEvents && !isStaff && (
                  <button
                    onClick={onGoToEvents}
                    className="py-2.5 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs inline-flex items-center gap-2 shadow-xs transition"
                  >
                    <span>Browse Events</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons: Save Activity Pass to Gallery, Regenerate QR, & Edit Profile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {passConfig.showDownloadButton && isApproved && !shouldHideForAttendance && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full py-3 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 text-xs active:scale-[0.99]"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-on-primary" />
                    <span>Generating Pass Image...</span>
                  </>
                ) : downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-on-primary" />
                    <span>Saved Pass Image!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-on-primary" />
                    <span>Download Pass Image</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onEditProfile}
              className={`w-full py-3 px-4 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 text-xs shadow-xs ${
                !(passConfig.showDownloadButton && isApproved && !shouldHideForAttendance) ? 'sm:col-span-2' : ''
              }`}
            >
              <span>Edit Profile Details</span>
            </button>
          </div>

              {/* Staff Preview Banner */}
              {isStaff && (
                <div className="p-3 rounded-2xl bg-surface-container border border-surface-container-high text-center text-xs text-primary font-bold">
                  Coordinator / Admin View: You have full preview access for verification testing.
                </div>
              )}
            </>
          )}
        </>
      )}




    </div>
  );
}
