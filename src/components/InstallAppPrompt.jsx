import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

export const InstallAppPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone mode (PWA installed)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // 2. Check if user already dismissed or installed (prompt only once - never show again if dismissed)
    try {
      const isPermanentlyDismissed = 
        localStorage.getItem('cognisphere_pwa_install_dismissed') === 'true' ||
        localStorage.getItem('club_games_install_dismissed') === 'permanent';
      if (isPermanentlyDismissed) {
        setIsDismissed(true);
        return;
      }
    } catch (e) {}

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isAppleDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
    if (isAppleDevice && isSafari) {
      setIsIOS(true);
    }

    // 4. Listen for beforeinstallprompt event (Android / Chromium / Desktop)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
      // Once prompted, never nag the user again
      handleDismiss();
    } catch (e) {
      handleDismiss();
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      // Permanent dismissal - prompt only once, never show again if "Not now" or closed
      localStorage.setItem('cognisphere_pwa_install_dismissed', 'true');
      localStorage.setItem('club_games_install_dismissed', 'permanent');
    } catch (e) {}
  };

  // If already standalone or user dismissed, don't show
  if (isStandalone || isDismissed) {
    return null;
  }

  // If neither Chrome install prompt nor iOS Safari is active, don't show
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-4 shadow-xl text-on-surface flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img 
              src="/cognisphere-emblem.png" 
              alt="Cognisphere" 
              className="w-10 h-10 rounded-xl object-contain shrink-0 shadow-xs border border-surface-container-high bg-white/5 p-1"
            />
            <div>
              <h4 className="text-sm font-bold text-on-surface tracking-wide flex items-center gap-1.5">
                Install Cognisphere
              </h4>
              <p className="text-xs text-secondary">
                Faster offline QR pass & real-time timers
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition"
            aria-label="Not now"
            title="Not now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform-specific body */}
        {deferredPrompt ? (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2 px-3 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Install Cognisphere
            </button>
            <button
              onClick={handleDismiss}
              className="py-2 px-3 bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface text-xs font-medium rounded-xl border border-surface-container transition active:scale-95"
            >
              Not now
            </button>
          </div>
        ) : isIOS ? (
          <div className="flex flex-col gap-2.5 pt-1">
            <div className="bg-surface-container-low border border-surface-container rounded-xl p-2.5 text-xs text-on-surface flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-primary font-medium">
                <span>Tap</span>
                <Share className="w-3.5 h-3.5 inline text-primary" />
                <span>Share in Safari toolbar</span>
              </div>
              <div className="flex items-center gap-1.5 text-secondary">
                <span>Then select</span>
                <span className="inline-flex items-center gap-1 text-on-surface font-medium bg-surface-container px-1.5 py-0.5 rounded border border-surface-container-high">
                  <PlusSquare className="w-3 h-3 text-primary" />
                  Add to Home Screen
                </span>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleDismiss}
                className="py-1 px-3 text-secondary hover:text-on-surface text-xs font-medium rounded-lg transition"
              >
                Not now
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

