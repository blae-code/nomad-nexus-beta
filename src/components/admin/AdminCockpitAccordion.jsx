import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
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
        const lastRun = auditLogs.find(
          log => log.step_name === section.id && log.status === 'success'
        );
        const shouldBeCollapsed = section.collapsed;

        return (
          <motion.div
            key={section.id}
            className={cn(
              'border transition-colors',
              isExpanded ? 'border-[#ea580c]/50 bg-zinc-950/80' : 'border-zinc-800 bg-zinc-950/40 hover:bg-zinc-950/60',
              shouldBeCollapsed && !isExpanded && 'opacity-75'
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
                {lastRun && (
                  <span className="text-[7px] px-1 py-0.5 bg-green-950/40 text-green-400 border border-green-800/50 font-mono font-bold shrink-0">
                    OK
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
              {isExpanded && section.component && (
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