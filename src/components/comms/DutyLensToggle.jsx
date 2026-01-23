import React from 'react';
import { Button } from '@/components/ui/button';
import { Radio, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDutyLens } from '@/components/hooks/useDutyLens';

/**
 * DutyLensToggle: Toggle between AUTO/COMMAND/SQUAD lenses
 * Changes which actions are emphasized but NOT permissions
 */
export default function DutyLensToggle({ connectedNetId, userSquadId }) {
  const { lens, setLens, effectiveLens } = useDutyLens(connectedNetId, userSquadId);

  return (
    <div className="flex items-center gap-1 border border-zinc-800 bg-zinc-900/50 rounded px-2 py-1">
      <span className="text-[9px] text-zinc-600 font-mono uppercase mr-2">Lens:</span>

      {['AUTO', 'COMMAND', 'SQUAD'].map(option => (
        <Button
          key={option}
          size="sm"
          variant={lens === option ? 'default' : 'ghost'}
          onClick={() => setLens(option)}
          className={cn(
            'h-6 px-2 text-[10px] font-mono uppercase',
            lens === option
              ? 'bg-[#ea580c] text-white'
              : 'bg-transparent text-zinc-500 hover:text-zinc-300'
          )}
          title={
            option === 'AUTO'
              ? 'Auto-detect based on connected net'
              : option === 'COMMAND'
              ? 'Emphasize command actions'
              : 'Emphasize squad actions'
          }
        >
          {option === 'AUTO' && '∞'}
          {option === 'COMMAND' && 'CMD'}
          {option === 'SQUAD' && 'SQD'}
        </Button>
      ))}

      {/* Show effective lens */}
      <span className="text-[8px] text-zinc-600 ml-2 italic">
        ({effectiveLens === 'AUTO' ? 'auto' : effectiveLens.toLowerCase()})
      </span>
    </div>
  );
}