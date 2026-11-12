import React from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';

export default function LogoutConfirmModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-surface-container-lowest border border-surface-container rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl relative text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Icon */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
          title="Cancel"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-12 h-12 rounded-2xl bg-error-container border border-error/20 text-error flex items-center justify-center mx-auto shadow-xs">
          <LogOut className="w-6 h-6" />
        </div>

        {/* Text Details */}
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-on-surface tracking-tight">
            Are you sure you want to sign out?
          </h3>
          <p className="text-xs text-secondary leading-relaxed">
            Your active session will be securely cleared. You will need to sign back in with your college Google account to access your pass and records.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-surface-container transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-on-error bg-error hover:bg-error/90 transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

