import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Lock, 
  Unlock, 
  Download, 
  Printer, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Trophy,
  Medal,
  Calendar,
  MapPin,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { 
  subscribeCertificateSettings, 
  toggleCertificateRelease, 
  fetchUserAttendance, 
  fetchUserScores 
} from '../services/certificateService';
import { 
  generateCertificateDataUrl, 
  downloadCertificateImage, 
  printCertificate 
} from '../utils/certificateGenerator';
import { ACTIVITIES } from '../data/activities';

/**
 * Individual Certificate Item Card
 */
function CertificateCard({ item, participantName, participantUsn }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const isWinner = item.scoreData && item.scoreData.rank <= 3;
  const rankLabel = item.scoreData?.rankLabel || (isWinner ? `Rank #${item.scoreData.rank}` : '');
  const certId = `CERT-2026-${item.activity.id.toUpperCase().slice(0, 4)}-${(participantUsn || item.attendance.id).slice(-6)}`;

  useEffect(() => {
    const url = generateCertificateDataUrl({
      participantName: participantName || 'Participant',
      participantUsn: participantUsn || '',
      activityName: item.activity.name,
      rankLabel,
      isWinner,
      dateString: 'November 2026',
      certificateId: certId
    });
    setDataUrl(url);
  }, [item, participantName, participantUsn, isWinner, rankLabel, certId]);

  const handleDownload = () => {
    if (!dataUrl) return;
    setDownloading(true);
    const filename = `Certificate_${item.activity.id}_${participantName.replace(/\s+/g, '_')}.png`;
    downloadCertificateImage(dataUrl, filename);
    setTimeout(() => setDownloading(false), 1000);
  };

  const handlePrint = () => {
    if (!dataUrl) return;
    printCertificate(dataUrl, `Certificate_${item.activity.name}`);
  };

  return (
    <div className={`rounded-3xl border p-5 sm:p-7 shadow-2xl transition-all space-y-5 relative overflow-hidden ${
      isWinner 
        ? 'bg-gradient-to-b from-amber-950/20 via-slate-900 to-slate-900 border-amber-500/40 shadow-amber-950/30' 
        : 'bg-slate-900 border-slate-800'
    }`}>
      {/* Top Banner Accent */}
      <div className={`absolute top-0 inset-x-0 h-1.5 ${
        isWinner ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-emerald-500'
      }`} />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1 ${
              isWinner
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
            }`}>
              {isWinner ? <Trophy className="w-3 h-3 text-amber-400" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              <span>{isWinner ? `Winner • ${rankLabel}` : 'Verified Participation'}</span>
            </span>

            <span className="text-[11px] font-mono text-slate-500">
              {certId}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            {item.activity.name}
          </h3>
          <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
            <MapPin className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-300">{item.activity.room}</span>
            <span>&bull;</span>
            <span>Attended on {item.attendance.timestamp.toLocaleDateString()}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleDownload}
            disabled={!dataUrl || downloading}
            className="py-2 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            title="Download high-resolution certificate image (PNG)"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>Download PNG</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!dataUrl}
            className="py-2 px-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
            title="Print or Save directly as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Visual Canvas Preview Frame */}
      {dataUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner group">
          <img 
            src={dataUrl} 
            alt="Certificate Preview" 
            className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.01]" 
          />
          <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center gap-1 shadow-sm">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>1920x1280 Retina Master</span>
          </div>
        </div>
      ) : (
        <div className="w-full aspect-[16/10] bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            <span>Generating high-resolution certificate...</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main Certificates View
 */
export default function CertificatesView({ user, profile, isAdmin = false }) {
  const [settings, setSettings] = useState({ enabled: false });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [toggling, setToggling] = useState(false);

  const [attendedItems, setAttendedItems] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // 1. Subscribe to real-time certificates on/off switch
  useEffect(() => {
    const unsubscribe = subscribeCertificateSettings((data) => {
      setSettings(data);
      setLoadingSettings(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch attended activities & winner scores for the current user
  useEffect(() => {
    if (!user?.uid) return;

    const loadRecords = async () => {
      setLoadingRecords(true);
      try {
        const [attendanceRecords, scoreRecords] = await Promise.all([
          fetchUserAttendance(user.uid),
          fetchUserScores(user.uid)
        ]);

        // Map attendance to activity definitions and attach scores
        const items = attendanceRecords.map((att) => {
          const act = ACTIVITIES.find(a => a.id === att.activityId) || {
            id: att.activityId,
            name: att.activityId,
            room: 'Campus Room'
          };
          const scoreMatch = scoreRecords.find(s => s.activityId === att.activityId);
          return {
            activity: act,
            attendance: att,
            scoreData: scoreMatch || null
          };
        });

        setAttendedItems(items);
      } catch (err) {
        console.error('Failed to load certificate records:', err);
      } finally {
        setLoadingRecords(false);
      }
    };

    loadRecords();
  }, [user?.uid]);

  const handleToggle = async () => {
    if (!isAdmin) return;
    try {
      setToggling(true);
      const nextState = !settings.enabled;
      await toggleCertificateRelease(nextState, user?.email || 'admin');
    } catch (err) {
      alert(err.message || 'Failed to update certificate release status');
    } finally {
      setToggling(false);
    }
  };

  const isEnabled = Boolean(settings.enabled);
  const participantName = profile?.name || user?.displayName || 'Participant';
  const participantUsn = profile?.usn || '';

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn">
      {/* Admin Master Switch Control Banner */}
      {isAdmin && (
        <div className={`rounded-3xl border p-5 sm:p-6 shadow-xl transition-all ${
          isEnabled
            ? 'bg-emerald-950/20 border-emerald-500/40'
            : 'bg-amber-950/20 border-amber-500/40'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm ${
                isEnabled
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              }`}>
                {isEnabled ? <Unlock className="w-6 h-6 text-emerald-400" /> : <Lock className="w-6 h-6 text-amber-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-400">
                    Admin Master Switch
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {isEnabled ? 'CERTIFICATES RELEASED' : 'CERTIFICATES LOCKED'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {isEnabled 
                    ? 'Participants can currently download their credentials' 
                    : 'Certificates are hidden behind the locked holding banner'}
                </h3>
              </div>
            </div>

            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 self-start sm:self-auto active:scale-95 ${
                isEnabled
                  ? 'bg-slate-800 hover:bg-slate-750 text-rose-300 border border-slate-700'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              {toggling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEnabled ? (
                <>
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>Lock Certificates</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Release Certificates to Everyone</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Content: Locked Banner vs Released Certificates */}
      {!isEnabled && !isAdmin ? (
        /* State 1: Locked Vault Banner for Participants */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700/80 text-amber-400 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/5">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Certificates Will Be Available After Event
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Official certificates of merit and participation are generated automatically based on coordinator room attendance scans. The organizers will release access immediately once competition evaluations conclude.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-center gap-2 text-xs font-mono text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Attendance records are securely recorded &bull; Check back soon</span>
          </div>
        </div>
      ) : (
        /* State 2: Released Certificates or Admin View */
        <div className="space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">My Event Credentials</h2>
                <p className="text-xs text-slate-400">
                  {participantName} {participantUsn && `• ${participantUsn}`}
                </p>
              </div>
            </div>

            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl self-start sm:self-auto font-bold">
              {attendedItems.length} {attendedItems.length === 1 ? 'Credential Earned' : 'Credentials Earned'}
            </span>
          </div>

          {/* Cards List */}
          {loadingRecords ? (
            <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              <span>Checking attendance and score logs...</span>
            </div>
          ) : attendedItems.length > 0 ? (
            <div className="space-y-6">
              {attendedItems.map((item) => (
                <CertificateCard
                  key={item.attendance.id}
                  item={item}
                  participantName={participantName}
                  participantUsn={participantUsn}
                />
              ))}
            </div>
          ) : (
            /* No Attendance Logged */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No Attendance Records Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                You must have your QR pass scanned by a room coordinator at the door to receive a participation or winner certificate for that competition.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

