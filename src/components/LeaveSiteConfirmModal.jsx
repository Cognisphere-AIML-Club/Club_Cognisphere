import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function LeaveSiteConfirmModal({ isOpen, onConfirmLeave, onStay }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fadeIn"
      onClick={onStay}
    >
      <div
        className="bg-surface-container-lowest border border-surface-container rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl relative text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Icon */}
        <button
          onClick={onStay}
          className="absolute top-4 right-4 p-1.5 text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
          title="Stay on Site"
          aria-label="Stay on Site"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
        </div>

        {/* Text Details */}
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-on-surface tracking-tight">
            Leave Cognisphere?
          </h3>
          <p className="text-xs text-secondary leading-relaxed">
            You are at the home screen. Are you sure you want to leave the site?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onStay}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-on-primary bg-primary hover:bg-primary-container transition-all shadow-xs active:scale-95"
          >
            Stay on Site
          </button>
          <button
            type="button"
            onClick={onConfirmLeave}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-secondary hover:text-error hover:bg-error-container/20 border border-surface-container transition-colors"
          >
            Leave Site
          </button>
        </div>
      </div>
    </div>
  );
}

