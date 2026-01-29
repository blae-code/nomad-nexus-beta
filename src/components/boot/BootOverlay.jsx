/**
 * BootOverlay — Mission-control boot sequence
 * Shows on first visit, skippable, replayable via command palette
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, CheckCircle2, Zap } from 'lucide-react';

const STORAGE_KEY = 'nexus.boot.seen';
const AUTO_DISMISS_MS = 3000;

export function BootOverlay({ forceShow = false, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      return;
    }

    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setVisible(true);
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  }, [forceShow]);

  useEffect(() => {
    if (!visible) return;

    // Auto-dismiss
    const timer = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_MS);

    // Escape key
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleEsc);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [visible]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-center space-y-6"
          >
            {/* Icon */}
            <motion.div
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex justify-center"
            >
              <div className="h-16 w-16 rounded-full bg-orange-500/20 flex items-center justify-center border-2 border-orange-500/50">
                <Power className="w-8 h-8 text-orange-500" />
              </div>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="space-y-2"
            >
              <h1 className="text-2xl font-black uppercase tracking-widest text-white">
                NOMAD NEXUS
              </h1>
              <p className="text-sm text-zinc-500 font-mono tracking-wider">
                LINK ESTABLISHED
              </p>
            </motion.div>

            {/* Status checks */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              className="flex items-center justify-center gap-4 text-xs text-zinc-400 font-mono"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>COMMS</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>VOICE</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>OPS</span>
              </div>
            </motion.div>

            {/* Dismiss hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.3 }}
              className="text-xs text-zinc-600 font-mono"
            >
              ESC TO SKIP
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for replaying boot sequence
export function useBootOverlay() {
  const [showBoot, setShowBoot] = useState(false);

  const replay = () => {
    setShowBoot(true);
  };

  const dismiss = () => {
    setShowBoot(false);
  };

  return {
    showBoot,
    replay,
    dismiss,
  };
}