import React, { useState, useEffect } from 'react';
import { User, Shield, ArrowRight, AlertCircle, Loader2, X } from 'lucide-react';
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
  const isUsnValid = usnCheck.valid;
  const isMobileValid = /^\d{10}$/.test(mobile.replace(/\D/g, '').slice(-10));

  const showFirstNameError = touched.firstName && !isFirstNameValid;
  const showUsnError = touched.usn && !isUsnValid;
  const showMobileError = touched.mobile && !isMobileValid;

  const handleUsnChange = (e) => {
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

    if (!isUsnValid) {
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
        usn: usnCheck.usn,
        mobile: cleanedMobile,
      });
    } catch (err) {
      setFormError(err.message || 'Failed to save registration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8 text-white">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors z-10"
            title="Close"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Participant Details
              </h2>
              <p className="text-xs text-slate-400">
                Please enter your verified details for event attendance
              </p>
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-300 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  First Name <span className="text-rose-400">*</span>
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
                  className={`w-full bg-slate-950 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-600 focus:outline-none transition-all border ${
                    showFirstNameError 
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20' 
                      : 'border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
                {showFirstNameError && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>First name is required</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Last Name <span className="text-slate-500 text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. B"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            {/* USN Field with Red Focus and Red Helping Text */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  College USN / Roll Number <span className="text-rose-400">*</span>
                </label>
                <span className={`text-[10px] font-mono ${showUsnError ? 'text-rose-400' : 'text-slate-500'}`}>
                  {usn.length}/10
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="1ST24AI045"
                  value={usn}
                  onBlur={() => setTouched(prev => ({ ...prev, usn: true }))}
                  onChange={handleUsnChange}
                  maxLength={10}
                  className={`w-full bg-slate-950 rounded-xl py-2.5 px-3.5 text-sm font-mono tracking-wider uppercase placeholder-slate-600 focus:outline-none transition-all border ${
                    showUsnError 
                      ? 'border-rose-500 text-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20' 
                      : 'border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
              </div>

              {/* Dynamic Helping Text: Red when invalid, slate guidance when empty/valid */}
              {showUsnError ? (
                <p className="text-[11px] text-rose-400 mt-1 flex items-start gap-1 leading-tight">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{usnCheck.message}</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1">
                  Format: <code className="text-slate-400 font-mono">1ST</code> + Year (<code className="text-slate-400 font-mono">24/25/26</code>) + Branch + Roll (e.g. <code className="text-slate-400 font-mono">1ST24AI045</code>, <code className="text-slate-400 font-mono">1ST25AI400</code>)
                </p>
              )}
            </div>

            {/* Mobile Number Field with Red Focus and Red Helping Text */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Mobile Number <span className="text-rose-400">*</span>
                </label>
                <span className={`text-[10px] font-mono ${showMobileError ? 'text-rose-400' : 'text-slate-500'}`}>
                  {mobile.length}/10
                </span>
              </div>
              <div className="relative flex items-center">
                <span className={`absolute left-3 text-xs font-medium border-r pr-2 transition-colors ${
                  showMobileError ? 'text-rose-400 border-rose-500/50' : 'text-slate-400 border-slate-700'
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
                  className={`w-full bg-slate-950 rounded-xl py-2.5 pl-14 pr-3.5 text-sm font-mono tracking-wider placeholder-slate-600 focus:outline-none transition-all border ${
                    showMobileError 
                      ? 'border-rose-500 text-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20' 
                      : 'border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
              </div>

              {/* Dynamic Helping Text: Red when invalid */}
              {showMobileError ? (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Must be exactly 10 digits (without country code)</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1">
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
                  className="py-3.5 px-4 rounded-xl font-semibold text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
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

          <div className="flex items-center gap-2 text-[11px] text-slate-500 justify-center pt-2 border-t border-slate-800/80">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>USN & Mobile stored securely &bull; Never embedded in QR</span>
          </div>
        </div>
      </div>
    </div>
  );
}
