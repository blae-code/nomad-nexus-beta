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
      {/* Main Menu Button - Fixed left edge */}
      <motion.div
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40"
        initial={{ x: -20 }}
        whileHover={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center justify-center w-14 h-14 border-r border-t border-b border-zinc-800/50 text-[10px] font-mono font-bold uppercase transition-all duration-200',
            isOpen
              ? 'bg-[#ea580c]/20 border-[#ea580c]/60 text-[#ea580c]'
              : 'bg-zinc-900/40 text-zinc-500 hover:text-zinc-300'
          )}
          title="User Feedback"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        {/* Radial Menu Items - Vertical Stack */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="absolute left-0 top-full mt-1 space-y-1"
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
                      'flex items-center gap-2 px-3 py-2 border border-r-0 text-[9px] font-mono font-bold uppercase whitespace-nowrap transition-all',
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