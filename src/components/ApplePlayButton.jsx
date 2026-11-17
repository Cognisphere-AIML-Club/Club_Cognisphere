/**
 * Skiper3 — Apple Play Button
 * Source: skiper-ui.com/docs/components/skiper3
 * Glassmorphic circular play button that spring-expands into a full player widget.
 * Props:
 *   trackName  – string label shown in the expanded player
 *   className  – extra classes on root wrapper
 *   onPlay     – optional callback when play state changes (bool)
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, X } from 'lucide-react';

export function ApplePlayButton({ trackName = 'Now Playing', className = '', onPlay }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const setPlay = (val) => {
    setIsPlaying(val);
    onPlay?.(val);
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <AnimatePresence mode="wait">
        {!isOpen ? (
          /* ── Closed: circular glass button ── */
          <motion.button
            key="play-btn"
            onClick={() => { setIsOpen(true); setPlay(true); }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            aria-label="Play"
            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] text-white hover:bg-white/20 transition-colors"
          >
            {/* inner glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/5 to-white/20 opacity-50 pointer-events-none" />
            <Play className="h-6 w-6 translate-x-0.5 fill-current drop-shadow-md" />
          </motion.button>
        ) : (
          /* ── Open: expanded glassmorphic player ── */
          <motion.div
            key="player"
            initial={{ width: 64, height: 64, borderRadius: 32, opacity: 0 }}
            animate={{ width: 320, height: 68, borderRadius: 36, opacity: 1 }}
            exit={{ width: 64, height: 64, borderRadius: 32, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative flex items-center justify-between px-4 overflow-hidden bg-neutral-900/40 backdrop-blur-2xl border border-white/15 shadow-[0_16px_40px_0_rgba(0,0,0,0.45)]"
          >
            {/* shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/5 pointer-events-none" />

            {/* Play / Pause */}
            <motion.button
              onClick={() => setPlay(!isPlaying)}
              whileTap={{ scale: 0.88 }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur-md border border-white/10 shrink-0"
            >
              {isPlaying
                ? <Pause className="h-4 w-4 fill-current" />
                : <Play  className="h-4 w-4 translate-x-0.5 fill-current" />}
            </motion.button>

            {/* Track name + animated bars */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="relative z-10 flex flex-col flex-1 mx-3 overflow-hidden"
            >
              <span className="text-xs font-medium text-white tracking-wide truncate">{trackName}</span>
              <div className="flex items-end gap-0.5 mt-1 h-4">
                {[40, 70, 30, 90, 50, 80, 60, 20, 75, 45].map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-white/70 rounded-full"
                    animate={
                      isPlaying
                        ? { height: [`${h}%`, `${Math.min(100, Math.max(15, h + 20))}%`, `${h}%`] }
                        : { height: '20%' }
                    }
                    transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.08 }}
                    style={{ height: '20%' }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Volume + Close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="relative z-10 flex items-center gap-1 shrink-0"
            >
              <button
                onClick={() => setPlay(!isPlaying)}
                aria-label="Volume"
                className="p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <Volume2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setIsOpen(false); setPlay(false); }}
                aria-label="Close"
                className="p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ApplePlayButton;

