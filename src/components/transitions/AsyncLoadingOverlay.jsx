/**
 * AsyncLoadingOverlay — Minimal loading indicator for async operations
 * Shows when function calls are in progress with a pulsing accent
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function AsyncLoadingOverlay({ isLoading, message = 'Processing...' }) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[800] bg-black/40 backdrop-blur-sm flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-zinc-900/95 border-2 border-orange-500/40 rounded-lg px-6 py-4 flex items-center gap-3 shadow-2xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Zap className="w-5 h-5 text-orange-500" />
            </motion.div>
            <span className="text-sm font-mono text-orange-400 whitespace-nowrap">
              {message}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}