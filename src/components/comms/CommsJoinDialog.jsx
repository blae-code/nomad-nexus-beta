import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Loader, AlertCircle, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCommsMode } from './useCommsMode';

export default function CommsJoinDialog({ 
  isOpen, 
  onClose, 
  netId, 
  eventId, 
  onJoinSuccess 
}) {
  const { isLive, isSim } = useCommsMode();
  const [net, setNet] = useState(null);
  const [user, setUser] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    base44.auth.me().then(setUser).catch(() => {});
    if (netId) {
      base44.entities.VoiceNet.get(netId).then(setNet).catch(err => {
        setError('Failed to load voice net details');
        console.error(err);
      });
    }
  }, [isOpen, netId]);

  const handleJoin = async () => {
    if (!user || !net) return;

    setIsJoining(true);
    setError(null);

    try {
      if (isLive) {
        // In LIVE mode, actually connect to LiveKit
        // The ActiveNetPanel will handle the connection
        toast.success(`Connecting to ${net.label}...`);
        onJoinSuccess?.();
        onClose();
      } else {
        // In SIM mode, just allow entry
        toast.success(`Joining ${net.label} (SIM Mode)`);
        onJoinSuccess?.();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to join comms');
      console.error(err);
    } finally {
      setIsJoining(false);
    }
  };

  if (!net) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#ea580c]" />
            Join Voice Net
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {isSim ? 'SIM MODE: Simulated participants' : 'LIVE MODE: Real-time connection'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Net Details */}
          <div className="space-y-3 p-4 bg-zinc-900/30 border border-zinc-800/50 rounded">
            <div>
              <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Net Code</div>
              <div className="text-lg font-mono font-bold text-white mt-1">{net.code}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Label</div>
              <div className="text-sm text-zinc-300 mt-1">{net.label}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Type</div>
                <div className="text-sm text-zinc-300 mt-1 capitalize">{net.type}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Discipline</div>
                <div className={cn(
                  'text-sm mt-1 capitalize',
                  net.discipline === 'focused' ? 'text-red-400' : 'text-emerald-400'
                )}>
                  {net.discipline}
                </div>
              </div>
            </div>
          </div>

          {/* Mode Indicator */}
          <div className={cn(
            'p-3 border rounded text-sm font-mono text-center',
            isSim ? 'bg-amber-950/30 border-amber-800/50 text-amber-400' : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-400'
          )}>
            {isSim ? '⚠ SIMULATION MODE' : '✓ LIVE MODE - ACTUAL CONNECTION'}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-950/30 border border-red-800/50 rounded flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm text-red-400">{error}</div>
            </div>
          )}

          {/* Min Rank Warning */}
          {user && net.min_rank_to_rx && (
            <div className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded text-xs text-zinc-400">
              <div className="font-bold text-zinc-300 mb-1">Minimum Rank Required:</div>
              {net.min_rank_to_rx} or higher to receive on this net.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isJoining}
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoin}
            disabled={isJoining}
            className="bg-[#ea580c] hover:bg-[#ea580c]/90"
          >
            {isJoining ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              'Join Comms'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}