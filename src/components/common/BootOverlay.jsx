/**
 * BootOverlay — Mission-control boot ritual
 * Shows on first visit, skippable, replayable via command palette
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'nexus.boot.seen';
const AUTO_DISMISS_MS = 3000;

export function useBootOverlay() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setShouldShow(true);
    }
  }, []);

  const replay = () => {
    setShouldShow(true);
  };

  const dismiss = () => {
    setShouldShow(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return { shouldShow, replay, dismiss };
}

export default function BootOverlay({ isOpen, onDismiss }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const stepTimer = setTimeout(() => setStep(1), 800);
    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, AUTO_DISMISS_MS);

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      clearTimeout(stepTimer);
      clearTimeout(dismissTimer);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onDismiss]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-zinc-950 z-[100] flex items-center justify-center"
          onClick={onDismiss}
        >
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-3"
            >
              <Zap className="w-8 h-8 text-orange-500" />
              <div className="text-3xl font-black tracking-wider text-white">
                NOMAD NEXUS
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-zinc-500 font-mono uppercase tracking-widest"
            >
              Link Established
            </motion.div>

            {step >= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 text-xs text-green-500 font-mono"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>SYSTEMS: NOMINAL</span>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-xs text-zinc-600 font-mono"
            >
              Press ESC or click to skip
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}