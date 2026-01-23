import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function BriefBasicsStep({ briefData, eventData, onChange }) {
  return (
    <div className="space-y-3 p-3">
      <div>
        <label className="block text-[8px] font-bold uppercase text-zinc-400 mb-1">Operation Type</label>
        <div className="flex gap-2">
          {['casual', 'focused'].map(type => (
            <button
              key={type}
              onClick={() => onChange({
                comms_plan: { ...briefData.comms_plan, doctrine: type }
              })}
              className={`px-3 py-1.5 text-[8px] font-bold uppercase border rounded-none ${
                briefData.comms_plan.doctrine === type
                  ? 'bg-[#ea580c]/30 border-[#ea580c] text-[#ea580c]'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {eventData && (
        <div>
          <label className="block text-[8px] font-bold uppercase text-zinc-400 mb-1">Operation Name</label>
          <Input
            value={eventData.title}
            disabled
            className="h-8 bg-zinc-800 border-zinc-700 text-[8px] font-mono"
          />
        </div>
      )}

      <div>
        <label className="block text-[8px] font-bold uppercase text-zinc-400 mb-1">Location</label>
        <Input
          placeholder="Theater of operations..."
          className="h-8 bg-zinc-800 border-zinc-700 text-[8px] font-mono focus:border-[#ea580c]"
        />
      </div>

      <p className="text-[8px] text-zinc-500 mt-4">Operation basics configured. Continue to objectives.</p>
    </div>
  );
}