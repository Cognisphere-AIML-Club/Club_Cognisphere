import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { ACTIVITIES } from '../data/activities';
import { 
  ShieldCheck, 
  WifiOff, 
  CheckCircle2, 
  IdCard, 
  Download, 
  Loader2, 
  Check, 
  MapPin, 
  Lock, 
  Clock, 
  Send, 
  XCircle, 
  AlertTriangle 
} from 'lucide-react';
import { requestGamePass, subscribeToUserPassRequests } from '../services/passApprovalService';

export default function ParticipantPass({ profile, onEditProfile, initialActivityId = null, user = null, isStaff = false }) {
  const [selectedActivityId, setSelectedActivityId] = useState(() => initialActivityId || ACTIVITIES[0].id);
  const [userRequests, setUserRequests] = useState({});
  const [requesting, setRequesting] = useState(false);

  const qrCanvasRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

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

  if (!profile || !profile.qrId) {
    return null;
  }

  const currentActivity = ACTIVITIES.find(a => a.id === selectedActivityId) || ACTIVITIES[0];
  const displayName = profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Participant';
  const displayUsn = profile.usn || 'STUDENT';

  // Request status for this game
  const request = userRequests[currentActivity.id];
  const isApproved = isStaff || request?.status === 'approved';
  const isPending = request?.status === 'pending';
  const isRejected = request?.status === 'rejected';
  const isUnrequested = !request && !isStaff;

  const activityQrValue = `${currentActivity.id}_${profile.qrId}`;
  const passIdSnippet = `${currentActivity.id.slice(0, 3).toUpperCase()}-${profile.qrId.slice(0, 6).toUpperCase()}`;

  const handleRequestPass = async () => {
    if (!profile) return;
    try {
      setRequesting(true);
      await requestGamePass({
        activityId: currentActivity.id,
        participantId: profile.uid,
        participantName: displayName,
        participantUsn: profile.usn || '',
      });
    } catch (err) {
      alert(err.message || 'Failed to request pass');
    } finally {
      setRequesting(false);
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

      // 2. Create high-resolution export canvas (800 x 1080 px) - Clean Light Mode
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1080;
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

      // 3. Top Accent Line (Primary #004ac6)
      ctx.fillStyle = '#004ac6';
      ctx.fillRect(32, 30, canvas.width - 64, 10);

      // 4. Header: Event Title
      ctx.fillStyle = '#565e74';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('COGNISPHERE • CLUB GAMES 2026', canvas.width / 2, 85);

      // 5. Activity Name
      ctx.fillStyle = '#004ac6';
      ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(currentActivity.name.toUpperCase(), canvas.width / 2, 125);

      // Venue & Category
      ctx.fillStyle = '#0b1c30';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`VENUE: ${currentActivity.room.toUpperCase()} • ${currentActivity.category.toUpperCase()}`, canvas.width / 2, 155);

      // Divider Line
      ctx.strokeStyle = '#e5eeff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(80, 180);
      ctx.lineTo(canvas.width - 80, 180);
      ctx.stroke();

      // 6. Participant Name
      ctx.fillStyle = '#0b1c30';
      ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(displayName, canvas.width / 2, 230);

      // 7. USN Badge
      const badgeWidth = 260;
      const badgeHeight = 40;
      const badgeX = (canvas.width - badgeWidth) / 2;
      const badgeY = 255;
      
      ctx.fillStyle = '#eff4ff';
      drawRoundRect(badgeX, badgeY, badgeWidth, badgeHeight, 10);
      ctx.fill();
      ctx.strokeStyle = '#dce9ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#004ac6';
      ctx.font = 'bold 18px "Courier New", Courier, monospace';
      ctx.fillText(`USN: ${displayUsn}`, canvas.width / 2, badgeY + 26);

      // 8. Status Pill
      const statusPillWidth = 280;
      const statusPillHeight = 32;
      const statusPillX = (canvas.width - statusPillWidth) / 2;
      const statusPillY = 310;

      ctx.fillStyle = isApproved ? '#007d55' : isPending ? '#565e74' : '#004ac6';
      drawRoundRect(statusPillX, statusPillY, statusPillWidth, statusPillHeight, 16);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const statusText = isApproved 
        ? '✓ APPROVED ENTRY PASS' 
        : isPending 
        ? '⏳ PENDING REVIEW' 
        : 'PARTICIPANT ENTRY PASS';
      ctx.fillText(statusText, canvas.width / 2, statusPillY + 21);

      // 9. White QR Code Container
      const qrBoxSize = 400;
      const qrBoxX = (canvas.width - qrBoxSize) / 2;
      const qrBoxY = 360;

      ctx.fillStyle = '#f8f9ff';
      drawRoundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20);
      ctx.fill();
      ctx.strokeStyle = '#e5eeff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw QR Image inside container
      const qrPadding = 24;
      const qrDrawSize = qrBoxSize - (qrPadding * 2);
      ctx.drawImage(qrSource, qrBoxX + qrPadding, qrBoxY + qrPadding, qrDrawSize, qrDrawSize);

      // 10. Pass ID
      ctx.fillStyle = '#565e74';
      ctx.font = 'bold 16px "Courier New", Courier, monospace';
      ctx.fillText(`PASS #${passIdSnippet}`, canvas.width / 2, 795);

      // 11. Instructions
      ctx.fillStyle = '#0b1c30';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Present this pass at ${currentActivity.room} for attendance check`, canvas.width / 2, 845);

      // 12. Security Footer Box
      const footBoxW = canvas.width - 120;
      const footBoxH = 50;
      const footBoxX = 60;
      const footBoxY = 960;
      ctx.fillStyle = '#eff4ff';
      drawRoundRect(footBoxX, footBoxY, footBoxW, footBoxH, 12);
      ctx.fill();
      ctx.strokeStyle = '#e5eeff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#565e74';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Verified Approved Pass • 100% Offline Capable • Cognisphere AIML', canvas.width / 2, footBoxY + 30);

      // 13. Trigger Download with Blob & dataURL fallback
      const filename = `Pass_${currentActivity.id}_${displayUsn.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

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
          width: '512px', 
          height: '512px', 
          opacity: 0, 
          pointerEvents: 'none',
          zIndex: -9999
        }} 
        aria-hidden="true"
      >
        <QRCodeCanvas
          value={activityQrValue}
          size={512}
          level="H"
          includeMargin={true}
        />
      </div>

      {/* Activity Selector Tab Bar with Live Approval Status Indicators */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-3 shadow-xs">
        <div className="text-[11px] font-bold text-secondary px-2 pb-2 uppercase tracking-wider flex items-center justify-between">
          <span>Your 5 Game Passes</span>
          <span className="text-primary font-mono font-bold">Pass Matrix</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {ACTIVITIES.map((act) => {
            const isSelected = act.id === selectedActivityId;
            const actReq = userRequests[act.id];
            const actApproved = isStaff || actReq?.status === 'approved';
            const actPending = actReq?.status === 'pending';

            return (
              <button
                key={act.id}
                onClick={() => {
                  setSelectedActivityId(act.id);
                  setDownloadSuccess(false);
                }}
                className={`py-2 px-2.5 rounded-xl text-left transition-all flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? 'bg-primary text-on-primary font-bold shadow-xs'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface border border-surface-container'
                }`}
              >
                <div className="text-xs truncate font-semibold flex items-center justify-between">
                  <span className="truncate">{act.name}</span>
                  {/* Status dot */}
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-1 ${
                    actApproved ? (isSelected ? 'bg-white' : 'bg-tertiary') :
                    actPending ? 'bg-amber-500 animate-pulse' :
                    (isSelected ? 'bg-white/60' : 'bg-outline')
                  }`} />
                </div>
                <div className={`text-[10px] truncate ${isSelected ? 'text-on-primary/90 font-medium' : 'text-secondary'}`}>
                  {act.room}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wallet Pass Container for Selected Activity */}
      <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
        {/* Pass Header: Activity & Room Title */}
        <div className="flex items-center justify-between pb-4 border-b border-surface-container">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary block">
              {currentActivity.category} Activity
            </span>
            <h3 className="text-base font-extrabold text-on-surface leading-tight">
              {currentActivity.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-secondary">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-on-surface">{currentActivity.room}</span>
            </div>
          </div>

          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border flex-shrink-0 ${
            isApproved 
              ? 'bg-tertiary-container text-on-tertiary-container border-tertiary-container' 
              : isPending 
              ? 'bg-secondary-container text-on-secondary-container border-secondary-container' 
              : isRejected 
              ? 'bg-error-container text-on-error-container border-error-container' 
              : 'bg-surface-container text-secondary border-surface-container-high'
          }`}>
            {isApproved && <CheckCircle2 className="w-3 h-3 text-on-tertiary" />}
            {isPending && <Clock className="w-3 h-3 text-secondary animate-pulse" />}
            {isRejected && <XCircle className="w-3 h-3 text-on-error" />}
            {isUnrequested && <Lock className="w-3 h-3 text-secondary" />}
            <span>
              {isApproved ? 'Approved' : isPending ? 'Pending Approval' : isRejected ? 'Declined' : 'Locked'}
            </span>
          </div>
        </div>

        {/* Participant Name, USN & Pass ID */}
        <div className="py-4 text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-on-surface">
            {displayName}
          </h2>

          <div className="flex items-center justify-center gap-2">
            {profile.usn && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-surface-container border border-surface-container-high text-primary">
                <IdCard className="w-3 h-3 text-primary" />
                {profile.usn}
              </span>
            )}
            <span className="text-[11px] text-secondary font-mono">
              #{passIdSnippet}
            </span>
          </div>
        </div>

        {/* Dynamic Pass Content Based on Approval Status */}
        {isApproved ? (
          <div className="space-y-4">
            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container mx-auto w-fit flex flex-col items-center justify-center my-1 shadow-xs animate-fadeIn">
              <QRCodeSVG
                id="participant-visible-qr-svg"
                value={activityQrValue}
                size={210}
                level="H"
                includeMargin={true}
                className="w-48 h-48 sm:w-52 sm:h-52"
              />
            </div>

            <p className="text-center text-xs text-on-surface-variant leading-relaxed font-medium">
              Present this pass at <span className="text-primary font-bold">{currentActivity.room}</span> to mark attendance for <span className="text-on-surface font-semibold">{currentActivity.name}</span>.
            </p>
          </div>
        ) : isPending ? (
          <div className="p-6 rounded-2xl bg-secondary-container/40 border border-secondary/20 text-center space-y-4 my-2 animate-fadeIn">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-secondary-container text-secondary mx-auto">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span>Approval Request Pending</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed max-w-xs mx-auto pt-1">
                Your request for <strong className="text-primary">{currentActivity.name}</strong> ({currentActivity.room}) is submitted. A coordinator will verify your pass.
              </p>
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container mx-auto w-fit flex flex-col items-center justify-center my-1 shadow-xs">
              <QRCodeSVG
                id="participant-visible-qr-svg"
                value={activityQrValue}
                size={190}
                level="H"
                includeMargin={true}
                className="w-44 h-44"
              />
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider mt-2">Pass ID: #{passIdSnippet}</span>
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
                Your registration was not approved for {currentActivity.name}. Please contact the event coordinator.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-surface-container-low border border-surface-container text-center space-y-4 my-2 animate-fadeIn">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-container text-secondary mx-auto">
                <Lock className="w-3.5 h-3.5" />
                <span>Entry Pass for {currentActivity.name}</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed max-w-xs mx-auto pt-1">
                Request access below to receive priority entry approval for <strong className="text-primary">{currentActivity.room}</strong>.
              </p>
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container mx-auto w-fit flex flex-col items-center justify-center my-1 shadow-xs">
              <QRCodeSVG
                id="participant-visible-qr-svg"
                value={activityQrValue}
                size={180}
                level="H"
                includeMargin={true}
                className="w-40 h-40 opacity-90"
              />
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider mt-2">Student QR: {displayUsn}</span>
            </div>

            <button
              onClick={handleRequestPass}
              disabled={requesting}
              className="py-2.5 px-5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 mx-auto active:scale-95 shadow-xs"
            >
              {requesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Request Pass for {currentActivity.room}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Security Footer */}
        <div className="mt-5 pt-4 border-t border-surface-container flex items-center justify-between text-[11px] text-secondary">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Coordinator Approved Only</span>
          </div>
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-3 h-3 text-primary" />
            <span>Works 100% Offline</span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Save Activity Pass to Gallery (Works in all states) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <span>Saved {currentActivity.name} Pass!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-on-primary" />
              <span>Download {currentActivity.room} Pass</span>
            </>
          )}
        </button>

        {isUnrequested ? (
          <button
            onClick={handleRequestPass}
            disabled={requesting}
            className="w-full py-3 px-4 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-primary font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-xs shadow-xs"
          >
            {requesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Requesting...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Request {currentActivity.name} Pass</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={onEditProfile}
            className="w-full py-3 px-4 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 text-xs shadow-xs"
          >
            <span>Edit Profile Details</span>
          </button>
        )}
      </div>

      {isUnrequested && (
        <div className="text-center">
          <button
            onClick={onEditProfile}
            className="text-xs text-secondary hover:text-primary font-medium underline underline-offset-2"
          >
            Need to update profile info? Edit Profile
          </button>
        </div>
      )}

      {/* Staff Preview Banner */}
      {isStaff && (
        <div className="p-3 rounded-2xl bg-surface-container border border-surface-container-high text-center text-xs text-primary font-bold">
          Coordinator / Admin View: You have full bypass preview for testing passes.
        </div>
      )}
    </div>
  );
}
