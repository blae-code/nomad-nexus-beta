import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function BriefCommsStep({ briefData, onChange }) {
  const [primary, setPrimary] = useState(briefData.comms_plan?.primary_net || '');
  const [secondary, setSecondary] = useState(briefData.comms_plan?.secondary_nets || []);

  const { data: nets = [] } = useQuery({
    queryKey: ['brief-voice-nets'],
    queryFn: () => base44.entities.VoiceNet.list('-priority', 20)
  });

  const handlePrimaryChange = (netId) => {
    setPrimary(netId);
    onChange({
      comms_plan: {
        ...briefData.comms_plan,
        primary_net: netId
      }
    });
  };

  return (
    <div className="space-y-3 p-3">
      <div>
        <label className="block text-[8px] font-bold uppercase text-zinc-400 mb-1">Primary Net</label>
        <select
          value={primary}
          onChange={(e) => handlePrimaryChange(e.target.value)}
          className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 text-[8px] font-mono focus:outline-none focus:border-[#ea580c] rounded-none"
        >
          <option value="">Select primary comms net...</option>
          {nets.map(net => (
            <option key={net.id} value={net.id}>{net.code} - {net.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[8px] font-bold uppercase text-zinc-400 mb-1">Secondary Nets</label>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {nets.slice(0, 5).map(net => (
            <label key={net.id} className="flex items-center gap-2 p-1.5 bg-zinc-900/30 cursor-pointer hover:bg-zinc-900/50">
              <input
                type="checkbox"
                checked={secondary.includes(net.id)}
                onChange={(e) => {
                  const updated = e.target.checked
                    ? [...secondary, net.id]
                    : secondary.filter(id => id !== net.id);
                  setSecondary(updated);
                  onChange({
                    comms_plan: {
                      ...briefData.comms_plan,
                      secondary_nets: updated
                    }
                  });
                }}
                className="w-3 h-3 accent-[#ea580c]"
              />
              <span className="text-[8px] text-zinc-400 font-mono">{net.code}</span>
            </label>
          ))}
        </div>
      </div>

      <p className="text-[8px] text-zinc-500">Primary net: <span className="text-[#ea580c]">{nets.find(n => n.id === primary)?.code || 'None'}</span></p>
    </div>
  );
}