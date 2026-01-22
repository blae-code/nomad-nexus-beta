import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRankColorClass } from '@/components/utils/rankUtils';

export default function OperationParticipants({ participants, squads }) {
  if (!participants || participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Users className="w-8 h-8 text-zinc-600" />
        <p className="text-xs text-zinc-400">NO PARTICIPANTS</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[8px] font-bold uppercase text-zinc-300 tracking-widest flex items-center gap-1.5 mb-3">
        <Users className="w-3.5 h-3.5 text-[#ea580c]" />
        OPERATION ROSTER ({participants.length})
      </h3>

      <div className="grid gap-1.5">
        {participants.map((user, idx) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="border border-zinc-700 bg-zinc-900/30 p-2 rounded hover:bg-zinc-900/50 transition-colors group"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-6 h-6 bg-gradient-to-br from-[#ea580c] to-orange-700 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-[8px] font-bold text-white">
                    {user.full_name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{user.full_name}</p>
                  <p className="text-[7px] text-zinc-500 truncate">
                    {user.rsi_handle || 'NO HANDLE'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge className={cn(
                  'text-[7px] px-1.5',
                  getRankColorClass(user.rank, 'bg')
                )}>
                  {user.rank || 'VAGRANT'}
                </Badge>
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-1 text-[7px]">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-zinc-400">ONLINE</span>
              <div className="flex-1" />
              <Radio className="w-2.5 h-2.5 text-zinc-500" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}