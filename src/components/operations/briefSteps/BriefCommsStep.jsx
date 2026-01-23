import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';

export default function BriefCommsStep({ briefData, onChange }) {
  const { data: nets = [] } = useQuery({
    queryKey: ['voice-nets'],
    queryFn: () => base44.entities.VoiceNet.list()
  });

  const primaryNets = nets.filter(n => !n.type || n.type === 'command');

  const handleSelectPrimary = (netId) => {
    onChange({
      comms_plan: {
        ...briefData.comms_plan,
        primary_net: netId
      }
    });
  };

  const handleToggleSecondary = (netId) => {
    const secondaries = briefData.comms_plan.secondary_nets || [];
    const updated = secondaries.includes(netId)
      ? secondaries.filter(id => id !== netId)
      : [...secondaries, netId];
    onChange({
      comms_plan: {
        ...briefData.comms_plan,
        secondary_nets: updated
      }
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-[9px] font-bold uppercase text-zinc-400 mb-2">
          Primary Comms Net (Command Channel)
        </label>
        <div className="space-y-1">
          {primaryNets.map(net => (
            <button
              key={net.id}
              onClick={() => handleSelectPrimary(net.id)}
              className={`w-full flex items-center justify-between gap-2 p-2 border rounded-none transition-all ${
                briefData.comms_plan.primary_net === net.id
                  ? 'bg-emerald-950/30 border-emerald-700 text-emerald-300'
                  : 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <span className="text-[9px] font-mono">{net.code} - {net.label}</span>
              {briefData.comms_plan.primary_net === net.id && (
                <CheckCircle2 className="w-3 h-3" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[9px] font-bold uppercase text-zinc-400 mb-2">
          Secondary Nets (Optional)
        </label>
        <div className="space-y-1">
          {nets
            .filter(n => n.id !== briefData.comms_plan.primary_net)
            .slice(0, 5)
            .map(net => (
              <label
                key={net.id}
                className="flex items-center gap-2 p-2 bg-zinc-900/30 border border-zinc-800 cursor-pointer hover:bg-zinc-900/50"
              >
                <input
                  type="checkbox"
                  checked={(briefData.comms_plan.secondary_nets || []).includes(net.id)}
                  onChange={() => handleToggleSecondary(net.id)}
                  className="w-3 h-3 accent-[#ea580c]"
                />
                <span className="text-[9px] text-zinc-300 font-mono flex-1">
                  {net.code} - {net.label}
                </span>
              </label>
            ))}
        </div>
      </div>

      <p className="text-[8px] text-zinc-500">
        Step 4 of 6: Select primary comms net and backup channels.
      </p>
    </div>
  );
}