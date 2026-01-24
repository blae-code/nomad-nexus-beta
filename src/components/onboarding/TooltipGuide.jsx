import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';

export default function TooltipGuide({ title, description, icon }) {
  const [showTip, setShowTip] = useState(true);

  return (
    <AnimatePresence>
      {showTip && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {icon && (
                <div className="text-blue-400 mt-1">
                  {icon}
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-sm font-bold text-blue-300">{title}</h3>
                <p className="text-xs text-blue-200/80 mt-1 leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowTip(false)}
              className="text-blue-400 hover:text-blue-300 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}