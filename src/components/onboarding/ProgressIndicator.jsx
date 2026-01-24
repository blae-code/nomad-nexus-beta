import React from 'react';
import { motion } from 'framer-motion';

export default function ProgressIndicator({ current, total }) {
  const percentage = (current / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Progress
        </span>
        <span className="text-xs font-bold text-zinc-300">
          {current} / {total}
        </span>
      </div>
      <div className="w-48 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
        <motion.div
          className="h-full bg-gradient-to-r from-accent via-green-500 to-accent rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}