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
  Loader2,
  Search,
  X,
  Printer,
  FileCheck2,
  Eye,
  RefreshCw
} from 'lucide-react';
import { verifyCertificateById } from '../services/certificateService';
import { generateCertificateDataUrl, downloadCertificateImage, printCertificate } from '../utils/certificateGenerator';

export default function CertificateVerificationView({ certId = '', onBack }) {
  const [searchQuery, setSearchQuery] = useState(certId ? certId.trim() : '');
  const [activeCertId, setActiveCertId] = useState(certId ? certId.trim() : '');
  const [loading, setLoading] = useState(Boolean(certId && certId.trim()));
  const [certData, setCertData] = useState(null);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync if prop changes
  useEffect(() => {
    if (certId && certId.trim() && certId.trim() !== activeCertId) {
      const clean = certId.trim();
      setActiveCertId(clean);
      setSearchQuery(clean);
    }
  }, [certId]);

  // Lookup verification data and generate WebP preview
  useEffect(() => {
    let isMounted = true;
    if (!activeCertId) {
      setLoading(false);
      setCertData(null);
      setError(null);
      setPreviewUrl(null);
      return;
    }

    const checkVerification = async () => {
      setLoading(true);
      setError(null);
      setCertData(null);
      setPreviewUrl(null);
      try {
        const result = await verifyCertificateById(activeCertId);
        if (!isMounted) return;
        if (result.exists && result.data) {
          setCertData(result.data);

          // Fast lightweight WebP preview generation (does not load heavy original image)
          setPreviewLoading(true);
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const currentVerifyUrl = `${origin}/verify?id=${encodeURIComponent(activeCertId)}`;
          generateCertificateDataUrl({
            participantName: result.data.participantName || 'Participant',
            activityName: result.data.activityName || '',
            certificateId: result.data.certId || activeCertId,
            verifyUrl: currentVerifyUrl,
            format: 'image/webp',
            useOriginalTemplate: false
          }).then((url) => {
            if (isMounted) {
              setPreviewUrl(url);
              setPreviewLoading(false);
            }
          }).catch((err) => {
            console.warn('WebP preview generation error:', err);
            if (isMounted) setPreviewLoading(false);
          });
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
  }, [activeCertId]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const clean = (searchQuery || '').trim();
    if (!clean) return;
    setActiveCertId(clean);
    if (typeof window !== 'undefined') {
      const newUrl = `${window.location.origin}/verify?id=${encodeURIComponent(clean)}`;
      window.history.pushState({}, '', newUrl);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveCertId('');
    setCertData(null);
    setError(null);
    setPreviewUrl(null);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/verify');
    }
  };

  // On-demand high-resolution PNG download
  const handleDownloadPng = async () => {
    if (!certData) return;
    setDownloading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const currentVerifyUrl = `${origin}/verify?id=${encodeURIComponent(certData.certId || activeCertId)}`;
      const url = await generateCertificateDataUrl({
        participantName: certData.participantName,
        activityName: certData.activityName,
        certificateId: certData.certId || activeCertId,
        verifyUrl: currentVerifyUrl,
        format: 'image/png',
        useOriginalTemplate: true
      });
      const cleanName = (certData.participantName || 'Participant').replace(/[^a-zA-Z0-9]/g, '_');
      downloadCertificateImage(url, `IGNITE2026_${cleanName}_Verified.png`);
    } catch (err) {
      alert('Failed to generate high-resolution PNG: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // On-demand direct PDF export (1:1 3507x2480 pt dimensions)
  const handleDownloadPdf = async () => {
    if (!certData) return;
    setExportingPdf(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const currentVerifyUrl = `${origin}/verify?id=${encodeURIComponent(certData.certId || activeCertId)}`;
      const url = await generateCertificateDataUrl({
        participantName: certData.participantName,
        activityName: certData.activityName,
        certificateId: certData.certId || activeCertId,
        verifyUrl: currentVerifyUrl,
        format: 'image/png',
        useOriginalTemplate: true
      });
      const cleanName = (certData.participantName || 'Participant').replace(/[^a-zA-Z0-9]/g, '_');
      await printCertificate(url, `Certificate - ${certData.participantName}`, `IGNITE2026_${cleanName}_Verified.pdf`);
    } catch (err) {
      alert('Failed to export PDF: ' + err.message);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const shareUrl = `${origin}/verify?id=${encodeURIComponent(certData?.certId || activeCertId)}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareLinkedIn = () => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const certId = certData?.certId || activeCertId;
    const shareUrl = `${origin}/verify?id=${encodeURIComponent(certId)}`;
    const eventName = certData?.activityName ? `${certData.activityName} at IGNITE 2026` : 'IGNITE 2026';

    const postText = `I participated in ${eventName} organized by Cognisphere, Sambhram Institute of Technology. Here is my verified certificate:\n${shareUrl}\n\n#Cognisphere #IGNITE2026 #Achievement #TechEvent`;

    const linkedinUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(postText)}&linkOrigin=DEEPLINK`;
    window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-start p-4 sm:p-6 max-w-2xl mx-auto w-full animate-fadeIn space-y-6">
      {/* Top Header & Back Button */}
      <div className="w-full flex items-center justify-between gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="text-xs font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-surface-container-lowest border border-surface-container hover:bg-surface-container-low shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Portal</span>
          </button>
        )}
      </div>

      {/* Hero Title & Subtitle */}
      <div className="text-center space-y-2 max-w-lg mx-auto">
        <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
          Certificate Verification
        </h1>
        <p className="text-xs text-secondary leading-relaxed">
          Authenticate credentials issued by <span className="font-semibold text-on-surface">Cognisphere - AI &amp; ML Club</span> at Sambhram Institute of Technology for IGNITE-2026.
        </p>
      </div>

      {/* Interactive Search Bar for Certificate ID */}
      <form onSubmit={handleSearchSubmit} className="w-full">
        <div className="relative flex items-center bg-surface-container-lowest border border-surface-container hover:border-surface-container-high focus-within:border-primary rounded-2xl p-1.5 sm:p-2 shadow-xs transition-all">
          <Search className="w-4 h-4 text-secondary ml-2.5 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Certificate ID"
            // placeholder="[EVENT]-[ACTIVITY]-[CODE]"
            className="w-full bg-transparent text-xs sm:text-sm text-on-surface placeholder:text-secondary focus:outline-none py-1.5 font-mono"
            autoFocus={!activeCertId}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="p-1.5 text-secondary hover:text-on-surface rounded-lg mr-1 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            disabled={!searchQuery.trim() || loading}
            className="py-2 px-4 sm:px-5 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center gap-1.5 shrink-0 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>Verify</span>
          </button>
        </div>
        <p className="text-[11px] text-secondary mt-1.5 px-2 flex items-center justify-between">
          <span>Format: <code className="font-mono text-primary font-bold">[EVENT]-[ACTIVITY]-[CODE]</code></span>
        </p>
      </form>

      {/* Main Verification Content Stages */}
      {loading ? (
        /* Loading Stage */
        <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm w-full animate-fadeIn">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-on-surface">Verifying Certificate Authenticity...</h3>
            <p className="text-xs text-secondary font-mono">Querying record for: {activeCertId}</p>
          </div>
        </div>
      ) : !activeCertId ? (
        /* Welcome / Search Prompt Stage (When visiting /verify with no ID) */
        <div className="bg-surface-container-lowest border border-surface-container rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-xs w-full animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-surface-container border border-surface-container-high text-primary flex items-center justify-center mx-auto shadow-xs">
            <Award className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-on-surface">
              Certificate Authenticity Check
            </h3>
            <p className="text-xs text-secondary leading-relaxed">
              Every certificate issued during IGNITE-2026 is registered in the official Cognisphere Cloud Registry with a tamper-proof credential ID. Enter the ID above to inspect the official record and view the live preview.
            </p>
          </div>
        </div>
      ) : error || !certData ? (
        /* Unverified / Error Stage */
        <div className="bg-surface-container-lowest border border-error/30 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm w-full animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-error/10 border border-error/20 text-error flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-on-surface">Unverified Credential</h3>
            <p className="text-xs text-secondary max-w-sm mx-auto leading-relaxed">
              {error || 'This credential could not be authenticated in the official event registry.'}
            </p>
            <p className="text-[11px] font-mono text-secondary pt-2">
              Queried ID: <span className="font-bold text-error">{activeCertId}</span>
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleClearSearch}
              className="py-2 px-4 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold rounded-xl text-xs transition-all shadow-xs"
            >
              Try Another Certificate ID
            </button>
          </div>
        </div>
      ) : (
        /* Verified Credential Card with WebP Preview */
        <div className="flex flex-col justify-center items-center bg-surface-container-lowest border border-surface-container rounded-3xl p-5 sm:p-7 shadow-sm w-full space-y-5 relative overflow-hidden animate-fadeIn">
          {/* Top Emerald Accent Bar */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-tertiary" />

          {/* Official Verification Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-container">
            <div>
              <div className="flex flex-row justify-center items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary-container/20 border border-tertiary/30 text-tertiary text-xs font-bold uppercase tracking-wider">                <CheckCircle2 className="w-3.5 h-3.5 text-tertiary" />
                <span>Verified Authentic Certificate</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
                Sambhram Institute of Technology
              </h2>
              <p className="text-xs text-secondary text-center">
                Department of AI &amp; ML • Cognisphere Club • IGNITE-2026
              </p>
            </div>
          </div>

          {/* Certificate Credential Details */}
          <div className="w-full space-y-3.5 bg-surface-container-low rounded-2xl p-4 sm:p-5 border border-surface-container">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-secondary">
                Issued To
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-on-surface text-primary">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-surface-container text-xs">
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase">Certificate ID</p>
                <p className="font-mono font-bold text-on-surface text-[11px] truncate">
                  {certData.certId || activeCertId}
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

          {/* WebP Visual Certificate Preview */}
          <div className="space-y-2">
            {previewLoading ? (
              <div className="w-full aspect-[3507/2480] bg-surface-container-low rounded-2xl border border-surface-container flex flex-col items-center justify-center gap-2 p-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs text-secondary font-medium">Rendering certificate WebP preview...</span>
              </div>
            ) : previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-surface-container bg-surface-container-low shadow-sm group">
                <img
                  src={previewUrl}
                  alt={`Certificate for ${certData.participantName}`}
                  className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.005]"
                />
              </div>
            ) : (
              <div className="w-full aspect-[3507/2480] bg-surface-container-low rounded-2xl border border-surface-container flex items-center justify-center p-6 text-xs text-secondary">
                <span>Preview currently unavailable</span>
              </div>
            )}
          </div>

          {/* Cryptographic Registry Footnote */}
          <div className="text-[11px] text-secondary space-y-1 text-center border-t border-surface-container pt-3">
            <p className="font-semibold text-on-surface">Department of Artificial Intelligence &amp; Machine Learning</p>
            <p>Sambhram Institute of Technology, Bangalore</p>
            <p className="text-[10px] font-mono text-tertiary font-bold pt-1">
              ✓ Record cryptographically registered in Cognisphere Cloud Registry
            </p>
          </div>

          {/* Action Buttons: Download PNG & Download PDF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleDownloadPng}
              disabled={downloading || exportingPdf}
              className="w-full py-3 px-4 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download Official PNG</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloading || exportingPdf}
              className="w-full py-3 px-4 bg-surface-container hover:bg-surface-container-high border border-surface-container-high text-on-surface font-semibold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-xs whitespace-nowrap active:scale-95"
            >
              {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>Download PDF</span>
            </button>
          </div>

          {/* Dedicated Share Row on the Next Line: certificate.share with Copy and LinkedIn */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 gap-4">
            <span className="text-xs sm:text-sm font-medium text-secondary tracking-normal select-none">
              Share certificate :
            </span>

            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Copy Link Button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1.5 text-secondary hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors relative group"
                title={copied ? "Link copied!" : "Copy certificate link"}
                aria-label="Copy certificate link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-tertiary" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied && (
                  <span className="absolute -top-7 right-0 text-[10px] font-bold bg-surface-container-highest text-on-surface px-2 py-0.5 rounded-md shadow-xs animate-fadeIn whitespace-nowrap">
                    Copied!
                  </span>
                )}
              </button>

              {/* LinkedIn Share Button */}
              <button
                type="button"
                onClick={handleShareLinkedIn}
                className="p-1 hover:opacity-90 active:scale-95 transition-transform rounded"
                title="Share certificate on LinkedIn"
                aria-label="Share certificate on LinkedIn"
              >
                <svg className="w-5 h-5 rounded-[4px]" viewBox="0 0 24 24" fill="none">
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
      )}
    </div>
  );
}
