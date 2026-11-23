import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  Calendar, 
  Download, 
  Copy, 
  Check, 
  ArrowLeft, 
  ExternalLink,
  Sparkles,
  Loader2
} from 'lucide-react';
import { verifyCertificateById } from '../services/certificateService';
import { generateCertificateDataUrl, downloadCertificateImage } from '../utils/certificateGenerator';

export default function CertificateVerificationView({ certId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [certData, setCertData] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!certId) {
      setLoading(false);
      setError('No certificate ID was provided in the verification URL.');
      return;
    }

    const checkVerification = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await verifyCertificateById(certId);
        if (!isMounted) return;
        if (result.exists && result.data) {
          setCertData(result.data);
        } else {
          setError(result.error || 'Certificate could not be verified in the Cognisphere registry.');
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to verify certificate');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkVerification();
    return () => { isMounted = false; };
  }, [certId]);

  const handleDownload = async () => {
    if (!certData) return;
    setDownloading(true);
    try {
      const url = await generateCertificateDataUrl({
        participantName: certData.participantName,
        activityName: certData.activityName,
        certificateId: certData.certId || certId,
        verifyUrl: window.location.href
      });
      const cleanName = (certData.participantName || 'Participant').replace(/[^a-zA-Z0-9]/g, '_');
      downloadCertificateImage(url, `IGNITE2026_${cleanName}_Verified.png`);
    } catch (err) {
      alert('Failed to generate download: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-6 max-w-xl mx-auto w-full animate-fadeIn">
      {/* Back to Portal Bar */}
      {onBack && (
        <button
          onClick={onBack}
          className="self-start mb-4 text-xs font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cognisphere Portal</span>
        </button>
      )}

      {loading ? (
        <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm w-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <h3 className="text-base font-bold text-on-surface">Verifying Certificate Authenticity...</h3>
          <p className="text-xs text-secondary font-mono">Looking up credential ID: {certId}</p>
        </div>
      ) : error || !certData ? (
        <div className="bg-surface-container-lowest border border-error/30 rounded-3xl p-8 sm:p-10 text-center space-y-4 shadow-sm w-full">
          <div className="w-14 h-14 rounded-2xl bg-error/10 border border-error/20 text-error flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-on-surface">Unverified Credential</h3>
            <p className="text-xs text-secondary max-w-sm mx-auto leading-relaxed">
              {error || 'This credential could not be authenticated in the official event registry.'}
            </p>
            {certId && (
              <p className="text-[11px] font-mono text-secondary pt-2">
                Queried ID: <span className="font-bold text-error">{certId}</span>
              </p>
            )}
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="py-2.5 px-5 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold rounded-xl text-xs transition-all shadow-xs"
            >
              Return to Events
            </button>
          )}
        </div>
      ) : (
        /* Verified Credential Card */
        <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-8 shadow-sm w-full space-y-6 relative overflow-hidden">
          {/* Top Green Accent Bar */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-tertiary" />

          {/* Official Verification Header */}
          <div className="text-center space-y-2 pb-4 border-b border-surface-container">
            <div className="w-14 h-14 rounded-2xl bg-tertiary-container/30 border border-tertiary/30 text-tertiary flex items-center justify-center mx-auto shadow-xs">
              <ShieldCheck className="w-8 h-8 text-tertiary" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary-container/20 border border-tertiary/30 text-tertiary text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified Authentic Certificate</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Sambhram Institute of Technology
            </h2>
            <p className="text-xs text-secondary">
              Cognisphere - AI & ML Club • IGNITE-2026
            </p>
          </div>

          {/* Certificate Credential Details */}
          <div className="space-y-4 bg-surface-container-low rounded-2xl p-4 sm:p-5 border border-surface-container">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-secondary">
                Issued To
              </p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-on-surface text-primary">
                {certData.participantName}
              </h3>
            </div>

            {certData.activityName && (
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-secondary">
                  In Recognition Of
                </p>
                <p className="text-sm sm:text-base font-bold text-on-surface">
                  {certData.activityName}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-container text-xs">
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase">Certificate ID</p>
                <p className="font-mono font-bold text-on-surface text-[11px] truncate">
                  {certData.certId || certId}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase">Event Dates</p>
                <p className="font-medium text-on-surface text-[11px]">
                  24 - 25 November, 2026
                </p>
              </div>
            </div>
          </div>

          {/* Organization Verification Info */}
          <div className="text-[11px] text-secondary space-y-1 text-center border-t border-surface-container pt-4">
            <p className="font-semibold text-on-surface">Department of Artificial Intelligence & Machine Learning</p>
            <p>Sambhram Institute of Technology, Bangalore</p>
            <p className="text-[10px] font-mono text-tertiary font-bold pt-1">
              ✓ Record cryptographically registered in Cognisphere Cloud Registry
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-3 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download Official PNG</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full sm:w-auto py-3 px-4 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface font-semibold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              {copied ? <Check className="w-4 h-4 text-tertiary" /> : <Copy className="w-4 h-4 text-secondary" />}
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
