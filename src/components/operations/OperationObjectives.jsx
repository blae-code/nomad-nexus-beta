import { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, CheckCircle, Circle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OperationObjectives({ event }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const objectives = event.objectives || [];

  if (objectives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Target className="w-8 h-8 text-zinc-600" />
        <p className="text-xs text-zinc-400">NO OBJECTIVES DEFINED</p>
        <Button size="sm" variant="outline" className="text-[7px] h-6">
          ADD OBJECTIVE
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-[8px] font-bold uppercase text-zinc-300 tracking-widest flex items-center gap-1.5 mb-3">
        <Target className="w-3.5 h-3.5 text-[#ea580c]" />
        TACTICAL OBJECTIVES
      </h3>

      <div className="space-y-1.5">
        {objectives.map((obj, idx) => (
          <motion.button
            key={obj.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            className={cn(
              'w-full text-left p-2 rounded border transition-all group',
              obj.is_completed
                ? 'border-emerald-900/30 bg-emerald-950/10 hover:bg-emerald-950/20'
                : 'border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/50'
            )}
          >
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {obj.is_completed ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-xs font-bold',
                    obj.is_completed ? 'text-emerald-300 line-through' : 'text-white'
                  )}>
                    {obj.text}
                  </p>
                </div>
              </div>
              <ChevronDown className={cn(
                'w-3 h-3 text-zinc-500 flex-shrink-0 transition-transform',
                expandedIdx === idx && 'rotate-180'
              )} />
            </div>

            {/* Expanded details */}
            {expandedIdx === idx && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 pt-2 border-t border-zinc-700/30 space-y-1.5"
              >
                {obj.assignments && obj.assignments.length > 0 && (
                  <div>
                    <p className="text-[7px] text-zinc-400 font-mono mb-1">ASSIGNED TO</p>
                    <div className="flex flex-wrap gap-1">
                      {obj.assignments.map((a, i) => (
                        <Badge key={i} className="text-[7px] bg-blue-900/50 text-blue-300">
                          {a.type === 'USER' ? 'USER' : 'ASSET'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {obj.sub_tasks && obj.sub_tasks.length > 0 && (
                  <div>
                    <p className="text-[7px] text-zinc-400 font-mono mb-1">SUB-TASKS</p>
                    <div className="space-y-1">
                      {obj.sub_tasks.map((st) => (
                        <div key={st.id} className="flex items-start gap-2 p-1 bg-zinc-800/30 rounded text-[7px]">
                          {st.is_completed ? (
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-2.5 h-2.5 text-zinc-500 flex-shrink-0 mt-0.5" />
                          )}
                          <span className={st.is_completed ? 'line-through text-zinc-500' : 'text-zinc-300'}>
                            {st.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button size="sm" className="w-full text-[7px] h-5 mt-1" variant="outline">
                  {obj.is_completed ? 'REOPEN' : 'MARK COMPLETE'}
                </Button>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}