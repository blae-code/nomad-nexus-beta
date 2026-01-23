import React from 'react';
import { cn } from '@/lib/utils';

/**
 * DualHattedBadge: Shows multiple roles for dual-hatted users
 * Used in squad rosters to indicate secondary command role
 */
export default function DualHattedBadge({ opRole, squadRole, compact = false }) {
  if (!opRole && !squadRole) return null;

  const badges = [];

  if (opRole && ['COMMAND', 'WING_LEAD', 'COMMS'].includes(opRole)) {
    badges.push({
      label: opRole === 'COMMAND' ? 'CMD' : opRole === 'WING_LEAD' ? 'WNG' : 'COM',
      bg: 'bg-[#ea580c]/20',
      border: 'border-[#ea580c]/50',
      text: 'text-[#ea580c]'
    });
  }

  if (squadRole === 'LEADER') {
    badges.push({
      label: 'SL',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/50',
      text: 'text-blue-400'
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-1', compact ? '' : 'flex-wrap')}>
      {badges.map((badge, idx) => (
        <span
          key={idx}
          className={cn(
            'px-1.5 py-0.5 rounded text-[7px] font-bold uppercase border',
            badge.bg,
            badge.border,
            badge.text
          )}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}