import { useState } from 'react';
import { useVoiceRoomJoin } from './useVoiceRoomJoin';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, AlertCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VoiceRoomJoinDialog({ 
  isOpen, 
  onClose, 
  eventId, 
  netId, 
  netCode,
  netLabel 
}) {
  const { joinRoom, leaveRoom, connectionState, participants, lastError, isLoading, isSimMode, isLiveMode } = useVoiceRoomJoin();
  const [hasJoined, setHasJoined] = useState(false);

  const handleJoin = () => {
    joinRoom({ eventId, netIds: netId ? [netId] : [], netCode });
    setHasJoined(true);
  };

  const handleLeave = () => {
    leaveRoom();
    setHasJoined(false);
  };

  const handleClose = () => {
    if (hasJoined) {
      leaveRoom();
      setHasJoined(false);
    }
    onClose();
  };

  const isConnected = connectionState === 'connected';
  const isFailed = connectionState === 'failed';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-950 border border-zinc-800 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold uppercase tracking-wider">
            {netLabel || `NET ${netCode}`}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            {isSimMode ? 'Simulated' : 'Live'} voice communication
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Status Indicator */}
          <div className={cn(
            'p-2 rounded border text-xs',
            isConnected && 'bg-green-950 border-green-800',
            connectionState === 'connecting' && 'bg-yellow-950 border-yellow-800',
            !hasJoined && 'bg-zinc-900 border-zinc-800',
            isFailed && 'bg-red-950 border-red-800'
          )}>
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
              {connectionState === 'connecting' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Connecting...
                </>
              )}
              {isConnected && (
                <>
                  <Wifi className="w-3 h-3 text-green-400 animate-pulse" />
                  <span className="text-green-300">Connected</span>
                </>
              )}
              {!hasJoined && connectionState === 'disconnected' && (
                <span className="text-zinc-400">Ready to join</span>
              )}
              {isFailed && (
                <>
                  <AlertCircle className="w-3 h-3 text-red-400" />
                  <span className="text-red-300">Connection failed</span>
                </>
              )}
            </div>
          </div>

          {/* Participants */}
          {hasJoined && (
            <div className="border border-zinc-800 rounded p-2 text-[9px]">
              <div className="flex items-center gap-1 mb-1 font-bold text-zinc-400 uppercase tracking-wider">
                <Users className="w-3 h-3" />
                Active Participants ({participants.length})
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {participants.length > 0 ? (
                  participants.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-1.5 py-1 bg-zinc-900/50 rounded text-zinc-300">
                      <div className="flex items-center gap-1">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          p.isSpeaking ? 'bg-[#ea580c] animate-pulse' : 'bg-zinc-600'
                        )} />
                        <span>{p.name}</span>
                        {p.isLocal && <Badge className="text-[7px] bg-blue-900 text-blue-300">YOU</Badge>}
                        {p.isMuted && <Badge className="text-[7px] bg-yellow-900 text-yellow-300">MUTED</Badge>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-zinc-500 py-2 text-center">No participants</div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {lastError && (
            <div className="bg-red-950 border border-red-800 rounded p-2 text-[8px] text-red-300">
              <div className="font-bold mb-1">ERROR:</div>
              {lastError}
            </div>
          )}

          {/* Mode Info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-2 text-[8px] text-zinc-400">
            {isSimMode && (
              <>
                <div className="font-bold text-[7px] mb-1 text-purple-400">SIM MODE</div>
                Simulated participants and activity. Perfect for testing without LiveKit.
              </>
            )}
            {isLiveMode && (
              <>
                <div className="font-bold text-[7px] mb-1 text-blue-400">LIVE MODE</div>
                Connected to real LiveKit infrastructure. Voice transmission enabled.
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-zinc-800">
          {!hasJoined ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="text-[8px] h-7 flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleJoin}
                disabled={isLoading}
                className="text-[8px] h-7 flex-1 bg-[#ea580c] hover:bg-[#c2410c]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Net'
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLeave}
                className="text-[8px] h-7 flex-1"
              >
                Leave
              </Button>
              <Button
                onClick={handleClose}
                className="text-[8px] h-7 flex-1 bg-zinc-800 hover:bg-zinc-700"
              >
                Close
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}