import React, { useState } from 'react';
import { Book, CheckCircle, Circle, Clock, Users, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

export default function OperationPlaybook() {
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);
  const [expandedSections, setExpandedSections] = useState(new Set(['procedures']));
  const [checkedItems, setCheckedItems] = useState(new Set());

  const { data: playbooks = [] } = useQuery({
    queryKey: ['operation-playbooks'],
    queryFn: async () => await base44.entities.OperationPlaybook.filter({ is_active: true }),
    initialData: []
  });

  const toggleSection = (section) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleChecklistItem = (itemId) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  const priorityColors = {
    CRITICAL: 'text-red-400 border-red-500/30 bg-red-950/20',
    HIGH: 'text-orange-400 border-orange-500/30 bg-orange-950/20',
    STANDARD: 'text-blue-400 border-blue-500/30 bg-blue-950/20',
    LOW: 'text-zinc-400 border-zinc-700 bg-zinc-900/20'
  };

  if (!selectedPlaybook && playbooks.length === 0) {
    return (
      <div className="border border-zinc-800 bg-zinc-950/50 p-4 text-center">
        <Book className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <div className="text-[10px] text-zinc-500">No playbooks available</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-[8px] font-bold uppercase text-zinc-600 tracking-wider">OPERATION PLAYBOOKS</h3>
      
      {!selectedPlaybook ? (
        <div className="space-y-1">
          {playbooks.map(playbook => (
            <motion.button
              key={playbook.id}
              whileHover={{ scale: 1.01 }}
              onClick={() => setSelectedPlaybook(playbook)}
              className={cn(
                'w-full text-left border p-2 transition-all',
                priorityColors[playbook.priority]
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-bold text-white mb-0.5">{playbook.title}</div>
                  <div className="text-[7px] text-zinc-400 line-clamp-1">{playbook.description}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[6px] uppercase text-zinc-500 px-1 py-0.5 bg-zinc-900/50 border border-zinc-800">
                      {playbook.scenario_type}
                    </span>
                    {playbook.minimum_personnel > 1 && (
                      <span className="text-[6px] text-zinc-500 flex items-center gap-0.5">
                        <Users className="w-2 h-2" />
                        {playbook.minimum_personnel}+
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="border border-zinc-800 bg-zinc-950 p-2">
            <button
              onClick={() => {
                setSelectedPlaybook(null);
                setCheckedItems(new Set());
              }}
              className="text-[7px] text-zinc-500 hover:text-zinc-300 mb-2"
            >
              ← BACK TO PLAYBOOKS
            </button>
            <div className="text-sm font-bold text-white mb-1">{selectedPlaybook.title}</div>
            <div className="text-[8px] text-zinc-400 mb-2">{selectedPlaybook.description}</div>
            <div className="flex items-center gap-2">
              <span className={cn('text-[6px] uppercase px-1 py-0.5 border', priorityColors[selectedPlaybook.priority])}>
                {selectedPlaybook.priority}
              </span>
              <span className="text-[6px] uppercase text-zinc-500 px-1 py-0.5 bg-zinc-900/50 border border-zinc-800">
                {selectedPlaybook.scenario_type}
              </span>
            </div>
          </div>

          {/* Procedures Section */}
          {selectedPlaybook.procedures && selectedPlaybook.procedures.length > 0 && (
            <div className="border border-zinc-800 bg-zinc-950/50">
              <button
                onClick={() => toggleSection('procedures')}
                className="w-full flex items-center justify-between p-2 hover:bg-zinc-900/30"
              >
                <span className="text-[8px] font-bold uppercase text-zinc-400">PROCEDURES</span>
                {expandedSections.has('procedures') ? 
                  <ChevronDown className="w-3 h-3 text-zinc-500" /> : 
                  <ChevronRight className="w-3 h-3 text-zinc-500" />
                }
              </button>
              <AnimatePresence>
                {expandedSections.has('procedures') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2 space-y-1 border-t border-zinc-800">
                      {selectedPlaybook.procedures.map((proc, idx) => (
                        <div key={idx} className="p-1.5 bg-zinc-900/50 border border-zinc-800">
                          <div className="flex items-start gap-2">
                            <span className="text-[8px] font-bold text-[#ea580c] shrink-0">
                              {proc.step_number}.
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[8px] font-bold text-white mb-0.5">{proc.title}</div>
                              <div className="text-[7px] text-zinc-400">{proc.description}</div>
                              {proc.estimated_time && (
                                <div className="text-[6px] text-zinc-500 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-2 h-2" />
                                  {proc.estimated_time}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Checklist Section */}
          {selectedPlaybook.checklist && selectedPlaybook.checklist.length > 0 && (
            <div className="border border-zinc-800 bg-zinc-950/50">
              <button
                onClick={() => toggleSection('checklist')}
                className="w-full flex items-center justify-between p-2 hover:bg-zinc-900/30"
              >
                <span className="text-[8px] font-bold uppercase text-zinc-400">CHECKLIST</span>
                {expandedSections.has('checklist') ? 
                  <ChevronDown className="w-3 h-3 text-zinc-500" /> : 
                  <ChevronRight className="w-3 h-3 text-zinc-500" />
                }
              </button>
              <AnimatePresence>
                {expandedSections.has('checklist') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-2 space-y-1 border-t border-zinc-800 max-h-48 overflow-y-auto">
                      {selectedPlaybook.checklist.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => toggleChecklistItem(item.id)}
                          className="w-full flex items-center gap-2 p-1 hover:bg-zinc-900/50 transition-colors text-left"
                        >
                          {checkedItems.has(item.id) ? (
                            <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-3 h-3 text-zinc-600 shrink-0" />
                          )}
                          <span className={cn(
                            'text-[8px] flex-1',
                            checkedItems.has(item.id) ? 'text-zinc-500 line-through' : 'text-zinc-200',
                            item.critical && 'font-bold text-red-400'
                          )}>
                            {item.item}
                          </span>
                          {item.critical && (
                            <Shield className="w-2.5 h-2.5 text-red-400 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Progress */}
          {selectedPlaybook.checklist && selectedPlaybook.checklist.length > 0 && (
            <div className="border border-zinc-800 bg-zinc-950/50 p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7px] text-zinc-500 uppercase">Progress</span>
                <span className="text-[7px] font-mono text-zinc-300">
                  {checkedItems.size} / {selectedPlaybook.checklist.length}
                </span>
              </div>
              <div className="h-1.5 bg-zinc-900 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(checkedItems.size / selectedPlaybook.checklist.length) * 100}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}