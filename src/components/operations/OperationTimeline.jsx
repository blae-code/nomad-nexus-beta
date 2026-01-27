import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Clock, Radio, AlertCircle, Activity, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OperationTimeline({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Clock className="w-8 h-8 text-zinc-600" />
        <p className="text-xs text-zinc-400">NO ACTIVITY LOGGED</p>
      </div>
    );
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'STATUS':
        return <Activity className="w-3 h-3" />;
      case 'COMMS':
        return <Radio className="w-3 h-3" />;
      case 'RESCUE':
        return <AlertCircle className="w-3 h-3" />;
      case 'NOTE':
        return <Target className="w-3 h-3" />;
      default:
        return <Activity className="w-3 h-3" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'STATUS':
        return 'bg-blue-900/30 text-blue-300 border-blue-900';
      case 'COMMS':
        return 'bg-purple-900/30 text-purple-300 border-purple-900';
      case 'RESCUE':
        return 'bg-red-900/30 text-red-300 border-red-900';
      case 'NOTE':
        return 'bg-zinc-800/50 text-zinc-300 border-zinc-700';
      default:
        return 'bg-zinc-800/50 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-[8px] font-bold uppercase text-zinc-300 tracking-widest flex items-center gap-1.5 mb-3">
        <Clock className="w-3.5 h-3.5 text-[#ea580c]" />
        OPERATION TIMELINE
      </h3>

      <div className="space-y-1.5">
        {logs.slice(0, 20).map((log, idx) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={cn(
              'border rounded p-1.5 transition-all',
              getTypeColor(log.type)
            )}
          >
            <div className="flex items-start gap-2 justify-between">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <div className="mt-0.5 flex-shrink-0">
                  {getTypeIcon(log.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-bold text-white truncate">
                    {log.summary}
                  </p>
                  <div className="flex items-center gap-1 text-[7px] text-zinc-400 mt-0.5">
                    <span>
                      {new Date(log.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                    {log.severity !== 'LOW' && (
                      <Badge className={cn(
                        'text-[6px] px-1 py-0',
                        log.severity === 'HIGH' ? 'bg-red-900/50 text-red-300' : 'bg-yellow-900/50 text-yellow-300'
                      )}>
                        {log.severity}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}