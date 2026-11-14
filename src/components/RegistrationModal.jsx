import React, { useState, useEffect } from 'react';
import { User, Shield, ArrowRight, AlertCircle, Loader2, X, Lock } from 'lucide-react';
import { validateUSN } from '../hooks/useParticipantProfile';

export default function RegistrationModal({ isOpen, onSubmit, onClose, initialProfile = {} }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [usn, setUsn] = useState('');
  const [mobile, setMobile] = useState('');
  
  // Validation touch states
  const [touched, setTouched] = useState({
    firstName: false,
    usn: false,
    mobile: false
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // USN Lock check: once a USN is linked to an account/email, it cannot be changed
  const isUsnLocked = Boolean(initialProfile?.usn && initialProfile.usn.trim().length > 0);

  useEffect(() => {
    if (initialProfile) {
      if (initialProfile.firstName) setFirstName(initialProfile.firstName);
      if (initialProfile.lastName) setLastName(initialProfile.lastName);
      if (initialProfile.usn) setUsn(initialProfile.usn);
      if (initialProfile.mobile && initialProfile.mobile !== 'Offline') setMobile(initialProfile.mobile);
    }
  }, [initialProfile]);

  if (!isOpen) return null;

  // Validation calculations
  const isFirstNameValid = firstName.trim().length > 0;
  const usnCheck = validateUSN(usn);
  const isUsnValid = isUsnLocked || usnCheck.valid;
  const isMobileValid = /^\d{10}$/.test(mobile.replace(/\D/g, '').slice(-10));

  const showFirstNameError = touched.firstName && !isFirstNameValid;
  const showUsnError = !isUsnLocked && touched.usn && !isUsnValid;
  const showMobileError = touched.mobile && !isMobileValid;

  const handleUsnChange = (e) => {
    if (isUsnLocked) return;
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setUsn(val);
    setTouched(prev => ({ ...prev, usn: true }));
    if (formError) setFormError('');
  };

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(val);
    setTouched(prev => ({ ...prev, mobile: true }));
    if (formError) setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    setTouched({ firstName: true, usn: true, mobile: true });

    if (!isFirstNameValid) {
      setFormError('Please enter your first name.');
      return;
    }

    const finalUsn = isUsnLocked ? initialProfile.usn.trim().toUpperCase() : usnCheck.usn;

    if (!isUsnLocked && !usnCheck.valid) {
      setFormError(usnCheck.message);
      return;
    }

    const cleanedMobile = mobile.replace(/\D/g, '').slice(-10);
    if (!isMobileValid) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        usn: finalUsn,
        mobile: cleanedMobile,
      });
    } catch (err) {
      setFormError(err.message || 'Failed to save registration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 sm:pt-16 bg-black/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="max-w-md w-full bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-8 shadow-xl relative text-on-surface h-auto max-h-fit">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-secondary hover:text-on-surface rounded-xl hover:bg-surface-container transition-colors z-10"
            title="Close"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-on-surface">
                Participant Details
              </h2>
              <p className="text-xs text-secondary">
                Please enter your verified details for event attendance
              </p>
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-error-container border border-error/20 flex items-start gap-2.5 text-xs text-on-error-container animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  First Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Srujan"
                  value={firstName}
                  onBlur={() => setTouched(prev => ({ ...prev, firstName: true }))}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (formError) setFormError('');
                  }}
                  className={`w-full bg-surface-container-low rounded-xl py-2.5 px-3.5 text-sm text-on-surface placeholder-secondary focus:outline-none transition-all border ${
                    showFirstNameError 
                      ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20' 
                      : 'border-surface-container focus:border-primary focus:ring-2 focus:ring-primary/20'
                  }`}
                />
                {showFirstNameError && (
                  <p className="text-[11px] text-error mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>First name is required</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  Last Name <span className="text-secondary text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. B"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-surface-container-low border border-surface-container focus:border-primary rounded-xl py-2.5 px-3.5 text-sm text-on-surface placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* USN Field with Lock Indicator if already registered */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                  <span>College USN / Roll Number</span>
                  <span className="text-error">*</span>
                </label>
                {isUsnLocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shadow-xs">
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
                      ? 'bg-surface-container/70 border-surface-container text-on-surface/80 cursor-not-allowed select-none pr-9 font-semibold'
                      : showUsnError 
                        ? 'bg-surface-container-low border-error text-error focus:border-error focus:ring-2 focus:ring-error/20' 
                        : 'bg-surface-container-low border-surface-container text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20'
                  }`}
                />
                {isUsnLocked && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" title="USN is locked">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Dynamic Helping Text: Locked banner vs Invalid vs Instructions */}
              {isUsnLocked ? (
                <div className="mt-1.5 p-2.5 rounded-xl bg-surface-container/60 border border-surface-container flex items-start gap-2 text-[11px] text-secondary">
                  <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <span className="font-semibold text-on-surface">USN Permanently Locked:</span> Linked to <span className="font-mono text-on-surface font-semibold">{initialProfile?.email || 'this account'}</span>. Once an email is linked with a USN, it cannot be changed.
                  </div>
                </div>
              ) : showUsnError ? (
                <p className="text-[11px] text-error mt-1 flex items-start gap-1 leading-tight">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{usnCheck.message}</span>
                </p>
              ) : (
                <p className="text-[11px] text-secondary mt-1">
                  Format: <code className="text-on-surface bg-surface-container px-1 py-0.5 rounded font-mono">1ST</code> + Year (<code className="text-on-surface bg-surface-container px-1 py-0.5 rounded font-mono">24/25/26</code>) + Branch + Roll (e.g. <code className="text-on-surface bg-surface-container px-1 py-0.5 rounded font-mono">1ST24AI045</code>, <code className="text-on-surface bg-surface-container px-1 py-0.5 rounded font-mono">1ST25AI400</code>)
                </p>
              )}
            </div>

            {/* Mobile Number Field with Red Focus and Red Helping Text */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-on-surface">
                  Mobile Number <span className="text-error">*</span>
                </label>
                <span className={`text-[10px] font-mono ${showMobileError ? 'text-error font-bold' : 'text-secondary'}`}>
                  {mobile.length}/10
                </span>
              </div>
              <div className="relative flex items-center">
                <span className={`absolute left-3 text-xs font-medium border-r pr-2 transition-colors ${
                  showMobileError ? 'text-error border-error/50' : 'text-secondary border-surface-container'
                }`}>
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  placeholder="9876543210"
                  value={mobile}
                  onBlur={() => setTouched(prev => ({ ...prev, mobile: true }))}
                  onChange={handleMobileChange}
                  maxLength={10}
                  className={`w-full bg-surface-container-low rounded-xl py-2.5 pl-14 pr-3.5 text-sm font-mono tracking-wider placeholder-secondary focus:outline-none transition-all border ${
                    showMobileError 
                      ? 'border-error text-error focus:border-error focus:ring-2 focus:ring-error/20' 
                      : 'border-surface-container text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20'
                  }`}
                />
              </div>

              {/* Dynamic Helping Text: Red when invalid */}
              {showMobileError ? (
                <p className="text-[11px] text-error mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Must be exactly 10 digits (without country code)</span>
                </p>
              ) : (
                <p className="text-[11px] text-secondary mt-1">
                  10-digit number for event notifications & coordinator contact
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="py-3.5 px-4 rounded-xl font-semibold text-xs text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-surface-container transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3.5 px-4 bg-primary hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed text-on-primary font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-on-primary" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>{initialProfile?.usn ? 'Save Changes' : 'Confirm & View Event Pass'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="flex items-center gap-2 text-[11px] text-secondary justify-center pt-2 border-t border-surface-container">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>USN & Mobile stored securely &bull; Never embedded in QR</span>
          </div>
        </div>
      </div>
    </div>
  );
}
