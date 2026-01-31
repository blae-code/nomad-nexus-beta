import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NexusLoadingOverlay({ isLoading = false, message = 'Initializing systems...' }) {
  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <motion.div
          key="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-[9999]"
        >
          {/* Background grid effect */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(239,68,68,0.03)_1px,transparent_1px),linear-gradient(rgba(239,68,68,0.03)_1px,transparent_1px)] bg-[length:40px_40px] opacity-20" />

          {/* Content container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative flex flex-col items-center gap-6 z-10"
          >
            {/* Logo/Icon */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              className="relative"
            >
              <div className="w-16 h-16 border-2 border-orange-500/20 rounded-lg" />
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 border-2 border-orange-500/40 rounded-lg"
              />
              <div className="absolute inset-2 flex items-center justify-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
              </div>
            </motion.div>

            {/* Text Content */}
            <div className="text-center space-y-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                Nexus <span className="text-orange-500">Initializing</span>
              </h3>
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-xs text-zinc-400 uppercase tracking-widest"
              >
                {message}
              </motion.p>
            </div>

            {/* Progress line */}
            <div className="w-40 h-0.5 bg-zinc-800/40 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="h-full w-1/3 bg-gradient-to-r from-transparent via-orange-500 to-transparent"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}