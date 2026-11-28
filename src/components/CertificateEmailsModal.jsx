import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Mail,
  X,
  Users,
  Trophy,
  ShieldCheck,
  Search,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Send,
  Download,
  Loader2,
  UserPlus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Settings2,
  StopCircle,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { ACTIVITIES } from '../data/activities';
import {
  subscribeToAllAttendance,
  subscribeToUnregisteredParticipants
} from '../services/attendanceService';
import {
  subscribeToRolesCollection,
  subscribeToIgniteCoordinators,
  subscribeToParticipantsCollection,
  addCoordinatorToDatabase,
  lookupParticipantProfile
} from '../services/coordinatorConfigService';
import {
  buildCertificateId,
  recordCertificateIssuance,
  subscribeAllIssuedCertificates,
  subscribePrivateMailerConfig,
  savePrivateMailerConfig,
  generateMailerApiKey,
  markCertificateEmailSent
} from '../services/certificateService';
import {
  buildCertificateEmail,
  copyRichEmailToClipboard,
  buildSecureClubGmailScript
} from '../utils/certificateEmailTemplates';

export default function CertificateEmailsModal({
  isOpen,
  onClose,
  activities = ACTIVITIES
}) {
  const allActivities = activities && activities.length > 0 ? activities : ACTIVITIES;
  const getAct = (id) => allActivities.find(a => a.id?.toLowerCase() === id?.toLowerCase());

  const [activeTab, setActiveTab] = useState('participation'); // 'participation' | 'winner' | 'coordinator'
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');

  // Live Firestore datasets (only subscribed while modal is open)
  const [regAttendance, setRegAttendance] = useState([]);
  const [unregAttendance, setUnregAttendance] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [igniteCoordinatorsList, setIgniteCoordinatorsList] = useState([]);
  const [participantsMap, setParticipantsMap] = useState({});
  const [issuedCertsMap, setIssuedCertsMap] = useState({});
  const [customCoordinators, setCustomCoordinators] = useState([]);
  const [customWinners, setCustomWinners] = useState([]);

  // Selection & inline overrides
  const [selectedKey, setSelectedKey] = useState('');
  const [emailOverrides, setEmailOverrides] = useState({});
  const [nameOverrides, setNameOverrides] = useState({});

  // Issuing & Copy feedback state
  const [issuingAll, setIssuingAll] = useState(false);
  const [issuingSingle, setIssuingSingle] = useState(false);
  const [copiedState, setCopiedState] = useState(''); // 'rich' | 'plain' | 'viewUrl' | 'linkedinUrl' | 'subject' | 'script'
  const [statusNotice, setStatusNotice] = useState(null);

  // Automated Club Gmail (Apps Script) state
  const [mailerUrl, setMailerUrl] = useState(() => import.meta.env.VITE_MAILER_WEBAPP_URL || '');
  const [mailerApiKey, setMailerApiKey] = useState(
    () => import.meta.env.VITE_MAILER_API_SECRET || generateMailerApiKey()
  );
  const [publicBaseUrl, setPublicBaseUrl] = useState(
    () => import.meta.env.VITE_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [showMailerSetup, setShowMailerSetup] = useState(false);
  const [savingMailer, setSavingMailer] = useState(false);
  const [testingMailer, setTestingMailer] = useState(false);
  const [dailyQuota, setDailyQuota] = useState(null);
  const [sendingSingle, setSendingSingle] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, failed: 0, total: 0, currentName: '' });
  const stopBulkRef = useRef(false);

  // Quick Add Coordinator / Winner / Runner-up form
  const [showAddForm, setShowAddForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customUsn, setCustomUsn] = useState('');
  const [customActivityId, setCustomActivityId] = useState(() => allActivities[0]?.id || 'coordinator');
  const [customWinnerPosition, setCustomWinnerPosition] = useState('Winner');

  useEffect(() => {
    if (!isOpen) return;

    const unsubs = [
      subscribeToAllAttendance(setRegAttendance),
      subscribeToUnregisteredParticipants(setUnregAttendance),
      subscribeToRolesCollection(setRolesList),
      subscribeToIgniteCoordinators(setIgniteCoordinatorsList),
      subscribeToParticipantsCollection(setParticipantsMap),
      subscribeAllIssuedCertificates(setIssuedCertsMap),
      subscribePrivateMailerConfig((cfg) => {
        if (cfg?.mailerWebAppUrl) setMailerUrl(cfg.mailerWebAppUrl);
        if (cfg?.mailerApiKey) setMailerApiKey(cfg.mailerApiKey);
        if (cfg?.publicBaseUrl) setPublicBaseUrl(cfg.publicBaseUrl);
      })
    ];

    return () => {
      unsubs.forEach(u => {
        try { if (typeof u === 'function') u(); } catch (_) { }
      });
    };
  }, [isOpen]);

  const origin = (publicBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '')).trim().replace(/\/+$/, '');
  const isLocalhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(origin);

  // Build normalized items per category
  const participantItems = useMemo(() => {
    const merged = [...regAttendance, ...unregAttendance];
    const seen = new Map();

    merged.forEach((rec) => {
      const actKey = (rec.activityId || rec.passActivityId || 'general').trim().toLowerCase();
      const prof = lookupParticipantProfile(participantsMap, {
        participantId: rec.participantId,
        usn: rec.participantUsn,
        email: rec.participantEmail,
        name: rec.participantName
      });
      const resolvedUsn = (rec.participantUsn || prof?.usn || '').trim().toUpperCase();
      const resolvedEmail = (rec.participantEmail || prof?.email || '').trim().toLowerCase();
      const idKey = resolvedUsn || (rec.participantId || rec.id || '').trim().toUpperCase();
      const dedupKey = `${actKey}::${idKey}`;
      if (seen.has(dedupKey)) return;

      const act = getAct(rec.activityId);
      const certId = buildCertificateId({
        activityId: rec.activityId,
        attendanceId: rec.id,
        participantId: rec.participantId,
        certId: rec.certId,
        certType: 'participation'
      });

      seen.set(dedupKey, {
        key: `part_${dedupKey}`,
        recipientType: 'participation',
        participantId: rec.participantId || rec.id,
        name: rec.participantName || prof?.name || 'Participant',
        usn: resolvedUsn,
        email: resolvedEmail,
        activityId: rec.activityId || 'general',
        activityName: rec.activityName || act?.name || rec.activityId || 'IGNITE 2026',
        certId,
        verifyUrl: `${origin}/verify?id=${encodeURIComponent(certId)}`,
        isIssued: Boolean(issuedCertsMap[certId]),
        isSent: Boolean(issuedCertsMap[certId]?.emailSentAt)
      });
    });

    return Array.from(seen.values());
  }, [regAttendance, unregAttendance, participantsMap, issuedCertsMap, origin, allActivities]);

  const winnerItems = useMemo(() => {
    const winMap = new Map();

    // Include manually issued winners & runner-ups persisted in Firestore certificates collection
    Object.values(issuedCertsMap)
      .filter(c => c.certType === 'winner')
      .forEach((c) => {
        const prof = lookupParticipantProfile(participantsMap, {
          participantId: c.participantId,
          usn: c.participantUsn,
          email: c.participantEmail,
          name: c.participantName
        });
        const act = getAct(c.activityId);
        const certId = c.certId || c.id;
        winMap.set(certId, {
          key: `win_${certId}`,
          recipientType: 'winner',
          participantId: c.participantId || certId,
          name: c.participantName || prof?.name || 'Winner',
          usn: (c.participantUsn || prof?.usn || '').toUpperCase(),
          email: c.participantEmail || prof?.email || '',
          activityId: c.activityId || 'general',
          activityName: c.activityName || act?.name || c.activityId || 'IGNITE 2026',
          rank: c.rank || 1,
          rankLabel: c.rankLabel || 'Winner',
          certId,
          verifyUrl: c.verifyUrl || `${origin}/verify?id=${encodeURIComponent(certId)}`,
          isIssued: true,
          isSent: Boolean(c.emailSentAt)
        });
      });

    customWinners.forEach((w) => {
      winMap.set(w.certId, {
        ...w,
        isIssued: Boolean(issuedCertsMap[w.certId] || w.isIssued),
        isSent: Boolean(issuedCertsMap[w.certId]?.emailSentAt)
      });
    });

    return Array.from(winMap.values());
  }, [issuedCertsMap, customWinners, participantsMap, origin, allActivities]);

  const coordinatorItems = useMemo(() => {
    const coordMap = new Map();

    [...rolesList, ...igniteCoordinatorsList]
      .filter(r => r.role === 'coordinator' || r.baseRole === 'coordinator')
      .forEach((r) => {
        const prof = lookupParticipantProfile(participantsMap, {
          participantId: r.uid,
          usn: r.usn,
          email: r.email,
          name: r.name
        });
        const email = (r.email || prof?.email || '').trim().toLowerCase();
        const usn = (r.usn || prof?.usn || '').trim().toUpperCase();
        const name = (r.name || prof?.name || (email ? email.split('@')[0] : 'Coordinator')).trim();
        const act = getAct(r.activityId) || allActivities.find(a => a.name?.toLowerCase() === String(r.assignedEvent || '').toLowerCase());
        const keySeed = email || r.uid || r.id || name;

        const certId = buildCertificateId({
          certType: 'coordinator',
          email,
          usn,
          participantId: r.uid || r.id || name
        });

        coordMap.set(keySeed, {
          key: `coord_${keySeed}`,
          recipientType: 'coordinator',
          participantId: r.uid || r.id || `coord_${certId}`,
          name,
          usn,
          email,
          activityId: act?.id || r.activityId || 'coordinator',
          activityName: (act?.name || r.assignedEvent || 'Event Coordination & Monitoring')
            .replace(/\s*\(\s*Room\b[^)]*\)/gi, '')
            .trim(),
          certId,
          verifyUrl: `${origin}/verify?id=${encodeURIComponent(certId)}`,
          isIssued: Boolean(issuedCertsMap[certId]),
          isSent: Boolean(issuedCertsMap[certId]?.emailSentAt)
        });
      });

    customCoordinators.forEach((c) => {
      coordMap.set(c.key, {
        ...c,
        isIssued: Boolean(issuedCertsMap[c.certId]),
        isSent: Boolean(issuedCertsMap[c.certId]?.emailSentAt)
      });
    });

    return Array.from(coordMap.values());
  }, [rolesList, igniteCoordinatorsList, participantsMap, customCoordinators, issuedCertsMap, origin, allActivities]);

  const currentList = useMemo(() => {
    const base =
      activeTab === 'winner'
        ? winnerItems
        : activeTab === 'coordinator'
          ? coordinatorItems
          : participantItems;

    return base.filter((item) => {
      if (activityFilter !== 'all' && item.activityId !== activityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (item.name || '').toLowerCase().includes(q) ||
          (item.usn || '').toLowerCase().includes(q) ||
          (item.email || '').toLowerCase().includes(q) ||
          (item.activityName || '').toLowerCase().includes(q) ||
          (item.certId || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [activeTab, participantItems, winnerItems, coordinatorItems, activityFilter, searchQuery]);

  // Select first item automatically when switching tabs or list changes
  useEffect(() => {
    if (currentList.length > 0 && !currentList.some(i => i.key === selectedKey)) {
      setSelectedKey(currentList[0].key);
    } else if (currentList.length === 0) {
      setSelectedKey('');
    }
  }, [currentList, selectedKey]);

  const selectedItem = useMemo(
    () => currentList.find(i => i.key === selectedKey) || null,
    [currentList, selectedKey]
  );

  const effectiveName = selectedItem
    ? (nameOverrides[selectedItem.key] !== undefined ? nameOverrides[selectedItem.key] : selectedItem.name)
    : '';
  const effectiveEmail = selectedItem
    ? (emailOverrides[selectedItem.key] !== undefined ? emailOverrides[selectedItem.key] : selectedItem.email)
    : '';

  const emailData = useMemo(() => {
    if (!selectedItem) return null;
    return buildCertificateEmail({
      recipientType: selectedItem.recipientType,
      name: effectiveName || selectedItem.name,
      activityName: selectedItem.activityName,
      rankLabel: selectedItem.rankLabel,
      certId: selectedItem.certId,
      verifyUrl: selectedItem.verifyUrl
    });
  }, [selectedItem, effectiveName]);

  // Persist a certificate record to Firestore so /verify?id=... resolves immediately
  const ensureIssued = async (item, nameOverride = null, emailOverride = null) => {
    return recordCertificateIssuance({
      certId: item.certId,
      certType: item.recipientType,
      participantId: item.participantId || item.certId,
      participantName: nameOverride || item.name,
      participantUsn: item.usn || '',
      participantEmail: emailOverride !== null ? emailOverride : item.email,
      activityId: item.activityId,
      activityName: item.activityName,
      rank: item.rank || null,
      rankLabel: item.rankLabel || '',
      verifyUrl: item.verifyUrl
    });
  };

  const handleActivateSelectedLink = async () => {
    if (!selectedItem) return;
    try {
      setIssuingSingle(true);
      await ensureIssued(selectedItem, effectiveName, effectiveEmail);
      setStatusNotice(`Activated verification link for ${effectiveName} (${selectedItem.certId})!`);
    } catch (err) {
      alert(err.message || 'Failed to activate certificate link');
    } finally {
      setIssuingSingle(false);
    }
  };

  const unissuedCount = useMemo(
    () => currentList.filter(i => !i.isIssued).length,
    [currentList]
  );

  const handleGenerateAllLinks = async () => {
    const toIssue = currentList.filter(i => !i.isIssued);
    if (toIssue.length === 0) {
      setStatusNotice('All certificate verification links in this list are already active!');
      return;
    }
    try {
      setIssuingAll(true);
      for (const item of toIssue) {
        const n = nameOverrides[item.key] || item.name;
        const em = emailOverrides[item.key] !== undefined ? emailOverrides[item.key] : item.email;
        await ensureIssued(item, n, em);
      }
      setStatusNotice(`Generated & activated ${toIssue.length} certificate link(s) in registry!`);
    } catch (err) {
      alert(err.message || 'Failed to generate all links');
    } finally {
      setIssuingAll(false);
    }
  };

  const handleAddCustomWinner = async (e) => {
    e.preventDefault();
    const cleanName = customName.trim();
    const cleanEmail = customEmail.trim().toLowerCase();
    const cleanUsn = customUsn.trim().toUpperCase();
    if (!cleanName) return;

    const actId = customActivityId && customActivityId !== 'coordinator'
      ? customActivityId
      : (allActivities[0]?.id || 'general');
    const act = getAct(actId);
    const rankLabel = customWinnerPosition || 'Winner';
    const rankNum = rankLabel.toLowerCase().includes('runner-up') && rankLabel.includes('2nd Runner')
      ? 3
      : rankLabel.toLowerCase().includes('runner') || rankLabel.includes('2nd')
        ? 2
        : rankLabel.includes('3rd')
          ? 3
          : 1;

    const certId = buildCertificateId({
      activityId: actId,
      certType: 'winner',
      email: cleanEmail,
      usn: cleanUsn,
      participantId: `${cleanName}_${rankLabel}`
    });
    const verifyUrl = `${origin}/verify?id=${encodeURIComponent(certId)}`;
    const newItem = {
      key: `win_${certId}`,
      recipientType: 'winner',
      participantId: `win_${certId}`,
      name: cleanName,
      usn: cleanUsn,
      email: cleanEmail,
      activityId: actId,
      activityName: act?.name || actId || 'IGNITE 2026',
      rank: rankNum,
      rankLabel,
      certId,
      verifyUrl,
      isIssued: true
    };

    try {
      setIssuingSingle(true);
      await ensureIssued(newItem);
      setCustomWinners(prev => [newItem, ...prev.filter(x => x.certId !== certId)]);
      setSelectedKey(newItem.key);
      setCustomName('');
      setCustomEmail('');
      setCustomUsn('');
      setShowAddForm(false);
      setStatusNotice(`Created ${rankLabel} certificate link for ${cleanName} (${certId})!`);
    } catch (err) {
      alert(err.message || 'Failed to create winner certificate link');
    } finally {
      setIssuingSingle(false);
    }
  };

  const handleAddCustomCoordinator = async (e) => {
    e.preventDefault();
    const cleanName = customName.trim();
    const cleanEmail = customEmail.trim().toLowerCase();
    const cleanUsn = customUsn.trim().toUpperCase();
    if (!cleanName) return;

    const act = getAct(customActivityId);
    const certId = buildCertificateId({
      certType: 'coordinator',
      email: cleanEmail,
      usn: cleanUsn,
      participantId: cleanName
    });
    const verifyUrl = `${origin}/verify?id=${encodeURIComponent(certId)}`;
    const newItem = {
      key: `coord_custom_${certId}`,
      recipientType: 'coordinator',
      participantId: `coord_${certId}`,
      name: cleanName,
      usn: cleanUsn,
      email: cleanEmail,
      activityId: act?.id || 'coordinator',
      activityName: act?.name || 'Event Coordination & Monitoring',
      certId,
      verifyUrl,
      isIssued: true
    };

    try {
      setIssuingSingle(true);
      await ensureIssued(newItem);
      // Persist permanently to IGNITE 2026 coordinators database (`igniteCoordinators` + `roles`)
      try {
        await addCoordinatorToDatabase({
          email: cleanEmail,
          name: cleanName,
          usn: cleanUsn,
          activityId: act?.id || 'all',
          assignedEvent: act?.name || 'All Events',
          assignedRoom: act ? (act.room || '') : 'All Rooms',
          addedBy: 'admin'
        });
      } catch (coordErr) {
        console.warn('Coordinator DB save notice:', coordErr?.message);
      }
      setCustomCoordinators(prev => [newItem, ...prev.filter(x => x.certId !== certId)]);
      setSelectedKey(newItem.key);
      setCustomName('');
      setCustomEmail('');
      setCustomUsn('');
      setShowAddForm(false);
      setStatusNotice(`Saved ${cleanName} as IGNITE Coordinator & created certificate link (${certId})!`);
    } catch (err) {
      alert(err.message || 'Failed to create coordinator certificate link');
    } finally {
      setIssuingSingle(false);
    }
  };

  const triggerCopyFeedback = (key) => {
    setCopiedState(key);
    setTimeout(() => setCopiedState(''), 2200);
  };

  const handleCopyRichEmail = async () => {
    if (!emailData || !selectedItem) return;
    // Copy immediately inside click gesture BEFORE awaiting Firestore so browser preserves rich text/html clipboard
    const mode = await copyRichEmailToClipboard(emailData.html, emailData.plainText);
    triggerCopyFeedback(mode === 'rich' ? 'rich' : 'plain');
    setStatusNotice(
      mode === 'rich'
        ? 'Formatted email with clickable buttons copied! Paste directly into Gmail compose.'
        : 'Copied as plain text (browser restricted rich HTML clipboard).'
    );
    if (!selectedItem.isIssued) {
      ensureIssued(selectedItem, effectiveName, effectiveEmail).catch(() => { });
    }
  };

  const handleCopyPlain = async (text, feedbackKey) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    triggerCopyFeedback(feedbackKey);
  };

  const handleOpenMailClient = async () => {
    if (!emailData || !selectedItem) return;
    if (!selectedItem.isIssued) {
      await ensureIssued(selectedItem, effectiveName, effectiveEmail);
    }
    const mailto = `mailto:${encodeURIComponent(effectiveEmail || '')}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.plainText)}`;
    window.open(mailto, '_blank');
  };

  // Dispatch authenticated POST request to Club Gmail Apps Script
  const callAppsScriptApi = async (payload) => {
    const cleanUrl = (mailerUrl || '').trim();
    const cleanKey = (mailerApiKey || '').trim();
    if (!cleanUrl || !cleanUrl.includes('script.google.com')) {
      throw new Error('Club Gmail Web App URL not configured.');
    }
    if (!cleanKey) {
      throw new Error('API Secret Key is missing. Open Club Gmail Setup to generate one.');
    }
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        ...payload,
        apiKey: cleanKey
      }),
      redirect: 'follow'
    });
    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Apps Script returned an unexpected response (ensure Who has access is set to Anyone).');
    }
    if (!parsed.success) {
      throw new Error(parsed.error || 'Apps Script request rejected');
    }
    if (typeof parsed.remainingDailyQuota === 'number') {
      setDailyQuota(parsed.remainingDailyQuota);
    }
    return parsed;
  };

  const sendViaAppsScript = async ({ to, subject, plainText, html }) => {
    return callAppsScriptApi({
      action: 'SEND_CERTIFICATE_EMAIL',
      to,
      subject,
      plainText,
      html,
      senderName: 'Team Cognisphere'
    });
  };

  const handleSaveAndTestMailer = async () => {
    const cleanUrl = (mailerUrl || '').trim();
    const cleanKey = (mailerApiKey || '').trim();
    if (!cleanUrl || !cleanUrl.startsWith('https://script.google.com/')) {
      alert('Please paste a valid Google Apps Script Web App URL (https://script.google.com/macros/s/.../exec)');
      return;
    }
    if (!cleanKey || cleanKey.length < 16) {
      alert('API Secret Key must be at least 16 characters.');
      return;
    }
    try {
      setSavingMailer(true);
      setTestingMailer(true);
      await savePrivateMailerConfig(
        { mailerWebAppUrl: cleanUrl, mailerApiKey: cleanKey, publicBaseUrl },
        'admin'
      );
      const data = await callAppsScriptApi({ action: 'CHECK_STATUS' });
      if (data?.success) {
        if (data.mailerEngine !== 'GmailApp-v2') {
          setStatusNotice('Warning: Your Apps Script is running an older version! Copy Secured Apps Script & Deploy -> Manage deployments -> New version in script.google.com.');
        } else {
          setStatusNotice(`Secured GmailApp-v2 Connected! Remaining daily quota: ${data.remainingDailyQuota ?? 'Ready'} emails.`);
        }
      }
    } catch (err) {
      const msg = err?.code === 'permission-denied' || (err?.message || '').toLowerCase().includes('permission')
        ? 'Permission denied saving private credentials: Please publish updated firestore.rules in Firebase Console.'
        : `Mailer verification failed: ${err.message}`;
      alert(msg);
    } finally {
      setSavingMailer(false);
      setTestingMailer(false);
    }
  };

  const handleSendSelectedEmail = async () => {
    if (!selectedItem || !emailData) return;
    if (!effectiveEmail || !effectiveEmail.includes('@')) {
      alert('Please enter a valid recipient email address first.');
      return;
    }
    if (!mailerUrl?.trim()) {
      setShowMailerSetup(true);
      return;
    }
    try {
      setSendingSingle(true);
      if (!selectedItem.isIssued) {
        await ensureIssued(selectedItem, effectiveName, effectiveEmail);
      }
      await sendViaAppsScript({
        to: effectiveEmail.trim(),
        subject: emailData.subject,
        plainText: emailData.plainText,
        html: emailData.html
      });
      await markCertificateEmailSent(selectedItem.certId, effectiveEmail);
      setStatusNotice(`Email sent successfully to ${effectiveEmail}!`);
    } catch (err) {
      alert(`Failed to send email: ${err.message}`);
    } finally {
      setSendingSingle(false);
    }
  };

  const pendingSendList = useMemo(() => {
    return currentList.filter((item) => {
      const em = (emailOverrides[item.key] !== undefined ? emailOverrides[item.key] : item.email || '').trim();
      return em.includes('@') && !item.isSent;
    });
  }, [currentList, emailOverrides]);

  const handleBulkSendAll = async () => {
    if (!mailerUrl?.trim()) {
      setShowMailerSetup(true);
      return;
    }
    if (pendingSendList.length === 0) {
      alert('No pending recipients with email addresses found in this tab.');
      return;
    }
    if (!window.confirm(`Send ${pendingSendList.length} personalized ${activeTab} certificate email(s) directly from your Club Gmail account?`)) {
      return;
    }

    stopBulkRef.current = false;
    setBulkSending(true);
    setBulkProgress({ sent: 0, failed: 0, total: pendingSendList.length, currentName: '' });

    let sentCount = 0;
    let failedCount = 0;

    for (const item of pendingSendList) {
      if (stopBulkRef.current) break;

      const n = (nameOverrides[item.key] !== undefined ? nameOverrides[item.key] : item.name) || 'Participant';
      const em = (emailOverrides[item.key] !== undefined ? emailOverrides[item.key] : item.email || '').trim();

      setBulkProgress({ sent: sentCount, failed: failedCount, total: pendingSendList.length, currentName: n });

      try {
        if (!item.isIssued) {
          await ensureIssued(item, n, em);
        }
        const built = buildCertificateEmail({
          recipientType: item.recipientType,
          name: n,
          activityName: item.activityName,
          rankLabel: item.rankLabel,
          certId: item.certId,
          verifyUrl: item.verifyUrl
        });
        await sendViaAppsScript({
          to: em,
          subject: built.subject,
          plainText: built.plainText,
          html: built.html
        });
        await markCertificateEmailSent(item.certId, em);
        sentCount++;
      } catch (err) {
        console.warn(`Failed sending to ${em}:`, err?.message);
        failedCount++;
      }

      setBulkProgress({ sent: sentCount, failed: failedCount, total: pendingSendList.length, currentName: n });
    }

    setBulkSending(false);
    setStatusNotice(
      stopBulkRef.current
        ? `Stopped early. Sent: ${sentCount}, Failed: ${failedCount}.`
        : `Automated send complete! Sent ${sentCount} email(s)${failedCount ? `, ${failedCount} failed` : ''}.`
    );
  };

  const handleExportLinksCsv = () => {
    if (currentList.length === 0) return;
    const headers = ['Name', 'Email', 'USN', 'Type', 'Activity / Duty', 'Rank', 'Certificate ID', 'View Certificate Link', 'Add to LinkedIn Link', 'Email Subject'];
    const rows = currentList.map((item) => {
      const n = nameOverrides[item.key] || item.name;
      const em = emailOverrides[item.key] !== undefined ? emailOverrides[item.key] : item.email;
      const built = buildCertificateEmail({
        recipientType: item.recipientType,
        name: n,
        activityName: item.activityName,
        rankLabel: item.rankLabel,
        certId: item.certId,
        verifyUrl: item.verifyUrl
      });
      return [
        `"${(n || '').replace(/"/g, '""')}"`,
        `"${(em || '').replace(/"/g, '""')}"`,
        `"${(item.usn || '').replace(/"/g, '""')}"`,
        `"${item.recipientType}"`,
        `"${(item.activityName || '').replace(/"/g, '""')}"`,
        `"${(item.rankLabel || '').replace(/"/g, '""')}"`,
        `"${item.certId}"`,
        `"${item.verifyUrl}"`,
        `"${built.addToLinkedInUrl}"`,
        `"${built.subject.replace(/"/g, '""')}"`
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Cognisphere_${activeTab}_Certificate_Links.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface-container-lowest border border-surface-container-high rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-surface-container bg-surface-container-low shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-on-surface tracking-tight">
                Certificate Links &amp; Official Email Studio
              </h2>
              <p className="text-[11px] text-secondary">
                Generate verification links &amp; ready-to-send club email templates for Participants, Winners &amp; Coordinators
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleExportLinksCsv}
              disabled={currentList.length === 0}
              className="py-1.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
              title="Export all certificate links & email subjects to CSV"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Export Links CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Tabs + Actions Bar */}
        <div className="px-5 py-3 border-b border-surface-container flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest shrink-0">
          <div className="flex items-center gap-1.5 bg-surface-container p-1 rounded-2xl">
            {[
              { id: 'participation', label: 'Participants', count: participantItems.length, icon: Users },
              { id: 'winner', label: 'Winners', count: winnerItems.length, icon: Trophy },
              { id: 'coordinator', label: 'Coordinators', count: coordinatorItems.length, icon: ShieldCheck }
            ].map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setShowAddForm(false);
                    setStatusNotice(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${isSelected
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-secondary hover:text-on-surface'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-surface-container-high text-secondary'
                    }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'winner' && (
              <button
                type="button"
                onClick={() => {
                  if (!customActivityId || customActivityId === 'coordinator') {
                    setCustomActivityId(allActivities[0]?.id || '');
                  }
                  setShowAddForm(v => !v);
                }}
                className="py-1.5 px-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Close Add Form' : 'Add Winner / Runner-up'}</span>
              </button>
            )}

            {activeTab === 'coordinator' && (
              <button
                type="button"
                onClick={() => setShowAddForm(v => !v)}
                className="py-1.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-primary text-xs font-bold flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Close Add Form' : 'Add Coordinator'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerateAllLinks}
              disabled={issuingAll || currentList.length === 0}
              className="py-1.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              title="Register verification links in Firestore for all items in this tab"
            >
              {issuingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-primary" />}
              <span>
                {unissuedCount > 0
                  ? `Activate Links (${unissuedCount})`
                  : 'Links Active'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowMailerSetup(v => !v)}
              className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${mailerUrl
                ? 'bg-surface-container hover:bg-surface-container-high border-surface-container-high text-on-surface'
                : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-800 dark:text-amber-200'
                }`}
              title="Configure automated sending via your Club Gmail Apps Script"
            >
              <Settings2 className="w-3.5 h-3.5 text-primary" />
              <span>{mailerUrl ? 'Club Gmail Setup' : 'Setup Auto-Send'}</span>
            </button>

            {bulkSending ? (
              <button
                type="button"
                onClick={() => { stopBulkRef.current = true; }}
                className="py-1.5 px-3.5 rounded-xl bg-error text-on-error text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Stop ({bulkProgress.sent}/{bulkProgress.total})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBulkSendAll}
                disabled={pendingSendList.length === 0 && Boolean(mailerUrl)}
                className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:text-white disabled:cursor-not-allowed"
                title="Automatically send personalized certificate emails to all pending recipients in this tab via Club Gmail"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send All ({pendingSendList.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Club Gmail Apps Script Auto-Send Setup Panel */}
        {showMailerSetup && (
          <div className="px-5 py-3.5 bg-surface-container-low border-b border-surface-container space-y-2.5 shrink-0 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-on-surface flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Secured Club Gmail API Setup (POST + Secret Key Auth)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const key = (mailerApiKey || '').trim() || generateMailerApiKey();
                  if (!mailerApiKey?.trim()) setMailerApiKey(key);
                  handleCopyPlain(buildSecureClubGmailScript(key), 'script');
                }}
                className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[11px] flex items-center gap-1"
              >
                {copiedState === 'script' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedState === 'script' ? 'Secured Script Copied!' : 'Copy Secured Apps Script'}</span>
              </button>
            </div>
            <p className="text-[11px] text-secondary leading-relaxed">
              1. Click <strong>Copy Secured Apps Script</strong> (your Secret Key below is automatically embedded in the code).<br />
              2. Paste in <strong>script.google.com</strong> → Save → select <code className="font-mono text-primary">authorizeMailer</code> in the top toolbar &amp; click <strong>▶ Run</strong> once to grant Gmail permissions.<br />
              3. Click <strong>Deploy → New Deployment</strong> (or <strong>Manage deployments → New version</strong>) → Web App (Execute as: <strong>Me</strong>, Access: <strong>Anyone</strong>) → paste URL &amp; <strong>Save &amp; Test</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Apps Script Web App URL</label>
                <input
                  type="url"
                  value={mailerUrl}
                  onChange={(e) => setMailerUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs font-mono"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1">API Secret Key (Private to Admins)</label>
                <div className="flex items-center gap-1">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={mailerApiKey}
                      onChange={(e) => setMailerApiKey(e.target.value)}
                      placeholder="Secret API key..."
                      className="w-full pl-3 pr-8 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface"
                      title={showApiKey ? 'Hide key' : 'Show key'}
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMailerApiKey(generateMailerApiKey())}
                    className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-secondary hover:text-primary"
                    title="Generate new random secret key (re-copy & re-deploy script if changed)"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Public Site URL (Avoids Spam)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="url"
                    value={publicBaseUrl}
                    onChange={(e) => setPublicBaseUrl(e.target.value)}
                    placeholder="https://your-site.vercel.app"
                    className="w-full px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAndTestMailer}
                    disabled={savingMailer || testingMailer}
                    className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs shadow-xs h-[32px] shrink-0"
                  >
                    {testingMailer ? 'Testing...' : 'Save & Test'}
                  </button>
                </div>
              </div>
            </div>
            {isLocalhostOrigin && (
              <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-[11px] font-medium">
                Warning: Certificate links currently use <code className="font-mono">{origin}</code>. Gmail flags <code className="font-mono">http://localhost</code> links as spam — enter your live HTTPS site domain in <strong>Public Site URL</strong> above before sending real emails!
              </div>
            )}
            {dailyQuota !== null && (
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                ✓ Authenticated &amp; Connected • Remaining Daily Quota: {dailyQuota} emails today
              </div>
            )}
          </div>
        )}

        {/* Live Bulk Progress Bar */}
        {bulkSending && (
          <div className="px-5 py-2 bg-primary/10 border-b border-primary/20 text-xs font-semibold text-primary flex items-center justify-between gap-3 shrink-0">
            <span className="flex items-center gap-2 truncate">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span className="truncate">Sending via Club Gmail: {bulkProgress.currentName}...</span>
            </span>
            <span className="font-mono shrink-0">
              {bulkProgress.sent}/{bulkProgress.total} sent{bulkProgress.failed ? ` (${bulkProgress.failed} failed)` : ''}
            </span>
          </div>
        )}

        {/* Status Toast inside modal */}
        {statusNotice && (
          <div className="px-5 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{statusNotice}</span>
            </span>
            <button type="button" onClick={() => setStatusNotice(null)} className="text-xs opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Inline Add Winner / Runner-up Form */}
        {activeTab === 'winner' && showAddForm && (
          <form onSubmit={handleAddCustomWinner} className="px-5 py-3.5 bg-surface-container-low border-b border-surface-container grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end shrink-0">
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Winner Name"
                className="w-full px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Title / Position *</label>
              <select
                value={customWinnerPosition}
                onChange={(e) => setCustomWinnerPosition(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs font-semibold"
              >
                <option value="Winner">Winner</option>
                <option value="Runner-up">Runner-up</option>
                <option value="1st Place (Winner)">1st Place (Winner)</option>
                <option value="2nd Place (Runner-up)">2nd Place (Runner-up)</option>
                <option value="3rd Place (2nd Runner-up)">3rd Place (2nd Runner-up)</option>
              </select>
            </div>
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Competition *</label>
              <select
                value={customActivityId}
                onChange={(e) => setCustomActivityId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs"
                required
              >
                {allActivities.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Email (Optional)</label>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="student@gmail.com"
                className="w-full px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">USN (Optional)</label>
              <input
                type="text"
                value={customUsn}
                onChange={(e) => setCustomUsn(e.target.value.toUpperCase())}
                placeholder="1ST23AI..."
                className="w-full px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs font-mono uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={issuingSingle}
              className="py-1.5 px-3 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs shadow-xs h-[32px]"
            >
              {issuingSingle ? 'Creating...' : 'Create Link'}
            </button>
          </form>
        )}

        {/* Inline Add Custom Coordinator Form */}
        {activeTab === 'coordinator' && showAddForm && (
          <form onSubmit={handleAddCustomCoordinator} className="px-5 py-3.5 bg-surface-container-low border-b border-surface-container grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end shrink-0">
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Coordinator Name *</label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Email</label>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="coord@gmail.com"
                className="w-full px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">USN (Optional)</label>
              <input
                type="text"
                value={customUsn}
                onChange={(e) => setCustomUsn(e.target.value.toUpperCase())}
                placeholder="1ST23AI..."
                className="w-full px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs font-mono uppercase"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Event Monitored</label>
              <select
                value={customActivityId}
                onChange={(e) => setCustomActivityId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs"
              >
                <option value="coordinator">All Event Operations</option>
                {allActivities.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={issuingSingle}
              className="py-1.5 px-3 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs shadow-xs h-[32px]"
            >
              {issuingSingle ? 'Creating...' : 'Create Link'}
            </button>
          </form>
        )}

        {/* Main Split View: Recipient List + Email/Link Studio */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-surface-container overflow-hidden">
          {/* Left Column: Search & Recipients List */}
          <div className="lg:col-span-5 flex flex-col min-h-[220px] max-h-[38vh] lg:max-h-none overflow-hidden">
            <div className="p-3 border-b border-surface-container space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, USN, email, or Cert ID..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-container border border-surface-container-high text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-surface-container border border-surface-container-high text-xs font-medium"
              >
                <option value="all">All Activities / Roles</option>
                {allActivities.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-surface-container/60">
              {currentList.length === 0 ? (
                <div className="p-8 text-center text-xs text-secondary space-y-2">
                  <AlertCircle className="w-6 h-6 mx-auto opacity-60" />
                  <p>
                    {activeTab === 'winner'
                      ? 'No winners or runner-ups added yet. Click "Add Winner / Runner-up" above to create their certificate link.'
                      : activeTab === 'coordinator'
                        ? 'No coordinators found. Click "Add Coordinator" above to generate a link.'
                        : 'No attendance records found matching your filter.'}
                  </p>
                </div>
              ) : (
                currentList.map((item) => {
                  const isActive = item.key === selectedKey;
                  const displayName = nameOverrides[item.key] || item.name;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedKey(item.key)}
                      className={`w-full text-left p-3.5 transition-colors flex items-start justify-between gap-2 ${isActive
                        ? 'bg-primary/10 border-l-4 border-primary'
                        : 'hover:bg-surface-container-low/70'
                        }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-extrabold text-on-surface truncate">
                          {displayName}
                        </div>
                        <div className="text-[11px] text-secondary truncate mt-0.5">
                          {item.rankLabel ? `${item.rankLabel} • ` : ''}
                          {item.activityName}
                        </div>
                        <div className="text-[10px] font-mono text-secondary/80 truncate mt-0.5">
                          {item.email || item.usn || item.certId}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${item.isSent
                          ? 'bg-emerald-600 text-white'
                          : item.isIssued
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          }`}>
                          {item.isSent ? 'Sent ✓' : item.isIssued ? 'Link Active' : 'Pending'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Live Email & Link Composer */}
          <div className="lg:col-span-7 flex flex-col overflow-y-auto p-4 sm:p-5 space-y-4 bg-surface-container-lowest">
            {!selectedItem || !emailData ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-secondary p-8 space-y-2">
                <Mail className="w-8 h-8 opacity-40" />
                <p>Select a recipient on the left to preview their certificate link and personalized email.</p>
              </div>
            ) : (
              <>
                {/* Editable Recipient Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase mb-1">
                      Name on Certificate &amp; Email
                    </label>
                    <input
                      type="text"
                      value={effectiveName}
                      onChange={(e) => setNameOverrides(prev => ({ ...prev, [selectedItem.key]: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-xl bg-surface-container border border-surface-container-high text-xs font-bold text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-secondary uppercase mb-1">
                      Recipient Email (for Official Club Mail)
                    </label>
                    <input
                      type="email"
                      value={effectiveEmail}
                      onChange={(e) => setEmailOverrides(prev => ({ ...prev, [selectedItem.key]: e.target.value }))}
                      placeholder="Enter student/coordinator email..."
                      className="w-full px-3 py-1.5 rounded-xl bg-surface-container border border-surface-container-high text-xs text-on-surface"
                    />
                  </div>
                </div>

                {/* Certificate & LinkedIn Direct Links Box */}
                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-primary" />
                      <span>Generated Certificate &amp; LinkedIn Links</span>
                    </span>
                    {!selectedItem.isIssued && (
                      <button
                        type="button"
                        onClick={handleActivateSelectedLink}
                        disabled={issuingSingle}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold shadow-xs"
                      >
                        {issuingSingle ? 'Activating...' : 'Activate Link Now'}
                      </button>
                    )}
                  </div>

                  {/* View Certificate Link */}
                  <div className="flex items-center gap-2 text-[11px] bg-surface-container-lowest border border-surface-container rounded-xl px-3 py-1.5">
                    <span className="font-bold text-secondary shrink-0">View:</span>
                    <span className="font-mono text-primary truncate flex-1">{emailData.verifyUrl}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyPlain(emailData.verifyUrl, 'viewUrl')}
                      className="p-1 text-secondary hover:text-primary"
                      title="Copy View Certificate link"
                    >
                      {copiedState === 'viewUrl' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={emailData.verifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-secondary hover:text-primary"
                      title="Open verification page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Add to LinkedIn Link */}
                  <div className="flex items-center gap-2 text-[11px] bg-surface-container-lowest border border-surface-container rounded-xl px-3 py-1.5">
                    <span className="font-bold text-secondary shrink-0">LinkedIn:</span>
                    <span className="font-mono text-secondary truncate flex-1">{emailData.addToLinkedInUrl}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyPlain(emailData.addToLinkedInUrl, 'linkedinUrl')}
                      className="p-1 text-secondary hover:text-primary"
                      title="Copy Add to LinkedIn link"
                    >
                      {copiedState === 'linkedinUrl' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={emailData.addToLinkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-secondary hover:text-primary"
                      title="Test Add to LinkedIn link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Email Subject + Visual Preview */}
                <div className="rounded-2xl border border-surface-container overflow-y-auto">
                  <div className="px-4 py-2.5 bg-surface-container-low border-b border-surface-container flex items-center justify-between gap-2">
                    <div className="text-xs truncate">
                      <span className="font-bold text-secondary mr-1.5">Subject:</span>
                      <span className="font-bold text-on-surface">{emailData.subject}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyPlain(emailData.subject, 'subject')}
                      className="text-[11px] font-bold text-primary hover:underline shrink-0"
                    >
                      {copiedState === 'subject' ? 'Copied!' : 'Copy Subject'}
                    </button>
                  </div>

                  <div
                    className="p-4 sm:p-5 bg-white text-gray-800 text-xs sm:text-sm overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: emailData.html }}
                  />
                </div>

                {/* Send via Official Club Email Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyRichEmail}
                    className="py-2 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface font-bold text-xs flex items-center gap-1.5 transition-all"
                    title="Copies rich HTML with clickable buttons so you can paste straight into Gmail"
                  >
                    {copiedState === 'rich' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Mail className="w-3.5 h-3.5 text-primary" />}
                    <span>{copiedState === 'rich' ? 'Copied!' : 'Copy Rich Email'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendSelectedEmail}
                    disabled={sendingSingle || bulkSending}
                    className="py-2 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                    title="Send this email right now via Club Official Gmail"
                  >
                    {sendingSingle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{sendingSingle ? 'Sending...' : selectedItem.isSent ? 'Resend Email' : 'Send Email'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
