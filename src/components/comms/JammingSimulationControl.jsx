import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function JammingSimulationControl({ netStatus, onClose }) {
  const [duration, setDuration] = useState('30');
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const jamMutation = useMutation({
    mutationFn: async (durationSeconds) => {
      const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
      if (netStatus?.id) {
        return base44.entities.VoiceNetStatus.update(netStatus.id, {
          is_jammed: true,
          jamming_initiated_by: currentUser.id,
          jamming_expires_at: expiresAt,
          signal_strength: 15,
          connectivity_quality: 'critical',
          packet_loss_percent: 85
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['net-status'] });
    }
  });

  const clearJamMutation = useMutation({
    mutationFn: async () => {
      if (netStatus?.id) {
        return base44.entities.VoiceNetStatus.update(netStatus.id, {
          is_jammed: false,
          jamming_initiated_by: null,
          jamming_expires_at: null,
          signal_strength: 100,
          connectivity_quality: 'excellent',
          packet_loss_percent: 0
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['net-status'] });
    }
  });

  if (!netStatus) return null;

  return (
    <div className="p-3 bg-red-900/20 border border-red-700/50 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-red-400" />
          <span className="text-[10px] font-bold text-red-400 uppercase">JAMMING SIMULATION</span>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400">
          <X className="w-3 h-3" />
        </button>
      </div>

      {netStatus.is_jammed ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-red-950/50 border-l-2 border-red-500">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-[9px] text-red-300">JAMMING ACTIVE - Net Disrupted</span>
          </div>
          <Button
            onClick={() => clearJamMutation.mutate()}
            className="w-full h-7 text-[9px] bg-emerald-900 hover:bg-emerald-800 text-emerald-300"
          >
            CLEAR JAMMING
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-[9px] text-zinc-400 space-y-1">
            <p>Simulate network disruption for training.</p>
            <div className="flex items-center gap-2">
              <label className="text-zinc-500">Duration:</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-[9px] px-1.5 py-0.5 text-white"
              >
                <option value="10">10 sec</option>
                <option value="30">30 sec</option>
                <option value="60">1 min</option>
                <option value="180">3 min</option>
                <option value="300">5 min</option>
              </select>
            </div>
          </div>
          <Button
            onClick={() => jamMutation.mutate(parseInt(duration))}
            className="w-full h-7 text-[9px] bg-red-900 hover:bg-red-800 text-red-300"
          >
            INITIATE JAMMING
          </Button>
        </div>
      )}

      <div className="text-[8px] text-zinc-500 pt-1 border-t border-zinc-800">
        ⚠ Training feature only - disrupts signal quality
      </div>
    </div>
  );
}