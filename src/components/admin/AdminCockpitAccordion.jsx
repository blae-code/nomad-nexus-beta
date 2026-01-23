import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, AlertTriangle, CheckCircle2, Activity,
  MessageSquare, Database, Shield, Server, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminCockpitAccordion({ 
  sections, 
  expandedSection, 
  onExpand, 
  readinessScore,
  auditLogs,
  user 
}) {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-1 min-h-0">
      <h2 className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider px-2 pt-2 shrink-0">
        CONTROL SECTIONS
      </h2>

      {sections.map((section) => {
        const isExpanded = expandedSection === section.id;
        const isVisible = section.visible !== false && (!section.minRank || hasRank(user, section.minRank));
        
        if (!isVisible) return null;

        const lastRun = auditLogs.find(
          log => log.step_name === section.id && log.status === 'success'
        );

        return (
          <motion.div
            key={section.id}
            className={cn(
              'border transition-colors',
              isExpanded ? 'border-[#ea580c]/50 bg-zinc-950/80' : 'border-zinc-800 bg-zinc-950/40 hover:bg-zinc-950/60'
            )}
          >
            {/* Accordion Header */}
            <button
              onClick={() => onExpand(isExpanded ? null : section.id)}
              className={cn(
                'w-full p-2.5 flex items-center justify-between text-left transition-colors',
                isExpanded && 'bg-zinc-900/60 border-b border-zinc-800'
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <section.icon className={cn(
                  'w-3 h-3 shrink-0',
                  isExpanded ? 'text-[#ea580c]' : 'text-zinc-500'
                )} />
                <span className="text-[10px] font-bold text-zinc-300 uppercase truncate">
                  {section.label}
                </span>
                {section.badge && (
                  <span className={cn(
                    'text-[7px] px-1.5 py-0.5 font-mono font-bold shrink-0',
                    section.badge === 'pass'
                      ? 'bg-green-950/40 text-green-400 border border-green-800/50'
                      : section.badge === 'warn'
                      ? 'bg-yellow-950/40 text-yellow-400 border border-yellow-800/50'
                      : 'bg-red-950/40 text-red-400 border border-red-800/50'
                  )}>
                    {section.badge.toUpperCase()}
                  </span>
                )}
              </div>
              <ChevronDown className={cn(
                'w-3 h-3 text-zinc-600 transition-transform shrink-0',
                isExpanded && 'rotate-180 text-[#ea580c]'
              )} />
            </button>

            {/* Accordion Content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-zinc-800 overflow-hidden"
                >
                  <div className="p-2.5 space-y-2">
                    <section.component 
                      user={user} 
                      onAudit={section.onAudit}
                      auditLogs={auditLogs}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// Helper to check user rank
function hasRank(user, minRank) {
  if (!user) return false;
  const rankHierarchy = {
    'pioneer': 4,
    'founder': 3,
    'voyager': 2,
    'scout': 1
  };
  const userRank = rankHierarchy[user.rank?.toLowerCase()] || 0;
  const requiredRank = rankHierarchy[minRank?.toLowerCase()] || 0;
  return userRank >= requiredRank;
}