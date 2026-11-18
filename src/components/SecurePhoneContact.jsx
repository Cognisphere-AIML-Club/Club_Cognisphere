import React, { useState, useEffect } from 'react';
import { Phone, Copy, Check, PhoneCall, EyeOff } from 'lucide-react';

/**
 * Safely decodes phone number from plaintext or base64
 */
function decodePhone(raw) {
  if (!raw) return '';
  const trimmed = raw.trim();
  // Detect Base64-encoded strings (for users who want zero plaintext in their bundle)
  try {
    if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length >= 8 && !trimmed.startsWith('+')) {
      const decoded = atob(trimmed);
      if (/[\d+]{5,}/.test(decoded)) {
        return decoded;
      }
    }
  } catch {}
  return trimmed;
}

/**
 * Reverse string helper for CSS bidi-override anti-scraping
 */
function reverseString(str) {
  return str.split('').reverse().join('');
}

export default function SecurePhoneContact({ rawPhone }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(null);

  // If no env variable is configured, render neutral placeholder
  if (!rawPhone || !rawPhone.trim()) {
    return (
      <span className="text-secondary opacity-80" title="Configure VITE_CLUB_CONTACT_PHONE in .env">
        Phone
      </span>
    );
  }

  // When human reveals, decode into memory
  const handleReveal = () => {
    const decoded = decodePhone(rawPhone);
    setPhoneNumber(decoded);
    setRevealed(true);
  };

  const handleHide = () => {
    setRevealed(false);
    setPhoneNumber(null);
    setCopied(false);
  };

  const handleCall = () => {
    if (!phoneNumber) return;
    const cleanDigits = phoneNumber.replace(/[^\d+]/g, '');
    window.location.href = `tel:${cleanDigits}`;
  };

  const handleCopy = async () => {
    if (!phoneNumber) return;
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  // Auto-hide after 60 seconds of inactivity to re-lock DOM against delayed scrapers
  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => {
      handleHide();
    }, 60000);
    return () => clearTimeout(timer);
  }, [revealed]);

  // Initial State: ZERO phone number digits or tel: link in DOM
  if (!revealed || !phoneNumber) {
    return (
      <button
        type="button"
        onClick={handleReveal}
        className="inline-flex items-center gap-1.5 hover:text-primary text-secondary transition-colors cursor-pointer group"
        title="Click to securely view contact number (bot-protected)"
        aria-label="Reveal contact phone number"
      >
        <Phone className="w-3 h-3 text-primary group-hover:scale-110 transition-transform" />
        <span className="underline decoration-dotted decoration-outline-variant underline-offset-2">
          Phone: Click to reveal
        </span>
      </button>
    );
  }

  // Revealed State:
  // Anti-scrape mechanism:
  // 1. Text node contains REVERSED characters
  // 2. CSS unicode-bidi: bidi-override renders it left-to-right correctly to human eyes
  // 3. No static <a href="tel:..."> in DOM (call is initiated via button onClick)
  const reversedText = reverseString(phoneNumber);

  return (
    <span className="inline-flex items-center gap-2 bg-surface-container-low px-2 py-0.5 rounded-lg border border-surface-container shadow-xs animate-fadeIn">
      <PhoneCall className="w-3 h-3 text-primary shrink-0" />
      <span className="text-[11px] font-semibold text-secondary">Phone:</span>
      
      {/* Bot-scrambled visual span: DOM has reversed string, humans see standard number */}
      <span
        className="font-mono text-on-surface font-bold select-all tracking-wide text-xs"
        style={{
          unicodeBidi: 'bidi-override',
          direction: 'rtl',
        }}
        title="Phone number"
      >
        {reversedText}
      </span>

      {/* Human Action: Dial */}
      <button
        type="button"
        onClick={handleCall}
        className="px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold transition-all active:scale-95"
        title="Dial phone number"
      >
        Call
      </button>

      {/* Human Action: Copy */}
      <button
        type="button"
        onClick={handleCopy}
        className="p-1 rounded hover:bg-surface-container text-secondary hover:text-on-surface transition-colors"
        title={copied ? 'Copied to clipboard!' : 'Copy phone number'}
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald-500 animate-scaleIn" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>

      {/* Re-hide button */}
      <button
        type="button"
        onClick={handleHide}
        className="p-1 rounded hover:bg-surface-container text-secondary hover:text-on-surface transition-colors"
        title="Hide phone number"
      >
        <EyeOff className="w-3 h-3" />
      </button>
    </span>
  );
}

