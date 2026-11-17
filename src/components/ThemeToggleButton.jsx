/**
 * Skiper4 — Animated Theme Toggle Button
 * Source: skiper-ui.com/docs/components/skiper4
 * Sun ↔ Moon spring-animated SVG toggle.
 * Props:
 *   isDark   – boolean (controlled)
 *   onToggle – () => void
 *   size     – number (px, default 24)
 *   className – extra classes on the outer <button>
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';

export function ThemeToggleButton({ isDark: externalIsDark, onToggle, size = 24, className = '' }) {
  const [internalDark, setInternalDark] = useState(false);
  const isDark = externalIsDark !== undefined ? externalIsDark : internalDark;

  const handleClick = () => {
    if (onToggle) onToggle();
    else setInternalDark(v => !v);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      aria-label="Toggle theme"
      className={`relative flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative overflow-visible"
      >
        {/* Rotation wrapper */}
        <motion.g
          animate={{ rotate: isDark ? 40 : 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          {/* Sun rays + circle (visible in light mode) */}
          <motion.circle
            cx="12" cy="12" r="4"
            animate={{ scale: isDark ? 0 : 1, opacity: isDark ? 0 : 1 }}
            style={{ originX: '50%', originY: '50%' }}
            transition={{ duration: 0.25 }}
          />
          <motion.g
            animate={{ opacity: isDark ? 0 : 1, scale: isDark ? 0 : 1 }}
            style={{ originX: '50%', originY: '50%' }}
            transition={{ duration: 0.2 }}
          >
            <line x1="12" y1="2"  x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="2"  y1="12" x2="4"  y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="4.93"  y1="4.93"  x2="6.34"  y2="6.34" />
            <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
            <line x1="4.93"  y1="19.07" x2="6.34"  y2="17.66" />
            <line x1="17.66" y1="6.34"  x2="19.07" y2="4.93" />
          </motion.g>

          {/* Moon crescent (visible in dark mode) */}
          <motion.path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill="currentColor"
            stroke="none"
            animate={{ scale: isDark ? 1 : 0, opacity: isDark ? 1 : 0, rotate: isDark ? 0 : -30 }}
            style={{ originX: '50%', originY: '50%' }}
            transition={{ type: 'spring', stiffness: 250, damping: 20 }}
          />
        </motion.g>
      </svg>
      <span className="sr-only">Toggle theme</span>
    </motion.button>
  );
}

export default ThemeToggleButton;

