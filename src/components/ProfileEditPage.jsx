import React, { useState, useEffect } from 'react';
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
  GraduationCap
} from 'lucide-react';
import { validateUSN } from '../hooks/useParticipantProfile';

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
  role = 'participant' 
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [certificateName, setCertificateName] = useState('');
  const [hasManuallyEditedCertName, setHasManuallyEditedCertName] = useState(false);
  const [gender, setGender] = useState('Male');
  const [mobile, setMobile] = useState('');
  const [usn, setUsn] = useState('');

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
    if (profile) {
      if (profile.firstName) setFirstName(profile.firstName);
      if (profile.lastName) setLastName(profile.lastName);
      
      const certName = profile.certificateName || profile.name || '';
      if (certName) {
        setCertificateName(certName);
        setHasManuallyEditedCertName(true);
      } else if (profile.firstName) {
        setCertificateName(`${profile.firstName} ${profile.lastName || ''}`.trim());
      }

      if (profile.gender) setGender(profile.gender);
      if (profile.mobile && profile.mobile !== 'Offline') setMobile(profile.mobile);
      if (profile.usn) setUsn(profile.usn);
    } else if (user) {
      const nameParts = (user.displayName || '').trim().split(' ');
      const fName = nameParts[0] || '';
      const lName = nameParts.slice(1).join(' ') || '';
      setFirstName(fName);
      setLastName(lName);
      setCertificateName(user.displayName || '');
      if (user.phoneNumber) {
        setMobile(user.phoneNumber.replace(/\D/g, '').slice(-10));
      }
    }
  }, [profile, user]);

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
        gender,
        usn: finalUsn,
        mobile: cleanedMobile,
      });

      setSuccessToast('Profile details updated successfully!');
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile. Please try again.');
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
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {isUsnLocked && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 shadow-xs">
              <Lock className="w-3 h-3" />
              <span>USN Verified & Locked</span>
            </span>
          )}
        </div>
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

            {/* Gender Selection (Image 1: Male / Female / Transgender) */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-on-surface">
                Gender
              </label>
              <div className="flex flex-wrap items-center gap-6 text-sm text-on-surface">
                {['Male', 'Female', 'Transgender'].map((opt) => (
                  <label key={opt} className="inline-flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="gender"
                      value={opt}
                      checked={gender === opt}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-4 h-4 text-primary accent-primary focus:ring-primary focus:ring-2 border-surface-container cursor-pointer"
                    />
                    <span className="text-xs font-medium text-on-surface group-hover:text-primary transition-colors">
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
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

        {/* Bottom Save & Discard Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
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
    </div>
  );
}

