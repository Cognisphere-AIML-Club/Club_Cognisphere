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
  SlidersHorizontal,
  Settings2,
  Calendar,
  CalendarDays,
  X,
  ChevronDown,
  ArrowRight,
  Search,
  Plus,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  subscribeToUserPassRequests, 
  subscribeToPassConfig, 
  updatePassConfig 
} from '../services/passApprovalService';
import { getOrGenerateGamePass } from '../services/gamePassService';

const DEFAULT_PASS_CONFIG = {
  passSystemEnabled: true, // Master disable toggle: if false, displays "No events taking place currently"
  showDownloadButton: true,
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

  // Selection dropdown displays ONLY requested or approved passes for participants
  // Staff/Admins can preview all enabled activities for testing
  const displayActivities = visibleActivities.filter(act => {
    if (isStaff) return true;
    const req = userRequests[act.id];
    return req && (req.status === 'approved' || req.status === 'pending');
  });

  const [selectedActivityId, setSelectedActivityId] = useState(() => {
    if (initialActivityId && displayActivities.some(a => a.id === initialActivityId)) {
      return initialActivityId;
    }
    return displayActivities[0]?.id || visibleActivities[0]?.id || allActivities[0].id;
  });

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [modalConfig, setModalConfig] = useState(passConfig);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configToast, setConfigToast] = useState(null);

  // Search & add state inside Admin Control Panel
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef(null);

  // Click outside to dismiss search dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    if (showSearchDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showSearchDropdown]);

  // Keep selectedActivityId valid when displayActivities change
  useEffect(() => {
    if (displayActivities.length > 0) {
      const isCurrentVisible = displayActivities.some(a => a.id === selectedActivityId);
      if (!isCurrentVisible) {
        if (initialActivityId && displayActivities.some(a => a.id === initialActivityId)) {
          setSelectedActivityId(initialActivityId);
        } else {
          setSelectedActivityId(displayActivities[0].id);
        }
      }
    }
  }, [displayActivities, selectedActivityId, initialActivityId]);

  useEffect(() => {
    if (initialActivityId) {
      setSelectedActivityId(initialActivityId);
    }
  }, [initialActivityId]);

  // Subscribe to real-time pass approval statuses
  useEffect(() => {
    if (!profile?.uid) return;
    const unsubscribe = subscribeToUserPassRequests(profile.uid, (map) => {
      setUserRequests(map);
    });
    return () => unsubscribe();
  }, [profile?.uid]);

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
        setModalConfig(merged);
        try {
          localStorage.setItem('cognisphere_pass_config', JSON.stringify(merged));
        } catch (e) {}
      }
    });
    return () => unsub();
  }, []);

  const currentActivity = displayActivities.find(a => a.id === selectedActivityId) || displayActivities[0] || visibleActivities[0] || allActivities[0];
  const displayName = profile?.name || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Participant';

  // Automatically load or generate single active pass for this USN & game (MUST be before any return)
  useEffect(() => {
    if (!profile?.usn || !currentActivity?.id || !profile?.uid) return;
    let isMounted = true;

    const loadGamePass = async () => {
      try {
        const p = await getOrGenerateGamePass({
          activityId: currentActivity.id,
          usn: profile.usn,
          participantId: profile.uid,
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
  }, [currentActivity?.id, profile?.usn, profile?.uid, displayName]);

  if (!profile || !profile.qrId) {
    return null;
  }

  // Request status for this game
  const request = userRequests[currentActivity.id];
  const isApproved = isStaff || request?.status === 'approved';
  const isPending = request?.status === 'pending';
  const isRejected = request?.status === 'rejected';
  const isUnrequested = !request && !isStaff;

  // Date expiration check: compare today (YYYY-MM-DD) vs activeEventDate
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const activeEventDate = currentActivity.eventDate || '2026-11-24';
  const todayStr = getTodayStr();
  const isExpired = Boolean(activeEventDate && todayStr > activeEventDate);

  // Active game pass for this USN (One USN gets only one active QR per game)
  const activeQrId = gamePass?.qrId || profile.qrId;
  const activityQrValue = gamePass?.qrValue || `${currentActivity.id}_${profile.qrId}`;
  const passIdSnippet = `${currentActivity.id.slice(0, 3).toUpperCase()}-${activeQrId.slice(-6).toUpperCase()}`;

  const isSystemActive = passConfig.passSystemEnabled ?? true;

  // Admin Control Panel Activity Helpers
  const modalHiddenIds = Array.isArray(modalConfig.hiddenActivityIds) ? modalConfig.hiddenActivityIds : [];
  const modalDismissedIds = Array.isArray(modalConfig.panelDismissedActivityIds) ? modalConfig.panelDismissedActivityIds : [];

  const panelActivities = allActivities.filter(a => !modalDismissedIds.includes(a.id));

  const filteredSearchActivities = allActivities.filter(a => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      (a.category && a.category.toLowerCase().includes(q)) ||
      a.id.toLowerCase().includes(q)
    );
  });

  const handleToggleActivityVisibility = (activityId) => {
    setModalConfig(prev => {
      const hidden = Array.isArray(prev.hiddenActivityIds) ? [...prev.hiddenActivityIds] : [];
      const idx = hidden.indexOf(activityId);
      if (idx > -1) {
        hidden.splice(idx, 1);
      } else {
        hidden.push(activityId);
      }
      return { ...prev, hiddenActivityIds: hidden };
    });
  };

  const handleDismissFromPanel = (activityId) => {
    setModalConfig(prev => {
      const dismissed = Array.isArray(prev.panelDismissedActivityIds) ? [...prev.panelDismissedActivityIds] : [];
      const hidden = Array.isArray(prev.hiddenActivityIds) ? [...prev.hiddenActivityIds] : [];
      if (!dismissed.includes(activityId)) {
        dismissed.push(activityId);
      }
      if (!hidden.includes(activityId)) {
        hidden.push(activityId);
      }
      return { ...prev, panelDismissedActivityIds: dismissed, hiddenActivityIds: hidden };
    });
  };

  const handleRestoreToPanel = (activityId) => {
    setModalConfig(prev => {
      const dismissed = Array.isArray(prev.panelDismissedActivityIds) ? [...prev.panelDismissedActivityIds] : [];
      const hidden = Array.isArray(prev.hiddenActivityIds) ? [...prev.hiddenActivityIds] : [];
      return {
        ...prev,
        panelDismissedActivityIds: dismissed.filter(id => id !== activityId),
        hiddenActivityIds: hidden.filter(id => id !== activityId)
      };
    });
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  const handleRestoreAllToPanel = () => {
    setModalConfig(prev => ({
      ...prev,
      panelDismissedActivityIds: [],
      hiddenActivityIds: []
    }));
  };

  // Admin save pass layout configuration
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      await updatePassConfig(modalConfig, user?.email || 'admin');
      setPassConfig(modalConfig);
      try {
        localStorage.setItem('cognisphere_pass_config', JSON.stringify(modalConfig));
      } catch (err) {}
      setShowConfigModal(false);
      setConfigToast('Pass layout updated successfully!');
      setTimeout(() => setConfigToast(null), 3500);
    } catch (err) {
      alert(err.message || 'Failed to save pass layout settings');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleResetConfig = async () => {
    if (!window.confirm('Reset pass layout back to default settings?')) return;
    try {
      setSavingConfig(true);
      await updatePassConfig(DEFAULT_PASS_CONFIG, user?.email || 'admin');
      setPassConfig(DEFAULT_PASS_CONFIG);
      setModalConfig(DEFAULT_PASS_CONFIG);
      setSearchQuery('');
      setShowSearchDropdown(false);
      try {
        localStorage.setItem('cognisphere_pass_config', JSON.stringify(DEFAULT_PASS_CONFIG));
      } catch (err) {}
      setShowConfigModal(false);
      setConfigToast('Pass layout reset to defaults!');
      setTimeout(() => setConfigToast(null), 3500);
    } catch (err) {
      alert(err.message || 'Failed to reset settings');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDownload = async () => {
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
      ctx.fillText(currentActivity.name.toUpperCase(), canvas.width / 2, 106);

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
      ctx.fillText(currentActivity.room || 'Main Venue', canvas.width / 2, infoY + 52);

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
      const scheduleStr = `DATE: ${activeEventDate}  •  TIME: ${currentActivity.scheduledTime || 'Event Hours'}`;
      ctx.fillText(scheduleStr, canvas.width / 2, infoY + 105);

      // 11. Trigger Download with Blob & dataURL fallback
      const filename = `Pass_${currentActivity.id}_${displayName.replace(/[^a-zA-Z0-9]/g, '_')}${isExpired ? '_EXPIRED' : ''}.png`;

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

      {/* Admin Customization Toast */}
      {configToast && (
        <div className="bg-tertiary-container text-on-tertiary-container border border-tertiary/20 rounded-2xl p-3 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{configToast}</span>
          <button onClick={() => setConfigToast(null)} className="text-on-tertiary-container font-bold px-1.5">✕</button>
        </div>
      )}

      {/* Admin Pass Layout Controls Button */}
      {isAdmin && (
        <div className="flex items-center justify-between bg-surface-container-lowest border border-surface-container rounded-2xl p-3.5 shadow-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span>Admin: Pass Customization</span>
            </div>
            <p className="text-[11px] text-secondary">
              {!isSystemActive 
                ? 'Status: Passes DISABLED for participants' 
                : `${visibleActivities.length} of ${allActivities.length} activities active for passes`}
            </p>
          </div>
          <button
            onClick={() => {
              setModalConfig(passConfig);
              setSearchQuery('');
              setShowSearchDropdown(false);
              setShowConfigModal(true);
            }}
            className="py-1.5 px-3 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 active:scale-95 shrink-0"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Edit Layout</span>
          </button>
        </div>
      )}

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
                  {currentActivity.category} Activity
                </span>
                <h3 className="text-base font-extrabold text-on-surface leading-tight">
                  {currentActivity.name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-secondary font-medium">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Event Date: <strong className="text-on-surface">{activeEventDate}</strong></span>
                </div>
              </div>

              {/* Status Badge (Flagged if expired) */}
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border flex-shrink-0 ${
                isExpired
                  ? 'bg-error-container text-on-error-container border-error/30'
                  : isApproved 
                  ? 'bg-tertiary-container text-on-tertiary-container border-tertiary-container' 
                  : isPending 
                  ? 'bg-secondary-container text-on-secondary-container border-secondary-container' 
                  : isRejected 
                  ? 'bg-error-container text-on-error-container border-error-container' 
                  : 'bg-surface-container text-secondary border-surface-container-high'
              }`}>
                {isExpired && <AlertTriangle className="w-3 h-3 text-error" />}
                {!isExpired && isApproved && <CheckCircle2 className="w-3 h-3 text-on-tertiary" />}
                {!isExpired && isPending && <Clock className="w-3 h-3 text-secondary animate-pulse" />}
                {!isExpired && isRejected && <XCircle className="w-3 h-3 text-on-error" />}
                {!isExpired && isUnrequested && <Lock className="w-3 h-3 text-secondary" />}
                <span>
                  {isExpired 
                    ? 'Expired' 
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

            {/* Dynamic Pass Content Based on Approval Status & Expiration (80% mobile viewport width QR) */}
            {isApproved ? (
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
                    <>Present this pass at the entrance to mark attendance for <span className="text-on-surface font-semibold">{currentActivity.name}</span>.</>
                  )}
                </p>
              </div>
            ) : isPending ? (
              <div className="p-4 sm:p-6 rounded-3xl bg-secondary-container/40 border border-secondary/20 text-center space-y-4 my-2 animate-fadeIn">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-secondary-container text-secondary mx-auto">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>Approval Request Pending</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed max-w-xs mx-auto pt-1">
                    Your request for <strong className="text-primary">{currentActivity.name}</strong> is submitted. A coordinator will verify your pass.
                  </p>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-3xl border border-surface-container mx-auto w-[80vw] max-w-[340px] aspect-square flex flex-col items-center justify-center my-2 shadow-xs">
                  <QRCodeSVG
                    id="participant-visible-qr-svg"
                    value={activityQrValue}
                    size={320}
                    level="M"
                    includeMargin={true}
                    className="w-full h-full"
                  />
                </div>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block text-center">Pass ID: #{passIdSnippet}</span>
              </div>
            ) : isRejected ? (
              <div className="p-6 rounded-2xl bg-error-container/30 border border-error/20 text-center space-y-4 my-2 animate-fadeIn">
                <div className="w-12 h-12 rounded-2xl bg-error-container text-error flex items-center justify-center mx-auto">
                  <XCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-on-surface">Not Registered for this Activity</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed max-w-xs mx-auto">
                    Your registration was not approved for {currentActivity.name}. Please contact the event coordinator.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-6 rounded-3xl bg-surface-container-low border border-surface-container text-center space-y-4 my-2 animate-fadeIn">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-container text-secondary mx-auto">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Pass for {currentActivity.name}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed max-w-xs mx-auto pt-1">
                    {isStaff ? 'Staff Preview: Pass is unrequested.' : 'Pass is not active for this event.'}
                  </p>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-3xl border border-surface-container mx-auto w-[80vw] max-w-[340px] aspect-square flex flex-col items-center justify-center my-2 shadow-xs">
                  <QRCodeSVG
                    id="participant-visible-qr-svg"
                    value={activityQrValue}
                    size={320}
                    level="M"
                    includeMargin={true}
                    className="w-full h-full opacity-90"
                  />
                </div>
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block text-center">Pass ID: #{passIdSnippet}</span>
              </div>
            )}
          </div>

          {/* Action Buttons: Save Activity Pass to Gallery, Regenerate QR, & Edit Profile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {passConfig.showDownloadButton && (
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
                !(passConfig.showDownloadButton && isApproved) ? 'sm:col-span-2' : ''
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

      {/* ========================================================================= */}
      {/* ADMIN PASS CUSTOMIZATION MODAL                                            */}
      {/* ========================================================================= */}
      {isAdmin && showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-16 bg-black/50 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-surface-container-lowest border border-surface-container rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 h-auto max-h-fit">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Settings2 className="w-4 h-4" />
                  <span>Pass Page Layout Controls</span>
                </div>
                <p className="text-xs text-secondary">
                  Manage pass system availability, activity visibility, and date overrides.
                </p>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Full Disable / Master Switch on Top */}
              <div className="space-y-2 bg-surface-container-low p-4 rounded-2xl border border-surface-container">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-on-surface uppercase tracking-wide">
                      Pass System Active (Master Switch)
                    </span>
                    <p className="text-[11px] text-secondary">
                      When turned OFF, passes are hidden and participants see &ldquo;No events taking place currently&rdquo; with a button to Events &amp; Hub.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={modalConfig.passSystemEnabled ?? true}
                    onChange={(e) => setModalConfig({ ...modalConfig, passSystemEnabled: e.target.checked })}
                    className="w-5 h-5 rounded text-primary focus:ring-primary cursor-pointer ml-3 shrink-0"
                  />
                </label>
              </div>

              {/* Show Download Button */}
              <div className="bg-surface-container-low p-4 rounded-2xl border border-surface-container">
                <label className="flex items-center justify-between cursor-pointer text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-on-surface">Download Pass Image Button</span>
                    <p className="text-[11px] text-secondary">Allows saving high-res PNG pass badge</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={modalConfig.showDownloadButton}
                    onChange={(e) => setModalConfig({ ...modalConfig, showDownloadButton: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                </label>
              </div>

              {/* Activity Visibility & Control Panel Management (NextDNS-style Active List) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="space-y-0.5">
                    <label className="text-xs font-black text-on-surface uppercase tracking-wide block">
                      Activity Status &amp; Visibility Controls
                    </label>
                    <p className="text-[11px] text-secondary">
                      Toggle switch controls participant pass dropdown visibility. Dismiss with &ldquo;✕&rdquo; to remove from panel (searchable to restore).
                    </p>
                  </div>
                  {modalDismissedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleRestoreAllToPanel}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      Restore All ({modalDismissedIds.length})
                    </button>
                  )}
                </div>

                {/* Dark NextDNS-Style Container */}
                <div className="bg-[#121622] border border-[#23293e] rounded-2xl overflow-hidden shadow-xs">
                  {/* Top Search / Add Bar */}
                  <div ref={searchContainerRef} className="p-3 border-b border-[#23293e] relative">
                    <div className="bg-[#1a2030] border border-[#2b334d] focus-within:border-primary rounded-xl px-3 py-2 flex items-center gap-2 transition-colors">
                      <Search className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search or add an event..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSearchDropdown(true);
                        }}
                        onFocus={() => setShowSearchDropdown(true)}
                        className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-xs focus:outline-none"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="text-slate-400 hover:text-slate-100 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSearchDropdown((prev) => !prev);
                        }}
                        className="text-slate-400 hover:text-slate-100 p-0.5 transition-transform"
                        title={showSearchDropdown ? 'Close dropdown' : 'Browse available events'}
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showSearchDropdown ? 'rotate-180 text-primary' : ''}`} />
                      </button>
                    </div>

                    {/* Search & Add Dropdown Menu */}
                    {showSearchDropdown && (
                      <div 
                        className="absolute left-3 right-3 top-full mt-1.5 z-30 bg-[#161c2b] border border-[#2b334d] rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-[#23293e]"
                      >
                        {filteredSearchActivities.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            No matching activities found
                          </div>
                        ) : (
                          filteredSearchActivities.map((act) => {
                            const isDismissed = modalDismissedIds.includes(act.id);
                            const isTechnical = act.category === 'Technical';

                            return (
                              <div
                                key={act.id}
                                className="p-2.5 flex items-center justify-between gap-2 hover:bg-[#1f273d] transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                                    isTechnical ? 'text-[#2979ff]' : 'text-[#ff9100]'
                                  }`}>
                                    {isTechnical ? (
                                      <Shield className="w-3.5 h-3.5 fill-current" />
                                    ) : (
                                      <ShieldCheck className="w-3.5 h-3.5 fill-current" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-100 truncate">
                                      {act.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {act.eventDate || '2026-11-24'}
                                    </div>
                                  </div>
                                </div>

                                {isDismissed ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreToPanel(act.id)}
                                    className="py-1 px-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs shrink-0 active:scale-95"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Add to Panel</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 px-2 py-0.5 shrink-0">
                                    In Panel
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* List of Panel Activities */}
                  <div className="divide-y divide-[#23293e]">
                    {panelActivities.length === 0 ? (
                      <div className="p-6 text-center space-y-2">
                        <p className="text-xs text-slate-400">
                          All activities are currently dismissed from this panel view.
                        </p>
                        <button
                          type="button"
                          onClick={handleRestoreAllToPanel}
                          className="py-1.5 px-3 bg-[#1e2638] hover:bg-[#28324a] text-primary text-xs font-bold rounded-lg border border-[#2d374f] inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Restore All Activities</span>
                        </button>
                      </div>
                    ) : (
                      panelActivities.map((act) => {
                        const isActivityVisible = !modalHiddenIds.includes(act.id);
                        const isTechnical = act.category === 'Technical';

                        return (
                          <div
                            key={act.id}
                            className="relative flex items-center justify-between py-3 px-3.5 hover:bg-white/[0.02] transition-colors"
                          >
                            {/* Green Active (ON) / Red Inactive (OFF) Indicator Bar on Far Left */}
                            <div
                              className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${
                                isActivityVisible ? 'bg-[#00e676]' : 'bg-red-500'
                              }`}
                              title={isActivityVisible ? 'Active (Pass visible to participants)' : 'Inactive (Pass hidden from participants)'}
                            />

                            {/* Left: Shield Icon & Name */}
                            <div className="flex items-center gap-3 pl-2 min-w-0 flex-1 pr-3">
                              <div
                                className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                                  isTechnical ? 'text-[#2979ff]' : 'text-[#ff9100]'
                                }`}
                              >
                                {isTechnical ? (
                                  <Shield className="w-4 h-4 fill-current" />
                                ) : (
                                  <ShieldCheck className="w-4 h-4 fill-current" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                                  {act.name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {act.eventDate || '2026-11-24'}
                                </div>
                              </div>
                            </div>

                            {/* Right: Visibility Toggle Switch & Dismiss '✕' Button */}
                            <div className="flex items-center gap-3 shrink-0">
                              {/* Toggle Switch (Button for visibility) */}
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isActivityVisible}
                                onClick={() => handleToggleActivityVisibility(act.id)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                                  isActivityVisible ? 'bg-[#2979ff]' : 'bg-[#333c50]'
                                }`}
                                title={isActivityVisible ? 'Click to hide from participant selection dropdown' : 'Click to make visible in participant selection dropdown'}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
                                    isActivityVisible ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
                                  }`}
                                />
                              </button>

                              {/* Dismiss '✕' button */}
                              <button
                                type="button"
                                onClick={() => handleDismissFromPanel(act.id)}
                                className="text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-white/10 transition-colors"
                                title="Dismiss from control panel (can be searched and added back)"
                                aria-label={`Dismiss ${act.name} from control panel`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-surface-container gap-2">
                <button
                  type="button"
                  onClick={handleResetConfig}
                  disabled={savingConfig}
                  className="py-2 px-3 text-secondary hover:text-error text-xs font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="py-2 px-4 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="py-2 px-4 bg-primary hover:bg-primary-container text-on-primary text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingConfig ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Layout</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
