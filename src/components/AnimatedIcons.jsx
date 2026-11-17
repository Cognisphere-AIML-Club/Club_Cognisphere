/**
 * Skiper99 — Animated Icons 002
 * Source: skiper-ui.com/docs/components/skiper99
 * Interactive SVG icons (Arrow, Menu/Close, Volume/Mute) with Framer Motion.
 * Hover ArrowIcon to animate; click MenuIcon to open/close; click VolumeIcon to mute/unmute.
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';

// ─── Arrow Icon ───────────────────────────────────────────────────────────────
export const ArrowIcon = ({ size = 28, className = '' }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`flex items-center justify-center w-full h-full cursor-pointer select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M5 12h14"
          animate={{ x: isHovered ? [0, 4, 0] : 0 }}
          transition={{ duration: 0.4, repeat: isHovered ? Infinity : 0, ease: 'easeInOut' }}
        />
        <motion.path
          d="m12 5 7 7-7 7"
          animate={{ x: isHovered ? [0, 6, 0] : 0 }}
          transition={{ duration: 0.4, repeat: isHovered ? Infinity : 0, ease: 'easeInOut' }}
        />
      </motion.svg>
    </div>
  );
};

// ─── Menu / Close Icon ────────────────────────────────────────────────────────
export const MenuIcon = ({ size = 28, className = '', isOpen: controlledOpen, onToggle }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleClick = () => {
    if (onToggle) onToggle();
    else setInternalOpen(v => !v);
  };

  return (
    <div
      className={`flex items-center justify-center w-full h-full cursor-pointer select-none ${className}`}
      onClick={handleClick}
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Top bar → diagonal */}
        <motion.line
          x1="4" y1="6" x2="20" y2="6"
          animate={isOpen ? { x1: 6, y1: 6, x2: 18, y2: 18 } : { x1: 4, y1: 6, x2: 20, y2: 6 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        />
        {/* Middle bar fades out */}
        <motion.line
          x1="4" y1="12" x2="20" y2="12"
          animate={{ opacity: isOpen ? 0 : 1, scaleX: isOpen ? 0 : 1 }}
          style={{ originX: '50%', originY: '50%' }}
          transition={{ duration: 0.2 }}
        />
        {/* Bottom bar → diagonal */}
        <motion.line
          x1="4" y1="18" x2="20" y2="18"
          animate={isOpen ? { x1: 6, y1: 18, x2: 18, y2: 6 } : { x1: 4, y1: 18, x2: 20, y2: 18 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        />
      </motion.svg>
    </div>
  );
};

// ─── Volume / Mute Icon ───────────────────────────────────────────────────────
export const VolumeIcon = ({ size = 28, className = '', isMuted: controlledMuted, onToggle }) => {
  const [internalMuted, setInternalMuted] = useState(false);
  const isMuted = controlledMuted !== undefined ? controlledMuted : internalMuted;
  const handleClick = () => {
    if (onToggle) onToggle();
    else setInternalMuted(v => !v);
  };

  return (
    <div
      className={`flex items-center justify-center w-full h-full cursor-pointer select-none ${className}`}
      onClick={handleClick}
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Speaker body */}
        <path d="M11 5L6 9H2v6h4l5 4V5z" />

        {/* Wave 1 */}
        <motion.path
          d="M15.54 8.46a5 5 0 0 1 0 7.07"
          animate={{ opacity: isMuted ? 0 : 1, scale: isMuted ? 0.5 : 1 }}
          style={{ originX: '50%', originY: '50%' }}
          transition={{ duration: 0.2 }}
        />
        {/* Wave 2 */}
        <motion.path
          d="M19.07 4.93a10 10 0 0 1 0 14.14"
          animate={{ opacity: isMuted ? 0 : 1, scale: isMuted ? 0.5 : 1 }}
          style={{ originX: '50%', originY: '50%' }}
          transition={{ duration: 0.2, delay: 0.05 }}
        />
        {/* Mute slash */}
        <motion.line
          x1="2" y1="2" x2="22" y2="22"
          animate={{ pathLength: isMuted ? 1 : 0, opacity: isMuted ? 1 : 0 }}
          initial={false}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        />
      </motion.svg>
    </div>
  );
};

// ─── Demo wrapper (default export) ────────────────────────────────────────────
export default function AnimatedIconsDemo() {
  return (
    <div className="flex items-center justify-center gap-4 p-8 bg-surface-container rounded-3xl">
      {[ArrowIcon, MenuIcon, VolumeIcon].map((Icon, i) => (
        <div
          key={i}
          className="flex items-center justify-center w-20 h-20 bg-surface border border-surface-container-high rounded-2xl text-on-surface shadow-xs hover:border-primary/40 transition-colors"
        >
          <Icon />
        </div>
      ))}
    </div>
  );
}

