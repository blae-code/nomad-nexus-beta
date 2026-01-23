import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useVoiceRoom } from '@/components/comms/useVoiceRoom';
import { Radio, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VoiceRoomJoinDialog({ 
  isOpen, 
  roomName, 
  onClose, 
  userIdentity,
  onJoinSuccess 
}) {
  const { joinRoom, leaveRoom, connectionState, lastError, token, debug } = useVoiceRoom(roomName, userIdentity);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    setIsJoining(true);
    const success = await joinRoom();
    if (success && onJoinSuccess) {
      onJoinSuccess({ roomName, token, identity: userIdentity });
    }
    setIsJoining(false);
  };

  const handleClose = () => {
    leaveRoom();
    onClose();
  };

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Radio className={cn('w-4 h-4', isConnected ? 'text-emerald-500 animate-pulse' : 'text-zinc-500')} />
            Join Voice Channel
          </DialogTitle>
          <DialogDescription className="text-zinc-400 font-mono text-xs">
            {roomName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Display */}
          <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Mode:</span>
              <span className={cn(
                'px-2 py-1 rounded font-bold',
                debug.mode === 'LIVE' ? 'bg-red-600/20 text-red-400' : 'bg-blue-600/20 text-blue-400'
              )}>
                {debug.mode}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Status:</span>
              <span className={cn(
                'px-2 py-1 rounded font-bold flex items-center gap-1',
                isConnected ? 'bg-emerald-600/20 text-emerald-400' :
                isConnecting ? 'bg-amber-600/20 text-amber-400' :
                'bg-zinc-700/20 text-zinc-400'
              )}>
                {isConnecting && <Loader2 className="w-3 h-3 animate-spin" />}
                {connectionState.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Error Display */}
          {lastError && (
            <div className="p-3 bg-red-950/30 border border-red-800 rounded flex gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-400 mb-1">Connection Error</p>
                <p className="text-xs text-red-300">{lastError}</p>
              </div>
            </div>
          )}

          {/* Info Box for LIVE mode */}
          {debug.mode === 'LIVE' && (
            <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded text-xs text-zinc-400">
              <p className="font-bold mb-1">Live Connection</p>
              <p>Connecting to real voice server. {debug.tokenMinted ? 'Token ready.' : 'Minting token...'}</p>
            </div>
          )}

          {/* SIM mode info */}
          {debug.mode === 'SIM' && (
            <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded text-xs text-blue-300">
              <p className="font-bold mb-1">Simulation Mode</p>
              <p>Testing with simulated participants and network conditions.</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              {isConnected ? 'Close' : 'Cancel'}
            </Button>
            {!isConnected && (
              <Button 
                onClick={handleJoin}
                disabled={isJoining || isConnecting}
                className="flex-1 bg-[#ea580c] hover:bg-[#c2410c] text-white"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Join Channel'
                )}
              </Button>
            )}
          </div>

          {isConnected && (
            <p className="text-xs text-center text-emerald-400 font-bold">
              ✓ Connected to {roomName}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}