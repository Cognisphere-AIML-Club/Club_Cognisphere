import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';

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

    // 2. Check if user dismissed prompt recently (last 24 hours)
    try {
      const dismissedAt = localStorage.getItem('club_games_install_dismissed');
      if (dismissedAt) {
        const diffHours = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
        if (diffHours < 24) {
          setIsDismissed(true);
        }
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
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem('club_games_install_dismissed', Date.now().toString());
    } catch (e) {}
  };

  // If already standalone or user dismissed recently, don't show
  if (isStandalone || isDismissed) {
    return null;
  }

  // If neither Chrome install prompt nor iOS Safari is active, don't show
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-4 shadow-2xl shadow-cyan-950/50 text-slate-100 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0 text-white">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                Install Club Games App
              </h4>
              <p className="text-xs text-slate-400">
                Faster offline QR pass & real-time timers
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform-specific body */}
        {deferredPrompt ? (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-400 hover:to-brand-400 text-slate-950 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
            >
              Later
            </button>
          </div>
        ) : isIOS ? (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
              <span>Tap</span>
              <Share className="w-3.5 h-3.5 inline text-cyan-400" />
              <span>Share in Safari toolbar</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span>Then select</span>
              <span className="inline-flex items-center gap-1 text-white font-medium bg-slate-800 px-1.5 py-0.5 rounded">
                <PlusSquare className="w-3 h-3 text-cyan-400" />
                Add to Home Screen
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

