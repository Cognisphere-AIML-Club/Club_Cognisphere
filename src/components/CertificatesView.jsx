import React, { useState, useEffect } from 'react';
import {
  Award,
  Lock,
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
  Loader2,
  Copy,
  Check,
  Share2,
  Zap,
  Info,
  CopyCheck
} from 'lucide-react';
import {
  subscribeCertificateSettings,
  subscribeUserAttendance,
  subscribeUserScores,
  subscribeUserCoordinatorCertificates,
  recordCertificateIssuance,
  buildCertificateId
} from '../services/certificateService';
import { markAttendance } from '../services/attendanceService';
import {
  generateCertificateDataUrl,
  downloadCertificateImage,
  printCertificate
} from '../utils/certificateGenerator';
import { ACTIVITIES } from '../data/activities';

/**
 * Individual Certificate Item Card
 */
function CertificateCard({ item, participantName, user, profile }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pngDataUrl, setPngDataUrl] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  const certType = item.certType || 'participation';
  const isCoordinatorCert = certType === 'coordinator';
  const isWinner = !isCoordinatorCert && item.scoreData && item.scoreData.rank <= 3;
  const rankLabel = item.scoreData?.rankLabel || (isWinner ? `Rank #${item.scoreData.rank}` : '');

  // Clean short certificate identification code
  const certId = item.certId || buildCertificateId({
    certType,
    activityId: item.activity?.id,
    attendanceId: item.attendance?.id,
    participantId: item.attendance?.participantId || user?.uid,
    certId: item.attendance?.certId,
    email: user?.email || profile?.email || '',
    usn: profile?.usn || ''
  });

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const verifyUrl = `${origin}/verify?id=${certId}`;

  useEffect(() => {
    let isMounted = true;

    // Fast lightweight WebP preview on page load (0 heavy memory, does not load original image)
    generateCertificateDataUrl({
      participantName: participantName || 'Participant',
      certType,
      activityId: item.activity.id,
      activityName: item.activity.name,
      eventDate: item.activity.eventDate || '',
      certificateId: certId,
      verifyUrl,
      format: 'image/webp',
      useOriginalTemplate: false
    }).then(url => {
      if (isMounted) setPreviewUrl(url);
    }).catch(err => {
      console.warn('Certificate preview generation failed:', err);
    });

    // Save lightweight verification record to Firestore without calling heavy server scripts
    if (user?.uid && !item.coordRecord) {
      recordCertificateIssuance({
        certId,
        certType,
        participantId: user.uid,
        participantName,
        participantUsn: profile?.usn || '',
        participantEmail: user?.email || profile?.email || '',
        activityId: item.activity.id,
        activityName: item.activity.name,
        verifyUrl
      });
    }

    return () => { isMounted = false; };
  }, [item, participantName, certType, certId, verifyUrl, user?.uid, user?.email, profile?.email, profile?.usn]);

  // Render original high-resolution PNG on-demand only when downloading or exporting PDF
  const getOrRenderOriginalPng = async () => {
    if (pngDataUrl) return pngDataUrl;
    const url = await generateCertificateDataUrl({
      participantName: participantName || 'Participant',
      certType,
      activityId: item.activity.id,
      activityName: item.activity.name,
      eventDate: item.activity.eventDate || '',
      certificateId: certId,
      verifyUrl,
      format: 'image/png',
      useOriginalTemplate: true
    });
    setPngDataUrl(url);
    return url;
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const originalPng = await getOrRenderOriginalPng();
      const cleanCertName = (participantName || 'Participant').replace(/[^a-zA-Z0-9]/g, '_');
      const slug = isCoordinatorCert ? 'Coordinator' : item.activity.id;
      const filename = `IGNITE2026_${slug}_${cleanCertName}.png`;
      downloadCertificateImage(originalPng, filename);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to generate high-resolution certificate for download');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    try {
      setExportingPdf(true);
      // Converts the exact PNG to PDF with 1:1 dimensions (3507x2480 pt)
      const originalPng = await getOrRenderOriginalPng();
      const cleanCertName = (participantName || 'Participant').replace(/[^a-zA-Z0-9]/g, '_');
      const slug = isCoordinatorCert ? 'Coordinator' : item.activity.id;
      const filename = `IGNITE2026_${slug}_${cleanCertName}.pdf`;
      await printCertificate(originalPng, `IGNITE 2026 - ${item.activity.name}`, filename);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to generate certificate PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleCopyLink = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareLinkedIn = () => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const shareUrl = verifyUrl || `${origin}/verify`;
    const eventName = item.activity?.name ? `${item.activity.name} at IGNITE 2026` : 'IGNITE 2026';

    let leadText = `I participated in ${eventName} organized by Cognisphere, Sambhram Institute of Technology.`;
    if (isCoordinatorCert) {
      leadText = `I served as an Event Coordinator during IGNITE 2026 organized by Cognisphere, Sambhram Institute of Technology.`;
    } else if (isWinner && rankLabel) {
      leadText = `Excited to share that I achieved ${rankLabel} in ${item.activity?.name || 'IGNITE 2026'} organized by Cognisphere, Sambhram Institute of Technology!`;
    }

    const postText = `${leadText} Here is my verified certificate:\n${shareUrl}\n\n#Cognisphere #IGNITE2026 #Achievement #TechEvent`;
    const linkedinUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(postText)}&linkOrigin=DEEPLINK`;
    window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
  };

  const attendanceDate = isCoordinatorCert
    ? '24-25 Nov 2026'
    : item.attendance.timestamp?.toLocaleDateString
    ? item.attendance.timestamp.toLocaleDateString()
    : '24-25 Nov 2026';

  return (
    <div className="rounded-3xl border border-surface-container bg-surface-container-lowest p-5 sm:p-7 shadow-xs transition-all space-y-5 relative overflow-hidden">
      {/* Top Banner Accent */}
      <div className={`absolute top-0 inset-x-0 h-1.5 ${isCoordinatorCert || isWinner ? 'bg-primary' : 'bg-tertiary'
        }`} />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-container">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1 ${isCoordinatorCert || isWinner
              ? 'bg-surface-container border-surface-container-high text-primary'
              : 'bg-tertiary-container border-tertiary/30 text-on-tertiary-container'
              }`}>
              {isCoordinatorCert ? (
                <ShieldCheck className="w-3 h-3 text-primary" />
              ) : isWinner ? (
                <Trophy className="w-3 h-3 text-primary" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-on-tertiary-container" />
              )}
              <span>
                {isCoordinatorCert
                  ? 'Verified Coordinator'
                  : isWinner
                  ? `Winner • ${rankLabel}`
                  : 'Verified Participation'}
              </span>
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-extrabold text-on-surface tracking-tight">
            {isCoordinatorCert ? 'Certificate of Coordination' : item.activity.name}
          </h3>
          <p className="text-xs text-secondary flex items-center gap-2 mt-0.5">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="text-on-surface font-medium">Sambhram Institute of Technology</span>
            <span>&bull;</span>
            <span>{isCoordinatorCert ? `Event Dates: ${attendanceDate}` : `Attended: ${attendanceDate}`}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleDownload}
            disabled={downloading || exportingPdf}
            className="py-2 px-3.5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            title="Download high-resolution certificate image (PNG)"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{downloading ? 'Rendering...' : 'Download PNG'}</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={downloading || exportingPdf}
            className="py-2 px-3 bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-on-surface font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-xs"
            title="Convert PNG directly to PDF with exact 3507x2480 dimensions"
          >
            {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
            <span>{exportingPdf ? 'Exporting PDF...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Visual Canvas Preview Frame (WebP loaded on page load) */}
      {previewUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-surface-container bg-surface-container-low shadow-inner group">
          <img
            src={previewUrl}
            alt="Certificate Preview"
            className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.005]"
          />
        </div>
      ) : (
        <div className="w-full aspect-[16/10] bg-surface-container-low rounded-2xl border border-surface-container flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-secondary">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Loading certificate preview...</span>
          </div>
        </div>
      )}

      {/* Verification & Sharing Footer Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 px-1 text-xs text-secondary">
        <div className="flex flex-row gap-1">
          <span className="text-xs flex items-center gap-1 self-start sm:self-auto">Verification Link:</span>
          <button
            className="text-primary hover:underline font-bold text-xs flex items-center gap-1 self-start sm:self-auto"
          >
            {<a href={verifyUrl} target="_blank">{verifyUrl}</a>}
          </button>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleCopyLink}
            className="text-primary hover:underline font-bold text-xs flex items-center gap-1">
            {copied ? <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Copied!</span> : <span className="flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Copy Link</span>}
          </button>
          <button
            type="button"
            onClick={handleShareLinkedIn}
            className="p-1 hover:opacity-90 active:scale-95 transition-transform rounded"
            title="Share certificate on LinkedIn feed"
            aria-label="Share certificate on LinkedIn feed"
          >
            <svg className="w-4 h-4 rounded-[3px]" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="4" fill="#0A66C2" />
              <path
                d="M7.4 9.5H5V17.5H7.4V9.5ZM6.2 8.4C7 8.4 7.6 7.8 7.6 7C7.6 6.2 7 5.6 6.2 5.6C5.4 5.6 4.8 6.2 4.8 7C4.8 7.8 5.4 8.4 6.2 8.4ZM11.6 17.5V13.3C11.6 12.1 12.3 11.3 13.5 11.3C14.7 11.3 15.3 12.2 15.3 13.4V17.5H17.7V13C17.7 10.6 16.3 9.4 14.4 9.4C13 9.4 12.1 10.2 11.6 11.1V9.5H9.3V17.5H11.6Z"
                fill="white"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Certificates View
 */
export default function CertificatesView({
  user,
  profile,
  isAdmin = false,
  isCoordinator = false,
  roleData = null,
  activities = ACTIVITIES
}) {
  const allActivities = activities && activities.length > 0 ? activities : ACTIVITIES;
  const [settings, setSettings] = useState({ enabled: false });
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [attendedItems, setAttendedItems] = useState([]);
  const [coordinatorCerts, setCoordinatorCerts] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // Quick self check-in testing state for Admin/Staff
  const [testActivityId, setTestActivityId] = useState(() => allActivities[0]?.id || 'quiz');
  const [checkingInSelf, setCheckingInSelf] = useState(false);

  // 1. Subscribe to real-time certificates on/off switch in Firestore
  useEffect(() => {
    const unsubscribe = subscribeCertificateSettings((data) => {
      setSettings(data);
      setLoadingSettings(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time subscription to user's attendance records & scores
  useEffect(() => {
    if (!user?.uid && !profile?.usn) {
      setLoadingRecords(false);
      return;
    }

    setLoadingRecords(true);

    let currentAttendance = [];
    let currentScores = [];

    const rebuildItems = () => {
      // Deduplicate by activityId so each unique event yields exactly 1 official certificate
      const uniqueEventsMap = new Map();

      currentAttendance.forEach((att) => {
        const actId = (att.activityId || att.passActivityId || 'general').trim().toLowerCase();
        if (!uniqueEventsMap.has(actId)) {
          uniqueEventsMap.set(actId, att);
        } else {
          const existing = uniqueEventsMap.get(actId);
          const existingTime = existing.timestamp?.getTime ? existing.timestamp.getTime() : 0;
          const newTime = att.timestamp?.getTime ? att.timestamp.getTime() : 0;
          if (newTime && (!existingTime || newTime < existingTime)) {
            uniqueEventsMap.set(actId, att);
          }
        }
      });

      const uniqueAttendance = Array.from(uniqueEventsMap.values());

      const items = uniqueAttendance.map((att) => {
        const actId = att.activityId || att.passActivityId;
        const act = allActivities.find(a =>
          a.id?.toLowerCase() === actId?.toLowerCase()
        ) || {
          id: actId || 'general',
          name: att.activityName || att.passActivityId || actId || 'Competition Event',
          room: 'Campus Arena'
        };

        const scoreMatch = currentScores.find(s =>
          s.activityId?.toLowerCase() === actId?.toLowerCase()
        );

        return {
          activity: act,
          attendance: att,
          scoreData: scoreMatch || null
        };
      });

      setAttendedItems(items);
      setLoadingRecords(false);
    };

    const unsubAttendance = subscribeUserAttendance(user?.uid, profile?.usn, (attList) => {
      currentAttendance = attList;
      rebuildItems();
    });

    const unsubScores = subscribeUserScores(user?.uid, profile?.usn, (scoresList) => {
      currentScores = scoresList;
      rebuildItems();
    });

    return () => {
      unsubAttendance();
      unsubScores();
    };
  }, [user?.uid, profile?.usn, allActivities]);

  // 2.5 Subscribe to Coordinator certificates issued for this user
  useEffect(() => {
    const email = user?.email || profile?.email || roleData?.email || '';
    const usn = profile?.usn || roleData?.usn || '';
    if (!user?.uid && !email && !usn) {
      setCoordinatorCerts([]);
      return;
    }
    const unsubCoord = subscribeUserCoordinatorCertificates(
      { userId: user?.uid, userEmail: email, userUsn: usn },
      setCoordinatorCerts
    );
    return () => unsubCoord();
  }, [user?.uid, user?.email, profile?.email, profile?.usn, roleData?.email, roleData?.usn]);

  const coordinatorCards = React.useMemo(() => {
    const list = [];
    const seenIds = new Set();

    coordinatorCerts.forEach((docRec) => {
      const cid = docRec.certId || docRec.id;
      if (!cid || seenIds.has(cid)) return;
      seenIds.add(cid);
      list.push({
        certType: 'coordinator',
        certId: cid,
        activity: {
          id: docRec.activityId || 'coordinator',
          name: docRec.activityName || 'Event Coordination & Monitoring'
        },
        attendance: {
          id: `coord_${cid}`,
          participantId: docRec.participantId || user?.uid,
          certId: cid,
          timestamp: docRec.issuedAt || null
        },
        scoreData: null,
        coordRecord: docRec
      });
    });

    if (isCoordinator && list.length === 0 && user?.uid) {
      const cid = buildCertificateId({
        certType: 'coordinator',
        email: user?.email || profile?.email || roleData?.email || '',
        usn: profile?.usn || roleData?.usn || '',
        participantId: user.uid
      });
      const actName = (roleData?.assignedEvent || 'Event Coordination & Monitoring')
        .replace(/\s*\(\s*Room\b[^)]*\)/gi, '')
        .trim();
      list.push({
        certType: 'coordinator',
        certId: cid,
        activity: {
          id: roleData?.activityId || 'coordinator',
          name: actName
        },
        attendance: {
          id: `coord_${cid}`,
          participantId: user.uid,
          certId: cid,
          timestamp: null
        },
        scoreData: null,
        coordRecord: null
      });
    }

    return list;
  }, [coordinatorCerts, isCoordinator, user?.uid, user?.email, profile?.email, profile?.usn, roleData]);

  // Quick self-check-in helper for Admin / Staff testing
  const handleTestSelfCheckIn = async () => {
    if (!user?.uid) return;
    setCheckingInSelf(true);
    try {
      const selectedAct = allActivities.find(a => a.id === testActivityId);
      const res = await markAttendance({
        activityId: testActivityId,
        participantId: user.uid,
        participantName: participantName || 'Participant',
        participantUsn: profile?.usn || '',
        scannedBy: user.email || 'self_test',
        passActivityId: testActivityId
      });
      alert(`Check-in recorded for ${selectedAct?.name || testActivityId}!`);
    } catch (err) {
      alert('Self check-in notice: ' + err.message);
    } finally {
      setCheckingInSelf(false);
    }
  };

  const isEnabled = Boolean(settings.enabled);
  const canPreview = Boolean(isAdmin);
  const visibleCoordinatorCards = (isEnabled || canPreview || isCoordinator || coordinatorCards.length > 0)
    ? coordinatorCards
    : [];
  const visibleParticipantCards = (isEnabled || canPreview) ? attendedItems : [];
  const displayCards = [...visibleCoordinatorCards, ...visibleParticipantCards];

  // Strictly prioritize certificateName from profile editing, fallback to name, user displayName
  const participantName = profile?.certificateName || profile?.name || user?.displayName || 'Participant';

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn">
      {/* Main Content: Locked Banner vs Released / Preview Mode */}
      {!isEnabled && !canPreview && visibleCoordinatorCards.length === 0 ? (
        /* State 1: Locked Vault Banner for General Participants */
        <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Certificates Will Be Available After Event
            </h2>
            <p className="text-xs sm:text-sm text-secondary leading-relaxed">
              Official participation certificates are generated based on coordinator room attendance scans. The organizers will release access once competition evaluations conclude.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-center gap-2 text-xs font-mono text-secondary">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Attendance records are securely recorded &bull; Check back soon</span>
          </div>
        </div>
      ) : (
        /* State 2: Released Certificates or Staff Preview View */
        <div className="space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest border border-surface-container rounded-3xl p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-on-surface tracking-tight">My Event Credentials</h2>
                <p className="text-xs text-secondary">
                  Name on Certificate: <span className="font-semibold text-on-surface">{participantName}</span>
                </p>
              </div>
            </div>

            <span className="text-xs font-mono text-primary bg-surface-container border border-surface-container-high px-3 py-1 rounded-xl self-start sm:self-auto font-bold">
              {displayCards.length} {displayCards.length === 1 ? 'Credential Earned' : 'Credentials Earned'}
            </span>
          </div>

          {/* Cards List */}
          {loadingRecords && visibleCoordinatorCards.length === 0 ? (
            <div className="py-12 text-center text-xs text-secondary flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Checking real-time attendance and credentials...</span>
            </div>
          ) : displayCards.length > 0 ? (
            <div className="space-y-6">
              {displayCards.map((item) => (
                <CertificateCard
                  key={item.certId || item.attendance.id}
                  item={item}
                  participantName={participantName}
                  user={user}
                  profile={profile}
                />
              ))}
            </div>
          ) : (
            /* No Attendance Logged */
            <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-8 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-surface-container text-secondary flex items-center justify-center mx-auto">
                <Award className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-on-surface">No Attendance Records Found</h3>
                <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed">
                  You must have your QR pass scanned by a room coordinator at the door to receive a participation certificate for that competition.
                </p>
                <p className="text-[11px] font-mono text-secondary pt-1">
                  Checked for UID: {user?.uid?.slice(-6)} {profile?.usn ? `• USN: ${profile.usn}` : ''}
                </p>
              </div>

              {/* Staff Self-Checkin Testing Helper */}
              {canPreview && (
                <div className="pt-4 max-w-sm mx-auto p-4 rounded-2xl bg-surface-container border border-surface-container-high text-left space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>Staff Testing Check-in</span>
                  </div>
                  <p className="text-[11px] text-secondary">
                    Mark attendance for your own account to immediately verify certificate generation:
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={testActivityId}
                      onChange={(e) => setTestActivityId(e.target.value)}
                      className="flex-1 bg-surface-container-lowest border border-surface-container-highest text-on-surface text-xs rounded-xl px-2.5 py-1.5 font-medium"
                    >
                      {allActivities.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleTestSelfCheckIn}
                      disabled={checkingInSelf}
                      className="px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1"
                    >
                      {checkingInSelf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Check-in</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
