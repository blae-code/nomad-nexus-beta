import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { ChevronDown, Crown, Shield, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CommandNodeRoster: Mini-roster expansion inside Command node
 * Lists command staff with their op roles and indicates dual-hatted status
 */
export default function CommandNodeRoster({ eventId, isExpanded, onToggleExpand }) {
  const [commandStaff, setCommandStaff] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId || !isExpanded) return;

    const fetchCommandStaff = async () => {
      setLoading(true);
      try {
        const participants = await base44.entities.OpParticipant.filter({
          event_id: eventId,
          is_command_staff: true
        });

        // Enrich with user names and squad info for dual-hatted indicators
        const enriched = await Promise.all(
          participants.map(async (p) => {
            const user = await base44.entities.User.filter({ id: p.user_id });
            const memberships = await base44.entities.SquadMembership.filter({
              user_id: p.user_id
            });
            return {
              ...p,
              userName: user?.[0]?.full_name || `User ${p.user_id.substring(0, 4)}`,
              squadLeadOf: memberships?.[0]?.squad_id,
              isDualHatted: !!memberships?.length
            };
          })
        );

        setCommandStaff(enriched);
      } catch (err) {
        console.error('[COMMAND ROSTER] Error fetching staff:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommandStaff();
  }, [eventId, isExpanded]);

  const opRoleIcons = {
    COMMAND: Crown,
    WING_LEAD: Shield,
    COMMS: Radio
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t border-zinc-800 bg-zinc-950/50"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-2 cursor-pointer hover:bg-zinc-900/50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          <Crown className="w-3 h-3 text-[#ea580c]" />
          <span className="text-[9px] font-bold uppercase text-zinc-400">Command Staff</span>
          {commandStaff.length > 0 && (
            <span className="text-[8px] text-zinc-600">({commandStaff.length})</span>
          )}
        </div>
        <ChevronDown className="w-3 h-3 text-zinc-600" />
      </div>

      {/* Roster */}
      {loading ? (
        <div className="p-2 text-[8px] text-zinc-600 animate-pulse text-center">Loading...</div>
      ) : commandStaff.length === 0 ? (
        <div className="p-2 text-[8px] text-zinc-600 text-center">No command staff</div>
      ) : (
        <div className="p-2 space-y-1">
          {commandStaff.map((staff) => {
            const Icon = opRoleIcons[staff.op_role] || Crown;

            return (
              <motion.div
                key={staff.user_id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-center gap-2 px-2 py-1 rounded text-[8px] bg-zinc-900/50',
                  'border-l-2 border-[#ea580c]/30'
                )}
              >
                {/* Op role icon */}
                <Icon className="w-3 h-3 text-[#ea580c] shrink-0" />

                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <div className="text-zinc-300 truncate">{staff.userName}</div>
                  <div className="text-zinc-600 text-[7px] uppercase">{staff.op_role}</div>
                </div>

                {/* Dual-hatted badge */}
                {staff.isDualHatted && (
                  <div
                    className="px-1 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-[7px] uppercase font-bold text-purple-400 whitespace-nowrap"
                    title="Also leads a squad"
                  >
                    SL
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}