import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Radio, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCommsMode } from '@/components/comms/useCommsMode';

export default function CommsJoinModal({ net, eventId, open, onOpenChange, onJoinSuccess }) {
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);
  const { isLive } = useCommsMode();

  const handleJoin = async () => {
    if (!net) return;
    
    try {
      setIsJoining(true);
      setError(null);

      if (isLive) {
        // LIVE mode: Generate token and join real room
        const res = await base44.functions.invoke('generateLiveKitToken', {
          eventId,
          netIds: [net.id]
        });

        if (res.data.errors && res.data.errors.length > 0) {
          throw new Error(res.data.errors[0]);
        }

        const token = res.data.tokens?.[net.id];
        if (!token) {
          throw new Error('Failed to generate LiveKit token');
        }

        // Open CommsConsole with the selected net
        window.location.href = `/comms?eventId=${eventId}&netId=${net.id}`;
      } else {
        // SIM mode: Just navigate to CommsConsole
        window.location.href = `/comms?eventId=${eventId}&netId=${net.id}`;
      }

      toast.success(`Joined ${net.code}`);
      onJoinSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error('[COMMS] Join failed:', err);
      setError(err.message || 'Failed to join comms net');
      toast.error(err.message || 'Failed to join');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#ea580c]" />
            Join Voice Net
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {net ? `Connect to ${net.label}` : 'Loading net details...'}
          </DialogDescription>
        </DialogHeader>

        {net && (
          <div className="space-y-4 py-4">
            {/* Net Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase mb-1">Code</div>
                <div className="font-mono font-bold text-white">{net.code}</div>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase mb-1">Type</div>
                <div className="font-mono font-bold capitalize">{net.type}</div>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase mb-1">Discipline</div>
                <div className={cn(
                  'font-mono font-bold capitalize',
                  net.discipline === 'focused' ? 'text-red-400' : 'text-emerald-400'
                )}>
                  {net.discipline}
                </div>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase mb-1">Min RX Rank</div>
                <div className="font-mono font-bold">{net.min_rank_to_rx || 'Vagrant'}</div>
              </div>
            </div>

            {/* Warnings */}
            {net.require_approval && (
              <div className="flex gap-2 p-3 bg-amber-950/30 border border-amber-800/50 rounded">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-300">
                  This net requires approval to join. Your request will be reviewed by a moderator.
                </div>
              </div>
            )}

            {net.stage_mode && (
              <div className="flex gap-2 p-3 bg-blue-950/30 border border-blue-800/50 rounded">
                <Radio className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-300">
                  Stage mode is active. You'll need to request permission to speak.
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex gap-2 p-3 bg-red-950/30 border border-red-800/50 rounded">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs text-red-300">{error}</div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isJoining}
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoin}
            disabled={!net || isJoining}
            className="bg-[#ea580c] hover:bg-[#c2410c]"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              'Join Net'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}