/**
 * RouteTransition — Wraps Layout/main content for smooth route changes
 * Provides horizontal scan effect between pages
 */

import React from 'react';
import { motion } from 'framer-motion';

export default function RouteTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="w-full h-full"
    >
      {/* Subtle scan line accent */}
      <motion.div
        animate={{ y: ['-100%', '100%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent pointer-events-none z-50"
      />
      {children}
    </motion.div>
  );
}