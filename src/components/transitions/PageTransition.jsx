/**
 * PageTransition — Wraps page content with smooth entry/exit animations
 * Provides fade + scale effect for immersive page loads
 */

import React from 'react';
import { motion } from 'framer-motion';

export default function PageTransition({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}