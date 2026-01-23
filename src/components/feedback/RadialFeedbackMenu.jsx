import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Bug, Lightbulb, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import FeedbackSubmitForm from './FeedbackSubmitForm';

/**
 * Radial Feedback Menu: Fixed left edge, vertical alignment
 * Allows users to quickly report bugs or request features
 */
export default function RadialFeedbackMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const menuItems = [
    {
      id: 'bug',
      label: 'Report Bug',
      icon: Bug,
      color: 'bg-red-950/30 border-red-700/50 text-red-400 hover:bg-red-900/40',
      type: 'bug_report'
    },
    {
      id: 'feature',
      label: 'Request Feature',
      icon: Lightbulb,
      color: 'bg-blue-950/30 border-blue-700/50 text-blue-400 hover:bg-blue-900/40',
      type: 'feature_request'
    }
  ];

  const handleSelect = (item) => {
    setFeedbackType(item.type);
    setShowForm(true);
    setIsOpen(false);
  };

  return (
    <>
      {/* Main Menu Button - Fixed right edge, halfway to top */}
      <motion.div
        className="fixed right-0 top-1/4 -translate-y-1/2 z-40"
        initial={{ x: 20 }}
        whileHover={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {/* Pulsing glow aura */}
        <motion.div
          className="absolute inset-0 rounded-none border-l border-t border-b border-[#ea580c]/30 -right-1"
          animate={{ 
            boxShadow: [
              '0 0 20px rgba(234, 88, 12, 0.2)',
              '0 0 40px rgba(234, 88, 12, 0.4)',
              '0 0 20px rgba(234, 88, 12, 0.2)'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'relative flex items-center justify-center w-14 h-14 border-l border-t border-b text-[10px] font-mono font-bold uppercase transition-all duration-200 group',
            isOpen
              ? 'bg-[#ea580c]/50 border-[#ea580c] text-white shadow-lg shadow-[#ea580c]/40'
              : 'bg-zinc-900/90 border-zinc-700 text-[#ea580c] hover:bg-zinc-800/90 hover:border-[#ea580c]/60'
          )}
          title="User Feedback"
        >
          {/* Animated icon with pulsing effect */}
          <motion.div
            animate={{ scale: isOpen ? 1.2 : 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {/* Speech bubble with feedback symbol */}
              <path d="M12 2C6.48 2 2 5.58 2 10c0 2.54 1.19 4.86 3.16 6.35.09 2.5-1.16 5.65-1.16 5.65 0 0 3.5-.5 5.76-1.65 1.5.32 3.13.5 4.84.5 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
              {/* Center dot accent */}
              <circle cx="12" cy="10" r="0.5" fill="currentColor" />
            </svg>
          </motion.div>
          
          {/* Pulsing indicator dot */}
          {!isOpen && (
            <motion.div
              className="absolute w-2 h-2 bg-[#ea580c] rounded-full top-1 right-1"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </button>

        {/* Radial Menu Items - Vertical Stack */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="absolute right-0 top-full mt-1 space-y-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {menuItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 border border-l-0 text-[9px] font-mono font-bold uppercase whitespace-nowrap transition-all bg-opacity-60 border-opacity-70',
                      item.color
                    )}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: idx * 0.08 }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Feedback Form Modal */}
      <FeedbackSubmitForm
        open={showForm}
        onOpenChange={setShowForm}
        feedbackType={feedbackType}
        onSuccess={() => setShowForm(false)}
      />
    </>
  );
}