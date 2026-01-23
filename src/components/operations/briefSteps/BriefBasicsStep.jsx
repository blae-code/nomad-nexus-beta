import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function BriefBasicsStep({ briefData, eventData, onChange }) {
  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-[9px] font-bold uppercase text-zinc-400 mb-2">
          Operation Type
        </label>
        <div className="flex gap-2">
          {['casual', 'focused'].map(type => (
            <button
              key={type}
              onClick={() =>
                onChange({
                  comms_plan: { ...briefData.comms_plan, doctrine: type }
                })
              }
              className={cn(
                'flex-1 py-2 px-3 text-[9px] font-bold uppercase border rounded-none transition-all',
                briefData.comms_plan.doctrine === type
                  ? type === 'casual'
                    ? 'bg-blue-950/40 border-blue-700 text-blue-300'
                    : 'bg-red-950/40 border-red-700 text-red-300'
                  : 'bg-zinc-900/30 border-zinc-800 text-zinc-500'
              )}
            >
              {type}
            </button>
          ))}
        </div>
        <p className="text-[8px] text-zinc-500 mt-2">
          Casual = relaxed comms discipline. Focused = tight ROE, command authority strict.
        </p>
      </div>

      {/* Event summary */}
      {eventData && (
        <div className="border border-zinc-800 bg-zinc-900/30 p-3 space-y-1">
          <p className="text-[9px] font-mono font-bold text-zinc-300">{eventData.title}</p>
          <p className="text-[8px] text-zinc-500">{eventData.description}</p>
          {eventData.start_time && (
            <p className="text-[8px] text-zinc-600">
              {new Date(eventData.start_time).toLocaleString()}
            </p>
          )}
        </div>
      )}

      <p className="text-[8px] text-zinc-500">
        Step 1 of 6: Confirm operation type, then proceed to define objectives.
      </p>
    </div>
  );
}