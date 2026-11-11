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
  const isApproved = isStaff || request?.status === 'approved'; // Staff gets automatic bypass/preview
  const isPending = request?.status === 'pending';
  const isRejected = request?.status === 'rejected';
  const isUnrequested = !request && !isStaff;

  // Game-specific QR pass value: {activityId}_{qrId}
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

  const handleDownload = () => {
    if (!isApproved) return;
    try {
      setDownloading(true);

      const qrCanvas = qrCanvasRef.current;
      if (!qrCanvas) {
        throw new Error('QR canvas not ready');
      }

      // Create high-resolution export canvas (800 x 1080 px)
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      // 1. Dark Gradient Background (slate-950)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Card Border
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

      // 3. Top Accent Glow Line
      ctx.fillStyle = '#10b981';
      ctx.fillRect(30, 30, canvas.width - 60, 10);

      // 4. Header: Event Title
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CLUB GAMES EVENT 2026', canvas.width / 2, 85);

      // 5. Activity Name & Room
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(currentActivity.name.toUpperCase(), canvas.width / 2, 125);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`VENUE: ${currentActivity.room.toUpperCase()} (${currentActivity.category.toUpperCase()})`, canvas.width / 2, 155);

      // Divider
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, 180);
      ctx.lineTo(canvas.width - 80, 180);
      ctx.stroke();

      // 6. Participant Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(displayName, canvas.width / 2, 235);

      // 7. USN Badge
      ctx.fillStyle = '#1e293b';
      const badgeWidth = 260;
      const badgeHeight = 44;
      const badgeX = (canvas.width - badgeWidth) / 2;
      const badgeY = 260;
      
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 8) : ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 20px "Courier New", Courier, monospace';
      ctx.fillText(`USN: ${displayUsn}`, canvas.width / 2, badgeY + 29);

      // 8. White QR Code Container
      const qrBoxSize = 420;
      const qrBoxX = (canvas.width - qrBoxSize) / 2;
      const qrBoxY = 330;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24) : ctx.rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
      ctx.fill();

      // Draw QR Image
      const qrPadding = 30;
      const qrDrawSize = qrBoxSize - (qrPadding * 2);
      ctx.drawImage(qrCanvas, qrBoxX + qrPadding, qrBoxY + qrPadding, qrDrawSize, qrDrawSize);

      // 9. Pass ID
      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px "Courier New", Courier, monospace';
      ctx.fillText(`PASS #${passIdSnippet}`, canvas.width / 2, 795);

      // 10. Instructions
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Approved Entry Pass for ${currentActivity.room}`, canvas.width / 2, 850);

      // 11. Footer Security
      ctx.fillStyle = '#64748b';
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Verified Approved Pass • 100% Offline Capable', canvas.width / 2, 980);

      // Generate Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Pass_${currentActivity.id}_${displayUsn}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      alert('Unable to generate pass image. Please take a screenshot as a backup.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full space-y-5 animate-fadeIn">
      {/* Hidden off-screen Canvas used to source high-res QR for the download badge */}
      {isApproved && (
        <div className="sr-only" aria-hidden="true">
          <QRCodeCanvas
            ref={qrCanvasRef}
            value={activityQrValue}
            size={500}
            level="H"
            includeMargin={false}
          />
        </div>
      )}

      {/* Activity Selector Tab Bar with Live Approval Status Indicators */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-lg">
        <div className="text-[11px] font-semibold text-slate-400 px-2 pb-2 uppercase tracking-wider flex items-center justify-between">
          <span>Your 5 Game Passes</span>
          <span className="text-emerald-400 font-mono">Approval System</span>
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
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <div className="text-xs truncate font-semibold flex items-center justify-between">
                  <span className="truncate">{act.name}</span>
                  {/* Status dot */}
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-1 ${
                    actApproved ? (isSelected ? 'bg-slate-950' : 'bg-emerald-500') :
                    actPending ? 'bg-amber-400 animate-pulse' :
                    (isSelected ? 'bg-slate-700' : 'bg-slate-600')
                  }`} />
                </div>
                <div className={`text-[10px] truncate ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                  {act.room}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wallet Pass Container for Selected Activity */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
        
        {/* Pass Header: Activity & Room Title */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 block">
              {currentActivity.category} Activity
            </span>
            <h3 className="text-base font-extrabold text-white leading-tight">
              {currentActivity.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-slate-200">{currentActivity.room}</span>
            </div>
          </div>

          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border flex-shrink-0 ${
            isApproved 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
              : isPending 
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' 
              : isRejected 
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' 
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
            {isPending && <Clock className="w-3 h-3 text-amber-400 animate-pulse" />}
            {isRejected && <XCircle className="w-3 h-3 text-rose-400" />}
            {isUnrequested && <Lock className="w-3 h-3 text-slate-400" />}
            <span>
              {isApproved ? 'Approved' : isPending ? 'Pending Approval' : isRejected ? 'Declined' : 'Locked'}
            </span>
          </div>
        </div>

        {/* Participant Name, USN & Pass ID */}
        <div className="py-4 text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {displayName}
          </h2>

          <div className="flex items-center justify-center gap-2">
            {profile.usn && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-800 border border-slate-700 text-emerald-400">
                <IdCard className="w-3 h-3 text-emerald-500" />
                {profile.usn}
              </span>
            )}
            <span className="text-[11px] text-slate-500 font-mono">
              #{passIdSnippet}
            </span>
          </div>
        </div>

        {/* Dynamic Pass Content Based on Approval Status */}
        {isApproved ? (
          /* Approved Pass: Display Live High-Contrast QR */
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow-inner mx-auto w-fit flex flex-col items-center justify-center my-1 animate-fadeIn">
              <QRCodeSVG
                value={activityQrValue}
                size={210}
                level="H"
                includeMargin={true}
                className="w-48 h-48 sm:w-52 sm:h-52"
              />
            </div>

            <p className="text-center text-xs text-slate-300 leading-relaxed font-medium">
              Present this pass at <span className="text-emerald-400 font-bold">{currentActivity.room}</span> to mark attendance for <span className="text-white font-semibold">{currentActivity.name}</span>.
            </p>
          </div>
        ) : isPending ? (
          /* Pending Approval State */
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-3 my-2 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Approval Request Pending</h4>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                Your request to join <strong className="text-amber-300">{currentActivity.name}</strong> in {currentActivity.room} is submitted. A coordinator or admin will approve it shortly.
              </p>
            </div>
          </div>
        ) : isRejected ? (
          /* Rejected State */
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3 my-2 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Not Registered for this Activity</h4>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                Your registration was not approved for {currentActivity.name}. Please contact the event coordinator.
              </p>
            </div>
          </div>
        ) : (
          /* Unrequested State */
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3 my-2 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Participation Approval Required</h4>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Not all students participate in all 5 events. Request access below to receive your QR pass for {currentActivity.name}.
              </p>
            </div>
            <button
              onClick={handleRequestPass}
              disabled={requesting}
              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 mx-auto active:scale-95 shadow-sm"
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
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Coordinator Approved Only</span>
          </div>
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-3 h-3 text-emerald-400" />
            <span>Works 100% Offline</span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Save Activity Pass to Gallery (when approved) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {isApproved ? (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-xs active:scale-[0.99]"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Generating Badge...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <Check className="w-4 h-4 text-slate-950" />
                <span>Saved {currentActivity.name} Pass!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download {currentActivity.room} Pass</span>
              </>
            )}
          </button>
        ) : isUnrequested ? (
          <button
            onClick={handleRequestPass}
            disabled={requesting}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-xs"
          >
            <Send className="w-4 h-4" />
            <span>Request Entry Pass</span>
          </button>
        ) : (
          <div className="w-full py-3 px-4 bg-slate-950/80 border border-slate-800 text-slate-500 font-medium rounded-2xl text-xs text-center flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Download Locked until Approved</span>
          </div>
        )}

        <button
          onClick={onEditProfile}
          className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 font-medium rounded-2xl transition-all flex items-center justify-center gap-2 text-xs"
        >
          <span>Edit Name / USN / Mobile</span>
        </button>
      </div>

      {/* Staff Preview Banner */}
      {isStaff && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center text-xs text-amber-300 font-medium">
          Coordinator / Admin View: You have full bypass preview for testing passes.
        </div>
      )}
    </div>
  );
}
