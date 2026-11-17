import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  User, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Loader2, 
  Save, 
  Mail, 
  Phone, 
  Shield, 
  Award,
  Calendar,
  Building,
  GraduationCap,
  AlertTriangle,
  Trash2,
  X,
  QrCode,
  ShieldCheck,
  Trophy,
  SlidersHorizontal,
  Settings2,
  Search,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  Plus,
  Video
} from 'lucide-react';
import { validateUSN } from '../hooks/useParticipantProfile';
import { subscribeToPassConfig, updatePassConfig } from '../services/passApprovalService';
import { ThemeToggleButton } from './ThemeToggleButton';
import { ACTIVITIES } from '../data/activities';

// Helper to decode branch and batch year from VTU/college USN (e.g. 1ST24AI045)
function parseUsnMetadata(rawUsn) {
  if (!rawUsn || rawUsn.length < 10) return null;
  const usn = rawUsn.toUpperCase().trim();
  const yearDigits = usn.substring(3, 5); // '24'
  const branchCode = usn.substring(5, 7); // 'AI'
  const rollNumber = usn.substring(7, 10); // '045'

  const branchMap = {
    'AI': 'Artificial Intelligence & Machine Learning (AIML)',
    'CS': 'Computer Science & Engineering (CSE)',
    'IS': 'Information Science & Engineering (ISE)',
    'EC': 'Electronics & Communication Engineering (ECE)',
    'EE': 'Electrical & Electronics Engineering (EEE)',
    'ME': 'Mechanical Engineering (ME)',
    'CV': 'Civil Engineering (CVE)',
    'BT': 'Biotechnology (BT)',
    'DS': 'Data Science (DS)',
    'CY': 'Cyber Security (CY)'
  };

  const startYear = parseInt(`20${yearDigits}`, 10);
  const endYear = startYear + 4;

  return {
    branch: branchMap[branchCode] || `${branchCode} Department`,
    batch: `${startYear} - ${endYear} Batch`,
    roll: rollNumber
  };
}

export default function ProfileEditPage({ 
  user, 
  profile, 
  onSave, 
  onBack, 
  onNavigate,
  onDirtyChange,
  pendingExitTab,
  onCancelExit,
  role = 'participant',
  isAdmin = false,
  activities = ACTIVITIES,
  theme = 'light',
  onToggleTheme
}) {
  const effectiveIsAdmin = Boolean(isAdmin || role === 'admin');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [certificateName, setCertificateName] = useState('');
  const [hasManuallyEditedCertName, setHasManuallyEditedCertName] = useState(false);
  const [mobile, setMobile] = useState('');
  const [usn, setUsn] = useState('');

  // Admin Operational Settings (Pass QR check-in & theme)
  const [passConfig, setPassConfig] = useState(() => {
    try {
      const cached = localStorage.getItem('cognisphere_pass_config');
      return cached ? JSON.parse(cached) : { hidePassAfterAttendance: true };
    } catch (e) {
      return { hidePassAfterAttendance: true };
    }
  });

  useEffect(() => {
    if (!effectiveIsAdmin) return;
    const unsub = subscribeToPassConfig((cfg) => {
      if (cfg) {
        setPassConfig(cfg);
        try {
          localStorage.setItem('cognisphere_pass_config', JSON.stringify(cfg));
        } catch (e) {}
      }
    });
    return () => unsub();
  }, [effectiveIsAdmin]);

  const hidePassAfterAttendance = passConfig.hidePassAfterAttendance ?? true;
  const showLeaderboard = passConfig.showLeaderboard ?? true;
  const showVideoShowcase = passConfig.showVideoShowcase ?? false;

  const handleToggleHidePassAfterAttendance = async () => {
    const nextVal = !hidePassAfterAttendance;
    const updated = { ...passConfig, hidePassAfterAttendance: nextVal };
    setPassConfig(updated);
    try {
      localStorage.setItem('cognisphere_pass_config', JSON.stringify(updated));
      await updatePassConfig(updated, user?.email || 'admin');
    } catch (err) {
      console.warn('Failed to update passConfig:', err);
    }
  };

  const handleToggleShowLeaderboard = async () => {
    const nextVal = !showLeaderboard;
    const updated = { ...passConfig, showLeaderboard: nextVal };
    setPassConfig(updated);
    try {
      localStorage.setItem('cognisphere_pass_config', JSON.stringify(updated));
      await updatePassConfig(updated, user?.email || 'admin');
    } catch (err) {
      console.warn('Failed to update leaderboard visibility:', err);
    }
  };

  const handleToggleShowVideoShowcase = async () => {
    const nextVal = !showVideoShowcase;
    const updated = { ...passConfig, showVideoShowcase: nextVal };
    setPassConfig(updated);
    try {
      localStorage.setItem('cognisphere_pass_config', JSON.stringify(updated));
      await updatePassConfig(updated, user?.email || 'admin');
    } catch (err) {
      console.warn('Failed to update video showcase visibility:', err);
    }
  };

  const DEFAULT_PASS_CONFIG = {
    passSystemEnabled: true,
    showDownloadButton: true,
    hidePassAfterAttendance: true,
    showLeaderboard: true,
    showVideoShowcase: false,
    hiddenActivityIds: [],
    panelDismissedActivityIds: []
  };

  const allActivities = activities && activities.length > 0 ? activities : ACTIVITIES;
  const isSystemActive = passConfig.passSystemEnabled ?? true;
  const hiddenIds = Array.isArray(passConfig.hiddenActivityIds) ? passConfig.hiddenActivityIds : [];
  const dismissedIds = Array.isArray(passConfig.panelDismissedActivityIds) ? passConfig.panelDismissedActivityIds : [];
  const visibleActivities = allActivities.filter(a => !hiddenIds.includes(a.id) && !dismissedIds.includes(a.id));

  // Pass Layout Customization Modal State (for Admin)
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [modalConfig, setModalConfig] = useState(passConfig);
  const [savingConfig, setSavingConfig] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef(null);

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
      if (!dismissed.includes(activityId)) dismissed.push(activityId);
      if (!hidden.includes(activityId)) hidden.push(activityId);
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
    } catch (err) {
      alert(err.message || 'Failed to reset settings');
    } finally {
      setSavingConfig(false);
    }
  };

  // Unsaved changes tracking baseline & modal state
  const initialValuesRef = useRef(null);
  const isInitializedRef = useRef(false);
  const isDirtyRef = useRef(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [exitTarget, setExitTarget] = useState(null);
  const [modalError, setModalError] = useState('');

  // Touched state
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    certificateName: false,
    mobile: false,
    usn: false,
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Lock status
  const isUsnLocked = Boolean(profile?.usn && profile.usn.trim().length > 0);

  // Initialize from existing profile and user data
  useEffect(() => {
    // If already initialized with valid profile data, don't overwrite user's in-progress edits
    if (isInitializedRef.current) return;
    if (!profile && !user) return;

    let initialF = '';
    let initialL = '';
    let initialCert = '';
    let initialM = '';
    let initialU = '';

    if (profile) {
      if (profile.firstName) initialF = profile.firstName;
      if (profile.lastName) initialL = profile.lastName;
      
      const certName = profile.certificateName || profile.name || '';
      if (certName) {
        initialCert = certName;
        setHasManuallyEditedCertName(true);
      } else if (profile.firstName) {
        initialCert = `${profile.firstName} ${profile.lastName || ''}`.trim();
      }

      if (profile.mobile && profile.mobile !== 'Offline') initialM = profile.mobile;
      if (profile.usn) initialU = profile.usn;
      isInitializedRef.current = true;
    } else if (user) {
      const nameParts = (user.displayName || '').trim().split(' ');
      initialF = nameParts[0] || '';
      initialL = nameParts.slice(1).join(' ') || '';
      initialCert = user.displayName || '';
      if (user.phoneNumber) {
        initialM = user.phoneNumber.replace(/\D/g, '').slice(-10);
      }
    }

    setFirstName(initialF);
    setLastName(initialL);
    setCertificateName(initialCert);
    setMobile(initialM);
    setUsn(initialU);

    initialValuesRef.current = {
      firstName: initialF.trim(),
      lastName: initialL.trim(),
      certificateName: initialCert.trim(),
      mobile: initialM.replace(/\D/g, '').slice(-10),
      usn: initialU.trim().toUpperCase()
    };
  }, [profile, user]);

  // Compute dirty/unsaved state
  const hasUnsavedChanges = useMemo(() => {
    if (!initialValuesRef.current) return false;
    const init = initialValuesRef.current;
    const currentFirst = firstName.trim();
    const currentLast = lastName.trim();
    const currentCert = certificateName.trim();
    const currentMobile = mobile.replace(/\D/g, '').slice(-10);
    const currentUsn = usn.trim().toUpperCase();

    const dirty = (
      currentFirst !== init.firstName ||
      currentLast !== init.lastName ||
      currentCert !== init.certificateName ||
      currentMobile !== init.mobile ||
      currentUsn !== init.usn
    );
    isDirtyRef.current = dirty;
    return dirty;
  }, [firstName, lastName, certificateName, mobile, usn]);

  // Notify parent of dirty state for route-level guards
  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  // Open modal if external navigation was intercepted while dirty
  useEffect(() => {
    if (pendingExitTab && hasUnsavedChanges) {
      setExitTarget(pendingExitTab);
      setShowUnsavedModal(true);
    }
  }, [pendingExitTab, hasUnsavedChanges]);

  // Browser reload/close guard
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Auto-compose certificate name when first or last name changes, UNLESS the user explicitly edited it
  const handleFirstNameChange = (e) => {
    const val = e.target.value;
    setFirstName(val);
    setTouched(prev => ({ ...prev, firstName: true }));
    if (errorMsg) setErrorMsg('');

    if (!hasManuallyEditedCertName) {
      setCertificateName(`${val} ${lastName}`.trim());
    }
  };

  const handleLastNameChange = (e) => {
    const val = e.target.value;
    setLastName(val);
    setTouched(prev => ({ ...prev, lastName: true }));
    if (errorMsg) setErrorMsg('');

    if (!hasManuallyEditedCertName) {
      setCertificateName(`${firstName} ${val}`.trim());
    }
  };

  const handleCertificateNameChange = (e) => {
    setCertificateName(e.target.value);
    setHasManuallyEditedCertName(true);
    setTouched(prev => ({ ...prev, certificateName: true }));
    if (errorMsg) setErrorMsg('');
  };

  const handleUsnChange = (e) => {
    if (isUsnLocked) return;
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setUsn(val);
    setTouched(prev => ({ ...prev, usn: true }));
    if (errorMsg) setErrorMsg('');
  };

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(val);
    setTouched(prev => ({ ...prev, mobile: true }));
    if (errorMsg) setErrorMsg('');
  };

  // Validations
  const isFirstNameValid = firstName.trim().length > 0;
  const usnCheck = validateUSN(usn);
  const isUsnValid = isUsnLocked || usnCheck.valid;
  const cleanedMobile = mobile.replace(/\D/g, '').slice(-10);
  const isMobileValid = /^\d{10}$/.test(cleanedMobile);
  const isCertNameValid = certificateName.trim().length > 0;

  const showFirstNameError = touched.firstName && !isFirstNameValid;
  const showUsnError = !isUsnLocked && touched.usn && !isUsnValid;
  const showMobileError = touched.mobile && !isMobileValid;
  const showCertNameError = touched.certificateName && !isCertNameValid;

  const usnMetadata = parseUsnMetadata(isUsnLocked ? profile.usn : usn);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    setTouched({
      firstName: true,
      lastName: true,
      certificateName: true,
      mobile: true,
      usn: true,
    });

    if (!isFirstNameValid) {
      setErrorMsg('Please enter your first name.');
      return;
    }

    if (!isCertNameValid) {
      setErrorMsg('Please provide the name you want printed on certificates.');
      return;
    }

    const finalUsn = isUsnLocked ? profile.usn.trim().toUpperCase() : usnCheck.usn;
    if (!isUsnLocked && !usnCheck.valid) {
      setErrorMsg(usnCheck.message);
      return;
    }

    if (!isMobileValid) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        certificateName: certificateName.trim(),
        usn: finalUsn,
        mobile: cleanedMobile,
        ...(profile?.gender ? { gender: profile.gender } : {})
      });

      // Update baseline after successful save
      initialValuesRef.current = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        certificateName: certificateName.trim(),
        mobile: cleanedMobile,
        usn: finalUsn
      };
      isInitializedRef.current = true;
      isDirtyRef.current = false;
      onDirtyChange?.(false);

      setSuccessToast('Profile details updated successfully!');
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Exit & Unsaved Changes handlers
  const handleBackAttempt = () => {
    if (hasUnsavedChanges) {
      setExitTarget('__back__');
      setModalError('');
      setShowUnsavedModal(true);
    } else {
      onBack();
    }
  };

  const handleModalCancel = () => {
    setShowUnsavedModal(false);
    setExitTarget(null);
    setModalError('');
    onCancelExit?.();
  };

  const handleModalDiscardAndExit = () => {
    if (initialValuesRef.current) {
      setFirstName(initialValuesRef.current.firstName);
      setLastName(initialValuesRef.current.lastName);
      setCertificateName(initialValuesRef.current.certificateName);
      setMobile(initialValuesRef.current.mobile);
      setUsn(initialValuesRef.current.usn);
    }
    setShowUnsavedModal(false);
    setModalError('');
    isDirtyRef.current = false;
    onDirtyChange?.(false);

    const target = exitTarget || pendingExitTab;
    setExitTarget(null);
    if (target && target !== '__back__') {
      if (onNavigate) {
        onNavigate(target);
      } else {
        onBack();
      }
    } else {
      onBack();
    }
  };

  const handleModalSaveAndExit = async () => {
    setTouched({
      firstName: true,
      lastName: true,
      certificateName: true,
      mobile: true,
      usn: true,
    });

    if (!isFirstNameValid) {
      setModalError('Please enter your first name.');
      return;
    }

    if (!isCertNameValid) {
      setModalError('Please provide the name you want printed on certificates.');
      return;
    }

    const finalUsn = isUsnLocked ? profile?.usn?.trim()?.toUpperCase() : usnCheck.usn;
    if (!isUsnLocked && !usnCheck.valid) {
      setModalError(usnCheck.message);
      return;
    }

    if (!isMobileValid) {
      setModalError('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setSaving(true);
      setModalError('');
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        certificateName: certificateName.trim(),
        usn: finalUsn,
        mobile: cleanedMobile,
        ...(profile?.gender ? { gender: profile.gender } : {})
      });

      initialValuesRef.current = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        certificateName: certificateName.trim(),
        mobile: cleanedMobile,
        usn: finalUsn
      };
      isInitializedRef.current = true;
      isDirtyRef.current = false;
      onDirtyChange?.(false);

      setShowUnsavedModal(false);

      const target = exitTarget || pendingExitTab;
      setExitTarget(null);
      if (target && target !== '__back__') {
        if (onNavigate) {
          onNavigate(target);
        } else {
          onBack();
        }
      } else {
        onBack();
      }
    } catch (err) {
      setModalError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 animate-fadeIn pb-12">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBackAttempt}
          className="inline-flex items-center gap-2 text-xs font-bold text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Profile Overview Header Card */}
      <div className="rounded-3xl border border-surface-container bg-surface-container-lowest p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile Avatar"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-surface-container-high shadow-xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold text-xl shadow-xs">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-surface-container-lowest flex items-center justify-center shadow-xs" title="Verified Account">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              {certificateName || `${firstName} ${lastName}`.trim() || user?.displayName || 'Student Profile'}
            </h1>
            <p className="text-xs text-secondary flex items-center gap-2 flex-wrap">
              <span className="font-mono text-on-surface font-semibold">
                {isUsnLocked ? profile?.usn : usn || 'Pending USN'}
              </span>
              <span>&bull;</span>
              <span className="text-secondary">{user?.email}</span>
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-surface-container border border-surface-container-high text-primary uppercase tracking-wider">
            {role === 'admin' ? 'Administrator' : role === 'coordinator' ? 'Coordinator' : role === 'judge' ? 'Judge' : 'Participant'}
          </span>
        </div>
      </div>

      {/* Success Notification Toast */}
      {successToast && (
        <div className="bg-emerald-600 text-white rounded-2xl p-4 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
            <span>{successToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSuccessToast('')}
            className="text-white hover:opacity-80 px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Alert Box */}
      {errorMsg && (
        <div className="bg-error-container text-on-error-container border border-error/20 rounded-2xl p-4 text-xs flex items-start gap-3 shadow-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* ========================================================================= */}
        {/* SECTION 1: PERSONAL & CERTIFICATE DETAILS (Image 1 replica)              */}
        {/* ========================================================================= */}
        <div className="rounded-3xl border border-surface-container bg-surface-container-lowest p-6 sm:p-7 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-on-surface tracking-tight">
              Personal &amp; Certificate Information
            </h2>
            <p className="text-xs text-secondary">
              Enter your official name as you would like it recorded on event certificates, leaderboards, and club records.
            </p>
          </div>

          <div className="space-y-5">
            {/* First Name & Surname/Last Name (2-Column Grid from Image 1) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  First Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Sachin"
                  value={firstName}
                  onBlur={() => setTouched(prev => ({ ...prev, firstName: true }))}
                  onChange={handleFirstNameChange}
                  className={`w-full bg-surface-container-low rounded-xl py-2.5 px-3.5 text-sm text-on-surface placeholder-secondary focus:outline-none transition-all border ${
                    showFirstNameError 
                      ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20' 
                      : 'border-surface-container focus:border-primary focus:ring-2 focus:ring-primary/20'
                  }`}
                />
                <p className="text-[11px] text-secondary mt-1">Ex: Sachin</p>
                {showFirstNameError && (
                  <p className="text-[11px] text-error mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>First name is required</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  Surname/Last Name
                </label>
                <input
                  type="text"
                  placeholder="Tendulkar"
                  value={lastName}
                  onChange={handleLastNameChange}
                  className="w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-2.5 px-3.5 text-sm text-on-surface placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <p className="text-[11px] text-secondary mt-1">Ex: Tendulkar</p>
              </div>
            </div>

            {/* Name on your Certificate (Image 1: "Name on your IRC Certificate") */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">
                Name on your Certificate <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Srujan B"
                value={certificateName}
                onBlur={() => setTouched(prev => ({ ...prev, certificateName: true }))}
                onChange={handleCertificateNameChange}
                className={`w-full bg-surface-container-low rounded-xl py-2.5 px-3.5 text-sm font-semibold text-on-surface placeholder-secondary focus:outline-none transition-all border ${
                  showCertNameError 
                    ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20' 
                    : 'border-surface-container focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
              />
              <p className="text-[11px] text-secondary mt-1">
                How would you like your name to appear on certificates?
              </p>
              {showCertNameError && (
                <p className="text-[11px] text-error mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>Certificate name is required</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: STUDENT CONTACT DETAILS (Image 2 replica)                      */}
        {/* (Excludes WhatsApp options per explicit user instructions)               */}
        {/* ========================================================================= */}
        <div className="rounded-3xl border border-surface-container bg-surface-container-lowest p-6 sm:p-7 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-on-surface tracking-tight">
              Student Contact Details
            </h2>
            <p className="text-xs text-secondary leading-relaxed">
              We will use the contact details you provide to send you the important updates during the program
            </p>
          </div>

          <div className="space-y-5">
            {/* Registered Phone Number with +91 selector (Image 2) */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">
                Registered Phone Number <span className="text-error">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 flex items-center">
                  <span className={`absolute left-3 text-xs font-medium border-r pr-2.5 transition-colors ${
                    showMobileError ? 'text-error border-error/50' : 'text-secondary border-surface-container'
                  }`}>
                    IN &bull; +91
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="9353502674"
                    value={mobile}
                    onBlur={() => setTouched(prev => ({ ...prev, mobile: true }))}
                    onChange={handleMobileChange}
                    maxLength={10}
                    className={`w-full bg-surface-container-low rounded-xl py-2.5 pl-20 pr-3.5 text-sm font-mono text-on-surface placeholder-secondary focus:outline-none transition-all border ${
                      showMobileError 
                        ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20' 
                        : 'border-surface-container focus:border-primary focus:ring-2 focus:ring-primary/20'
                    }`}
                  />
                </div>
              </div>
              {showMobileError && (
                <p className="text-[11px] text-error mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>Please enter a valid 10-digit mobile number</span>
                </p>
              )}
            </div>

            {/* Email ID with verified indicator (Image 2) */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">
                Email ID
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  readOnly
                  value={user?.email || profile?.email || ''}
                  className="w-full bg-surface-container/60 border border-surface-container rounded-xl py-2.5 px-3.5 text-sm font-mono text-on-surface/80 cursor-not-allowed select-none"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Your Email address is verified</span>
              </div>
            </div>

            {/* College USN / Roll Number with Permanent Lock constraint */}
            <div className="pt-2 border-t border-surface-container/60 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                  <span>College USN / Roll Number</span>
                  <span className="text-error">*</span>
                </label>
                {isUsnLocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 shadow-xs">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Locked</span>
                  </span>
                ) : (
                  <span className={`text-[10px] font-mono ${showUsnError ? 'text-error font-bold' : 'text-secondary'}`}>
                    {usn.length}/10
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="1ST24AI045"
                  value={usn}
                  readOnly={isUsnLocked}
                  disabled={isUsnLocked}
                  onBlur={() => !isUsnLocked && setTouched(prev => ({ ...prev, usn: true }))}
                  onChange={handleUsnChange}
                  maxLength={10}
                  className={`w-full rounded-xl py-2.5 px-3.5 text-sm font-mono tracking-wider uppercase transition-all border ${
                    isUsnLocked
                      ? 'bg-surface-container/70 border-surface-container text-on-surface/75 cursor-not-allowed select-none pr-9 font-semibold'
                      : showUsnError 
                        ? 'bg-surface-container-low border-error text-error focus:border-error focus:ring-2 focus:ring-error/20' 
                        : 'bg-surface-container-low border-surface-container text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20'
                  }`}
                />
                {isUsnLocked && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" title="USN is permanently locked">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>

              {isUsnLocked ? (
                <div className="p-2.5 rounded-xl bg-surface-container/60 border border-surface-container flex items-start gap-2 text-[11px] text-secondary">
                  <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <span className="font-semibold text-on-surface">USN Permanently Locked:</span> Linked to <span className="font-mono text-on-surface font-semibold">{user?.email || 'this account'}</span>. Once an email is linked with a USN, it cannot be changed.
                  </div>
                </div>
              ) : showUsnError ? (
                <p className="text-[11px] text-error mt-1 flex items-start gap-1 leading-tight">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{usnCheck.message}</span>
                </p>
              ) : (
                <p className="text-[11px] text-secondary mt-1">
                  Format: <code className="text-on-surface bg-surface-container px-1 py-0.5 rounded font-mono">1ST</code> + Year (<code className="text-on-surface bg-surface-container px-1 py-0.5 rounded font-mono">24/25/26</code>) + Branch + Roll (e.g. <code className="text-on-surface bg-surface-container px-1 py-0.5 rounded font-mono">1ST24AI045</code>)
                </p>
              )}
            </div>

            {/* Academic Information Preview from USN */}
            {usnMetadata && (
              <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <span className="text-[10px] text-secondary uppercase font-bold block">Department</span>
                    <span className="font-semibold text-on-surface">{usnMetadata.branch}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <span className="text-[10px] text-secondary uppercase font-bold block">Academic Cohort</span>
                    <span className="font-semibold text-on-surface">{usnMetadata.batch}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: ADMINISTRATOR CONTROLS (Admin Exclusive)                      */}
        {/* ========================================================================= */}
        {effectiveIsAdmin && (
          <div className="rounded-3xl border border-primary/20 bg-surface-container-lowest p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Configuration</span>
                </div>
                <h2 className="text-base font-extrabold text-on-surface tracking-tight">
                  Event Operations &amp; Interface Controls
                </h2>
                <p className="text-xs text-secondary">
                  Configure real-time pass redemption behavior and toggle application appearance.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Control 1: Hide QR Pass After Attendance Marked */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-on-surface">
                      Hide QR Pass Once Scanned &amp; Marked
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      hidePassAfterAttendance ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-surface-container text-secondary'
                    }`}>
                      {hidePassAfterAttendance ? 'Active (Auto-Hide)' : 'Disabled (Testing Mode)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-secondary leading-relaxed">
                    When enabled, once attendance is scanned and recorded at the door, the active QR pass is hidden and marked as checked-in on &quot;My Pass&quot; to avoid confusion or duplicate scans. Toggle off to test mismatches and re-scan scenarios.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleHidePassAfterAttendance}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    hidePassAfterAttendance ? 'bg-primary' : 'bg-surface-container-high'
                  }`}
                  role="switch"
                  aria-checked={hidePassAfterAttendance}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      hidePassAfterAttendance ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Control 2: Theme Toggle (Admin Exclusive, directly accessible) */}
              {onToggleTheme && (
                <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      {/* Skiper4: animated sun/moon icon */}
                      <ThemeToggleButton
                        isDark={theme === 'dark'}
                        size={16}
                        className="text-on-surface pointer-events-none"
                      />
                      <span className="text-xs font-bold text-on-surface">
                        System Theme Mode
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container text-primary uppercase tracking-wider">
                        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary leading-relaxed">
                      Toggle system appearance between Light and Dark mode. Available exclusively for administrators.
                    </p>
                  </div>

                  {/* Skiper4: animated toggle button */}
                  <ThemeToggleButton
                    isDark={theme === 'dark'}
                    onToggle={onToggleTheme}
                    size={20}
                    className="px-4 py-2 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface rounded-xl transition active:scale-95 shadow-xs"
                  />
                </div>
              )}

              {/* Control 3: Competition Leaderboard Visibility Toggle (Admin Exclusive) */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-on-surface">
                      Competition Leaderboard Visibility
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      showLeaderboard ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-surface-container text-secondary'
                    }`}>
                      {showLeaderboard ? 'Active (Visible)' : 'Hidden (App & Big Screen)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-secondary leading-relaxed">
                    Controls whether the live competition leaderboard is visible across the app and on the Big Screen carousel. When disabled, the leaderboard is completely hidden from both the participant navigation and the projector carousel.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleShowLeaderboard}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showLeaderboard ? 'bg-primary' : 'bg-surface-container-high'
                  }`}
                  role="switch"
                  aria-checked={showLeaderboard}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      showLeaderboard ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Control 4: Home Page Video Showcase & Reels Visibility Toggle */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-on-surface">
                      Home Page Video Showcase &amp; Reels
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      showVideoShowcase ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-surface-container text-secondary'
                    }`}>
                      {showVideoShowcase ? 'Active (Visible)' : 'Hidden (In Development)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-secondary leading-relaxed">
                    Controls whether the video aftermovie player and social reels/shorts section are displayed on the home page. Keep hidden while under development.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleShowVideoShowcase}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showVideoShowcase ? 'bg-primary' : 'bg-surface-container-high'
                  }`}
                  role="switch"
                  aria-checked={showVideoShowcase}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      showVideoShowcase ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Control 4: Pass Customization & Layout Edit Card (Moved from ParticipantPass) */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-on-surface">
                      Pass Page Customization &amp; Layout Controls
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isSystemActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600'
                    }`}>
                      {isSystemActive ? 'System Active' : 'Passes Disabled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-secondary leading-relaxed">
                    {!isSystemActive 
                      ? 'Status: Passes DISABLED for participants. Participants see "No events taking place currently" with a redirect to Events Hub.' 
                      : `Status: Active. ${visibleActivities.length} of ${allActivities.length} activities enabled for passes. Configure visibility, download button, and activity filters.`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setModalConfig(passConfig);
                    setSearchQuery('');
                    setShowSearchDropdown(false);
                    setShowConfigModal(true);
                  }}
                  className="py-2 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 active:scale-95 shrink-0 self-start sm:self-auto"
                >
                  <Settings2 className="w-4 h-4" />
                  <span>Edit Layout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save & Discard Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleBackAttempt}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-surface-container text-secondary hover:text-on-surface hover:bg-surface-container font-semibold text-xs transition-all shadow-xs"
          >
            Cancel / Go Back
          </button>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-on-primary" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-on-primary" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Save Changes Before Exiting Pop-up Modal (Portaled to document.body for true Screen Center) */}
      {showUnsavedModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={handleModalCancel}
        >
          <div 
            className="bg-surface-container-lowest border border-surface-container rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative text-on-surface m-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={handleModalCancel}
              className="absolute top-4 right-4 p-1.5 text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
              title="Keep Editing"
              aria-label="Keep Editing"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Warning Icon Badge */}
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>

            {/* Heading & description */}
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-on-surface tracking-tight">
                Save Changes Before Leaving?
              </h3>
              <p className="text-xs text-secondary leading-relaxed">
                You have modified your profile details. What would you like to do before leaving?
              </p>
            </div>

            {/* In-Modal Error alert */}
            {modalError && (
              <div className="bg-error-container text-on-error-container text-xs p-3 rounded-xl flex items-center gap-2 text-left font-medium animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-error" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleModalSaveAndExit}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-on-primary bg-primary hover:bg-primary-container flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-on-primary" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-on-primary" />
                    <span>Save &amp; Exit</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleModalDiscardAndExit}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-error hover:bg-error/10 border border-error/20 hover:border-error/30 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard Changes</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleModalCancel}
                className="w-full py-2 px-4 rounded-xl text-xs font-medium text-secondary hover:text-on-surface hover:bg-surface-container/50 rounded-xl transition-colors"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* ADMIN PASS CUSTOMIZATION MODAL (Moved from ParticipantPass)              */}
      {/* ========================================================================= */}
      {effectiveIsAdmin && showConfigModal && createPortal(
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
                type="button"
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
                    className="w-5 h-5 rounded text-primary focus:ring-primary"
                  />
                </label>
              </div>

              {/* Download Pass Button Toggle */}
              <div className="space-y-2 bg-surface-container-low p-4 rounded-2xl border border-surface-container">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-on-surface uppercase tracking-wide">
                      Download Pass Button
                    </span>
                    <p className="text-[11px] text-secondary">
                      Allow participants to download their high-resolution pass with venue details and QR code.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={modalConfig.showDownloadButton ?? true}
                    onChange={(e) => setModalConfig({ ...modalConfig, showDownloadButton: e.target.checked })}
                    className="w-5 h-5 rounded text-primary focus:ring-primary"
                  />
                </label>
              </div>

              {/* Hide Pass After Attendance Scanned Toggle */}
              <div className="space-y-2 bg-surface-container-low p-4 rounded-2xl border border-surface-container">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-on-surface uppercase tracking-wide">
                      Hide Pass Once Attendance Marked
                    </span>
                    <p className="text-[11px] text-secondary">
                      After a coordinator scans the pass, replace the active QR code with a &ldquo;Redeemed / Checked-In&rdquo; status card.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={modalConfig.hidePassAfterAttendance ?? true}
                    onChange={(e) => setModalConfig({ ...modalConfig, hidePassAfterAttendance: e.target.checked })}
                    className="w-5 h-5 rounded text-primary focus:ring-primary"
                  />
                </label>
              </div>

              {/* Per-Activity Visibility Controls with Search & Dismiss */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                    Individual Activity Visibility ({panelActivities.length} in panel)
                  </span>
                  {modalDismissedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setModalConfig(prev => ({ ...prev, panelDismissedActivityIds: [] }))}
                      className="text-[11px] text-primary hover:underline font-bold"
                    >
                      Restore All ({modalDismissedIds.length} dismissed)
                    </button>
                  )}
                </div>

                {/* Search & Add Bar */}
                <div className="relative" ref={searchContainerRef}>
                  <div className="relative">
                    <Search className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search to add or toggle activities..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSearchDropdown(true);
                      }}
                      onFocus={() => setShowSearchDropdown(true)}
                      className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-surface-container rounded-xl text-xs text-on-surface placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                    />
                  </div>

                  {/* Search Dropdown Results */}
                  {showSearchDropdown && searchQuery && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-surface-container-lowest border border-surface-container rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto p-1 divide-y divide-surface-container/50">
                      {filteredSearchActivities.length === 0 ? (
                        <div className="p-3 text-center text-xs text-secondary">
                          No matching activities found
                        </div>
                      ) : (
                        filteredSearchActivities.map((act) => {
                          const isDismissed = modalDismissedIds.includes(act.id);
                          const isHidden = modalHiddenIds.includes(act.id);

                          return (
                            <div 
                              key={act.id}
                              className="p-2 flex items-center justify-between hover:bg-surface-container-low rounded-xl transition-colors text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-bold text-on-surface truncate">{act.name}</div>
                                <div className="text-[10px] text-secondary font-mono">{act.category} &bull; {act.room}</div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isDismissed ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreToPanel(act.id)}
                                    className="py-1 px-2.5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-lg text-[10px] flex items-center gap-1 shadow-xs"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Add to Panel</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleActivityVisibility(act.id)}
                                    className={`py-1 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                                      isHidden 
                                        ? 'bg-surface-container text-secondary' 
                                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    }`}
                                  >
                                    {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    <span>{isHidden ? 'Hidden' : 'Visible'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Visible / Panel Activity Cards */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {panelActivities.length === 0 ? (
                    <div className="text-center p-6 bg-surface-container-low rounded-2xl border border-surface-container space-y-2">
                      <p className="text-xs text-secondary">All activities have been dismissed from the control panel.</p>
                      <button
                        type="button"
                        onClick={() => setModalConfig(prev => ({ ...prev, panelDismissedActivityIds: [] }))}
                        className="py-1 px-3 bg-primary text-on-primary rounded-xl text-xs font-bold"
                      >
                        Restore All Activities
                      </button>
                    </div>
                  ) : (
                    panelActivities.map((act) => {
                      const isHidden = modalHiddenIds.includes(act.id);
                      const isVisible = !isHidden;

                      return (
                        <div
                          key={act.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isVisible 
                              ? 'bg-surface-container-low border-surface-container' 
                              : 'bg-surface-container-lowest/60 border-dashed border-surface-container opacity-60'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-on-surface truncate flex items-center gap-1.5">
                              <span>{act.name}</span>
                              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-surface-container text-secondary">
                                {act.room}
                              </span>
                            </div>
                            <span className="text-[10px] text-secondary block mt-0.5">
                              {isVisible ? 'Visible in pass selector' : 'Hidden from pass selector'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleActivityVisibility(act.id)}
                              className={`py-1 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                                isVisible 
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-surface-container text-secondary border border-surface-container'
                              }`}
                            >
                              {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              <span>{isVisible ? 'Visible' : 'Hidden'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDismissFromPanel(act.id)}
                              className="p-1 text-secondary hover:text-error rounded-lg hover:bg-surface-container transition-colors"
                              title="Dismiss from control panel"
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
        </div>,
        document.body
      )}
    </div>
  );
}

